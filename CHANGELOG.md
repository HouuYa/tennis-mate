# Changelog

All notable changes to Tennis Mate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-02

### 🎉 MVP Release

Tennis Mate의 첫 번째 공식 릴리스! 3가지 저장소 모드와 고급 분석 기능을 갖춘 완전한 테니스 매치 매니저입니다.

### Added

#### Google Sheets Mode (BYODB - Bring Your Own Database)
- 사용자의 Google Sheets를 데이터베이스로 사용하는 새로운 저장소 모드
- `GoogleSheetsDataService.ts`: Google Apps Script Web App을 백엔드로 사용
- `GoogleSheetsSessionManager.tsx`: 설정 및 연결 관리 UI
- `GoogleSheetsGuide.tsx`: 6단계 설정 가이드 모달
- 최근 100경기 자동 동기화
- Web App URL 연결 테스트 기능
- Apps Script 템플릿 코드 제공 (doGet/doPost)

#### Head-to-Head Rival Analysis
- `StatsView.tsx`에 라이벌 대결 분석 섹션 추가
- 두 선수 간 직접 대결 전적 비교 (승/무/패)
- 승률 시각화 (프로그레스 바)
- 동적 라이벌 메시지 (우세/열세/동등)

#### Core Features (기존 기능 정리)
- 3가지 저장소 모드: Guest (Local) / Google Sheets / Cloud (Supabase)
- 4~8인 라운드 로빈 매치메이킹
- 공정한 휴식 배분 알고리즘
- Best Partnerships 분석
- AI 코치 (Gemini API)
- 드래그 앤 드롭 순서 변경
- 상세 리더보드 및 통계

### Changed

- `ModeSelection.tsx`: Google Sheets Mode 버튼 추가 (emerald 테마)
- `App.tsx`: `showGoogleSheetsSessionManager` 조건부 렌더링 추가
- `AppContext.tsx`: GOOGLE_SHEETS 모드 핸들링 로직 추가
- `DataService.ts`: 'GOOGLE_SHEETS' 타입 추가
- `finishMatch()`: Google Sheets 모드에서 `saveMatchWithNames()` 호출
- `package.json`: 버전 1.0.0으로 업데이트

### Fixed

#### Gemini Code Review 피드백 적용
- **URL Input Bug**: 저장된 URL이 있을 때 입력 필드를 지울 수 없던 문제 해결
  - `useState(getGoogleSheetsUrl() || '')로 초기화
  - `value={url}로 단순화
- **Score Parsing Bug**: "4-6" 같은 점수 순서와 관계없이 올바르게 파싱
  - `Math.max/Math.min` 사용으로 승자 점수 자동 계산
- **Type Safety**: dataService 타입 캐스팅에 `type guard` 추가
  - `dataService.type !== 'GOOGLE_SHEETS'` 체크 추가
- **Error Handling**: `catch (e: any)` → `catch (e: unknown)` 변경
  - `e instanceof Error` 체크 추가

### Refactored

- **Apps Script Code**: `var` → `const/let` 변경, 중복 코드 제거
  - `getOrCreateMatchesSheet()` 헬퍼 함수 추출
- **saveMatch()**: 명시적 에러 메시지로 변경
  - GoogleSheetsDataService에서는 `saveMatchWithNames` 사용 안내
- **package-lock.json**: v1.0.0으로 자동 동기화

### Documentation

- `README.md`: Google Sheets Mode 섹션 추가, 기술 스택 업데이트
- `HISTORY.md`: v1.0.0 릴리스 노트 추가
- `TODO.md`: 완료된 항목 체크, v1.1.0 로드맵 추가
- `CHANGELOG.md`: 표준 체인지로그 파일 생성

---

## [0.9.2] - 2025-01-01

### Fixed
- Gemini AI의 코드 리뷰 피드백 적용
- 타입 안전성 개선
- 에러 핸들링 강화

---

## [0.9.1] - 2024-12-31

### Added
- Cloud Mode 선택 시 Session Manager 모달 즉시 표시
- "Start Session" 클릭 시 5명의 기본 플레이어 자동 생성 (병렬 처리)
- 세션 생성/로드 후 Player 탭으로 자동 이동

### Changed
- Session Manager를 App 레벨 모달로 이동
- `CloudSessionManager`에 `onSessionReady` 콜백 추가
- `startCloudSession()` Promise.all 병렬 처리로 성능 개선

### Fixed
- **Critical Bug #16**: Global List에서 플레이어 추가 시 `active: false`로 설정되어 매치 생성 불가 문제
- `addPlayer()`에서 Session 추가 시 `active: true` 강제 설정

---

## [0.9.0] - 2024-12-30

### Added
- **Cloud Mode**: Supabase 연동 (Dual Mode 아키텍처)
- 세션, 플레이어, 매치 데이터 클라우드 동기화
- **Enhanced Stats**: Recharts 차트, Best Partnerships 분석
- 글로벌 플레이어 목록 불러오기

### Fixed
- 통계 데이터 초기화 문제 (Stats Auto-Healing)
- 데이터 부족 시 차트 Empty State

### Changed
- DataService 패턴 도입 (로컬/클라우드 로직 분리)
- supabase_schema.sql 정의

---

## [0.8.0] - 2024-12-29

### Added
- 라운드 로빈 로직
- 휴식 순환 알고리즘
- 드래그 앤 드롭 순서 변경

### Changed
- 매치메이킹 알고리즘 전면 개선
- 모바일 터치 이벤트 최적화

---

## [0.7.0] - 2024-12-28

### Added
- 상세 통계 (승률, 게임 득실)
- 파트너십 분석
- Gemini AI 코치 연동

---

## [0.6.0] - 2024-12-27

### Added
- 매치 스케줄링 (대기 큐)
- 점수 입력 시스템
- 실행 취소 기능

---

## [0.5.0] - 2024-12-26

### Added
- 플레이어 추가/삭제
- 활성/비활성 토글
- LocalStorage 영속성

---

## [0.1.0] - 2024-12-25

### Added
- 초기 프로젝트 세팅
- React + TypeScript 기반
- 기본 플레이어 관리
- 모바일 반응형 디자인

---

## Versioning

Tennis Mate follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (X.0.0): 호환되지 않는 API 변경
- **MINOR** (0.X.0): 하위 호환 가능한 기능 추가
- **PATCH** (0.0.X): 하위 호환 가능한 버그 수정

---

[1.0.0]: https://github.com/HouuYa/tennis-mate/releases/tag/v1.0.0
[0.9.2]: https://github.com/HouuYa/tennis-mate/releases/tag/v0.9.2
[0.9.1]: https://github.com/HouuYa/tennis-mate/releases/tag/v0.9.1
[0.9.0]: https://github.com/HouuYa/tennis-mate/releases/tag/v0.9.0
[0.8.0]: https://github.com/HouuYa/tennis-mate/releases/tag/v0.8.0
[0.7.0]: https://github.com/HouuYa/tennis-mate/releases/tag/v0.7.0
[0.6.0]: https://github.com/HouuYa/tennis-mate/releases/tag/v0.6.0
[0.5.0]: https://github.com/HouuYa/tennis-mate/releases/tag/v0.5.0
[0.1.0]: https://github.com/HouuYa/tennis-mate/releases/tag/v0.1.0
