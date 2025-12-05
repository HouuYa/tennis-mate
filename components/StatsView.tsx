import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateAIAnalysis } from '../services/geminiService';
import { BarChart3, Sparkles, Share2, Link as LinkIcon, Download } from 'lucide-react';

export const StatsView: React.FC = () => {
  const { players, matches, exportData, importData, getShareableLink, resetData } = useApp();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const sortedPlayers = [...players].sort((a, b) => {
    // Sort by Wins desc, then Win Rate desc
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    const rateA = a.stats.matchesPlayed > 0 ? a.stats.wins / a.stats.matchesPlayed : 0;
    const rateB = b.stats.matchesPlayed > 0 ? b.stats.wins / b.stats.matchesPlayed : 0;
    return rateB - rateA;
  });

  const handleAskAI = async () => {
    setLoading(true);
    const analysis = await generateAIAnalysis(players, matches);
    setAiAnalysis(analysis);
    setLoading(false);
  };

  const copyShareLink = () => {
    const link = getShareableLink();
    if (link.length > 2000) {
      alert("Warning: Data is too large for a URL. Please use 'Copy JSON' instead.");
    }
    navigator.clipboard.writeText(link);
    alert("Link copied! Anyone with this link can view the current stats.");
  };

  const copyExportJson = () => {
    const data = exportData();
    navigator.clipboard.writeText(data);
    alert("JSON Data copied to clipboard! Paste this in another device.");
  };

  const handleImport = () => {
    if (importData(importText)) {
      alert("Data imported successfully!");
      setShowImport(false);
      setImportText('');
    } else {
      alert("Invalid data format.");
    }
  };

  return (
    <div className="pb-20 space-y-6">
      {/* AI Coach Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl border border-indigo-500/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-indigo-300 flex items-center gap-2">
            <Sparkles size={20} /> AI Coach
          </h2>
          <button 
            onClick={handleAskAI}
            disabled={loading}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-full text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Analyze Stats"}
          </button>
        </div>
        
        {aiAnalysis ? (
          <div className="text-sm text-indigo-100 leading-relaxed whitespace-pre-wrap bg-indigo-950/50 p-4 rounded-lg">
            {aiAnalysis}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Tap "Analyze Stats" to get insights on MVPs and team chemistry powered by Gemini.
          </p>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
        <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center gap-2">
           <BarChart3 className="text-tennis-green" />
           <h3 className="font-bold text-white">Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400 uppercase">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Name</th>
                <th className="p-3 text-center">Match</th>
                <th className="p-3 text-center">W</th>
                <th className="p-3 text-center">L</th>
                <th className="p-3 text-center font-bold text-white">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedPlayers.map((p, idx) => {
                 const scoreDiff = p.stats.wins - p.stats.losses;
                 const scoreText = scoreDiff > 0 ? `+${scoreDiff}` : `${scoreDiff}`;
                 return (
                  <tr key={p.id} className="hover:bg-slate-700/50">
                    <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 text-center text-slate-300">{p.stats.matchesPlayed}</td>
                    <td className="p-3 text-center text-tennis-green font-bold">{p.stats.wins}</td>
                    <td className="p-3 text-center text-red-400">{p.stats.losses}</td>
                    <td className={`p-3 text-center font-bold ${scoreDiff > 0 ? 'text-tennis-green' : scoreDiff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                       {scoreText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Sharing */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <h3 className="font-bold text-white mb-4">Share & Sync</h3>
        <p className="text-xs text-slate-400 mb-4">
          Since we don't use a server, use these buttons to share match progress with others.
        </p>
        
        <div className="grid grid-cols-1 gap-3 mb-4">
           <button onClick={copyShareLink} className="flex items-center justify-center gap-2 bg-tennis-green text-slate-900 py-3 rounded-lg text-sm font-bold shadow-lg shadow-tennis-green/20 hover:scale-[1.02] transition-transform">
            <LinkIcon size={16} /> Copy Shareable Link
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={copyExportJson} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-sm font-bold text-slate-300">
            <Share2 size={16} /> Copy JSON
          </button>
          <button onClick={() => setShowImport(!showImport)} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-sm font-bold text-slate-300">
            <Download size={16} /> Import JSON
          </button>
        </div>
        
        {showImport && (
          <div className="mt-4 p-3 bg-slate-900 rounded-lg animate-in fade-in slide-in-from-top-2">
             <textarea 
               className="w-full bg-slate-800 text-xs p-2 rounded border border-slate-700 text-slate-300 h-24 mb-2"
               placeholder="Paste JSON data here..."
               value={importText}
               onChange={e => setImportText(e.target.value)}
             />
             <button onClick={handleImport} className="w-full bg-slate-600 text-white py-2 rounded font-bold text-sm hover:bg-slate-500">
               Load Data
             </button>
          </div>
        )}

        <button onClick={resetData} className="w-full mt-6 text-red-900/50 text-xs py-2 hover:text-red-500 transition-colors">
          Reset All Data (Clear Cache)
        </button>
      </div>
    </div>
  );
};