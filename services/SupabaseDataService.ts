import { DataService } from './DataService';
import { AppState, Player, Match, FeedMessage, SessionSummary } from '../types';
import { supabase } from './supabaseClient';
import { recalculatePlayerStats } from '../utils/statsUtils';

export class SupabaseDataService implements DataService {
    type: 'CLOUD' = 'CLOUD';
    private currentSessionId: string | null = null;

    async listSessions(): Promise<SessionSummary[]> {
        const { data, error } = await supabase
            .from('sessions')
            .select('id, played_at, location, status')
            .order('played_at', { ascending: false });

        if (error) throw error;

        return data.map((s: any) => ({
            id: s.id,
            playedAt: new Date(s.played_at).getTime(),
            location: s.location,
            status: s.status
        }));
    }

    async createSession(location?: string): Promise<string> {
        const { data, error } = await supabase
            .from('sessions')
            .insert({ location, status: 'active' })
            .select('id')
            .single();

        if (error) throw error;
        this.currentSessionId = data.id;
        return data.id;
    }

    async getAllPlayers(): Promise<Player[]> {
        const { data, error } = await supabase.from('players').select('*').order('name');
        if (error) throw error;
        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            active: false,
            stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
        }));
    }

    async loadSession(sessionId?: string): Promise<AppState | null> {
        if (!sessionId) return null; // Or logic to find active session?

        this.currentSessionId = sessionId;

        // Fetch players for this session
        // This is tricky because players are in session_players or active match participants.
        // For now, let's assuming we just load the session data. 
        // But wait, our 'sessions' table only has meta data.
        // 'session_players' has the roster.

        const [playersRes, matchesRes] = await Promise.all([
            supabase.from('session_players')
                .select('player_id, players(*)')
                .eq('session_id', sessionId),
            supabase.from('matches')
                .select('*')
                .eq('session_id', sessionId)
                .order('played_at', { ascending: true })
        ]);

        if (playersRes.error) throw playersRes.error;
        if (matchesRes.error) throw matchesRes.error;

        // Transform Players
        const players: Player[] = playersRes.data.map((item: any) => ({
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
        const matches: Match[] = matchesRes.data.map((m: any) => ({
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
        const { error: playerError } = await supabase
            .from('players')
            .upsert({ id: player.id, name: player.name }, { onConflict: 'id' });

        if (playerError) {
            console.error('Failed to upsert player:', playerError);
            throw playerError;
        }

        // 2. Add to session_players (use upsert to avoid duplicate key errors)
        const { error: sessionError } = await supabase
            .from('session_players')
            .upsert(
                { session_id: this.currentSessionId, player_id: player.id },
                { onConflict: 'session_id,player_id' }
            );

        if (sessionError) {
            console.error('Failed to add player to session:', sessionError);
            throw sessionError;
        }
    }

    async updatePlayer(player: Player): Promise<void> {
        const { error } = await supabase
            .from('players')
            .update({ name: player.name })
            .eq('id', player.id);

        if (error) {
            console.error('Failed to update player:', error);
            throw error;
        }
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

        const { error } = await supabase.from('matches').upsert(payload);
        if (error) throw error;
    }

    async deleteMatch(matchId: string): Promise<void> {
        const { error } = await supabase
            .from('matches')
            .delete()
            .eq('id', matchId);

        if (error) {
            console.error('Failed to delete match:', error);
            throw error;
        }
    }
}
