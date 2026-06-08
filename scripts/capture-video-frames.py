"""Playwright로 우리 앱 시연 스크린샷 자동 캡처.

장면 시퀀스:
  01 home_hero — 홈 상단
  02 home_cards — 홈 기능 카드 3개
  03 plan_top — 입력 페이지 상단 (도시/시군구/시간)
  04 plan_companions — 동행자 부분
  05 plan_themes — 테마 칩
  06 result_course — 결과 페이지 코스 카드
  07 result_barrier_free — 무장애 배지 클로즈업
  08 result_recommended — 추천 풀 (다른 조합 보기)
  09 result_narrative — multiGen narrative
  10 result_emergency — 응급실/화장실 카드
"""

import sys, io, json, asyncio
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "submission" / "assets" / "video-frames"
OUT.mkdir(parents=True, exist_ok=True)

BASE = "http://localhost:3000"
VIEWPORT = {"width": 1920, "height": 1080}

# 데모 시나리오 — 서울 종로구 3세대 역사 테마
TRIP_REQUEST = {
    "city": "seoul",
    "sigungu": "23",  # 종로구
    "durationHours": 5,
    "theme": "history",
    "cuisine": "korean",
    "date": "2026-06-10",
    "startTime": "09:30",
    "companions": [
        {"id": "1", "nickname": "할머니", "age": 78, "mobility": "wheelchair_manual",
         "sensoryNeeds": [], "notes": "오래 못 걸어요", "staminaPercent": 60},
        {"id": "2", "nickname": "어머니", "age": 52, "mobility": "general",
         "sensoryNeeds": [], "staminaPercent": 85},
        {"id": "3", "nickname": "손주", "age": 8, "mobility": "child",
         "sensoryNeeds": [], "staminaPercent": 95},
    ],
}


async def capture(page, name, full=False, scroll_y=0):
    if scroll_y > 0:
        await page.evaluate(f"window.scrollTo(0, {scroll_y})")
        await page.wait_for_timeout(400)
    path = OUT / f"{name}.png"
    await page.screenshot(path=str(path), full_page=full)
    print(f"  ✓ {name}.png  (size {(await page.evaluate('document.documentElement.scrollHeight')) if full else '1080'}h)")


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport=VIEWPORT, locale="ko-KR")
        page = await ctx.new_page()

        # ───── 1. 홈 페이지 ─────
        print("[1] Home page")
        await page.goto(BASE)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(500)
        await capture(page, "01_home_hero")
        await capture(page, "02_home_cards", scroll_y=400)

        # ───── 2. 입력 페이지 (raw) ─────
        print("[2] Plan page — empty")
        await page.goto(f"{BASE}/plan")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(800)
        await capture(page, "03_plan_top")
        # 스크롤하면서 추가 캡처 — 동행자/테마 부분
        await capture(page, "04_plan_companions", scroll_y=600)
        await capture(page, "05_plan_themes", scroll_y=1200)

        # ───── 3. /api/plan 호출해서 결과 받기 ─────
        print("[3] POST /api/plan — generating course (15s expected)")
        api_url = f"{BASE}/api/plan"
        result = await page.evaluate(f"""
            async () => {{
                const res = await fetch('{api_url}', {{
                    method: 'POST',
                    headers: {{ 'content-type': 'application/json' }},
                    body: JSON.stringify({json.dumps(TRIP_REQUEST)})
                }});
                if (!res.ok) throw new Error('plan fail ' + res.status);
                return await res.json();
            }}
        """)
        print(f"    course generated — {len(result.get('spots', []))} stops, "
              f"{len(result.get('recommendedSpots', []))} recommended")

        # ───── 4. 결과 페이지 — sessionStorage 주입 후 이동 ─────
        print("[4] Result page")
        result_json = json.dumps(result, ensure_ascii=False)
        # sessionStorage 주입을 위해 같은 origin에서 setItem
        # 우리는 이미 plan 페이지에 있어서 같은 origin
        await page.evaluate(f"sessionStorage.setItem('trip-plan', {json.dumps(result_json)})")
        await page.goto(f"{BASE}/result")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1500)  # 모든 컴포넌트 mount

        await capture(page, "06_result_course")
        await capture(page, "07_result_barrier_free", scroll_y=600)
        await capture(page, "08_result_recommended", scroll_y=1400)
        await capture(page, "09_result_narrative", scroll_y=2200)
        await capture(page, "10_result_emergency", scroll_y=3000)

        await browser.close()
    print(f"\n✓ Done. Frames in: {OUT}")


asyncio.run(main())
