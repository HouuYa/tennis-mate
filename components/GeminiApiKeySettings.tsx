import React, { useState, useEffect } from 'react';
import { Key, Check, X, Loader2, Eye, EyeOff, ExternalLink, ChevronDown } from 'lucide-react';
import { getStoredApiKey, saveApiKey, clearApiKey, testApiKey, GEMINI_MODELS, getStoredModel, saveModel, type GeminiModelId } from '../services/geminiService';
import { useToast } from '../context/ToastContext';

interface GeminiApiKeySettingsProps {
  onClose?: () => void;
  onKeyUpdate?: (hasKey: boolean) => void;
  compact?: boolean; // For inline display in StatsView
}

export const GeminiApiKeySettings: React.FC<GeminiApiKeySettingsProps> = ({
  onClose,
  onKeyUpdate,
  compact = false
}) => {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(getStoredModel());

  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) {
      setApiKey(stored);
      setHasStoredKey(true);
      setIsValid(true); // Assume valid if stored
    }
  }, []);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      showToast('Please enter an API key', 'warning');
      return;
    }

    setTesting(true);
    setIsValid(null);
    setErrorMessage('');

    const result = await testApiKey(apiKey.trim());

    setTesting(false);
    setIsValid(result.valid);

    if (result.valid) {
      showToast('✅ API key is valid!', 'success');
      setErrorMessage('');
      saveApiKey(apiKey.trim());
      saveModel(selectedModel);
      setHasStoredKey(true);
      // Notify parent that key is available
      onKeyUpdate?.(true);
      // Call onClose to refresh parent component
      setTimeout(() => {
        onClose?.();
      }, 500);
    } else {
      // Show simple toast, detailed error below
      showToast('API key validation failed', 'error');
      setErrorMessage(result.error || 'Invalid API key');
    }
  };

  const handleClear = () => {
    clearApiKey();
    setApiKey('');
    setIsValid(null);
    setErrorMessage('');
    setHasStoredKey(false);
    onKeyUpdate?.(false);
    showToast('API key removed', 'info');
  };

  const getGeminiApiKeyUrl = () => {
    return 'https://aistudio.google.com/app/apikey';
  };

  if (compact) {
    return (
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-indigo-400" />
            <span className="text-sm font-medium text-slate-300">Gemini API Key</span>
            {isValid && (
              <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full border border-green-700/50">
                Connected
              </span>
            )}
          </div>
          <a
            href={getGeminiApiKeyUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline flex items-center gap-1"
          >
            Get API Key <ExternalLink size={12} />
          </a>
        </div>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza...your_api_key_here"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-20 text-white text-xs focus:border-indigo-500 outline-none font-mono"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-2 text-slate-500 hover:text-white"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => { setSelectedModel(e.target.value as GeminiModelId); saveModel(e.target.value as GeminiModelId); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-white text-xs focus:border-indigo-500 outline-none appearance-none"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.description}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing || !apiKey.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1 disabled:opacity-50 transition-colors"
          >
            {testing ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Testing...
              </>
            ) : (
              <>Test & Save</>
            )}
          </button>
          {hasStoredKey && (
            <button
              onClick={handleClear}
              className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {isValid === false && errorMessage && (
          <div className="text-xs text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-700/50">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  // Full modal view
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-6 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
            <Key size={20} /> Gemini API Key
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            To use AI Coach, you need a Gemini API key. Get one for free from Google AI Studio.
          </p>

          <a
            href={getGeminiApiKeyUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
          >
            Get your free API key <ExternalLink size={14} />
          </a>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza...your_api_key_here"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 pr-12 text-white text-sm focus:border-indigo-500 outline-none font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-3.5 text-slate-500 hover:text-white"
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">AI Model</label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => { setSelectedModel(e.target.value as GeminiModelId); saveModel(e.target.value as GeminiModelId); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 pr-10 text-white text-sm focus:border-indigo-500 outline-none appearance-none"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.description}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {isValid === true && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 p-3 rounded-lg border border-green-700/50">
              <Check size={16} />
              <span>API key is valid and saved!</span>
            </div>
          )}

          {isValid === false && errorMessage && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-700/50 whitespace-pre-line">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={testing || !apiKey.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {testing ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Testing...
              </>
            ) : (
              <>
                <Check size={18} /> Test & Save
              </>
            )}
          </button>

          {hasStoredKey && (
            <button
              onClick={handleClear}
              className="px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            💡 Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>
      </div>
    </div>
  );
};
