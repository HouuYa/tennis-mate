# Tennis Rules RAG 통합 계획서

## Tennis_Rules_RAG → Tennis Mate 통합 코딩 계획

> **작성일**: 2026-02-07 (검토 반영: 2026-02-08)
> **목적**: 독립적으로 성공한 Tennis_Rules_RAG 시스템을 Tennis Mate 앱에 완전히 통합
> **원칙**: 코드 중복 최소화, 기존 아키텍처 존중, 점진적 통합

---

## 0. 검토 결과 (2026-02-08 추가)

Tennis_Rules_RAG 레포지토리를 클론하여 실제 코드를 분석한 결과,
**기존 계획에서 수정이 필요한 4가지 핵심 사항**을 발견했습니다.

### 검토 1: 영문 PDF 호환성 분석

#### 실제 ETL 파이프라인 (155개 한글 레코드를 생성한 과정)

기존 계획에서 가정했던 것과 다르게, **실제 데이터 적재는 3단계 파이프라인**이었습니다:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  실제 ETL 파이프라인 (Tennis_Rules_RAG에서 155개 KTA 레코드 생성)          │
│                                                                         │
│  Step 1: extract_pdf_gemini.py                                          │
│  ┌──────────────────┐     ┌──────────────────────────┐                  │
│  │ 테니스규정집.pdf   │────▶│ Gemini Flash API          │                  │
│  │ (한글 PDF)        │     │ (PDF 업로드 → 텍스트 추출) │                  │
│  └──────────────────┘     └─────────┬────────────────┘                  │
│                                     │ 마크다운 형식의 텍스트                │
│                                     ▼                                   │
│  Step 2: gen_sql_from_txt.py  ┌──────────────────┐                      │
│  ┌──────────────────────┐     │ full_rules_text   │                      │
│  │ 정규식으로 조항 분할   │◀────│ .txt (208KB)      │                      │
│  │ + gemini-embedding-   │     └──────────────────┘                      │
│  │   001 임베딩 생성     │                                               │
│  │ + SQL INSERT문 출력   │                                               │
│  └─────────┬────────────┘                                               │
│            │                                                            │
│            ▼                                                            │
│  Step 3: upload_rules.py     ┌──────────────────┐                       │
│  ┌──────────────────────┐    │ insert_rules.sql  │                       │
│  │ SQL 파싱 → Supabase  │◀───│ (2.8MB, 155건)    │                       │
│  │ 배치 INSERT           │    └──────────────────┘                       │
│  └──────────────────────┘                                               │
│                                                                         │
│  ⚠️ etl_tennis_supabase.py는 대안 파이프라인으로, 실제 사용되지 않았음      │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 영문 PDF (`2026-rules-of-tennis-english.pdf`) 처리 가능 여부

| 단계 | 파일 | 호환성 | 수정 내용 | 규모 |
|------|------|--------|----------|------|
| Step 1 | `extract_pdf_gemini.py` | ⚠️ 수정 필요 | PDF 경로 변경 + 프롬프트 영어화 | 소 |
| Step 2 | `gen_sql_from_txt.py` | ⚠️ 수정 필요 | 정규식 패턴 3곳 수정 | 중 |
| Step 3 | `upload_rules.py` | ✅ 그대로 사용 | 없음 | 없음 |

**Step 1 상세** - `extract_pdf_gemini.py`:
- 파일 경로: `./테니스규정집(...)` → `./2026-rules-of-tennis-english.pdf`
- 프롬프트(line 34): 한국어 전용 → 영어 또는 bilingual 변경 필요
- Gemini 출력 형식이 `**1. THE COURT**` vs `**Rule 1. THE COURT**`인지는 실행 후 확인 필요

**Step 2 상세** - `gen_sql_from_txt.py` 정규식 문제 3곳:

```
문제점 1 - start_marker (line 26):
  현재: r"(\*\*1\.\s*코트|\*\*ITF\s*테니스\s*룰\*\*)"
                          ^^^^ 한국어 하드코딩
  필요: 영문 패턴 추가 (THE COURT, ITF Rules 등)

문제점 2 - body_split_pattern (line 42-45):
  현재 매칭 가능:
    ✅ **1. THE COURT**     → \d+\. 매칭
    ✅ **I. Appendix**      → [I-V]+\. 매칭
    ✅ **a. Standard Game** → [A-Z]\. 매칭 (IGNORECASE)
  매칭 불가:
    ❌ **Rule 1 - THE COURT** → "Rule" 뒤 숫자+마침표 패턴 불일치
  negative lookahead: 한국어만 (페이지, 목차 등) → Page, Contents 추가 필요

문제점 3 - INSERT문 (line 133):
  현재: INSERT INTO tennis_rules (source_file, rule_id, content, embedding)
  누락: metadata 컬럼 없음 → NULL로 삽입됨
```

**권장 접근**: `extract_pdf_gemini.py`를 영문 PDF에 DRY RUN → Gemini 출력 형식 확인 → 정규식 조정

#### DRY RUN 결과 (2026-02-08 실행)

Gemini API 없이 pdftotext로 영문 PDF 구조를 분석하고, 예상 Gemini 출력 형식별로 정규식 테스트:

```
영문 PDF 실제 구조 (pdftotext 확인):
  • "1." + 줄바꿈 + "THE COURT" 형식 (번호와 제목 분리)
  • Rule 1~31 + Appendix I~XII + Wheelchair Tennis + Amendment
  • 하위 항목: a., b., i., ii. 형식

예상 Gemini 출력: Format A (**1. THE COURT**) 가장 유력
  (한글 PDF도 **1. 코트 (THE COURT)** 형식으로 출력됨)

테스트 결과:
┌──────────────────────────────┬─────────────────┬─────────────────┐
│ 예상 Gemini 형식              │ 현재 정규식      │ 제안 정규식      │
├──────────────────────────────┼─────────────────┼─────────────────┤
│ A: **1. THE COURT**  (유력)  │ start ❌  13건  │ start ✅  25건  │
│ B: **Rule 1. THE COURT**    │ start ❌   0건  │ start ✅   8건  │
│ C: **Rule 1 - THE COURT**   │ start ❌   0건  │ start ✅   5건  │
│ D: Plain text (마크다운 없음) │ 전부 실패        │ 전부 실패        │
├──────────────────────────────┼─────────────────┼─────────────────┤
│ 한글 회귀 테스트              │ 147 chunks      │ 147 chunks ✅   │
└──────────────────────────────┴─────────────────┴─────────────────┘

현재 정규식 문제점:
  1. start_marker: 한국어만 ("코트", "테니스 룰") → 영문 전부 실패
  2. body_split: APPENDIX I~XII 패턴 미매칭 (현재 [I-V]+\. 는 "I." 필요)
  3. negative lookahead: Page, Contents 누락

제안 정규식 수정사항:
  • start_marker: THE COURT, FOREWORD, Rule 1 패턴 추가
  • body_split: APPENDIX [IVX]+ 패턴 추가, Rule\s*\d+ 추가
  • negative lookahead: Page, Contents, Table of, Note 추가
  • 한글 회귀: ✅ 동일 결과 (147 chunks)
```

#### Gemini 실제 API 호출 결과 (2026-02-08)

```
⚠️ 예상과 완전히 다른 형식 발견!

한글 PDF Gemini 출력:           영문 PDF Gemini 출력:
  **1. 코트 (THE COURT)**        1.     THE COURT
  **머리말**                      **FOREWORD**
  (전부 볼드 마크다운)             (일부만 볼드, 규칙은 일반 텍스트)

영문 출력 패턴 분석 (83KB, /tmp/english_rules_gemini.txt):
  • Rules 1-31:     일반 텍스트 "N.     TITLE"      (볼드 없음!)
  • Appendix I-XII: 일반 텍스트 "APPENDIX I"        (볼드 없음!)
  • 특수 섹션:       볼드 "**FOREWORD**",
                          "**RULES OF WHEELCHAIR TENNIS**"

영향:
  • 볼드 마크다운 정규식 → 영문 Rules/Appendix 전부 매칭 실패
  • Phase 3에서 plain text 패턴 기반 정규식 재설계 필요:
    - start_marker: r"^1\.\s+THE COURT" (볼드 없는 패턴)
    - body_split: r"^\d+\.\s+[A-Z ]+$" + r"^APPENDIX\s+[IVX]+"
    - 또는 한/영 분기 처리 (언어별 다른 정규식 적용)
```

---

### 검토 2: metadata JSONB 채우기

#### 원인

`gen_sql_from_txt.py` line 133의 INSERT문에 `metadata` 컬럼이 **포함되지 않음**:
```sql
-- gen_sql_from_txt.py가 생성하는 SQL (metadata 누락!)
INSERT INTO tennis_rules (source_file, rule_id, content, embedding) VALUES (...);
```

참고로 `etl_tennis_supabase.py` line 251에는 포함되어 있으나, 이 스크립트는 실제 적재에 사용되지 않았음:
```python
"metadata": {"original_len": len(item.get("original_content", ""))}
```

#### 수정 방법

**방법 A: 기존 155개 레코드 즉시 업데이트 (SQL 1회 실행)**
```sql
UPDATE tennis_rules
SET metadata = jsonb_build_object(
  'language', 'ko',
  'source_version', 'KTA 2020.11.20',
  'original_len', length(content),
  'section_type', CASE
    WHEN rule_id = 'Foreword/Intro' THEN 'foreword'
    WHEN rule_id ~ '^[0-9]+\.' THEN 'rule'
    WHEN rule_id ~ '^[a-zA-Z]\.' THEN 'sub-section'
    WHEN rule_id ~ '^(부록|Appendix|[IVX]+\.)' THEN 'appendix'
    ELSE 'other'
  END
)
WHERE metadata IS NULL;
```

**방법 B: `gen_sql_from_txt.py` 수정 (향후 ETL)**
- INSERT문에 metadata 컬럼 추가
- 청킹 시 메타데이터 수집 (언어, 섹션 유형, 부모 조항 등)

#### 권장 metadata 구조
```json
{
  "language": "ko",
  "source_version": "KTA 2020.11.20",
  "section_type": "rule | sub-section | appendix | foreword",
  "parent_rule": "5. 게임 스코어",
  "original_len": 1234
}
```

**결론**: ✅ 수정 가능. SQL UPDATE로 기존 데이터 즉시 보완 가능 + ETL 코드 수정으로 향후 자동 포함

---

### 검토 3: 임베딩 모델 불일치 (Critical)

#### 발견된 불일치

```
┌──────────────────────────────────────────────────────────────────────┐
│                     ⚠️ 임베딩 모델 불일치 발견                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Tennis_Rules_RAG (실제 데이터 생성 + 질의)                            │
│  ┌────────────────────────────────────┐                              │
│  │ ETL: gen_sql_from_txt.py           │                              │
│  │   model = "gemini-embedding-001"   │ ◄── 데이터 임베딩             │
│  │                                    │                              │
│  │ Edge Fn: tennis-rag-query/index.ts │                              │
│  │   model = "gemini-embedding-001"   │ ◄── 질의 임베딩 (매칭 ✅)     │
│  └────────────────────────────────────┘                              │
│                                                                      │
│  Tennis Mate (현재 코드)                                               │
│  ┌────────────────────────────────────┐                              │
│  │ Edge Fn: search-tennis-rules       │                              │
│  │   model = "text-embedding-004"     │ ◄── 질의 임베딩 (불일치 ❌)   │
│  └────────────────────────────────────┘                              │
│                                                                      │
│  영향: Tennis Mate Edge Function으로 질의 시                           │
│        text-embedding-004 벡터 ≠ gemini-embedding-001 벡터            │
│        → 유사도 검색 결과가 부정확할 수 있음                             │
│                                                                      │
│  해결: Tennis Mate Edge Function의 모델을                              │
│        gemini-embedding-001로 통일 필요                                │
└──────────────────────────────────────────────────────────────────────┘
```

#### DB 스키마 차이 (실제 Supabase vs Tennis Mate 코드)

스크린샷 확인 결과, **실제 Supabase DB는 Tennis_Rules_RAG 스키마**를 사용 중:

| 컬럼 | 실제 DB (RAG 스키마) | Tennis Mate migration | 상태 |
|------|---------------------|----------------------|------|
| id | ✅ BIGSERIAL | ✅ BIGSERIAL | 동일 |
| source_file | ✅ TEXT | ✅ TEXT | 동일 |
| rule_id | ✅ TEXT | ❌ 없음 | **불일치** |
| title | ❌ 없음 | ✅ TEXT | **불일치** |
| content | ✅ TEXT | ✅ TEXT | 동일 |
| language | ❌ 없음 | ✅ VARCHAR(2) | **불일치** |
| chunk_index | ❌ 없음 | ✅ INTEGER | **불일치** |
| metadata | ✅ JSONB | ❌ 없음 | **불일치** |
| embedding | ✅ VECTOR(768) | ✅ VECTOR(768) | 동일 |
| updated_at | ❌ 없음 | ✅ TIMESTAMPTZ | **불일치** |

**영향**: Tennis Mate Edge Function이 `title`, `language`, `chunk_index` 컬럼을 참조하면 에러 발생
**해결**: Edge Function과 RPC 함수를 실제 DB 스키마에 맞춰 수정 필요

---

### 검토 4: Frontend ETL Plan

#### 현재 ETL의 불편함

```
현재: Python CLI → 5단계 수동 실행
  1. extract_pdf_gemini.py 실행 (PDF → txt)     ← 터미널 필요
  2. gen_sql_from_txt.py 실행 (txt → SQL)         ← API 키 설정 필요
  3. upload_rules.py 실행 (SQL → Supabase)        ← API 키 설정 필요
  4. split_sql.py (선택: SQL 분할)                 ← 대용량 시 필요
  5. 각 단계마다 .env 설정 + 터미널 접근 필요
```

#### 제안: Tennis Mate Admin Page + Edge Function

```
┌─────────────────────────────────────────────────────────────────┐
│  Tennis Mate - Admin: Tennis Rules ETL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 텍스트 준비                                             │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  Option A: PDF 업로드 → Gemini 자동 추출               │      │
│  │  ┌────────────────┐ ┌─────────────────────────────┐   │      │
│  │  │ [PDF 파일 선택] │ │ [텍스트 추출 시작]            │   │      │
│  │  └────────────────┘ └─────────────────────────────┘   │      │
│  │                                                       │      │
│  │  Option B: 텍스트 직접 붙여넣기                         │      │
│  │  ┌─────────────────────────────────────────────────┐  │      │
│  │  │                                                 │  │      │
│  │  │  (pre-formatted markdown text area)             │  │      │
│  │  │                                                 │  │      │
│  │  └─────────────────────────────────────────────────┘  │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                 │
│  Step 2: 청킹 미리보기                                           │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  소스명: [테니스규정집(2020).pdf    ] 언어: [ko ▼]     │      │
│  │                                                       │      │
│  │  ┌─────────────────────────────────────────────────┐  │      │
│  │  │ #1  rule_id: "1. 코트 (THE COURT)"              │  │      │
│  │  │     content: "**1. 코트** 코트는 직사각형이..."    │  │      │
│  │  │     length: 1,234 chars                         │  │      │
│  │  ├─────────────────────────────────────────────────┤  │      │
│  │  │ #2  rule_id: "2. 퍼머넌트 픽스처"                │  │      │
│  │  │     ...                                         │  │      │
│  │  └─────────────────────────────────────────────────┘  │      │
│  │                                                       │      │
│  │  총 155개 조항 감지됨  [청킹 다시하기]                   │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                 │
│  Step 3: 임베딩 생성 & 업로드                                     │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  [████████████████░░░░░░░░] 67% (104/155)            │      │
│  │                                                       │      │
│  │  ⏱ 예상 남은 시간: 51초                                │      │
│  │  ✅ 임베딩 생성: 104건 | ❌ 실패: 0건                   │      │
│  │                                                       │      │
│  │  [임베딩 & 업로드 시작]     [중단]                      │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Frontend ETL 아키텍처

```
┌──────────────────┐     ┌──────────────────────────────┐
│  Admin Browser   │     │  Supabase Edge Function       │
│  (Tennis Mate)   │     │  etl-tennis-rules (NEW)       │
│                  │     │                                │
│  1. PDF Upload   │────▶│  Action: "extract_text"       │
│     또는 Text   │     │  → Gemini File API 호출        │
│     직접 입력    │     │  → 마크다운 텍스트 반환         │
│                  │◀────│                                │
│                  │     │                                │
│  2. 텍스트 확인  │────▶│  Action: "chunk_text"          │
│     & 편집      │     │  → 정규식 청킹                  │
│                  │◀────│  → 조항 목록 반환               │
│                  │     │                                │
│  3. chunk별 처리 │────▶│  Action: "process_chunk"       │
│     (반복 호출)  │     │  → Gemini 임베딩 생성           │
│                  │     │  → metadata 구성                │
│  4. Progress     │◀────│  → Supabase INSERT             │
│     표시        │     │  → 결과 반환                    │
│                  │     │                                │
└──────────────────┘     └──────────────────────────────┘
     │                              │
     │ Gemini API Key               │ Supabase Service Key
     │ (사용자 localStorage)         │ (서버 환경변수 - 안전)
     ▼                              ▼
┌──────────┐              ┌──────────────┐
│ Gemini   │              │   Supabase   │
│ API      │              │   Database   │
└──────────┘              └──────────────┘
```

#### Edge Function API 설계

```
POST /functions/v1/etl-tennis-rules

Action 1: "extract_text"
  Request:  { action: "extract_text", pdfBase64: "...", geminiApiKey: "..." }
  Response: { text: "## 테니스 룰...", charCount: 208029 }

Action 2: "chunk_text"
  Request:  { action: "chunk_text", text: "...", sourceName: "...", language: "ko" }
  Response: { chunks: [{rule_id, content, metadata}, ...], count: 155 }

Action 3: "process_chunk"  (frontend에서 chunk별 반복 호출)
  Request:  { action: "process_chunk", chunk: {...}, geminiApiKey: "..." }
  Response: { success: true, rule_id: "1. 코트", embeddingDim: 768 }
```

- Frontend에서 chunk 하나씩 `process_chunk` 호출 → progress bar 표시 가능
- chunk 단위 처리로 Edge Function 150초 타임아웃 방지
- 실패한 chunk만 재시도 가능

#### 구현 대상 파일

| 파일 | 작업 | 설명 |
|------|------|------|
| `components/AdminETLPage.tsx` | NEW | Admin ETL UI 컴포넌트 |
| `supabase/functions/etl-tennis-rules/index.ts` | NEW | ETL Edge Function |
| `App.tsx` | MODIFY | Admin 라우트 추가 |

#### 보안 고려사항
- Gemini API Key: 사용자 브라우저에서만 관리 (localStorage)
- Supabase Service Key: Edge Function 환경변수에만 존재 (프론트엔드 노출 안 됨)
- Admin 접근 제어: API key 검증 또는 별도 admin 인증 필요

---

## 1. 현재 상태 비교 분석 (검토 반영 수정)

### 1.1 두 시스템 비교표

| 영역 | Tennis Mate (현재 코드) | Tennis_Rules_RAG (실제 운영) | 차이점 |
|------|----------------------|---------------------------|--------|
| **ETL 텍스트 추출** | PyPDF2 | Gemini Flash API (PDF→txt) | RAG: AI 기반 추출 |
| **ETL Chunking** | 기본 정규식 (`제N조`, `Article N`) | 볼드 마크다운 패턴 + TOC 제외 | RAG가 훨씬 정교함 |
| **ETL 스크립트** | `upload_tennis_rules.py` 1개 | 3개 분리 (`extract`→`gen_sql`→`upload`) | RAG가 단계별 분리 |
| **DB 스키마** | `title`, `language`, `chunk_index` | `rule_id`, `metadata` JSONB | **필드 구조 다름** |
| **인덱스** | IVFFlat (lists=100) | HNSW (cosine_ops) | RAG의 HNSW가 더 빠름 |
| **임베딩 모델** | `text-embedding-004` | `gemini-embedding-001` | **⚠️ 불일치 - 통일 필요** |
| **답변 생성 모델** | `gemini-2.0-flash-exp` | `gemini-flash-latest` | Tennis Mate가 더 명시적 |
| **RPC 함수** | `match_tennis_rules` (language 필터) | `match_tennis_rules` (threshold/count만) | 파라미터 다름 |
| **API 키 관리** | 클라이언트 → Edge Function body | 클라이언트 → body (fallback: env) | RAG가 fallback 있음 |
| **Frontend** | React `TennisRulesChatModal.tsx` | Vanilla HTML `tennis_chat.html` | Tennis Mate가 더 발전 |

### 1.2 핵심 결론 (검토 반영 수정)

```
Tennis_Rules_RAG에서 가져올 것:
  ✅ 실제 ETL 파이프라인 (extract_pdf_gemini → gen_sql_from_txt → upload_rules)
  ✅ 이미 적재된 155개 조항 데이터 (Supabase에 운영 중)
  ✅ HNSW 인덱스 전략
  ✅ DB 스키마 (rule_id, metadata JSONB) → 이미 운영 DB에 적용됨

Tennis Mate에서 유지할 것:
  ✅ React 기반 Chat UI (TennisRulesChatModal.tsx)
  ✅ Supabase Edge Function 아키텍처
  ✅ API 키 관리 시스템 (geminiService.ts)

수정이 필요한 것:
  ⚠️ 임베딩 모델 통일: text-embedding-004 → gemini-embedding-001
  ⚠️ Edge Function: 실제 DB 스키마 (rule_id, metadata)에 맞춰 수정
  ⚠️ match_tennis_rules() RPC: 실제 DB 함수 시그니처에 맞춰 호출
  ⚠️ 영문 PDF ETL: 정규식 패턴 3곳 수정
  ⚠️ metadata 채우기: gen_sql_from_txt.py INSERT문 수정 + 기존 데이터 UPDATE
```

---

## 2. 시스템 아키텍처 다이어그램

### 2.1 통합 후 전체 아키텍처 (검토 반영 수정)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    TENNIS MATE APPLICATION                           │
│                    (React + TypeScript + Vite)                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Players  │  │ Matches  │  │  Feed    │  │      Stats       │    │
│  │   Tab    │  │   Tab    │  │   Tab    │  │       Tab        │    │
│  └──────────┘  └──────────┘  └──────────┘  └────────┬─────────┘    │
│                                                      │              │
│                                              ┌───────┴────────┐     │
│                                              │   AI Coach     │     │
│                                              │   Section      │     │
│                                              ├────────────────┤     │
│                                              │ [Stats분석]    │     │
│                                              │ [규칙질문] ◄───┼──── RAG 통합 포인트
│                                              └───────┬────────┘     │
│                                                      │              │
│  ┌───────────────────────────────────────────────────┤              │
│  │                                                   │              │
│  │  ┌─────────────────────┐  ┌───────────────────┐   │              │
│  │  │ StatsAnalysisModal  │  │TennisRulesChatModal│  │              │
│  │  │ (통계 분석 AI)       │  │ (규칙 Q&A RAG)     │  │              │
│  │  └─────────┬───────────┘  └─────────┬─────────┘   │              │
│  │            │                        │              │              │
│  │            ▼                        ▼              │              │
│  │  ┌─────────────────────────────────────────────┐   │              │
│  │  │           geminiService.ts                  │   │              │
│  │  │  • getStoredApiKey()                        │   │              │
│  │  │  • testApiKey()                             │   │              │
│  │  │  • generateAIAnalysis()                     │   │              │
│  │  │  + searchTennisRules() ◄──── 신규 추가       │   │              │
│  │  └─────────────────┬───────────────────────────┘   │              │
│  │                    │                               │              │
│  └────────────────────┼───────────────────────────────┘              │
│                       │                                              │
└───────────────────────┼──────────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────────────────────┐
          │             ▼                             │
          │  ┌───────────────────────┐                │
          │  │  Supabase Edge        │                │
          │  │  Function             │                │
          │  │  search-tennis-rules  │                │
          │  │                       │                │
          │  │  1. Gemini Embedding  │ ◄─── gemini-embedding-001 (통일!)
          │  │  2. pgvector Search   │ ◄─── match_tennis_rules()
          │  │  3. Gemini Answer     │ ◄─── gemini-2.0-flash
          │  └───────────┬───────────┘                │
          │              │                            │
          │              ▼                            │
          │  ┌───────────────────────┐                │
          │  │   Supabase Database   │                │
          │  │   (PostgreSQL)        │                │
          │  ├───────────────────────┤                │
          │  │  tennis_rules         │ ◄─── HNSW + pgvector (768d)
          │  │  ├ id (BIGSERIAL)     │                │
          │  │  ├ source_file (TEXT) │                │
          │  │  ├ rule_id (TEXT)     │ ◄── 실제 운영 DB 스키마
          │  │  ├ content (TEXT)     │                │
          │  │  ├ metadata (JSONB)   │ ◄── 현재 NULL → 채울 예정
          │  │  ├ embedding (768d)   │                │
          │  │  └ created_at         │                │
          │  ├───────────────────────┤                │
          │  │  players, sessions,   │                │
          │  │  matches              │                │
          │  └───────────────────────┘                │
          │        SUPABASE CLOUD                     │
          └───────────────────────────────────────────┘
```

### 2.2 RAG 질의 흐름 (Query Flow)

```
사용자                    Frontend                Edge Function           Supabase DB          Gemini API
  │                         │                        │                      │                    │
  │  "서브 폴트란?"         │                        │                      │                    │
  ├────────────────────────▶│                        │                      │                    │
  │                         │                        │                      │                    │
  │                         │  언어감지: 한글→'ko'    │                      │                    │
  │                         │  API키: localStorage   │                      │                    │
  │                         │                        │                      │                    │
  │                         │  POST /search-tennis-  │                      │                    │
  │                         │  rules                 │                      │                    │
  │                         ├───────────────────────▶│                      │                    │
  │                         │  {question, apiKey,    │                      │                    │
  │                         │   language:'ko'}       │                      │                    │
  │                         │                        │                      │                    │
  │                         │                        │  embedContent()      │                    │
  │                         │                        │  gemini-embedding-001│                    │
  │                         │                        ├────────────────────────────────────────────▶
  │                         │                        │                      │      [768d vector] │
  │                         │                        │◀────────────────────────────────────────────
  │                         │                        │                      │                    │
  │                         │                        │  match_tennis_rules()│                    │
  │                         │                        ├─────────────────────▶│                    │
  │                         │                        │                      │  cosine similarity │
  │                         │                        │   Top 5 규칙 반환     │  HNSW search       │
  │                         │                        │◀─────────────────────│                    │
  │                         │                        │                      │                    │
  │                         │                        │  generateContent()   │                    │
  │                         │                        │  gemini-2.0-flash    │                    │
  │                         │                        ├────────────────────────────────────────────▶
  │                         │                        │                      │       [AI 답변]    │
  │                         │                        │◀────────────────────────────────────────────
  │                         │                        │                      │                    │
  │                         │  {answer, sources,     │                      │                    │
  │                         │   rule_id, metadata}   │                      │                    │
  │                         │◀───────────────────────│                      │                    │
  │                         │                        │                      │                    │
  │  답변 + 출처 표시        │                        │                      │                    │
  │◀────────────────────────│                        │                      │                    │
  │                         │                        │                      │                    │
```

### 2.3 ETL 데이터 흐름 (실제 파이프라인 반영)

```
┌───────────────────────────────────────────────────────────────────┐
│                 ETL PIPELINE (실제 검증된 흐름)                     │
│              (일회성 / 규칙 업데이트 시 실행)                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  STEP 1: Gemini AI 텍스트 추출 (extract_pdf_gemini.py)             │
│  ┌──────────────────┐      ┌──────────────────────────────┐      │
│  │ PDF 문서          │─────▶│ Gemini Flash API             │      │
│  │ (ITF EN / KTA KO) │      │ • PDF 파일 업로드             │      │
│  └──────────────────┘      │ • "원본 유지하며 텍스트 추출"  │      │
│                            │ • 마크다운 형식으로 출력        │      │
│                            └───────────┬──────────────────┘      │
│                                        │                         │
│                               ┌────────▼─────────┐              │
│                               │ full_rules_text   │              │
│                               │ .txt (208KB)      │              │
│                               │ 마크다운 형식       │              │
│                               │ **1. 코트** ...    │              │
│                               └────────┬─────────┘              │
│                                        │                         │
│  STEP 2: 조항별 청킹 + 임베딩 (gen_sql_from_txt.py)                │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  1. TOC 자동 건너뛰기 (start_marker 탐색)                  │   │
│  │  2. 볼드 마크다운 패턴으로 분할:                             │   │
│  │     **N. 제목** → 주요 규칙                                │   │
│  │     **a. 제목** → 하위 섹션                                │   │
│  │     **I. 제목** → 부록 (로마 숫자)                          │   │
│  │  3. 각 chunk에 gemini-embedding-001 임베딩 생성 (768d)      │   │
│  │  4. L2 정규화 적용                                         │   │
│  │  5. SQL INSERT문으로 출력                                   │   │
│  └───────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│                     ┌────────▼──────────┐                        │
│                     │ insert_rules.sql  │                        │
│                     │ (2.8MB, 155건)    │                        │
│                     └────────┬──────────┘                        │
│                              │                                   │
│  STEP 3: Supabase 업로드 (upload_rules.py)                        │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  • SQL 파일 파싱 (정규식으로 VALUES 추출)                    │   │
│  │  • 배치 사이즈: 10                                         │   │
│  │  • Supabase client INSERT                                 │   │
│  │  • 실패 시 건별 재시도                                      │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. 통합 단계별 계획 (검토 반영 수정)

### Phase 1: Edge Function 수정 (실제 DB에 맞춤) - 최우선

```
목표: Tennis Mate의 Edge Function을 실제 Supabase DB 스키마에 맞추기

현재 문제:                              수정 후:
┌────────────────────────────┐        ┌────────────────────────────────────┐
│ search-tennis-rules/       │        │ search-tennis-rules/               │
│ index.ts                   │        │ index.ts                           │
│                            │        │                                    │
│ ❌ text-embedding-004      │  ──▶   │ ✅ gemini-embedding-001        FIX │
│ ❌ title 컬럼 참조          │        │ ✅ rule_id 컬럼 참조           FIX │
│ ❌ language 필터 사용       │        │ ✅ metadata에서 language 참조  FIX │
│ • 고정 threshold 0.5       │        │ • 가변 threshold (param)     UPG │
│ • 고정 match_count 5       │        │ • 가변 match_count (param)   UPG │
│                            │        │ • metadata 반환              NEW │
│                            │        │ • 한/영 프롬프트 분리         NEW │
└────────────────────────────┘        └────────────────────────────────────┘
```

**파일 변경 목록:**
| 파일 | 작업 |
|------|------|
| `supabase/functions/search-tennis-rules/index.ts` | 임베딩 모델 변경 + DB 스키마 맞춤 |

---

### Phase 2: metadata 채우기

```
목표: 기존 155개 레코드의 metadata NULL → 유용한 값으로 채우기

┌─────────────────────┐          ┌─────────────────────────────┐
│ 현재 상태            │          │ 수정 후                      │
│                     │          │                             │
│ metadata: NULL      │   ──▶    │ metadata: {                 │
│ (전체 155건)         │          │   "language": "ko",         │
│                     │          │   "source_version":         │
│                     │          │     "KTA 2020.11.20",       │
│                     │          │   "section_type": "rule",   │
│                     │          │   "original_len": 1234      │
│                     │          │ }                           │
└─────────────────────┘          └─────────────────────────────┘
```

**작업:** Supabase SQL Editor에서 UPDATE 쿼리 1회 실행

---

### Phase 3: 영문 PDF ETL 정규식 수정

```
목표: gen_sql_from_txt.py가 영문 PDF 텍스트도 처리할 수 있도록 수정

수정 대상 (gen_sql_from_txt.py):
┌──────────────────────────────────────────────────────────────────┐
│ 1. start_marker (line 26):                                       │
│    현재: r"(\*\*1\.\s*코트|\*\*ITF\s*테니스\s*룰\*\*)"            │
│    수정: r"(\*\*1\.\s*(?:코트|THE COURT|Court)                    │
│           |\*\*(?:ITF\s*테니스\s*룰|ITF\s*Rules)\*\*)"            │
│                                                                  │
│ 2. body_split_pattern (line 42-45):                              │
│    negative lookahead 추가: Page|Contents|Table of Contents      │
│    선택적: Rule\s*\d+ 패턴 추가 (Gemini 출력에 따라)              │
│                                                                  │
│ 3. INSERT문 (line 133):                                          │
│    metadata 컬럼 추가                                             │
└──────────────────────────────────────────────────────────────────┘

권장 순서:
  Step 1: extract_pdf_gemini.py로 영문 PDF DRY RUN
  Step 2: Gemini 출력 형식 확인
  Step 3: gen_sql_from_txt.py 정규식 조정
  Step 4: 영문 데이터 생성 + 업로드
```

---

### Phase 4: Frontend Chat UI 강화

```
목표: TennisRulesChatModal을 실제 DB 스키마에 맞추고 UX 개선

현재 UI 구조:                           통합 후 UI 구조:
┌──────────────────────────┐           ┌──────────────────────────────────┐
│ ╔════════════════════╗   │           │ ╔══════════════════════════════╗ │
│ ║ Ask Tennis Questions║   │           │ ║  테니스 규칙 Q&A             ║ │
│ ╚════════════════════╝   │           │ ║    [KO] [EN] 언어 토글  NEW ║ │
│                          │           │ ╚══════════════════════════════╝ │
│ ┌────────────────────┐   │           │                                  │
│ │ 채팅 메시지 영역    │   │           │ ┌──────────────────────────────┐ │
│ │                    │   │           │ │ 채팅 메시지 영역              │ │
│ │ User: 질문         │   │           │ │                              │ │
│ │ Bot: 답변          │   │   ──▶     │ │ User: 질문                   │ │
│ │   📚 Sources:      │   │           │ │ Bot: 답변                    │ │
│ │   • Article 5 (87%)│   │           │ │   📚 Sources:                │ │
│ │                    │   │           │ │   • Rule 16 서브폴트 (87%)   │ │
│ └────────────────────┘   │           │ │   ┌──────────────────┐      │ │
│                          │           │ │   │ 📖 전체 조항 보기  │ NEW │ │
│ ┌────────────────────┐   │           │ │   └──────────────────┘      │ │
│ │ [입력] [전송]       │   │           │ └──────────────────────────────┘ │
│ └────────────────────┘   │           │                                  │
└──────────────────────────┘           │ ┌──────────────────────────────┐ │
                                       │ │ 💡 추천 질문:            NEW │ │
                                       │ │ "서브 규칙은?" "타이브레이크?" │ │
                                       │ └──────────────────────────────┘ │
                                       │                                  │
                                       │ ┌──────────────────────────────┐ │
                                       │ │ [입력]              [전송]   │ │
                                       │ └──────────────────────────────┘ │
                                       └──────────────────────────────────┘
```

**파일 변경 목록:**
| 파일 | 작업 |
|------|------|
| `components/TennisRulesChatModal.tsx` | rule_id 기반 출처 표시 + UI 강화 |
| `services/geminiService.ts` | `searchTennisRules()` 함수 추가 |
| `types.ts` | RAG 관련 타입 추가 |
| `constants.ts` | RAG 관련 상수 추가 |

---

### Phase 5: Frontend ETL Admin Page (신규)

검토 4에서 제안한 Admin Page + Edge Function 구현.
상세 와이어프레임 및 API 설계는 [검토 4](#검토-4-frontend-etl-plan) 참조.

**파일 변경 목록:**
| 파일 | 작업 |
|------|------|
| `components/AdminETLPage.tsx` | NEW - Admin ETL UI |
| `supabase/functions/etl-tennis-rules/index.ts` | NEW - ETL Edge Function |
| `App.tsx` | MODIFY - Admin 라우트 추가 |

---

## 4. 파일별 변경 계획 요약

### 4.1 변경 파일 목록 (검토 반영 수정)

```
tennis-mate/
├── supabase/
│   └── functions/
│       ├── search-tennis-rules/
│       │   └── index.ts                           ◄── [FIX] 임베딩 모델 + DB 스키마 맞춤
│       └── etl-tennis-rules/
│           └── index.ts                           ◄── [NEW] Frontend ETL Edge Function
│
├── components/
│   ├── TennisRulesChatModal.tsx                   ◄── [MODIFY] rule_id 기반 출처 + UI 강화
│   └── AdminETLPage.tsx                           ◄── [NEW] Admin ETL 페이지
│
├── services/
│   └── geminiService.ts                           ◄── [MODIFY] searchTennisRules() 추가
│
├── types.ts                                       ◄── [MODIFY] RAG 타입 추가
├── constants.ts                                   ◄── [MODIFY] RAG 상수 추가
└── App.tsx                                        ◄── [MODIFY] Admin 라우트 추가
```

### 4.2 의존성 관계 및 실행 순서

```
Phase 1 (Edge Function FIX) ──────┐
  ⚠️ 최우선 - 현재 동작 안 될 수 있음  │
                                   ├──▶ 검증: RAG 질의 정상 동작 확인
Phase 2 (metadata UPDATE) ────────┘
  SQL 1회 실행

Phase 3 (영문 PDF ETL) ──────────────▶ 영문 데이터 적재

Phase 4 (Frontend UI) ───────────────▶ Chat UI 개선

Phase 5 (Admin ETL Page) ────────────▶ 향후 편리한 데이터 관리

실행 순서:
  Phase 1 + 2 (즉시, 병렬) → Phase 3 (영문 PDF) → Phase 4 (UI) → Phase 5 (Admin)
```

---

## 5. 리스크 및 고려사항

### 5.1 리스크 매트릭스 (검토 반영 수정)

```
영향도 ▲
       │
  높음  │  ⓵ 임베딩 모델 불일치      ⓶ DB 스키마 불일치
       │     (발견됨, 해결 필요)       (발견됨, 해결 필요)
       │
  중간  │  ⓷ 영문 PDF 정규식 미스매치  ⓸ API 할당량 초과
       │
  낮음  │  ⓹ UI 렌더링 차이          ⓺ Chunking 품질 저하
       │
       └──────────────────────────────────▶
          낮음          중간          높음    발생확률

대응 방안:
  ⓵ 임베딩 모델 불일치 → Edge Function에서 gemini-embedding-001로 변경 (Phase 1)
  ⓶ DB 스키마 불일치 → Edge Function을 실제 DB 스키마에 맞춰 수정 (Phase 1)
  ⓷ 영문 정규식 → DRY RUN으로 Gemini 출력 형식 확인 후 조정 (Phase 3)
  ⓸ API 할당량 → 재적재 시 rate limit 준수 / 배치 처리
  ⓹ UI 렌더링 → 기존 React 컴포넌트 점진적 수정
  ⓺ Chunking 품질 → DRY_RUN 모드로 사전 검증
```

### 5.2 호환성 전략

```
Edge Function API 하위 호환:
  ┌──────────────────────┐     ┌──────────────────────────────┐
  │ 기존 요청 (v1)        │     │ 확장 요청 (v2)                │
  │ {                    │     │ {                            │
  │   question: "...",   │     │   question: "...",           │
  │   geminiApiKey: "..",│     │   geminiApiKey: "..",        │
  │   language: "ko"     │     │   language: "ko",            │
  │ }                    │     │   matchCount: 10,    ← 옵션  │
  │                      │     │   matchThreshold: 0.3 ← 옵션 │
  │  ✅ 그대로 동작       │     │ }                            │
  └──────────────────────┘     │  ✅ 하위 호환                 │
                               └──────────────────────────────┘
```

---

## 6. 테스트 계획

```
┌─────────────────────────────────────────────────────────────────┐
│                         테스트 체크리스트                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ☐ Phase 1: Edge Function 수정                                  │
│    ☐ 임베딩 모델 gemini-embedding-001 사용 확인                   │
│    ☐ rule_id 필드 정상 반환 확인                                  │
│    ☐ metadata 필드 정상 반환 확인                                 │
│    ☐ 한글 질문 → 정확한 답변 + 출처                               │
│    ☐ 기존 API (v1) 하위 호환성                                   │
│    ☐ CORS 정상 동작                                              │
│                                                                 │
│  ☐ Phase 2: metadata 업데이트                                    │
│    ☐ 155건 전체 metadata NOT NULL 확인                           │
│    ☐ section_type 분류 정확성                                    │
│    ☐ Edge Function에서 metadata 반환 확인                        │
│                                                                 │
│  ☐ Phase 3: 영문 PDF ETL                                        │
│    ☐ extract_pdf_gemini.py DRY RUN 성공                         │
│    ☐ 영문 텍스트 청킹 결과 검증 (조항 수)                         │
│    ☐ 영문 임베딩 생성 확인 (768차원)                              │
│    ☐ Supabase 업로드 검증                                        │
│    ☐ 영문 질문 → 영문 답변 확인                                   │
│                                                                 │
│  ☐ Phase 4: Frontend UI                                         │
│    ☐ 채팅 메시지 표시 정상                                        │
│    ☐ 출처 표시 (rule_id 포함)                                    │
│    ☐ 추천 질문 동작                                              │
│    ☐ 에러 상태 표시                                              │
│    ☐ 모바일 반응형 확인                                           │
│                                                                 │
│  ☐ Phase 5: Admin ETL Page                                      │
│    ☐ 텍스트 붙여넣기 → 청킹 미리보기                              │
│    ☐ 임베딩 생성 progress 표시                                    │
│    ☐ Supabase 업로드 성공                                        │
│    ☐ 에러 시 재시도 동작                                          │
│                                                                 │
│  ☐ 통합 E2E                                                     │
│    ☐ "서브 폴트는?" → 정확한 답변 + 16. 서비스 출처               │
│    ☐ "What is a let?" → 영문 답변 + 영문 출처                    │
│    ☐ 기존 Stats 분석 기능 정상 동작 (회귀 테스트)                  │
│    ☐ API 키 없을 때 적절한 에러 메시지                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 요약: 작업 순서 및 체크리스트

```
┌────────────────────────────────────────────────────────────────────┐
│  #  │ Phase                │ 주요 작업                  │ 파일 수   │
├─────┼──────────────────────┼───────────────────────────┼──────────┤
│  1  │ Edge Function FIX    │ 임베딩 모델 통일 +         │    1     │
│     │ ⚠️ 최우선             │ DB 스키마 맞춤             │          │
│  2  │ metadata UPDATE      │ SQL UPDATE 1회 실행        │    -     │
│  3  │ 영문 PDF ETL         │ 정규식 수정 + DRY RUN      │    2     │
│  4  │ Frontend UI 강화     │ rule_id 출처, 추천질문     │    4     │
│  5  │ Admin ETL Page       │ Frontend ETL UI + Edge Fn │    3     │
├─────┼──────────────────────┼───────────────────────────┼──────────┤
│     │ 합계                 │                           │  ~10 파일 │
└─────┴──────────────────────┴───────────────────────────┴──────────┘
```

---

> **참고**: 이 문서는 코딩 계획서입니다. 실제 코드 변경은 포함되어 있지 않습니다.
> Phase별 구현 시 이 계획서를 참조하여 진행합니다.
>
> **검토 이력**:
> - 2026-02-07: 초안 작성 (시스템 비교 + 6 Phase 계획)
> - 2026-02-08: Tennis_Rules_RAG 레포 클론 분석 후 4가지 검토 결과 반영
>   - 임베딩 모델 불일치 발견 (`gemini-embedding-001` vs `text-embedding-004`)
>   - 실제 DB 스키마와 코드 간 불일치 발견
>   - 실제 ETL 파이프라인 확인 (3단계 분리)
>   - 영문 PDF 호환성 분석 + metadata 수정 방안 + Frontend ETL Plan 추가
