import React, { useState, useRef, useEffect } from 'react';
<parameter name="X, Send, Loader, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { getStoredApiKey, getStoredModel } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { API_ERROR_KEYWORDS } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabaseClient';

interface ChatMessageSource {
  rule_id: string;
  source_file: string;
  similarity: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: ChatMessageSource[];
}

interface TennisRulesChatModalProps {
  onClose: () => void;
}

export const TennisRulesChatModal: React.FC<TennisRulesChatModalProps> = ({
  onClose,
}) => {
  const { showToast } = useToast();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [ruleDataStatus, setRuleDataStatus] = useState<{ loaded: boolean; count: number; checking: boolean }>({
    loaded: false,
    count: 0,
    checking: true,
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    { text: 'What is a let in tennis?', emoji: '🎾' },
    { text: '테니스 서브 규칙은?', emoji: '🏓' },
    { text: 'What is a foot fault?', emoji: '👟' },
    { text: '타이브레이크 규칙 설명해줘', emoji: '📋' },
    { text: 'How does the scoring system work?', emoji: '📊' },
    { text: '복식 리시버 순서는?', emoji: '👥' },
  ];

  // Check rule data availability on mount
  useEffect(() => {
    const checkRuleData = async () => {
      try {
        const { count, error } = await supabase
          .from('tennis_rules')
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error('Error checking tennis rules:', error);
          setRuleDataStatus({ loaded: false, count: 0, checking: false });
        } else {
          const ruleCount = count || 0;
          setRuleDataStatus({ loaded: ruleCount > 0, count: ruleCount, checking: false });
        }
      } catch (error) {
        console.error('Failed to check rule data:', error);
        setRuleDataStatus({ loaded: false, count: 0, checking: false });
      }
    };

    checkRuleData();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle ESC key to close modal
  useEscapeKey(onClose);

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      // Detect language from question
      const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(question);
      const language = isKorean ? 'ko' : 'en';

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = getStoredApiKey();
      const model = getStoredModel();

      console.log('[Tennis Rules] Preparing request:', {
        language,
        model,
        hasApiKey: !!apiKey,
        supabaseUrl,
        questionLength: question.trim().length,
      });

      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      if (!apiKey) {
        throw new Error('API key not found');
      }

      console.log('[Tennis Rules] Calling edge function...');

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
            model,
            includeStats: true,
            generateAnswer: true,
          }),
        }
      );

      console.log('[Tennis Rules] Response status:', response.status, response.statusText);

      const data = await response.json();

      console.log('[Tennis Rules] Response data:', {
        success: data.success,
        errorType: data.errorType,
        hasAnswer: !!data.answer,
        matchCount: data.matches?.length || 0,
        error: data.error,
      });

      if (!response.ok || !data.success) {
        const errorType = data.errorType || 'UNKNOWN_ERROR';
        const errorMsg = data.error || 'Unknown error';
        console.error('[Tennis Rules] Request failed:', { errorType, errorMsg, status: response.status });
        throw new Error(`${errorType}: ${errorMsg}`);
      }

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.answer || 'No answer generated.',
        timestamp: new Date(),
        sources: data.matches?.slice(0, 3).map((m: { rule_id: string; source_file: string; similarity: number }) => ({
          rule_id: m.rule_id,
          source_file: m.source_file,
          similarity: m.similarity,
        })),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      // Log detailed error for debugging (secure logs only)
      console.error('Chat error:', error);

      const errorText = error instanceof Error ? error.message : 'Unknown error';
      const isGeminiError = errorText.includes('GEMINI_API_ERROR');
      const isQuotaError = API_ERROR_KEYWORDS.QUOTA_EXCEEDED.some(keyword =>
        errorText.includes(keyword)
      );
      const isInvalidKey = API_ERROR_KEYWORDS.INVALID_KEY.some(keyword =>
        errorText.includes(keyword)
      );

      // Show user-friendly error messages (no sensitive data)
      let userMessage: string;
      let toastMessage: string;

      if (isQuotaError) {
        toastMessage = 'API quota exceeded. Please create a new key.';
        userMessage = '⚠️ API Quota Exceeded\n\nYour Gemini API key has reached its usage limit.\n\nPlease:\n1. Visit https://aistudio.google.com/app/apikey\n2. Create a new API key\n3. Update it in Settings\n\nFree tier: 15 requests/min, 1500/day';
      } else if (isInvalidKey) {
        toastMessage = 'Invalid API key. Please check your settings.';
        userMessage = '❌ Invalid API Key\n\nPlease check:\n1. Your Gemini API key is correct\n2. The key is enabled in Google AI Studio\n3. Update it in Settings if needed';
      } else if (isGeminiError) {
        toastMessage = 'Failed to process your request. Please try again.';
        userMessage = '❌ Request Failed\n\nPlease check:\n1. Your Gemini API key is valid\n2. The API key has sufficient quota\n3. Your internet connection is stable';
      } else {
        toastMessage = 'An error occurred. Please try again.';
        userMessage = '❌ Error\n\nSomething went wrong. Please check your connection and try again.';
      }

      showToast(toastMessage, 'error');

      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: userMessage,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
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
    <div onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
              <BookOpen size={24} className="text-indigo-400" />
              Ask Tennis Questions
            </h2>
            {/* Rule Data Status Indicator */}
            {ruleDataStatus.checking ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader size={14} className="animate-spin" />
                <span>Checking data...</span>
              </div>
            ) : ruleDataStatus.loaded ? (
              <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-950/30 px-2 py-1 rounded-full border border-green-500/20">
                <CheckCircle2 size={14} />
                <span>{ruleDataStatus.count.toLocaleString()} rules ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/30 px-2 py-1 rounded-full border border-amber-500/20">
                <AlertCircle size={14} />
                <span>No rules data</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {chatMessages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-slate-500 hover:text-white text-sm px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <BookOpen size={48} className="mb-4 text-indigo-400 opacity-50" />
                <p className="font-semibold text-indigo-300 mb-2">
                  Ask me about tennis rules!
                </p>
                <p className="text-sm text-slate-400 mb-6">
                  Ask in English or Korean
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {suggestedQuestions.map((sq, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuestion(sq.text);
                      }}
                      className="text-xs bg-indigo-950/50 border border-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full hover:bg-indigo-900/50 hover:border-indigo-500/40 transition-colors"
                    >
                      {sq.emoji} {sq.text}
                    </button>
                  ))}
                </div>
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
                      className={`max-w-[85%] rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-indigo-100 border border-indigo-500/20'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-indigo-500/20 space-y-1">
                          <p className="text-xs text-indigo-300 font-semibold">
                            📚 Sources:
                          </p>
                          {msg.sources.map((source, idx) => (
                            <p key={idx} className="text-xs text-slate-400">
                              • {source.rule_id} ({(source.similarity * 100).toFixed(0)}% match)
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

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-indigo-100 rounded-lg p-4 border border-indigo-500/20">
                      <Loader size={20} className="animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-slate-700 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about tennis rules..."
              disabled={loading}
              className="flex-1 bg-indigo-950/50 border border-indigo-500/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 disabled:opacity-50"
            />
            <button
              onClick={handleAskQuestion}
              disabled={loading || !question.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 px-4 py-3 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center mt-2">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};
