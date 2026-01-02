import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { generateAIAnalysis } from '../services/geminiService';
import { sortPlayers, calculatePoints } from '../utils/playerUtils';
import { BarChart3, Sparkles, Share2, Link as LinkIcon, Download, FileText, Trash2, Users, ChevronDown, ChevronRight, Target } from 'lucide-react';

export const StatsView: React.FC = () => {
  const { players, matches, exportData, importData, getShareableLink, resetData } = useApp();
  const { showToast } = useToast();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPartnerships, setShowPartnerships] = useState(false);
  const [showRivalAnalysis, setShowRivalAnalysis] = useState(false);
  const [selectedRivalId, setSelectedRivalId] = useState<string>('');

  const sortedPlayers = sortPlayers(players);

  // Best Pairs Logic
  const pairStats: Record<string, { p1: string, p2: string, wins: number, total: number }> = {};
  matches.filter(m => m.isFinished).forEach(m => {
    const teams = [m.teamA, m.teamB];
    const winners = m.scoreA > m.scoreB ? m.teamA : (m.scoreB > m.scoreA ? m.teamB : null);

    teams.forEach(t => {
      const player1 = players.find(p => p.id === t.player1Id);
      const player2 = players.find(p => p.id === t.player2Id);

      // Skip if either player is not found (deleted or missing)
      if (!player1 || !player2) return;

      const p1 = player1.name;
      const p2 = player2.name;
      // Ensure consistent key
      const names = [p1, p2].sort().join(' & ');

      if (!pairStats[names]) pairStats[names] = { p1, p2, wins: 0, total: 0 };
      pairStats[names].total += 1;
      if (winners && (winners.player1Id === t.player1Id || winners.player2Id === t.player1Id)) { // If this team won
        pairStats[names].wins += 1;
      }
    });
  });

  const sortedPairs = Object.entries(pairStats)
    .map(([name, stats]) => ({ name, ...stats, rate: (stats.wins / stats.total) * 100 }))
    .filter(s => s.total >= 2) // Min 2 matches together
    .sort((a, b) => b.rate - a.rate || b.total - a.total);

  // Head-to-Head Analysis (User vs Selected Rival)
  const calculateHeadToHead = (userId: string, rivalId: string) => {
    if (!userId || !rivalId) return null;

    let userWins = 0;
    let userLosses = 0;
    let draws = 0;

    matches.filter(m => m.isFinished).forEach(m => {
      const isUserInTeamA = m.teamA.player1Id === userId || m.teamA.player2Id === userId;
      const isUserInTeamB = m.teamB.player1Id === userId || m.teamB.player2Id === userId;
      const isRivalInTeamA = m.teamA.player1Id === rivalId || m.teamA.player2Id === rivalId;
      const isRivalInTeamB = m.teamB.player1Id === rivalId || m.teamB.player2Id === rivalId;

      // Only count matches where user and rival were on opposite teams
      if ((isUserInTeamA && isRivalInTeamB) || (isUserInTeamB && isRivalInTeamA)) {
        if (m.scoreA === m.scoreB) {
          draws++;
        } else if ((isUserInTeamA && m.scoreA > m.scoreB) || (isUserInTeamB && m.scoreB > m.scoreA)) {
          userWins++;
        } else {
          userLosses++;
        }
      }
    });

    const total = userWins + userLosses + draws;
    if (total === 0) return null;

    return { userWins, userLosses, draws, total, winRate: (userWins / total) * 100 };
  };


  const handleAskAI = async () => {
    setLoading(true);
    const analysis = await generateAIAnalysis(players, matches);
    setAiAnalysis(analysis);
    setLoading(false);
  };

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
      const gameDiffStr = gameDiff > 0 ? `+${gameDiff}` : `${gameDiff}`;
      const name = p.name.length > 6 ? p.name.substring(0, 5) + '.' : p.name;
      const draws = p.stats.draws || 0;

      text += `${name.padEnd(6)} | ${p.stats.matchesPlayed} | ${p.stats.wins} | ${draws} | ${p.stats.losses} | ${gameDiffStr}\n`;
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


      {/* Best Partnerships Section (Collapsible) */}
      {sortedPairs.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
          <button
            onClick={() => setShowPartnerships(!showPartnerships)}
            className="w-full p-4 flex items-center justify-between text-left text-white font-bold hover:bg-slate-700 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm">
              <Users size={16} className="text-purple-400" /> Best Partnerships (Min 2 Matches)
            </span>
            {showPartnerships ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {showPartnerships && (
            <div className="p-4 pt-0 space-y-3 border-t border-slate-700 mt-2">
              {sortedPairs.map((pair, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="text-purple-400 font-bold font-mono text-sm">#{idx + 1}</span>
                    <span className="font-bold text-slate-200 text-sm">{pair.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-tennis-green font-bold text-sm">{Math.round(pair.rate)}% Win</div>
                    <div className="text-xs text-slate-500">{pair.wins}W - {pair.total - pair.wins}L</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Head-to-Head Rival Analysis Section */}
      {players.length >= 2 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
          <button
            onClick={() => setShowRivalAnalysis(!showRivalAnalysis)}
            className="w-full p-4 flex items-center justify-between text-left text-white font-bold hover:bg-slate-700 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm">
              <Target size={16} className="text-orange-400" /> Head-to-Head Analysis
            </span>
            {showRivalAnalysis ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {showRivalAnalysis && (
            <div className="p-4 pt-0 space-y-4 border-t border-slate-700 mt-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold">Select Player 1</label>
                <select
                  value={selectedRivalId.split('vs')[0] || ''}
                  onChange={(e) => {
                    const player2 = selectedRivalId.split('vs')[1] || '';
                    setSelectedRivalId(e.target.value ? `${e.target.value}vs${player2}` : '');
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm"
                >
                  <option value="">Choose player...</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold">vs Player 2</label>
                <select
                  value={selectedRivalId.split('vs')[1] || ''}
                  onChange={(e) => {
                    const player1 = selectedRivalId.split('vs')[0] || '';
                    setSelectedRivalId(player1 ? `${player1}vs${e.target.value}` : '');
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm"
                >
                  <option value="">Choose player...</option>
                  {players.filter(p => p.id !== selectedRivalId.split('vs')[0]).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {(() => {
                const [userId, rivalId] = selectedRivalId.split('vs');
                const h2h = userId && rivalId ? calculateHeadToHead(userId, rivalId) : null;
                const user = players.find(p => p.id === userId);
                const rival = players.find(p => p.id === rivalId);

                if (h2h && user && rival) {
                  return (
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 space-y-3">
                      <div className="text-center">
                        <h4 className="text-sm font-bold text-white mb-1">
                          {user.name} vs {rival.name}
                        </h4>
                        <p className="text-xs text-slate-400">{h2h.total} matches played</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-tennis-green">{h2h.userWins}</div>
                          <div className="text-xs text-slate-400">Wins</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">{h2h.draws}</div>
                          <div className="text-xs text-slate-400">Draws</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-400">{h2h.userLosses}</div>
                          <div className="text-xs text-slate-400">Losses</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Win Rate</span>
                          <span className="text-sm font-bold text-tennis-green">
                            {Math.round(h2h.winRate)}%
                          </span>
                        </div>
                        <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-tennis-green h-full transition-all duration-300"
                            style={{ width: `${h2h.winRate}%` }}
                          />
                        </div>
                      </div>

                      {h2h.userWins > h2h.userLosses ? (
                        <p className="text-xs text-center text-tennis-green font-semibold">
                          💪 {user.name} dominates this matchup!
                        </p>
                      ) : h2h.userLosses > h2h.userWins ? (
                        <p className="text-xs text-center text-orange-400 font-semibold">
                          🔥 {rival.name} has the edge!
                        </p>
                      ) : (
                        <p className="text-xs text-center text-blue-400 font-semibold">
                          🤝 Evenly matched rivals!
                        </p>
                      )}
                    </div>
                  );
                } else if (userId && rivalId) {
                  return (
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 text-center text-sm text-slate-400">
                      No matches found between these players
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}

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
                <th className="p-3 text-center" title="Matches Played">M</th>
                <th className="p-3 text-center text-tennis-green" title="Wins (2 pts)">W</th>
                <th className="p-3 text-center text-blue-400" title="Draws (1 pt)">D</th>
                <th className="p-3 text-center text-red-400" title="Losses (0 pt)">L</th>
                <th className="p-3 text-center font-bold text-yellow-400" title="Total Points (W×2 + D×1)">PTS</th>
                <th className="p-3 text-center font-bold text-white" title="Game Difference">Game +/-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedPlayers.map((p, idx) => {
                const gameDiff = p.stats.gamesWon - p.stats.gamesLost;
                const gameDiffText = gameDiff > 0 ? `+${gameDiff}` : `${gameDiff}`;
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