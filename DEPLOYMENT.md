# Tennis Mate - 배포 가이드

## 📋 필수 요구사항

### 1. Supabase 프로젝트 설정
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 [`supabase_schema.sql`](./supabase_schema.sql) 실행
3. Project Settings → API에서 URL과 anon key 복사

### 2. Google Gemini API (선택사항)
AI 코치 기능 사용 시 [Google AI Studio](https://makersuite.google.com/app/apikey)에서 API 키 발급

---

## 🚀 Netlify 배포

### Step 1: GitHub 연동
1. GitHub에 코드 푸시
2. [Netlify](https://netlify.com) 로그인
3. **Add new site** → **Import an existing project** → GitHub 선택
4. 리포지토리 선택

### Step 2: 빌드 설정
Netlify가 `netlify.toml`을 자동 감지합니다:
```toml
[build]
  command = "npm install && npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
```

### Step 3: 환경변수 설정

**Site configuration → Environment variables**에서 다음 변수를 추가하세요:

#### 필수 - Supabase 연동
| Variable | Value | Scopes |
|----------|-------|--------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL (예: `https://xxx.supabase.co`) | All |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key (예: `eyJhbGci...`) | All |

#### 필수 - Admin 인증 (v1.3.1+)
| Variable | Value | Scopes |
|----------|-------|--------|
| `ADMIN_ID` | Admin 로그인 ID (예: `admin`) | Production, Deploy Previews |
| `ADMIN_PASSWORD` | 강력한 비밀번호 (8자 이상 권장) | Production, Deploy Previews |
| `ADMIN_JWT_SECRET` | 랜덤 문자열 32자 이상 (아래 생성 방법 참고) | Production, Deploy Previews |

**`ADMIN_JWT_SECRET` 생성 방법:**
```bash
# Mac/Linux
openssl rand -base64 32

# Windows (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

출력된 문자열을 복사하여 사용하세요.

#### 선택사항 - AI 코치
| Variable | Value | Scopes |
|----------|-------|--------|
| `VITE_GEMINI_API_KEY` | Google Gemini API 키 | All |

### Step 4: 배포
1. **Deploy site** 클릭
2. 빌드 로그 확인
3. 배포 완료 후 사이트 URL 확인

---

## 🔧 트러블슈팅

### ❌ Admin 로그인 시 "Server configuration error"

**원인**: `ADMIN_ID`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET` 환경변수 누락

**해결**:
1. Netlify Dashboard → Site configuration → Environment variables
2. 위의 3개 변수 추가
3. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

### ❌ 빌드 실패 - "Failed to resolve entry"

**원인**: 의존성 설치 실패

**해결**:
```bash
# 로컬에서 확인
npm install
npm run build

# Netlify에서 캐시 초기화
Deploys → Trigger deploy → Clear cache and deploy site
```

### ❌ Supabase 연결 실패

**원인**: `VITE_SUPABASE_URL` 또는 `VITE_SUPABASE_ANON_KEY` 오류

**확인**:
1. Supabase Dashboard → Settings → API
2. URL과 `anon` public key가 올바른지 확인 (Service Role Key가 아님!)
3. Netlify 환경변수에 올바르게 입력되었는지 확인

### ❌ Admin 페이지에서 데이터 삭제 불가

**원인**: Supabase RLS DELETE 정책 누락

**해결**: Supabase SQL Editor에서 실행
```sql
-- 각 테이블에 DELETE 정책 추가 (예시: players)
DROP POLICY IF EXISTS "Allow public delete access" ON public.players;
CREATE POLICY "Allow public delete access" ON public.players FOR DELETE USING (true);

-- sessions, session_players, matches 테이블도 동일하게 설정
```
전체 SQL: [`supabase_schema.sql`](./supabase_schema.sql) 참고

---

## 🧪 로컬 개발

### 1. 기본 개발 (Frontend만)
```bash
# .env 파일 생성
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key

# 개발 서버 실행
npm run dev
```

**⚠️ 제한사항**: Netlify Functions가 실행되지 않아 **Admin 로그인 불가**

### 2. 전체 개발 (Frontend + Netlify Functions)
```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 로그인
netlify login

# 프로젝트 링크 (최초 1회)
netlify link

# .env 파일 (동일)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key

# 서버사이드 환경변수 (VITE_ 접두사 없음)
ADMIN_ID=admin
ADMIN_PASSWORD=test123
ADMIN_JWT_SECRET=your_local_secret

# 개발 서버 실행 (Frontend + Functions)
netlify dev
```

**✅ Admin 로그인 작동**

---

## 📊 환경변수 요약표

| Variable | 위치 | 필수 | 설명 |
|----------|------|------|------|
| `VITE_SUPABASE_URL` | 클라이언트 | ✅ | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 클라이언트 | ✅ | Supabase public anon key |
| `ADMIN_ID` | 서버 | ✅ | Admin 로그인 ID |
| `ADMIN_PASSWORD` | 서버 | ✅ | Admin 비밀번호 |
| `ADMIN_JWT_SECRET` | 서버 | ✅ | JWT 서명 키 (32자+) |
| `VITE_GEMINI_API_KEY` | 클라이언트 | 선택 | AI 코치용 Gemini API 키 |

**주의**:
- `VITE_` 접두사 = 클라이언트 JS 번들에 포함됨 (공개)
- `VITE_` 없음 = 서버사이드 전용 (비공개)

---

## 🔐 보안 권장사항

### Admin 비밀번호
- ✅ 최소 12자 이상
- ✅ 대소문자, 숫자, 특수문자 조합
- ✅ 비밀번호 관리자 사용 권장
- ❌ 사전 단어 사용 금지

### JWT Secret
- ✅ 랜덤 생성 (`openssl rand -base64 32`)
- ✅ 최소 32자 이상
- ❌ 예측 가능한 문자열 금지

### Supabase RLS
- ⚠️ 현재 설정: 모든 CRUD 작업 공개 허용 (`USING (true)`)
- ⚠️ 의도적 설계: Guest Mode 호환 (소규모 신뢰 그룹 전제)
- 🔒 프로덕션 강화: Supabase Auth 도입 + RLS 정책 변경

---

## 📱 도메인 설정 (선택사항)

### Netlify 커스텀 도메인
1. **Domain settings** → **Add custom domain**
2. 도메인 입력 (예: `tennismate.app`)
3. DNS 설정 (Netlify가 제공하는 네임서버 또는 A/CNAME 레코드)
4. HTTPS 자동 설정 (Let's Encrypt)

---

## 🆘 추가 지원

- **문서**: [ARCHITECTURE.md](./ARCHITECTURE.md), [README.md](./README.md)
- **이슈**: [GitHub Issues](https://github.com/HouuYa/tennis-mate/issues)
- **Supabase 문서**: https://supabase.com/docs
- **Netlify 문서**: https://docs.netlify.com
