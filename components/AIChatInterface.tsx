import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { generateAIAnalysis, getStoredApiKey } from '../services/geminiService';
import { Sparkles, Send, Loader, BookOpen, BarChart3, X } from 'lucide-react';
import type { Player, Match } from '../types';

type TabType = 'stats' | 'chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
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

      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      if (!apiKey) {
        throw new Error('API key not found');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/search-tennis-rules`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: question.trim(),
            geminiApiKey: apiKey,
            language,
            includeStats: true,
            generateAnswer: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer || 'No answer generated.',
          timestamp: new Date(),
          sources: data.matches?.slice(0, 3).map((m: any) => ({
            title: m.title,
            source_file: m.source_file,
            similarity: m.similarity,
          })),
        };

        setChatMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Chat error:', error);
      showToast('Failed to get answer. Please try again.', 'error');

      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
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
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl border border-indigo-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-indigo-500/30">
        <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
          <Sparkles size={20} /> AI Coach
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-indigo-500/20 bg-indigo-950/30">
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
      <div className="p-6">
        {!hasApiKey && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm">
            ⚠️ Please set your Gemini API key above to use AI Coach.
          </div>
        )}

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
                                • {source.title} ({(source.similarity * 100).toFixed(0)}%
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
