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
  // 1-factorization based presets for optimal partner rotation
  const PRESETS: Record<number, number[][][]> = {
    // 4명: 3게임, 모든 파트너 조합 1회씩
    4: [
      [[0,1], [2,3]], // 1&2 vs 3&4
      [[0,2], [1,3]], // 1&3 vs 2&4
      [[0,3], [1,2]]  // 1&4 vs 2&3
    ],
    // 5명: 5게임, 각 1명씩 휴식
    5: [
      [[0,1], [2,3]], // 1&2 vs 3&4, BYE: 5
      [[0,2], [1,4]], // 1&3 vs 2&5, BYE: 4
      [[0,4], [1,3]], // 1&5 vs 2&4, BYE: 3
      [[0,3], [4,2]], // 1&4 vs 5&3, BYE: 2
      [[1,2], [3,4]]  // 2&3 vs 4&5, BYE: 1
    ],
    // 6명: 9게임, 각 2명씩 휴식
    6: [
      [[0,1], [2,3]], // 1&2 vs 3&4, BYE: 5,6
      [[0,2], [1,4]], // 1&3 vs 2&5, BYE: 4,6
      [[0,3], [4,5]], // 1&4 vs 5&6, BYE: 2,3
      [[1,2], [3,4]], // 2&3 vs 4&5, BYE: 1,6
      [[0,5], [1,3]], // 1&6 vs 2&4, BYE: 3,5
      [[2,4], [3,5]], // 3&5 vs 4&6, BYE: 1,2
      [[0,4], [2,5]], // 1&5 vs 3&6, BYE: 2,4
      [[1,5], [2,3]], // 2&6 vs 3&4, BYE: 1,5
      [[0,1], [4,5]]  // 1&2 vs 5&6, BYE: 3,4
    ],
    // 7명: 7라운드, 8명 스케줄에서 더미(8번)와 짝인 선수 휴식
    7: [
      [[2,5], [3,4]], // R1: (3,6) vs (4,5), BYE: P1
      [[1,4], [2,3]], // R2: (2,5) vs (3,4), BYE: P6
      [[0,5], [6,4]], // R3: (1,6) vs (7,5), BYE: P4
      [[0,4], [5,3]], // R4: (1,5) vs (6,4), BYE: P2
      [[0,3], [4,2]], // R5: (1,4) vs (5,3), BYE: P7
      [[0,2], [3,1]], // R6: (1,3) vs (4,2), BYE: P5
      [[3,6], [4,5]]  // R7: (4,7) vs (5,6), BYE: P3
    ],
    // 8명: 7라운드 x 2코트 = 14게임, 1-factorization 기반
    8: [
      // Round 1
      [[0,7], [1,6]], // R1 Court1: (1,8) vs (2,7)
      [[2,5], [3,4]], // R1 Court2: (3,6) vs (4,5)
      // Round 2
      [[0,6], [7,5]], // R2 Court1: (1,7) vs (8,6)
      [[1,4], [2,3]], // R2 Court2: (2,5) vs (3,4)
      // Round 3
      [[0,5], [6,4]], // R3 Court1: (1,6) vs (7,5)
      [[7,3], [1,2]], // R3 Court2: (8,4) vs (2,3)
      // Round 4
      [[0,4], [5,3]], // R4 Court1: (1,5) vs (6,4)
      [[6,2], [7,1]], // R4 Court2: (7,3) vs (8,2)
      // Round 5
      [[0,3], [4,2]], // R5 Court1: (1,4) vs (5,3)
      [[5,1], [6,7]], // R5 Court2: (6,2) vs (7,8)
      // Round 6
      [[0,2], [3,1]], // R6 Court1: (1,3) vs (4,2)
      [[4,7], [5,6]], // R6 Court2: (5,8) vs (6,7)
      // Round 7
      [[0,1], [2,7]], // R7 Court1: (1,2) vs (3,8)
      [[3,6], [4,5]]  // R7 Court2: (4,7) vs (5,6)
    ]
  };

  for (let i = 0; i < count; i++) {
    const currentMatchIndex = existingMatches.length + i;
    
    // Check if we can use a preset (only if starting fresh or following strict pattern)
    // To keep it simple, if totalActive is 4, 5, or 7, we use the preset modulo index
    if (PRESETS[totalActive]) {
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