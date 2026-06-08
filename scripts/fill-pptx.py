"""Fill the KTO Promton 2026 service intro PPTX template with TripForAll content.

Preserves all template design (colors, layouts, tables, shapes). Only replaces
placeholder text. Slide 1 (guide page) is removed before saving.
"""

import sys, io, copy
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from pptx import Presentation
from pptx.util import Pt, Inches, Emu
from pptx.dml.color import RGBColor
from copy import deepcopy
from lxml import etree
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = str(ROOT / "scripts" / "template.pptx")
OUT = str(ROOT / "docs" / "submission" / "함께걸음_서비스소개서_TripForAll.pptx")
ASSETS = ROOT / "docs" / "submission" / "assets" / "png"


def replace_text_keep_format(shape, new_text):
    """Replace shape text but try to preserve the formatting of the first run."""
    tf = shape.text_frame
    # Capture first run's font properties to apply to new content
    first_para = tf.paragraphs[0]
    first_run = first_para.runs[0] if first_para.runs else None

    # Clear all paragraphs except the first
    p_elements = tf._txBody.findall(
        ".//{http://schemas.openxmlformats.org/drawingml/2006/main}p"
    )
    for p in p_elements[1:]:
        p.getparent().remove(p)

    # Set first paragraph: keep first run, remove others
    if first_run is not None:
        # Remove all runs from first paragraph except first
        runs = first_para.runs
        for r in runs[1:]:
            r._r.getparent().remove(r._r)
        first_run.text = ""

    # Now write new text — split on \n for multi-line
    lines = new_text.split("\n")
    for i, line in enumerate(lines):
        if i == 0:
            if first_run is not None:
                first_run.text = line
            else:
                first_para.text = line
        else:
            p = tf.add_paragraph()
            run = p.add_run()
            run.text = line
            # Copy formatting from first run if possible
            if first_run is not None:
                try:
                    if first_run.font.size:
                        run.font.size = first_run.font.size
                    if first_run.font.name:
                        run.font.name = first_run.font.name
                    if first_run.font.bold is not None:
                        run.font.bold = first_run.font.bold
                    if first_run.font.color and first_run.font.color.type:
                        run.font.color.rgb = first_run.font.color.rgb
                except Exception:
                    pass


def set_cell_text(cell, text):
    """Set text into a table cell while preserving cell formatting."""
    # Cells have a text frame
    tf = cell.text_frame
    # Clear all paragraphs
    p_elements = tf._txBody.findall(
        ".//{http://schemas.openxmlformats.org/drawingml/2006/main}p"
    )
    # Preserve the first paragraph's properties
    if p_elements:
        first_p = p_elements[0]
        # Remove all subsequent paragraphs
        for p in p_elements[1:]:
            p.getparent().remove(p)
        # Find first run for formatting reference
        first_runs = first_p.findall(
            "{http://schemas.openxmlformats.org/drawingml/2006/main}r"
        )
        first_run_props = None
        if first_runs:
            rPr = first_runs[0].find(
                "{http://schemas.openxmlformats.org/drawingml/2006/main}rPr"
            )
            if rPr is not None:
                first_run_props = deepcopy(rPr)
        # Clear all runs from first paragraph
        for r in first_runs:
            first_p.remove(r)
        # Add new runs for each line
        lines = text.split("\n")
        for i, line in enumerate(lines):
            if i > 0:
                # Add line break
                new_p = etree.SubElement(
                    tf._txBody,
                    "{http://schemas.openxmlformats.org/drawingml/2006/main}p",
                )
                target_p = new_p
            else:
                target_p = first_p
            r = etree.SubElement(
                target_p, "{http://schemas.openxmlformats.org/drawingml/2006/main}r"
            )
            if first_run_props is not None:
                r.append(deepcopy(first_run_props))
            t = etree.SubElement(
                r, "{http://schemas.openxmlformats.org/drawingml/2006/main}t"
            )
            t.text = line
    else:
        cell.text = text


# =====================================================================
# Load template
# =====================================================================
prs = Presentation(SRC)
print(f"Loaded template: {len(prs.slides)} slides")

# =====================================================================
# CONTENT — slide-by-slide
# =====================================================================

# SLIDE 2 — 표지
s = prs.slides[1]
replace_text_keep_format(s.shapes[0], "함께걸음 팀")
replace_text_keep_format(
    s.shapes[1],
    "함께걸음 (TripForAll)\n휠체어 할머니부터 8살 손주까지, 한 코스로 함께 걸을 수 있는 무장애·다세대 동반 여행 AI 어시스턴트",
)
replace_text_keep_format(s.shapes[3], "2026. 06. 10.")

# SLIDE 3 — 팀 소개
s = prs.slides[2]
# shape[5] is the bullet text on the right
replace_text_keep_format(
    s.shapes[5],
    "팀 소개\n• 함께걸음 팀 (1인)\n• 한승범 (팀장 · Ennoia 에이전트 설계 · 백엔드 통합)\n\n참여 계기\n• 휠체어를 쓰시는 어머니와의 가족 여행을 준비하며 무장애 정보가 흩어져 있고\n  \"가장 느린 동행자에게 맞춘 코스\"를 찾기가 어려웠던 경험에서 출발\n• 고령화·다세대 가족 동반 여행 트렌드에 답하는 도구가 거의 없다는 점\n• 누구도 두고 가지 않는 여행을 만들고자 본 공모전에 참가",
)
# Table 4x4 — fill row 1 (한승범)
tbl = s.shapes[6].table
set_cell_text(tbl.cell(1, 0), "한승범")
set_cell_text(tbl.cell(1, 1), "팀장")
set_cell_text(
    tbl.cell(1, 2),
    "Ennoia 에이전트 설계 · preset 구성 · KTO MCP 통합 · 프롬프트 엔지니어링 · Next.js 백엔드 · 14종 외부 API 통합",
)
set_cell_text(tbl.cell(1, 3), "—")

# SLIDE 4 — 서비스 소개 표 (9x2)
s = prs.slides[3]
tbl = s.shapes[3].table
# row1 서비스명, row3 요약설명, row5 주제 선정 이유, row7 타겟 사용자
set_cell_text(
    tbl.cell(1, 1),
    "함께걸음 (TripForAll) — 이동약자·다세대 가족을 위한 무장애 동반 여행 AI 어시스턴트",
)
set_cell_text(
    tbl.cell(3, 1),
    "동행자별 이동수단·체력·연령과 시·군·구·테마·날짜를 입력하면, 한국관광공사 OpenAPI(무장애 인증·관광지·식당·운영시간) 등 14종 외부 데이터를 통합해 Ennoia 에이전트가 \"가장 느린 동행자\" 기준 안전 동선, 세대별 분기 미션, 체력 시뮬레이션, 휴무·날씨 자동 회피, 응급실·장애인 화장실 매핑까지 한 번에 생성합니다.",
)
set_cell_text(
    tbl.cell(5, 1),
    "휠체어를 쓰는 어머니와의 가족 여행을 준비하며 무장애 정보가 흩어져 있고, \"가장 느린 동행자에게 맞춘 코스\"를 찾기가 어려웠습니다. 고령화와 다세대 가족 동반 여행이 늘어나는 시대에 이동약자와 그 가족이 같이 갈 수 있는 도구가 거의 없다는 점이 출발점이었습니다. 누구도 두고 가지 않는 여행을 가능하게 만들고 싶었습니다.",
)
set_cell_text(
    tbl.cell(7, 1),
    "1차: 이동약자 본인(휠체어·보행보조기·임산부·저체력 시니어) + 그를 동반하는 가족(특히 조부모-부모-자녀 3세대)\n2차: 유아차 가족, 반려동물 동반 여행자, 시니어 그룹 인솔자, 무장애 외국인 관광객(KTO 다국어 API 확장 가능)",
)

# SLIDE 5 — 서비스 한 줄 요약
s = prs.slides[4]
replace_text_keep_format(
    s.shapes[3],
    "\"우리는 이동약자와 다세대 가족이 함께 갈 수 있는 여행 코스가 없다는 문제를\n무장애·페이스·세대분기를 통합한 AI 동반자를 통해 해결합니다.\"\n\n핵심 기능 3가지\n① 무장애 매칭 — KTO 무장애 25항목 + 행안부 화장실 통합\n② 다세대 동선 — 가장 느린 동행자 기준 + 활동적인 가족 분기/재합류 + 세대 연결 미션\n③ 선제적 위험 회피 — 휴무·날씨·체력 30% 미만 시 자동 변경/휴식 + 응급실 매핑",
)

# SLIDE 6 — 입력·출력 (개요)
s = prs.slides[5]
replace_text_keep_format(
    s.shapes[4],
    "• 시·도 : 서울 / 부산 / 제주 / 경기 (4개)\n• 시·군·구 : 74개 (서울25 · 부산16 · 제주2 · 경기31)\n• 동행자[1~6명] : 닉네임·나이·이동수단(8종)·체력 %·메모\n• 테마 : 역사/자연/음식/예술/가족/축제/현지인처럼/실내/웰니스/반려동물 (10종)\n• 선호음식 : 한식/중식/일식/양식/카페/무관 (6종)\n• 여행 날짜·출발 시간·여행 시간(2~10h)",
)
replace_text_keep_format(
    s.shapes[6],
    "• 코스 안전 동선 (4~6 stops + 식사)\n• 무장애 배지 (휠체어·엘리베이터·화장실 등)\n• 혼잡도 🟢🟡🔴 · 인증 🏅 · 웰니스 🌐 · 반려동물 🐾\n• 현재 날씨 + 휴무 회피 + 시간 변경 안내\n• 응급실 2곳 + 장애인 화장실 반경 500m\n• 3세대 1인칭 narrative + 세대 연결 미션",
)

# SLIDE 7 — 입력·출력 (실제 예시)
s = prs.slides[6]
replace_text_keep_format(
    s.shapes[4],
    "• 시·도 : 서울\n• 시·군·구 : 종로구\n• 동행자 :\n  - 할머니 (78세, 휠체어 수동, 체력 60%, \"오래 못 걸어요\")\n  - 어머니 (52세, 일반, 체력 85%)\n  - 손주 (8세, 아동, 체력 95%)\n• 테마 : 역사·궁궐\n• 선호음식 : 한식\n• 여행 날짜·시작 : 2026-06-10 · 09:30\n• 여행 시간 : 5시간",
)
replace_text_keep_format(
    s.shapes[6],
    "동선: 광화문역 → 경복궁 → 통인시장 → 청계천 → 인사동\n4 stops + 2 식사 · 거리 합 2.4km · 휠체어 호환 ✅\n\nmultiGen 분기: 근정전에서 15분 split\n  • 할머니: 그늘 벤치 휴식 (회복)\n  • 어머니·손주: 경회루 산책 → 광화문 광장에서 재합류\n\nbonding 미션: \"근정전에서 손주가 할머니께 학창시절 이야기 듣기\"\n\n체력 시뮬: 시작 100/100/100 → 종료 42/76/89\n(할머니 30% 미만 직전에 자동 휴식 삽입 — 안전)\n\nEnnoia 응답 시간: 3 task 병렬 추론 · 총 14.8초",
)

# SLIDE 8 — 엔노이아 앱 출력
s = prs.slides[7]
replace_text_keep_format(
    s.shapes[3],
    "[Ennoia Studio 채팅 캡처 자리]\n\n사용자 입력: \"서울 종로구의 무장애 관광지 3곳만 짧게 알려줘\"\n→ KTO MCP 도구 자동 호출: kto_barrier_free_locationBasedList2\n→ Ennoia 응답:\n  • 대한민국역사박물관 — 현대사 박물관(세종대로 198)\n  • 세종문화회관 — 공연·전시 복합문화공간(세종대로 175)\n  • 광화문광장 — 도심 보행 광장(세종대로 172)\n\n시연 시 Studio 화면 캡처 1장 삽입 권장 (KTO MCP 호출 흔적 포함)",
)

# SLIDE 9 — Flow Chart
s = prs.slides[8]
replace_text_keep_format(
    s.shapes[3],
    "[아키텍처 — 구글 슬라이드 도형으로 그리기 권장]\n\n① 사용자 입력 (Next.js + Tailwind UI)\n      ↓ POST /api/plan\n② Next.js API Route (course-builder)\n   • 병렬 데이터 수집 (5초 timeout · 24h cache)\n     KTO 5종 · 행안부 식당 4종 · KCISA · Open-Meteo\n     응급실 · 지하철 엘리베이터 · 장애인 화장실\n   • Ennoia 에이전트 3종 병렬 추론 (pace · wellness · multiGen)\n     POST api.ennoia.so/api/preset/v2/chat/completions\n     headers: project + apiKey + X-ENNOIA-USER-ID\n   • 결과 조립 → JSON\n      ↓\n③ 결과 페이지: 동선 카드 · 사진 · 거리 · 무장애 배지 ·\n   혼잡도 · 인증 · 웰니스 · 반려동물 ·\n   WeatherCard · SkippedSpotsCard · EmergencyCard ·\n   NearbyToiletsCard · RecommendedPool\n\n총 응답 시간: 약 15초 (3 task 병렬)",
)

# SLIDE 10 — 시연 영상
s = prs.slides[9]
replace_text_keep_format(
    s.shapes[3],
    "서비스 시연 영상 (optional)\n\n[YouTube URL 또는 QR 코드 자리]\n\n시나리오 (3~5분):\n0:00~0:30 문제 제기 — 휠체어 어머니와 가족 여행 경험\n0:30~2:00 입력 → 결과 시연\n2:00~3:00 결과 페이지 핵심 (무장애 · 다른 조합 · narrative · 휴무 회피)\n3:00~4:00 Ennoia 통합 강조 (Studio · MCP)\n4:00~5:00 차별점 + 기대 효과",
)

# SLIDE 11 — 한국관광공사 OpenAPI 활용 경험
s = prs.slides[10]
# [4] List 1, List 2 — 기타 API 9종 리스트
replace_text_keep_format(
    s.shapes[4],
    "• 행정안전부 모범음식점/일반음식점/휴게음식점/관광식당 API (4종)\n• 행정안전부 공중화장실 표준데이터셋 (장애인 화장실 매칭)\n• KCISA 시티투어 맛집 API (광역 도시 맛집 fallback)\n• Open-Meteo 기상 API (실시간 날씨 → preferIndoor 가산점)\n• 국립중앙의료원 응급의료기관 API (응급실 2곳 매핑)\n• 서울 열린데이터광장 지하철 엘리베이터 데이터\n\n＋ Ennoia 플랫폼 (preset/v2/chat/completions)\n  : pace · wellness · multiGen 추론 3종 (gpt-4o-mini)",
)
# [18~21] API명 4개 + [10~13] 상세 설명 4개 + KTO 5번째는 [22] 주석 수정에 추가
api_names = [
    "국문 관광정보 서비스",
    "무장애 여행 정보 서비스",
    "반려동물 동반여행 서비스",
    "웰니스 관광정보 서비스",
]
api_descs = [
    "KorService2 — areaBasedList2, detailCommon2, detailIntro2, detailInfo2, detailImage2 (관광지/식당 기본·상세)",
    "KorWithService1/2 — 휠체어·엘리베이터·화장실·경사로·인력 25항목 (본 서비스 핵심 데이터)",
    "KorPetTourService2 — 반려동물 테마 전용 추천 풀",
    "WellnessTursmService — 웰니스 테마 전용 풀 (langDivCd=ko)",
]
for i, (name, desc) in enumerate(zip(api_names, api_descs)):
    replace_text_keep_format(s.shapes[18 + i], name)
    replace_text_keep_format(s.shapes[10 + i], desc)

# 5번째 API는 안내문 [22]에 추가 표기
replace_text_keep_format(
    s.shapes[22],
    "※ 실제 활용한 KTO OpenAPI 총 5종 (위 4개 + 관광지 집중률 방문자 추이 예측 정보 서비스 — TatsCnctrRateService, 혼잡도 🟢🟡🔴 표시).\n   구글폼 ⑤ 활용 API 선택 시 5종 모두 체크 (해당 소개자료에 작성한 리스트와 동일하게 제출).",
)

# SLIDE 12 — 시행착오 & 개선시도
s = prs.slides[11]
replace_text_keep_format(
    s.shapes[4],
    "• Ennoia 에이전트 호출 시 인증 실패 (MCP_CONNECTION_REQUIRED 반복)\n• 첫 preset 응답 시간이 41초로 너무 느림 (3 task 병렬 호출 시 사용자 대기 60초+)\n• 외부 KCISA API 응답이 60초까지 늘어져 전체 여정 생성 시간이 70초까지 폭증\n• 강남구·실내 테마에서 NO_COURSE 에러 — 모든 후보가 11시 개점, 사용자 시작 시간 10시 충돌\n\n＋ 프롬프트 튜닝\n  • narrative 톤: 형식적 → \"미리 다녀온 사람의 일기\"처럼 1인칭\n  • bonding 미션: 추상적 → \"손주가 할머니께 학창시절 이야기 듣기\" 같은 구체적 행동",
)
improvements = [
    (
        "Ennoia deploy log JSON을 분석해 user_id 필드가 32자 hex UUID(이메일 아님)임을 발견, X-ENNOIA-USER-ID 헤더 교체",
        "HTTP 200 정상, KTO MCP 63개 도구 호출 성공 (kto_barrier_free_locationBasedList2 실호출 확인)",
    ),
    (
        "\"추론전용\" preset 신규 생성 (gpt-4o-mini, MCP 없음). 우리 백엔드가 이미 KTO 데이터 수집한다는 점 활용 — 추론과 데이터 수집 분리",
        "41초 → 4.2초 (단순 JSON) / 14.8초 (긴 narrative) — 약 10배 단축",
    ),
    (
        "식당 fallback 체인 재정렬 (TourAPI → 행안부 → KCISA) + 모든 외부 호출에 AbortController 5초 timeout 적용",
        "70초 → 7.6초 — 약 9배 단축, 사용자 체감 응답 정상화",
    ),
    (
        "openPicked 빈 배열일 때 닫힌 picked spot 유지 + 휴무 사유와 시간 변경 안내 함께 표시하는 로직 추가",
        "NO_COURSE 사라지고, 사용자가 \"왜 안 되는지 + 어떻게 해야 하는지\" 즉시 이해 가능",
    ),
]
for i, (attempt, result) in enumerate(improvements):
    replace_text_keep_format(s.shapes[18 + i], attempt)
    replace_text_keep_format(s.shapes[10 + i], result)

# SLIDE 13 — 마무리
s = prs.slides[12]
replace_text_keep_format(
    s.shapes[5],
    "제품 관점 (Product)\n• \"휠체어 어머니와 못 가\" → \"할머니도 같이 갈 수 있어\"로 가족 여행 가능성 확장\n• 무장애 + 휴무 + 응급실 확인을 수십 개 탭 → 한 화면으로 압축\n• \"다른 조합 보기\"로 사용자 능동적 코스 다양화\n\n사업 관점 (Business)\n• 시·도 4개 → 17개 전국 확대 (sigungu 매핑 확장만으로 가능)\n• 외국인 무장애 관광객 시장 진입 (KTO 다국어 API 8개)\n• B2B — 요양시설·복지관·여행사 무장애 단체여행 기획 도구\n\n기술 관점 (Technology)\n• Ennoia preset 2단 구조 (추론전용 + KTO MCP) — 수집/추론 분리 패턴\n• 14종 외부 API fallback chain + 5초 timeout — 신뢰성·속도 양립\n• 행안부 EPSG:5174 → WGS84, 법정동 ↔ TourAPI sigunguCode 매핑 노하우\n• 시각 약자 TTS·음성 입력 등 접근성 확장 로드맵",
)
replace_text_keep_format(
    s.shapes[7],
    "한승범 (팀장)\n\"Ennoia 플랫폼을 처음 다루며 MCP·preset·사용자별 인증 체계가 처음엔 낯설었지만, 한 번 익히고 나니 KTO 63개 도구를 LLM이 자동으로 호출하는 모습이 강력했습니다. 플랫폼이 통합·인증을 책임지고, 우리는 도메인 로직에 집중한다는 가치를 직접 체감했습니다.\"\n\n생성형 AI 사용 후기\n우리 코드의 LLM 추론 부분(체력 시뮬·세대 분기·narrative 생성)은 LLM 없이 결정론적 fallback으로도 동작하도록 설계했지만, LLM이 합쳐졌을 때 사용자가 받는 \"1인칭 일기\"의 따뜻함은 결정론 코드로 만들 수 없는 가치였습니다. 특히 multiGen narrative에서 \"근정전에서 손주가 할머니께 학창시절 이야기 듣기\" 같은 세대 연결 bonding 미션을 LLM이 스스로 만들어내는 모습이 인상적이었습니다. 생성형 AI는 단순히 답을 생성하는 것이 아니라 사람과 사람 사이의 연결을 디자인할 수 있는 도구라는 것을 배웠습니다.",
)

# =====================================================================
# Insert PNGs into placeholder positions
# =====================================================================

def fit_into_box(img_w, img_h, box_w, box_h):
    """Return (w, h, x_offset, y_offset) to fit image into box preserving ratio."""
    img_ratio = img_w / img_h
    box_ratio = box_w / box_h
    if img_ratio > box_ratio:
        # image is wider — fit to width
        w = box_w
        h = box_w / img_ratio
        return w, h, 0, (box_h - h) / 2
    else:
        # image is taller — fit to height
        h = box_h
        w = box_h * img_ratio
        return w, h, (box_w - w) / 2, 0


def place_png_over_placeholder(slide, shape_idx, png_path, img_w, img_h):
    """Insert PNG over a placeholder shape (replaces visual but keeps shape for layout)."""
    ph = slide.shapes[shape_idx]
    left, top = ph.left, ph.top
    box_w, box_h = ph.width, ph.height
    # Fit image preserving aspect ratio
    w_in = box_w / 914400
    h_in = box_h / 914400
    fit_w, fit_h, dx, dy = fit_into_box(img_w, img_h, w_in, h_in)
    slide.shapes.add_picture(
        str(png_path),
        Inches(left / 914400 + dx),
        Inches(top / 914400 + dy),
        Inches(fit_w),
        Inches(fit_h),
    )


# Slide 3 (팀 소개) shape[4] 사진 자리 → logo.png
place_png_over_placeholder(prs.slides[2], 4, ASSETS / "logo.png", 800, 360)
print("✓ Inserted logo.png → slide 3 사진 자리")

# Slide 9 (Flow Chart) shape[3] → architecture.png
place_png_over_placeholder(prs.slides[8], 3, ASSETS / "architecture.png", 1600, 900)
print("✓ Inserted architecture.png → slide 9 Flow Chart 자리")

# =====================================================================
# Add 3 extra slides for io-flow, data-sources, comparison
# =====================================================================
def add_image_slide(prs, image_path, img_w, img_h, title=""):
    blank_layout = prs.slide_layouts[6]  # blank
    slide = prs.slides.add_slide(blank_layout)
    slide_w_in = prs.slide_width / 914400
    slide_h_in = prs.slide_height / 914400
    # 약간의 margin
    margin = 0.3
    box_w = slide_w_in - 2 * margin
    box_h = slide_h_in - 2 * margin
    fit_w, fit_h, dx, dy = fit_into_box(img_w, img_h, box_w, box_h)
    slide.shapes.add_picture(
        str(image_path),
        Inches(margin + dx),
        Inches(margin + dy),
        Inches(fit_w),
        Inches(fit_h),
    )
    return slide


add_image_slide(prs, ASSETS / "io-flow.png", 1600, 900)
print("✓ Added io-flow.png as new slide")
add_image_slide(prs, ASSETS / "data-sources.png", 1600, 900)
print("✓ Added data-sources.png as new slide")
add_image_slide(prs, ASSETS / "comparison.png", 1600, 900)
print("✓ Added comparison.png as new slide")

# =====================================================================
# Remove slide 1 (guide page)
# =====================================================================
xml_slides = prs.slides._sldIdLst
slide_to_remove = list(xml_slides)[0]
xml_slides.remove(slide_to_remove)
print("Removed slide 1 (양식 가이드)")

# =====================================================================
# Save
# =====================================================================
prs.save(OUT)
print(f"\n✓ Saved: {OUT}")
print(f"  Remaining slides: {len(prs.slides)}")
