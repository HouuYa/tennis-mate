import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateAIAnalysis } from '../services/geminiService';
import { BarChart3, Sparkles, Share2, Link as LinkIcon, Download, FileText, Trash2 } from 'lucide-react';

export const StatsView: React.FC = () => {
  const { players, matches, exportData, importData, getShareableLink, resetData } = useApp();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const sortedPlayers = [...players].sort((a, b) => {
    // Sort by Wins desc, then Win Rate desc
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    // Tie breaker: Game Diff
    const diffA = a.stats.gamesWon - a.stats.gamesLost;
    const diffB = b.stats.gamesWon - b.stats.gamesLost;
    return diffB - diffA;
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
    navigator.clipboard.writeText(link).then(() => {
        alert("Link copied! Anyone with this link can view the current stats.");
    });
  };

  const copyExportJson = () => {
    const data = exportData();
    navigator.clipboard.writeText(data).then(() => {
        alert("JSON Data copied to clipboard! Paste this in another device.");
    });
  };

  const copyStatsText = () => {
    let text = "[Leaderboard]\n";
    text += "Name   | M | W | D | L | Game+/-\n";
    text += "--------------------------------\n";
    sortedPlayers.forEach(p => {
        const gameDiff = p.stats.gamesWon - p.stats.gamesLost;
        const gameDiffStr = gameDiff > 0 ? `+${gameDiff}` : `${gameDiff}`;
        const name = p.name.length > 6 ? p.name.substring(0, 5) + '.' : p.name;
        const draws = p.stats.draws || 0;
        
        text += `${name.padEnd(6)} | ${p.stats.matchesPlayed} | ${p.stats.wins} | ${draws} | ${p.stats.losses} | ${gameDiffStr}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
        alert("Stats text copied to clipboard!");
    });
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

  const handleResetConfirm = () => {
    resetData();
    setShowResetConfirm(false);
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
            <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Name</th>
                <th className="p-3 text-center" title="Matches Played">M</th>
                <th className="p-3 text-center text-tennis-green" title="Wins">W</th>
                <th className="p-3 text-center text-blue-400" title="Draws">D</th>
                <th className="p-3 text-center text-red-400" title="Losses">L</th>
                <th className="p-3 text-center font-bold text-white" title="Game Difference">Game +/-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedPlayers.map((p, idx) => {
                 const gameDiff = p.stats.gamesWon - p.stats.gamesLost;
                 const gameDiffText = gameDiff > 0 ? `+${gameDiff}` : `${gameDiff}`;
                 const draws = p.stats.draws || 0;

                 return (
                  <tr key={p.id} className="hover:bg-slate-700/50">
                    <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 text-center text-slate-300">{p.stats.matchesPlayed}</td>
                    <td className="p-3 text-center text-tennis-green font-bold">{p.stats.wins}</td>
                    <td className="p-3 text-center text-blue-400">{draws}</td>
                    <td className="p-3 text-center text-red-400">{p.stats.losses}</td>
                    <td className={`p-3 text-center font-bold font-mono ${gameDiff > 0 ? 'text-tennis-green' : gameDiff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                       {gameDiffText}
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

        <div className="grid grid-cols-3 gap-3">
          <button onClick={copyStatsText} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-xs font-bold text-slate-300">
            <FileText size={16} /> Text
          </button>
          <button onClick={copyExportJson} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-xs font-bold text-slate-300">
            <Share2 size={16} /> JSON
          </button>
          <button onClick={() => setShowImport(!showImport)} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-xs font-bold text-slate-300">
            <Download size={16} /> Import
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

        {/* Reset Button */}
        <div className="mt-6">
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-900/30 text-red-400 py-3 rounded-lg text-sm font-bold border border-red-900/50 hover:bg-red-900/50 transition-all"
            >
              <Trash2 size={16} /> Reset All Data
            </button>
          ) : (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
              <p className="text-red-300 text-sm text-center mb-4">
                ⚠️ This will delete ALL players, matches, and statistics. This action cannot be undone!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetConfirm}
                  className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 text-sm"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};