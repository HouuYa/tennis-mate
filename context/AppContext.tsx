import React, { createContext, useContext, useEffect, useState, ReactNode, PropsWithChildren } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, Match, AppState, FeedMessage } from '../types';
import { APP_STORAGE_KEY, INITIAL_PLAYERS } from '../constants';
import { generateNextMatch, generateSessionSchedule } from '../utils/matchmaking';
import { recalculatePlayerStats } from '../utils/statsUtils';
import { DataService } from '../services/DataService';
import { LocalDataService } from '../services/LocalDataService';
import { SupabaseDataService } from '../services/SupabaseDataService';

interface AppContextType {
  players: Player[];
  matches: Match[];
  feed: FeedMessage[];
  activeMatch: Match | null;
  mode: 'LOCAL' | 'CLOUD' | null;
  switchMode: (mode: 'LOCAL' | 'CLOUD') => void;
  startCloudSession: (location?: string) => Promise<void>;
  loadCloudSession: (sessionId: string) => Promise<void>;

  addPlayer: (name: string, fromDB?: Player) => Promise<void>;
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
  const [mode, setMode] = useState<'LOCAL' | 'CLOUD' | null>(null);
  const [dataService, setDataService] = useState<DataService>(new LocalDataService());
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

  // Save to local storage on change (ONLY IN LOCAL MODE)
  useEffect(() => {
    if (mode === 'LOCAL' && (players.length > 0 || feed.length > 0)) {
      const state: AppState = { players, matches, feed };
      dataService.saveState(state);
    }
  }, [players, matches, feed, mode, dataService]);

  const switchMode = (newMode: 'LOCAL' | 'CLOUD') => {
    setMode(newMode);
    if (newMode === 'LOCAL') {
      setDataService(new LocalDataService());
      // Reload local data? Or keep current?
      // Ideally reload local data to ensure consistency
      const localService = new LocalDataService();
      localService.loadSession().then(state => {
        if (state) {
          setPlayers(state.players);
          setMatches(state.matches);
          setFeed(state.feed);
        } else {
          initializeDefaults();
        }
      });
    } else {
      setDataService(new SupabaseDataService());
      // For cloud, we initialize defaults so the user sees some data
      initializeDefaults();
      addLog('SYSTEM', 'Switched to Cloud Mode. Please load or start a session.');
    }
  };

  const startCloudSession = async (location?: string) => {
    if (mode !== 'CLOUD') return;
    try {
      const id = await dataService.createSession?.(location);
      addLog('SYSTEM', `New Cloud Session Started (ID: ${id})`);
    } catch (e) {
      console.error(e);
      addLog('SYSTEM', 'Failed to start cloud session.');
    }
  };

  const loadCloudSession = async (sessionId: string) => {
    if (mode !== 'CLOUD') return;
    try {
      const state = await dataService.loadSession(sessionId);
      if (state) {
        setPlayers(state.players);
        setMatches(state.matches);
        setFeed(state.feed);
        addLog('SYSTEM', 'Session loaded from Cloud.');
      }
    } catch (e) {
      console.error(e);
      addLog('SYSTEM', 'Failed to load cloud session.');
    }
  };

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

  const addPlayer = async (name: string, fromDB?: Player) => {
    const newPlayer: Player = fromDB || {
      id: uuidv4(),
      name,
      active: true,
      stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
    };

    setPlayers(prev => [...prev, newPlayer]);
    addLog('SYSTEM', `${newPlayer.name} has joined the club.`);

    if (mode === 'CLOUD') {
      await dataService.addPlayer?.(newPlayer);
    }
  };

  const getAllPlayers = async (): Promise<Player[]> => {
    if (dataService.getAllPlayers) {
      return await dataService.getAllPlayers();
    }
    return [];
  };

  const updatePlayerName = (id: string, name: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    if (mode === 'CLOUD') {
      const p = players.find(p => p.id === id);
      if (p) dataService.updatePlayer?.({ ...p, name });
    }
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

  const finishMatch = async (matchId: string, scoreA: number, scoreB: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    // 1. Calculate the NEW match object
    const updatedMatch: Match = { ...match, scoreA, scoreB, isFinished: true, endTime: Date.now() };

    // 2. Update Matches State First
    let updatedMatches = matches.map(m => m.id === matchId ? updatedMatch : m);
    setMatches(updatedMatches);

    // 3. Recalculate Player Stats from the updated matches list
    // This ensures stats are always 100% in sync with match history
    const updatedPlayers = recalculatePlayerStats(players, updatedMatches); // players (current list)
    setPlayers(updatedPlayers);

    if (mode === 'CLOUD') {
      await dataService.saveMatch?.(updatedMatch);
    }

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
  };

  const undoFinishMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || !match.isFinished) return;

    // 1. Revert Match State
    const revertedMatch = { ...match, isFinished: false, endTime: undefined };
    const updatedMatches = matches.map(m => m.id === matchId ? revertedMatch : m);

    setMatches(updatedMatches);

    // 2. Recalculate Stats from updated matches
    const updatedPlayers = recalculatePlayerStats(players, updatedMatches);
    setPlayers(updatedPlayers);

    if (mode === 'CLOUD') {
      dataService.saveMatch?.(revertedMatch);
    }

    addLog('SYSTEM', 'Last match result was undone.');
  };

  const updateMatchScore = (matchId: string, newScoreA: number, newScoreB: number) => {
    // Check if match exists
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    // Updates
    const updatedMatch = { ...match, scoreA: newScoreA, scoreB: newScoreB };
    const updatedMatches = matches.map(m => m.id === matchId ? updatedMatch : m);

    setMatches(updatedMatches);

    // Only recalculate stats if the match was finished
    if (match.isFinished) {
      const updatedPlayers = recalculatePlayerStats(players, updatedMatches);
      setPlayers(updatedPlayers);
    }

    addLog('SYSTEM', `Match score updated to ${newScoreA}:${newScoreB}.`);
  };

  const deleteMatch = (matchId: string) => {
    const updatedMatches = matches.filter(m => m.id !== matchId);
    setMatches(updatedMatches);

    // Recalculate stats cleanly
    const updatedPlayers = recalculatePlayerStats(players, updatedMatches);
    setPlayers(updatedPlayers);

    addLog('SYSTEM', 'A match record was deleted.');

    if (mode === 'CLOUD') {
      dataService.deleteMatch?.(matchId);
    }
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
      mode,
      switchMode,
      startCloudSession,
      loadCloudSession,
      addPlayer,
      getAllPlayers,
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