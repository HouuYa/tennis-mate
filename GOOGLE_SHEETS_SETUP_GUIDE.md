# 🎾 Tennis Mate - Google Sheets 연동 설정 가이드

> **초보자를 위한 완벽 가이드**: 코딩 지식이 전혀 없어도 따라하실 수 있습니다!
> **소요 시간**: 약 5-10분

---

## 📌 목차

1. [왜 Google Sheets와 연동해야 하나요?](#1-왜-google-sheets와-연동해야-하나요)
2. [작동 원리 (쉽게 설명)](#2-작동-원리-쉽게-설명)
3. [단계별 설정 가이드](#3-단계별-설정-가이드)
4. [연결 테스트 및 사용 시작](#4-연결-테스트-및-사용-시작)
5. [문제 해결 (FAQ)](#5-문제-해결-faq)

---

## 1. 왜 Google Sheets와 연동해야 하나요?

### 💾 데이터 보존의 중요성

Tennis Mate는 기본적으로 웹 브라우저에 데이터를 저장합니다. 하지만:

- ❌ 브라우저 캐시를 삭제하면 **모든 경기 기록이 사라집니다**
- ❌ 다른 기기에서는 **내 기록을 볼 수 없습니다**
- ❌ 실수로 데이터를 삭제하면 **복구가 불가능합니다**

### ✅ Google Sheets 연동의 장점

Google Sheets와 연동하면:

| 장점 | 설명 |
|-----|------|
| 🔒 **영구 보관** | Google의 안전한 서버에 자동으로 저장됩니다 |
| 📊 **데이터 활용** | 엑셀처럼 편집하고 통계를 낼 수 있습니다 |
| 🌍 **어디서나 접근** | 스마트폰, 태블릿, PC 어디서든 확인 가능 |
| 💾 **무료 무제한** | Google Drive 15GB를 무료로 활용 |
| 📥 **쉬운 내보내기** | Excel/CSV로 언제든 다운로드 가능 |
| 🔐 **완전한 소유권** | 내 Google 계정에만 저장 (외부 서버 X) |

---

## 2. 작동 원리 (쉽게 설명)

### 🏤 "디지털 우체국" 시스템

Tennis Mate 앱은 보안상 여러분의 Google Drive에 직접 접근할 권한이 없습니다.
이를 해결하기 위해 **Google Apps Script**라는 "중개인"을 활용합니다.

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Tennis Mate    │ ──1──>  │ Google Apps      │ ──2──>  │ Google Sheets   │
│  (앱)           │         │ Script           │         │ (내 시트)       │
│                 │         │ (디지털 우체국)   │         │                 │
│  편지를 씁니다   │         │ 대신 기입해줍니다 │         │ 기록이 저장됩니다│
└─────────────────┘ <──4──  └──────────────────┘ <──3──  └─────────────────┘
```

### 🔑 핵심 개념

- **Tennis Mate 앱**: 경기 기록을 작성하는 "편지 발송자"
- **Apps Script**: 편지를 받아 시트에 대신 적어주는 "우체국"
- **Web App URL**: 이 우체국의 "전용 사서함 주소"
- **Google Sheets**: 실제 경기 기록이 저장되는 "장부"

💡 **쉽게 말하면**: Tennis Mate가 경기 데이터를 우체국(Apps Script)에 보내면, 우체국이 내 시트에 대신 적어주는 시스템입니다!

---

## 3. 단계별 설정 가이드

### 준비물 ✅

- [ ] Google 계정 (Gmail)
- [ ] PC 또는 노트북 (모바일은 권장하지 않음)
- [ ] 약 5-10분의 시간

---

### 🗂️ **1단계: Google Sheets 준비**

#### 1-1. 새 시트 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. 왼쪽 상단의 **+ 빈 스프레드시트** 클릭
3. 시트 이름을 "테니스 메이트 기록" 같이 알아보기 쉽게 변경

> 💡 **기존 시트를 사용해도 되나요?**
> 네! 기존에 사용하던 시트를 그대로 사용해도 됩니다. Apps Script가 "Matches"라는 새 시트 탭을 자동으로 만들어줍니다.

#### 1-2. Apps Script 에디터 열기

1. 상단 메뉴에서 **확장 프로그램** 클릭
2. 드롭다운에서 **Apps Script** 클릭

![Apps Script 메뉴 위치](./files/step1-extensions-menu.png)
<!-- 실제 스크린샷으로 교체 필요 -->

✅ **성공 확인**: 새 탭에서 Apps Script 에디터가 열립니다.

---

### 💻 **2단계: 코드 복사 & 붙여넣기**

#### 2-1. 기존 코드 삭제

Apps Script 에디터에 다음과 같은 샘플 코드가 보일 것입니다:

```javascript
function myFunction() {

}
```

**이 코드를 전부 선택해서 삭제합니다.** (Ctrl+A → Delete)

#### 2-2. Tennis Mate 코드 붙여넣기

아래 코드를 **전체 복사**하여 붙여넣습니다:

```javascript
/* ========================================
   Tennis Mate - Google Sheets Backend
   ======================================== */

// 컬럼 위치 정의 (수정하지 마세요!)
const COLS = {
  TIMESTAMP: 0,    // A열: 기록 시각
  DATE: 1,         // B열: 경기 날짜
  DURATION: 2,     // C열: 경기 시간
  WINNER1: 3,      // D열: 승자1
  WINNER2: 4,      // E열: 승자2
  LOSER1: 5,       // F열: 패자1
  LOSER2: 6,       // G열: 패자2
  SCORE: 7,        // H열: 점수 (예: "6-4")
  WINNER_SCORE: 8, // I열: 승자 점수
  LOSER_SCORE: 9,  // J열: 패자 점수
  LOCATION: 10     // K열: 경기 장소
};

/**
 * Matches 시트를 가져오거나 없으면 자동 생성
 */
function getOrCreateMatchesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Matches');

  if (!sheet) {
    // 시트가 없으면 새로 만들고 헤더 추가
    sheet = spreadsheet.insertSheet('Matches');
    sheet.appendRow([
      'timestamp', 'date', 'duration',
      'winner1', 'winner2', 'loser1', 'loser2',
      'score', 'winner_score', 'loser_score', 'location'
    ]);

    // 헤더 행 스타일 적용
    const headerRange = sheet.getRange(1, 1, 1, 11);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
  }

  return sheet;
}

/**
 * GET 요청: 최근 100경기 데이터 반환
 * Tennis Mate가 시트를 처음 로드할 때 호출됩니다
 */
function doGet(e) {
  try {
    const sheet = getOrCreateMatchesSheet();
    const data = sheet.getDataRange().getValues();

    // 헤더 제거 (첫 번째 행)
    const rows = data.slice(1);

    // 최근 100경기만 반환 (최신순)
    const recentRows = rows.slice(-100).reverse();

    return ContentService
      .createTextOutput(JSON.stringify(recentRows))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST 요청: 새 경기 기록 추가
 * Tennis Mate가 세션 종료 시 호출됩니다
 */
function doPost(e) {
  // 동시 요청 방지를 위한 Lock
  const lock = LockService.getScriptLock();

  try {
    // 최대 10초 대기
    lock.tryLock(10000);

    if (!lock.hasLock()) {
      throw new Error('다른 요청이 처리 중입니다. 잠시 후 다시 시도하세요.');
    }

    const sheet = getOrCreateMatchesSheet();
    const params = JSON.parse(e.postData.contents);

    // 새 행 데이터 준비
    const newRow = [];
    newRow[COLS.TIMESTAMP] = new Date();
    newRow[COLS.DATE] = params.date || '';
    newRow[COLS.DURATION] = params.duration || 0;
    newRow[COLS.WINNER1] = params.winner1 || '';
    newRow[COLS.WINNER2] = params.winner2 || '';
    newRow[COLS.LOSER1] = params.loser1 || '';
    newRow[COLS.LOSER2] = params.loser2 || '';
    newRow[COLS.SCORE] = params.score || '';
    newRow[COLS.WINNER_SCORE] = params.winner_score || 0;
    newRow[COLS.LOSER_SCORE] = params.loser_score || 0;
    newRow[COLS.LOCATION] = params.location || '';

    // 시트에 행 추가
    sheet.appendRow(newRow);

    return ContentService
      .createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    // Lock 해제
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}
```

#### 2-3. 코드 저장

1. **Ctrl+S** (Mac: Cmd+S) 또는 상단의 💾 **저장** 아이콘 클릭
2. 프로젝트 이름을 입력하라는 창이 뜨면 "Tennis Mate Backend"라고 입력
3. **확인** 클릭

![코드 저장 확인](./files/step2-save-code.png)
<!-- 실제 스크린샷으로 교체 필요 -->

> 💡 **코드를 이해할 필요는 없습니다!**
> 이 코드는 Tennis Mate와 Google Sheets 사이의 다리 역할을 합니다.
> 복사/붙여넣기만 정확히 하시면 됩니다!

---

### 🚀 **3단계: Web App으로 배포** (가장 중요!)

이 단계가 **가장 중요**합니다. 천천히 따라해주세요!

#### 3-1. 배포 메뉴 열기

1. Apps Script 에디터 **오른쪽 상단**의 **배포** 버튼 클릭
2. 드롭다운에서 **새 배포** 선택

![배포 메뉴](./files/step3-deploy-menu.png)
<!-- 실제 스크린샷으로 교체 필요 -->

#### 3-2. 배포 유형 선택

1. 배포 화면 **왼쪽 상단**의 **⚙️ 톱니바퀴 아이콘** ("유형 선택") 클릭
2. **웹 앱** 선택

![웹 앱 선택](./files/step3-select-web-app.png)
<!-- 실제 스크린샷으로 교체 필요 -->

#### 3-3. 중요 설정 (실수하기 쉬운 부분!)

배포 설정 화면에서 다음을 정확히 입력하세요:

| 항목 | 설정값 | 설명 |
|-----|--------|------|
| **설명** | "Tennis Mate 연동 v1" | 배포 버전 구분용 (원하는 대로 입력) |
| **다음 사용자로 실행** | **나 (내 이메일)** | 기본값 그대로 유지 |
| **액세스 권한이 있는 사용자** | ⚠️ **모든 사람** | **필수! 반드시 변경하세요** |

![배포 설정](./files/step3-deployment-settings.png)
<!-- 실제 스크린샷으로 교체 필요 -->

> ⚠️ **매우 중요!**
> "액세스 권한이 있는 사용자"를 **반드시 "모든 사람"**으로 설정하세요!
> "나"로 설정하면 Tennis Mate 앱이 접근할 수 없습니다.

#### 3-4. 권한 승인 (처음 한 번만)

1. **배포** 버튼 클릭
2. "권한 승인 필요" 경고창이 뜰 수 있습니다 → **액세스 승인** 클릭
3. Google 계정 선택
4. "Google에서 확인하지 않은 앱" 경고가 뜨면:
   - **고급** 클릭
   - **Tennis Mate Backend(으)로 이동 (안전하지 않음)** 클릭
   - **허용** 클릭

![권한 승인 과정](./files/step3-authorization.png)
<!-- 실제 스크린샷으로 교체 필요 -->

> 💡 **"안전하지 않음"이 왜 뜨나요?**
> 이 앱은 Google의 정식 심사를 받지 않은 개인 스크립트이기 때문입니다.
> 하지만 **내가 직접 만든 스크립트**이므로 안전합니다!

#### 3-5. Web App URL 복사

권한 승인이 완료되면:

1. "새 배포가 생성되었습니다" 메시지가 나타납니다
2. 아래와 같은 형식의 **Web App URL**이 표시됩니다:

```
https://script.google.com/macros/s/AKfycbz...xyz123/exec
```

3. URL 옆의 **📋 복사** 버튼을 클릭하여 복사합니다

![Web App URL 복사](./files/step3-copy-url.png)
<!-- 실제 스크린샷으로 교체 필요 -->

✅ **성공 확인**: 클립보드에 `https://script.google.com/macros/s/...` 형식의 URL이 복사되었습니다!

---

## 4. 연결 테스트 및 사용 시작

### 🔗 **4단계: Tennis Mate에 URL 등록**

1. Tennis Mate 앱으로 돌아갑니다
2. **모드 선택** 화면에서 **📊 Google Sheets Mode** 클릭
3. **설정** 화면이 나타나면:
   - Web App URL 입력란에 복사한 URL **붙여넣기** (Ctrl+V)
   - **연결 테스트** 버튼 클릭

![Tennis Mate URL 입력](./files/step4-tennis-mate-setup.png)
<!-- 실제 스크린샷으로 교체 필요 -->

### ✅ **5단계: 연결 확인**

**연결 성공 시**:
- ✅ "Connection successful!" 메시지
- Google Sheets에서 최근 100경기 데이터 자동 로드
- 선수 목록이 표시됩니다

**처음 연결 시 (빈 시트)**:
- ✅ "연결 성공" 메시지는 뜨지만 선수가 없을 수 있습니다
- **"새 세션 시작"** 버튼 클릭
- 샘플 선수 5명 (Nadal, Federer 등) 자동 생성

---

### 🎾 **6단계: 사용 시작!**

이제 모든 준비가 끝났습니다! 🎉

#### Tennis Mate 사용법

1. **Players 탭**: 선수 추가/편집
2. **Match 탭**: 경기 생성 및 점수 입력
3. **Stats 탭**: 통계 및 리더보드 확인
4. **세션 종료**: "End Session" 클릭 시 모든 경기가 Google Sheets에 **일괄 저장**

#### Google Sheets에서 확인

1. Google Sheets로 돌아가기
2. **"Matches"** 탭 클릭
3. 경기 기록이 행별로 저장된 것을 확인!

![저장된 데이터 예시](./files/step6-saved-data.png)
<!-- 실제 스크린샷으로 교체 필요 -->

---

## 5. 문제 해결 (FAQ)

### 🔧 자주 발생하는 문제

#### ❌ Q1. "Invalid response format" 오류가 발생합니다

**원인**: 코드를 수정한 후 **새 배포**를 하지 않았을 때 발생합니다.

**해결책**:
1. Apps Script 에디터로 돌아가기
2. **배포** → **새 배포** (기존 배포가 아닌!)
3. 새로 생성된 URL을 Tennis Mate에 입력

> 💡 **중요**: "저장"만 하면 안 됩니다! 반드시 **"새 배포"**를 해야 합니다.

---

#### ❌ Q2. "Connection Failed" / "403 Forbidden" 오류

**원인**: "액세스 권한이 있는 사용자" 설정이 "나"로 되어 있을 때 발생합니다.

**해결책**:
1. Apps Script 에디터 → **배포** → **배포 관리**
2. 기존 배포의 **✏️ 수정** 아이콘 클릭
3. "액세스 권한이 있는 사용자"를 **"모든 사람"**으로 변경
4. **새 버전 배포** 클릭
5. 새 URL을 복사하여 Tennis Mate에 입력

![액세스 권한 수정](./files/faq-access-permission.png)
<!-- 실제 스크린샷으로 교체 필요 -->

---

#### ❌ Q3. "연결 성공" 메시지 후 화면이 멈춰요

**원인**: 새 시트라서 데이터가 비어있을 때 발생합니다.

**해결책**:
1. **"Start New Session"** 버튼 클릭
2. 샘플 선수 5명이 자동 생성됩니다
3. 이제 정상적으로 사용 가능!

---

#### ❌ Q4. 기존 시트의 데이터를 지워야 하나요?

**답변**: 아니요! 지울 필요 없습니다.

- Apps Script는 **"Matches"**라는 새 시트 탭을 자동으로 만듭니다
- 기존 데이터는 그대로 유지됩니다
- Tennis Mate 데이터는 "Matches" 탭에만 저장됩니다

---

#### ❌ Q5. URL을 잃어버렸어요! 어떻게 찾나요?

**해결책**:
1. Google Sheets 열기
2. **확장 프로그램** → **Apps Script**
3. **배포** → **배포 관리**
4. 기존 배포의 URL을 복사

![URL 재확인](./files/faq-find-url.png)
<!-- 실제 스크린샷으로 교체 필요 -->

---

#### ❌ Q6. 저장이 느려요 / "Saving..." 화면이 오래 떠요

**원인**: Google Apps Script는 동시 요청을 처리하는 데 시간이 걸립니다.

**해결책**:
- Tennis Mate는 세션 종료 시 **일괄 저장 (Batch Save)**을 사용합니다
- 경기가 많을수록 저장 시간이 길어질 수 있습니다 (보통 5-15초)
- "Saving..." 화면이 뜰 때는 **기다려주세요** (창을 닫지 마세요!)
- 저장이 완료되면 자동으로 완료 메시지가 표시됩니다

---

#### ❌ Q7. 여러 기기에서 동시에 사용할 수 있나요?

**답변**: 가능하지만 권장하지 않습니다.

- Google Sheets Mode는 **실시간 동기화**를 지원하지 않습니다
- 동시에 여러 기기에서 사용하면 **데이터 충돌**이 발생할 수 있습니다
- **권장**: 한 기기에서만 경기를 진행하고, 다른 기기에서는 조회만 하세요

> 💡 **실시간 동기화가 필요하면**: Cloud Mode (Supabase)를 사용하세요!

---

## 📚 추가 자료

### 📖 관련 문서

- [Tennis Mate README](./README.md) - 전체 프로젝트 개요
- [아키텍처 가이드](./ARCHITECTURE.md) - 기술적 설명
- [변경 내역](./HISTORY.md) - 버전별 업데이트
- [로드맵](./TODO.md) - 향후 계획

### 🔗 외부 링크

- [Google Apps Script 공식 문서](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)

---

## 🎉 완료!

축하합니다! 이제 Tennis Mate의 모든 경기 기록이 안전하게 Google Sheets에 저장됩니다! 🎾

### 다음 단계

1. 선수를 추가하고 경기를 시작하세요
2. 세션이 끝나면 "End Session"을 클릭하여 저장하세요
3. Google Sheets에서 언제든 데이터를 확인하세요
4. Excel/CSV로 내보내서 추가 분석도 가능합니다!

---

**문의 및 지원**: [GitHub Issues](https://github.com/HouuYa/tennis-mate/issues)

**Made with ❤️ & 🎾 by Tennis Mate Team**
