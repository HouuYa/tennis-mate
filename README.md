# Tennis Mate (테니스 메이트)

<div align="center">

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Gemini](https://img.shields.io/badge/AI-Gemini%20Pro-8E75B2?logo=google)
![License](https://img.shields.io/badge/License-MIT-green)

**모바일 환경에 최적화된 서버리스 테니스 매치 매니저**
<br/>
공정한 로테이션, 직관적인 매치 큐(Queue), 그리고 AI 코칭을 제공합니다.

[데모 보기](https://github.com/HouuYa/tennis-mate) | [변경 내역](./HISTORY.md) | [아키텍처](./ARCHITECTURE.md) | [로드맵](./TODO.md)

</div>

---

## 📖 개요 (Overview)

**Tennis Mate**는 테니스 클럽 모임에서 복잡한 경기 순서와 점수 기록을 간편하게 관리하기 위해 만들어진 웹 애플리케이션입니다.

백엔드 서버 없이 URL 공유만으로 상태를 동기화하며, 
라운드 로빈 로직을 통해 4인부터 8인까지 플레이어의 공정한 파트너 매칭을 해줍니다.

---

## 🚀 주요 기능 (Key Features)

### 1. 📅 스마트 세션 플래닝 & 로테이션
- **자동 대진표 생성 (Session Planner):** 플레이어 수(4~5명)에 맞춰 가장 이상적인 파트너 조합(Round Robin)을 자동으로 생성합니다.
- **공정한 휴식 로직:** `(총 인원 - 1) - (경기 수 % 총 인원)` 공식을 통해 누구도 연속으로 쉬거나 불공평하게 경기를 하지 않도록 관리합니다.
- **순서 편집 (Edit Order):** 드래그 앤 드롭 또는 화살표 버튼을 이용해 대기 순서를 수동으로 직관적으로 변경할 수 있습니다 (모바일 터치 최적화).

### 2. 🎾 통합 매치 스케줄링 (Unified View)
- **타임라인 뷰:** [과거 경기 결과] -> [현재 진행 중인 경기] -> [대기 중인 경기(Queue)]를 한 화면에서 연속적으로 확인합니다.
- **실행 취소 (Undo):** 실수로 경기를 종료했더라도, 다시 활성 상태로 되돌려 점수를 수정할 수 있습니다.
- **스케줄 보호:** 대기 중인 경기가 있을 때 새로운 일정을 생성하려 하면 경고 팝업을 띄워 데이터 유실을 방지합니다.

### 3. ☁️ 클라우드 동기화 (Cloud Mode)
- **Supabase 연동:** 로컬 저장소 외에 클라우드 데이터베이스 모드를 지원합니다.
- **멀티 디바이스:** 여러 기기에서 같은 세션을 불러와 실시간으로 결과를 공유할 수 있습니다.
- **글로벌 플레이어:** DB에 저장된 플레이어 목록을 불러와 빠르게 세션을 시작할 수 있습니다.

### 4. 📊 고급 통계 및 분석
- **시각화:** Recharts를 이용한 승률 그래프, 게임 득실 추이 등을 시각적으로 제공합니다.
- **Best Partner:** 가장 호흡이 잘 맞는 파트너 조합을 자동으로 분석해 추천합니다.

### 5. 🤖 AI 코치 (Powered by Gemini)
- **매치 분석:** Google Gemini API를 활용하여 누적된 경기 데이터를 분석합니다.
- **인사이트 제공:** 오늘의 MVP, 최고의 파트너 조합, 승률 분석 등을 자연어 형태로 브리핑해줍니다.

---

## 🛠 기술 스택 (Tech Stack)

| 분류 | 기술 |
|------|------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Recharts |
| **State** | Context API, LocalStorage (Guest Mode) |
| **Backend** | Supabase (Cloud Mode) - Postgres, RLS |
| **AI** | Google Gemini API (@google/genai) |
| **Deploy** | GitHub Pages / Vercel (Static Hosting) |

---

## 🏗 아키텍처 (Architecture)

Tennis Mate는 **Serverless & Local-First** 철학을 따릅니다.

*   **상태 관리 (State Management):**
    *   모든 데이터는 `Context API`와 `LocalStorage`로 관리되어 새로고침 후에도 유지됩니다.
    *   공유 시 데이터는 JSON 문자열로 압축되어 URL Query Parameter(`?data=...`)로 전달됩니다.
*   **매치메이킹 알고리즘:**
    *   가능한 모든 파트너 조합 중, 과거에 가장 적게 팀을 이뤘던 조합을 우선순위로 두어 다양성을 보장합니다.
    *   미래의 매치(Queue)를 미리 계산하여 UI에 보여줍니다.

자세한 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.

---

## ⚡ 시작하기 (Getting Started)

이 프로젝트는 **Serverless (Guest Mode)** 를 기본으로 지원합니다.
백엔드 설정 없이도 즉시 모든 기능을 로컬에서 사용할 수 있습니다.
옵션으로 Supabase를 연결하여 클라우드 동기화를 활성화할 수 있습니다.

1.  **설치**
    ```bash
    git clone https://github.com/HouuYa/tennis-mate.git
    cd tennis-mate
    npm install
    ```

2.  **환경 변수 설정** (AI 기능 사용 시)
    `.env` 파일을 생성하고 Gemini API 키를 입력합니다.
    ```bash
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

3.  **실행**
    ```bash
    npm run dev
    ```
    브라우저에서 `http://localhost:3000` 접속

---

## 📝 로드맵 및 이슈

현재 **Phase 1 (MVP)** 가 완료되었으며, 사용성 개선을 위한 Phase 2가 진행 중입니다.

- [x] 4인부터 8인까지 로테이션 및 순서 변경 기능
- [x] 매치 실행 취소(Undo) 기능
- [x] **Supabase 연동:** 히스토리 관리 및 클라우드 동기화 (Dual Mode)
- [x] **고급 통계:** 승률 그래프 및 파트너십 분석
- [ ] **Tie-break 지원:** '7-6 (4)' 형태의 스코어 입력
- [ ] **다중 코트 지원:** 8~10명 인원을 위한 2코트 로직
- [ ] **Auth:** 관리자 로그인 및 보안 강화 (RLS)
- [ ] **플레이어 아바타:** 사진 업로드 또는 색상 선택

더 자세한 계획은 [TODO.md](./TODO.md)에서 확인하세요.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/HouuYa">HouuYa</a>
</div>
