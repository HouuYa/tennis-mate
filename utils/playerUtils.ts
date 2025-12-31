import { Player, Match } from '../types';

/**
 * Calculates total points for a player based on W/D/L
 * W = 2 points, D = 1 point, L = 0 points
 */
export const calculatePoints = (player: Player): number => {
    return (player.stats.wins * 2) + (player.stats.draws * 1) + (player.stats.losses * 0);
};

/**
 * Sorts players by:
 * 1. Total Points (W=2, D=1, L=0) desc
 * 2. Game Difference desc
 * 3. Matches Played desc
 */
export const sortPlayers = (players: Player[]): Player[] => {
    return [...players].sort((a, b) => {
        // 1. Sort by Total Points desc
        const pointsA = calculatePoints(a);
        const pointsB = calculatePoints(b);
        if (pointsB !== pointsA) return pointsB - pointsA;

        // 2. Tie breaker: Game Diff desc
        const diffA = a.stats.gamesWon - a.stats.gamesLost;
        const diffB = b.stats.gamesWon - b.stats.gamesLost;
        if (diffB !== diffA) return diffB - diffA;

        // 3. Tie breaker: Matches Played desc
        return b.stats.matchesPlayed - a.stats.matchesPlayed;
    });
};

/**
 * Returns player name prefixed with their index in the ACTIVE list (e.g. "P1. John").
 * If player is not in the active list, returns just the name.
 */
export const getNameWithNumber = (id: string, allPlayers: Player[], activePlayers: Player[]): string => {
    const playerIndex = activePlayers.findIndex(p => p.id === id);
    if (playerIndex >= 0) {
        return `P${playerIndex + 1}. ${activePlayers[playerIndex].name}`;
    }
    const player = allPlayers.find(p => p.id === id);
    return player?.name || 'Unknown';
};

/**
 * Returns a list of names of players who are currently active but not playing in the given match.
 */
export const getRestingPlayerNames = (match: Match, activePlayers: Player[]): string[] => {
    const playingIds = new Set([
        match.teamA.player1Id, match.teamA.player2Id,
        match.teamB.player1Id, match.teamB.player2Id
    ]);

    const restingPlayers: string[] = [];

    activePlayers.forEach((player, i) => {
        if (!playingIds.has(player.id)) {
            restingPlayers.push(`P${i + 1}. ${player.name}`);
        }
    });

    return restingPlayers;
};
