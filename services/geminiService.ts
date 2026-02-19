import { GoogleGenAI } from "@google/genai";
import { Player, Match } from "../types";
import { AI_INSTRUCTION, API_ERROR_KEYWORDS } from "../constants";

const GEMINI_API_KEY_STORAGE = 'tennis-mate-gemini-api-key';
const GEMINI_MODEL_STORAGE = 'tennis-mate-gemini-model';

// Dynamic model interface (returned by fetchAvailableModels)
export interface DynamicGeminiModel {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
  deprecated?: boolean;
  deprecationDate?: string; // ISO date string for near-EOL display
}

// Supplementary known deprecation dates (fallback if API doesn't provide them)
const KNOWN_DEPRECATION_DATES: Record<string, string> = {
  'gemini-2.0-flash': '2026-03-01',
  'gemini-1.5-pro': '2026-03-01',
  'gemini-1.5-flash': '2026-03-01',
  'gemini-1.5-pro-002': '2026-03-01',
  'gemini-1.5-flash-002': '2026-03-01',
};

// Static fallback list (used when API key is not yet available or fetch fails)
export const FALLBACK_GEMINI_MODELS: DynamicGeminiModel[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Recommended — fast & capable', recommended: true },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', description: 'Cost-efficient, high-throughput' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable, complex reasoning' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Legacy (retiring Mar 2026)', deprecated: true, deprecationDate: '2026-03-01' },
];

// Backward-compatible alias
export const GEMINI_MODELS = FALLBACK_GEMINI_MODELS;

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// Known IDs provide autocompletion; `string & {}` allows any dynamic ID from the API
export type GeminiModelId = typeof FALLBACK_GEMINI_MODELS[number]['id'] | (string & {});

// Fetch available models dynamically from the Gemini REST API.
// Filters out preview, gemma, and non-generateContent models.
export const fetchAvailableModels = async (apiKey: string): Promise<DynamicGeminiModel[]> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const models: DynamicGeminiModel[] = [];

  for (const model of data.models || []) {
    const id: string = model.name?.replace('models/', '') ?? '';
    if (!id) continue;

    // Only include models that support content generation
    if (!model.supportedGenerationMethods?.includes('generateContent')) continue;

    // Skip preview models (unstable / subject to change without notice)
    if (id.includes('preview')) continue;

    // Skip gemma models (open-weights, different use case)
    if (id.includes('gemma')) continue;

    // Only include the gemini family
    if (!id.startsWith('gemini')) continue;

    // Determine deprecation date: from API response field or known-dates map
    const rawDeprecationDate: string | undefined =
      model.deprecationDate ?? KNOWN_DEPRECATION_DATES[id];

    const deprecated = !!rawDeprecationDate && new Date(rawDeprecationDate) <= now;

    models.push({
      id,
      name: model.displayName || id,
      description: model.description || '',
      recommended: id === DEFAULT_GEMINI_MODEL,
      deprecated,
      deprecationDate: rawDeprecationDate,
    });
  }

  // Sort: recommended first → active → near-EOL → deprecated last
  return models.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    if (a.deprecated && !b.deprecated) return 1;
    if (!a.deprecated && b.deprecated) return -1;
    const aEOL = a.deprecationDate && new Date(a.deprecationDate) <= ninetyDaysFromNow;
    const bEOL = b.deprecationDate && new Date(b.deprecationDate) <= ninetyDaysFromNow;
    if (aEOL && !bEOL) return 1;
    if (!aEOL && bEOL) return -1;
    return a.id.localeCompare(b.id);
  });
};

// Get stored model from localStorage
export const getStoredModel = (): GeminiModelId => {
  const stored = localStorage.getItem(GEMINI_MODEL_STORAGE);
  if (stored && stored.trim().length > 0) {
    return stored;
  }
  return DEFAULT_GEMINI_MODEL;
};

// Save model to localStorage
export const saveModel = (model: GeminiModelId): void => {
  localStorage.setItem(GEMINI_MODEL_STORAGE, model);
};

// Helper function to check if error message contains any of the keywords
const errorContainsKeywords = (message: string, keywords: readonly string[]): boolean => {
  return keywords.some(keyword => message.includes(keyword));
};

// Get stored API key from localStorage
export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE);
};

// Save API key to localStorage
export const saveApiKey = (apiKey: string): void => {
  localStorage.setItem(GEMINI_API_KEY_STORAGE, apiKey);
};

// Remove stored API key
export const clearApiKey = (): void => {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
};

// Test if API key is valid
export const testApiKey = async (apiKey: string): Promise<{ valid: boolean; error?: string }> => {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: "API key is empty" };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const model = getStoredModel();
    const response = await ai.models.generateContent({
      model,
      contents: 'Hello',
      config: { temperature: 0.1 }
    });

    if (response.text) {
      return { valid: true };
    } else {
      return { valid: false, error: "No response from API" };
    }
  } catch (error: unknown) {
    console.error('API key test error:', error);

    // Handle quota exceeded error (429)
    if (error instanceof Error && errorContainsKeywords(error.message, API_ERROR_KEYWORDS.QUOTA_EXCEEDED)) {
      return {
        valid: false,
        error: "⚠️ API quota exceeded. Please create a new API key at https://aistudio.google.com/app/apikey"
      };
    }

    // Handle invalid API key error
    if (error instanceof Error && errorContainsKeywords(error.message, API_ERROR_KEYWORDS.INVALID_KEY)) {
      return {
        valid: false,
        error: "❌ Invalid API key. Please check your Gemini API key."
      };
    }

    // Provide detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      valid: false,
      error: `API key test failed: ${errorMessage}`
    };
  }
};

export const generateAIAnalysis = async (
  players: Player[],
  matches: Match[],
  userApiKey?: string
): Promise<string> => {
  // Priority: userApiKey > stored key > env key
  const apiKey = userApiKey || getStoredApiKey() || import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return "API Key is missing. Please set your Gemini API key in settings.";
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare data summary for the model
  const dataSummary = {
    totalMatches: matches.length,
    players: players.map(p => ({
      name: p.name,
      matches: p.stats.matchesPlayed,
      winRate: p.stats.matchesPlayed > 0 ? (p.stats.wins / p.stats.matchesPlayed).toFixed(2) : 0,
      gameDiff: p.stats.gamesWon - p.stats.gamesLost
    })).sort((a,b) => parseFloat(b.winRate as string) - parseFloat(a.winRate as string)),
    recentMatches: matches.slice(0, 5).map(m => ({
      score: `${m.scoreA}:${m.scoreB}`,
      finished: m.isFinished
    }))
  };

  try {
    const model = getStoredModel();
    const response = await ai.models.generateContent({
      model,
      contents: `Here is the tennis club data: ${JSON.stringify(dataSummary)}`,
      config: {
        systemInstruction: AI_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || "No analysis available.";
  } catch (error: unknown) {
    console.error("Gemini API Error:", error instanceof Error ? error.message : error);

    // Handle quota exceeded error (429)
    if (error instanceof Error && errorContainsKeywords(error.message, API_ERROR_KEYWORDS.QUOTA_EXCEEDED)) {
      return "⚠️ **API Quota Exceeded**\n\nYour Gemini API key has reached its usage limit. Please:\n\n1. Visit https://aistudio.google.com/app/apikey\n2. Create a new API key\n3. Update it in Tennis Mate settings\n\nFree tier limits: 15 requests/minute, 1500 requests/day";
    }

    // Handle invalid API key error
    if (error instanceof Error && errorContainsKeywords(error.message, API_ERROR_KEYWORDS.INVALID_KEY)) {
      return "❌ Invalid API key. Please check your Gemini API key in settings.";
    }

    return "Sorry, I couldn't analyze the match data at this moment.";
  }
};
