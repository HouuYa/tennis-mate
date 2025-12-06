export interface Player {
  id: string;
  name: string;
  active: boolean; // Is currently present at the court
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number; // Added for matches that end in a tie
    gamesWon: number;
    gamesLost: number;
    restCount: number; // How many times they sat out
  };
}

export interface Team {
  player1Id: string;
  player2Id: string;
}

export interface Match {
  id: string;
  timestamp: number;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  isFinished: boolean;
  courtNumber: number;
}

export interface FeedMessage {
  id: string;
  timestamp: number;
  type: 'SYSTEM' | 'MATCH_START' | 'MATCH_END' | 'ANNOUNCEMENT';
  content: string;
  author?: string; // Optional author for announcements
}

export interface AppState {
  players: Player[];
  matches: Match[];
  feed: FeedMessage[];
}

export enum Tab {
  PLAYERS = 'PLAYERS',
  MATCHES = 'MATCHES',
  STATS = 'STATS',
  FEED = 'FEED'
}