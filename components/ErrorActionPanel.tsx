import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Edit3 } from 'lucide-react';
import { GeminiApiKeySettings } from './GeminiApiKeySettings';
import { ModelSwitcher } from './ModelSwitcher';
import type { GeminiModelId } from '../services/geminiService';

interface ErrorActionPanelProps {
  errorType: 'quota' | 'invalid_key' | 'network' | 'generic';
  errorMessage?: string;
  currentModel: GeminiModelId;
  onModelChange: (model: GeminiModelId) => void;
  onApiKeyUpdated: () => void;
  onRetry: () => void;
}

export function ErrorActionPanel({
  errorType,
  errorMessage,
  currentModel,
  onModelChange,
  onApiKeyUpdated,
  onRetry
}: ErrorActionPanelProps) {
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);

  const getErrorConfig = () => {
    switch (errorType) {
      case 'quota':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          title: 'API Quota Exceeded',
          description: 'Your Gemini API key has reached its usage limit.',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          showActions: true
        };
      case 'invalid_key':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
          title: 'Invalid API Key',
          description: 'The API key is not valid or has been revoked.',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          showActions: true
        };
      case 'network':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
          title: 'Network Error',
          description: 'Unable to connect to the API. Please check your connection.',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          showActions: false
        };
      default:
        return {
          icon: <AlertTriangle className="w-5 h-5 text-slate-400" />,
          title: 'Error',
          description: errorMessage || 'An unexpected error occurred.',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/30',
          showActions: false
        };
    }
  };

  const config = getErrorConfig();

  const handleModelSwitch = (newModel: GeminiModelId) => {
    setShowModelSwitcher(false);
    onModelChange(newModel);
    // Auto-retry after model switch
    setTimeout(() => onRetry(), 300);
  };

  const handleApiKeyUpdate = (hasKey: boolean) => {
    if (hasKey) {
      setShowApiKeySettings(false);
      onApiKeyUpdated();
      // Auto-retry after successful key update
      setTimeout(() => onRetry(), 300);
    }
  };

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 space-y-4 animate-in fade-in slide-in-from-top-2`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1">
          <h3 className="font-semibold text-white">{config.title}</h3>
          <p className="text-sm text-slate-400 mt-1">{config.description}</p>
        </div>
      </div>

      {/* Action Buttons */}
      {config.showActions && !showModelSwitcher && !showApiKeySettings && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium">Quick Actions:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModelSwitcher(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Switch Model
            </button>
            <button
              onClick={() => setShowApiKeySettings(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Edit3 className="w-4 h-4" />
              Change API Key
            </button>
          </div>
        </div>
      )}

      {/* Model Switcher (inline) */}
      {showModelSwitcher && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Select a different model:</p>
            <button
              onClick={() => setShowModelSwitcher(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <ModelSwitcher
            currentModel={currentModel}
            onModelChange={handleModelSwitch}
            compact={true}
          />
        </div>
      )}

      {/* API Key Settings (inline) */}
      {showApiKeySettings && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Enter a new API key:</p>
            <button
              onClick={() => setShowApiKeySettings(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <GeminiApiKeySettings
            inline={true}
            onKeyUpdate={handleApiKeyUpdate}
            onClose={() => setShowApiKeySettings(false)}
          />
        </div>
      )}

      {/* Help Link */}
      {errorType === 'quota' && !showModelSwitcher && !showApiKeySettings && (
        <div className="pt-2 border-t border-slate-700/50">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Get a new API key from Google AI Studio →
          </a>
        </div>
      )}
    </div>
  );
}
