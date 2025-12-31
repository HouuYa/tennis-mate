import { GoogleGenAI } from "@google/genai";
import { Player, Match } from "../types";
import { AI_INSTRUCTION } from "../constants";

export const generateAIAnalysis = async (players: Player[], matches: Match[]): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return "API Key is missing. Cannot generate AI analysis.";
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
      model: 'gemini-2.5-flash',
      contents: `Here is the tennis club data: ${JSON.stringify(dataSummary)}`,
      config: {
        systemInstruction: AI_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I couldn't analyze the match data at this moment.";
  }
};