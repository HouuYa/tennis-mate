# Tennis Mate - Roadmap & TODO

## ✅ v1.0.0 MVP (완료 - 2026-01-02)

### 핵심 기능
- [x] **3가지 저장소 모드**
  - [x] Guest Mode (LocalStorage)
  - [x] Google Sheets Mode (BYODB)
  - [x] Cloud Mode (Supabase)
- [x] **Google Sheets 통합**
  - [x] GoogleSheetsDataService 구현
  - [x] 6단계 설정 가이드 모달
  - [x] 연결 테스트 기능
  - [x] 최근 100경기 자동 동기화
  - [x] **일괄 저장 (Batch Save)**: 세션 종료 시 한꺼번에 저장
  - [x] Apps Script 템플릿 제공
- [x] **고급 분석**
  - [x] Best Partnerships 분석
  - [x] Head-to-Head 라이벌 분석
  - [x] 상세 리더보드
- [x] **매치메이킹**
  - [x] 4~8인 라운드 로빈
  - [x] 공정한 휴식 배분
  - [x] 드래그 앤 드롭 순서 변경
- [x] **AI 코치**
  - [x] Gemini API 연동
  - [x] 경기 분석 및 인사이트

---

## ✅ v1.1.0 - Documentation & UX Overhaul (완료 - 2026-01-06)
- [x] **Google Sheets 가이드 개선**
    - [x] 한글/영어 상세 가이드 분리
    - [x] 8단계 상세 스크린샷 가이드
    - [x] URL 검증 예시 및 "Post Office" 메타포 도입
- [x] **UX & 버그 수정**
    - [x] Location 저장 오류 (11컬럼 스키마) 해결
    - [x] 세션 종료 시 일괄 저장 (Batch Save) 안정화
    - [x] 모바일 터치 드래그 앤 드롭 최적화

---

## ✅ v1.1.1 - Session Management & UX (완료 - 2026-01-07)
- [x] **Session Manager 통합**
    - [x] GuestSessionManager 컴포넌트 추가 (날짜/위치 선택)
    - [x] 모든 모드에서 "Back to Mode Selection" 버튼 하단 통일
    - [x] Session Ready Flags 시스템 도입 (`tennis-mate-guest-session-ready`, `tennis-mate-cloud-session-ready`, `tennis-mate-sheets-session-ready`)
- [x] **Mode Persistence**
    - [x] 페이지 새로고침 시에도 선택한 모드 유지
    - [x] 뒤로가기 시 경고 메시지 표시

---

## ✅ v1.1.2 - AI Coach RAG System (완료 - 2026-01-14)
- [x] **RAG (Retrieval-Augmented Generation) 구현**
    - [x] 테니스 규칙 PDF 기반 AI 질문답변 시스템
    - [x] pgvector를 사용한 벡터 유사도 검색
    - [x] Gemini `text-embedding-004` 임베딩 (768차원)
- [x] **Chat Interface**
    - [x] 탭 기반 UI: "Analyze Stats" / "Ask Question"
    - [x] 채팅 히스토리 표시
    - [x] 실시간 질문/답변
    - [x] 출처 표시 (규칙 제목, 유사도)
- [x] **ETL Pipeline**
    - [x] Python 스크립트 작성 (`scripts/upload_tennis_rules.py`)
    - [x] PDF 텍스트 추출 (PyPDF2)
    - [x] 조항별 chunking (영어: Article/Rule, 한글: 제N조)
    - [x] Gemini embeddings 생성
    - [x] Supabase 일괄 업로드
- [x] **Database Setup**
    - [x] Supabase pgvector extension 설정
    - [x] `tennis_rules` 테이블 생성
    - [x] `match_tennis_rules()` RPC 함수
    - [x] ivfflat 인덱스 생성
- [x] **Edge Function**
    - [x] `search-tennis-rules` 함수 작성
    - [x] 사용자 API 키 기반 검색
    - [x] 언어별 필터링 (en/ko)
    - [x] 출처 정보 반환
- [x] **Documentation**
    - [x] RAG 설정 가이드 작성 (`RAG_SETUP_GUIDE_KO.md`)
    - [x] Python ETL 실행 가이드
    - [x] Edge Function 배포 가이드
    - [x] 문제 해결 FAQ

---

## ✅ v1.2.0 - RAG Mobile Optimization (완료 - 2026-02-11)
- [x] **tennis-rag-query Production Function**
    - [x] Mobile-optimized answer length (max 400 tokens)
    - [x] Citation numbers [1], [2], [3] in answer text
    - [x] Automatic language detection (Korean/English)
    - [x] Bilingual prompt templates
    - [x] Professional, concise tone
    - [x] API key security (headers, error sanitization)
- [x] **Frontend Alignment**
    - [x] Updated TennisRulesChatModal.tsx to call tennis-rag-query
    - [x] Updated AIChatInterface.tsx endpoint
    - [x] Matched request/response structure with deployed function
- [x] **Documentation Updates**
    - [x] TENNIS_RAG_INTEGRATION_PLAN.md with mermaid diagrams
    - [x] RAG_SETUP_GUIDE_KO.md simplified user guide
    - [x] HISTORY.md changelog entry
- [x] **Code Cleanup**
    - [x] Removed unused search-tennis-rules folder
- [x] **Korean UI 개선**
    - [x] ModeSelection 페이지에 각 모드별 한국어 설명 추가
    - [x] GitHub 링크 하단 추가
    - [x] Location Picker 한국어 에러 메시지
- [x] **UX 개선**
    - [x] 위치 권한 거부 시 warning toast로 변경
    - [x] Cloud Mode "이전 세션 계속하기" 옵션
    - [x] GoogleSheetsGuide에 실제 스크린샷 이미지 추가
- [x] **Mobile Readability Enhancement**
    - [x] HTML formatting for tennis rules answers (ul, li, p, hr, h3, sup tags)
    - [x] Proper bullet point indentation on mobile browsers
    - [x] Remove duplicate Sources rendering from frontend
- [x] **Security Improvements**
    - [x] DOMPurify integration for XSS protection
    - [x] Sanitize LLM-generated HTML before rendering
- [x] **Build System Migration**
    - [x] Migrate from Tailwind CDN to local build
    - [x] Install @tailwindcss/typography plugin
    - [x] Create tailwind.config.js with custom typography styles
    - [x] Create postcss.config.js and index.css
    - [x] Replace custom CSS with prose classes
    - [x] Downgrade to Tailwind v3.4.0 for build stability
- [x] **Prompt Optimization**
    - [x] Update similarity format: (XX% match) → (Similarity: 0.XXX)
    - [x] Improve LLM reliability by removing calculation step

---

## ✅ v1.3.0 - Cloud Mode Fixes & Admin Dashboard (완료 - 2026-02-16)
- [x] **Admin Dashboard**
    - [x] AdminPage 컴포넌트 신규 구현 (1,377 lines)
    - [x] ~~환경변수 기반 인증~~ → 서버사이드 Netlify Function + JWT 인증 (v1.3.1)
    - [x] sessionStorage 기반 세션 유지
    - [x] Players / Sessions / Quick Entry 3개 섹션
    - [x] Pending Operations 패턴 (Undo/Commit 일괄 처리)
    - [x] Player: 이름 변경, 삭제, 중복 병합 (Merge)
    - [x] Session: 위치 편집, 삭제
    - [x] Match: 점수 편집, 삭제
    - [x] Quick Entry: 기존/새 세션에 경기 빠른 입력
    - [x] Player Deduplication: 동일 이름 플레이어 자동 감지
- [x] **Supabase RLS 진단 & 수정**
    - [x] RLS Diagnostic Tool: SELECT/INSERT/UPDATE/DELETE 자동 테스트
    - [x] `.select()` 체이닝으로 RLS silent failure 감지
    - [x] 필수 RLS 정책 문서화 (모든 테이블 public delete 정책)
- [x] **AdminETLPage**: 테니스 규칙 PDF ETL 관리 인터페이스
- [x] **Bug Fixes**
    - [x] Player 삭제 복원 리스트 추가
    - [x] Score 리셋 버그 수정
    - [x] 기본 admin 계정 하드코딩 제거 (보안)
- [x] **인증 아키텍처 문서화**
    - [x] Admin 인증은 Supabase Auth와 무관 (프론트엔드 전용)
    - [x] RLS 정책은 `USING (true)` — Guest Mode 호환

---

## ✅ v1.3.1 - Admin Auth Security Fix (완료 - 2026-02-17)
- [x] **서버사이드 Admin 인증** (Gemini Code Assist 보안 리뷰 대응)
    - [x] Netlify Function (`netlify/functions/admin-auth.ts`) 생성
    - [x] `jose` 라이브러리로 JWT 생성/검증 (HS256, 4시간 만료)
    - [x] `VITE_ADMIN_*` → `ADMIN_*` (서버 전용 환경변수, 번들에 미포함)
    - [x] `services/adminAuthService.ts` 클라이언트 인증 래퍼
    - [x] `AdminPage.tsx` 인증 플로우 서버사이드로 마이그레이션
- [x] **RLS 보안 문서화**
    - [x] `supabase_schema.sql`에 의도적 설계 설명 추가
    - [x] `ARCHITECTURE.md` 인증 아키텍처 재작성
    - [x] `HISTORY.md`에서 하드코딩된 비밀번호 제거

---

## ✅ v1.4.0 - Dynamic Gemini Model Selection & API Key UX (완료 - 2026-02-19)
- [x] **동적 Gemini 모델 선택** (`services/geminiService.ts`)
    - [x] `fetchAvailableModels(apiKey)`: `/v1beta/models` API 실시간 조회
    - [x] preview·gemma·비generateContent 모델 자동 필터링
    - [x] `KNOWN_DEPRECATION_DATES` 맵으로 종료 예정 모델 감지
    - [x] `FALLBACK_GEMINI_MODELS` 자동 폴백 (fetch 실패·키 없음)
    - [x] `GeminiModelId` 교차 타입으로 자동완성 유지 + 동적 ID 허용
    - [x] `encodeURIComponent(apiKey)` URL 안전 처리
- [x] **2단계 API 키 설정 모달** (`components/GeminiApiKeySettings.tsx`)
    - [x] Step 1 (키 입력): API 키 입력 → 검증 → 다음 단계로 이동
    - [x] Step 2 (모델 선택): "✅ 인증 완료" 배지 + 동적 모델 드롭다운 + "저장 후 시작"
    - [x] `forceKeyStep={true}` prop: 기존 키 있어도 Step 1부터 강제 시작
    - [x] "← 키 변경" 버튼: Step 2 → Step 1 복귀
- [x] **채팅 헤더 API 키 변경 기능** (`components/TennisRulesChatModal.tsx`)
    - [x] 모델 드롭다운 옆 "키 변경" 버튼 추가
    - [x] 클릭 시 기존 키 초기화 + Step 1부터 설정 모달 팝업
    - [x] 새 키 저장 후 `handleApiKeyUpdated()` 호출로 모델 목록 자동 갱신
- [x] **ModelSwitcher 개선** (`components/ModelSwitcher.tsx`)
    - [x] `models?: DynamicGeminiModel[]` prop (동적 목록 우선, 없으면 폴백)
    - [x] 🟠 "Retiring MM/YYYY" 배지 (종료 임박 모델)
    - [x] 🟡 "Deprecated" 배지 + 비활성화 (종료된 모델)
    - [x] `isNearEOL()` 내부에서 동적 날짜 계산 (`Date.now()` 기반)
- [x] **Code Review 반영** (Gemini Code Assist)
    - [x] `useTennisChat`: `DEFAULT_GEMINI_MODEL` import + 모델 유효성 검사
    - [x] `useTennisChat`: `React.Dispatch` → `Dispatch<SetStateAction<>>` 직접 import
    - [x] `ModelSwitcher`: 모듈 레벨 stale 날짜 상수 제거

---

## 🔜 v1.5.0 - Core Features Enhancement (예정)

### 우선순위: HIGH

#### 📍 한글 주소 지원 (Korean Address Support)
**현재 상태**: OpenStreetMap Nominatim 사용 (영어 주소 반환)
**목표**: 한글 주소 지원 (Kakao 또는 Naver Map API)

**옵션 1: Kakao Map API (추천)**
- 무료 범위: 일 300,000건
- 장점: 완벽한 한글 지원, 간단한 REST API

구현 계획:
```typescript
// CloudSessionManager.tsx
const handleGetLocation = async (position) => {
  const response = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
    {
      headers: {
        Authorization: `KakaoAK ${import.meta.env.VITE_KAKAO_REST_API_KEY}`
      }
    }
  );
  const data = await response.json();
  const address = data.documents[0]?.address?.address_name;
  setLocation(address); // "서울특별시 강남구 역삼동"
};
```

**옵션 2: Naver Map API**
- 무료 범위: 일 100,000건 (Mobile), 50,000건 (Web)
- 장점: 상세한 한국 지도 데이터

#### 🎾 Tie-break 스코어 지원
- [ ] "7-6 (4)" 형식의 스코어 입력 UI
- [ ] Tie-break 점수 저장 및 표시
- [ ] 통계에 Tie-break 경기 구분

#### 🖼️ 플레이어 아바타
- [ ] 프로필 사진 업로드
- [ ] 색상/이니셜 기반 아바타 생성
- [ ] 아바타 표시 (리더보드, 매치 카드)

### 우선순위: MEDIUM

#### 📱 PWA 지원
- [ ] Service Worker 설정
- [ ] 오프라인 모드
- [ ] 홈 화면 추가
- [ ] 푸시 알림 (매치 시작 알림)

#### 🔔 알림 시스템
- [ ] 매치 시작/종료 알림
- [ ] 내 차례 알림
- [ ] 브라우저 알림 권한 요청

#### 🌐 다국어 지원
- [ ] i18n 라이브러리 도입
- [ ] 영어 번역
- [ ] 언어 선택 UI

---

## 🎯 v1.6.0 - Multi-Court & Advanced Features (예정)

### 우선순위: HIGH

#### 🏟️ 다중 코트 지원
- [ ] 2개 코트 동시 진행
- [ ] 코트별 매치 할당
- [ ] 코트 간 플레이어 이동
- [ ] 8~10명 인원 대응

#### 📊 통계 강화
- [ ] 승률 추이 그래프 (시간별)
- [ ] 파트너별 승률 히트맵
- [ ] 월별/주별 통계
- [ ] PDF 리포트 생성

### 우선순위: MEDIUM

#### 🔐 인증 & 권한
- [ ] Google/Apple 소셜 로그인
- [ ] 관리자/일반 사용자 구분
- [ ] Supabase RLS 정책 강화
- [ ] 세션 공유 권한 관리

#### 💾 데이터 마이그레이션
- [ ] Guest → Sheets 마이그레이션
- [ ] Guest → Cloud 마이그레이션
- [ ] Sheets → Cloud 마이그레이션
- [ ] 데이터 백업/복원 기능

---

## 🚀 v2.0.0 - Next Generation (장기)

### 실시간 동기화
- [ ] WebSocket 연동
- [ ] 다중 사용자 실시간 업데이트
- [ ] Conflict Resolution

### 팀 대항전 모드
- [ ] 고정 팀 설정
- [ ] 팀 포인트 시스템
- [ ] 팀 랭킹

### 토너먼트 시스템
- [ ] 싱글 엘리미네이션 브라켓
- [ ] 더블 엘리미네이션
- [ ] 스위스 시스템
- [ ] 자동 시드 배정

### 모바일 네이티브 앱
- [ ] React Native 포팅
- [ ] iOS App Store 출시
- [ ] Android Play Store 출시
- [ ] 푸시 알림 네이티브 지원

### AI 기능 확장
- [ ] 경기 예측 (승률 예측)
- [ ] 팀 조합 추천 AI
- [ ] 음성 명령 지원
- [ ] 자동 스코어 인식 (OCR)

---

## 🐛 알려진 이슈 (Known Issues)

### 해결 예정
- [ ] Google Sheets Mode에서 대량 데이터(100+ 경기) 로드 시 느림
- [ ] Safari 브라우저에서 드래그 앤 드롭 간헐적 버그
- [ ] 무승부 경기의 통계 계산 방식 개선 필요

---

## 💡 아이디어 백로그 (Ideas)

### 커뮤니티 기능
- [ ] 클럽 랭킹 시스템
- [ ] 플레이어 프로필 페이지
- [ ] 경기 하이라이트 공유
- [ ] 챌린지 시스템

### 게임화 요소
- [ ] 배지/업적 시스템
- [ ] 레벨 시스템
- [ ] 일일 미션
- [ ] 시즌 리워드

### 분석 도구
- [ ] 플레이 스타일 분석
- [ ] 약점 분석
- [ ] 개선 제안
- [ ] 트레이닝 플랜

---

## 📝 참고 문서

- [Kakao Developers](https://developers.kakao.com/docs/latest/ko/local/dev-guide#coord-to-address)
- [Naver Cloud Platform](https://api.ncloud-docs.com/docs/ai-naver-mapsreversegeocoding-gc)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Apps Script](https://developers.google.com/apps-script)

---

## 🎯 기여 가이드

우선순위가 높은 항목부터 작업하면 좋습니다:
1. v1.1.0의 HIGH 우선순위 항목
2. v1.1.0의 MEDIUM 우선순위 항목
3. v1.2.0 항목
4. v2.0.0 장기 계획

풀 리퀘스트는 언제나 환영합니다! 🙌
