import { AppState, Player, Match, FeedMessage } from '../types';
import { DataService } from './DataService';
import { recalculatePlayerStats } from '../utils/statsUtils';

const STORAGE_KEY_WEB_APP_URL = 'tennis-mate-google-sheets-url';

/**
 * GoogleSheetsDataService
 *
 * Uses Google Apps Script Web App as a backend.
 * User deploys a Google Apps Script with doGet/doPost endpoints.
 *
 * Data Flow:
 * - doGet: Fetch recent 100 matches from Google Sheets
 * - doPost: Save match results to Google Sheets
 *
 * All analytics/stats are calculated client-side.
 */
export class GoogleSheetsDataService implements DataService {
    type: 'GOOGLE_SHEETS' = 'GOOGLE_SHEETS';
    private webAppUrl: string | null = null;

    constructor() {
        // Try to restore saved URL from localStorage
        try {
            const saved = localStorage.getItem(STORAGE_KEY_WEB_APP_URL);
            if (saved) {
                this.webAppUrl = saved;
            }
        } catch (e) {
            console.warn('Failed to load saved Google Sheets URL:', e);
        }
    }

    /**
     * Set the Google Apps Script Web App URL
     */
    setWebAppUrl(url: string): void {
        this.webAppUrl = url;
        try {
            localStorage.setItem(STORAGE_KEY_WEB_APP_URL, url);
        } catch (e) {
            console.warn('Failed to save Google Sheets URL:', e);
        }
    }

    /**
     * Get the currently configured Web App URL
     */
    getWebAppUrl(): string | null {
        return this.webAppUrl;
    }

    /**
     * Test connection to Google Sheets
     */
    async testConnection(): Promise<boolean> {
        if (!this.webAppUrl) {
            throw new Error('Web App URL not configured');
        }

        try {
            const response = await fetch(this.webAppUrl, {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Try to parse JSON response
            const data = await response.json();

            // Expect an array (even if empty)
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format');
            }

            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }

    /**
     * Load session from Google Sheets
     * Fetches recent 100 matches and reconstructs app state
     */
    async loadSession(): Promise<AppState | null> {
        if (!this.webAppUrl) {
            return null;
        }

        try {
            const response = await fetch(this.webAppUrl, {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch data: HTTP ${response.status}`);
            }

            const rows = await response.json();

            if (!Array.isArray(rows)) {
                throw new Error('Invalid data format from Google Sheets');
            }

            // Parse rows into matches and extract players
            const { players, matches } = this.parseRowsToAppState(rows);

            return {
                players,
                matches,
                feed: []
            };
        } catch (error) {
            console.error('Failed to load from Google Sheets:', error);
            throw error;
        }
    }

    /**
     * Parse Google Sheets rows into AppState
     * Row format: [timestamp, date, duration, winner1, winner2, loser1, loser2, score, location]
     */
    private parseRowsToAppState(rows: any[]): { players: Player[], matches: Match[] } {
        const playerMap = new Map<string, Player>();
        const matches: Match[] = [];

        rows.forEach((row, index) => {
            try {
                // Row structure from PRD:
                // A: timestamp, B: date, C: duration, D: winner1, E: winner2, F: loser1, G: loser2, H: score, I: winner_score, J: loser_score, K: location
                // Flexible parsing:
                const timestampStr = row[0];
                const winner1 = row[3];
                const winner2 = row[4];
                const loser1 = row[5];
                const loser2 = row[6];
                const score = row[7];

                // Handle versioning:
                // Old format: Row length ~9 (Index 8 is location)
                // New format: Row length ~11 (Index 8 is win_score, 9 is lose_score, 10 is location)
                let location = '';
                let winnerScoreVal = 0;
                let loserScoreVal = 0;

                if (row.length > 9) {
                    // New format
                    const winnerScoreStr = row[8];
                    const loserScoreStr = row[9];
                    location = row[10] || '';
                    winnerScoreVal = parseInt(winnerScoreStr) || 0;
                    loserScoreVal = parseInt(loserScoreStr) || 0;
                } else {
                    // Old format
                    location = row[8] || ''; // location was at index 8
                }

                // Add players to map if not exists
                [winner1, winner2, loser1, loser2].forEach(name => {
                    if (name && typeof name === 'string' && !playerMap.has(name)) {
                        playerMap.set(name, {
                            id: `gs-${name.toLowerCase().replace(/\s+/g, '-')}`,
                            name: name,
                            active: true,
                            stats: {
                                matchesPlayed: 0,
                                wins: 0,
                                losses: 0,
                                draws: 0,
                                gamesWon: 0,
                                gamesLost: 0,
                                restCount: 0
                            }
                        });
                    }
                });

                // Parse score (format: "6-4")
                // Note: scores in sheet are always stored as winner-loser (max-min)
                // If we have explicit split scores (new format), use them. Otherwise parse string.
                let scoreA = 0;
                let scoreB = 0;

                if (winnerScoreVal > 0 || loserScoreVal > 0) {
                    // Map back to A/B based on who is who?
                    // Actually, match.scoreA corresponds to teamA (winner1/winner2)
                    // and match.scoreB corresponds to teamB (loser1/loser2)
                    // Since we force teamA = winner in this parsing logic below (lines 182-189),
                    // scoreA should be winnerScore.
                    scoreA = winnerScoreVal;
                    scoreB = loserScoreVal;
                } else {
                    const [score1Str, score2Str] = (score || '0-0').split('-');
                    const score1 = parseInt(score1Str) || 0;
                    const score2 = parseInt(score2Str) || 0;
                    scoreA = Math.max(score1, score2);
                    scoreB = Math.min(score1, score2);
                }

                // Parse timestamp
                let timestamp = Date.now() - (rows.length - index) * 60000; // Default: spread backwards
                try {
                    if (timestampStr) {
                        timestamp = new Date(timestampStr).getTime();
                    }
                } catch (e) {
                    // Use default
                }

                const teamA = {
                    player1Id: playerMap.get(winner1)?.id || '',
                    player2Id: playerMap.get(winner2)?.id || ''
                };
                const teamB = {
                    player1Id: playerMap.get(loser1)?.id || '',
                    player2Id: playerMap.get(loser2)?.id || ''
                };

                // Create match object
                // Create match object
                const match: Match = {
                    id: `gs-match-${timestamp}-${index}`,
                    timestamp,
                    teamA,
                    teamB,
                    scoreA, // Winner Score
                    scoreB, // Loser Score
                    isFinished: true,
                    courtNumber: 1,
                    endTime: timestamp,
                    location: location || undefined
                };

                matches.push(match);
            } catch (e) {
                console.warn(`Failed to parse row ${index}:`, e);
            }
        });

        const players = Array.from(playerMap.values());

        // Recalculate stats from matches
        const playersWithStats = recalculatePlayerStats(players, matches);

        return { players: playersWithStats, matches };
    }

    /**
     * Save state - not used in Google Sheets mode
     * Individual match saving is handled via saveMatch
     */
    async saveState(state: AppState): Promise<void> {
        // No-op: Google Sheets mode uses granular saveMatch instead
        console.log('saveState called in Google Sheets mode - no action taken');
    }

    /**
     * Save a single match to Google Sheets
     *
     * NOTE: This method is not intended for direct use with GoogleSheetsDataService,
     * as it requires player names, not just IDs. Use saveMatchWithNames from AppContext instead.
     */
    async saveMatch(match: Match): Promise<void> {
        throw new Error('saveMatch is not supported for GoogleSheetsDataService. Use saveMatchWithNames instead, which is called from AppContext with player information.');
    }

    /**
     * Save match with player names (helper method)
     */
    /**
     * Save match with player names (helper method)
     */
    async saveMatchWithNames(match: Match, players: Player[], location?: string, sessionDate?: string): Promise<void> {
        await this.saveBatchWithNames([match], players, location, sessionDate);
    }

    /**
     * Save multiple matches to Google Sheets in one operation (optional batch logic)
     * Note: Current script might only handle one, but we send as an array if needed.
     * Or we loop here for now.
     */
    async saveBatchWithNames(matches: Match[], players: Player[], location?: string, sessionDate?: string): Promise<void> {
        if (!this.webAppUrl) {
            throw new Error('Web App URL not configured');
        }

        const getPlayerName = (id: string) => {
            return players.find(p => p.id === id)?.name || id;
        };

        // Prepare all payloads
        const payloads = matches.map(match => {
            const teamA1 = getPlayerName(match.teamA.player1Id);
            const teamA2 = getPlayerName(match.teamA.player2Id);
            const teamB1 = getPlayerName(match.teamB.player1Id);
            const teamB2 = getPlayerName(match.teamB.player2Id);

            const isTeamAWinner = match.scoreA > match.scoreB;
            const isDraw = match.scoreA === match.scoreB;

            const winnerScore = isDraw ? match.scoreA : Math.max(match.scoreA, match.scoreB);
            const loserScore = isDraw ? match.scoreB : Math.min(match.scoreA, match.scoreB);

            return {
                date: sessionDate || new Date(match.timestamp).toLocaleString('sv').substring(0, 16).replace('T', ' '),
                duration: match.endTime ? Math.round((match.endTime - match.timestamp) / 60000) : 0,
                winner1: isDraw ? teamA1 : (isTeamAWinner ? teamA1 : teamB1),
                winner2: isDraw ? teamA2 : (isTeamAWinner ? teamA2 : teamB2),
                loser1: isDraw ? teamB1 : (isTeamAWinner ? teamB1 : teamA1),
                loser2: isDraw ? teamB2 : (isTeamAWinner ? teamB2 : teamA2),
                score: isDraw ? `${match.scoreA}-${match.scoreB}` : `${winnerScore}-${loserScore}`,
                winner_score: winnerScore,
                loser_score: loserScore,
                location: location || match.location || ''
            };
        });

        // Loop for now to ensure compatibility with standard "appendRow" scripts, 
        // unless the script is updated to handle batch.
        // But user said "all at once", so I'll send the whole array if there are many.
        // Actually, many scripts expect one object.
        // I'll send them one by one but in parallel to be "all at once" from UI perspective.

        await Promise.all(payloads.map(payload =>
            fetch(this.webAppUrl!, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
        ));

        console.log(`${matches.length} matches saved to Google Sheets`);
    }

    async getAllPlayers(): Promise<Player[]> {
        const session = await this.loadSession();
        return session ? session.players : [];
    }

    async getRecentLocations(): Promise<string[]> {
        const session = await this.loadSession();
        if (!session) return [];

        const locations = session.matches
            .map(m => m.location)
            .filter((loc): loc is string => !!loc && loc.trim().length > 0);

        // Return unique locations, most recent first (matches are usually parsed in order of rows?
        // parseRowsToAppState pushes matches in order of rows.
        // Assuming rows are chronological (newest at bottom? or user decided).
        // Usually sheets are chronological.
        // Reverse to get recent first.
        return Array.from(new Set(locations.reverse())).slice(0, 20); // Limit to top 20 suggestions
    }
}
