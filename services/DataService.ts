import { AppState, Player, Match, FeedMessage, SessionSummary } from '../types';

export interface DataService {
    type: 'LOCAL' | 'CLOUD' | 'GOOGLE_SHEETS';

    // Initialization
    listSessions?(): Promise<SessionSummary[]>;
    loadSession(sessionId?: string): Promise<AppState | null>;
    createSession?(location?: string, playedAt?: string): Promise<string>; // Returns session ID
    getAllPlayers?(): Promise<Player[]>;

    // Core Actions
    saveState(state: AppState): Promise<void>;

    // Specific Actions (Optional, for finer control in Cloud mode)
    addPlayer?(player: Player): Promise<void>;
    updatePlayer?(player: Player): Promise<void>;
    saveMatch?(match: Match): Promise<void>;
    deleteMatch?(matchId: string): Promise<void>;
    addFeedMessage?(message: FeedMessage): Promise<void>;
}
