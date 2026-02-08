import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader, BookOpen } from 'lucide-react';
import { getStoredApiKey } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { API_ERROR_KEYWORDS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

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
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: unknown) {
      console.error('Chat error:', error);

      let errorContent = 'Sorry, I encountered an error. Please try again.';

      // Check if it's a quota error
      if (error instanceof Error) {
        const isQuotaError = API_ERROR_KEYWORDS.QUOTA_EXCEEDED.some(keyword =>
          error.message.includes(keyword)
        );

        if (isQuotaError) {
          errorContent = '⚠️ API Quota Exceeded\n\nYour Gemini API key has reached its usage limit.\n\nPlease:\n1. Visit https://aistudio.google.com/app/apikey\n2. Create a new API key\n3. Update it in Settings\n\nFree tier: 15 requests/min, 1500/day';
          showToast('API quota exceeded. Please create a new key.', 'error');
        } else {
          showToast('Failed to get answer. Please try again.', 'error');
        }
      } else {
        showToast('Failed to get answer. Please try again.', 'error');
      }

      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: errorContent,
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
          <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
            <BookOpen size={24} className="text-indigo-400" />
            Ask Tennis Questions
          </h2>
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
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <BookOpen size={48} className="mb-4 text-indigo-400 opacity-50" />
                <p className="font-semibold text-indigo-300 mb-2">
                  Ask me about tennis rules!
                </p>
                <p className="text-sm text-slate-400">
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
