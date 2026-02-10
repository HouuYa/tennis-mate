# 🎾 Tennis Mate - AI 테니스 규칙 도우미 가이드

> **업데이트**: 2026-02-10
> **상태**: ✅ 운영 중 (85개 규칙 로드됨)

---

## 📌 목차

1. [AI 테니스 규칙 도우미란?](#1-ai-테니스-규칙-도우미란)
2. [사용자 가이드](#2-사용자-가이드)
3. [작동 원리](#3-작동-원리)
4. [관리자 가이드](#4-관리자-가이드)
5. [문제 해결](#5-문제-해결)

---

## 1. AI 테니스 규칙 도우미란?

### 🤖 기능

Tennis Mate의 **AI Coach**에서 테니스 규칙을 질문하고 전문가 답변을 받을 수 있습니다.

```
┌────────────────────────────────────────────┐
│ Ask Tennis Questions               [Clear] │
├────────────────────────────────────────────┤
│ 🟢 85 rules ready                          │
│                                            │
│ 💬 You: "서브 폴트란?"                      │
│                                            │
│ 🤖 AI: 서브폴트는 서버가 규정된 위치나      │
│        동작을 위반했을 때 발생합니다.       │
│                                            │
│        주요 폴트 사유는: 1) 베이스라인을    │
│        밟거나 넘는 경우 [1], 2) 잘못된     │
│        서비스 박스로 공이 들어간 경우 [2]   │
│                                            │
│        📚 Sources:                         │
│        • Rule 16 - SERVICE (87%)           │
│        • Rule 18 - FOOT FAULT (85%)        │
│                                            │
│ ┌──────────────────────────────────────┐   │
│ │ Ask about tennis rules...            │   │
│ └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### ✨ 특징

- ✅ **모바일 최적화** - 짧고 명확한 답변 (300자 이내)
- ✅ **인용 출처** - 답변에 [1], [2], [3] 번호로 출처 명시
- ✅ **다국어 지원** - 한글 질문 → 한글 답변, English → English
- ✅ **전문가 톤** - 간결하고 명확한 전문가 답변
- ✅ **85개 규칙** - 2026 ITF 테니스 규칙 완전 로드

---

## 2. 사용자 가이드

### 📱 시작하기

#### 1단계: Gemini API 키 입력

1. Tennis Mate 앱 접속
2. **Stats** 탭으로 이동
3. **AI Coach** 섹션에서 **⚙️ Settings** 클릭
4. **Gemini API Key** 입력란에 키 입력
   - 발급: [Google AI Studio](https://aistudio.google.com/app/apikey)
5. **Test Connection** 클릭하여 확인
6. **Save** 클릭

#### 2단계: 규칙 질문하기

1. **Ask Tennis Questions** 버튼 클릭
2. 🟢 **"85 rules ready"** 표시 확인
3. 질문 입력 후 전송

### 💬 질문 예시

**한글:**
- "서브 폴트란?"
- "타이브레이크 점수 계산 방법"
- "풋폴트 규칙"
- "레트 규칙은?"

**English:**
- "What is a let in tennis?"
- "Foot fault rule"
- "How to serve in tennis?"
- "Tiebreak scoring rules"

### 📚 답변 형식

```
[핵심 답변 2-3문장]

[상세 설명]
- 포인트 1 [1]
- 포인트 2 [2]
- 포인트 3 [3]

📚 Sources:
• Rule XX - TITLE (XX% match)
• Rule YY - TITLE (YY% match)
```

---

## 3. 작동 원리

### 🧠 RAG 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                   RAG WORKFLOW                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ① 사용자 질문                                            │
│  ┌────────────────────────┐                              │
│  │ "서브 폴트란?"         │                              │
│  └──────────┬─────────────┘                              │
│             │                                            │
│             ▼                                            │
│  ② 언어 자동 감지                                          │
│  ┌────────────────────────┐                              │
│  │ 한글 감지 → Korean      │                              │
│  └──────────┬─────────────┘                              │
│             │                                            │
│             ▼                                            │
│  ③ AI 임베딩 생성                                          │
│  ┌────────────────────────┐                              │
│  │ gemini-embedding-001   │                              │
│  │ → 768차원 벡터         │                              │
│  └──────────┬─────────────┘                              │
│             │                                            │
│             ▼                                            │
│  ④ Supabase 벡터 검색                                      │
│  ┌────────────────────────┐                              │
│  │ 85개 규칙 중           │                              │
│  │ 가장 유사한 5개 찾기    │                              │
│  └──────────┬─────────────┘                              │
│             │                                            │
│             ▼                                            │
│  ⑤ AI 답변 생성                                            │
│  ┌────────────────────────┐                              │
│  │ gemini-2.0-flash-exp   │                              │
│  │ • 핵심 답변 먼저       │                              │
│  │ • 인용번호 [1][2][3]   │                              │
│  │ • 모바일 최적 길이     │                              │
│  └──────────┬─────────────┘                              │
│             │                                            │
│             ▼                                            │
│  ⑥ 사용자에게 답변                                          │
│  ┌────────────────────────┐                              │
│  │ ✅ 답변 + 출처          │                              │
│  └────────────────────────┘                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 🔑 핵심 기술

| 구성요소 | 기술 | 역할 |
|---------|------|------|
| **임베딩** | gemini-embedding-001 | 질문을 768차원 벡터로 변환 |
| **검색** | Supabase pgvector + HNSW | 유사한 규칙 빠르게 찾기 |
| **생성** | gemini-2.0-flash-exp | 모바일 최적화 답변 생성 |
| **보안** | Header-based API key | API 키 안전하게 전달 |

---

## 4. 관리자 가이드

### 🚀 Edge Function 배포

현재 `tennis-rag-query` 함수가 배포되어 있습니다.

#### 재배포 필요 시

```bash
cd tennis-mate
supabase functions deploy tennis-rag-query
```

#### 환경 변수 확인

```bash
# Supabase secrets 확인
supabase secrets list

# 필수 환경 변수:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

### 📊 데이터 상태 확인

```sql
-- Supabase SQL Editor에서 실행

-- 전체 규칙 수 확인
SELECT COUNT(*) as total_rules FROM tennis_rules;

-- 출처별 규칙 수
SELECT
  source_file,
  COUNT(*) as rule_count
FROM tennis_rules
GROUP BY source_file;

-- 임베딩 차원 확인
SELECT
  rule_id,
  array_length(embedding, 1) as embedding_dimension
FROM tennis_rules
LIMIT 5;
```

### 🔧 프롬프트 수정

프롬프트는 `supabase/functions/tennis-rag-query/index.ts` 파일의 210-240줄에 있습니다.

```typescript
const prompts = {
  ko: `당신은 테니스 규칙 전문가입니다...

  ## 답변 지침:
  - **구조**: 핵심 답변 (2-3문장) → 필요시 상세 설명
  - **인용**: 규칙 참조 시 반드시 [1], [2], [3] 번호 사용
  - **톤**: 전문가답게 간결하고 명확하게
  - **길이**: 모바일 최적화 - 최대 300자 이내
  `,

  en: `You are a tennis rules expert...

  ## Instructions:
  - **Structure**: Core answer (2-3 sentences) → Detailed if needed
  - **Citations**: Always use [1], [2], [3] when referencing
  - **Tone**: Professional, concise, and clear
  - **Length**: Mobile-optimized - max 350 tokens
  `
}
```

수정 후 재배포:
```bash
supabase functions deploy tennis-rag-query
```

---

## 5. 문제 해결

### ❓ 자주 묻는 질문

#### Q1. "85 rules ready" 대신 "No rules data" 표시

**원인**: 데이터베이스에 규칙이 로드되지 않음

**해결**:
```sql
-- Supabase SQL Editor에서 확인
SELECT COUNT(*) FROM tennis_rules;

-- 0이면 ETL 다시 실행 필요
```

#### Q2. 답변이 너무 짧거나 부정확함

**원인**: 관련 규칙을 찾지 못함

**해결**:
1. 질문을 더 구체적으로 작성
2. 다른 표현으로 재질문
3. 영어/한글 언어 변경

#### Q3. "Failed to generate answer" 에러

**원인**: Gemini API 키 문제

**해결**:
1. API 키 재확인
2. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 새 키 발급
3. Test Connection으로 검증

#### Q4. 모바일에서 답변이 잘림

**현재 상태**: ✅ **해결됨**

새 버전은 모바일 최적화되어 있습니다:
- 최대 300자 (한글) / 350 tokens (영어)
- 핵심 답변 우선 제시
- 명확한 구조

#### Q5. 인용 출처 [1], [2], [3]가 안 보임

**현재 상태**: ✅ **해결됨**

새 프롬프트는 인용 번호를 필수로 포함합니다.

#### Q6. Edge Function 배포 실패

**원인**: Supabase CLI 로그인 문제

**해결**:
```bash
# 로그아웃 후 재로그인
supabase logout
supabase login

# 프로젝트 재연결
supabase link --project-ref your-project-ref

# 재배포
supabase functions deploy tennis-rag-query
```

### 📞 추가 지원

- **GitHub Issues**: [tennis-mate/issues](https://github.com/HouuYa/tennis-mate/issues)
- **문서**: `TENNIS_RAG_INTEGRATION_PLAN.md` 참조

---

## 🎉 요약

### 현재 상태

```
✅ Edge Function 배포됨: tennis-rag-query
✅ 85개 테니스 규칙 로드됨
✅ 모바일 최적화 완료
✅ 인용 출처 시스템 구현
✅ 다국어 지원 (한글/영어)
```

### 사용자 체크리스트

- [ ] Gemini API 키 발급 및 입력
- [ ] "85 rules ready" 초록 배지 확인
- [ ] 테스트 질문으로 답변 품질 확인
- [ ] 모바일/데스크톱 모두 테스트

### 관리자 체크리스트

- [x] Edge Function 배포 (tennis-rag-query)
- [x] Supabase 환경 변수 설정
- [x] 규칙 데이터 로드 (85개)
- [x] 프롬프트 최적화 (모바일/인용/다국어)
- [ ] 정기 규칙 업데이트 계획 수립

---

**문서 버전**: 2.0.0 (모바일 최적화 반영)
**최종 업데이트**: 2026-02-10
