// ====================================
// Tennis Rules RAG - Edge Function
// ====================================
// User question → Gemini embedding → Vector search → Answer generation
// Optimized for mobile viewing with citation support

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gemini-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  question: string;
  match_count?: number;
  match_threshold?: number;
  gemini_api_key?: string;
  model?: string;  // User's selected Gemini model
}

interface SearchResult {
  id: number;
  source_file: string;
  rule_id: string;
  content: string;
  metadata: any;
  similarity: number;
}

// Detect language from question text
function detectLanguage(text: string): 'ko' | 'en' {
  const koreanPattern = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  return koreanPattern.test(text) ? 'ko' : 'en';
}

// Sanitize error messages to prevent API key leakage
function sanitizeErrorMessage(message: string): string {
  let sanitized = message.replace(/AIza[0-9A-Za-z_-]{35}/g, '[API_KEY_REDACTED]');
  sanitized = sanitized.replace(/https?:\/\/[^\s]+\?[^\s]*/g, (url) => {
    return url.split('?')[0] + '?[PARAMS_REDACTED]';
  });
  return sanitized;
}

serve(async (req) => {
  // OPTIONS request handling (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Extract request parameters
    const {
      question,
      match_count = 5,
      match_threshold = 0.3,
      gemini_api_key: client_api_key,
      model: client_model
    }: RequestBody = await req.json();

    // API key priority: client-provided -> server environment variable
    const gemini_api_key = client_api_key || Deno.env.get("GEMINI_API_KEY");

    // Model is required from client (no hardcoded fallback to avoid deprecation issues)
    if (!client_model) {
      console.error("[RAG] Model not provided in request");
      return new Response(
        JSON.stringify({
          error: "Model parameter is required. Please specify a Gemini model (e.g., 'gemini-2.5-flash')."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const model = client_model;

    if (!question?.trim()) {
      return new Response(
        JSON.stringify({ error: "Question is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!gemini_api_key) {
      console.error("[RAG] GEMINI_API_KEY not provided");
      return new Response(
        JSON.stringify({ error: "Gemini API key is required (client or server)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect language from question
    const language = detectLanguage(question);
    console.log(`[RAG] Question (${language}): ${question}`);

    // 2. Generate question embedding via Gemini API
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": gemini_api_key, // Security: API key in header
        },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: {
            parts: [{ text: question }]
          },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: 768
        })
      }
    );

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      const sanitizedError = sanitizeErrorMessage(errorText);
      console.error("[RAG] Gemini API error:", sanitizedError);
      return new Response(
        JSON.stringify({ error: "Gemini API call failed", details: sanitizedError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData?.embedding?.values;

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.error("[RAG] Embedding extraction failed:", embeddingData);
      return new Response(
        JSON.stringify({ error: "Embedding generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[RAG] Embedding generated: ${queryEmbedding.length} dimensions`);

    // 3. Search similar documents in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[RAG] Supabase environment variables not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: searchResults, error: searchError } = await supabaseClient.rpc(
      "match_tennis_rules",
      {
        query_embedding: queryEmbedding,
        match_threshold: match_threshold,
        match_count: match_count
      }
    );

    if (searchError) {
      console.error("[RAG] Search error:", searchError);
      return new Response(
        JSON.stringify({ error: "Vector search failed", details: searchError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[RAG] Search complete: ${searchResults?.length || 0} results`);

    // 4. Build context with citation numbers
    const context = (searchResults as SearchResult[])
      ?.map((r, idx) => `[${idx + 1}] ${r.rule_id}\n${r.content}\n(Similarity: ${r.similarity.toFixed(3)})`)
      .join("\n\n---\n\n");

    // 5. Generate answer with Gemini (mobile-optimized)
    const prompts = {
      ko: `당신은 테니스 규칙 전문가입니다. 아래 공식 규칙을 기반으로 질문에 답변하세요.

## 참고 규칙:
${context}

## 질문:
${question}

## 답변 지침:
- **구조**: 핵심 답변 (2-3문장) 먼저 제시 → 필요시 상세 설명 추가
- **인용**: 규칙 참조 시 반드시 [1], [2], [3] 번호 사용
- **톤**: 전문가답게 간결하고 명확하게
- **완성도**: 답변이 중간에 끊기지 않도록 문장을 완성할 것
- **언어**: 한국어로 답변
- 관련 규칙이 없으면 "관련 규칙을 찾을 수 없습니다"라고 명시

답변:`,
      en: `You are a tennis rules expert. Answer the question based on the official rules below.

## Reference Rules:
${context}

## Question:
${question}

## Instructions:
- **Structure**: Core answer (2-3 sentences) first → Detailed explanation if needed
- **Citations**: Always use [1], [2], [3] numbers when referencing rules
- **Tone**: Professional, concise, and clear
- **Completeness**: Ensure answer is complete and not cut off mid-sentence
- **Language**: Answer in English
- If no relevant rules found, state "No relevant rules found"

Answer:`
    };

    const generateResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": gemini_api_key,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompts[language] }]
          }],
          generationConfig: {
            temperature: 0.3, // More consistent answers
            maxOutputTokens: 1000, // Sufficient length to avoid truncation
            topP: 0.95,
            topK: 40
          }
        })
      }
    );

    let answer = language === 'ko' ? "답변 생성 실패" : "Answer generation failed";
    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      answer = generateData?.candidates?.[0]?.content?.parts?.[0]?.text ||
               (language === 'ko' ? "답변을 생성할 수 없습니다." : "Unable to generate answer.");
    } else {
      const errorText = await generateResponse.text();
      const sanitizedError = sanitizeErrorMessage(errorText);
      console.error("[RAG] Answer generation error:", sanitizedError);
    }

    // 6. Return response
    return new Response(
      JSON.stringify({
        question,
        answer,
        sources: searchResults,
        metadata: {
          match_count: searchResults?.length || 0,
          embedding_dim: queryEmbedding.length,
          language
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const sanitizedError = sanitizeErrorMessage(error.message);
    console.error("[RAG] Processing error:", sanitizedError);
    return new Response(
      JSON.stringify({ error: "Server error", details: sanitizedError }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
