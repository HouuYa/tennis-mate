import { Player, Match } from '../types';

/**
 * Sorts players by Wins (desc), then Game Difference (desc).
 */
export const sortPlayers = (players: Player[]): Player[] => {
    return [...players].sort((a, b) => {
        // Sort by Wins desc
        if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
        // Tie breaker: Game Diff
        const diffA = a.stats.gamesWon - a.stats.gamesLost;
        const diffB = b.stats.gamesWon - b.stats.gamesLost;
        return diffB - diffA;
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
