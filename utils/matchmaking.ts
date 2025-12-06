import { Player, Match } from '../types';

/**
 * Generates a single next match based on history.
 */
export const generateNextMatch = (
  allPlayers: Player[],
  matchHistory: Match[],
  nextMatchIndexOverride?: number
): { teamA: string[]; teamB: string[]; restingPlayerName?: string } | null => {
  
  const activePlayers = allPlayers.filter(p => p.active);
  const totalActive = activePlayers.length;

  if (totalActive < 4) return null;

  // Logic: "Reverse Order Rest"
  let playingPlayers: Player[] = [];
  let restingPlayerName: string | undefined = undefined;

  const matchCount = nextMatchIndexOverride !== undefined ? nextMatchIndexOverride : matchHistory.length;

  if (totalActive === 4) {
    playingPlayers = [...activePlayers];
  } else {
    // Formula: RestIndex = (Total - 1) - (MatchCount % Total)
    const offset = matchCount % totalActive;
    const restIndex = (totalActive - 1 - offset + totalActive) % totalActive;
    
    const restingPlayer = activePlayers[restIndex];
    restingPlayerName = restingPlayer.name;
    
    playingPlayers = activePlayers.filter((_, idx) => idx !== restIndex);
  }

  if (playingPlayers.length > 4) {
     playingPlayers = playingPlayers.slice(0, 4);
  }

  // Optimize Pairings
  return optimizePairings(playingPlayers, matchHistory, restingPlayerName);
};

/**
 * Generates a full schedule for a session.
 * Optimized for 4 and 5 players to ensure perfect rotation.
 */
export const generateSessionSchedule = (
  allPlayers: Player[],
  existingMatches: Match[],
  count: number
): Array<{ teamA: string[]; teamB: string[]; restingPlayerName?: string }> => {
  
  const activePlayers = allPlayers.filter(p => p.active);
  const totalActive = activePlayers.length;
  
  if (totalActive < 4) return [];

  const schedule: Array<{ teamA: string[]; teamB: string[]; restingPlayerName?: string }> = [];
  
  // Use indices relative to the activePlayers array
  // Fixed logic for perfect round robins
  const PRESETS: Record<number, number[][][]> = {
    4: [
      [[0,1], [2,3]], // A+B vs C+D
      [[0,2], [1,3]], // A+C vs B+D
      [[0,3], [1,2]]  // A+D vs B+C
    ],
    5: [
      // Game 1: P1(0), P2(1) vs P3(2), P4(3) (Rest P5(4))
      [[0,1], [2,3]], 
      // Game 2: P1(0), P3(2) vs P2(1), P5(4) (Rest P4(3))
      [[0,2], [1,4]], 
      // Game 3: P1(0), P4(3) vs P3(2), P5(4) (Rest P2(1)) - *Modified as per user request*
      [[0,3], [2,4]], 
      // Game 4: P2(1), P3(2) vs P4(3), P5(4) (Rest P1(0))
      [[1,2], [3,4]] 
    ]
  };

  for (let i = 0; i < count; i++) {
    const currentMatchIndex = existingMatches.length + i;
    
    // Check if we can use a preset (only if starting fresh or following strict pattern)
    // To keep it simple, if totalActive is 4 or 5, we use the preset modulo index
    if ((totalActive === 4 || totalActive === 5) && PRESETS[totalActive]) {
        const roundIndex = i % PRESETS[totalActive].length; // Use 'i' to follow sequence from start of generation
        const config = PRESETS[totalActive][roundIndex];
        
        // Map indices back to player IDs
        const p = activePlayers;
        const teamAIds = [p[config[0][0]].id, p[config[0][1]].id];
        const teamBIds = [p[config[1][0]].id, p[config[1][1]].id];
        
        // Find who is resting (not in the config)
        const playingIds = [...teamAIds, ...teamBIds];
        const resting = activePlayers.find(pl => !playingIds.includes(pl.id));

        schedule.push({
            teamA: teamAIds,
            teamB: teamBIds,
            restingPlayerName: resting?.name
        });
    } else {
        // Dynamic generation for other counts or overflow
        const next = generateNextMatch(allPlayers, existingMatches, currentMatchIndex);
        if (next) schedule.push(next);
    }
  }

  return schedule;
};


// Helper to find best combo based on history cost
const optimizePairings = (
    playingPlayers: Player[], 
    matchHistory: Match[],
    restingPlayerName?: string
) => {
    const getPartnershipCount = (p1Id: string, p2Id: string) => {
        return matchHistory.filter(m => {
          const teamA = [m.teamA.player1Id, m.teamA.player2Id];
          const teamB = [m.teamB.player1Id, m.teamB.player2Id];
          const togetherInA = teamA.includes(p1Id) && teamA.includes(p2Id);
          const togetherInB = teamB.includes(p1Id) && teamB.includes(p2Id);
          return togetherInA || togetherInB;
        }).length;
      };
    
      const p = playingPlayers;
      // Possible unique pairings for 4 people
      const combos = [
        { teamA: [p[0], p[1]], teamB: [p[2], p[3]] }, // 0+1 vs 2+3
        { teamA: [p[0], p[2]], teamB: [p[1], p[3]] }, // 0+2 vs 1+3
        { teamA: [p[0], p[3]], teamB: [p[1], p[2]] }, // 0+3 vs 1+2
      ];
    
      // Pick the combo with the least prior partnerships
      const scoredCombos = combos.map(combo => {
        const costA = getPartnershipCount(combo.teamA[0].id, combo.teamA[1].id);
        const costB = getPartnershipCount(combo.teamB[0].id, combo.teamB[1].id);
        return { ...combo, totalCost: costA + costB };
      });
    
      // Shuffle slightly to break ties randomly
      scoredCombos.sort(() => Math.random() - 0.5);
      // Sort by cost
      scoredCombos.sort((a, b) => a.totalCost - b.totalCost);
    
      const best = scoredCombos[0];
      return {
        teamA: [best.teamA[0].id, best.teamA[1].id],
        teamB: [best.teamB[0].id, best.teamB[1].id],
        restingPlayerName
      };
}