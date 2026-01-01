export const APP_STORAGE_KEY = 'tennis-mate-data-v1';

export const AI_INSTRUCTION = `
You are a professional tennis coach and statistician.
Your goal is to analyze match data for a casual tennis club.
Focus on identifying:
1. MVPs based on win rate and game difference.
2. Interesting pairings (who plays well together).
3. Suggestions for improvement or balanced teams.
Keep the tone encouraging, fun, and concise (under 3 sentences per section).
`;

// API Endpoints
export const API_ENDPOINTS = {
  // OpenStreetMap Nominatim (current)
  NOMINATIM_REVERSE: 'https://nominatim.openstreetmap.org/reverse',

  // TODO: Add when implementing Korean address support
  // KAKAO_GEOCODE: 'https://dapi.kakao.com/v2/local/geo/coord2address.json',
  // NAVER_GEOCODE: 'https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc',
} as const;

// Initial dummy data for first-time users
export const INITIAL_PLAYERS = [
  "Nadal", "Federer", "Djokovic", "Murray", "Alcaraz"
];