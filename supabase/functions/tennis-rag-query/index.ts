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
      ko: `당신은 ITF(국제테니스연맹) 규칙 전문가입니다. 아래 규칙 정보를 바탕으로 답변하십시오.

## 참고 규칙:
${context}

## 질문:
${question}

## 답변 구성 지침:
1. **서두**: 질문에 대한 핵심 정의를 첫 번째 단락에 작성하십시오. (줄바꿈 포함)
2. **본문**: 구체적인 방법이나 추가 규칙을 두 번째, 세 번째 단락에 작성하십시오.
3. **가독성**: 단락 사이에는 반드시 **빈 줄**을 삽입하고, 문장이 너무 길지 않게 나누어 작성하십시오.
4. **인용**: 규칙 내용을 인용할 때마다 해당 문장 끝에 [1], [2], [3]과 같이 번호를 부여하십시오.
5. **출처 섹션**: 답변 하단에 '📚 Sources:' 섹션을 만들고, 본문에서 사용한 번호와 매칭되는 규칙 제목(및 매칭률)을 다음 형식으로 작성하십시오:
   • [번호] : 규칙 제목 (매칭률)

## 제약 사항:
- 말투: "~입니다", "~하십시오"와 같이 전문적이고 정중한 말투
- 언어: 한국어 질문에는 한국어, 영어 질문에는 영어로 답변
- 관련 규칙이 없으면 "제공된 정보 내에서 관련 규칙을 찾을 수 없습니다."라고 답변하십시오.

답변:`,
      en: `You are an ITF Tennis Rules Expert. Answer based on the rules provided below.

## Reference Rules:
${context}

## Question:
${question}

## Structure Instructions:
1. **Introduction**: Start with a core definition in the first paragraph.
2. **Details**: Provide specific details or procedures in the following paragraphs.
3. **Readability**: Ensure **double line breaks** between paragraphs for mobile visibility.
4. **Citations**: Append [1], [2], [3] at the end of each sentence based on the reference used.
5. **Sources Section**: At the bottom, include a '📚 Sources:' section mapping the numbers used in the text to the rule titles as follows:
   • [Number] : Rule Title (Match %)

## Constraints:
- Tone: Professional, formal, and direct.
- Language: Match the user's language (English or Korean).
- If information is missing, state: "No relevant rules found in the provided context."

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

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      const sanitizedError = sanitizeErrorMessage(errorText);
      console.error("[RAG] Answer generation error:", sanitizedError);

      // Return error to frontend with proper status code
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_ERROR",
          details: sanitizedError,
          status: generateResponse.status
        }),
        {
          status: generateResponse.status, // Pass through the error status (429, 401, etc.)
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const generateData = await generateResponse.json();
    const answer = generateData?.candidates?.[0]?.content?.parts?.[0]?.text ||
                   (language === 'ko' ? "답변을 생성할 수 없습니다." : "Unable to generate answer.");

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
