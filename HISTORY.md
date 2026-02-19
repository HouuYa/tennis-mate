# Tennis Mate - Project History & Changelog

This document serves as the master record for releases, daily summaries, and bug fixes for the Tennis Mate project.

---

## 📅 Daily Summaries (Recent)

### 2026-02-19 (v2.0.0 — Code Cleanup & Codebase Housekeeping)
- **Version bump**: `package.json` version `1.4.0` → `2.0.0`
- **Dependency removal**: `recharts` 패키지 제거 (코드베이스에서 미사용 확인)
- **Type cleanup** (`types.ts`): `Match` 인터페이스의 중복 `courtNumber` 필드 제거
- **Unused imports** 제거:
  - `AnalyticsView.tsx`: `User`, `TrendingUp` (lucide-react)
  - `CurrentMatch.tsx`: `RefreshCw` (lucide-react)
  - `CloudSessionManager.tsx`: `RefreshCw` (lucide-react)
- **`console.log` 정리** (에러 로그만 유지):
  - `TennisRulesChatModal.tsx`: 디버그 로그 제거
  - `GoogleSheetsDataService.ts`: 연결 로그 제거
  - `SupabaseDataService.ts`: 세션 ID 라이프사이클 로그 제거
  - `AdminPage.tsx`: 작업 디버그 로그 제거 (7개)
- **MD 파일 전체 정비**: README, HISTORY, TODO, ARCHITECTURE, DEPLOYMENT v2.0.0 기준으로 업데이트
  - `TODO.md`: Kakao/Naver Map API 구현 세부 항목 제거, 로드맵 버전 번호 재조정

### 2026-02-19 (Dynamic Gemini Model Selection & API Key UX)
- **Dynamic Model Fetching** (`services/geminiService.ts`):
  - `fetchAvailableModels(apiKey)` 신규 — Gemini REST API (`/v1beta/models`)에서 실시간 모델 목록 조회
  - preview·gemma·비 generateContent 모델 자동 필터링
  - `KNOWN_DEPRECATION_DATES` 맵으로 종료 임박 모델 감지 (90일 이내)
  - `FALLBACK_GEMINI_MODELS`로 폴백 (키 없거나 fetch 실패 시)
  - `GeminiModelId` 타입: 교차 타입 `typeof FALLBACK_GEMINI_MODELS[number]['id'] | (string & {})` (자동완성 유지 + 동적 ID 허용)
  - `encodeURIComponent(apiKey)` URL 안전 처리
- **Two-Step API Key Modal** (`components/GeminiApiKeySettings.tsx`):
  - Step 1 (키 입력): API 키 입력 → "검증 후 다음 →" 버튼 → 유효성 검사
  - Step 2 (모델 선택): 검증 완료 배지 + 동적 모델 목록 + "저장 후 시작" 버튼
  - "← 키 변경" 버튼으로 Step 1로 복귀 가능
  - 기존 키 있으면 Step 2에서 시작, `forceKeyStep={true}` prop으로 Step 1 강제 시작
- **API 키 변경 기능** (`components/TennisRulesChatModal.tsx`):
  - 채팅 헤더의 모델 드롭다운 옆 "키 변경" 버튼 추가
  - 클릭 시: 기존 키 초기화 + Step 1부터 시작하는 설정 모달 팝업
  - 새 키 저장 후 모델 목록 자동 갱신
- **ModelSwitcher 개선** (`components/ModelSwitcher.tsx`):
  - `models?` prop 추가 — 동적 목록 사용, 없으면 폴백 목록
  - Deprecated 모델: 🟡 "Deprecated" 배지 + 비활성화
  - 종료 임박 모델 (90일 이내): 🟠 "Retiring MM/YYYY" 배지
  - 모듈 레벨 날짜 상수 제거 → `isNearEOL()` 내부에서 동적 계산
- **Code Review 반영** (Gemini Code Assist):
  - `useTennisChat`: `DEFAULT_GEMINI_MODEL` import + 양쪽 fetch 호출에 모델 유효성 검사
  - `useTennisChat`: `React.Dispatch` → 직접 `Dispatch<SetStateAction<>>` import

### 2026-02-16 (Cloud Mode Fixes & Admin Page)
- **Admin Page 신규 구현** (`AdminPage.tsx`, 1,377 lines):
  - 환경변수 기반 인증 (`VITE_ADMIN_ID`, `VITE_ADMIN_PASSWORD`)
  - sessionStorage 기반 세션 유지 (탭 닫으면 자동 로그아웃)
  - Players / Sessions / Quick Entry 3개 섹션
  - **Pending Operations 패턴**: 변경사항을 미리보기 후 일괄 커밋 (Undo/Commit)
  - Player 이름 변경, 삭제, 중복 병합 (Merge) 기능
  - Session 위치 편집, 삭제 기능
  - Match 점수 편집, 삭제 기능 (cascade 업데이트)
  - Quick Entry: 기존 세션에 경기 추가 또는 새 세션 생성
- **RLS Diagnostic 도구**: Supabase RLS 정책 자동 진단
  - SELECT / INSERT / UPDATE / DELETE 각각 테스트
  - 테스트용 레코드 자동 생성 후 삭제
  - 실패 시 구체적 에러 메시지 표시
- **Supabase RLS 정책 수정**:
  - DELETE 정책 누락 문제 발견 → `USING (true)` 정책 추가 필요
  - `.select()` 체이닝으로 RLS 차단 감지 (0 rows = RLS blocked)
- **Admin 인증 구조 정리**:
  - Supabase Auth와 무관한 프론트엔드 전용 인증
  - 환경변수 미설정 시 명확한 에러 메시지
  - 기본 계정 하드코딩 제거 → Netlify 환경변수 필수
- **AdminETLPage**: 테니스 규칙 PDF ETL 관리 인터페이스 추가
- **Player Delete Restore**: 삭제된 플레이어 복원 리스트 추가
- **Score Reset Bug Fix**: 점수 리셋 버그 수정

### 2026-02-11 (Mobile Readability & Security Improvements)
- **HTML Formatting**: Switched from plain text to HTML tags for better mobile indentation
  - Backend prompts now generate `<p>`, `<ul>`, `<li>`, `<hr>`, `<h3>`, `<sup>`, `<strong>` tags
  - Proper bullet point indentation on mobile browsers
  - Typography plugin integration for consistent styling
- **XSS Security Fix**: Added DOMPurify sanitization to prevent Cross-Site Scripting (XSS) from LLM-generated HTML
  - Installed `dompurify` and `@types/dompurify`
  - Applied `DOMPurify.sanitize()` before rendering LLM-generated HTML
- **Duplicate Sources Removed**: Cleaned up frontend rendering
  - Removed redundant Sources section (was displayed twice)
  - LLM-generated Sources section is now the single source of truth
- **Tailwind Typography Migration**: Migrated from CDN to local build
  - Installed `@tailwindcss/typography` plugin
  - Created `tailwind.config.js`, `postcss.config.js`, `index.css`
  - Replaced custom CSS with `prose` classes
  - Downgraded to Tailwind v3.4.0 for build stability
- **Similarity Format Consistency**: Improved LLM reliability
  - Changed prompt from `(XX% match)` to `(Similarity: 0.XXX)`
  - LLM now copies similarity values directly without calculation
- **Code Review Response**: Addressed all Gemini Code Assist bot feedback
  - Security: High-severity XSS vulnerability fixed
  - Code Quality: Replaced custom CSS with official Typography plugin
  - Reliability: Aligned prompt output format with context data format

### 2026-02-10 (RAG Mobile Optimization & Production Release)
- **tennis-rag-query Function**: Replaced `search-tennis-rules` with production-ready `tennis-rag-query`
- **Dynamic Model Selection**: Edge function now accepts user-selected Gemini model (fixes 404 model error)
- **ITF Expert Tone**: Enhanced prompts with professional ITF official persona (~입니다, ~하십시오 체)
- **Answer Completeness**: Removed maxOutputTokens limit entirely to allow full, untruncated answers
- **Structured Answers**: Clear 3-part structure (핵심 답변 → 상세 설명 → 모바일 가독성)
- **Citation System**: Implemented [1], [2], [3] citation numbers in answers matching source list
- **Language Auto-Detection**: Automatic Korean/English detection from question text
- **Bilingual Prompts**: Separate optimized prompts for Korean (600자 내외) and English (150-200 words)
- **Security Enhancements**: API key in headers (not URL), error message sanitization
- **Frontend Updates**: Pass user-selected model from frontend to edge function
- **Documentation Overhaul**: Updated `TENNIS_RAG_INTEGRATION_PLAN.md` and `RAG_SETUP_GUIDE_KO.md` with model selection
- **Code Cleanup**: Removed unused `search-tennis-rules` folder
- **Bug Fixes**:
  - Fixed hardcoded `gemini-2.0-flash-exp` model (deprecated) → dynamic model selection
  - Fixed answer truncation by removing maxOutputTokens limit and enhancing prompt structure

### 2026-01-14 (AI Coach UI Redesign)
- **Collapsible AI Coach**: AI Coach UI를 Advanced Analytics처럼 작고 접을 수 있는 디자인으로 변경
- **Modal-Based Features**: Analyze Stats와 Ask Question을 각각 독립적인 모달로 분리
- **Progressive Disclosure**: API key가 없을 때는 설정만 표시, 설정 후 AI 기능 버튼 표시
- **Compact Design**: 기본적으로 작은 버튼만 표시하여 Stats 탭의 공간 효율성 향상
- **Component Refactoring**: `StatsAnalysisModal.tsx`, `TennisRulesChatModal.tsx` 신규 생성

### 2026-01-14 (AI Coach RAG System)
- **RAG (Retrieval-Augmented Generation)**: AI Coach에 테니스 규칙 검색 기능 추가
- **Chat Interface**: 탭 기반 UI (Analyze Stats / Ask Question)
- **PDF ETL Pipeline**: Python 스크립트로 PDF → Supabase 업로드 (pgvector)
- **Edge Function**: `search-tennis-rules` - 사용자 API 키 기반 RAG 검색
- **Gemini Embeddings**: `text-embedding-004` 모델 사용 (768 차원)
- **Multi-Language Support**: 영어/한글 규칙 문서 동시 지원
- **Source Citations**: AI 답변에 출처 표시 (규칙 제목, 유사도)
- **RAG Setup Guide**: 관리자용 상세 설정 가이드 문서 작성

### 2026-01-07 (Session Management & UX Improvements)
- **GuestSessionManager**: Guest Mode에도 Session Manager 추가 (날짜/위치 선택, 저장된 세션 메시지)
- **Mode Persistence**: 페이지 새로고침 시에도 모드 유지 (localStorage)
- **Session Ready Flags**: 각 모드별 세션 준비 상태 플래그 추가 (`tennis-mate-guest-session-ready`, `tennis-mate-cloud-session-ready`, `tennis-mate-sheets-session-ready`)
- **Navigation Consistency**: 모든 Session Manager에서 "Back to Mode Selection" 버튼을 하단으로 통일
- **Korean UI**: ModeSelection 페이지에 각 모드별 한국어 설명 추가
- **GitHub Link**: ModeSelection 페이지 하단에 GitHub 링크 추가
- **Location Picker UX**: 위치 권한 거부 시 warning toast로 변경 (error 대신), 한국어 에러 메시지
- **Cloud Mode Enhancement**: "이전 세션 계속하기" 옵션 추가
- **GoogleSheetsGuide Images**: Setup Guide에 실제 스크린샷 이미지 추가 (Step 2, 4, 5)

### 2026-01-06 (Documentation Refinement)
- **Google Sheets Guides**: Separated into `GOOGLE_SHEETS_SETUP_GUIDE_KO.md` and `GOOGLE_SHEETS_SETUP_GUIDE_EN.md`.
- **UX Improvements**: Added actual screenshots for all deployment steps.
- **Content Expansion**: Added "Digital Post Office" metaphor to the English guide, expanded deployment steps from 5 to 8, and added "Don't worry about code" messages.
- **README Cleanup**: Removed redundant Apps Script code to prevent duplication and added clear links to language-specific guides.
- **Runtime Verification**: Playwright 및 Supabase MCP를 사용하여 Cloud/Google Sheets 모드 런타임 검증 완료. (세션 생성 및 가이드 UI 정상 작동)

### 2026-01-03
- **Batch Save Implementation**: Optimized Google Sheets saving. Matches are now saved in parallel when clicking "End Session".
- **Location Save Fix**: Unified Apps Script template and data service parser to 11 columns, fixing the issue where `location` was not saved.
- **Saving UI**: Added a full-screen loading overlay during session end to provide user feedback and prevent race conditions.
- **Silent Mode Switch**: Removed the confirmation dialog when exiting a mode.
- **Documentation Consolidation**: Merged `CHANGELOG.md`, `ERRORS.md`, and `DAILY_SUMMARY_2024-12-31.md` into this file.

### 2026-01-02
- **Analytics & Stats**: Added `AnalyticsView` with "Me Stats", "Best Partners", and "Head-to-Head" rivalry analysis.
- **Location Optimization**: Geolocation timeouts increased to 10s, precision adjusted for mobile compatibility.
- **Location Suggestions**: Fetches last 100 locations from Google Sheets history to provide quick autocomplete.

### 2024-12-31 (Cloud UX Improvements)
- **Bug #16 Fixed**: Resolved issue where Global List players were added as `inactive`.
- **Default Players**: Added auto-generation of 5 default players for new Cloud sessions.
- **Performance**: Used `Promise.all` for parallel player creation in Supabase.
- **UI Refactor**: Moved Session Manager to a global modal overlay for better flow.

---

## 🚀 전체 Changelog

### [2.0.0] - 2026-02-19
**🧹 Codebase Cleanup & Maintenance Release**

**코드 정리:**
- **중복 타입 제거**: `Match` 인터페이스의 중복 `courtNumber` 필드 제거 (`types.ts`)
- **미사용 import 제거**: `AnalyticsView`, `CurrentMatch`, `CloudSessionManager`의 lucide-react 아이콘
- **`console.log` 정리**: `TennisRulesChatModal`, `GoogleSheetsDataService`, `SupabaseDataService`, `AdminPage`에서 디버그 로그 제거 (프로덕션 노이즈 감소)
- **미사용 패키지 제거**: `recharts` (코드베이스에서 실제 import 없음 확인 후 삭제)

**문서 정비:**
- `README.md`: 버전 배지 v2.0.0, AI Coach 동적 모델 설명 업데이트
- `TODO.md`: Kakao/Naver Map API 구현 세부 항목 삭제, 로드맵 버전 번호 재정렬 (v2.1.0 / v2.2.0 / v3.0.0)
- `HISTORY.md`: v2.0.0 릴리스 항목 추가
- `ARCHITECTURE.md`: 디렉토리 구조 및 AI 동적 모델 섹션 업데이트

---

### [1.4.0] - 2026-02-19
**🤖 Dynamic Gemini Model Selection & Two-Step API Key UX**

**동적 모델 선택:**
- **`fetchAvailableModels(apiKey)`**: Gemini `/v1beta/models` API로 실시간 모델 목록 조회
  - `generateContent` 지원 모델만 포함 (preview·gemma 제외)
  - `KNOWN_DEPRECATION_DATES` 맵으로 종료 예정 모델 자동 감지
  - 정렬: 추천 모델 → 활성 → 종료 임박 → 종료됨 순
  - Fetch 실패 시 `FALLBACK_GEMINI_MODELS` (4개)로 자동 폴백
- **`GeminiModelId` 타입**: `typeof FALLBACK_GEMINI_MODELS[number]['id'] | (string & {})`
  - IDE 자동완성 유지 + 동적 모델 ID 허용
- **`encodeURIComponent(apiKey)`**: URL 특수문자 처리

**2단계 API 키 설정 모달:**
- **Step 1 (키 입력)**: API 키만 입력 → 검증 → 다음으로 이동
- **Step 2 (모델 선택)**: "✅ API 키 인증 완료" 배지 + 동적 모델 드롭다운 + "저장 후 시작"
- `forceKeyStep={true}` prop: 기존 키가 있어도 Step 1에서 시작
- "← 키 변경" 버튼: Step 2 → Step 1 복귀

**AI 채팅 헤더 API 키 변경 기능:**
- `TennisRulesChatModal` 헤더: 모델 드롭다운 옆 "키 변경" 버튼 추가
- 클릭 → 기존 키 초기화 + 2단계 설정 모달 팝업 (forceKeyStep)
- 새 키 저장 후 `handleApiKeyUpdated()` 호출로 모델 목록 자동 갱신

**ModelSwitcher 개선:**
- `models?: DynamicGeminiModel[]` prop 추가 (동적 목록 우선, 없으면 폴백)
- 시각적 상태 배지: 🟢 Recommended · 🟠 Retiring MM/YYYY · 🟡 Deprecated
- `isNearEOL()` 날짜 계산: 모듈 레벨 고정값 제거 → 매 호출 시 `Date.now()` 동적 계산

**Code Review 반영 (Gemini Code Assist):**
- `useTennisChat`: `DEFAULT_GEMINI_MODEL` import + 모델 유효성 검사 (동적 목록에 없으면 기본값 리셋)
- `useTennisChat`: `React.Dispatch<React.SetStateAction<>>` → `Dispatch<SetStateAction<>>` 직접 import

---

### [1.3.1] - 2026-02-17
**🔐 Admin Auth Security Enhancement**

**보안 강화 (Gemini Code Assist 리뷰 대응):**
- **서버사이드 Admin 인증**: `VITE_ADMIN_PASSWORD` 클라이언트 노출 문제 해결
  - Netlify Function (`netlify/functions/admin-auth.ts`) 신규 생성
  - `jose` 라이브러리로 JWT 토큰 생성/검증 (HS256, 4시간 만료)
  - 인증 플로우: 사용자 입력 → Netlify Function 서버 검증 → JWT 반환 → sessionStorage 저장
  - 페이지 새로고침 시 `/api/admin-auth/verify`로 토큰 검증
- **환경변수 마이그레이션**:
  - ❌ `VITE_ADMIN_ID`, `VITE_ADMIN_PASSWORD` (클라이언트 번들에 포함됨) → 제거
  - ✅ `ADMIN_ID`, `ADMIN_PASSWORD` (서버 전용, `VITE_` 접두사 없음)
  - ✅ `ADMIN_JWT_SECRET` (JWT 서명용 랜덤 문자열, 32자 이상)
- **신규 파일**:
  - `services/adminAuthService.ts` — 클라이언트 인증 API 래퍼
  - `netlify/functions/admin-auth.ts` — 서버사이드 JWT 인증 함수
- **AdminPage.tsx 마이그레이션**:
  - 클라이언트측 `import.meta.env.VITE_ADMIN_*` 비교 제거
  - `adminLogin()` async 서버 호출로 변경
  - `verifyAdminToken()` 서버 검증으로 변경

**RLS 보안 문서화:**
- `supabase_schema.sql`에 의도적 설계 설명 추가
  - `USING (true)` 정책은 Guest Mode를 위한 의도적 선택
  - 소규모 신뢰 그룹 사용 전제, Admin UI는 서버사이드 JWT로 보호
  - 프로덕션 강화 방법 안내 (Supabase Auth + RLS 정책 변경)
- `ARCHITECTURE.md` 인증 아키텍처 섹션 재작성
- `HISTORY.md`에서 하드코딩된 비밀번호 (`admin/tennis1234`) 제거

**배포 시 필수 환경변수 (Netlify):**
```bash
# 서버사이드 전용 (VITE_ 접두사 없음)
ADMIN_ID=your_admin_id
ADMIN_PASSWORD=your_strong_password
ADMIN_JWT_SECRET=your_random_32char_string

# 클라이언트 전용 (기존과 동일)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

**트러블슈팅:**
- **"Server configuration error"**: Netlify 환경변수에 `ADMIN_ID`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET` 누락
  → Netlify Dashboard에서 3개 환경변수 추가 후 재배포
- **로컬 개발**: `npm run dev`는 Netlify Functions를 서빙하지 않음
  → `netlify dev` 사용 (Netlify CLI 필요: `npm install -g netlify-cli`)

---

### [1.3.0] - 2026-02-16
**🔧 Cloud Mode Fixes & Admin Dashboard**

**Admin Dashboard (신규):**
- **AdminPage 컴포넌트**: Supabase 데이터 관리를 위한 전체 관리자 대시보드
  - ~~환경변수 기반 인증 (프론트엔드 전용)~~ → v1.3.1에서 서버사이드로 마이그레이션
  - sessionStorage 기반 세션 유지 (브라우저 탭 닫으면 자동 로그아웃)
- **Pending Operations 패턴**: 변경사항을 미리보기 후 Undo/Commit 일괄 처리
  - Player: 이름 변경, 삭제, 중복 병합 (Merge with cascade match update)
  - Session: 위치 편집, 삭제
  - Match: 점수 편집, 삭제
- **Quick Entry**: 기존 세션에 경기 추가 또는 새 세션 즉시 생성
- **Player Deduplication**: 동일 이름 플레이어 자동 감지 및 병합 제안
- **AdminETLPage**: 테니스 규칙 PDF ETL 관리 인터페이스

**Supabase RLS 진단 & 수정:**
- **RLS Diagnostic Tool**: 로그인 시 자동으로 SELECT/INSERT/UPDATE/DELETE 권한 테스트
  - 테스트 레코드 자동 생성 후 삭제 (잔여 데이터 없음)
  - 각 작업별 성공/실패 상태 시각적 표시
  - 실패 시 구체적 에러 메시지 및 SQL 해결 방법 안내
- **RLS 차단 감지**: `.select()` 체이닝으로 silent failure 방지
  - Supabase는 RLS 차단 시 에러 없이 0 rows 반환 → 이를 명시적 감지
- **필수 RLS 정책**: 모든 테이블에 4개 정책 (SELECT/INSERT/UPDATE/DELETE)
  - ⚠️ `CREATE POLICY`는 동일 이름 정책 존재 시 에러 → `DROP POLICY IF EXISTS` 먼저 실행
  - 전체 SQL: [`supabase_schema.sql`](./supabase_schema.sql) 참고
  ```sql
  -- 예시 (각 테이블에 동일 패턴 적용)
  DROP POLICY IF EXISTS "Allow public delete access" ON public.players;
  CREATE POLICY "Allow public delete access" ON public.players FOR DELETE USING (true);
  ```
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`는 최초 1회만 필요 (이미 ON이면 무해)

**Bug Fixes:**
- Player 삭제된 플레이어 복원 리스트 추가
- Score 리셋 버그 수정
- 기본 admin 계정 하드코딩 제거 (보안 개선)
- Supabase delete/update 시 `.select()` 추가로 RLS 차단 감지

**인증 아키텍처 설명:**
- Admin 계정은 Supabase Users에 등록 불필요 (서버사이드 Netlify Function으로 인증)
- 서버 환경변수(`ADMIN_ID`, `ADMIN_PASSWORD`)로 인증 — 클라이언트 번들에 미포함
- Supabase RLS 정책은 `USING (true)` — 모든 요청 공개 허용 (Guest Mode 호환)
- Admin 로그인은 UI 접근 제어만 담당, 데이터 권한은 RLS 정책이 담당

### [1.2.0] - 2026-01-14
**🎨 AI Coach UI/UX Redesign & RAG System**

**UI/UX Improvements:**
- **Collapsible Interface**: AI Coach를 Advanced Analytics와 동일한 접을 수 있는 디자인으로 변경
  - 기본 상태: 작은 버튼만 표시 ("AI Coach" 섹션)
  - 확장 상태: API key 설정 또는 AI 기능 버튼 표시
- **Modal-Based Features**:
  - `StatsAnalysisModal`: Analyze Stats 기능을 독립 모달로 분리
  - `TennisRulesChatModal`: Ask Question 기능을 독립 모달로 분리
- **Progressive Disclosure UX**:
  - API key 미설정 시: Gemini API Key 설정 UI만 표시
  - API key 설정 후: "Analyze Stats"와 "Ask Question" 버튼 표시
- **Space Efficiency**: Stats 탭의 공간 효율성 대폭 향상

**RAG System (Retrieval-Augmented Generation):**
- **Tennis Rules Q&A**: 테니스 규칙 PDF 기반 AI 질문답변 시스템 구현
- **ETL Pipeline**: Python 스크립트로 PDF 처리 및 Supabase 업로드
  - 조항별 chunking (영어: Article/Rule, 한글: 제N조)
  - Gemini embeddings 생성 (text-embedding-004, 768차원)
  - pgvector를 사용한 유사도 검색
- **Edge Function**: `search-tennis-rules` 배포 (사용자 API 키 방식)
- **Multi-Language**: 영어/한글 규칙 문서 동시 지원
- **Source Attribution**: AI 답변에 출처 및 유사도 표시
- **Documentation**: RAG 설정 가이드 작성 (`RAG_SETUP_GUIDE_KO.md`)

**Component Architecture:**
- `StatsAnalysisModal.tsx`: AI stats analysis with Gemini API
- `TennisRulesChatModal.tsx`: RAG-based tennis rules chat
- `ChatMessageSource` interface: Type-safe message sources

### [1.1.1] - 2026-01-07
**🔧 Session Management & UX Improvements**
- **GuestSessionManager**: Guest Mode에도 세션 관리자 추가 (날짜/위치 선택)
- **Mode Persistence**: 페이지 새로고침 시에도 선택한 모드 유지
- **Session Ready Flags**: 각 모드별 세션 준비 상태 플래그 시스템 도입
- **Navigation Consistency**: "Back to Mode Selection" 버튼 하단 통일
- **Korean UI**: ModeSelection 페이지 한국어 설명 및 GitHub 링크 추가
- **Location Picker UX**: 위치 권한 에러 메시지 개선 (warning toast)
- **GoogleSheetsGuide**: Setup Guide에 실제 스크린샷 이미지 추가

### [1.1.0] - 2026-01-06
**✨ Documentation & UX Overhaul**
- **Google Sheets Guide**: 완전한 한글/영어 분리 및 전문 안내서 업로드 (`_KO.md`, `_EN.md`).
- **Visual Setup**: 8단계 상세 설정 스크린샷 및 가이드 UI 통합.
- **Batch Save Fix**: 세션 종료 시 모든 경기를 Google Sheets에 병렬로 저장하는 최적화 로직 적용.
- **Location Save Fix**: Google Sheets 11컬럼 스키마 통일로 `location` 저장 오류 해결.
- **Mobile UX**: 모바일에서의 드래그 앤 드롭 및 터치 인터페이스 안정성 향상.

### [1.0.0] - 2026-01-02
**🎉 MVP Release**
- **Google Sheets Mode**: Use your own spreadsheet as a database.
- **Head-to-Head Analysis**: Compare rivalry stats between any two players.
- **Core Features**: 4-8 player Round Robin, fair rest allocation, AI Coach (Gemini), and cross-platform support.

### [0.9.1] - 2024-12-31
- Cloud Mode UX improvements and bug fixes.
- Parallel processing for faster data sync.

### [0.9.0] - 2024-12-30
- **Cloud Mode**: Supabase integration.
- **Enhanced Stats**: Recharts integration for performance tracking.

### [0.8.0] - 2024-12-29
- Initial Round Robin logic and fair rest rotation algorithm.
- Drag-and-drop match reordering.

### [0.1.0] - 2024-12-25
- Initial version with local storage and basic player management.

---

## 🐞 Error & Bug History (Consolidated)

| ID | Issue | Severity | Resolution |
|---|---|---|---|
| 01 | Gemini API Key missing in Vite | 🔥 Critical | Fixed by using `import.meta.env.VITE_GEMINI_API_KEY`. |
| 02 | `getAllPlayers` not exported | 🔥 Critical | Added export to `AppContext`. |
| 03 | Cloud save sync (no rollback) | 🔥 Critical | Implemented try-catch with state rollback. |
| 07 | Team data type mismatch (JSONB) | 🔥 Critical | Fixed Supabase schema and payload structure. |
| 09 | Session ID lost on refresh | 🔥 Critical | Added `localStorage` persistence for Session IDs. |
| 10 | Location value not saving (Sheets) | 🔥 High | Unified 11-column schema and fixed `resetData` wipe bug. |
| 16 | Global players added as inactive | 🔥 Critical | Modified `addPlayer` to force `active: true` for sessions. |

*For more technical details on historical fixes, refer to the commit history.*

---

## 🛠 Google Sheets Technical Explainer

### Spreadsheet Schema (v1.1.1)
| Column | Name | Description |
|---|---|---|
| A | timestamp | Record creation time in Script |
| B | date | Match start time (YYYY-MM-DD HH:mm) |
| C | duration | Match length in minutes |
| D-G | Players | Winner1, Winner2, Loser1, Loser2 |
| H | score | Display score (e.g. "6-4") |
| I | winner_score | Numerical score for winners |
| J | loser_score | Numerical score for losers |
| K | location | Court location string |
