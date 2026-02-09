// ============================================================
// Tennis Rules ETL - Edge Function
// ============================================================
// Handles PDF text extraction, chunking, and embedding generation
// for uploading tennis rules to the RAG database.
//
// Actions:
//   1. extract_text: PDF (base64) → Gemini Flash → raw text
//   2. chunk_text:   raw text → regex chunking → chunk list
//   3. process_chunks: chunk list → embeddings → DB insert
//
// Usage: POST with { action, ...params }
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-gemini-api-key',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

const DEFAULT_MODEL = 'gemini-2.5-flash';

function resolveApiKey(req: Request, body: Record<string, unknown>): string {
  const bodyKey = body.gemini_api_key as string;
  if (bodyKey?.trim()) return bodyKey.trim();

  const headerKey = req.headers.get('x-gemini-api-key');
  if (headerKey?.trim()) return headerKey.trim();

  const envKey = Deno.env.get('GEMINI_API_KEY');
  if (envKey?.trim()) return envKey.trim();

  throw new Error('Gemini API key required');
}

// ============================================================
// Action 1: Extract text from PDF using Gemini Flash
// ============================================================
async function extractText(
  pdfBase64: string,
  apiKey: string,
  language: string,
  model?: string
): Promise<{ text: string; charCount: number }> {
  const prompt = language === 'ko'
    ? '이 문서의 모든 텍스트를 가능한 한 원본(규칙 번호, 조항 등)을 유지하며 그대로 추출해줘. 마크다운 형식으로 출력해줘.'
    : 'Extract all text from this document preserving the original structure (rule numbers, articles, appendices). Output in markdown format. Do not summarize.';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || DEFAULT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: pdfBase64,
              },
            },
          ],
        }],
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
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, charCount: text.length };
}

// ============================================================
// Action 2: Chunk text using bilingual regex
// ============================================================
interface Chunk {
  rule_id: string;
  content: string;
  section_type: string;
  original_len: number;
}

function chunkText(
  text: string,
  language: string
): Chunk[] {
  // Start marker: find where main content begins
  const startRegex = /(\*\*1\.\s*(?:코트|THE COURT|Court)|\*\*(?:ITF\s*테니스\s*룰|ITF\s*Rules\s*of\s*Tennis|FOREWORD)\*\*|\*\*Rule\s*1[\.\s])/i;
  const startMatch = startRegex.exec(text);

  const chunks: Chunk[] = [];
  let bodyText = text;

  if (startMatch) {
    const introText = text.slice(0, startMatch.index).trim();
    bodyText = text.slice(startMatch.index);

    if (introText.length > 50) {
      chunks.push({
        rule_id: 'Foreword/Intro',
        content: introText.slice(0, 8000),
        section_type: 'foreword',
        original_len: introText.length,
      });
    }
  }

  // Body split pattern (bilingual)
  const splitRegex = /(\n\s*\*\*(?!(?:페이지|목차|표지|머리말|Page|Contents|Table\s*of|Note))(?:\d+\.\s|[I-V]+\.\s|[A-Z]\.\s|Rule\s*\d+|APPENDIX\s+[IVX]+|Appendix\s+[IVX]+).*?\*\*(?:\n|$))/gi;

  const parts = bodyText.split(splitRegex);

  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i]?.trim() || '';
    const content = parts[i + 1]?.trim() || '';
    const ruleId = header.replace(/\*\*/g, '').trim();
    const fullContent = `${header}\n${content}`;

    if (fullContent.trim().length <= 30) continue;

    let sectionType = 'other';
    if (/^\d+\./.test(ruleId)) sectionType = 'rule';
    else if (/^[a-zA-Z]\./.test(ruleId)) sectionType = 'sub-section';
    else if (/^(부록|Appendix|APPENDIX|[IVX]+\.)/i.test(ruleId)) sectionType = 'appendix';

    chunks.push({
      rule_id: ruleId,
      content: fullContent,
      section_type: sectionType,
      original_len: fullContent.length,
    });
  }

  return chunks;
}

// ============================================================
// Action 3: Generate embeddings and insert into DB
// ============================================================
async function processChunks(
  chunks: Chunk[],
  sourceFile: string,
  language: string,
  apiKey: string
): Promise<{ inserted: number; errors: number }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  let inserted = 0;
  let errors = 0;

  for (const chunk of chunks) {
    try {
      // Generate embedding
      const embResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text: chunk.content }] },
            taskType: 'RETRIEVAL_DOCUMENT',
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

      // Insert into DB
      const { error: insertError } = await supabase.from('tennis_rules').insert({
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
        console.error(`Insert error for ${chunk.rule_id}: ${insertError.message}`);
        errors++;
      } else {
        inserted++;
      }

      // Rate limiting: ~1 request per second
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.error(`Process error for ${chunk.rule_id}: ${e}`);
      errors++;
    }
  }

  return { inserted, errors };
}

// ============================================================
// Main Handler
// ============================================================
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const apiKey = resolveApiKey(req, body);

    switch (action) {
      case 'extract_text': {
        const { pdf_base64, language = 'en', model } = body;
        if (!pdf_base64) {
          return jsonResponse({ error: 'pdf_base64 is required' }, 400);
        }
        console.log(`[ETL] Extracting text (${language}, model: ${model || DEFAULT_MODEL})...`);
        const result = await extractText(pdf_base64, apiKey, language, model as string);
        console.log(`[ETL] Extracted ${result.charCount} chars`);
        return jsonResponse({ success: true, ...result });
      }

      case 'chunk_text': {
        const { text, language = 'en' } = body;
        if (!text) {
          return jsonResponse({ error: 'text is required' }, 400);
        }
        console.log(`[ETL] Chunking text (${language})...`);
        const chunks = chunkText(text, language);
        console.log(`[ETL] Created ${chunks.length} chunks`);
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

      case 'process_chunks': {
        const { chunks, source_file, language = 'en' } = body;
        if (!chunks || !source_file) {
          return jsonResponse({ error: 'chunks and source_file are required' }, 400);
        }
        console.log(`[ETL] Processing ${chunks.length} chunks...`);
        const result = await processChunks(chunks, source_file, language, apiKey);
        console.log(`[ETL] Done: ${result.inserted} inserted, ${result.errors} errors`);
        return jsonResponse({ success: true, ...result });
      }

      default:
        return jsonResponse(
          { error: `Unknown action: ${action}. Use extract_text, chunk_text, or process_chunks` },
          400
        );
    }
  } catch (error) {
    console.error('[ETL] Error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
});
