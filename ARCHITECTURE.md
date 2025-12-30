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
│   ├── DataService.ts    # Interface for Data Operations
│   ├── LocalDataService.ts # LocalStorage Implementation
│   ├── SupabaseDataService.ts # Supabase Implementation
│   └── geminiService.ts  # Google GenAI Integration
├── utils/
│   ├── matchmaking.ts    # Pairing Logic (Rotation & Fairness)
│   └── playerUtils.ts    # Shared Helper Functions (Formatting, Sorting)
```

## 2. Core Concepts

### A. Dual Mode Architecture (Data Service Pattern)
The app implements a **Repository/Adapter Pattern** via the `DataService` interface, allowing two distinct modes:

1.  **Guest Mode (Local)**:
    - **Persistence**: `localStorage`.
    - **Dependency**: None (works offline).
    - **Logic**: `LocalDataService` handles JSON serialization/deserialization.
    
2.  **Cloud Mode (Supabase)**:
    - **Persistence**: Postgres Database (Supabase).
    - **Dependency**: Internet connection.
    - **Logic**: `SupabaseDataService` maps domain objects to SQL tables.
    - **Features**: Real-time sync (potential), Global Player List, Report generation.

### B. State Management
- **Context API**: `AppContext` is the single source of truth. It holds the `mode` ('LOCAL' | 'CLOUD') and an instance of the active `DataService`.
- **Sync Strategy**:
    - **Write**: Actions (e.g., `finishMatch`) update the local React State immediately (Optimistic UI) and then call `dataService.save...()` asynchronously.
    - **Read**: On load, `dataService.loadSession()` fetches the initial state.
    - **Re-calculation**: New utility `recalculatePlayerStats` ensures stats are always computed from the match history log, guaranteeing consistency.

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

### E. Database Schema (Supabase)

*   **`players`**: Global registry of players.
    *   `id` (uuid), `name` (text), `created_at`
*   **`sessions`**: Represents a day of play or an event.
    *   `id` (uuid), `location` (text), `played_at` (timestamp), `status`
*   **`session_players`**: Junction table for players participating in a session.
    *   `session_id`, `player_id`
*   **`matches`**: Individual game records.
    *   `id`, `session_id`
    *   `team_a` (uuid[]), `team_b` (uuid[])
    *   `score_a`, `score_b`
    *   `is_finished` (bool)