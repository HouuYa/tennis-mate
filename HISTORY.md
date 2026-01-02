# 📅 Change Log

## [v1.0.0] - 2026-01-02 - MVP Release 🎉

### 🎊 Major Milestone
Tennis Mate의 첫 번째 공식 MVP 릴리스입니다! 3가지 저장소 모드와 고급 분석 기능을 갖춘 완전한 테니스 매치 매니저로 출시되었습니다.

### ✨ Added - Google Sheets Mode (BYODB)
- **새로운 저장소 옵션**: Guest/Cloud에 이어 세 번째 모드 추가
- **GoogleSheetsDataService**: Google Apps Script를 백엔드로 사용하는 데이터 서비스 레이어
- **GoogleSheetsSessionManager**: 설정 및 연결 관리 UI 컴포넌트
- **GoogleSheetsGuide**: 6단계 설정 가이드 모달 (Apps Script 배포 방법 포함)
- **자동 동기화**: 최근 100경기 데이터 로드
- **연결 테스트**: Web App URL 유효성 검증 기능
- **데이터 소유권**: 사용자의 구글 시트에 모든 데이터 저장
- **무료 무제한**: 구글 시트의 무료 저장 공간 활용

### ✨ Added - Head-to-Head Analysis
- **라이벌 분석**: StatsView에 새로운 분석 섹션 추가
- **직접 대결 전적**: 두 선수 간 승/무/패 통계
- **승률 시각화**: 프로그레스 바로 승률 표시
- **동적 메시지**: 우세/열세/동등 관계에 따른 피드백

### 🔄 Changed
- **Mode Selection UI**: Google Sheets Mode 버튼 추가 (emerald 테마)
- **AppContext**: GOOGLE_SHEETS 모드 핸들링 로직 추가
- **DataService Interface**: 'GOOGLE_SHEETS' 타입 추가
- **finishMatch**: Google Sheets 모드에서 saveMatchWithNames 호출

### 🐛 Fixed (Gemini Code Review)
- **URL Input Bug**: 저장된 URL이 있을 때 입력 필드를 지울 수 없던 문제 해결
- **Score Parsing**: "4-6" 같은 점수 순서 관계없이 올바르게 파싱
- **Type Safety**: dataService 타입 캐스팅에 type guard 추가
- **Error Handling**: `catch (e: any)` → `catch (e: unknown)` 변경

### 🔧 Refactored
- **Apps Script Code**: var → const/let, 중복 코드 헬퍼 함수로 추출
- **saveMatch**: 명시적 에러 메시지로 변경 (saveMatchWithNames 사용 안내)
- **package-lock.json**: v1.0.0으로 동기화

---

## [v0.9.2] - 2025-01-01 - Gemini Code Review Feedback

### 🐛 Fixed
- Gemini AI의 코드 리뷰 피드백 적용
- 타입 안전성 개선
- 에러 핸들링 강화

---

## [v0.9.1] - 2024-12-31 - UX Improvements for Cloud Mode

### ✨ Added
- **Session Manager Modal**: Cloud Mode 선택 즉시 전체 화면 모달로 Session Manager 표시
- **Auto-create Default Players**: "Start Session" 클릭 시 5명의 기본 플레이어 자동 생성 (병렬 처리)
- **자동 네비게이션**: 세션 생성/로드 후 Player 탭으로 자동 이동
- Local Mode와 일관된 UX - 세션 시작 즉시 매치 생성 가능

### 🔄 Changed
- **App.tsx**: Session Manager를 App 레벨 모달로 이동 (Match 탭에서 분리)
- **CloudSessionManager**: `onSessionReady` 콜백 추가로 세션 완료 알림 지원
- **MatchSchedule**: Session Manager 제거 (Match Schedule만 표시)
- `startCloudSession()`: Promise.all로 병렬 처리 (성능 개선)
- 개별 플레이어 추가 실패 시에도 나머지 플레이어는 계속 추가되도록 에러 핸들링 개선

### 🐛 Fixed
- **Critical Bug #16**: Global List에서 플레이어 추가 시 `active: false`로 설정되어 매치 생성 불가 문제 해결
- `addPlayer()`: Session에 추가되는 모든 플레이어를 `active: true`로 강제 설정
- Active/Inactive 의미 명확화: Global DB는 중립(false), Session 추가 시 active(true), UI 토글로 비활성화 가능

---

## [v0.9.0] - 2024-12-30 - Cloud Integration & Stats Overhaul

### ✨ Added
- **Cloud Mode (Supabase)**:
  - 로컬 모드(Guest)와 클라우드 모드를 선택하여 시작할 수 있는 "Dual Mode" 아키텍처 도입
  - 세션, 플레이어, 매치 데이터를 Supabase Postgres DB에 저장 및 동기화
  - 클라우드 모드에서 글로벌 플레이어 목록 불러오기 기능 추가
- **Enhanced Stats View**:
  - **Recharts** 라이브러리 도입: 승률(Win Rate) 및 게임 득실(Game +/-) 차트 시각화
  - **Best Partnerships**: 승률이 가장 높은 복식 파트너 조합 자동 추천 카드 추가
  - 상세 리더보드 테이블 디자인 개선

### 🐛 Fixed
- **Stats Persistence**: 앱 재로딩 시 통계 데이터가 0으로 초기화되거나 0점 경기가 반영되지 않던 문제 수정 (Stats Auto-Healing 로직 추가)
- **Chart Empty State**: 데이터 부족 시(3경기 미만) 차트 대신 안내 메시지 표시

### 🔄 Changed
- **Architecture**: `DataService` 패턴 도입으로 로컬/클라우드 로직 분리
- **Backend**: `supabase_schema.sql` 정의 및 적용

---

## [v0.8.0] - 2024-12-29 - Enhanced Matchmaking

### ✨ Added
- **라운드 로빈 로직**: 공정한 파트너 조합 알고리즘
- **휴식 순환**: 5인 이상 플레이어를 위한 공정한 휴식 배분
- **드래그 앤 드롭**: 플레이어 순서 변경 기능

### 🔄 Changed
- 매치메이킹 알고리즘 전면 개선
- 모바일 터치 이벤트 최적화

---

## [v0.7.0] - 2024-12-28 - Stats & Analytics

### ✨ Added
- **상세 통계**: 승률, 게임 득실, 매치 수 등
- **파트너십 분석**: 최고의 파트너 조합 추천
- **Gemini AI 연동**: AI 코치 기능 추가

---

## [v0.6.0] - 2024-12-27 - Match Management

### ✨ Added
- **매치 스케줄링**: 대기 큐 시스템
- **점수 입력**: 실시간 점수 기록
- **실행 취소**: 경기 결과 되돌리기

---

## [v0.5.0] - 2024-12-26 - Player Management

### ✨ Added
- **플레이어 추가/삭제**: 기본 관리 기능
- **활성/비활성 토글**: 참여 여부 관리
- **로컬 저장소**: LocalStorage 기반 데이터 영속성

---

## [v0.1.0] - 2024-12-25 - Initial MVP

### ✨ Added
- React + TypeScript 기반 프로젝트 세팅
- 기본 플레이어 관리
- 매치 생성 및 점수 입력
- 모바일 반응형 디자인

---

## 버전 관리 규칙 (Versioning)

Tennis Mate는 [Semantic Versioning](https://semver.org/)을 따릅니다:
- **MAJOR (X.0.0)**: 호환되지 않는 API 변경
- **MINOR (0.X.0)**: 하위 호환 가능한 기능 추가
- **PATCH (0.0.X)**: 하위 호환 가능한 버그 수정

---

**전체 변경 내역**: [GitHub Releases](https://github.com/HouuYa/tennis-mate/releases)
