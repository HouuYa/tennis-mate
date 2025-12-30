import { Player, Match } from '../types';

/**
 * Recalculates player statistics based on the list of finished matches.
 * Useful for restoring state from Cloud or verifying integrity.
 */
export const recalculatePlayerStats = (players: Player[], matches: Match[]): Player[] => {
    // Initialize map with reset stats
    const playerMap = new Map<string, Player>();
    players.forEach(p => {
        playerMap.set(p.id, {
            ...p,
            stats: { matchesPlayed: 0, wins: 0, losses: 0, draws: 0, gamesWon: 0, gamesLost: 0, restCount: 0 }
        });
    });

    // Sort matches by time to replay history in correct order
    const finishedMatches = matches
        .filter(m => m.isFinished)
        .sort((a, b) => (a.endTime || a.timestamp) - (b.endTime || b.timestamp));

    finishedMatches.forEach(match => {
        playerMap.forEach((player, id) => {
            const inTeamA = match.teamA.player1Id === id || match.teamA.player2Id === id;
            const inTeamB = match.teamB.player1Id === id || match.teamB.player2Id === id;

            if (!inTeamA && !inTeamB) {
                // Logic: active players get restCount++. 
                if (player.active) {
                    const newStats = { ...player.stats, restCount: player.stats.restCount + 1 };
                    playerMap.set(id, { ...player, stats: newStats });
                }
                return;
            }

            // Participant Logic
            const { scoreA, scoreB } = match;
            const isDraw = scoreA === scoreB;
            const isWinner = (inTeamA && scoreA > scoreB) || (inTeamB && scoreB > scoreA);
            const isLoser = (inTeamA && scoreB > scoreA) || (inTeamB && scoreA > scoreB);

            const myGames = inTeamA ? scoreA : scoreB;
            const enemyGames = inTeamA ? scoreB : scoreA;

            const newStats = {
                ...player.stats,
                matchesPlayed: player.stats.matchesPlayed + 1,
                wins: player.stats.wins + (isWinner ? 1 : 0),
                losses: player.stats.losses + (isLoser ? 1 : 0),
                draws: (player.stats.draws || 0) + (isDraw ? 1 : 0),
                gamesWon: player.stats.gamesWon + myGames,
                gamesLost: player.stats.gamesLost + enemyGames
                // existing restCount is preserved
            };

            playerMap.set(id, { ...player, stats: newStats });
        });
    });

    return Array.from(playerMap.values());
};
