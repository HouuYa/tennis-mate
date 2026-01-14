# Tennis Rules ETL Script

PDF 파일에서 테니스 룰을 추출하고, Gemini embeddings를 생성하여 Supabase에 업로드하는 스크립트입니다.

## 사전 준비

### 1. Python 환경 설정

```bash
# Python 3.8 이상 필요
python --version

# 가상환경 생성 (선택사항)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate  # Windows
```

### 2. 패키지 설치

```bash
cd scripts
pip install -r requirements.txt
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가합니다:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

**중요**: `SUPABASE_SERVICE_KEY`는 **service_role** 키여야 합니다 (anon key가 아님).

### 4. PDF 파일 준비

PDF 파일들을 한 디렉토리에 모아둡니다. 예: `./tennis-rules-pdfs/`

**파일명 규칙**:
- 한글 PDF: 파일명에 `한글`, `korean`, `ko`, `규칙` 중 하나 포함
- 영어 PDF: 그 외 모든 파일

예시:
```
tennis-rules-pdfs/
  ├── ITF_Rules_of_Tennis_2024.pdf          (영어로 처리)
  ├── tennis_rules_korean_2024.pdf          (한글로 처리)
  └── 테니스_규칙_2024.pdf                   (한글로 처리)
```

## 사용법

### 기본 실행

```bash
python scripts/upload_tennis_rules.py --pdf-dir ./tennis-rules-pdfs
```

### 명령줄 인자로 키 전달

```bash
python scripts/upload_tennis_rules.py \
  --pdf-dir ./tennis-rules-pdfs \
  --supabase-url https://your-project.supabase.co \
  --supabase-key your-service-key \
  --gemini-key your-gemini-key
```

## 처리 과정

1. **PDF 텍스트 추출**: PyPDF2로 모든 페이지 읽기
2. **조항별 Chunking**:
   - 영어: "Article N", "Rule N", "Section N" 패턴으로 분할
   - 한글: "제N조", "제N장" 패턴으로 분할
   - 패턴 없으면 크기 기반 chunking (800자, 150자 overlap)
3. **Embeddings 생성**: Gemini `text-embedding-004` 모델 사용 (768차원)
4. **Supabase 업로드**: 10개씩 batch insert

## 출력 예시

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
  업로드: 10/36 완료
  업로드: 20/36 완료
  업로드: 30/36 완료
  업로드: 36/36 완료
✓ Supabase 업로드 완료: 36 chunks
✓ ITF_Rules_of_Tennis_2024.pdf 처리 완료: 36 chunks 업로드됨

============================================================
✅ 전체 처리 완료
  - 처리된 파일: 2/2
  - 업로드된 chunks: 68
============================================================
```

## 문제 해결

### ImportError: No module named 'X'
```bash
pip install -r requirements.txt
```

### "❌ 필수 환경 변수가 설정되지 않았습니다"
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 또는 명령줄 인자로 직접 전달

### "❌ Supabase 업로드 실패"
- `SUPABASE_SERVICE_KEY`가 **service_role** 키인지 확인 (anon key 아님)
- Supabase에서 `tennis_rules` 테이블이 생성되었는지 확인
- pgvector extension이 활성화되었는지 확인

### "⚠️ 조항 패턴을 찾지 못함"
- PDF 구조가 일반적인 조항 형식이 아닌 경우
- 자동으로 크기 기반 chunking으로 전환됨 (정상 동작)

## 주의사항

- **한 번만 실행**: 동일한 파일을 여러 번 실행하면 중복 데이터가 생성됩니다
- **API 비용**: Gemini Embeddings API는 사용량에 따라 과금됩니다
- **처리 시간**: 100페이지 PDF는 약 2-3분 소요됩니다
- **백업**: 실행 전 Supabase 데이터를 백업하는 것을 권장합니다

## 데이터 확인

Supabase Dashboard에서 확인:
```sql
SELECT
  source_file,
  language,
  COUNT(*) as chunk_count
FROM tennis_rules
GROUP BY source_file, language;
```

## 데이터 삭제 (재실행 시)

```sql
DELETE FROM tennis_rules;
```
