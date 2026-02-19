import React, { useState, useEffect, useCallback } from 'react';
import { Key, Check, X, Loader2, Eye, EyeOff, ExternalLink, ChevronDown, ChevronLeft, Sparkles } from 'lucide-react';
import {
  getStoredApiKey, saveApiKey, clearApiKey, testApiKey,
  FALLBACK_GEMINI_MODELS, fetchAvailableModels,
  getStoredModel, saveModel, DEFAULT_GEMINI_MODEL,
  type GeminiModelId, type DynamicGeminiModel,
} from '../services/geminiService';
import { useToast } from '../context/ToastContext';

interface GeminiApiKeySettingsProps {
  onClose?: () => void;
  onKeyUpdate?: (hasKey: boolean) => void;
  onModelsLoaded?: (models: DynamicGeminiModel[]) => void; // Lets parent receive freshly fetched models
  compact?: boolean; // For inline display in StatsView
  inline?: boolean; // For embedding in error panels (minimal UI)
  forceKeyStep?: boolean; // Full modal: always start at key-entry step (e.g. "키 변경" flow)
}

// Format the option label for a model, including deprecation/near-EOL hints
function getModelOptionLabel(model: DynamicGeminiModel): string {
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (model.deprecated) {
    return `${model.name} — 서비스 종료됨`;
  }
  if (model.deprecationDate && new Date(model.deprecationDate) <= ninetyDaysFromNow) {
    return `${model.name} — ${model.description} ⚠️ ${model.deprecationDate} 종료`;
  }
  return `${model.name} — ${model.description}`;
}

export const GeminiApiKeySettings: React.FC<GeminiApiKeySettingsProps> = ({
  onClose,
  onKeyUpdate,
  onModelsLoaded,
  compact = false,
  inline = false,
  forceKeyStep = false,
}) => {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(getStoredModel());

  // Full modal only: two-step flow ('key' → 'model')
  // Start at 'model' if key already stored and not forced to re-enter
  const [step, setStep] = useState<'key' | 'model'>(
    !forceKeyStep && !!getStoredApiKey() ? 'model' : 'key'
  );

  const [dynamicModels, setDynamicModels] = useState<DynamicGeminiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch available models from the Gemini API using the provided key.
  // Falls back silently to the static list on failure.
  const loadModels = useCallback(async (key: string) => {
    setLoadingModels(true);
    try {
      const models = await fetchAvailableModels(key);
      setDynamicModels(models);
      onModelsLoaded?.(models); // Propagate to parent (e.g. chat header dropdown)
      // If the stored model is no longer in the dynamic list, reset to default
      if (models.length > 0 && !models.some(m => m.id === selectedModel)) {
        setSelectedModel(DEFAULT_GEMINI_MODEL);
        saveModel(DEFAULT_GEMINI_MODEL);
      }
    } catch {
      // Silent fallback — keep dynamicModels empty so FALLBACK_GEMINI_MODELS is used
    } finally {
      setLoadingModels(false);
    }
  }, [selectedModel, onModelsLoaded]);

  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) {
      setApiKey(stored);
      setHasStoredKey(true);
      setIsValid(true); // Assume valid if stored
      loadModels(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The model list to render: prefer dynamic, fall back to static
  const modelList = dynamicModels.length > 0 ? dynamicModels : FALLBACK_GEMINI_MODELS;

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
      setHasStoredKey(true);
      // Fetch fresh model list with the validated key
      loadModels(apiKey.trim());
      // Notify parent that key is available
      onKeyUpdate?.(true);

      if (compact || inline) {
        // Compact / inline: save model and close immediately
        saveModel(selectedModel);
        setTimeout(() => { onClose?.(); }, 500);
      } else {
        // Full modal: advance to model selection step
        setStep('model');
      }
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
    setDynamicModels([]);
    onKeyUpdate?.(false);
    showToast('API key removed', 'info');
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value as GeminiModelId);
    saveModel(value as GeminiModelId);
  };

  // Full modal step 2: save model choice and close
  const handleSaveModel = () => {
    saveModel(selectedModel);
    onKeyUpdate?.(true);
    onClose?.();
  };

  const getGeminiApiKeyUrl = () => {
    return 'https://aistudio.google.com/app/apikey';
  };

  // Inline mode for error panels (most minimal — no model selector)
  if (inline) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza...your_api_key_here"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:border-blue-500 outline-none font-mono"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-2 text-slate-500 hover:text-white"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <button
          onClick={handleTest}
          disabled={testing || !apiKey.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {testing ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Testing...
            </>
          ) : (
            <>
              <Check size={14} /> Test & Save
            </>
          )}
        </button>

        {isValid === false && errorMessage && (
          <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-700/50">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

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

        {/* Model selector — only after key is confirmed */}
        {hasStoredKey && (
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={loadingModels}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-white text-xs focus:border-indigo-500 outline-none appearance-none disabled:opacity-60"
            >
              {loadingModels ? (
                <option value="">모델 목록 불러오는 중...</option>
              ) : (
                modelList.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.deprecated}>
                    {getModelOptionLabel(m)}
                  </option>
                ))
              )}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
          </div>
        )}

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

  // Full modal view — two-step: [Step 1: key entry] → [Step 2: model selection]
  // stopPropagation on the backdrop prevents clicks from bubbling to any parent
  // modal's backdrop handler (e.g. TennisRulesChatModal's onClick={onClose} wrapper).
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-6 animate-in slide-in-from-bottom-4">

        {/* ── STEP 1: API Key Entry ── */}
        {step === 'key' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
                <Key size={20} /> Gemini API Key
              </h2>
              {onClose && (
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                AI Coach를 사용하려면 Gemini API 키가 필요합니다. Google AI Studio에서 무료로 받으세요.
              </p>
              <a
                href={getGeminiApiKeyUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
              >
                무료 API 키 발급 <ExternalLink size={14} />
              </a>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTest()}
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
                  <><Loader2 size={18} className="animate-spin" /> 검증 중...</>
                ) : (
                  <><Check size={18} /> 검증 후 다음 →</>
                )}
              </button>
              {hasStoredKey && (
                <button
                  onClick={handleClear}
                  className="px-5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  초기화
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                💡 API 키는 브라우저에만 저장되며 서버로 전송되지 않습니다.
              </p>
            </div>
          </>
        )}

        {/* ── STEP 2: Model Selection ── */}
        {step === 'model' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
                <Sparkles size={20} /> AI 모델 선택
              </h2>
              {onClose && (
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* API key verified badge */}
              <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 p-3 rounded-lg border border-green-700/50">
                <Check size={16} />
                <span>API 키 인증 완료</span>
              </div>

              {/* Model selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">사용할 모델을 선택하세요</label>
                  {loadingModels && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> 불러오는 중...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={loadingModels}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 pr-10 text-white text-sm focus:border-indigo-500 outline-none appearance-none disabled:opacity-60"
                  >
                    {loadingModels ? (
                      <option value="">모델 목록 불러오는 중...</option>
                    ) : (
                      modelList.map((m) => (
                        <option key={m.id} value={m.id} disabled={m.deprecated}>
                          {getModelOptionLabel(m)}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" />
                </div>
                {!loadingModels && dynamicModels.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    ✨ 실시간으로 {dynamicModels.length}개 모델을 불러왔습니다.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {/* Back to key step */}
              <button
                onClick={() => setStep('key')}
                className="flex items-center gap-1 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors text-sm"
              >
                <ChevronLeft size={16} /> 키 변경
              </button>
              <button
                onClick={handleSaveModel}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Check size={18} /> 저장 후 시작
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                💡 모델은 언제든지 채팅 화면에서 변경할 수 있습니다.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
