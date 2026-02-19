import React from 'react';
import { ChevronDown, Sparkles, Zap, Brain, Archive } from 'lucide-react';
import { FALLBACK_GEMINI_MODELS, type GeminiModelId, type DynamicGeminiModel } from '../services/geminiService';

interface ModelSwitcherProps {
  currentModel: GeminiModelId;
  onModelChange: (model: GeminiModelId) => void;
  compact?: boolean;
  showInHeader?: boolean;
  models?: DynamicGeminiModel[]; // Dynamic list from fetchAvailableModels; falls back to FALLBACK_GEMINI_MODELS
}

const NOW = new Date();
const NINETY_DAYS_FROM_NOW = new Date(NOW.getTime() + 90 * 24 * 60 * 60 * 1000);

function isNearEOL(model: DynamicGeminiModel): boolean {
  return (
    !model.deprecated &&
    !!model.deprecationDate &&
    new Date(model.deprecationDate) <= NINETY_DAYS_FROM_NOW
  );
}

function formatRetirementDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function ModelSwitcher({
  currentModel,
  onModelChange,
  compact = false,
  showInHeader = false,
  models,
}: ModelSwitcherProps) {
  const modelList = models && models.length > 0 ? models : FALLBACK_GEMINI_MODELS;

  const getModelIcon = (modelId: string) => {
    if (modelId.includes('pro')) return <Brain className="w-4 h-4" />;
    if (modelId.includes('lite')) return <Zap className="w-4 h-4" />;
    if (modelId.includes('2.0')) return <Archive className="w-4 h-4" />;
    return <Sparkles className="w-4 h-4" />;
  };

  const currentModelData = modelList.find(m => m.id === currentModel);

  if (showInHeader) {
    // Compact dropdown for header bar
    return (
      <div className="relative inline-block">
        <select
          value={currentModel}
          onChange={(e) => onModelChange(e.target.value as GeminiModelId)}
          className="appearance-none bg-slate-800/50 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-colors"
        >
          {modelList.map((model) => (
            <option key={model.id} value={model.id} disabled={model.deprecated}>
              {model.name}
              {isNearEOL(model) ? ` ⚠️` : ''}
              {model.deprecated ? ' (종료됨)' : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
      </div>
    );
  }

  if (compact) {
    // Button-based selection with visual feedback and status badges
    return (
      <div className="space-y-2">
        {modelList.map((model) => {
          const isSelected = model.id === currentModel;
          const isDeprecated = !!model.deprecated;
          const nearEOL = isNearEOL(model);

          return (
            <button
              key={model.id}
              onClick={() => onModelChange(model.id)}
              disabled={isDeprecated}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                ${isSelected
                  ? 'bg-blue-600/20 border-blue-500/50 text-white'
                  : isDeprecated
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }
              `}
            >
              <div className={isSelected ? 'text-blue-400' : isDeprecated ? 'text-slate-600' : 'text-slate-500'}>
                {getModelIcon(model.id)}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{model.name}</span>
                  {model.recommended && !isDeprecated && (
                    <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                      Recommended
                    </span>
                  )}
                  {nearEOL && model.deprecationDate && (
                    <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                      Retiring {formatRetirementDate(model.deprecationDate)}
                    </span>
                  )}
                  {isDeprecated && (
                    <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                      Deprecated
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{model.description}</p>
              </div>
              {isSelected && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Full dropdown with current selection display
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        AI Model
      </label>
      <div className="relative">
        <select
          value={currentModel}
          onChange={(e) => onModelChange(e.target.value as GeminiModelId)}
          className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
        >
          {modelList.map((model) => (
            <option
              key={model.id}
              value={model.id}
              disabled={model.deprecated}
            >
              {model.name}
              {isNearEOL(model) && model.deprecationDate
                ? ` — ${model.description} ⚠️ Retiring ${formatRetirementDate(model.deprecationDate)}`
                : ` - ${model.description}`}
              {model.deprecated ? ' (Deprecated)' : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
      </div>
      {currentModelData && (
        <p className="text-xs text-slate-500">
          {currentModelData.description}
          {isNearEOL(currentModelData) && currentModelData.deprecationDate && (
            <span className="ml-2 text-orange-400">
              ⚠️ Retiring {formatRetirementDate(currentModelData.deprecationDate)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
