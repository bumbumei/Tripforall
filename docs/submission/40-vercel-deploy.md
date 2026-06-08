# Vercel 배포 가이드

> 사용자가 직접 5분 안에 따라 할 수 있는 단계별 절차.
> 빌드·설정·환경변수 준비는 모두 완료된 상태 (vercel.json, next.config.js 적용됨).

---

## 0. 사전 체크

- ✅ Vercel 계정 가입됨 (GitHub 로그인)
- ✅ GitHub repo public: https://github.com/bumbumei/Tripforall
- ✅ 로컬 빌드 통과: `pnpm build` (Static 5 + API 2)
- ✅ `vercel.json` 적용: 서울 region(`icn1`) + `/api/plan` maxDuration 60초

---

## 1. Plan 결정 (timeout 핵심)

| Plan | timeout | 우리 응답(~15초) | 권장 |
|---|---|---|---|
| **Hobby** | 10초 | ⚠️ 자주 504 timeout | 비추천 |
| **Pro** ($20/월) | 60초 (default) ~ 300초 | ✅ 여유 | **권장** |

**대안**: Hobby 그대로 쓰고 일부 호출에서 timeout 발생 감수, 결선 진출 후 Pro 전환

---

## 2. 프로젝트 Import (3분)

1. https://vercel.com/new 접속
2. **Import Git Repository** → `bumbumei/Tripforall` 선택
3. Configure Project 화면:
   - **Framework Preset**: Next.js (자동 감지) ✅
   - **Root Directory**: `./` (변경 없음)
   - **Build Command**: `pnpm build` (자동) ✅
   - **Install Command**: `pnpm install` (자동) ✅
   - **Output Directory**: `.next` (자동) ✅

## 3. 환경 변수 입력 (가장 중요)

**Environment Variables** 섹션에 다음 7개 추가 (`Production` + `Preview` + `Development` 모두 체크):

```
TOUR_API_KEY              <.env.local 그대로>
KCISA_API_KEY             <.env.local 그대로>
ENNOIA_API_KEY            <.env.local 그대로>
ENNOIA_PROJECT            KNTO-PROMPTON-2026-330
ENNOIA_PRESET_HASH        87a37c721be0228b449eef18c880c857e6ba014ba4a80fbf4e0e173eb8926264
ENNOIA_USER_ID            <.env.local 그대로>
USE_MOCK_TOUR_API         false
```

> ⚠️ 값은 본인 로컬 `.env.local`에서 정확히 복사 (공개 repo에 노출 안 됨).

추가 권장 (선택):
```
ENNOIA_REFERER            https://<deploy>.vercel.app
OPENROUTER_API_KEY        <fallback용>
```

## 4. Deploy

**Deploy** 버튼 클릭 → 약 2분 후:
- 빌드 로그 확인 (typecheck·lint·정적 생성)
- 배포 URL 발급: `https://tripforall-xxx.vercel.app`

## 5. 동작 검증

배포 직후 시크릿 브라우저 창에서:

```
1. https://<deploy>.vercel.app          # 홈
2. https://<deploy>.vercel.app/api/diag # 환경 확인
   → llm.provider: "ennoia" 표시되면 정상
   → tourApi.attempts: status 200 표시되면 정상
3. https://<deploy>.vercel.app/plan     # 입력 → 여정 만들기
   → 약 15초 후 결과 페이지 → multiGen narrative까지 확인
```

⚠️ 첫 호출 시 cold start 추가 5~10초 발생 가능.

## 6. 시연 URL 폼 제출

폼 ⑦ 외부 링크에 줄바꿈으로 추가:

```
GitHub: https://github.com/bumbumei/Tripforall
시연 URL: https://<deploy>.vercel.app
Ennoia 공유 앱: <Studio에서 생성한 URL>
```

---

## 트러블슈팅

### Build fail: `Module not found: lib/data/accessible-toilets.json`
→ Repo에 포함됨 (1.7MB JSON). Vercel은 100MB limit 안. 정상.

### `Function execution timeout` (10초 limit) on Hobby
→ Pro로 전환 또는 `/api/plan` 응답 단축 (KTO MCP preset 안 쓰기)

### 한글 폰트 깨짐 / Image 404
→ KTO 이미지 (`tong.visitkorea.or.kr`)는 `next.config.js`에 등록됨. 외부 도메인 다른 게 추가되면 거기에도 등록 필요.

### `/api/plan` 호출 시 Ennoia 인증 실패
→ Vercel 환경변수 `ENNOIA_USER_ID`가 정확한 32자 hex UUID인지 재확인 (이메일 X)

### 로컬은 되는데 Vercel은 안 됨
→ Vercel Dashboard → Deployment → **Function Logs** 확인. 환경변수 누락이 대부분 원인.

---

## 비용·trial 참고

- **Hobby**: 무료, 100GB bandwidth/월, function 10초 timeout
- **Pro**: $20/월 (월결제), 1TB bandwidth, 60초~300초 timeout, 다중 region
- **Trial**: Pro 30일 무료 trial 종종 제공. 결제 전에 trial 적용 가능한지 확인

**경진대회 평가 기간만 라이브가 필요하다면**:
- Pro로 결제 (1개월 = $20) → 결선 후 해지
- 또는 Render free tier로 대체 (15분 idle → 30초 cold start)
