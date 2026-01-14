
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getStoredApiKey } from '../services/geminiService';
import { sortPlayers, calculatePoints } from '../utils/playerUtils';
import { BarChart3, Share2, Link as LinkIcon, Download, FileText, Trash2, PieChart } from 'lucide-react';
import { AnalyticsView } from './AnalyticsView';
import { GeminiApiKeySettings } from './GeminiApiKeySettings';
import { AIChatInterface } from './AIChatInterface';

export const StatsView: React.FC = () => {
  const { players, matches, exportData, importData, getShareableLink, resetData, mode } = useApp();
  const { showToast } = useToast();
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const sortedPlayers = sortPlayers(players);

  // Check if user has stored API key (for Google Sheets/Cloud modes)
  useEffect(() => {
    if (mode === 'GOOGLE_SHEETS' || mode === 'CLOUD') {
      const apiKey = getStoredApiKey();
      setHasApiKey(!!apiKey);
    }
  }, [mode]);

  // Determine if AI Coach should be shown
  const showAICoach = mode !== 'LOCAL'; // Hide in Guest mode

  const copyShareLink = () => {
    const link = getShareableLink();
    if (link.length > 2000) {
      showToast("Warning: Data is too large for a URL. Please use 'Copy JSON' instead.", "warning");
    }
    navigator.clipboard.writeText(link).then(() => {
      showToast("Link copied! Anyone with this link can view the current stats.", "success");
    });
  };

  const copyExportJson = () => {
    const data = exportData();
    navigator.clipboard.writeText(data).then(() => {
      showToast("JSON Data copied to clipboard! Paste this in another device.", "success");
    });
  };

  const copyStatsText = () => {
    let text = "[Leaderboard]\n";
    text += "Name   | M | W | D | L | Game+/-\n";
    text += "--------------------------------\n";
    sortedPlayers.forEach(p => {
      const gameDiff = p.stats.gamesWon - p.stats.gamesLost;
      const gameDiffStr = gameDiff > 0 ? `+ ${gameDiff} ` : `${gameDiff} `;
      const name = p.name.length > 6 ? p.name.substring(0, 5) + '.' : p.name;
      const draws = p.stats.draws || 0;

      text += `${name.padEnd(6)} | ${p.stats.matchesPlayed} | ${p.stats.wins} | ${draws} | ${p.stats.losses} | ${gameDiffStr} \n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      showToast("Stats text copied to clipboard!", "success");
    });
  };

  const handleImport = () => {
    if (importData(importText)) {
      showToast("Data imported successfully!", "success");
      setShowImport(false);
      setImportText('');
    } else {
      showToast("Invalid data format.", "error");
    }
  };

  const handleResetConfirm = () => {
    resetData();
    setShowResetConfirm(false);
  };

  return (
    <div className="pb-20 space-y-6">
      {/* AI Coach Section - Only show in Google Sheets and Cloud modes */}
      {showAICoach && (
        <div className="space-y-4">
          {/* API Key Settings for Google Sheets/Cloud modes */}
          {(mode === 'GOOGLE_SHEETS' || mode === 'CLOUD') && (
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <GeminiApiKeySettings
                compact={true}
                onClose={() => {
                  // Refresh API key status after saving
                  const apiKey = getStoredApiKey();
                  setHasApiKey(!!apiKey);
                }}
              />
            </div>
          )}

          {/* AI Chat Interface with Tabs */}
          <AIChatInterface
            players={players}
            matches={matches}
            hasApiKey={hasApiKey}
          />
        </div>
      )}

      {showAnalytics && <AnalyticsView onClose={() => setShowAnalytics(false)} />}

      <button
        onClick={() => setShowAnalytics(true)}
        className="w-full bg-slate-800 hover:bg-slate-700 hover:border-purple-400 border border-slate-700 p-4 rounded-xl flex items-center justify-between group transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="bg-purple-900/30 p-2 rounded-lg text-purple-400 group-hover:bg-purple-900/50 transition-colors">
            <PieChart size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-200 group-hover:text-purple-300">Advanced Analytics</h3>
            <p className="text-xs text-slate-500">View Win Rates, Partner Stats & Rivals</p>
          </div>
        </div>
        <div className="text-slate-500 group-hover:translate-x-1 transition-transform">→</div>
      </button>

      {/* Leaderboard Table */}
      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
        <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center gap-2">
          <BarChart3 className="text-tennis-green" />
          <h3 className="font-bold text-white">Detailed Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Name</th>
                <th className="p-3">M</th>
                <th className="p-3 text-tennis-green">W</th>
                <th className="p-3 text-blue-400">D</th>
                <th className="p-3 text-red-400">L</th>
                <th className="p-3 text-yellow-400 font-bold">PTS</th>
                <th className="p-3 font-bold text-white">+/-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedPlayers.map((p, idx) => {
                const gameDiff = p.stats.gamesWon - p.stats.gamesLost;
                const gameDiffText = gameDiff > 0 ? `+ ${gameDiff} ` : `${gameDiff} `;
                const draws = p.stats.draws || 0;
                const points = calculatePoints(p);

                return (
                  <tr key={p.id} className="hover:bg-slate-700/50">
                    <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 text-center text-slate-300">{p.stats.matchesPlayed}</td>
                    <td className="p-3 text-center text-tennis-green font-bold">{p.stats.wins}</td>
                    <td className="p-3 text-center text-blue-400">{draws}</td>
                    <td className="p-3 text-center text-red-400">{p.stats.losses}</td>
                    <td className="p-3 text-center text-yellow-400 font-bold font-mono">{points}</td>
                    <td className={`p - 3 text - center font - bold font - mono ${gameDiff > 0 ? 'text-tennis-green' : gameDiff < 0 ? 'text-red-400' : 'text-slate-400'} `}>
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