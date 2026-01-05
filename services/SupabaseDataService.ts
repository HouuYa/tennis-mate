import { DataService } from './DataService';
import { AppState, Player, Match, FeedMessage, SessionSummary } from '../types';
import { supabase } from './supabaseClient';
import { recalculatePlayerStats } from '../utils/statsUtils';

// Helper function for DRY error handling
async function executeSupabaseQuery<T extends { data: any; error: any }>(
    queryPromise: Promise<T> | T,
    errorMessage: string
): Promise<T['data']> {
    const result = await queryPromise;
    if (result.error) {
        console.error(errorMessage, result.error);
        throw result.error;
    }
    return result.data;
}

export class SupabaseDataService implements DataService {
    type: 'CLOUD' = 'CLOUD';
    private currentSessionId: string | null = null;
    private static SESSION_STORAGE_KEY = 'tennis-mate-current-session-id';

    constructor() {
        // Restore session ID from localStorage if available
        try {
            const savedSessionId = localStorage.getItem(SupabaseDataService.SESSION_STORAGE_KEY);
            if (savedSessionId) {
                this.currentSessionId = savedSessionId;
                console.log('Restored session ID from localStorage:', savedSessionId);
            }
        } catch (error) {
            console.warn('Failed to restore session ID from localStorage:', error);
        }
    }

    private setCurrentSessionId(sessionId: string) {
        this.currentSessionId = sessionId;
        try {
            localStorage.setItem(SupabaseDataService.SESSION_STORAGE_KEY, sessionId);
            console.log('Set current session ID:', sessionId);
        } catch (error) {
            console.warn('Failed to save session ID to localStorage:', error);
        }
    }

    private clearCurrentSessionId() {
        this.currentSessionId = null;
        try {
            localStorage.removeItem(SupabaseDataService.SESSION_STORAGE_KEY);
            console.log('Cleared current session ID');
        } catch (error) {
            console.warn('Failed to clear session ID from localStorage:', error);
        }
    }

    getCurrentSessionId(): string | null {
        return this.currentSessionId;
    }

    async listSessions(): Promise<SessionSummary[]> {
        const data = await executeSupabaseQuery(
            supabase
                .from('sessions')
                .select('id, played_at, location, status')
                .order('played_at', { ascending: false }),
            'Failed to list sessions:'
        );

        return data.map((s: any) => ({
            id: s.id,
            playedAt: new Date(s.played_at).getTime(),
            location: s.location,
            status: s.status
        }));
    }

    async createSession(location?: string, playedAt?: string): Promise<string> {
        const sessionData: { location?: string; status: string; played_at?: string } = {
            location,
            status: 'active'
        };

        // If playedAt is provided, use it; otherwise Supabase will use default now()
        if (playedAt) {
            sessionData.played_at = new Date(playedAt).toISOString();
        }

        const data = await executeSupabaseQuery(
            supabase
                .from('sessions')
                .insert(sessionData)
                .select('id')
                .single(),
            'Failed to create session:'
        );

        this.setCurrentSessionId(data.id);
        return data.id;
    }

    async getAllPlayers(): Promise<Player[]> {
        const data = await executeSupabaseQuery(
            supabase.from('players').select('*').order('name'),
            'Failed to get all players:'
        );

        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            active: false,
            stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
        }));
    }

    async loadSession(sessionId?: string): Promise<AppState | null> {
        if (!sessionId) return null; // Or logic to find active session?

        this.setCurrentSessionId(sessionId);

        // Fetch players for this session
        // This is tricky because players are in session_players or active match participants.
        // For now, let's assuming we just load the session data. 
        // But wait, our 'sessions' table only has meta data.
        // 'session_players' has the roster.

        const [playersData, matchesData] = await Promise.all([
            executeSupabaseQuery(
                supabase.from('session_players')
                    .select('player_id, players(*)')
                    .eq('session_id', sessionId),
                'Failed to load session players:'
            ),
            executeSupabaseQuery(
                supabase.from('matches')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('played_at', { ascending: true }),
                'Failed to load session matches:'
            )
        ]);

        // Transform Players
        const players: Player[] = playersData.map((item: any) => ({
            id: item.players.id,
            name: item.players.name,
            active: true, // Default to true when loading? Or need to store active state?
            stats: { // We need to calculate stats from matches or store them?
                // Ideally prompt app to recalculate stats from matches history
                matchesPlayed: 0, wins: 0, losses: 0, draws: 0,
                gamesWon: 0, gamesLost: 0, restCount: 0
            }
        }));

        // Transform Matches
        // team_a and team_b are JSONB objects: { player1Id, player2Id }
        const matches: Match[] = matchesData.map((m: any) => ({
            id: m.id,
            timestamp: new Date(m.played_at).getTime(),
            teamA: { player1Id: m.team_a.player1Id, player2Id: m.team_a.player2Id },
            teamB: { player1Id: m.team_b.player1Id, player2Id: m.team_b.player2Id },
            scoreA: m.score_a,
            scoreB: m.score_b,
            isFinished: m.is_finished,
            courtNumber: m.court_number,
            endTime: m.end_time ? new Date(m.end_time).getTime() : undefined
        }));

        // Replay matches to calculate stats
        const playersWithStats = recalculatePlayerStats(players, matches);

        return {
            players: playersWithStats,
            matches,
            feed: [] // Feeds are not yet persisted in DB plan, maybe add later
        };
    }

    // AppContext usually saves the WHOLE state.
    // In Cloud Mode, we shouldn't overwrite everything blindly.
    // We should rely on granular updates.
    async saveState(state: AppState): Promise<void> {
        // No-op for Cloud, rely on specific actions.
        // Or warn if used?
        console.warn("SupabaseDataService.saveState is not implemented (use granular updates)");
    }

    // Granular updates
    async addPlayer(player: Player): Promise<void> {
        if (!this.currentSessionId) throw new Error("No active session");

        // 1. Ensure player exists in master 'players' table using upsert for safety
        await executeSupabaseQuery(
            supabase.from('players').upsert({ id: player.id, name: player.name }, { onConflict: 'id' }),
            'Failed to upsert player:'
        );

        // 2. Add to session_players (use upsert to avoid duplicate key errors)
        await executeSupabaseQuery(
            supabase.from('session_players').upsert(
                { session_id: this.currentSessionId, player_id: player.id },
                { onConflict: 'session_id,player_id' }
            ),
            'Failed to add player to session:'
        );
    }

    async updatePlayer(player: Player): Promise<void> {
        await executeSupabaseQuery(
            supabase.from('players').update({ name: player.name }).eq('id', player.id),
            'Failed to update player:'
        );
    }

    async saveMatch(match: Match): Promise<void> {
        if (!this.currentSessionId) throw new Error("No active session");

        const payload = {
            id: match.id,
            session_id: this.currentSessionId,
            played_at: new Date(match.timestamp).toISOString(),
            // Store as JSONB objects (not arrays) to match DB schema
            team_a: { player1Id: match.teamA.player1Id, player2Id: match.teamA.player2Id },
            team_b: { player1Id: match.teamB.player1Id, player2Id: match.teamB.player2Id },
            score_a: match.scoreA,
            score_b: match.scoreB,
            is_finished: match.isFinished,
            court_number: match.courtNumber,
            end_time: match.endTime ? new Date(match.endTime).toISOString() : null
        };

        await executeSupabaseQuery(
            supabase.from('matches').upsert(payload),
            'Failed to save match:'
        );
    }

    async deleteMatch(matchId: string): Promise<void> {
        await executeSupabaseQuery(
            supabase.from('matches').delete().eq('id', matchId),
            'Failed to delete match:'
        );
    }
}
