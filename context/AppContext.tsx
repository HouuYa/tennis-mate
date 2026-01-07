import React, { createContext, useContext, useEffect, useState, ReactNode, PropsWithChildren } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, Match, AppState, FeedMessage } from '../types';
import { APP_STORAGE_KEY, INITIAL_PLAYERS } from '../constants';
import { generateNextMatch, generateSessionSchedule } from '../utils/matchmaking';
import { recalculatePlayerStats } from '../utils/statsUtils';
import { DataService } from '../services/DataService';
import { LocalDataService } from '../services/LocalDataService';
import { SupabaseDataService } from '../services/SupabaseDataService';
import { GoogleSheetsDataService } from '../services/GoogleSheetsDataService';

interface AppContextType {
  players: Player[];
  matches: Match[];
  feed: FeedMessage[];
  activeMatch: Match | null;
  mode: 'LOCAL' | 'CLOUD' | 'GOOGLE_SHEETS' | null;
  switchMode: (mode: 'LOCAL' | 'CLOUD' | 'GOOGLE_SHEETS') => void;
  startCloudSession: (location?: string, playedAt?: string) => Promise<void>;
  loadCloudSession: (sessionId: string) => Promise<void>;

  // Google Sheets specific methods
  setGoogleSheetsUrl: (url: string) => Promise<void>;
  testGoogleSheetsConnection: () => Promise<boolean>;
  loadGoogleSheetsData: () => Promise<void>;
  getGoogleSheetsUrl: () => string | null;

  addPlayer: (name: string, fromDB?: Player) => Promise<void>;
  getAllPlayers: () => Promise<Player[]>;
  updatePlayerName: (id: string, name: string) => void;
  reorderPlayers: (fromIndex: number, toIndex: number) => void;
  shufflePlayers: () => void;
  togglePlayerActive: (id: string) => void;
  deletePlayer: (id: string) => boolean;
  createNextMatch: () => boolean;
  generateSchedule: (count: number, overwrite?: boolean) => void;
  finishMatch: (matchId: string, scoreA: number, scoreB: number) => void;
  undoFinishMatch: (matchId: string) => void;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number) => void;
  deleteMatch: (matchId: string) => void;
  postAnnouncement: (text: string, author?: string) => void;
  resetData: () => void;
  exportData: () => string;
  importData: (jsonString: string) => boolean;
  getShareableLink: () => string;
  sessionLocation: string;
  setSessionLocation: (loc: string) => void;
  sessionDate: string;
  setSessionDate: (date: string) => void;
  getRecentLocations: () => Promise<string[]>;
  exitMode: () => void;
  saveAllToSheets: () => Promise<void>;
  saveAllToCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MODE_STORAGE_KEY = 'tennis-mate-mode';

export const AppProvider = ({ children }: PropsWithChildren<{}>) => {
  const [mode, setMode] = useState<'LOCAL' | 'CLOUD' | 'GOOGLE_SHEETS' | null>(() => {
    // Restore mode from localStorage on initial load
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode === 'LOCAL' || savedMode === 'CLOUD' || savedMode === 'GOOGLE_SHEETS') {
      return savedMode;
    }
    return null;
  });
  const [dataService, setDataService] = useState<DataService>(new LocalDataService());
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [feed, setFeed] = useState<FeedMessage[]>([]);
  const [sessionLocation, setSessionLocation] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>('');

  // Helper function to reset session state
  const resetSessionState = () => {
    setPlayers([]);
    setMatches([]);
  };

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

  // Initialize data service based on restored mode
  useEffect(() => {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode && savedMode !== 'null') {
      // If mode was restored from localStorage, initialize the correct data service
      if (savedMode === 'LOCAL') {
        const localService = new LocalDataService();
        setDataService(localService);
        // Local mode auto-loads from localStorage (already handled in first useEffect)
      } else if (savedMode === 'GOOGLE_SHEETS') {
        const sheetsService = new GoogleSheetsDataService();
        setDataService(sheetsService);
        // Session manager will handle loading data
      } else if (savedMode === 'CLOUD') {
        const cloudService = new SupabaseDataService();
        setDataService(cloudService);
        // DO NOT auto-load cloud session - let session manager handle it
        // This allows user to choose between continuing saved session or starting new
      }
    }
  }, []); // Only run once on mount

  // Save to local storage on change (ONLY IN LOCAL MODE)
  useEffect(() => {
    if (mode === 'LOCAL' && (players.length > 0 || feed.length > 0)) {
      const state: AppState = { players, matches, feed };
      dataService.saveState(state);
    }
  }, [players, matches, feed, mode, dataService]);

  // Google Sheets specific methods
  const setGoogleSheetsUrl = async (url: string): Promise<void> => {
    if (mode !== 'GOOGLE_SHEETS' || dataService.type !== 'GOOGLE_SHEETS') return;
    const service = dataService as GoogleSheetsDataService;
    service.setWebAppUrl(url);
  };

  const testGoogleSheetsConnection = async (): Promise<boolean> => {
    if (mode !== 'GOOGLE_SHEETS' || dataService.type !== 'GOOGLE_SHEETS') return false;
    const service = dataService as GoogleSheetsDataService;
    return await service.testConnection();
  };

  const loadGoogleSheetsData = async (): Promise<void> => {
    if (mode !== 'GOOGLE_SHEETS' || dataService.type !== 'GOOGLE_SHEETS') return;
    const service = dataService as GoogleSheetsDataService;
    const state = await service.loadSession();
    if (state) {
      setPlayers(state.players);
      setMatches(state.matches);
      setFeed(state.feed);
      addLog('SYSTEM', 'Data loaded from Google Sheets successfully.');
    }
  };

  const getGoogleSheetsUrl = (): string | null => {
    if (mode !== 'GOOGLE_SHEETS' || dataService.type !== 'GOOGLE_SHEETS') return null;
    const service = dataService as GoogleSheetsDataService;
    return service.getWebAppUrl();
  };

  const switchMode = (newMode: 'LOCAL' | 'CLOUD' | 'GOOGLE_SHEETS') => {
    setMode(newMode);
    // Persist mode to localStorage
    localStorage.setItem(MODE_STORAGE_KEY, newMode);

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
    } else if (newMode === 'GOOGLE_SHEETS') {
      const sheetsService = new GoogleSheetsDataService();
      setDataService(sheetsService);

      // Check if there's a saved Web App URL
      const savedUrl = sheetsService.getWebAppUrl();

      // Always reset session state when switching to Google Sheets
      // This ensures players.length === 0, triggering the GoogleSheetsSessionManager modal
      // The modal (via 'LANDING' mode) will offer "Use Current Sheet" or "Connect New"
      resetSessionState();

      if (!savedUrl) {
        addLog('SYSTEM', 'Switched to Google Sheets Mode. Please configure your Google Sheets URL.');
      } else {
        addLog('SYSTEM', 'Switched to Google Sheets Mode.');
      }
    } else {
      const cloudService = new SupabaseDataService();
      setDataService(cloudService);

      // Check if there's a saved session ID to restore
      const savedSessionId = cloudService.getCurrentSessionId();

      if (savedSessionId) {
        // Restore the session
        addLog('SYSTEM', `Restoring Cloud Session (ID: ${savedSessionId})`);
        cloudService.loadSession(savedSessionId).then(state => {
          setPlayers(state.players);
          setMatches(state.matches);
          setFeed(state.feed);
          addLog('SYSTEM', 'Session restored successfully.');
        }).catch(err => {
          console.error('Failed to restore session:', err);
          addLog('SYSTEM', '⚠️ Failed to restore session. Please start or load a session.');
          // Clear the invalid session ID to prevent repeated failures
          try {
            localStorage.removeItem('tennis-mate-current-session-id');
          } catch (e) {
            console.warn('Failed to clear invalid session ID:', e);
          }
          resetSessionState();
        });
      } else {
        // No saved session - show CloudSessionManager UI
        addLog('SYSTEM', 'Switched to Cloud Mode. Please start or load a session.');
        resetSessionState();
      }
    }
  };

  const exitMode = () => {
    setMode(null);
    localStorage.removeItem(MODE_STORAGE_KEY);
    localStorage.removeItem('tennis-mate-guest-session-ready');
    localStorage.removeItem('tennis-mate-cloud-session-ready');
    localStorage.removeItem('tennis-mate-sheets-session-ready');
    resetSessionState();
  };

  const startCloudSession = async (location?: string, playedAt?: string) => {
    if (mode !== 'CLOUD') return;
    try {
      const id = await dataService.createSession?.(location, playedAt || sessionDate);
      if (location) setSessionLocation(location);
      addLog('SYSTEM', `New Cloud Session Started (ID: ${id})`);

      // Add default players automatically for better UX
      addLog('SYSTEM', 'Adding default players...');

      const playerAddPromises = INITIAL_PLAYERS.map(async (playerName) => {
        try {
          await addPlayer(playerName);
          return true;
        } catch (error) {
          console.error(`Failed to add player ${playerName}:`, error);
          // Continue adding other players even if one fails
          return false;
        }
      });

      const results = await Promise.all(playerAddPromises);
      const successCount = results.filter(Boolean).length;

      if (successCount > 0) {
        addLog('SYSTEM', `✅ Session ready! ${successCount} players added.`);
      } else {
        addLog('SYSTEM', '⚠️ Session created, but failed to add default players. Please add players manually.');
      }
    } catch (e) {
      console.error(e);
      addLog('SYSTEM', '⚠️ Failed to start cloud session.');
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
    // When adding a player to the session, always set active: true
    // User can toggle inactive later if needed via UI
    const newPlayer: Player = fromDB ? {
      ...fromDB,
      active: true, // Force active when adding to session (semantic: "I want this player today")
      stats: fromDB.stats || { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
    } : {
      id: uuidv4(),
      name,
      active: true,
      stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
    };

    try {
      setPlayers(prev => [...prev, newPlayer]);
      addLog('SYSTEM', `${newPlayer.name} has joined the club.`);

      if (mode === 'CLOUD') {
        await dataService.addPlayer?.(newPlayer);
      }
    } catch (error) {
      console.error('Failed to add player:', error);
      addLog('SYSTEM', '⚠️ Failed to add player. Please try again.');
      // Rollback
      setPlayers(prev => prev.filter(p => p.id !== newPlayer.id));
      throw error;
    }
  };

  const getAllPlayers = async (): Promise<Player[]> => {
    if (dataService.getAllPlayers) {
      return await dataService.getAllPlayers();
    }
    return [];
  };

  const getRecentLocations = async (): Promise<string[]> => {
    if (dataService.getRecentLocations) {
      return await dataService.getRecentLocations();
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

  const deletePlayer = (id: string): boolean => {
    const player = players.find(p => p.id === id);
    if (!player) return false;

    // Check if player is in any unfinished matches
    const isInUnfinishedMatch = matches.some(m => {
      if (m.isFinished) return false;
      const playerIds = [
        m.teamA.player1Id,
        m.teamA.player2Id,
        m.teamB.player1Id,
        m.teamB.player2Id
      ];
      return playerIds.includes(id);
    });

    if (isInUnfinishedMatch) {
      addLog('SYSTEM', `Cannot delete ${player.name} - player is in active or queued matches.`);
      return false;
    }

    // Safe to delete
    setPlayers(prev => prev.filter(p => p.id !== id));
    addLog('SYSTEM', `${player.name} has been removed from the roster.`);
    return true;
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

    // Save original state for rollback
    const originalMatches = matches;
    const originalPlayers = players;

    try {
      // 1. Calculate the NEW match object
      const updatedMatch: Match = { ...match, scoreA, scoreB, isFinished: true, endTime: Date.now() };

      // 2. Update Matches State First
      let updatedMatches = matches.map(m => m.id === matchId ? updatedMatch : m);
      setMatches(updatedMatches);

      // 3. Recalculate Player Stats from the updated matches list
      // This ensures stats are always 100% in sync with match history
      const updatedPlayers = recalculatePlayerStats(players, updatedMatches); // players (current list)
      setPlayers(updatedPlayers);

      // Removed auto-save for both CLOUD and GOOGLE_SHEETS - user wants batch save at the end.
    } catch (error) {
      console.error('Failed to finish match:', error);
      addLog('SYSTEM', '⚠️ Failed to save match result. Please try again.');
      // Rollback state changes
      setMatches(originalMatches);
      setPlayers(originalPlayers);
      throw error; // Re-throw so components can handle it
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

  const deleteMatch = async (matchId: string) => {
    const deletedMatch = matches.find(m => m.id === matchId);

    try {
      const updatedMatches = matches.filter(m => m.id !== matchId);
      setMatches(updatedMatches);

      // Recalculate stats cleanly
      const updatedPlayers = recalculatePlayerStats(players, updatedMatches);
      setPlayers(updatedPlayers);

      if (mode === 'CLOUD') {
        await dataService.deleteMatch?.(matchId);
      }

      addLog('SYSTEM', 'A match record was deleted.');
    } catch (error) {
      console.error('Failed to delete match:', error);
      addLog('SYSTEM', '⚠️ Failed to delete match. Please try again.');
      // Rollback
      if (deletedMatch) {
        setMatches(prev => [...prev, deletedMatch].sort((a, b) => a.timestamp - b.timestamp));
        const restoredPlayers = recalculatePlayerStats(players, [...matches]);
        setPlayers(restoredPlayers);
      }
      throw error;
    }
  };

  const postAnnouncement = (text: string, author?: string) => {
    addLog('ANNOUNCEMENT', text, author || 'Manager');
  };

  const resetData = () => {
    localStorage.removeItem(APP_STORAGE_KEY);
    setMatches([]);
    setFeed([]);
    setSessionLocation('');
    setSessionDate('');

    // In Cloud mode, clear everything and show SessionManager
    // In Local mode, initialize with default players
    if (mode === 'CLOUD') {
      setPlayers([]);
      // Clear session ID from localStorage
      try {
        localStorage.removeItem('tennis-mate-current-session-id');
      } catch (e) {
        console.warn('Failed to clear session ID:', e);
      }
      addLog('SYSTEM', 'Data reset. Please start or load a session.');
    } else {
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
      mode,
      switchMode,
      startCloudSession,
      loadCloudSession,
      setGoogleSheetsUrl,
      testGoogleSheetsConnection,
      loadGoogleSheetsData,
      getGoogleSheetsUrl,
      addPlayer,
      getAllPlayers,
      updatePlayerName,
      reorderPlayers,
      shufflePlayers,
      togglePlayerActive,
      deletePlayer,
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
      getShareableLink,
      sessionLocation,
      setSessionLocation,
      sessionDate,
      setSessionDate,
      getRecentLocations,
      exitMode,
      saveAllToSheets: async () => {
        if (mode !== 'GOOGLE_SHEETS' || dataService.type !== 'GOOGLE_SHEETS') return;

        const finishedMatchesInSession = matches.filter(m => m.isFinished);
        if (finishedMatchesInSession.length === 0) return;

        const service = dataService as GoogleSheetsDataService;

        try {
          addLog('SYSTEM', `Saving matches to Google Sheets (Location: ${sessionLocation || 'None Specified'})...`);
          // Use batch save or loop? User said "batch save" (한꺼번에 저장하자).
          // We will implement batch save in the service.
          await service.saveBatchWithNames(finishedMatchesInSession, players, sessionLocation, sessionDate);
          addLog('SYSTEM', '✅ Successfully saved all matches to Google Sheets.');
        } catch (error) {
          console.error('Failed to save to Google Sheets:', error);
          addLog('SYSTEM', '⚠️ Failed to save to Google Sheets. Please check your connection.');
          throw error;
        }
      },
      saveAllToCloud: async () => {
        if (mode !== 'CLOUD' || dataService.type !== 'CLOUD') return;

        const finishedMatchesInSession = matches.filter(m => m.isFinished);
        if (finishedMatchesInSession.length === 0) return;

        try {
          addLog('SYSTEM', `Saving matches to Cloud (Location: ${sessionLocation || 'None Specified'})...`);

          // Save all finished matches to Supabase in parallel for better performance
          // Use allSettled to handle partial failures gracefully
          const results = await Promise.allSettled(
            finishedMatchesInSession.map(match => dataService.saveMatch?.(match))
          );

          const rejectedResults = results.filter(
            (result): result is PromiseRejectedResult => result.status === 'rejected'
          );
          const fulfilledCount = results.length - rejectedResults.length;

          if (fulfilledCount > 0) {
            addLog('SYSTEM', `✅ Successfully saved ${fulfilledCount} of ${results.length} matches to Supabase.`);
          }

          if (rejectedResults.length > 0) {
            console.error('Failures during batch save:');
            rejectedResults.forEach(r => console.error('-', r.reason));
            throw new Error(`Failed to save ${rejectedResults.length} of ${results.length} matches. First error: ${rejectedResults[0].reason}`);
          }
        } catch (error) {
          console.error('Failed to save to Supabase:', error);
          addLog('SYSTEM', '⚠️ Failed to save to Supabase. Please check your connection.');
          throw error;
        }
      }
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