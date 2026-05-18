# 함께걸음 · TripForAll

> 가장 느린 사람을 기준으로, 모두가 즐거운 여행.
> 한국관광공사 무장애 데이터를 AI가 다정하게 해석합니다.

## 컨셉

2026 한국관광공사 트렌드 키워드 **D.U.A.L.I.S.M.** 중
**Digital Humanity · Multi-Generation Flow · Adaptive Resilience**를 정면으로 다루는
이동약자·동반가족 맞춤 AI 여행 동행자.

## 3대 핵심 기능

| | 기능 | 설명 |
|---|---|---|
| 🔋 | **Slow Pace Match** | 가장 느린 동행자 기준 체력 시뮬레이션 — 100% 출발 → 잔여 체력 추적 |
| 🛡 | **회복 점수** | safety / rest / nature / crowd / weather 5축 레이더 |
| 👨‍👩‍👧 | **Multi-Gen Bridge** | 공통 동선 + 짧은 분기 + 세대 연결 미션 + 리허설 내러티브 |

## 스택

- Next.js 14 (App Router) + TypeScript + Tailwind
- 한국관광공사 TourAPI 4.0 (무장애 여행정보·국문 관광정보)
- Anthropic Claude (`claude-sonnet-4-6`)
- mock-data fallback — TourAPI 키 없이도 데모 동작
- LLM 키 없이도 결정론적 fallback 결과 생성

## 시작

```bash
cp .env.example .env.local
# TOUR_API_KEY, ANTHROPIC_API_KEY 입력 (없으면 mock 모드로 동작)
pnpm install
pnpm dev
# → http://localhost:3000
```

키 연결 확인:
```bash
curl http://localhost:3000/api/diag
```
`tourApi.attempts[].status === 200`이면 실 API 정상. 모두 실패하면 mock 데이터로
자동 폴백되므로 화면은 정상 렌더됩니다. (TourAPI 4.0과 3.0이 공존하므로 코드가
`KorWithService2 → KorWithService1` 순으로 시도)

## 폴더 구조

```
app/
  page.tsx          # 랜딩
  plan/page.tsx     # 동행자 입력 폼
  result/page.tsx   # 3대 기능 결과
  api/plan/route.ts # 메인 API — TourAPI + LLM 통합
lib/
  tour-api.ts       # TourAPI 4.0 클라이언트
  cities.ts         # 서울·제주·부산 areaCode
  course-builder.ts # nearest-neighbor 코스 생성
  claude.ts         # LLM 래퍼 + JSON 파서
  fallback.ts       # LLM 없을 때 결정론적 결과
  mock-data.ts      # TourAPI 시드 데이터
  prompts/
    pace.ts         # Slow Pace 프롬프트
    wellness.ts     # 회복 점수 프롬프트
    multigen.ts     # Multi-Gen Bridge 프롬프트
components/
  PaceGauge.tsx
  WellnessRadar.tsx
  MultiGenTimeline.tsx
types/
  index.ts
```

## 데모 시나리오

`/plan` 기본값:
- 👵 할머니 78세 · 수동 휠체어 · 고관절 수술 후 회복
- 👩 어머니 52세 · 임신 7개월
- 👦 손주 5세

→ 서울 4시간 코스 → AI가 세대별 페이스 동기화 + 분기 동선 + 회복 점수 + 리허설 일기.

## 차별점 (vs 기존 공공 서비스)

| 항목 | 모두의 여행 / 다누림 | 함께걸음 |
|---|---|---|
| 데이터 | 시설 0/1 | 시설 + LLM 해석 + 시뮬레이션 |
| 페이스 | — | 가장 느린 사람 기준 동적 시뮬레이션 |
| 세대 동기화 | — | 공통/분기/재합류 + 정서 미션 |
| 트렌드 매칭 | 정적 | D.U.A.L.I.S.M. 5/7 키워드 |
