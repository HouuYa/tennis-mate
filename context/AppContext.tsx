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
  reorderPlayers: (fromIndex: number, toIndex: number) => void;
  togglePlayerActive: (id: string) => void;
  createNextMatch: () => boolean;
  generateSchedule: (count: number) => void;
  finishMatch: (matchId: string, scoreA: number, scoreB: number) => void;
  deleteMatch: (matchId: string) => void;
  postAnnouncement: (text: string, author?: string) => void;
  resetData: () => void;
  importData: (json: string) => boolean;
  exportData: () => string;
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
      stats: { matchesPlayed: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
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
      stats: { matchesPlayed: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
    };
    setPlayers(prev => [...prev, newPlayer]);
    addLog('SYSTEM', `${name} has joined the club.`);
  };

  const reorderPlayers = (fromIndex: number, toIndex: number) => {
    setPlayers(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
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

  const generateSchedule = (count: number) => {
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

    setMatches(prev => [...prev, ...newMatches]);
    addLog('SYSTEM', `Generated schedule for ${count} upcoming matches.`);
  };

  const finishMatch = (matchId: string, scoreA: number, scoreB: number) => {
    setMatches(prevMatches => 
      prevMatches.map(m => 
        m.id === matchId ? { ...m, scoreA, scoreB, isFinished: true } : m
      )
    );

    const match = matches.find(m => m.id === matchId);
    if (match) {
        const p1 = players.find(p => p.id === match.teamA.player1Id)?.name;
        const p2 = players.find(p => p.id === match.teamA.player2Id)?.name;
        const p3 = players.find(p => p.id === match.teamB.player1Id)?.name;
        const p4 = players.find(p => p.id === match.teamB.player2Id)?.name;
        
        const winners = scoreA > scoreB ? `${p1} & ${p2}` : `${p3} & ${p4}`;
        addLog('MATCH_END', `Match Ended: ${scoreA}:${scoreB}. Winners: ${winners}`);
    }

    setPlayers(prevPlayers => {
      const targetMatch = matches.find(m => m.id === matchId);
      const m = targetMatch || match!;

      return prevPlayers.map(p => {
        const inTeamA = p.id === m.teamA.player1Id || p.id === m.teamA.player2Id;
        const inTeamB = p.id === m.teamB.player1Id || p.id === m.teamB.player2Id;

        if (!inTeamA && !inTeamB) {
            if (p.active) {
                return { ...p, stats: { ...p.stats, restCount: p.stats.restCount + 1 }};
            }
            return p;
        }

        const isWinner = (inTeamA && scoreA > scoreB) || (inTeamB && scoreB > scoreA);
        const myGames = inTeamA ? scoreA : scoreB;
        const enemyGames = inTeamA ? scoreB : scoreA;

        return {
          ...p,
          stats: {
            ...p.stats,
            matchesPlayed: p.stats.matchesPlayed + 1,
            wins: p.stats.wins + (isWinner ? 1 : 0),
            losses: p.stats.losses + (isWinner ? 0 : 1),
            gamesWon: p.stats.gamesWon + myGames,
            gamesLost: p.stats.gamesLost + enemyGames,
          }
        };
      });
    });
  };

  const deleteMatch = (matchId: string) => {
    setMatches(prev => prev.filter(m => m.id !== matchId));
    addLog('SYSTEM', 'A match record was deleted.');
  };

  const postAnnouncement = (text: string, author?: string) => {
    addLog('ANNOUNCEMENT', text, author || 'Manager');
  };

  const resetData = () => {
    if(confirm("Are you sure? This will delete all history.")) {
      localStorage.removeItem(APP_STORAGE_KEY);
      setMatches([]);
      setFeed([]);
      initializeDefaults();
    }
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
      reorderPlayers,
      togglePlayerActive,
      createNextMatch,
      generateSchedule,
      finishMatch,
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