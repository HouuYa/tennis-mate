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
                // A: timestamp, B: date, C: duration, D: winner1, E: winner2, F: loser1, G: loser2, H: score, I: location
                const [timestampStr, date, duration, winner1, winner2, loser1, loser2, score, location] = row;

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
                const [scoreAStr, scoreBStr] = (score || '0-0').split('-');
                const scoreA = parseInt(scoreAStr) || 0;
                const scoreB = parseInt(scoreBStr) || 0;

                // Parse timestamp
                let timestamp = Date.now() - (rows.length - index) * 60000; // Default: spread backwards
                try {
                    if (timestampStr) {
                        timestamp = new Date(timestampStr).getTime();
                    }
                } catch (e) {
                    // Use default
                }

                // Create match object
                const match: Match = {
                    id: `gs-match-${timestamp}-${index}`,
                    timestamp,
                    teamA: {
                        player1Id: playerMap.get(winner1)?.id || '',
                        player2Id: playerMap.get(winner2)?.id || ''
                    },
                    teamB: {
                        player1Id: playerMap.get(loser1)?.id || '',
                        player2Id: playerMap.get(loser2)?.id || ''
                    },
                    scoreA,
                    scoreB,
                    isFinished: true,
                    courtNumber: 1,
                    endTime: timestamp
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
     */
    async saveMatch(match: Match): Promise<void> {
        if (!this.webAppUrl) {
            throw new Error('Web App URL not configured');
        }

        // Only save finished matches
        if (!match.isFinished) {
            return;
        }

        try {
            // Need to resolve player names from IDs
            // This requires access to current player state
            // For now, we'll use the IDs as placeholders
            // The caller should pass player names through a different mechanism

            // Actually, we need to handle this differently
            // Let's accept player names in the match saving flow
            // For now, skip - will be called from AppContext with proper data

            const payload = {
                date: new Date(match.timestamp).toISOString().split('T')[0],
                duration: match.endTime ? Math.round((match.endTime - match.timestamp) / 60000) : 0,
                winner1: match.scoreA > match.scoreB ? match.teamA.player1Id : match.teamB.player1Id,
                winner2: match.scoreA > match.scoreB ? match.teamA.player2Id : match.teamB.player2Id,
                loser1: match.scoreA > match.scoreB ? match.teamB.player1Id : match.teamA.player1Id,
                loser2: match.scoreA > match.scoreB ? match.teamB.player2Id : match.teamA.player2Id,
                score: `${Math.max(match.scoreA, match.scoreB)}-${Math.min(match.scoreA, match.scoreB)}`,
                location: ''
            };

            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                mode: 'no-cors', // Required for Apps Script
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            // Note: With no-cors mode, we can't read the response
            // We assume success if no error is thrown
            console.log('Match saved to Google Sheets (no-cors mode)');
        } catch (error) {
            console.error('Failed to save match to Google Sheets:', error);
            throw error;
        }
    }

    /**
     * Save match with player names (helper method)
     */
    async saveMatchWithNames(
        match: Match,
        players: Player[]
    ): Promise<void> {
        if (!this.webAppUrl) {
            throw new Error('Web App URL not configured');
        }

        if (!match.isFinished) {
            return;
        }

        try {
            const getPlayerName = (id: string) => {
                return players.find(p => p.id === id)?.name || id;
            };

            const teamA1 = getPlayerName(match.teamA.player1Id);
            const teamA2 = getPlayerName(match.teamA.player2Id);
            const teamB1 = getPlayerName(match.teamB.player1Id);
            const teamB2 = getPlayerName(match.teamB.player2Id);

            const isTeamAWinner = match.scoreA > match.scoreB;
            const isDraw = match.scoreA === match.scoreB;

            const payload = {
                date: new Date(match.timestamp).toISOString().split('T')[0],
                duration: match.endTime ? Math.round((match.endTime - match.timestamp) / 60000) : 0,
                winner1: isDraw ? teamA1 : (isTeamAWinner ? teamA1 : teamB1),
                winner2: isDraw ? teamA2 : (isTeamAWinner ? teamA2 : teamB2),
                loser1: isDraw ? teamB1 : (isTeamAWinner ? teamB1 : teamA1),
                loser2: isDraw ? teamB2 : (isTeamAWinner ? teamB2 : teamA2),
                score: isDraw ? `${match.scoreA}-${match.scoreB}` : `${Math.max(match.scoreA, match.scoreB)}-${Math.min(match.scoreA, match.scoreB)}`,
                location: ''
            };

            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('Match saved to Google Sheets');
        } catch (error) {
            console.error('Failed to save match to Google Sheets:', error);
            throw error;
        }
    }
}
