import { useState, useEffect } from 'react';
import {
  getStoredModel, saveModel, getStoredApiKey, fetchAvailableModels,
  type GeminiModelId, type DynamicGeminiModel,
} from '../services/geminiService';
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
  availableModels: DynamicGeminiModel[];
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
 * Custom hook for managing tennis chat state and actions.
 * Shared between TennisRulesChatModal and AIChatInterface.
 * Fetches available Gemini models dynamically when an API key is present.
 */
export function useTennisChat(): UseTennisChatReturn {
  const { showToast } = useToast();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<GeminiModelId>(getStoredModel());
  const [lastError, setLastError] = useState<LastError | null>(null);
  const [availableModels, setAvailableModels] = useState<DynamicGeminiModel[]>([]);

  // Fetch the live model list on mount (requires stored API key)
  useEffect(() => {
    const key = getStoredApiKey();
    if (key) {
      fetchAvailableModels(key)
        .then(setAvailableModels)
        .catch(() => {}); // silent fallback — ModelSwitcher uses FALLBACK_GEMINI_MODELS
    }
  }, []);

  const handleModelChange = (newModel: GeminiModelId) => {
    setCurrentModel(newModel);
    saveModel(newModel);
    showToast(`Switched to ${newModel}`, 'success');
    setLastError(null); // Clear error when model changes
  };

  const handleApiKeyUpdated = () => {
    showToast('API key updated successfully', 'success');
    setLastError(null); // Clear error when API key is updated
    // Re-fetch model list with the new key
    const key = getStoredApiKey();
    if (key) {
      fetchAvailableModels(key)
        .then(setAvailableModels)
        .catch(() => {});
    }
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
    availableModels,
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
