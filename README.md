# Tennis Mate (테니스 메이트)

<div align="center">

![Version](https://img.shields.io/badge/version-2.1.0-brightgreen)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Gemini](https://img.shields.io/badge/AI-Gemini%20Pro-8E75B2?logo=google)
![License](https://img.shields.io/badge/License-MIT-green)

**모바일 환경에 최적화된 테니스 매치 매니저**
<br/>
This project serves as a sandbox for experimenting with [the rule-grounded RAG system](https://github.com/HouuYa/Tennis_Rules_RAG) using Supabase as the operational backbone.

공정한 로테이션, 직관적인 매치 큐(Queue), AI 코칭, 그리고 3가지 저장소 옵션을 제공합니다.

[앱 보기](https://tennis-scoring-mate.netlify.app/) | [배포 가이드](./DEPLOYMENT.md) | [변경 내역](./HISTORY.md) | [아키텍처](./ARCHITECTURE.md) | [로드맵](./TODO.md)

</div>

---

## 📖 개요 (Overview)

**Tennis Mate**는 테니스 클럽 모임에서 복잡한 경기 순서와 점수 기록을 간편하게 관리하기 위해 만들어진 웹 애플리케이션입니다.

**v1.0.0 MVP**에서는 3가지 저장소 모드를 제공하여 사용자가 원하는 방식으로 데이터를 관리할 수 있습니다:
- **Guest Mode**: 로컬 스토리지 (서버 없음)
- **Google Sheets Mode** (NEW!): 내 구글 시트를 DB로 사용 (BYODB)
- **Cloud Mode**: Supabase 클라우드 저장소

라운드 로빈 로직을 통해 4인부터 8인까지 플레이어의 공정한 파트너 매칭을 해줍니다.

---

## 🚀 주요 기능 (Key Features)

### 1. 💾 3가지 저장소 모드
![최초 화면](./files/front_image%20260211.png)


#### 🧑 Guest Mode (Local Storage)
- **특징**: 서버 없이 브라우저에 저장
- **장점**: 즉시 시작, 설정 불필요
- **적합**: 개인 사용, 단일 디바이스

#### 📊 Google Sheets Mode (BYODB - NEW in v1.0.0!)
- **특징**: 내 구글 시트를 데이터베이스로 사용
- **장점**:
  - 완전한 데이터 소유권
  - 무료 무제한 저장
  - Excel/CSV 언제든지 내보내기
  - 최근 100경기 자동 동기화
  - **Batch Save**: 세션 종료 시 모든 경기를 한 번에 저장 (속도 & 안정성 개선)
- **설정**: 단계별 가이드 제공 (Google Apps Script 배포)
- **적합**: 데이터 통제가 중요한 사용자

#### ☁️ Cloud Mode (Supabase)
- **특징**: Supabase 클라우드 DB 사용
- **장점**: 멀티 디바이스 동기화, 세션 관리
- **적합**: 팀 공유, 다중 디바이스 사용

### 2. 📅 스마트 세션 플래닝 & 로테이션
- **자동 대진표 생성**: 플레이어 수(4~8명)에 맞춰 Round Robin 조합 자동 생성
- **공정한 휴식 로직**: 누구도 연속으로 쉬거나 불공평하게 경기하지 않도록 관리
- **순서 편집**: 드래그 앤 드롭으로 대기 순서 수동 조정 (모바일 최적화)

### 3. 🎾 통합 매치 스케줄링
- **타임라인 뷰**: [과거 경기] → [현재 경기] → [대기 큐]를 한 화면에서 확인
- **실행 취소 (Undo)**: 실수로 종료한 경기를 되돌려 점수 수정 가능
- **스케줄 보호**: 대기 중인 경기 덮어쓰기 방지 경고

### 4. 📊 고급 통계 및 분석
- **리더보드**: 승률, 포인트, 게임 득실 등 상세 통계
- **Best Partnerships**: 승률이 높은 파트너 조합 자동 분석
- **Head-to-Head Analysis**: 두 선수 간 직접 대결 전적 비교, 승/무/패 통계 및 승률 시각화
- **Advanced Analytics** (NEW in v2.1.0!):
  - 데이터 소스 선택: 현재 세션(Session) / 전체 기록(All-Time, Supabase DB)
  - Win Rate Trend 차트 (Recharts AreaChart)
  - Best Partners, Rival Stats 동적 분석

### 5. 🤖 AI 코치 (Powered by Gemini)
![AI 코치 메뉴 위치](./files/ai%20coach%202.png)


- **동적 모델 선택**:
  - Gemini API에서 실시간으로 사용 가능한 모델 목록 자동 조회
  - Preview·Gemma 등 불안정 모델 자동 필터링
  - Deprecated 모델 🟡 / 종료 임박(90일) 모델 🟠 시각적 표시
  - API 키 없을 때는 정적 폴백 목록 사용
- **2단계 API 키 설정**:
  - Step 1: API 키 입력 → 유효성 검증
  - Step 2: 검증 완료 후 동적 모델 목록에서 선택 → 저장
  - 채팅 헤더 "키 변경" 버튼으로 언제든 재설정 가능
- **컴팩트 디자인**:
  - 기본적으로 작은 버튼만 표시 (공간 효율성 향상)
  - 클릭하여 확장/축소 가능
  - Progressive Disclosure: 필요한 기능만 단계적으로 표시
- **매치 분석**:
  - Google Gemini API로 경기 데이터 분석
  - MVP, 최고 파트너, 승률 분석을 자연어로 브리핑
  - 독립 모달로 분리되어 더 나은 사용자 경험
- **테니스 규칙 질문**:
  - RAG (Retrieval-Augmented Generation) 시스템
  - 테니스 규칙 PDF 기반 AI 검색
  - 영어/한글 규칙 문서 지원
  - 출처 표시 및 유사도 점수
  - 채팅 인터페이스로 자유로운 질문

---

## 🛠 기술 스택 (Tech Stack)

| 분류 | 기술 |
|------|------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6 |
| **Styling** | Tailwind CSS, Lucide Icons |
| **Charts** | Recharts (AreaChart, Win Rate Trend) |
| **State** | Context API |
| **Storage** | LocalStorage (Guest) / Google Sheets (BYODB) / Supabase (Cloud) |
| **Backend** | Google Apps Script (Sheets Mode), Supabase Postgres (Cloud Mode) |
| **AI** | Google Gemini API (@google/genai), RAG with pgvector |
| **Vector DB** | Supabase pgvector (Tennis Rules Search) |
| **Deploy** | Netlify (with Serverless Functions) |

---

## 🏗 아키텍처 (Architecture)

Tennis Mate는 **Multi-Backend Architecture**를 채택했습니다.

### 핵심 패턴
- **DataService Interface**: 3가지 모드 모두 동일한 인터페이스 구현
- **Mode Switching**: 앱 시작 시 사용자가 모드 선택
- **Client-Side Analytics**: 모든 통계는 클라이언트에서 계산

### 데이터 흐름
```
User Action → AppContext → DataService (Local/Sheets/Cloud) → Storage
```

자세한 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.

---

## ⚡ 시작하기 (Getting Started)

### 1. 설치
```bash
git clone https://github.com/HouuYa/tennis-mate.git
cd tennis-mate
npm install
```

### 2. 환경 변수 설정 (선택 사항)

#### AI 기능 사용 시
`.env` 파일을 생성하고 Gemini API 키를 입력합니다.
```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

#### Cloud Mode 사용 시
Supabase 프로젝트 설정이 필요합니다.
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Admin Dashboard 사용 시 (v1.3.1+)
Netlify 환경변수에 설정합니다 (서버사이드 인증, 클라이언트 번들에 미포함).

**필수 환경변수 (서버사이드):**
```bash
ADMIN_ID=admin
ADMIN_PASSWORD=<strong_password>
ADMIN_JWT_SECRET=<random_32char_string>
```

**JWT Secret 생성:**
```bash
# Mac/Linux
openssl rand -base64 32

# Windows (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **중요**: `VITE_` 접두사가 없으므로 서버사이드에서만 접근 가능합니다.
> 로컬 개발 시 `netlify dev`로 실행해야 Admin 로그인이 작동합니다.
> 자세한 배포 가이드: [DEPLOYMENT.md](./DEPLOYMENT.md)

### 3. 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173` 접속

---

### 설정 가이드 (Setup Guides)

#### Google Sheets Mode
- 🇰🇷 [한국어 설정 가이드 (Korean)](./GOOGLE_SHEETS_SETUP_GUIDE_KO.md)
- 🇺🇸 [English Setup Guide](./GOOGLE_SHEETS_SETUP_GUIDE_EN.md)

#### AI Coach RAG System (관리자용)
- 🇰🇷 [테니스 규칙 RAG 설정 가이드](./RAG_SETUP_GUIDE_KO.md)

### 요약 (Quick Start)
1. **앱에서 "Google Sheets Mode" 선택**
2. **"설정 가이드 보기" 버튼 클릭**
3. **가이드 따라하기**:
   - ⚙️ 톱니바퀴 아이콘 -> **Web app** 선택
   - ⚠️ 필수 설정: **Execute as: Me**, **Who has access: Anyone**
   - 생성된 **Web App URL**을 Tennis Mate 앱에 입력
4. "End Session" 클릭 시 모든 데이터가 Google Sheets에 일괄 저장 (Batch Save)

## 🛠 Google Sheets Backend Setup
자세한 설정 방법과 코드는 아래 가이드를 참고하세요:
- [한국어 가이드](./GOOGLE_SHEETS_SETUP_GUIDE_KO.md)
- [English Guide](./GOOGLE_SHEETS_SETUP_GUIDE_EN.md)

---

## 📝 로드맵

### ✅ v1.1.0 (완료 - 2026-01-06)
- [x] 3가지 저장소 모드 (Guest/Sheets/Cloud)
- [x] Google Sheets Mode 전체 구현
- [x] Head-to-Head 라이벌 분석
- [x] Best Partnerships 분석
- [x] 4~8인 로테이션 및 매치메이킹
- [x] AI 코치 (Gemini)
- [x] 클라우드 세션 관리

### ✅ v1.1.1 (완료 - 2026-01-07)
- [x] Guest Mode 세션 관리자 추가
- [x] 모든 모드 "Back to Mode Selection" 하단 통일
- [x] 페이지 새로고침 시 모드 유지
- [x] ModeSelection 한국어 설명 추가
- [x] GoogleSheetsGuide 스크린샷 이미지 추가

### ✅ v1.2.0 (완료 - 2026-01-14)
- [x] AI Coach UI/UX 대폭 개선
  - [x] 컴팩트하고 접을 수 있는 디자인
  - [x] Progressive Disclosure UX
  - [x] 독립 모달 컴포넌트 (StatsAnalysisModal, TennisRulesChatModal)
- [x] AI Coach RAG 시스템 구현
  - [x] 테니스 규칙 PDF 검색 기능
  - [x] Python ETL 파이프라인
  - [x] pgvector 기반 유사도 검색
  - [x] Edge Function 배포
  - [x] RAG 설정 가이드 작성
- [x] Type Safety 개선 (ChatMessageSource interface 분리)

### ✅ v1.3.0 (완료 - 2026-02-16)
- [x] Cloud Mode Admin Dashboard
  - [x] Admin 인증 (환경변수 기반, Supabase Auth 미사용)
  - [x] Pending Operations 패턴 (Undo/Commit 일괄 처리)
  - [x] Player 관리 (이름 변경, 삭제, 중복 병합)
  - [x] Session/Match 관리 (위치/점수 편집, 삭제)
  - [x] Quick Entry (경기 빠른 입력)
- [x] Supabase RLS 진단 도구
  - [x] SELECT/INSERT/UPDATE/DELETE 자동 테스트
  - [x] RLS 차단 감지 (.select() 체이닝)
- [x] AdminETLPage (테니스 규칙 PDF ETL 관리)
- [x] Player 삭제 복원 리스트
- [x] Score 리셋 버그 수정

### ✅ v1.4.0 / v2.0.0 (완료 - 2026-02-19)
- [x] 동적 Gemini 모델 선택 (실시간 API 조회, 자동 필터링)
- [x] 2단계 API 키 설정 UX (키 입력 → 모델 선택)
- [x] 채팅 헤더 "키 변경" 버튼
- [x] ModelSwitcher Deprecated / Near-EOL 배지
- [x] 코드 정리 (미사용 import, console.log, 중복 타입)
- [x] recharts 제거 (당시 미사용) → v2.1.0에서 기능 추가와 함께 재도입

### ✅ v2.1.0 (완료 - 2026-03-02)
- [x] Advanced Analytics 데이터 소스 선택 (Session / All-Time Supabase DB)
- [x] Recharts AreaChart 도입 (Win Rate Trend 차트)
- [x] LocationPicker Supabase 드롭다운으로 개선 (모바일 UI 수정)
- [x] StatsView UI 동선 개선 (Advanced Analytics 최우선 배치)
- [x] 보안 수정 — UUID injection 방지 (`getPlayerMatches`)
- [x] 성능 최적화 — 중복 `getAllPlayers()` 호출 조건부 처리
- [x] 버그 수정 — Supabase 환경변수 미설정 시 앱 크래시

### 🔮 v3.0.0 (장기)
- [ ] 다중 코트 지원 (2개 코트 동시 진행)
- [ ] Tie-break 스코어 지원 (7-6 (4) 형식)
- [ ] 실시간 동기화 (WebSocket)
- [ ] 팀 대항전 모드
- [ ] 토너먼트 브라켓 생성
- [ ] 모바일 앱 (React Native)
- [ ] 플레이어 아바타 업로드

더 자세한 계획은 [TODO.md](./TODO.md)에서 확인하세요.

---

## 🤝 기여하기 (Contributing)

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 라이선스 (License)

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

## 📧 문의 (Contact)

프로젝트 링크: [https://github.com/HouuYa/tennis-mate](https://github.com/HouuYa/tennis-mate)

웹앱 링크: [https://tennis-scoring-mate.netlify.app](https://tennis-scoring-mate.netlify.app)

테니스 규칙 웹앱 링크 : [https://tennis-rules-rag.netlify.app/tennis_chat](https://tennis-rules-rag.netlify.app/tennis_chat)

이슈 및 버그 리포트: [Issues](https://github.com/HouuYa/tennis-mate/issues)

---

<div align="center">

**Tennis Mate v2.1.0**

Made with ❤️ & 🎾 by [HouuYa](https://github.com/HouuYa)

</div>
