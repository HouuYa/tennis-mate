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

**테이블 구조:**

*   **`players`**: 전역 플레이어 레지스트리
    *   `id` (uuid, primary key)
    *   `name` (text)
    *   `created_at` (timestamptz)

*   **`sessions`**: 경기 세션 (날짜/이벤트 단위)
    *   `id` (uuid, primary key)
    *   `location` (text, optional)
    *   `played_at` (timestamptz)
    *   `status` (text: 'active' | 'completed')

*   **`session_players`**: 세션-플레이어 연결 (Junction Table)
    *   `session_id` (uuid, references sessions)
    *   `player_id` (uuid, references players)
    *   `joined_at` (timestamptz)
    *   **Primary Key**: `(session_id, player_id)`

*   **`matches`**: 개별 경기 기록
    *   `id` (uuid, primary key)
    *   `session_id` (uuid, references sessions)
    *   `team_a` (jsonb) - `{player1Id: uuid, player2Id: uuid}`
    *   `team_b` (jsonb) - `{player1Id: uuid, player2Id: uuid}`
    *   `score_a`, `score_b` (integer)
    *   `is_finished` (boolean)
    *   `court_number` (integer)
    *   `played_at`, `end_time` (timestamptz)

**Row Level Security (RLS) Policies:**
- 모든 테이블: Public read/insert/update/delete access
- Production 환경에서는 사용자별 권한으로 변경 필요

**중요 설계 결정:**
1. `team_a`, `team_b`는 JSONB로 저장 (유연성)
2. `session_players`는 중복 방지를 위한 composite primary key 사용
3. Cascade delete로 session 삭제 시 관련 데이터 자동 삭제

---

### F. Session Management & Persistence

**Session ID 영속성:**
- `SupabaseDataService`는 `currentSessionId`를 localStorage에 저장
- 페이지 새로고침 시 자동 복원
- Key: `'tennis-mate-current-session-id'`

**Session Lifecycle:**
1. **생성**: `CloudSessionManager`에서 "Start Session" 클릭
2. **저장**: `createSession()` → localStorage에 ID 저장
3. **Default Players**: 5명의 기본 플레이어 자동 생성 (Nadal, Federer, Djokovic, Murray, Alcaraz)
4. **복원**: `switchMode('CLOUD')` → 저장된 ID로 세션 데이터 로드
5. **삭제**: "Reset All Data" → localStorage에서 ID 제거

**UX Improvement (v0.9.1):**
- Cloud Mode에서 세션 시작 시 Local Mode와 동일하게 5명의 기본 플레이어가 자동 추가됨
- 즉시 매치 생성 가능한 상태로 시작
- "From Global List" 기능으로 추가 플레이어 선택 가능

**Error Recovery:**
- Invalid session ID 발견 시 localStorage에서 자동 삭제
- Session 복원 실패 시 CloudSessionManager UI 표시
- Rollback pattern으로 state 일관성 보장

---

### G. Error Handling Pattern

**DRY Helper Function:**
```typescript
async function executeSupabaseQuery<T>(
  queryPromise: Promise<T>,
  errorMessage: string
): Promise<T['data']> {
  const result = await queryPromise;
  if (result.error) {
    console.error(errorMessage, result.error);
    throw result.error;
  }
  return result.data;
}
```

**Rollback Pattern:**
```typescript
const finishMatch = async (matchId, scoreA, scoreB) => {
  const originalMatches = matches;
  const originalPlayers = players;

  try {
    // Optimistic update
    setMatches(updatedMatches);
    setPlayers(updatedPlayers);

    // Persist to DB
    await dataService.saveMatch(match);
  } catch (error) {
    // Rollback on failure
    setMatches(originalMatches);
    setPlayers(originalPlayers);
    throw error;
  }
}
```

**Toast Notifications:**
- Success: 모든 중요 작업 완료 시
- Error: 실패 시 사용자 친화적 메시지
- Feed: 시스템 로그 (SYSTEM, ANNOUNCEMENT)

---

### H. Code Organization Principles

**파일 책임 분리:**
- `services/`: 데이터 레이어 (DB, API)
- `context/`: 상태 관리 (React Context)
- `components/`: UI 컴포넌트 (Presentation)
- `utils/`: 순수 함수 (비즈니스 로직)

**명명 규칙:**
- Components: PascalCase (e.g., `PlayerList.tsx`)
- Utilities: camelCase (e.g., `playerUtils.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `APP_STORAGE_KEY`)

**에러 문서화:**
- `ERRORS.md`: 모든 버그와 해결 방법 기록
- Commit 메시지에 명확한 문제-해결 설명