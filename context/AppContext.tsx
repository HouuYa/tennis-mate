import React, { createContext, useContext, useEffect, useState, ReactNode, PropsWithChildren } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, Match, AppState, FeedMessage } from '../types';
import { APP_STORAGE_KEY, INITIAL_PLAYERS } from '../constants';
import { generateNextMatch, generateSessionSchedule } from '../utils/matchmaking';

interface AppContextType {
  players: Player[];
  matches: Match[];
  feed: FeedMessage[];
  activeMatch: Match | null;
  addPlayer: (name: string) => void;
  updatePlayerName: (id: string, name: string) => void;
  reorderPlayers: (fromIndex: number, toIndex: number) => void;
  shufflePlayers: () => void;
  togglePlayerActive: (id: string) => void;
  createNextMatch: () => boolean;
  generateSchedule: (count: number, overwrite?: boolean) => void;
  finishMatch: (matchId: string, scoreA: number, scoreB: number) => void;
  undoFinishMatch: (matchId: string) => void;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number) => void;
  deleteMatch: (matchId: string) => void;
  postAnnouncement: (text: string, author?: string) => void;
  getShareableLink: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren<{}>) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [feed, setFeed] = useState<FeedMessage[]>([]);

  // Load from local storage or URL params on mount
  useEffect(() => {
    // 1. Check URL params first (Shared Link)
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');

    if (dataParam) {
      try {
        const decoded = atob(dataParam);
        const parsed: AppState = JSON.parse(decoded);
        setPlayers(parsed.players || []);
        setMatches(parsed.matches || []);
        setFeed(parsed.feed || []);
        // Clean URL without refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        return; // Skip local storage load
      } catch (e) {
        console.error("Failed to parse URL data", e);
      }
    }

    // 2. Fallback to Local Storage
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: AppState = JSON.parse(saved);
        setPlayers(parsed.players || []);
        setMatches(parsed.matches || []);
        setFeed(parsed.feed || []);
      } catch (e) {
        console.error("Failed to parse saved data", e);
        initializeDefaults();
      }
    } else {
      initializeDefaults();
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (players.length > 0 || feed.length > 0) {
      const state: AppState = { players, matches, feed };
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    }
  }, [players, matches, feed]);

  const initializeDefaults = () => {
    const defaults = INITIAL_PLAYERS.map(name => ({
      id: uuidv4(),
      name,
      active: true,
      stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
    }));
    setPlayers(defaults);
    addLog('SYSTEM', 'Welcome to Tennis Mate! Add players and start a match.');
  };

  const addLog = (type: FeedMessage['type'], content: string, author?: string) => {
    const newMsg: FeedMessage = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      content,
      author
    };
    setFeed(prev => [...prev, newMsg]);
  };

  const activeMatch = matches.find(m => !m.isFinished) || null;

  const addPlayer = (name: string) => {
    const newPlayer: Player = {
      id: uuidv4(),
      name,
      active: true,
      stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
    };
    setPlayers(prev => [...prev, newPlayer]);
    addLog('SYSTEM', `${name} has joined the club.`);
  };

  const updatePlayerName = (id: string, name: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const reorderPlayers = (fromIndex: number, toIndex: number) => {
    setPlayers(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  };

  const shufflePlayers = () => {
    setPlayers(prev => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    addLog('SYSTEM', 'Player order has been shuffled randomly.');
  };

  const togglePlayerActive = (id: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const createNextMatch = (): boolean => {
    if (activeMatch) return false; // Already playing

    const nextParams = generateNextMatch(players, matches);
    if (!nextParams) {
      addLog('SYSTEM', 'Not enough active players to start a match.');
      return false;
    }

    const newMatch: Match = {
      id: uuidv4(),
      timestamp: Date.now(),
      teamA: { player1Id: nextParams.teamA[0], player2Id: nextParams.teamA[1] },
      teamB: { player1Id: nextParams.teamB[0], player2Id: nextParams.teamB[1] },
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
      courtNumber: 1
    };

    setMatches(prev => [...prev, newMatch]); // Append to end

    const p1 = players.find(p => p.id === nextParams.teamA[0])?.name;
    const p2 = players.find(p => p.id === nextParams.teamA[1])?.name;
    const p3 = players.find(p => p.id === nextParams.teamB[0])?.name;
    const p4 = players.find(p => p.id === nextParams.teamB[1])?.name;

    let msg = `New Match: ${p1} & ${p2} vs ${p3} & ${p4}`;
    if (nextParams.restingPlayerName) {
      msg += `\n(Resting: ${nextParams.restingPlayerName})`;
    }

    addLog('MATCH_START', msg);
    return true;
  };

  const generateSchedule = (count: number, overwrite: boolean = false) => {
    const scheduled = generateSessionSchedule(players, matches, count);
    if (scheduled.length === 0) {
      addLog('SYSTEM', 'Cannot generate schedule. Not enough active players.');
      return;
    }

    const newMatches: Match[] = scheduled.map((s, i) => ({
      id: uuidv4(),
      timestamp: Date.now() + i * 1000, // Slight offset
      teamA: { player1Id: s.teamA[0], player2Id: s.teamA[1] },
      teamB: { player1Id: s.teamB[0], player2Id: s.teamB[1] },
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
      courtNumber: 1
    }));

    setMatches(prev => {
      let updatedMatches = prev;
      if (overwrite) {
        // Keep finished matches, remove unfinished ones
        updatedMatches = prev.filter(m => m.isFinished);
      }
      return [...updatedMatches, ...newMatches];
    });

    addLog('SYSTEM', `Generated ${scheduled.length} matches${overwrite ? ' (overwrote previous schedule)' : ''}.`);
  };

  const finishMatch = (matchId: string, scoreA: number, scoreB: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    setMatches(prevMatches =>
      prevMatches.map(m =>
        m.id === matchId ? { ...m, scoreA, scoreB, isFinished: true, endTime: Date.now() } : m
      )
    );

    const p1 = players.find(p => p.id === match.teamA.player1Id)?.name;
    const p2 = players.find(p => p.id === match.teamA.player2Id)?.name;
    const p3 = players.find(p => p.id === match.teamB.player1Id)?.name;
    const p4 = players.find(p => p.id === match.teamB.player2Id)?.name;

    let resultMsg = "";
    if (scoreA > scoreB) {
      resultMsg = `Winners: ${p1} & ${p2}`;
    } else if (scoreB > scoreA) {
      resultMsg = `Winners: ${p3} & ${p4}`;
    } else {
      resultMsg = `Result: Draw`;
    }

    addLog('MATCH_END', `Match Ended: ${scoreA}:${scoreB}. ${resultMsg}`);

    setPlayers(prevPlayers => {
      return prevPlayers.map(p => {
        const inTeamA = p.id === match.teamA.player1Id || p.id === match.teamA.player2Id;
        const inTeamB = p.id === match.teamB.player1Id || p.id === match.teamB.player2Id;

        if (!inTeamA && !inTeamB) {
          if (p.active) {
            return { ...p, stats: { ...p.stats, restCount: p.stats.restCount + 1 } };
          }
          return p;
        }

        // Logic for Win/Loss/Draw
        const isDraw = scoreA === scoreB;
        const isWinner = (inTeamA && scoreA > scoreB) || (inTeamB && scoreB > scoreA);
        const isLoser = (inTeamA && scoreB > scoreA) || (inTeamB && scoreA > scoreB);

        const myGames = inTeamA ? scoreA : scoreB;
        const enemyGames = inTeamA ? scoreB : scoreA;

        return {
          ...p,
          stats: {
            ...p.stats,
            matchesPlayed: p.stats.matchesPlayed + 1,
            wins: p.stats.wins + (isWinner ? 1 : 0),
            losses: p.stats.losses + (isLoser ? 1 : 0),
            draws: (p.stats.draws || 0) + (isDraw ? 1 : 0),
            gamesWon: p.stats.gamesWon + myGames,
            gamesLost: p.stats.gamesLost + enemyGames,
          }
        };
      });
    });
  };
  const undoFinishMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || !match.isFinished) return;

    // 1. Revert Match State
    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, isFinished: false, endTime: undefined } : m
    ));

    // 2. Revert Player Stats
    setPlayers(prevPlayers => {
      return prevPlayers.map(p => {
        const inTeamA = p.id === match.teamA.player1Id || p.id === match.teamA.player2Id;
        const inTeamB = p.id === match.teamB.player1Id || p.id === match.teamB.player2Id;

        if (!inTeamA && !inTeamB) {
          // Was resting, now decrement rest count
          if (p.active) {
            return { ...p, stats: { ...p.stats, restCount: Math.max(0, p.stats.restCount - 1) } };
          }
          return p;
        }

        const { scoreA, scoreB } = match;
        const isDraw = scoreA === scoreB;
        const isWinner = (inTeamA && scoreA > scoreB) || (inTeamB && scoreB > scoreA);
        const isLoser = (inTeamA && scoreB > scoreA) || (inTeamB && scoreA > scoreB);

        const myGames = inTeamA ? scoreA : scoreB;
        const enemyGames = inTeamA ? scoreB : scoreA;

        return {
          ...p,
          stats: {
            ...p.stats,
            matchesPlayed: Math.max(0, p.stats.matchesPlayed - 1),
            wins: Math.max(0, p.stats.wins - (isWinner ? 1 : 0)),
            losses: Math.max(0, p.stats.losses - (isLoser ? 1 : 0)),
            draws: Math.max(0, (p.stats.draws || 0) - (isDraw ? 1 : 0)),
            gamesWon: Math.max(0, p.stats.gamesWon - myGames),
            gamesLost: Math.max(0, p.stats.gamesLost - enemyGames),
          }
        };
      });
    });

    addLog('SYSTEM', 'Last match result was undone.');
  };

  const updateMatchScore = (matchId: string, newScoreA: number, newScoreB: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || !match.isFinished) {
      // Only allow editing finished matches
      setMatches(prev => prev.map(m =>
        m.id === matchId ? { ...m, scoreA: newScoreA, scoreB: newScoreB } : m
      ));
      return;
    }

    const oldScoreA = match.scoreA;
    const oldScoreB = match.scoreB;

    // Update match scores
    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, scoreA: newScoreA, scoreB: newScoreB } : m
    ));

    // Recalculate player stats: undo old scores, apply new scores
    setPlayers(prevPlayers => {
      return prevPlayers.map(p => {
        const inTeamA = p.id === match.teamA.player1Id || p.id === match.teamA.player2Id;
        const inTeamB = p.id === match.teamB.player1Id || p.id === match.teamB.player2Id;

        if (!inTeamA && !inTeamB) return p;

        // Calculate old result
        const oldIsDraw = oldScoreA === oldScoreB;
        const oldIsWinner = (inTeamA && oldScoreA > oldScoreB) || (inTeamB && oldScoreB > oldScoreA);
        const oldIsLoser = (inTeamA && oldScoreB > oldScoreA) || (inTeamB && oldScoreA > oldScoreB);
        const oldMyGames = inTeamA ? oldScoreA : oldScoreB;
        const oldEnemyGames = inTeamA ? oldScoreB : oldScoreA;

        // Calculate new result
        const newIsDraw = newScoreA === newScoreB;
        const newIsWinner = (inTeamA && newScoreA > newScoreB) || (inTeamB && newScoreB > newScoreA);
        const newIsLoser = (inTeamA && newScoreB > newScoreA) || (inTeamB && newScoreA > newScoreB);
        const newMyGames = inTeamA ? newScoreA : newScoreB;
        const newEnemyGames = inTeamA ? newScoreB : newScoreA;

        return {
          ...p,
          stats: {
            ...p.stats,
            // Undo old, apply new (matchesPlayed stays the same)
            wins: p.stats.wins - (oldIsWinner ? 1 : 0) + (newIsWinner ? 1 : 0),
            losses: p.stats.losses - (oldIsLoser ? 1 : 0) + (newIsLoser ? 1 : 0),
            draws: (p.stats.draws || 0) - (oldIsDraw ? 1 : 0) + (newIsDraw ? 1 : 0),
            gamesWon: p.stats.gamesWon - oldMyGames + newMyGames,
            gamesLost: p.stats.gamesLost - oldEnemyGames + newEnemyGames,
          }
        };
      });
    });

    addLog('SYSTEM', `Match score updated to ${newScoreA}:${newScoreB}.`);
  };

  const deleteMatch = (matchId: string) => {
    setMatches(prev => prev.filter(m => m.id !== matchId));
    addLog('SYSTEM', 'A match record was deleted.');
  };

  const postAnnouncement = (text: string, author?: string) => {
    addLog('ANNOUNCEMENT', text, author || 'Manager');
  };

  const resetData = () => {
    localStorage.removeItem(APP_STORAGE_KEY);
    setMatches([]);
    setFeed([]);
    initializeDefaults();
  };

  const exportData = () => JSON.stringify({ players, matches, feed });

  const importData = (json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data.players) && Array.isArray(data.matches)) {
        setPlayers(data.players);
        setMatches(data.matches);
        setFeed(data.feed || []);
        addLog('SYSTEM', 'Data imported successfully.');
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const getShareableLink = () => {
    const json = JSON.stringify({ players, matches, feed });
    const encoded = btoa(json); // Simple Base64 encoding
    const url = new URL(window.location.href);
    url.searchParams.set('data', encoded);
    return url.toString();
  };

  return (
    <AppContext.Provider value={{
      players,
      matches,
      feed,
      activeMatch,
      addPlayer,
      updatePlayerName,
      reorderPlayers,
      shufflePlayers,
      togglePlayerActive,
      createNextMatch,
      generateSchedule,
      finishMatch,
      undoFinishMatch,
      updateMatchScore,
      deleteMatch,
      postAnnouncement,
      resetData,
      exportData,
      importData,
      getShareableLink
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};