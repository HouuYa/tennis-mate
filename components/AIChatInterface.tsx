import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { generateAIAnalysis, getStoredApiKey, getStoredModel } from '../services/geminiService';
import { Sparkles, Send, Loader, BookOpen, BarChart3, X } from 'lucide-react';
import type { Player, Match } from '../types';

type TabType = 'stats' | 'chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    rule_id: string;
    source_file: string;
    similarity: number;
  }>;
}

interface AIChatInterfaceProps {
  players: Player[];
  matches: Match[];
  hasApiKey: boolean;
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  players,
  matches,
  hasApiKey,
}) => {
  const { mode } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [statsAnalysis, setStatsAnalysis] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle Stats Analysis
  const handleAnalyzeStats = async () => {
    if (!hasApiKey) {
      showToast('Please set your Gemini API key first', 'warning');
      return;
    }

    setLoadingStats(true);
    try {
      const analysis = await generateAIAnalysis(players, matches);
      setStatsAnalysis(analysis);
    } catch (error) {
      showToast('Failed to generate analysis', 'error');
      console.error('Analysis error:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Handle Chat Question
  const handleAskQuestion = async () => {
    if (!hasApiKey) {
      showToast('Please set your Gemini API key first', 'warning');
      return;
    }

    if (!question.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoadingChat(true);

    try {
      // Detect language from question
      const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(question);
      const language = isKorean ? 'ko' : 'en';

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = getStoredApiKey();
      const model = getStoredModel();

      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      if (!apiKey) {
        throw new Error('API key not found');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/tennis-rag-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: question.trim(),
            gemini_api_key: apiKey,
            model: model,
            match_count: 5,
            match_threshold: 0.3,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unknown error');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No answer generated.',
        timestamp: new Date(),
        sources: data.sources?.slice(0, 3).map((m: { rule_id: string; source_file: string; similarity: number }) => ({
          rule_id: m.rule_id,
          source_file: m.source_file,
          similarity: m.similarity,
        })),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // Log detailed error for debugging (secure logs only)
      console.error('Chat error:', error);

      const errorText = error instanceof Error ? error.message : 'Unknown error';
      const isGeminiError = errorText.includes('GEMINI_API_ERROR');
      const isInvalidKey = errorText.includes('API_KEY_INVALID') || errorText.includes('401');
      const isQuotaError = errorText.includes('429') || errorText.includes('quota');

      // Show user-friendly error messages (no sensitive data)
      let userMessage: string;
      let toastMessage: string;

      if (isInvalidKey) {
        toastMessage = 'Invalid Gemini API key. Please check your settings.';
        userMessage = '❌ Invalid API Key\n\nPlease check:\n1. Your Gemini API key is correct\n2. The key is enabled in Google AI Studio\n3. Update it in Settings if needed';
      } else if (isQuotaError) {
        toastMessage = 'API quota exceeded. Please check your Gemini API key.';
        userMessage = '⚠️ API Quota Exceeded\n\nYour Gemini API key has reached its usage limit.\n\nPlease:\n1. Visit https://aistudio.google.com/app/apikey\n2. Create a new API key\n3. Update it in Settings\n\nFree tier: 15 requests/min, 1500/day';
      } else if (isGeminiError) {
        toastMessage = 'Failed to process your request. Please try again.';
        userMessage = '❌ Request Failed\n\nPlease check:\n1. Your Gemini API key is valid\n2. The API key has sufficient quota\n3. Your internet connection is stable';
      } else {
        toastMessage = 'An error occurred. Please try again.';
        userMessage = '❌ Error\n\nSomething went wrong. Please check your connection and try again.';
      }

      showToast(toastMessage, 'error');

      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: userMessage,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    showToast('Chat history cleared', 'success');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-indigo-500/20 bg-indigo-950/30 flex-shrink-0">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'stats'
              ? 'bg-indigo-900/50 text-indigo-200 border-b-2 border-indigo-400'
              : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30'
          }`}
        >
          <BarChart3 size={16} />
          Analyze Stats
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'chat'
              ? 'bg-indigo-900/50 text-indigo-200 border-b-2 border-indigo-400'
              : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30'
          }`}
        >
          <BookOpen size={16} />
          Ask Question
        </button>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <button
              onClick={handleAnalyzeStats}
              disabled={loadingStats || !hasApiKey}
              className="w-full bg-indigo-600 hover:bg-indigo-500 px-4 py-3 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingStats ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 size={16} />
                  Analyze Stats
                </>
              )}
            </button>

            {statsAnalysis ? (
              <div className="text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap bg-indigo-950/50 p-4 rounded-lg border border-indigo-500/20">
                {statsAnalysis}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">
                Click "Analyze Stats" to get AI insights on MVPs, team chemistry, and
                performance trends.
              </p>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="bg-indigo-950/30 rounded-lg border border-indigo-500/20 h-96 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-sm">
                  <BookOpen size={32} className="mb-2 text-indigo-400" />
                  <p className="font-semibold text-indigo-300 mb-1">
                    Ask me about tennis rules!
                  </p>
                  <p className="text-xs">
                    Example: "What is a let?" or "테니스 서브 규칙은?"
                  </p>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-indigo-100 border border-indigo-500/20'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-indigo-500/20 space-y-1">
                            <p className="text-xs text-indigo-300 font-semibold">
                              📚 Sources:
                            </p>
                            {msg.sources.map((source, idx) => (
                              <p key={idx} className="text-xs text-slate-400">
                                • {source.rule_id} ({(source.similarity * 100).toFixed(0)}%
                                match)
                              </p>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-indigo-300/50 mt-2">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {loadingChat && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 text-indigo-100 rounded-lg p-3 border border-indigo-500/20">
                        <Loader size={16} className="animate-spin" />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about tennis rules..."
                disabled={!hasApiKey || loadingChat}
                className="flex-1 bg-indigo-950/50 border border-indigo-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 disabled:opacity-50"
              />
              <button
                onClick={handleAskQuestion}
                disabled={!hasApiKey || loadingChat || !question.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-3 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
              {chatMessages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-lg text-slate-300 transition-colors"
                  title="Clear chat"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
