import React, { useState } from 'react';
import { X, BarChart3, Loader } from 'lucide-react';
import { generateAIAnalysis } from '../services/geminiService';
import { useToast } from '../context/ToastContext';
import type { Player, Match } from '../types';

interface StatsAnalysisModalProps {
  onClose: () => void;
  players: Player[];
  matches: Match[];
}

export const StatsAnalysisModal: React.FC<StatsAnalysisModalProps> = ({
  onClose,
  players,
  matches,
}) => {
  const { showToast } = useToast();
  const [statsAnalysis, setStatsAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyzeStats = async () => {
    setLoading(true);
    try {
      const analysis = await generateAIAnalysis(players, matches);
      setStatsAnalysis(analysis);
    } catch (error) {
      showToast('Failed to generate analysis', 'error');
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
            <BarChart3 size={24} className="text-indigo-400" />
            AI Stats Analysis
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <button
              onClick={handleAnalyzeStats}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 px-4 py-3 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 size={20} />
                  Analyze Stats
                </>
              )}
            </button>

            {statsAnalysis ? (
              <div className="text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap bg-indigo-950/50 p-6 rounded-lg border border-indigo-500/20">
                {statsAnalysis}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 size={48} className="mx-auto mb-4 text-indigo-400 opacity-50" />
                <p className="text-sm text-slate-400">
                  Click "Analyze Stats" to get AI insights on MVPs, team chemistry, and performance trends.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
