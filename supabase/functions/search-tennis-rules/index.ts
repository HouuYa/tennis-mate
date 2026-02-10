// ============================================================
// Tennis Rules RAG Search - Edge Function
// ============================================================
// This Edge Function performs RAG (Retrieval-Augmented Generation)
// searches against the tennis rules database using user-provided
// Gemini API keys.
//
// Endpoint: POST /search-tennis-rules
// Request body:
//   - question: string (user's question)
//   - geminiApiKey: string (user's Gemini API key)
//   - language?: 'en' | 'ko' (optional filter)
//   - includeStats?: boolean (optional, include match stats)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================================
// Types
// ============================================================

interface SearchRequest {
  question: string;
  geminiApiKey: string;
  language?: 'en' | 'ko';
  includeStats?: boolean;
  generateAnswer?: boolean; // If true, generate AI answer; if false, return matches only
}

interface SearchResponse {
  success: boolean;
  answer?: string;
  matches?: Array<{
    id: number;
    title: string;
    content: string;
    source_file: string;
    language: string;
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
  title: string;
  content: string;
  source_file: string;
  language: string;
  chunk_index: number;
  similarity: number;
}

// ============================================================
// Gemini API Functions
// ============================================================

async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text }],
      },
      taskType: 'RETRIEVAL_QUERY',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini Embedding API error:', response.status, error);
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  if (!data.embedding?.values) {
    throw new Error('Invalid embedding response from Gemini API');
  }
  return data.embedding.values;
}

async function generateAnswer(
  question: string,
  context: string,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const prompt = `You are a tennis rules expert. Answer the following question based on the provided context from official tennis rules.

Context from Tennis Rules:
${context}

Question: ${question}

Instructions:
- Provide a clear, accurate answer based ONLY on the context provided
- If the context doesn't contain relevant information, say so
- Cite specific rules or articles when possible
- Be concise but comprehensive
- Use the same language as the question (English or Korean)

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
    console.error('Gemini Generate API error:', response.status, error);
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid generate response from Gemini API');
  }
  return data.candidates[0].content.parts[0].text;
}

// ============================================================
// Database Functions
// ============================================================

async function searchTennisRules(
  supabaseUrl: string,
  supabaseKey: string,
  queryEmbedding: number[],
  language?: string,
  matchCount: number = 5,
  matchThreshold: number = 0.5
): Promise<TennisRule[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc('match_tennis_rules', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_language: language || null,
  });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}

// ============================================================
// Main Handler
// ============================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Parse request
    const requestBody: SearchRequest = await req.json();
    const { question, geminiApiKey, language, includeStats, generateAnswer: shouldGenerateAnswer = true } = requestBody;

    // Validate inputs
    if (!question || !geminiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: question and geminiApiKey',
        } as SearchResponse),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
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
      language,
      5, // top 5 matches
      0.5 // 50% similarity threshold
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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Step 3: Prepare context from matches
    const context = matches
      .map(
        (match, index) =>
          `[${index + 1}] ${match.title}\n${match.content}\n(Source: ${match.source_file}, Relevance: ${(match.similarity * 100).toFixed(1)}%)`
      )
      .join('\n\n');

    // Step 4: Generate answer (optional)
    let answer: string | undefined;
    if (shouldGenerateAnswer) {
      console.log('Generating AI answer...');
      answer = await generateAnswer(question, context, geminiApiKey);
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
        title: m.title,
        content: m.content,
        source_file: m.source_file,
        language: m.language,
        similarity: Math.round(m.similarity * 100) / 100,
      })),
      stats,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in search-tennis-rules:', error);

    // Extract more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isGeminiError = errorMessage.includes('Gemini API error');

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorType: isGeminiError ? 'GEMINI_API_ERROR' : 'SERVER_ERROR',
      } as SearchResponse & { errorType?: string }),
      {
        status: isGeminiError ? 400 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
