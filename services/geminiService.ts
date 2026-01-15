import { GoogleGenAI } from "@google/genai";
import { Player, Match } from "../types";
import { AI_INSTRUCTION } from "../constants";

const GEMINI_API_KEY_STORAGE = 'tennis-mate-gemini-api-key';

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
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: 'Hello',
      config: { temperature: 0.1 }
    });

    if (response.text) {
      return { valid: true };
    } else {
      return { valid: false, error: "No response from API" };
    }
  } catch (error: any) {
    // Handle quota exceeded error (429)
    if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      return {
        valid: false,
        error: "⚠️ API quota exceeded. Please create a new API key at https://aistudio.google.com/app/apikey"
      };
    }

    return {
      valid: false,
      error: error?.message || "Invalid API key or connection error"
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `Here is the tennis club data: ${JSON.stringify(dataSummary)}`,
      config: {
        systemInstruction: AI_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || "No analysis available.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);

    // Handle quota exceeded error (429)
    if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      return "⚠️ **API Quota Exceeded**\n\nYour Gemini API key has reached its usage limit. Please:\n\n1. Visit https://aistudio.google.com/app/apikey\n2. Create a new API key\n3. Update it in Tennis Mate settings\n\nFree tier limits: 15 requests/minute, 1500 requests/day";
    }

    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('401')) {
      return "❌ Invalid API key. Please check your Gemini API key in settings.";
    }

    return "Sorry, I couldn't analyze the match data at this moment.";
  }
};