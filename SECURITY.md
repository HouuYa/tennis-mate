# Security Policy

## 보안 아키텍처 (v1.3.2)

Tennis Mate는 **소규모 신뢰 그룹(친구, 테니스 클럽)** 사용을 전제로 설계되었습니다. Guest Mode 호환을 위해 의도적으로 단순한 보안 정책을 채택하고 있습니다.

---

## 🔐 Admin 인증 (v1.3.1)

### 서버사이드 JWT 인증

**구현 방식:**
- Netlify Function (`/api/admin-auth`)을 통한 서버사이드 자격증명 검증
- JWT (HS256) 토큰 발급 (4시간 만료)
- 환경변수 `ADMIN_ID`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`는 서버 전용 (`VITE_` 접두사 없음)

**보안 특성:**
- ✅ 비밀번호가 클라이언트 JS 번들에 포함되지 않음
- ✅ JWT 만료 시간 제한 (4시간)
- ✅ 서버사이드 검증으로 클라이언트 조작 불가
- ⚠️ Rate limiting 없음 (Netlify Function의 제한에 의존)
- ⚠️ 2FA 미지원

**권장 비밀번호 정책:**
- 최소 12자 이상
- 대소문자, 숫자, 특수문자 조합
- 비밀번호 관리자 사용 권장

---

## ⚡ Supabase Edge Function 인증 (v1.3.2)

### ETL Edge Function (`tennis-etl`)

**인증 방식 (v1.3.2+):**
```typescript
// request body에 adminKey 포함:
{ "action": "...", "adminKey": "<SUPABASE_SERVICE_ROLE_KEY 또는 ADMIN_PASSWORD>" }
```

**구현:**
- request body의 `adminKey`를 `SUPABASE_SERVICE_ROLE_KEY` 또는 `ADMIN_PASSWORD`와 비교
- 인증 실패 시 401 반환, 요청 처리 안 함

**보안 특성:**
- ✅ 인증 없이는 ETL 함수 호출 불가 (이전 버전은 완전 공개)
- ✅ `ADMIN_PASSWORD`는 Supabase Secret으로 관리 (환경변수, 코드에 미노출)
- ✅ Admin UI와 동일한 비밀번호로 통합 인증 가능
- ⚠️ Rate limiting 없음 (Supabase Edge Runtime 제한에 의존)
- ⚠️ 토큰 전송 시 HTTPS 필수 (Supabase는 기본 HTTPS 강제)

**Supabase Secret 설정:**
```bash
supabase secrets set ADMIN_PASSWORD=<your_admin_password>
```

> **동일한 `ADMIN_PASSWORD`**를 Netlify (Admin UI 인증)와 Supabase (ETL 함수 인증) 양쪽에 설정합니다.

---

## 🗄️ Supabase RLS (Row Level Security)

### 현재 정책: 전체 공개 (Permissive)

**설정:**
```sql
CREATE POLICY "Allow public read access" ON public.players FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.players FOR DELETE USING (true);
-- sessions, session_players, matches 테이블도 동일
```

**의미:**
- Supabase anon key를 가진 **누구나** 데이터 읽기/쓰기/수정/삭제 가능
- Admin UI 인증은 **UI 접근 제어**만 담당 (DB 레벨 제한 아님)
- Guest Mode 호환을 위한 **의도적 설계**

### 위험 평가

| 위험 | 수준 | 설명 |
|------|------|------|
| **데이터 삭제** | 🟡 중간 | 소스코드를 보거나 네트워크 요청을 가로채면 anon key 확인 가능 → 직접 Supabase API로 삭제 가능 |
| **데이터 조작** | 🟡 중간 | 마찬가지로 경기 점수, 플레이어 정보 임의 변경 가능 |
| **데이터 유출** | 🟢 낮음 | 민감한 개인정보 없음 (이름, 점수만 저장) |
| **무단 접근** | 🔴 높음 | Anon key는 공개되므로 기술적으로는 누구나 접근 가능 |

**왜 이렇게 설계했는가?**
1. **Guest Mode 호환**: 사용자 계정 없이 즉시 사용 가능
2. **간단함**: 복잡한 인증 시스템 불필요 (소규모 친목 모임 대상)
3. **투명성**: 사용자가 자신의 데이터 소유권 명확히 인지 (Google Sheets 모드 제공)

---

## 🛡️ 프로덕션 강화 방법

만약 **공개 서비스**로 전환하거나 **데이터 보호가 중요**한 경우:

### 1. Supabase Auth 도입
```typescript
// Supabase 인증 활성화
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
});

// 로그인 후 사용자 ID 확인
const { data: { user } } = await supabase.auth.getUser();
```

### 2. RLS 정책 변경
```sql
-- INSERT/UPDATE/DELETE는 인증된 사용자만
CREATE POLICY "Authenticated users can insert" ON public.players
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update" ON public.players
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete" ON public.players
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- SELECT는 여전히 공개 (리더보드 등)
CREATE POLICY "Public read access" ON public.players
  FOR SELECT USING (true);
```

### 3. 소유권 기반 RLS
```sql
-- players 테이블에 owner_id 컬럼 추가
ALTER TABLE public.players ADD COLUMN owner_id UUID REFERENCES auth.users(id);

-- 자기 데이터만 수정/삭제 가능
CREATE POLICY "Users can update own data" ON public.players
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own data" ON public.players
  FOR DELETE USING (auth.uid() = owner_id);
```

### 4. Admin Role 추가
```sql
-- 사용자 메타데이터에 role 추가
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
WHERE email = 'admin@example.com';

-- Admin만 삭제 가능
CREATE POLICY "Admins can delete" ON public.players
  FOR DELETE USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
```

---

## 🔍 알려진 취약점

### 1. Anon Key 노출 (의도적)
- **위치**: 클라이언트 JS 번들 (`VITE_SUPABASE_ANON_KEY`)
- **영향**: 직접 Supabase API 호출 가능
- **완화**: RLS 정책에 의존 (현재는 `USING (true)`로 전체 공개)

### 2. Admin Function Rate Limiting 없음
- **위치**: `netlify/functions/admin-auth.ts`
- **영향**: 브루트포스 공격 가능 (Netlify Function 제한에만 의존)
- **완화**: 강력한 비밀번호 사용, Netlify의 기본 rate limit

### 3. CORS 전체 허용
- **위치**: `netlify/functions/admin-auth.ts` (`Access-Control-Allow-Origin: *`)
- **영향**: 모든 도메인에서 Admin API 호출 가능
- **완화**: Admin 로그인은 UI 접근 제어용, 실제 데이터는 RLS 보호

---

## 📋 보안 체크리스트

### 배포 전
- [ ] `ADMIN_PASSWORD`는 12자 이상 강력한 비밀번호
- [ ] `ADMIN_JWT_SECRET`는 랜덤 생성 (32자 이상)
- [ ] Supabase Service Role Key는 **절대 클라이언트에 노출하지 않음**
- [ ] `.env` 파일은 `.gitignore`에 포함됨

### 정기 점검
- [ ] 의심스러운 Supabase 활동 로그 확인
- [ ] Netlify Function 호출 로그 검토
- [ ] Admin 비밀번호 정기 변경 (분기별 권장)

### 프로덕션 전환 시
- [ ] Supabase Auth 도입
- [ ] RLS 정책 강화 (INSERT/UPDATE/DELETE 제한)
- [ ] Admin Function에 rate limiting 추가
- [ ] CORS 정책 특정 도메인으로 제한

---

## 🐛 취약점 신고

보안 취약점을 발견하신 경우:

1. **공개 이슈로 등록하지 마세요**
2. [GitHub Security Advisories](https://github.com/HouuYa/tennis-mate/security/advisories) 사용
3. 또는 프로젝트 관리자에게 비공개 메시지

---

## 📚 참고 문서

- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Netlify Functions 보안](https://docs.netlify.com/functions/security/)
- [JWT 베스트 프랙티스](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**마지막 업데이트**: 2026-02-18 (v1.3.2)
