# 🏗 Project Architecture

## 1. Directory Structure

```
/
├── index.html            # Entry point (Tailwind CDN, Metadata)
├── index.tsx             # React Root
├── App.tsx               # Main Layout & Tab Routing
├── types.ts              # TypeScript Interfaces (Player, Match, State)
├── constants.ts          # Global Config (Colors, Default Data)
├── context/
│   └── AppContext.tsx    # Global Store (Provides State & Actions)
├── components/
│   ├── PlayerList.tsx    # Manage Players & Drag/Drop Reorder
│   ├── MatchSchedule.tsx # Unified View: History + Current + Future Preview
│   ├── LiveFeed.tsx      # Chat-style Event Log
│   ├── StatsView.tsx     # Leaderboard & AI Analysis
│   └── BottomNav.tsx     # Navigation Bar
├── services/
│   └── geminiService.ts  # Google GenAI Integration
└── utils/
    └── matchmaking.ts    # Pairing Logic (Rotation & Fairness)
```

## 2. Core Concepts

### A. State Management (Serverless)
- This app uses no backend database.
- **Persistence**: `localStorage` ensures data survives refreshes.
- **Sharing**: State is compressed into a JSON string and passed via URL Query Parameters (`?data=...`) for serverless sharing.
- **Context API**: `AppContext` manages global state (`players`, `matches`, `feed`) and provides actions like `reorderPlayers`, `finishMatch`, etc.

### B. Matchmaking Algorithm (`utils/matchmaking.ts`)
1.  **Rotation (Rest) Logic**:
    *   Determinstic: `RestIndex = (TotalPlayers - 1) - (MatchCount % TotalPlayers)`.
    *   **User Control**: Users can drag-and-drop players in the list to change their `index`, which directly alters who rests next.
    *   **Preview**: The algorithm can calculate the rotation for match `N` without creating it, allowing the UI to show a "Future Preview".
2.  **Pairing Logic**:
    *   From the available pool, 3 combinations of teams are possible.
    *   It selects the combination where partners have played together the *least* in history to ensure variety.

### C. UI/UX Philosophy
- **Unified Schedule**: Instead of separate tabs for history and current games, a vertical timeline (`MatchSchedule.tsx`) shows:
  1.  Completed Sets (Compact results).
  2.  Active Set (Large interactive scorecard).
  3.  Next Set (Preview card showing resting player).
- **Mobile First**: Large touch targets, dark mode for outdoor visibility.

### D. AI Integration
- Google Gemini API analyzes the raw JSON match data to generate natural language insights (MVPs, best partners) in the Stats view.