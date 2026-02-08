// ============================================================
// Tennis Rules RAG Search - Edge Function
// ============================================================
// This Edge Function performs RAG (Retrieval-Augmented Generation)
// searches against the tennis rules database using Gemini API.
//
// API key resolution: client-provided key (body or header) takes
// priority; falls back to the GEMINI_API_KEY env variable.
//
// Endpoint: POST /search-tennis-rules
// Request body:
//   - question: string (user's question)
//   - geminiApiKey?: string (optional, user's Gemini API key)
//   - language?: 'en' | 'ko' (for bilingual prompt selection)
//   - includeStats?: boolean (optional, include match stats)
//   - generateAnswer?: boolean (optional, generate AI answer)
// Headers (optional):
//   - x-gemini-api-key: string (alternative way to provide API key)
//
// Actual DB schema (tennis_rules):
//   id BIGSERIAL, source_file TEXT, rule_id TEXT, content TEXT,
//   metadata JSONB, embedding VECTOR(768), created_at TIMESTAMPTZ
//
// RPC match_tennis_rules(query_embedding, match_threshold, match_count)
// Returns: id, source_file, rule_id, content, metadata, similarity
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================================
// Types
// ============================================================

interface SearchRequest {
  question: string;
  geminiApiKey?: string;
  language?: 'en' | 'ko';
  includeStats?: boolean;
  generateAnswer?: boolean; // If true, generate AI answer; if false, return matches only
}

interface SearchResponse {
  success: boolean;
  answer?: string;
  matches?: Array<{
    id: number;
    rule_id: string;
    content: string;
    source_file: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
  }>;
  stats?: {
    matchCount: number;
    avgSimilarity: number;
    topSource: string;
  };
  error?: string;
}

interface TennisRule {
  id: number;
  rule_id: string;
  content: string;
  source_file: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

// ============================================================
// Gemini API Functions
// ============================================================

async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: {
        parts: [{ text }],
      },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini Embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

async function generateAnswer(
  question: string,
  context: string,
  apiKey: string,
  language?: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const prompt = language === 'ko'
    ? `당신은 테니스 규칙 전문가입니다. 아래 제공된 공식 테니스 규칙 문맥을 기반으로 질문에 답변해 주세요.

테니스 규칙 문맥:
${context}

질문: ${question}

지침:
- 제공된 문맥에만 기반하여 정확하고 명확한 답변을 제공하세요
- 문맥에 관련 정보가 없으면 그렇다고 말씀해 주세요
- 가능하면 구체적인 규칙이나 조항을 인용하세요
- 간결하되 포괄적으로 답변하세요
- 한국어로 답변하세요

답변:`
    : `You are a tennis rules expert. Answer the following question based on the provided context from official tennis rules.

Context from Tennis Rules:
${context}

Question: ${question}

Instructions:
- Provide a clear, accurate answer based ONLY on the context provided
- If the context doesn't contain relevant information, say so
- Cite specific rules or articles when possible
- Be concise but comprehensive
- Answer in English

Answer:`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        topP: 0.8,
        topK: 40,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini Generate API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// ============================================================
// Database Functions
// ============================================================

async function searchTennisRules(
  supabaseUrl: string,
  supabaseKey: string,
  queryEmbedding: number[],
  matchCount: number = 5,
  matchThreshold: number = 0.3
): Promise<TennisRule[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc('match_tennis_rules', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}

// ============================================================
// Helper: Resolve Gemini API Key
// ============================================================

function resolveApiKey(req: Request, body: SearchRequest): string {
  // 1. Client-provided key in request body
  if (body.geminiApiKey && body.geminiApiKey.trim().length > 0) {
    return body.geminiApiKey.trim();
  }

  // 2. Client-provided key in header
  const headerKey = req.headers.get('x-gemini-api-key');
  if (headerKey && headerKey.trim().length > 0) {
    return headerKey.trim();
  }

  // 3. Environment variable fallback
  const envKey = Deno.env.get('GEMINI_API_KEY');
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  throw new Error(
    'Gemini API key is required. Provide it in the request body (geminiApiKey), ' +
    'the x-gemini-api-key header, or set the GEMINI_API_KEY environment variable.'
  );
}

// ============================================================
// CORS Headers
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-gemini-api-key',
};

// ============================================================
// Main Handler
// ============================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const requestBody: SearchRequest = await req.json();
    const { question, language, includeStats, generateAnswer: shouldGenerateAnswer = true } = requestBody;

    // Resolve API key (body -> header -> env)
    const geminiApiKey = resolveApiKey(req, requestBody);

    // Validate inputs
    if (!question) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required field: question',
        } as SearchResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Step 1: Generate embedding for the question
    console.log('Generating embedding for question...');
    const queryEmbedding = await generateEmbedding(question, geminiApiKey);

    // Step 2: Search for relevant tennis rules
    console.log('Searching tennis rules database...');
    const matches = await searchTennisRules(
      supabaseUrl,
      supabaseKey,
      queryEmbedding,
      5,   // top 5 matches
      0.3  // 30% similarity threshold
    );

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          answer: language === 'ko'
            ? '죄송합니다. 질문과 관련된 테니스 규칙을 찾을 수 없습니다. 다른 방식으로 질문해 주시겠어요?'
            : 'Sorry, I couldn\'t find relevant tennis rules for your question. Could you try rephrasing it?',
          matches: [],
        } as SearchResponse),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Step 3: Prepare context from matches
    const context = matches
      .map(
        (match, index) =>
          `[${index + 1}] ${match.rule_id}\n${match.content}\n(Source: ${match.source_file}, Relevance: ${(match.similarity * 100).toFixed(1)}%)`
      )
      .join('\n\n');

    // Step 4: Generate answer (optional)
    let answer: string | undefined;
    if (shouldGenerateAnswer) {
      console.log('Generating AI answer...');
      answer = await generateAnswer(question, context, geminiApiKey, language);
    }

    // Step 5: Calculate stats (optional)
    let stats;
    if (includeStats) {
      const avgSimilarity = matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length;
      const sourceCount: Record<string, number> = {};
      matches.forEach((m) => {
        sourceCount[m.source_file] = (sourceCount[m.source_file] || 0) + 1;
      });
      const topSource = Object.entries(sourceCount).sort((a, b) => b[1] - a[1])[0][0];

      stats = {
        matchCount: matches.length,
        avgSimilarity: Math.round(avgSimilarity * 100) / 100,
        topSource,
      };
    }

    // Step 6: Return response
    const response: SearchResponse = {
      success: true,
      answer,
      matches: matches.map((m) => ({
        id: m.id,
        rule_id: m.rule_id,
        content: m.content,
        source_file: m.source_file,
        metadata: m.metadata,
        similarity: Math.round(m.similarity * 100) / 100,
      })),
      stats,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      } as SearchResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
