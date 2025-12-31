# 📅 Change Log

## [Unreleased]
- **Tie-break Support**: 준비 중.

## [v0.9.1] - UX Improvements for Cloud Mode
### Added
- **Auto-create Default Players**: Cloud Mode에서 "Start Session" 클릭 시 5명의 기본 플레이어가 자동으로 추가됨 (Nadal, Federer, Djokovic, Murray, Alcaraz).
- Local Mode와 일관된 UX 제공 - 세션 시작 즉시 매치 생성 가능.

### Changed
- `startCloudSession()`: 세션 생성 후 자동으로 기본 플레이어 추가 로직 구현.
- 개별 플레이어 추가 실패 시에도 나머지 플레이어는 계속 추가되도록 에러 핸들링 개선.

### Fixed
- **Critical Bug #16**: Global List에서 플레이어 추가 시 `active: false`로 설정되어 매치 생성 불가 문제 해결.
- `addPlayer()`: Session에 추가되는 모든 플레이어를 `active: true`로 강제 설정.
- Active/Inactive 의미 명확화: Global DB는 중립(false), Session 추가 시 active(true), UI 토글로 비활성화 가능.

## [v0.9.0] - Cloud Integration & Stats Overhaul
### Added
- **Cloud Mode (Supabase)**: 
  - 로컬 모드(Guest)와 클라우드 모드를 선택하여 시작할 수 있는 "Dual Mode" 아키텍처 도입.
  - 세션, 플레이어, 매치 데이터를 Supabase Postgres DB에 저장 및 동기화.
  - 클라우드 모드에서 글로벌 플레이어 목록 불러오기 기능 추가.
- **Enhanced Stats View**:
  - **Recharts** 라이브러리 도입: 승률(Win Rate) 및 게임 득실(Game +/-) 차트 시각화.
  - **Best Partnerships**: 승률이 가장 높은 복식 파트너 조합 자동 추천 카드 추가.
  - 상세 리더보드 테이블 디자인 개선.

### Fixed
- **Stats Persistence**: 앱 재로딩 시 통계 데이터가 0으로 초기화되거나 0점 경기가 반영되지 않던 문제 수정 (Stats Auto-Healing 로직 추가).
- **Chart Empty State**: 데이터 부족 시(3경기 미만) 차트 대신 안내 메시지 표시.

### Changed
- **Architecture**: `DataService` 패턴 도입으로 로컬/클라우드 로직 분리.
- **Backend**: `supabase_schema.sql` 정의 및 적용.

## [v0.1.0] - Initial MVP
- React + TypeScript 기반 프로젝트 세팅.
- 기본 플레이어 관리, 매치 생성, 점수 입력 기능 구현.
- Gemini AI 연동을 통한 통계 분석 기능.
- 모바일 "편집 모드" (화살표 이동) 지원.