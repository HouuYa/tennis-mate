// ====================================
// Tennis Rules Admin ETL - Edge Function
// ====================================
// 통합 ETL 함수:
//   - list_sources:    DB에 저장된 소스 파일 목록 조회
//   - delete_source:   소스 파일별 데이터 삭제
//   - extract_text:    PDF (base64) → Gemini → 텍스트 추출
//   - chunk_text:      텍스트 → 규칙별 청크 분할
//   - process_chunks:  청크 → 임베딩 생성 → DB 저장
//
// 인증: adminKey (body) = SUPABASE_SERVICE_ROLE_KEY 또는 ADMIN_PASSWORD
// ====================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEFAULT_MODEL = "gemini-2.5-flash";

// ====================================
// Gemini API key resolution
// ====================================
function resolveApiKey(body: Record<string, unknown>): string {
  const bodyKey = body.gemini_api_key as string;
  if (bodyKey?.trim()) return bodyKey.trim();

  const envKey = Deno.env.get("GEMINI_API_KEY");
  if (envKey?.trim()) return envKey.trim();

  throw new Error("Gemini API key required");
}

// ====================================
// Action: extract_text
// PDF (base64) → Gemini Flash → raw text
// ====================================
async function extractText(
  pdfBase64: string,
  apiKey: string,
  language: string,
  model?: string
): Promise<{ text: string; charCount: number }> {
  const prompt =
    language === "ko"
      ? "이 문서의 모든 텍스트를 가능한 한 원본(규칙 번호, 조항 등)을 유지하며 그대로 추출해줘. 마크다운 형식으로 출력해줘."
      : "Extract all text from this document preserving the original structure (rule numbers, articles, appendices). Output in markdown format. Do not summarize.";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || DEFAULT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 65536,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini extraction failed: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { text, charCount: text.length };
}

// ====================================
// Action: chunk_text
// raw text → regex bilingual chunking
// ====================================
interface Chunk {
  rule_id: string;
  content: string;
  section_type: string;
  original_len: number;
}

function chunkText(text: string, language: string): Chunk[] {
  const startRegex =
    /(\*\*1\.\s*(?:코트|THE COURT|Court)|\*\*(?:ITF\s*테니스\s*룰|ITF\s*Rules\s*of\s*Tennis|FOREWORD)\*\*|\*\*Rule\s*1[\.\s])/i;
  const startMatch = startRegex.exec(text);

  const chunks: Chunk[] = [];
  let bodyText = text;

  if (startMatch) {
    const introText = text.slice(0, startMatch.index).trim();
    bodyText = text.slice(startMatch.index);

    if (introText.length > 50) {
      chunks.push({
        rule_id: "Foreword/Intro",
        content: introText.slice(0, 8000),
        section_type: "foreword",
        original_len: introText.length,
      });
    }
  }

  const splitRegex =
    /(\n\s*\*\*(?!(?:페이지|목차|표지|머리말|Page|Contents|Table\s*of|Note))(?:\d+\.\s|[I-V]+\.\s|[A-Z]\.\s|Rule\s*\d+|APPENDIX\s+[IVX]+|Appendix\s+[IVX]+).*?\*\*(?:\n|$))/gi;

  const parts = bodyText.split(splitRegex);

  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i]?.trim() || "";
    const content = parts[i + 1]?.trim() || "";
    const ruleId = header.replace(/\*\*/g, "").trim();
    const fullContent = `${header}\n${content}`;

    if (fullContent.trim().length <= 30) continue;

    let sectionType = "other";
    if (/^\d+\./.test(ruleId)) sectionType = "rule";
    else if (/^[a-zA-Z]\./.test(ruleId)) sectionType = "sub-section";
    else if (/^(부록|Appendix|APPENDIX|[IVX]+\.)/i.test(ruleId))
      sectionType = "appendix";

    chunks.push({
      rule_id: ruleId,
      content: fullContent,
      section_type: sectionType,
      original_len: fullContent.length,
    });
  }

  return chunks;
}

// ====================================
// Action: process_chunks
// chunks → Gemini embeddings → Supabase insert
// ====================================
async function processChunks(
  chunks: Chunk[],
  sourceFile: string,
  language: string,
  apiKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ inserted: number; errors: number }> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  let inserted = 0;
  let errors = 0;

  for (const chunk of chunks) {
    try {
      const embResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: chunk.content }] },
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: 768,
          }),
        }
      );

      if (!embResponse.ok) {
        const err = await embResponse.text();
        console.error(`Embedding error for ${chunk.rule_id}: ${err}`);
        errors++;
        continue;
      }

      const embData = await embResponse.json();
      const embedding = embData?.embedding?.values;

      if (!embedding || !Array.isArray(embedding)) {
        errors++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("tennis_rules")
        .insert({
          source_file: sourceFile,
          rule_id: chunk.rule_id,
          content: chunk.content,
          metadata: {
            language,
            section_type: chunk.section_type,
            original_len: chunk.original_len,
          },
          embedding: embedding,
        });

      if (insertError) {
        console.error(
          `Insert error for ${chunk.rule_id}: ${insertError.message}`
        );
        errors++;
      } else {
        inserted++;
      }

      // Rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.error(`Process error for ${chunk.rule_id}: ${e}`);
      errors++;
    }
  }

  return { inserted, errors };
}

// ====================================
// Main Handler
// ====================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(
        "Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
      throw new Error(
        "Server configuration error: Missing environment variables."
      );
    }

    // AUTH CHECK
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    const reqJson = await req.json();
    const { action, fileName, adminKey } = reqJson;

    if (adminKey !== supabaseServiceKey && adminKey !== adminPassword) {
      console.error("[tennis-etl] Unauthorized access attempt.");
      return jsonResponse(
        { error: "Unauthorized: Invalid Admin Key or Password" },
        401
      );
    }

    console.log(
      `[tennis-etl] Received action: ${action}, fileName: ${fileName || "N/A"}`
    );

    // ── Data management actions ──────────────────────────

    if (action === "list_sources") {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabaseClient
        .from("tennis_rules")
        .select("source_file");

      if (error) {
        console.error("[tennis-etl] Database error:", error);
        throw error;
      }

      const sources = [
        ...new Set(data.map((item: any) => item.source_file)),
      ];
      console.log(`[tennis-etl] Found ${sources.length} unique sources.`);
      return jsonResponse({ sources });
    }

    if (action === "delete_source") {
      if (!fileName) throw new Error("fileName is required for deletion");

      console.log(`[tennis-etl] Deleting source: ${fileName}`);
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      const { error, count } = await supabaseClient
        .from("tennis_rules")
        .delete({ count: "exact" })
        .eq("source_file", fileName);

      if (error) {
        console.error("[tennis-etl] Delete error:", error);
        throw error;
      }

      console.log(`[tennis-etl] Deleted rows count: ${count}`);
      return jsonResponse({
        message: `Successfully deleted ${fileName}`,
        count,
      });
    }

    // ── ETL processing actions ───────────────────────────

    if (action === "extract_text") {
      const { pdf_base64, language = "en", model } = reqJson;
      if (!pdf_base64) {
        return jsonResponse({ error: "pdf_base64 is required" }, 400);
      }
      const apiKey = resolveApiKey(reqJson);
      console.log(
        `[tennis-etl] Extracting text (${language}, model: ${model || DEFAULT_MODEL})...`
      );
      const result = await extractText(
        pdf_base64,
        apiKey,
        language,
        model as string
      );
      console.log(`[tennis-etl] Extracted ${result.charCount} chars`);
      return jsonResponse({ success: true, ...result });
    }

    if (action === "chunk_text") {
      const { text, language = "en" } = reqJson;
      if (!text) {
        return jsonResponse({ error: "text is required" }, 400);
      }
      console.log(`[tennis-etl] Chunking text (${language})...`);
      const chunks = chunkText(text, language);
      console.log(`[tennis-etl] Created ${chunks.length} chunks`);
      return jsonResponse({
        success: true,
        chunks: chunks.map((c) => ({
          rule_id: c.rule_id,
          section_type: c.section_type,
          original_len: c.original_len,
          content_preview: c.content.slice(0, 200),
        })),
        total: chunks.length,
        full_chunks: chunks,
      });
    }

    if (action === "process_chunks") {
      const { chunks, source_file, language = "en" } = reqJson;
      if (!chunks || !source_file) {
        return jsonResponse(
          { error: "chunks and source_file are required" },
          400
        );
      }
      const apiKey = resolveApiKey(reqJson);
      console.log(`[tennis-etl] Processing ${chunks.length} chunks...`);
      const result = await processChunks(
        chunks,
        source_file,
        language,
        apiKey,
        supabaseUrl,
        supabaseServiceKey
      );
      console.log(
        `[tennis-etl] Done: ${result.inserted} inserted, ${result.errors} errors`
      );
      return jsonResponse({ success: true, ...result });
    }

    return jsonResponse(
      {
        error: `Invalid action: ${action}. Use list_sources, delete_source, extract_text, chunk_text, or process_chunks`,
      },
      400
    );
  } catch (error) {
    console.error("[tennis-etl] Unhandled error:", (error as any).message);
    return jsonResponse({ error: (error as any).message }, 500);
  }
});
