# 🐛 Error History & Solutions

이 문서는 프로젝트에서 발견된 모든 버그와 해결 방법을 기록합니다.

---

## 📋 목차
1. [P0 Critical Bugs](#p0-critical-bugs)
2. [Data Integrity Issues](#data-integrity-issues)
3. [State Management Issues](#state-management-issues)
4. [Database Schema Issues](#database-schema-issues)
5. [Code Quality Issues](#code-quality-issues)

---

## P0 Critical Bugs

### 1. Gemini API Key Environment Variable 버그
**발견일:** 2024-12-31
**심각도:** 🔥 P0 Critical

**증상:**
- Gemini AI 분석 기능이 완전히 작동하지 않음
- "API Key is missing" 메시지 표시

**원인:**
```typescript
// ❌ BEFORE - Vite 환경에서 작동 안함
if (!process.env.API_KEY) {
  return "API Key is missing...";
}
```

**해결:**
```typescript
// ✅ AFTER - Vite 환경 변수 사용
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  return "API Key is missing...";
}
```

**파일:** `services/geminiService.ts`
**Commit:** `26a8109`

---

### 2. getAllPlayers 함수 미export
**발견일:** 2024-12-31
**심각도:** 🔥 P0 Critical

**증상:**
- Runtime error: `getAllPlayers is not a function`

**원인:**
```typescript
// AppContextType에는 정의되어 있지만 export 안됨
interface AppContextType {
  getAllPlayers: () => Promise<Player[]>;  // 정의만 있음
}

const value = {
  players,
  matches,
  // getAllPlayers 누락!
}
```

**해결:**
```typescript
const value = {
  players,
  matches,
  getAllPlayers,  // ✅ export 추가
}
```

**파일:** `context/AppContext.tsx`
**Commit:** `26a8109`

---

### 3. finishMatch 상태 일관성 문제
**발견일:** 2024-12-31
**심각도:** 🔥 P0 Critical

**증상:**
- Supabase 저장 실패 시 로컬 상태는 업데이트되지만 DB는 업데이트 안됨
- 페이지 새로고침 시 데이터 불일치

**원인:**
```typescript
// ❌ BEFORE - Rollback 없음
const finishMatch = async (matchId, scoreA, scoreB) => {
  setMatches(updatedMatches);  // 상태 업데이트
  setPlayers(updatedPlayers);

  if (mode === 'CLOUD') {
    await dataService.saveMatch(match);  // 실패해도 rollback 없음!
  }
}
```

**해결:**
```typescript
// ✅ AFTER - Rollback 추가
const finishMatch = async (matchId, scoreA, scoreB) => {
  const originalMatches = matches;
  const originalPlayers = players;

  try {
    setMatches(updatedMatches);
    setPlayers(updatedPlayers);

    if (mode === 'CLOUD') {
      await dataService.saveMatch(match);
    }
  } catch (error) {
    // Rollback!
    setMatches(originalMatches);
    setPlayers(originalPlayers);
    throw error;
  }
}
```

**파일:** `context/AppContext.tsx`
**Commit:** `2ce26d8`

---

## Data Integrity Issues

### 4. Share2 아이콘 Import 누락
**발견일:** 2024-12-31
**심각도:** 🔥 Critical

**증상:**
- "Copy JSON" 버튼 클릭 시 앱 크래시
- `Share2 is not defined` 런타임 에러

**원인:**
```typescript
// ❌ BEFORE
import { BarChart3, Sparkles, Link as LinkIcon } from 'lucide-react';

// Share2 사용하는데 import 안됨
<button><Share2 size={16} /> Copy JSON</button>
```

**해결:**
```typescript
// ✅ AFTER
import { BarChart3, Sparkles, Share2, Link as LinkIcon } from 'lucide-react';
```

**파일:** `components/StatsView.tsx`
**Commit:** `2ce26d8`

---

### 5. Global List에서 Player 추가 실패
**발견일:** 2024-12-31
**심각도:** 🔥 High

**증상:**
- "Failed to add player" 에러
- DB에서 가져온 player는 `{id, name}` 만 있음
- 앱은 `{id, name, active, stats}` 필요

**원인:**
```typescript
// ❌ BEFORE - DB player를 그대로 사용
const addPlayer = async (name: string, fromDB?: Player) => {
  const newPlayer = fromDB || { id: uuidv4(), name, ... };
  // fromDB는 active, stats 없음!
}
```

**해결:**
```typescript
// ✅ AFTER - 누락된 필드 채우기
const addPlayer = async (name: string, fromDB?: Player) => {
  const newPlayer: Player = fromDB ? {
    ...fromDB,
    active: fromDB.active !== undefined ? fromDB.active : true,
    stats: fromDB.stats || { matchesPlayed: 0, ... }
  } : { id: uuidv4(), name, ... };
}
```

**파일:** `context/AppContext.tsx`
**Commit:** `9e3d5df`

---

### 6. MatchSchedule handleFinish 에러 처리 없음
**발견일:** 2024-12-31
**심각도:** 🔥 High

**증상:**
- "Finish Set" 버튼 클릭 시 아무 반응 없음
- 실패해도 사용자에게 피드백 없음

**원인:**
```typescript
// ❌ BEFORE
const handleFinish = () => {
  finishMatch(activeMatch.id, scoreA, scoreB);
  // 에러 처리 없음!
}
```

**해결:**
```typescript
// ✅ AFTER
const handleFinish = async () => {
  try {
    await finishMatch(activeMatch.id, scoreA, scoreB);
    showToast('Match finished successfully!', 'success');
  } catch (error) {
    showToast('Failed to save match result.', 'error');
  }
}
```

**파일:** `components/MatchSchedule.tsx`
**Commit:** `14f1f0e`

---

## Database Schema Issues

### 7. Team 데이터 타입 불일치 (Array vs JSONB)
**발견일:** 2024-12-31
**심각도:** 🔥🔥 Critical

**증상:**
- "Failed to save match result" 에러
- 모든 match 저장 실패

**원인:**
```typescript
// Code: UUID array 전송
team_a: [uuid1, uuid2]
team_b: [uuid1, uuid2]

// DB Schema: JSONB 기대
team_a jsonb NOT NULL  // {player1Id: uuid, player2Id: uuid}
```

**해결:**
```typescript
// ✅ Code 수정
team_a: { player1Id: match.teamA.player1Id, player2Id: match.teamA.player2Id }
team_b: { player1Id: match.teamB.player1Id, player2Id: match.teamB.player2Id }
```

**파일:** `services/SupabaseDataService.ts`, `supabase_schema.sql`
**Commit:** `cc9f93e`, `8bfc60b`

---

### 8. session_players UPDATE Policy 누락
**발견일:** 2024-12-31
**심각도:** 🔥 High

**증상:**
- Player 재추가 시 조용히 실패
- upsert operation 실패

**원인:**
```sql
-- ❌ BEFORE - UPDATE policy 없음
CREATE POLICY "Allow public read access" ON session_players FOR SELECT;
CREATE POLICY "Allow public insert access" ON session_players FOR INSERT;
-- UPDATE policy 없음!
```

**해결:**
```sql
-- ✅ AFTER
CREATE POLICY "Allow public update access" ON session_players FOR UPDATE USING (true);
```

**파일:** `supabase_schema.sql`
**Commit:** `77ef32d`
**적용:** Supabase SQL Editor에서 수동 실행 필요

---

## State Management Issues

### 9. "No active session" 에러 - Session ID 영속성 문제
**발견일:** 2024-12-31
**심각도:** 🔥🔥🔥 Critical

**증상:**
- Player 추가 시: "Failed to add player: Error: No active session"
- Match 저장 시: "Failed to save match result: Error: No active session"
- 페이지 새로고침 시 session ID 손실

**원인:**
```typescript
// ❌ BEFORE - 새 인스턴스마다 currentSessionId = null
export class SupabaseDataService {
  private currentSessionId: string | null = null;

  constructor() {
    // localStorage 복원 없음!
  }
}

// AppContext에서 매번 새 인스턴스 생성
setDataService(new SupabaseDataService());  // currentSessionId 손실!
```

**해결:**
```typescript
// ✅ AFTER - localStorage에서 복원
constructor() {
  try {
    const savedSessionId = localStorage.getItem('tennis-mate-current-session-id');
    if (savedSessionId) {
      this.currentSessionId = savedSessionId;
    }
  } catch (error) {
    console.warn('Failed to restore session ID:', error);
  }
}

private setCurrentSessionId(sessionId: string) {
  this.currentSessionId = sessionId;
  localStorage.setItem('tennis-mate-current-session-id', sessionId);
}
```

**파일:** `services/SupabaseDataService.ts`
**Commit:** `3a4f6a7`, `02bb4d2`

---

### 10. Cloud Mode 전환 시 Session 복원 안됨
**발견일:** 2024-12-31
**심각도:** 🔥🔥 Critical

**증상:**
- Cloud Mode 전환 시 default players만 생성되고 session 없음
- 모든 DB 작업 실패

**원인:**
```typescript
// ❌ BEFORE
switchMode('CLOUD') {
  setDataService(new SupabaseDataService());
  initializeDefaults();  // Session 없이 players만 생성!
}
```

**해결:**
```typescript
// ✅ AFTER
switchMode('CLOUD') {
  const cloudService = new SupabaseDataService();
  const savedSessionId = cloudService.getCurrentSessionId();

  if (savedSessionId) {
    // 자동 복원
    cloudService.loadSession(savedSessionId);
  } else {
    // SessionManager UI 표시
    setPlayers([]);
    setMatches([]);
  }
}
```

**파일:** `context/AppContext.tsx`
**Commit:** `a7a1203`

---

### 11. resetData가 Cloud Mode에서 Session 없이 Players 생성
**발견일:** 2024-12-31
**심각도:** 🔥🔥 Critical

**증상:**
- "Reset All Data" 클릭 후 default players 표시
- Session 없어서 모든 작업 실패

**원인:**
```typescript
// ❌ BEFORE
const resetData = () => {
  setMatches([]);
  setFeed([]);
  initializeDefaults();  // Cloud Mode에서도 players 생성!
}
```

**해결:**
```typescript
// ✅ AFTER
const resetData = () => {
  setMatches([]);
  setFeed([]);

  if (mode === 'CLOUD') {
    setPlayers([]);
    localStorage.removeItem('tennis-mate-current-session-id');
  } else {
    initializeDefaults();
  }
}
```

**파일:** `context/AppContext.tsx`
**Commit:** `d811077`

---

## Code Quality Issues

### 12. Async/Await 누락 - Global List Player 추가
**발견일:** 2024-12-31
**심각도:** 🔥 High

**증상:**
- Success toast가 실패해도 표시됨
- 에러 toast와 success toast 동시에 표시

**원인:**
```typescript
// ❌ BEFORE
onClick={() => {
  addPlayer(dp.name, dp);  // async 함수인데 await 안함!
  showToast(`${dp.name} added`, "success");  // 즉시 실행
}}
```

**해결:**
```typescript
// ✅ AFTER
onClick={async () => {
  try {
    await addPlayer(dp.name, dp);
    showToast(`${dp.name} added`, "success");
  } catch (error) {
    // AppContext에서 이미 에러 처리함
  }
}}
```

**파일:** `components/PlayerList.tsx`
**Commit:** `7e6f9ae`

---

### 13. 반복되는 에러 처리 코드 (DRY 위반)
**발견일:** 2024-12-31
**심각도:** ⭐ Medium

**증상:**
- 모든 Supabase 메서드마다 동일한 에러 처리 반복
- 코드 중복, 유지보수 어려움

**원인:**
```typescript
// ❌ BEFORE - 8개 메서드에서 반복
const { data, error } = await supabase.from('table').select();
if (error) {
  console.error('Error:', error);
  throw error;
}
```

**해결:**
```typescript
// ✅ AFTER - Helper 함수
async function executeSupabaseQuery<T>(queryPromise, errorMessage) {
  const result = await queryPromise;
  if (result.error) {
    console.error(errorMessage, result.error);
    throw result.error;
  }
  return result.data;
}

// 사용
const data = await executeSupabaseQuery(
  supabase.from('table').select(),
  'Failed to fetch:'
);
```

**파일:** `services/SupabaseDataService.ts`
**Commit:** `7e6f9ae`, `6191883`

---

### 14. Dead Code - Session Restoration
**발견일:** 2024-12-31
**심각도:** ⭐ Low (Code Quality)

**증상:**
- 도달 불가능한 코드 존재
- `loadSession`은 실패 시 throw하므로 falsy 값 리턴 안함

**원인:**
```typescript
// ❌ BEFORE
loadSession(sessionId).then(state => {
  if (state) {  // 항상 true!
    setPlayers(state.players);
  } else {  // 도달 불가능!
    addLog('Failed...');
  }
})
```

**해결:**
```typescript
// ✅ AFTER
loadSession(sessionId).then(state => {
  setPlayers(state.players);  // state는 항상 존재
  setMatches(state.matches);
})
```

**파일:** `context/AppContext.tsx`
**Commit:** `81ac862`

---

### 15. Invalid Session ID 정리 안됨
**발견일:** 2024-12-31
**심각도:** 🔥 High

**증상:**
- Session 복원 실패 시 invalid ID가 localStorage에 남음
- 매 페이지 로드마다 실패 반복

**원인:**
```typescript
// ❌ BEFORE
.catch(err => {
  console.error('Failed to restore session:', err);
  // Invalid ID가 localStorage에 남음!
})
```

**해결:**
```typescript
// ✅ AFTER
.catch(err => {
  console.error('Failed to restore session:', err);
  // Invalid ID 삭제
  try {
    localStorage.removeItem('tennis-mate-current-session-id');
  } catch (e) {
    console.warn('Failed to clear invalid session ID:', e);
  }
  resetSessionState();
})
```

**파일:** `context/AppContext.tsx`
**Commit:** `81ac862`

---

## 요약

### 수정된 버그 통계
- 🔥🔥🔥 Critical: 4개
- 🔥🔥 High: 5개
- 🔥 Medium: 4개
- ⭐ Low: 2개

**총 15개 버그 수정**

### 주요 개선 사항
1. ✅ Session 영속성 구현 (localStorage)
2. ✅ Error handling 일관성
3. ✅ DRY 원칙 적용
4. ✅ Database schema 수정
5. ✅ State rollback 패턴 구현
6. ✅ Dead code 제거
7. ✅ Async/await 일관성

### Commit 히스토리
1. `26a8109` - P0 fixes & features
2. `2ce26d8` - Share2 icon & rollback
3. `9e3d5df` - Global list player bug
4. `14f1f0e` - MatchSchedule error handling
5. `cc9f93e` - JSONB schema fix
6. `8bfc60b` - Schema docs update
7. `249c2f0` - Error handling & upsert
8. `7e6f9ae` - DRY refactor & async/await
9. `6191883` - executeSupabaseQuery enhancement
10. `3a4f6a7` - Session ID persistence
11. `02bb4d2` - localStorage try-catch
12. `a7a1203` - Auto session restoration
13. `77ef32d` - UPDATE policy fix
14. `81ac862` - Gemini review fixes
15. `d811077` - resetData cloud mode fix
