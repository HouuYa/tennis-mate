import { DataService } from './DataService';
import { AppState, Player, Match, FeedMessage, SessionSummary } from '../types';
import { APP_STORAGE_KEY } from '../constants';
import { recalculatePlayerStats } from '../utils/statsUtils';

export class LocalDataService implements DataService {
    type: 'LOCAL' = 'LOCAL';

    async listSessions(): Promise<SessionSummary[]> {
        return [];
    }

    async loadSession(): Promise<AppState | null> {
        const saved = localStorage.getItem(APP_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as AppState;
                // Auto-heal: Recalculate stats from matches to ensure consistency
                if (parsed.players && parsed.matches) {
                    parsed.players = recalculatePlayerStats(parsed.players, parsed.matches);
                }
                return parsed;
            } catch (e) {
                console.error("Failed to parse saved data", e);
            }
        }
        return null;
    }

    async createSession(): Promise<string> {
        // Local mode doesn't really have explicitly ID-based sessions, 
        // but we return a generic ID for compatibility.
        return 'local-session';
    }

    async getAllPlayers(): Promise<Player[]> {
        return [];
    }


    // For Local Storage, we typically save the whole state.
    // We can just dump the state provided by AppContext.
    async saveState(state: AppState): Promise<void> {
        localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    }

    // Optional methods - implemented for consistency if needed, 
    // but saveState handles everything for LocalStorage usually.
    async addPlayer(player: Player): Promise<void> { /* handled by saveState */ }
    async updatePlayer(player: Player): Promise<void> { /* handled by saveState */ }
    async saveMatch(match: Match): Promise<void> { /* handled by saveState */ }
    async deleteMatch(matchId: string): Promise<void> { /* handled by saveState */ }
    async addFeedMessage(message: FeedMessage): Promise<void> { /* handled by saveState */ }
}
