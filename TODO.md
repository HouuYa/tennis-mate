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

## 🔜 v1.2.0 - Core Features Enhancement (예정)

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

## 🎯 v1.2.0 - Multi-Court & Advanced Features (예정)

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
