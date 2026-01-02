# Tennis Mate (테니스 메이트)

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-brightgreen)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Gemini](https://img.shields.io/badge/AI-Gemini%20Pro-8E75B2?logo=google)
![License](https://img.shields.io/badge/License-MIT-green)

**모바일 환경에 최적화된 테니스 매치 매니저**
<br/>
공정한 로테이션, 직관적인 매치 큐(Queue), AI 코칭, 그리고 3가지 저장소 옵션을 제공합니다.

[데모 보기](https://github.com/HouuYa/tennis-mate) | [변경 내역](./HISTORY.md) | [아키텍처](./ARCHITECTURE.md) | [로드맵](./TODO.md)

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
- **Head-to-Head Analysis** (NEW in v1.0.0!):
  - 두 선수 간 직접 대결 전적 비교
  - 승/무/패 통계 및 승률 시각화
  - 라이벌 관계 분석

### 5. 🤖 AI 코치 (Powered by Gemini)
- **매치 분석**: Google Gemini API로 경기 데이터 분석
- **인사이트 제공**: MVP, 최고 파트너, 승률 분석을 자연어로 브리핑

---

## 🛠 기술 스택 (Tech Stack)

| 분류 | 기술 |
|------|------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6 |
| **Styling** | Tailwind CSS, Lucide Icons |
| **State** | Context API |
| **Storage** | LocalStorage (Guest) / Google Sheets (BYODB) / Supabase (Cloud) |
| **Backend** | Google Apps Script (Sheets Mode), Supabase Postgres (Cloud Mode) |
| **AI** | Google Gemini API (@google/genai) |
| **Deploy** | GitHub Pages / Vercel (Static Hosting) |

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

### 3. 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173` 접속

---

## 📊 Google Sheets Mode 설정 가이드

### 준비물
- Google 계정
- 5분의 시간

### 설정 방법
1. **앱에서 "Google Sheets Mode" 선택**
2. **"설정 가이드 보기" 버튼 클릭**
3. **6단계 가이드 따라하기**:
   - 새 Google Sheet 생성
   - Apps Script 에디터 열기
   - 제공된 코드 복사 & 붙여넣기
   - Web App으로 배포
   - Web App URL 복사
   - Tennis Mate에 URL 입력 & 연결 테스트
4. "End Session" 클릭 시 모든 데이터가 Google Sheets에 일괄 저장 (Batch Save)

## 🛠 Google Sheets Backend Setup (Google Apps Script)

PC에서 수동으로 설정하려면 아래 코드를 사용하세요:

```javascript
// Tennis Mate - Google Sheets Backend
function getOrCreateMatchesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Matches');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Matches');
    sheet.appendRow(['timestamp', 'date', 'duration', 'winner1', 'winner2', 'loser1', 'loser2', 'score', 'winner_score', 'loser_score', 'location']);
  }
  return sheet;
}

function doGet(e) {
  const sheet = getOrCreateMatchesSheet();
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  const recentRows = rows.slice(-100).reverse();
  return ContentService.createTextOutput(JSON.stringify(recentRows)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = getOrCreateMatchesSheet();
  const params = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(),
    params.date,
    params.duration,
    params.winner1,
    params.winner2,
    params.loser1,
    params.loser2,
    params.score,
    params.winner_score,
    params.loser_score,
    params.location
  ]);
  return ContentService.createTextOutput(JSON.stringify({result: 'success'})).setMimeType(ContentService.MimeType.JSON);
}
```

### 배포 방법 (Deployment)
1. **Google Sheet** 생성 및 이름 연동.
2. **Extensions > Apps Script** 클릭.
3. 위 코드를 붙여넣고 저장.
4. **Deploy > New deployment** 클릭.
5. 타입 선택: **Web app**.
6. 설정: **Execute as: Me**, **Who has access: Anyone**.
7. 배포 후 생성된 **Web App URL**을 Tennis Mate 앱에 입력.

### 데이터 구조
Google Sheet에는 다음 열이 자동으로 생성됩니다:
```
timestamp | date | duration | winner1 | winner2 | loser1 | loser2 | score | location
```

---

## 📝 로드맵

### ✅ v1.0.0 MVP (완료)
- [x] 3가지 저장소 모드 (Guest/Sheets/Cloud)
- [x] Google Sheets Mode 전체 구현
- [x] Head-to-Head 라이벌 분석
- [x] Best Partnerships 분석
- [x] 4~8인 로테이션 및 매치메이킹
- [x] AI 코치 (Gemini)
- [x] 클라우드 세션 관리

### 🔜 v1.1.0 (예정)
- [ ] 다중 코트 지원 (2개 코트 동시 진행)
- [ ] Tie-break 스코어 지원 (7-6 (4) 형식)
- [ ] 플레이어 아바타 업로드
- [ ] 한글 주소 지원 (Kakao/Naver Map API)

### 🔮 v2.0.0 (미래)
- [ ] 실시간 동기화 (WebSocket)
- [ ] 팀 대항전 모드
- [ ] 토너먼트 브라켓 생성
- [ ] 모바일 앱 (React Native)

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

이슈 및 버그 리포트: [Issues](https://github.com/HouuYa/tennis-mate/issues)

---

<div align="center">

**Tennis Mate v1.0.0**

Made with ❤️ & 🎾 by [HouuYa](https://github.com/HouuYa)

</div>
