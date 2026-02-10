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

    // 5. Generate answer with Gemini (ITF expert tone, complete answers)
    const prompts = {
      ko: `당신은 ITF(국제테니스연맹) 규칙에 정통한 전문 심판이자 테니스 규칙 전문가입니다.
제공된 참고 규칙만을 바탕으로 사용자의 질문에 답변하십시오.

## 참고 규칙:
${context}

## 질문:
${question}

## 답변 구조:
1. **핵심 답변**: 질문에 대한 결론을 가장 먼저 1-2문장으로 명확하게 제시하십시오.
2. **상세 설명**: 핵심 답변을 뒷받침하는 근거를 설명하십시오. 이때 반드시 참고 규칙의 출처 번호를 사용하십시오(예: [1], [2]).
3. **가독성**: 모바일 환경을 고려하여 문단 사이에는 줄바꿈을 사용하고, 중요한 용어는 강조하십시오.

## 답변 지침:
- **말투**: 전문적이고 정중하며 객관적인 톤을 유지하십시오. (~입니다, ~하십시오 체 사용)
- **인용**: 규칙 참조 시 반드시 해당 내용 뒤에 [번호]를 붙이십시오.
- **길이**: 공백 포함 600자 내외로 작성하여 충분한 정보를 전달하되, 너무 장황하지 않게 조절하십시오.
- **언어**: 한국어 질문에는 한국어로 답변하십시오.
- **예외**: 제공된 규칙에 관련 내용이 없다면 "제공된 규칙 내에서는 해당 질문에 대한 정보를 찾을 수 없습니다."라고 정직하게 답변하십시오.

답변:`,
      en: `You are a professional tennis official and rules expert well-versed in ITF regulations.
Answer the question based strictly on the provided reference rules.

## Reference Rules:
${context}

## Question:
${question}

## Answer Structure:
1. **Core Answer**: Provide a clear, direct conclusion in 1-2 sentences first.
2. **Detailed Explanation**: Support the core answer with reasoning. You must use the source index numbers for citations (e.g., [1], [2]).
3. **Readability**: Use line breaks between paragraphs and bold key terms for mobile accessibility.

## Instructions:
- **Tone**: Maintain a professional, formal, and objective tone.
- **Citations**: Always append the source number [n] immediately after the referenced information.
- **Length**: Aim for approximately 150-200 words (optimized for mobile) to provide sufficient detail without excessive scrolling.
- **Language**: Answer in English for English queries.
- **Exception**: If the rules do not contain the answer, state: "I cannot find information regarding this question in the provided rules."

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
            temperature: 0.3, // More consistent, factual answers
            topP: 0.95,
            topK: 40
            // maxOutputTokens removed - let model complete full answer
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
