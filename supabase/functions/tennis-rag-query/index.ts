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

## 답변 형식 지침 - 중요:
1. **포맷**: 반드시 **HTML 태그**만 사용하여 답변하십시오. (Markdown, \`\`\`html 등 사용 금지)
2. **구조**:
   - 문단은 <p> 태그를 사용하십시오.
   - 목록은 <ul>과 <li> 태그를 사용하여 모바일에서 들여쓰기가 되도록 하십시오.
   - 강조할 내용은 <strong> 태그를 사용하십시오.
   - 줄바꿈을 위해 <br>을 남발하지 말고 <p>와 <ul>로 구조를 잡으십시오.
3. **인용**:
   - 규칙 내용을 인용할 때마다 해당 문장 끝에 <sup>[1]</sup>, <sup>[2]</sup>, <sup>[3]</sup>과 같이 번호를 부여하십시오.
   - <sup> 태그를 사용하여 작게 표시하십시오.
4. **출처 섹션**:
   - 답변 마지막에 <hr> 태그를 넣고 "📚 Sources" 섹션을 만드십시오.
   - 출처 목록은 <ul> 태그를 사용하고, 각 항목은 <li><small>[번호] : 규칙 제목 (XX% match)</small></li> 형식을 따르십시오.

## 제약 사항:
- 말투: "~입니다", "~하십시오"와 같이 전문적이고 정중한 말투
- 언어: 한국어 질문에는 한국어, 영어 질문에는 영어로 답변
- 관련 규칙이 없으면 "제공된 정보 내에서 관련 규칙을 찾을 수 없습니다."라고 답변하십시오.

## 답변 예시:
<p>타이브레이크는 세트가 6-6 동점일 때 승자를 결정하는 특별 게임입니다.<sup>[1]</sup></p>
<ul>
  <li>7점을 먼저 획득한 선수가 타이브레이크를 승리합니다.<sup>[2]</sup></li>
  <li>2점 차이가 나야 최종 승자가 결정됩니다.</li>
</ul>
<hr>
<h3>📚 Sources</h3>
<ul>
  <li><small>[1] : TIE-BREAK (71% match)</small></li>
  <li><small>[2] : SCORING (69% match)</small></li>
</ul>

답변:`,
      en: `You are an ITF Tennis Rules Expert. Answer based on the rules provided below.

## Reference Rules:
${context}

## Question:
${question}

## Format Guidelines - IMPORTANT:
1. **Format**: Output **raw HTML** only. Do NOT use Markdown blocks or code fences.
2. **Structure**:
   - Use <p> tags for paragraphs.
   - Use <ul> and <li> tags for lists (this ensures proper indentation on mobile).
   - Use <strong> tags for emphasis.
   - Avoid excessive <br> tags; use <p> and <ul> for structure instead.
3. **Citations**:
   - Use <sup> tags for citation numbers. Example: ...wins the set.<sup>[1]</sup>
   - Append citations at the end of each relevant sentence.
4. **Sources Section**:
   - Add an <hr> tag at the bottom, followed by an "📚 Sources" header using <h3>.
   - Use <ul> for the list, format items as: <li><small>[Number] : Rule Title (XX% match)</small></li>

## Constraints:
- Tone: Professional, formal, and direct.
- Language: Match the user's language (English or Korean).
- If information is missing, state: "No relevant rules found in the provided context."

## Answer Example:
<p>The tie-break is a special game used to decide the set when the score reaches 6-6.<sup>[1]</sup></p>
<ul>
  <li>The first player to reach 7 points wins the tie-break.<sup>[2]</sup></li>
  <li>A player must win by a margin of 2 points.</li>
</ul>
<hr>
<h3>📚 Sources</h3>
<ul>
  <li><small>[1] : TIE-BREAK (71% match)</small></li>
  <li><small>[2] : SCORING (69% match)</small></li>
</ul>

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
