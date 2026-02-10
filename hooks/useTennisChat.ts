import { useState } from 'react';
import { getStoredModel, saveModel, type GeminiModelId } from '../services/geminiService';
import { useToast } from '../context/ToastContext';

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

type ErrorType = 'quota' | 'invalid_key' | 'network' | 'generic';

interface LastError {
  type: ErrorType;
  message: string;
}

interface UseTennisChatReturn {
  // State
  chatMessages: ChatMessage[];
  currentModel: GeminiModelId;
  lastError: LastError | null;

  // Actions
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setLastError: React.Dispatch<React.SetStateAction<LastError | null>>;
  handleModelChange: (newModel: GeminiModelId) => void;
  handleApiKeyUpdated: () => void;
  handleRetry: (retryFn: () => void) => void;
  clearChat: () => void;
}

/**
 * Custom hook for managing tennis chat state and actions
 * Shared between TennisRulesChatModal and AIChatInterface
 */
export function useTennisChat(): UseTennisChatReturn {
  const { showToast } = useToast();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<GeminiModelId>(getStoredModel());
  const [lastError, setLastError] = useState<LastError | null>(null);

  const handleModelChange = (newModel: GeminiModelId) => {
    setCurrentModel(newModel);
    saveModel(newModel);
    showToast(`Switched to ${newModel}`, 'success');
    setLastError(null); // Clear error when model changes
  };

  const handleApiKeyUpdated = () => {
    showToast('API key updated successfully', 'success');
    setLastError(null); // Clear error when API key is updated
  };

  const handleRetry = (retryFn: () => void) => {
    if (chatMessages.length > 0) {
      const lastUserMessage = [...chatMessages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        // Call the retry function provided by the component
        retryFn();
      }
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    showToast('Chat history cleared', 'success');
  };

  return {
    // State
    chatMessages,
    currentModel,
    lastError,

    // Actions
    setChatMessages,
    setLastError,
    handleModelChange,
    handleApiKeyUpdated,
    handleRetry,
    clearChat,
  };
}
