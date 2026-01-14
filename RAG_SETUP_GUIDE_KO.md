# 🎾 Tennis Mate - AI 테니스 규칙 도우미 설정 가이드

> **관리자를 위한 가이드**: 테니스 규칙 PDF를 AI 검색 시스템에 업로드하는 방법
> **소요 시간**: 약 30-40분 (최초 1회만)

---

## 📌 목차

1. [AI 테니스 규칙 도우미란?](#1-ai-테니스-규칙-도우미란)
2. [작동 원리 (RAG 시스템)](#2-작동-원리-rag-시스템)
3. [관리자 설정 가이드 (데이터 업로드)](#3-관리자-설정-가이드-데이터-업로드)
4. [사용자 가이드 (규칙 검색)](#4-사용자-가이드-규칙-검색)
5. [문제 해결 (FAQ)](#5-문제-해결-faq)

---

## 1. AI 테니스 규칙 도우미란?

### 🤖 기능 소개

Tennis Mate의 **AI Coach**에는 두 가지 기능이 있습니다:

| 탭 | 기능 | 설명 |
|---|------|------|
| 📊 **Analyze Stats** | 경기 통계 분석 | MVP, 팀 케미스트리, 승률 등 분석 |
| 📚 **Ask Question** | 테니스 규칙 질문 | "서브 규칙은?" 같은 질문에 AI가 답변 |

**이 가이드는** "Ask Question" 기능을 활성화하기 위한 **데이터 업로드 방법**을 설명합니다.

### ✅ 이 기능이 필요한 경우

- ✅ 사용자들이 테니스 규칙을 자주 질문하는 경우
- ✅ 공식 규칙 문서(PDF)를 AI 검색 가능하게 만들고 싶은 경우
- ✅ 한글/영어 규칙 문서를 모두 지원하고 싶은 경우

### ❌ 필수가 아닌 경우

- 경기 통계 분석 기능만 사용하는 경우 (데이터 업로드 불필요)
- 규칙 문서가 없는 경우

---

## 2. 작동 원리 (RAG 시스템)

### 🧠 RAG란?

**RAG** = **R**etrieval-**A**ugmented **G**eneration

"검색 기반 답변 생성" 시스템입니다.

```
사용자 질문: "서브 규칙은?"
       ↓
1. 질문을 AI가 이해 (임베딩)
       ↓
2. Supabase에서 관련 규칙 검색 (pgvector)
       ↓
3. 검색된 규칙을 컨텍스트로 AI가 답변 생성
       ↓
답변: "ITF 규칙 제16조에 따르면..."
```

### 🔑 핵심 구성 요소

| 구성 요소 | 역할 | 비용 |
|----------|------|------|
| **PDF 파일** | 테니스 규칙 원본 문서 (영어/한글) | 무료 |
| **Supabase** | 데이터베이스 (pgvector) | 무료 (500MB까지) |
| **Gemini API** | AI 임베딩 & 답변 생성 | 무료 (월 1500회까지) |
| **Python 스크립트** | PDF → Supabase 업로드 도구 | 무료 |

---

## 3. 관리자 설정 가이드 (데이터 업로드)

> ⚠️ **주의**: 이 설정은 **앱 관리자**만 수행하면 됩니다. 일반 사용자는 [4단계](#4-사용자-가이드-규칙-검색)로 이동하세요.

### 준비물 ✅

- [ ] Supabase 프로젝트 (무료 플랜 가능)
- [ ] 테니스 규칙 PDF 파일 (50-100 페이지, 영어/한글)
- [ ] Python 3.8 이상
- [ ] Gemini API 키 (무료)
- [ ] PC 또는 노트북
- [ ] 약 30-40분의 시간

---

### 🗂️ **1단계: Supabase 프로젝트 생성**

#### 1-1. Supabase 가입 및 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 후 무료 가입
2. **New Project** 클릭
3. 프로젝트 이름: `tennis-mate-rules` (원하는 이름)
4. Database Password 설정 (복잡하게, 꼭 저장!)
5. Region: `Northeast Asia (Seoul)` 선택
6. **Create new project** 클릭 (약 2분 소요)

✅ **성공 확인**: 프로젝트 대시보드가 열립니다.

#### 1-2. pgvector 확장 및 테이블 생성

1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 클릭
3. 아래 SQL 코드를 복사하여 붙여넣기:

```sql
-- 파일 위치: supabase/migrations/20260114_create_tennis_rules_rag.sql
-- 전체 내용을 복사하세요
```

4. **Run** 버튼 클릭 (또는 Ctrl+Enter)

✅ **성공 확인**:
- "Success. No rows returned" 메시지 표시
- 왼쪽 메뉴 **Table Editor**에서 `tennis_rules` 테이블 확인

---

### 🐍 **2단계: Python ETL 스크립트 준비**

#### 2-1. Python 환경 설정

```bash
# 터미널 또는 명령 프롬프트에서 실행
python --version  # 3.8 이상 확인

# 프로젝트 디렉토리로 이동
cd tennis-mate

# 가상환경 생성 (선택사항이지만 권장)
python -m venv venv

# 가상환경 활성화
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

#### 2-2. 패키지 설치

```bash
cd scripts
pip install -r requirements.txt
```

설치되는 패키지:
- `python-dotenv`: 환경 변수 관리
- `supabase`: Supabase Python 클라이언트
- `PyPDF2`: PDF 파일 읽기
- `google-generativeai`: Gemini API 사용

✅ **성공 확인**: 에러 없이 설치 완료

---

### 🔑 **3단계: 환경 변수 설정**

#### 3-1. Supabase 정보 가져오기

1. Supabase 대시보드에서 **Settings** → **API** 클릭
2. 다음 정보를 복사:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **service_role key**: `eyJhbGc...` (매우 긴 문자열)

> ⚠️ **중요**: `anon public` 키가 아니라 **`service_role` 키**를 사용해야 합니다!

#### 3-2. Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. **Create API key** 클릭
3. API 키 복사 (예: `AIzaSyD...`)

#### 3-3. .env 파일 생성

프로젝트 **루트 디렉토리**에 `.env` 파일을 생성하고 아래 내용 추가:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyD...
```

> 💡 **보안 주의**: `.env` 파일은 절대 Git에 커밋하지 마세요! (`.gitignore`에 이미 포함됨)

✅ **성공 확인**: `.env` 파일이 프로젝트 루트에 존재

---

### 📄 **4단계: PDF 파일 준비**

#### 4-1. PDF 파일 디렉토리 생성

```bash
# 프로젝트 루트에서 실행
mkdir tennis-rules-pdfs
```

#### 4-2. PDF 파일 복사

테니스 규칙 PDF 파일들을 `tennis-rules-pdfs/` 디렉토리에 복사합니다.

**파일명 규칙**:
- 한글 PDF: 파일명에 `한글`, `korean`, `ko`, `규칙` 포함
- 영어 PDF: 그 외 모든 파일

예시:
```
tennis-rules-pdfs/
  ├── ITF_Rules_of_Tennis_2024.pdf          (영어)
  ├── tennis_rules_korean_2024.pdf          (한글)
  └── 테니스_규칙_2024.pdf                   (한글)
```

✅ **성공 확인**: PDF 파일이 `tennis-rules-pdfs/` 디렉토리에 존재

---

### 🚀 **5단계: ETL 스크립트 실행**

#### 5-1. 스크립트 실행

```bash
# 프로젝트 루트에서 실행
python scripts/upload_tennis_rules.py --pdf-dir ./tennis-rules-pdfs
```

#### 5-2. 실행 과정

```
============================================================
총 2개의 PDF 파일 발견
============================================================

============================================================
PDF 처리 시작: ITF_Rules_of_Tennis_2024.pdf (en)
============================================================
✓ ITF_Rules_of_Tennis_2024.pdf: 98 페이지, 45230 글자 추출 완료
✓ Chunking 완료: 36 chunks 생성
Embeddings 생성 시작: 36 chunks
  Embeddings: 10/36 완료
  Embeddings: 20/36 완료
  Embeddings: 30/36 완료
✓ Embeddings 생성 완료: 36/36 성공
Supabase 업로드 시작: 36 chunks
  업로드: 36/36 완료
✓ ITF_Rules_of_Tennis_2024.pdf 처리 완료: 36 chunks 업로드됨

============================================================
✅ 전체 처리 완료
  - 처리된 파일: 2/2
  - 업로드된 chunks: 68
============================================================
```

**처리 시간**:
- 50페이지 PDF ≈ 3-5분
- 100페이지 PDF ≈ 5-10분

✅ **성공 확인**: "✅ 전체 처리 완료" 메시지 표시

#### 5-3. 데이터 확인

Supabase 대시보드에서 확인:

1. **Table Editor** → `tennis_rules` 테이블 클릭
2. 업로드된 데이터 확인 (제목, 내용, 언어 등)

또는 SQL로 확인:

```sql
SELECT
  source_file,
  language,
  COUNT(*) as chunk_count
FROM tennis_rules
GROUP BY source_file, language;
```

---

### 🌐 **6단계: Edge Function 배포**

#### 6-1. Supabase CLI 설치

```bash
# Mac
brew install supabase/tap/supabase

# Windows (Scoop 필요)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

#### 6-2. Supabase 로그인

```bash
supabase login
```

브라우저에서 자동으로 인증 페이지가 열립니다.

#### 6-3. 프로젝트 연결

```bash
# 프로젝트 루트에서 실행
supabase link --project-ref your-project-ref

# project-ref는 Supabase 대시보드 URL에서 확인
# https://supabase.com/dashboard/project/xxxxxxxxxxxxx
#                                     ^^^^^^^^^^^^^^
#                                     이 부분
```

#### 6-4. Edge Function 배포

```bash
supabase functions deploy search-tennis-rules
```

✅ **성공 확인**:
```
Deployed Function search-tennis-rules on project xxxxxxxxxxxxx
URL: https://xxxxxxxxxxxxx.supabase.co/functions/v1/search-tennis-rules
```

#### 6-5. 환경 변수 설정 (Edge Function)

Edge Function이 Supabase에 접근할 수 있도록 환경 변수 설정:

```bash
supabase secrets set SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

### ✅ **7단계: 웹앱 환경 변수 설정**

#### 7-1. `.env` 파일 확인

프로젝트 루트의 `.env` 파일에 다음이 있는지 확인:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (anon key)
```

> 📝 **주의**: 여기서는 `anon` 키를 사용합니다 (service_role이 아님)

#### 7-2. 웹앱 재배포

```bash
npm run build
# 또는 Netlify/Vercel에서 자동 배포
```

---

## 4. 사용자 가이드 (규칙 검색)

> 👥 **일반 사용자용**: 관리자가 위 설정을 완료한 후 사용할 수 있습니다.

### 📱 **1단계: Gemini API 키 입력**

1. Tennis Mate 앱 접속
2. **Stats** 탭으로 이동
3. **AI Coach** 섹션에서 **"Enter your Gemini API key"** 클릭
4. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급받은 API 키 입력
5. **Test Connection** 클릭
6. ✅ 표시 확인 후 **Save** 클릭

> 💡 **왜 사용자가 직접 API 키를 입력하나요?**
> - 보안: 서버에 API 키를 저장하지 않습니다
> - 비용: 각 사용자가 자신의 무료 할당량을 사용합니다
> - 개인정보: API 사용 내역은 사용자 본인의 Google 계정에만 기록됩니다

### 💬 **2단계: 테니스 규칙 질문하기**

1. **AI Coach** 섹션에서 **"Ask Question"** 탭 클릭
2. 질문 입력 (예시):
   - "서브 규칙은?"
   - "What is a let?"
   - "타이브레이크 점수 계산 방법"
   - "Foot fault rule"
3. **Send** 버튼 클릭 (또는 Enter)
4. AI가 공식 규칙을 검색하여 답변 제공

### 📚 **답변 예시**

**질문**: "서브 규칙은?"

**AI 답변**:
```
ITF 테니스 규칙 제16조에 따르면:

1. 서브 위치
   - 첫 포인트: 오른쪽 코트에서 시작
   - 교대로 오른쪽/왼쪽 전환
   - 베이스라인 뒤, 센터마크와 사이드라인 사이

2. 서브 방법
   - 공을 공중에 던지고 라켓으로 타격
   - 상대 코트의 대각선 서비스 박스에 들어가야 함

3. 서브 실수 (Fault)
   - 공이 서비스 박스 밖으로 나간 경우
   - 발이 베이스라인을 넘은 경우 (Foot Fault)

📚 출처:
• 제16조 - 서브 (88% 일치)
• 제17조 - 서브 실수 (75% 일치)
```

---

## 5. 문제 해결 (FAQ)

### ❓ 자주 묻는 질문

#### Q1. ETL 스크립트 실행 시 "ImportError" 발생

**원인**: Python 패키지가 설치되지 않음

**해결**:
```bash
cd scripts
pip install -r requirements.txt
```

---

#### Q2. "❌ 필수 환경 변수가 설정되지 않았습니다"

**원인**: `.env` 파일이 없거나 잘못된 위치

**해결**:
1. `.env` 파일이 **프로젝트 루트**에 있는지 확인
2. 파일 내용 확인:
   ```env
   SUPABASE_URL=...
   SUPABASE_SERVICE_KEY=...
   GEMINI_API_KEY=...
   ```

---

#### Q3. "❌ Supabase 업로드 실패"

**원인 1**: `service_role` 키가 아닌 `anon` 키 사용

**해결**: Supabase 대시보드 → Settings → API에서 **service_role** 키 확인

**원인 2**: `tennis_rules` 테이블이 없음

**해결**: SQL 마이그레이션 파일 다시 실행

---

#### Q4. "⚠️ 조항 패턴을 찾지 못함"

**원인**: PDF 구조가 일반적인 조항 형식이 아님

**해결**: 자동으로 크기 기반 chunking으로 전환됩니다 (정상 동작)

---

#### Q5. 사용자가 "Failed to get answer" 에러 메시지

**원인 1**: Edge Function이 배포되지 않음

**해결**:
```bash
supabase functions deploy search-tennis-rules
```

**원인 2**: Edge Function 환경 변수 미설정

**해결**:
```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

**원인 3**: 사용자의 Gemini API 키 문제

**해결**:
1. API 키 재발급
2. API 키 재입력 및 Test Connection

---

#### Q6. 답변이 영어/한글로만 나옴

**원인**: 데이터베이스에 해당 언어의 규칙만 업로드됨

**해결**:
1. 영어/한글 PDF를 모두 업로드
2. 언어별로 파일명 규칙 준수

---

#### Q7. 동일한 파일을 여러 번 실행하면?

**원인**: 중복 데이터 생성

**해결**:
```sql
-- Supabase SQL Editor에서 실행
DELETE FROM tennis_rules WHERE source_file = 'filename.pdf';
```

또는 전체 삭제:
```sql
DELETE FROM tennis_rules;
```

---

#### Q8. API 비용은 얼마나 드나요?

**Gemini API 무료 할당량** (2026년 1월 기준):
- 임베딩: 월 1,500회 무료
- 텍스트 생성: 월 1,500회 무료

**예상 사용량**:
- ETL 실행 (100페이지 PDF): 약 50회 임베딩
- 사용자 질문 1회: 임베딩 1회 + 생성 1회

**Supabase 무료 할당량**:
- 데이터베이스: 500MB 무료
- Edge Functions: 월 500,000회 호출 무료

💡 **일반적으로 개인/소규모 사용은 완전 무료입니다!**

---

#### Q9. 데이터 백업은 어떻게 하나요?

**방법 1**: Supabase Dashboard에서 Export

1. **Table Editor** → `tennis_rules` 테이블
2. **Export** → CSV

**방법 2**: SQL로 백업

```sql
COPY tennis_rules TO '/path/to/backup.csv' WITH CSV HEADER;
```

---

#### Q10. PDF 파일 크기 제한은?

**권장**: 페이지당 50-100페이지

**최대**: Python 메모리에 따라 다름 (일반적으로 200페이지까지 무리 없음)

**대용량 PDF**: 파일을 분할하여 업로드 (예: Part1.pdf, Part2.pdf)

---

## 📞 추가 지원

- **GitHub Issues**: [tennis-mate/issues](https://github.com/HouuYa/tennis-mate/issues)
- **이메일**: (앱 관리자 이메일)

---

## 🎉 축하합니다!

이제 Tennis Mate에서 AI 기반 테니스 규칙 검색 기능을 사용할 수 있습니다!

**다음 단계**:
1. ✅ 사용자에게 Gemini API 키 발급 방법 안내
2. ✅ "Ask Question" 기능 홍보
3. ✅ 정기적으로 규칙 문서 업데이트 (새 규칙 발표 시)

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2026-01-14
