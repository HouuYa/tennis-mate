import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Users, Swords, Trophy, Activity } from 'lucide-react';
import { Player, Match } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Simple error boundary to prevent chart crashes from blanking the whole page
class ChartErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error) { console.error('[Analytics Chart Error]', error); }
    render() {
        if (this.state.hasError) {
            return <div className="text-center text-slate-500 py-4 text-sm">Chart unavailable</div>;
        }
        return this.props.children;
    }
}

export const AnalyticsView = ({ onClose }: { onClose: () => void }) => {
    const { players, matches, mode, getPlayerAllTimeMatches, getAllPlayers } = useApp();
    const [myId, setMyId] = useState<string>('');
    const [rivalId, setRivalId] = useState<string>('');
    const [dataSource, setDataSource] = useState<'SESSION' | 'ALL_TIME'>('SESSION');
    const [allTimeMatches, setAllTimeMatches] = useState<Match[]>([]);
    const [allTimePlayers, setAllTimePlayers] = useState<Player[]>([]);
    const [isLoadingAllTime, setIsLoadingAllTime] = useState(false);

    // Use refs to hold latest function references (they're not useCallback-wrapped in AppContext)
    const getPlayerAllTimeMatchesRef = React.useRef(getPlayerAllTimeMatches);
    getPlayerAllTimeMatchesRef.current = getPlayerAllTimeMatches;
    const getAllPlayersRef = React.useRef(getAllPlayers);
    getAllPlayersRef.current = getAllPlayers;
    const allTimePlayersFetchedRef = React.useRef(false);

    // Fetch All-Time data when myId and dataSource changes (with cleanup to prevent stale updates)
    React.useEffect(() => {
        if (dataSource === 'ALL_TIME' && myId && mode === 'CLOUD') {
            let cancelled = false;
            const fetchData = async () => {
                setIsLoadingAllTime(true);
                try {
                    const promises: Promise<any>[] = [getPlayerAllTimeMatchesRef.current(myId)];
                    if (!allTimePlayersFetchedRef.current) {
                        promises.push(getAllPlayersRef.current());
                    }

                    const [fetchedMatches, fetchedPlayers] = await Promise.all(promises);

                    if (cancelled) return;
                    setAllTimeMatches(fetchedMatches || []);
                    if (fetchedPlayers) {
                        setAllTimePlayers(fetchedPlayers);
                        allTimePlayersFetchedRef.current = true;
                    }
                } catch (error) {
                    if (cancelled) return;
                    console.error("[Analytics] Failed to fetch all-time data", error);
                } finally {
                    if (!cancelled) {
                        setIsLoadingAllTime(false);
                    }
                }
            };
            fetchData();
            return () => { cancelled = true; };
        } else {
            // Reset loading flag when switching away from ALL_TIME
            setIsLoadingAllTime(false);
        }
    }, [dataSource, myId, mode]);

    // Initial load for all players if ALL_TIME is selected but no myId yet
    React.useEffect(() => {
        if (dataSource === 'ALL_TIME' && mode === 'CLOUD' && !allTimePlayersFetchedRef.current) {
            let cancelled = false;
            getAllPlayersRef.current().then(p => {
                if (!cancelled) {
                    setAllTimePlayers(p);
                    allTimePlayersFetchedRef.current = true;
                }
            }).catch(console.error);
            return () => { cancelled = true; };
        }
    }, [dataSource, mode]);

    // Lock body scroll while this overlay is open (prevents the HTML page scroll from
    // pushing the fixed overlay out of the viewport when Stats page content > viewport height)
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    // Separate memos for session vs all-time to prevent cross-contamination of dependencies.
    // When in ALL_TIME mode, changes to session `matches` should NOT trigger recalculation.
    const sessionRecentMatches = useMemo(() => {
        return [...matches]
            .filter(m => m.isFinished && m.teamA && m.teamB)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100);
    }, [matches]);

    const allTimeRecentMatches = useMemo(() => {
        return [...allTimeMatches]
            .filter(m => m.isFinished && m.teamA && m.teamB)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 1000);
    }, [allTimeMatches]);

    const recentMatches = dataSource === 'ALL_TIME' ? allTimeRecentMatches : sessionRecentMatches;

    const activePlayers = useMemo(() => {
        const sourcePlayers = (dataSource === 'ALL_TIME' && allTimePlayers.length > 0 ? allTimePlayers : players) as Player[];

        // Unique players involved in recent matches + current roster
        const ids = new Set(sourcePlayers.map(p => p.id));
        recentMatches.forEach(m => {
            if (!m.teamA || !m.teamB) return; // Defensive check
            ids.add(m.teamA.player1Id);
            ids.add(m.teamA.player2Id);
            ids.add(m.teamB.player1Id);
            ids.add(m.teamB.player2Id);
        });
        // Create lookup
        const lookup = new Map(sourcePlayers.map(p => [p.id, p]));
        const resolved = Array.from(ids).map((id) => lookup.get(id) ?? { id, name: 'Unknown', active: false, stats: {} as any });
        return resolved.filter((p): p is Player => Boolean(p && p.id));
    }, [players, allTimePlayers, recentMatches, dataSource]);

    // Derived Stats
    const myStats = useMemo(() => {
        if (!myId) return null;

        let wins = 0;
        let draws = 0;
        let played = 0;
        const partners = new Map<string, { wins: number, draws: number, played: number }>();
        const rivals = new Map<string, { wins: number, draws: number, played: number }>();

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
            else if (isDraw) draws++;

            // Partner logic
            const myPartnerId = inTeamA
                ? teamA.find(id => id !== myId)
                : teamB.find(id => id !== myId);

            if (myPartnerId) {
                const current = partners.get(myPartnerId) || { wins: 0, draws: 0, played: 0 };
                partners.set(myPartnerId, {
                    wins: current.wins + (iWon ? 1 : 0),
                    draws: current.draws + (isDraw ? 1 : 0),
                    played: current.played + 1
                });
            }

            // Rival logic (Opponents)
            const opponents = inTeamA ? teamB : teamA;
            opponents.forEach(oppId => {
                const current = rivals.get(oppId) || { wins: 0, draws: 0, played: 0 };
                rivals.set(oppId, {
                    wins: current.wins + (iWon ? 1 : 0),
                    draws: current.draws + (isDraw ? 1 : 0),
                    played: current.played + 1
                });
            });
        });

        return { wins, draws, played, partners, rivals };
    }, [myId, recentMatches]);

    const myWinRate = useMemo(() => {
        const effectivePlayed = (myStats?.played ?? 0) - (myStats?.draws ?? 0);
        return {
            effectivePlayed,
            rate: effectivePlayed ? Math.round(((myStats?.wins ?? 0) / effectivePlayed) * 100) : 0
        };
    }, [myStats]);

    const winRateTrendData = useMemo(() => {
        if (!myId) return [];
        let cumulativeWins = 0;
        let cumulativePlayed = 0;
        // recentMatches is sorted newest to oldest. We want oldest to newest for the trend line.
        const myMatchesReverse = [...recentMatches]
            .reverse()
            .filter(m => {
                const teamA = [m.teamA.player1Id, m.teamA.player2Id];
                const teamB = [m.teamB.player1Id, m.teamB.player2Id];
                return teamA.includes(myId) || teamB.includes(myId);
            });

        let cumulativeDraws = 0;

        return myMatchesReverse.map((m, i) => {
            const teamA = [m.teamA.player1Id, m.teamA.player2Id];
            const teamB = [m.teamB.player1Id, m.teamB.player2Id];
            const inTeamA = teamA.includes(myId);
            const inTeamB = teamB.includes(myId);
            const isDraw = m.scoreA === m.scoreB;
            const wonA = m.scoreA > m.scoreB;
            const wonB = m.scoreB > m.scoreA;
            const iWon = (inTeamA && wonA) || (inTeamB && wonB);

            cumulativePlayed++;
            if (iWon) cumulativeWins++;
            else if (isDraw) cumulativeDraws++;

            const effectivePlayed = cumulativePlayed - cumulativeDraws;
            return {
                name: `M${i + 1}`,
                winRate: effectivePlayed ? Math.round((cumulativeWins / effectivePlayed) * 100) : 0
            };
        });
    }, [myId, recentMatches]);

    const bestPartners = useMemo(() => {
        if (!myStats) return [];
        return Array.from(myStats.partners.entries())
            .filter(([_, stats]) => stats.played >= 3) // Min 3 matches
            .map(([id, stats]) => {
                const effectivePlayed = stats.played - stats.draws;
                return {
                    id,
                    name: activePlayers.find(p => p.id === id)?.name || id,
                    ...stats,
                    winRate: effectivePlayed ? Math.round((stats.wins / effectivePlayed) * 100) : 0
                };
            })
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 5); // Top 5
    }, [myStats, activePlayers]);

    const rivalStats = useMemo(() => {
        if (!myStats || !rivalId) return null;
        const stats = myStats.rivals.get(rivalId) || { wins: 0, draws: 0, played: 0 };
        const effectivePlayed = stats.played - stats.draws;
        return {
            ...stats,
            losses: stats.played - stats.wins - stats.draws,
            winRate: effectivePlayed ? Math.round((stats.wins / effectivePlayed) * 100) : 0
        };
    }, [myStats, rivalId]);

    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
            {/* Header - Fixed at top */}
            <div className="flex-none bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="text-purple-400" />
                    Player Analytics
                </h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-800"
                >
                    Close
                </button>
            </div>

            {/* Scrollable Content - min-h-0 is critical for flex+overflow to work correctly */}
            <div
                className="flex-1 min-h-0 overflow-y-auto"
                style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
                <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
                    {/* Data Source Toggle & Me Selector */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4">
                        {mode === 'CLOUD' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Data Source</label>
                                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                    <button
                                        onClick={() => setDataSource('SESSION')}
                                        className={`flex-1 text-sm py-2 rounded-md font-semibold transition-colors ${dataSource === 'SESSION' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:text-slate-300'}`}
                                    >
                                        Current Session
                                    </button>
                                    <button
                                        onClick={() => setDataSource('ALL_TIME')}
                                        className={`flex-1 text-sm py-2 rounded-md font-semibold transition-colors ${dataSource === 'ALL_TIME' ? 'bg-purple-600/20 text-purple-400' : 'text-slate-400 hover:text-slate-300'}`}
                                    >
                                        All Time
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Analyze stats for</label>
                            <select
                                value={myId}
                                onChange={(e) => {
                                    setMyId(e.target.value);
                                    setRivalId(''); // Reset rival when changing me
                                }}
                                className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-700 outline-none focus:border-purple-500"
                            >
                                <option value="">Select Yourself</option>
                                {activePlayers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoadingAllTime && (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-[200px]">
                            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <span className="font-bold">Loading Global Stats...</span>
                            <span className="text-xs text-slate-500 mt-2 italic">Fetching all matches from Supabase</span>
                        </div>
                    )}

                    {!isLoadingAllTime && !myId && (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500 min-h-[200px] text-center">
                            <Users size={48} className="mb-4 opacity-20" />
                            <p className="font-medium text-slate-300">분석할 플레이어를 선택해주세요.</p>
                            <p className="text-sm opacity-60 mt-1">Select a player above to see their stats.</p>
                        </div>
                    )}

                    {!isLoadingAllTime && myId && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                                    <span className="text-slate-400 text-xs uppercase font-bold mb-1">Matches</span>
                                    <span className="text-3xl font-black text-white">{myStats?.played ?? 0}</span>
                                    <span className="text-[10px] text-slate-500">{dataSource === 'ALL_TIME' ? 'All recorded games' : 'Current Session games'}</span>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                                    <span className="text-slate-400 text-xs uppercase font-bold mb-1">Win Rate</span>
                                    <span className={`text-3xl font-black ${getWinRateColor(myStats?.wins ?? 0, myWinRate.effectivePlayed)}`}>
                                        {myWinRate.rate}%
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        {myStats?.wins ?? 0}W {(myStats?.draws ?? 0) > 0 ? `· ${myStats.draws}D` : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Win Rate Trend */}
                            {winRateTrendData.length > 2 && (
                                <ChartErrorBoundary key={`${myId}-${dataSource}`}>
                                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                        <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                                            <Activity size={16} className="text-purple-400" />
                                            Win Rate Trend
                                        </h3>
                                        <div className="h-32 w-full mt-2" style={{ minWidth: 0 }}>
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                <AreaChart data={winRateTrendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                                                        formatter={(value: number) => [`${value}%`, 'Win Rate']}
                                                        labelFormatter={(label) => `Match ${String(label).replace('M', '')}`}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="winRate"
                                                        stroke="#a855f7"
                                                        strokeWidth={2}
                                                        fillOpacity={1}
                                                        fill="url(#colorWinRate)"
                                                        isAnimationActive={false}
                                                    />
                                                    <YAxis domain={[0, 100]} hide={true} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </ChartErrorBoundary>
                            )}

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
                                                <div className="text-[10px] text-slate-500">
                                                    {partner.wins}W
                                                    {partner.draws > 0 ? ` · ${partner.draws}D` : ''}
                                                    {` · ${partner.played - partner.wins - partner.draws}L`}
                                                </div>
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
                                        {rivalStats.draws > 0 && (
                                            <div className="text-center z-10">
                                                <div className="text-xs text-slate-500 uppercase mb-1">Draw</div>
                                                <div className="text-2xl font-black text-blue-400">{rivalStats.draws}</div>
                                            </div>
                                        )}
                                        <div className="flex flex-col items-center z-10">
                                            <div className="text-[10px] text-slate-500 mb-1">VS</div>
                                            <div className="text-xl font-bold text-white mb-1">
                                                {rivalStats.winRate}%
                                            </div>
                                            <div className="text-[10px] text-slate-500">{rivalStats.played} Games</div>
                                        </div>
                                        <div className="text-center z-10">
                                            <div className="text-xs text-slate-500 uppercase mb-1">Losses</div>
                                            <div className="text-2xl font-black text-red-400">{rivalStats.losses}</div>
                                        </div>

                                        {/* Background Bar */}
                                        <div className="absolute inset-0 flex opacity-10 pointer-events-none">
                                            <div className="bg-tennis-green h-full transition-all duration-500" style={{ width: `${rivalStats.winRate}%` }}></div>
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
