# Tennis Mate - TODO List

## 📍 한글 주소 지원 (Korean Address Support)

**현재 상태**: OpenStreetMap Nominatim 사용 (영어 주소 반환)
**목표**: 한글 주소 지원

### 옵션 1: Kakao Map API (추천)

**무료 범위**: 일 300,000건
**장점**: 완벽한 한글 지원, 간단한 REST API

#### 1. API 키 발급
1. https://developers.kakao.com 회원가입
2. 내 애플리케이션 > 앱 만들기
3. REST API 키 복사

#### 2. 환경 변수 설정
```bash
# .env 파일 생성
VITE_KAKAO_REST_API_KEY=your_rest_api_key_here
```

#### 3. 코드 수정 (CloudSessionManager.tsx)
```typescript
const handleGetLocation = () => {
  setGettingLocation(true);
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const response = await fetch(
          `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${position.coords.longitude}&y=${position.coords.latitude}`,
          {
            headers: {
              Authorization: `KakaoAK ${import.meta.env.VITE_KAKAO_REST_API_KEY}`
            }
          }
        );
        const data = await response.json();

        // 한글 주소: "서울특별시 강남구 역삼동"
        const address = data.documents[0]?.address?.address_name
          || data.documents[0]?.road_address?.address_name
          || `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;

        setLocation(address);
        showToast('위치 감지 완료', 'success');
      } catch (error) {
        setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        showToast('Location detected (coordinates)', 'success');
      }
      setGettingLocation(false);
    },
    (error) => {
      showToast('위치 감지 실패', 'error');
      setGettingLocation(false);
    }
  );
};
```

---

### 옵션 2: Naver Map API

**무료 범위**: 일 100,000건 (Mobile), 50,000건 (Web)
**장점**: 한글 지원, 상세한 한국 지도 데이터

#### 1. API 키 발급
1. https://www.ncloud.com 회원가입
2. Console > Services > Maps > Reverse Geocoding
3. Client ID 복사

#### 2. 환경 변수 설정
```bash
# .env
VITE_NAVER_CLIENT_ID=your_client_id_here
```

#### 3. 코드 수정
```typescript
const response = await fetch(
  `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${position.coords.longitude},${position.coords.latitude}&output=json`,
  {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': import.meta.env.VITE_NAVER_CLIENT_ID
    }
  }
);
const data = await response.json();
const address = data.results[0]?.region?.area1?.name + ' ' +
                data.results[0]?.region?.area2?.name + ' ' +
                data.results[0]?.region?.area3?.name;
```

---

## 🔄 기타 개선 사항

- [ ] 한글 주소 API 통합
- [ ] 환경 변수 관리 (.env.example 파일 추가)
- [ ] API 에러 핸들링 개선
- [ ] 좌표 → 주소 캐싱 (동일 위치 중복 요청 방지)

---

## 📝 참고 문서

- [Kakao Developers](https://developers.kakao.com/docs/latest/ko/local/dev-guide#coord-to-address)
- [Naver Cloud Platform](https://api.ncloud-docs.com/docs/ai-naver-mapsreversegeocoding-gc)
