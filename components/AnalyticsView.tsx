import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Users, Swords, Trophy } from 'lucide-react';
import { Player, Match } from '../types';

export const AnalyticsView = ({ onClose }: { onClose: () => void }) => {
    const { players, matches } = useApp();
    const [myId, setMyId] = useState<string>('');
    const [rivalId, setRivalId] = useState<string>('');

    // Filter relevant matches
    // User requested "Recent 100 matches" as Raw Data basis
    // Assuming 'matches' in context are the session matches (or loaded history).
    // If working with Google Sheets, we might want to ensure we have enough history.
    // For now, we use the loaded `matches` state.
    const recentMatches = useMemo(() => {
        return matches
            .filter(m => m.isFinished)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100);
    }, [matches]);

    const activePlayers = useMemo(() => {
        // Unique players involved in recent matches + current roster
        const ids = new Set(players.map(p => p.id));
        recentMatches.forEach(m => {
            ids.add(m.teamA.player1Id);
            ids.add(m.teamA.player2Id);
            ids.add(m.teamB.player1Id);
            ids.add(m.teamB.player2Id);
        });
        // Create lookup
        const lookup = new Map(players.map(p => [p.id, p]));
        return Array.from(ids).map(id => lookup.get(id) || { id, name: 'Unknown', active: false, stats: {} as any }).filter(p => p.id);
    }, [players, recentMatches]);

    // Derived Stats
    const myStats = useMemo(() => {
        if (!myId) return null;

        let wins = 0;
        let played = 0;
        const partners = new Map<string, { wins: number, played: number }>();
        const rivals = new Map<string, { wins: number, played: number }>();

        recentMatches.forEach(m => {
            const teamA = [m.teamA.player1Id, m.teamA.player2Id];
            const teamB = [m.teamB.player1Id, m.teamB.player2Id];

            const inTeamA = teamA.includes(myId);
            const inTeamB = teamB.includes(myId);

            if (!inTeamA && !inTeamB) return;

            played++;

            const isDraw = m.scoreA === m.scoreB;
            const wonA = m.scoreA > m.scoreB;
            const wonB = m.scoreB > m.scoreA;
            const iWon = (inTeamA && wonA) || (inTeamB && wonB);

            if (iWon) wins++;

            // Partner logic
            const myPartnerId = inTeamA
                ? teamA.find(id => id !== myId)
                : teamB.find(id => id !== myId);

            if (myPartnerId) {
                const current = partners.get(myPartnerId) || { wins: 0, played: 0 };
                partners.set(myPartnerId, {
                    wins: current.wins + (iWon ? 1 : 0),
                    played: current.played + 1
                });
            }

            // Rival logic (Opponents)
            const opponents = inTeamA ? teamB : teamA;
            opponents.forEach(oppId => {
                const current = rivals.get(oppId) || { wins: 0, played: 0 };
                rivals.set(oppId, {
                    wins: current.wins + (iWon ? 1 : 0),
                    played: current.played + 1
                });
            });
        });

        return { wins, played, partners, rivals };
    }, [myId, recentMatches]);

    const bestPartners = useMemo(() => {
        if (!myStats) return [];
        return Array.from(myStats.partners.entries())
            .filter(([_, stats]) => stats.played >= 3) // Min 3 matches
            .map(([id, stats]) => ({
                id,
                name: activePlayers.find(p => p.id === id)?.name || id,
                ...stats,
                winRate: Math.round((stats.wins / stats.played) * 100)
            }))
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 5); // Top 5
    }, [myStats, activePlayers]);

    const rivalStats = useMemo(() => {
        if (!myStats || !rivalId) return null;
        const stats = myStats.rivals.get(rivalId) || { wins: 0, played: 0 };
        return {
            ...stats,
            losses: stats.played - stats.wins,
            winRate: stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
        };
    }, [myStats, rivalId]);

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto animate-in slide-in-from-right">
            <div className="max-w-md mx-auto min-h-screen pb-safe relative">

                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-purple-400" />
                        Analytics
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-800"
                    >
                        Close
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Me Selector */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Analyze stats for</label>
                        <select
                            value={myId}
                            onChange={(e) => setMyId(e.target.value)}
                            className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-700 outline-none focus:border-purple-500"
                        >
                            <option value="">Select Yourself</option>
                            {activePlayers.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {myId && myStats && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                                    <span className="text-slate-400 text-xs uppercase font-bold mb-1">Matches</span>
                                    <span className="text-3xl font-black text-white">{myStats.played}</span>
                                    <span className="text-[10px] text-slate-500">Last 100 Games</span>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                                    <span className="text-slate-400 text-xs uppercase font-bold mb-1">Win Rate</span>
                                    <span className={`text-3xl font-black ${getWinRateColor(myStats.wins, myStats.played)}`}>
                                        {myStats.played ? Math.round((myStats.wins / myStats.played) * 100) : 0}%
                                    </span>
                                    <span className="text-[10px] text-slate-500">{myStats.wins} Wins</span>
                                </div>
                            </div>

                            {/* Best Partners */}
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                                    <Users size={16} className="text-blue-400" />
                                    Best Partners
                                    <span className="text-[10px] font-normal text-slate-500 ml-auto bg-slate-900 px-2 py-0.5 rounded-full">Min 3 games</span>
                                </h3>

                                <div className="space-y-3">
                                    {bestPartners.length > 0 ? bestPartners.map((partner, idx) => (
                                        <div key={partner.id} className="flex items-center justify-between p-2 rounded bg-slate-900/50">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-mono w-5 h-5 flex items-center justify-center rounded-full ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-700 text-slate-400'}`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="font-bold text-slate-200">{partner.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-tennis-green">{partner.winRate}%</div>
                                                <div className="text-[10px] text-slate-500">{partner.wins}W - {partner.played - partner.wins}L</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center text-slate-500 py-4 text-sm">
                                            No eligible partners found.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Head to Head */}
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                                    <Swords size={16} className="text-red-400" />
                                    Head-to-Head
                                </h3>

                                <select
                                    value={rivalId}
                                    onChange={(e) => setRivalId(e.target.value)}
                                    className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-700 outline-none text-sm mb-4"
                                >
                                    <option value="">Select Opponent</option>
                                    {activePlayers.filter(p => p.id !== myId).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>

                                {rivalStats && (
                                    <div className="bg-slate-900 rounded-lg p-4 flex items-center justify-around relative overflow-hidden">
                                        <div className="text-center z-10">
                                            <div className="text-xs text-slate-500 uppercase mb-1">Wins</div>
                                            <div className="text-2xl font-black text-tennis-green">{rivalStats.wins}</div>
                                        </div>
                                        <div className="flex flex-col items-center z-10">
                                            <div className="text-[10px] text-slate-500 mb-1">VS</div>
                                            <div className="text-xl font-bold text-white mb-1">
                                                {Math.round((rivalStats.wins / rivalStats.played) * 100)}%
                                            </div>
                                            <div className="text-[10px] text-slate-500">{rivalStats.played} Games</div>
                                        </div>
                                        <div className="text-center z-10">
                                            <div className="text-xs text-slate-500 uppercase mb-1">Losses</div>
                                            <div className="text-2xl font-black text-red-400">{rivalStats.losses}</div>
                                        </div>

                                        {/* Background Bar */}
                                        <div className="absolute inset-0 flex opacity-10 pointer-events-none">
                                            <div className="bg-tennis-green h-full transition-all duration-500" style={{ width: `${(rivalStats.wins / rivalStats.played) * 100}%` }}></div>
                                            <div className="bg-red-400 h-full transition-all duration-500 flex-1"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const getWinRateColor = (wins: number, played: number) => {
    if (!played) return 'text-slate-500';
    const rate = wins / played;
    if (rate >= 0.7) return 'text-tennis-green';
    if (rate >= 0.5) return 'text-blue-400';
    if (rate >= 0.3) return 'text-yellow-400';
    return 'text-red-400';
};
