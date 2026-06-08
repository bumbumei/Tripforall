"""Get x/y/w/h of placeholder shapes (사진, Flow Chart, 엔노이아 출력 화면)
so we can place PNGs precisely on top of them."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pptx import Presentation
from pptx.util import Emu

prs = Presentation(r"C:\src\Claude\tripforall\scripts\template.pptx")
EMU_PER_INCH = 914400

def coords(shape):
    return f"L={shape.left/EMU_PER_INCH:.2f}in T={shape.top/EMU_PER_INCH:.2f}in W={shape.width/EMU_PER_INCH:.2f}in H={shape.height/EMU_PER_INCH:.2f}in (px@96dpi: {shape.left*96//EMU_PER_INCH}x{shape.top*96//EMU_PER_INCH} {shape.width*96//EMU_PER_INCH}x{shape.height*96//EMU_PER_INCH})"

# Slide 2 (index 2 → 우리 PPTX index 1 since slide 1 removed; 양식 기준 슬라이드 3 팀소개)
# Actually we keep template as-is, indexes 0~12
mappings = [
    (2, 4, "사진 placeholder (팀 소개)"),       # 슬라이드 3
    (7, 3, "엔노이아 앱 출력 placeholder"),     # 슬라이드 8
    (8, 3, "Flow Chart placeholder"),           # 슬라이드 9
    (9, 3, "시연 영상 placeholder"),            # 슬라이드 10
]

for slide_idx, shape_idx, label in mappings:
    s = prs.slides[slide_idx]
    sh = s.shapes[shape_idx]
    print(f"Slide {slide_idx+1} shape[{shape_idx}] — {label}")
    print(f"  {coords(sh)}")
    print()

# 슬라이드 크기
print(f"Slide size: {prs.slide_width/EMU_PER_INCH:.2f}in x {prs.slide_height/EMU_PER_INCH:.2f}in")
