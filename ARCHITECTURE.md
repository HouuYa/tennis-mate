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
│   ├── StatsView.tsx     # Leaderboard & AI Analysis (+ Head-to-Head)
│   ├── ModeSelection.tsx # Storage Mode Selection (Guest/Sheets/Cloud)
│   ├── GoogleSheetsSessionManager.tsx # Google Sheets Setup & Connection
│   ├── GoogleSheetsGuide.tsx # 6-Step Setup Guide Modal
│   └── BottomNav.tsx     # Navigation Bar
├── services/
│   ├── DataService.ts    # Interface for Data Operations
│   ├── LocalDataService.ts # LocalStorage Implementation
│   ├── GoogleSheetsDataService.ts # Google Apps Script Implementation
│   ├── SupabaseDataService.ts # Supabase Implementation
│   └── geminiService.ts  # Google GenAI Integration
├── utils/
│   ├── matchmaking.ts    # Pairing Logic (Rotation & Fairness)
│   └── playerUtils.ts    # Shared Helper Functions (Formatting, Sorting)
```

## 2. Core Concepts

### A. Multi-Backend Architecture (Data Service Pattern)
The app implements a **Repository/Adapter Pattern** via the `DataService` interface, allowing three distinct storage modes:

1.  **Guest Mode (Local)**:
    - **Persistence**: `localStorage`.
    - **Dependency**: None (works offline).
    - **Logic**: `LocalDataService` handles JSON serialization/deserialization.
    - **Use Case**: Quick start, single device, no account needed.

2.  **Google Sheets Mode (BYODB - Bring Your Own Database)**:
    - **Persistence**: User's Google Sheets.
    - **Dependency**: Internet connection, Google Apps Script Web App.
    - **Logic**: `GoogleSheetsDataService` sends HTTP requests to Google Apps Script endpoint.
    - **Features**: Complete data ownership, free unlimited storage, Excel/CSV export, automatic sync of recent 100 matches.
    - **Backend**: Google Apps Script (doGet/doPost handlers) manages sheet operations.
    - **Data Format**: Player names stored directly (no UUIDs), human-readable in spreadsheet.

3.  **Cloud Mode (Supabase)**:
    - **Persistence**: Postgres Database (Supabase).
    - **Dependency**: Internet connection.
    - **Logic**: `SupabaseDataService` maps domain objects to SQL tables.
    - **Features**: Real-time sync (potential), Global Player List, Session management, Report generation.

### B. State Management
- **Context API**: `AppContext` is the single source of truth. It holds the `mode` ('LOCAL' | 'GOOGLE_SHEETS' | 'CLOUD') and an instance of the active `DataService`.
- **Sync Strategy**:
    - **Write**: Actions (e.g., `finishMatch`) update the local React State immediately (Optimistic UI) and then call `dataService.save...()` asynchronously.
    - **Read**: On load, `dataService.loadSession()` fetches the initial state.
    - **Re-calculation**: New utility `recalculatePlayerStats` ensures stats are always computed from the match history log, guaranteeing consistency.
- **Mode-Specific Handling**:
    - **LOCAL**: Direct localStorage read/write
    - **GOOGLE_SHEETS**: HTTP POST for batch saves, GET for loading.
    - **Note**: Batch saving (implemented v1.0.1) sends all finished matches in parallel when the session ends, improving performance and avoiding race conditions.
    - **CLOUD**: Supabase SQL queries with session management

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

### E-2. Google Sheets Data Structure

**스프레드시트 구조:**

*   **Sheet Name**: `Matches` (자동 생성)
*   **Columns** (Apps Script가 자동으로 헤더 생성):

| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | Date | 경기 기록 시각 (Apps Script가 자동 삽입) |
| `date` | String | 경기 날짜 (ISO format: YYYY-MM-DD HH:mm) |
| `duration` | Number | 경기 시간 (분 단위) |
| `winner1` | String | 승리팀 플레이어 1 이름 |
| `winner2` | String | 승리팀 플레이어 2 이름 |
| `loser1` | String | 패배팀 플레이어 1 이름 |
| `loser2` | String | 패배팀 플레이어 2 이름 |
| `score` | String | 점수 (형식: "6-4") |
| `winner_score` | Number | 승자 점수 (숫자) |
| `loser_score` | Number | 패자 점수 (숫자) |
| `location` | String | 경기 장소 |

**데이터 흐름:**

```
Tennis Mate (Client)
    ↓ POST request (JSON payload)
Google Apps Script Web App
    ↓ sheet.appendRow([...])
Google Sheets ("Matches" sheet)
    ↓ GET request
Google Apps Script (doGet)
    ↓ JSON response (최근 100경기)
Tennis Mate (Client)
```

**Apps Script 코드 구조:**

```javascript
function getOrCreateMatchesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Matches');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('Matches');
    sheet.appendRow(['timestamp', 'date', 'duration', 'winner1', 'winner2', 'loser1', 'loser2', 'score', 'winner_score', 'loser_score', 'location']);
  }
  return sheet;
}

function doGet(e) {
  const sheet = getOrCreateMatchesSheet();
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  const recentRows = rows.slice(-100).reverse();

  return ContentService.createTextOutput(JSON.stringify(recentRows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = getOrCreateMatchesSheet();
  const params = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    params.date,
    params.duration,
    params.winner1,
    params.winner2,
    params.loser1,
    params.loser2,
    params.score,
    params.winner_score,
    params.loser_score,
    params.location
  ]);

  return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**중요 설계 결정:**
1. **Player Names vs IDs**: Google Sheets는 사람이 읽을 수 있도록 플레이어 이름을 직접 저장 (UUID 대신)
2. **No CORS**: Apps Script Web App은 자체적으로 CORS를 허용하므로 별도 설정 불필요
3. **Stateless Backend**: Apps Script는 세션 개념 없이 각 요청을 독립적으로 처리
4. **Recent 100 Limit**: 대량 데이터 로드 시 성능을 위해 최근 100경기만 로드
5. **Score Format**: 항상 "높은 점수-낮은 점수" 형식으로 정규화 (예: "6-4", "7-5")

**Web App 배포:**
- **Execute as**: Me (스크립트 소유자 권한으로 실행)
- **Who has access**: Anyone (URL만 알면 누구나 접근 가능)
- **URL Format**: `https://script.google.com/macros/s/AKfy...xyz/exec`

**보안 고려사항:**
- Web App URL은 비공개 유지 권장 (공개 시 누구나 데이터 추가 가능)
- Production 환경에서는 API Key 인증 추가 고려
- Row Level Security는 Google Apps Script로 직접 구현 필요

---

### F. Session Management & Persistence

**Mode-Specific Session Handling:**

**1. Cloud Mode (Supabase)**
- **Session ID 영속성**: `currentSessionId`를 localStorage에 저장
- **Key**: `'tennis-mate-current-session-id'`
- **Session Lifecycle:**
  1. **생성**: `CloudSessionManager`에서 "Start Session" 클릭
  2. **저장**: `createSession()` → localStorage에 ID 저장
  3. **Default Players**: 5명의 기본 플레이어 자동 생성 (Nadal, Federer, Djokovic, Murray, Alcaraz)
  4. **복원**: `switchMode('CLOUD')` → 저장된 ID로 세션 데이터 로드
  5. **삭제**: "Reset All Data" → localStorage에서 ID 제거

**2. Google Sheets Mode**
- **No Session Concept**: 세션 ID 없이 작동 (Stateless)
- **Web App URL 저장**: localStorage에 Google Apps Script Web App URL 저장
- **Key**: `'tennis-mate-google-sheets-url'`
- **Setup Flow:**
  1. **URL 입력**: `GoogleSheetsSessionManager`에서 Web App URL 입력
  2. **연결 테스트**: URL에 GET 요청하여 유효성 검증
  3. **URL 저장**: 성공 시 localStorage에 저장
  4. **자동 연결**: 다음 방문 시 저장된 URL로 자동 연결
- **데이터 로드**: 매번 최근 100경기를 Google Sheets에서 로드

**3. Guest Mode (Local)**
- **완전 로컬**: 모든 데이터를 localStorage에 저장
- **Key**: `'tennis-mate-state'`
- **No Network**: 인터넷 연결 불필요

**UX Improvement (v0.9.1 - v1.0.0):**
- **Session Manager Modal**: Cloud/Sheets Mode 선택 즉시 전체 화면 모달로 Manager 표시
- **자동 네비게이션**: 세션 생성/로드/연결 후 자동으로 Player 탭으로 이동
- **Default Players**: Cloud 세션 시작 시 5명의 기본 플레이어 자동 생성 (병렬 처리)
- **즉시 사용 가능**: 모든 모드에서 바로 매치 생성 가능
- **6-Step Guide**: Google Sheets Mode는 상세한 설정 가이드 제공

**Workflow by Mode:**

```
┌─────────────────────────────────────────────────────────┐
│ GUEST MODE (즉시 시작)                                   │
└─────────────────────────────────────────────────────────┘
1. GUEST MODE 클릭
   ↓
2. 즉시 Player 탭으로 이동 (localStorage 사용)

┌─────────────────────────────────────────────────────────┐
│ GOOGLE SHEETS MODE (최초 1회 설정)                       │
└─────────────────────────────────────────────────────────┘
1. GOOGLE SHEETS MODE 클릭
   ↓
2. GoogleSheetsSessionManager 모달 표시
   ├─ 설정 가이드 보기 → GoogleSheetsGuide 6단계 안내
   │  1. Google Sheet 생성
   │  2. Apps Script 에디터 열기
   │  3. 제공된 코드 복사/붙여넣기
   │  4. Web App으로 배포
   │  5. Web App URL 복사
   │  6. Tennis Mate에 URL 입력 & 테스트
   └─ Web App URL 입력 → 연결 테스트 → localStorage 저장
   ↓
3. Player 탭에서 선수 관리
   ↓
4. "End Session" 클릭 시 `saveAllToSheets` 호출 (모든 경기 일괄 저장)

┌─────────────────────────────────────────────────────────┐
│ CLOUD MODE (세션 기반)                                   │
└─────────────────────────────────────────────────────────┘
1. CLOUD MODE 클릭
   ↓
2. CloudSessionManager 모달 자동 표시
   ├─ Start New → 세션 생성 → 5명 자동 추가 → Player 탭
   └─ Load Existing → 기존 세션 로드 → 기존 상태 복원
   ↓
3. Player 탭에서 선수 관리
   ↓
4. Match 탭에서 Schedule 생성
```

**Error Recovery:**
- **Cloud Mode**: Invalid session ID 발견 시 localStorage에서 자동 삭제, Session 복원 실패 시 CloudSessionManager UI 표시
- **Google Sheets Mode**: 연결 실패 시 사용자 친화적 에러 메시지, 잘못된 URL은 저장하지 않음
- **All Modes**: Rollback pattern으로 state 일관성 보장

---

### G. Error Handling Pattern

**Type-Safe Error Handling (v1.0.0 개선):**
```typescript
// ❌ 이전 방식 (v0.9.x)
try {
  await someOperation();
} catch (e: any) {
  console.error(e.message);
}

// ✅ 개선된 방식 (v1.0.0)
try {
  await someOperation();
} catch (e: unknown) {
  if (e instanceof Error) {
    console.error('Operation failed:', e.message);
  } else {
    console.error('Unknown error occurred');
  }
}
```

**Type Guards for Service Casting (v1.0.0):**
```typescript
// ❌ 이전 방식 (안전하지 않음)
const service = dataService as GoogleSheetsDataService;
service.setWebAppUrl(url);

// ✅ 개선된 방식 (Type Guard 사용)
if (mode !== 'GOOGLE_SHEETS' || dataService.type !== 'GOOGLE_SHEETS') {
  console.error('Not in Google Sheets mode');
  return;
}
const service = dataService as GoogleSheetsDataService;
service.setWebAppUrl(url);
```

**DRY Helper Function (Supabase):**
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

### H. v1.0.0 MVP New Features Summary

**1. Google Sheets Mode (BYODB - Bring Your Own Database)**
- **완전한 데이터 소유권**: 사용자의 Google Sheets에 모든 데이터 저장
- **무료 무제한**: Google의 무료 저장 공간 활용 (15GB)
- **손쉬운 내보내기**: 언제든지 Excel/CSV로 다운로드 가능
- **6단계 가이드**: 비개발자도 쉽게 따라할 수 있는 상세 설정 가이드
- **자동 동기화**: 최근 100경기 자동 로드
- **연결 테스트**: URL 유효성 검증 기능

**2. Head-to-Head Rival Analysis (StatsView)**
- **직접 대결 전적**: 두 선수 간 승/무/패 통계
- **승률 시각화**: 프로그레스 바로 우세 관계 표시
- **동적 메시지**: 라이벌 관계에 따른 맞춤형 피드백
  - 우세 (60%+): "You're dominating this matchup!"
  - 열세 (40%-): "They're your rival - keep improving!"
  - 동등 (40-60%): "This is a competitive rivalry!"

**3. Type Safety & Code Quality Improvements (Gemini Review)**
- **Type-Safe Error Handling**: `catch (e: any)` → `catch (e: unknown)` + type guards
- **Service Casting Safety**: Type guard checks before casting
- **Score Parsing Fix**: `Math.max/Math.min` for consistent score ordering
- **Apps Script Modernization**: `var` → `const/let`, DRY helper functions
- **URL Input Bug Fix**: Proper state management for saved URLs

**4. Complete Documentation Suite**
- [README.md](file:///c:/Users/user/Desktop/Bae/coding/tennis-mate/README.md): 전체 프로젝트 개요 및 Google Sheets 가이드
- [HISTORY.md](file:///c:/Users/user/Desktop/Bae/coding/tennis-mate/HISTORY.md): 버전별 릴리스 노트 및 전체 변경 이력 (한글)
- [TODO.md](file:///c:/Users/user/Desktop/Bae/coding/tennis-mate/TODO.md): 로드맵 및 우선순위 (v1.1.0+)
- [ARCHITECTURE.md](file:///c:/Users/user/Desktop/Bae/coding/tennis-mate/ARCHITECTURE.md): Multi-Backend 아키텍처 설명 (본 문서)

**5. Version Management**
- **Semantic Versioning**: MAJOR.MINOR.PATCH 규칙 적용
- **Git Tags**: v1.0.0 태그 생성
- **Release Branch**: `claude/add-google-sheets-mode-tjdkV`

---

### I. Code Organization Principles

**파일 책임 분리:**
- `services/`: 데이터 레이어 (DB, API)
- `context/`: 상태 관리 (React Context)
- `components/`: UI 컴포넌트 (Presentation)
- `utils/`: 순수 함수 (비즈니스 로직)

**명명 규칙:**
- Components: PascalCase (e.g., `PlayerList.tsx`)
- Utilities: camelCase (e.g., `playerUtils.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `APP_STORAGE_KEY`)

**### 에러 문서화:**
- [HISTORY.md](file:///c:/Users/user/Desktop/Bae/coding/tennis-mate/HISTORY.md): 모든 버그와 해결 방법 기록이 통합되었습니다.
- Commit 메시지에 명확한 문제-해결 설명