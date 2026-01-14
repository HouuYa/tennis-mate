# Tennis Mate - Project History & Changelog

This document serves as the master record for releases, daily summaries, and bug fixes for the Tennis Mate project.

---

## 📅 Daily Summaries (Recent)

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

### [1.2.0] - 2026-01-14
**🎨 AI Coach UI/UX Redesign**
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
- **Component Architecture**:
  - AIChatInterface.tsx의 역할 축소 (기존 탭 UI 제거)
  - 2개의 신규 모달 컴포넌트로 기능 분리

### [1.1.2] - 2026-01-14
**🤖 AI Coach RAG System**
- **RAG Search**: 테니스 규칙 PDF 기반 AI 질문답변 시스템 구현
- **Chat UI**: "Analyze Stats" / "Ask Question" 탭 인터페이스
- **ETL Pipeline**: Python 스크립트로 PDF 처리 및 Supabase 업로드
  - 조항별 chunking (영어: Article/Rule, 한글: 제N조)
  - Gemini embeddings 생성 (text-embedding-004, 768차원)
  - pgvector를 사용한 유사도 검색
- **Edge Function**: `search-tennis-rules` 배포 (사용자 API 키 방식)
- **Multi-Language**: 영어/한글 규칙 문서 동시 지원
- **Source Attribution**: AI 답변에 출처 및 유사도 표시
- **Documentation**: RAG 설정 가이드 작성 (`RAG_SETUP_GUIDE_KO.md`)

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
