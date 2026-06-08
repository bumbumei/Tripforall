"""시연 영상 자동 합성.

장면별 이미지 + 한국어 내레이션(edge-tts) → MP4.
캡처된 PNG (assets/video-frames) + 우리가 만든 인포그래픽 (assets/png) 조합.

장면 시퀀스 (대략 3분):
  intro(logo) → home → 입력 → IO 다이어그램 → 아키텍처 → 데이터 →
  결과 코스 → 무장애 → 추천 풀 → narrative → 응급 → 차별점 → outro(logo)
"""

import sys, io, asyncio, subprocess, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
SUBM = ROOT / "docs" / "submission"
FRAMES = SUBM / "assets" / "video-frames"
PNGS = SUBM / "assets" / "png"
AUDIO_DIR = SUBM / "assets" / "audio"
OUT_VIDEO = SUBM / "함께걸음_시연영상.mp4"
SRT_PATH = SUBM / "함께걸음_시연영상_자막.srt"

AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Windows에서 winget 설치한 ffmpeg 경로
FFMPEG_CANDIDATES = [
    "ffmpeg",
    str(
        next(
            Path("C:/Users/vance/AppData/Local/Microsoft/WinGet/Packages").glob(
                "Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe"
            ),
            Path("ffmpeg"),
        )
    ),
]
FFMPEG = None
for cand in FFMPEG_CANDIDATES:
    try:
        subprocess.run([cand, "-version"], capture_output=True, check=True)
        FFMPEG = cand
        break
    except Exception:
        continue
if not FFMPEG:
    raise SystemExit("ffmpeg not found")
print(f"Using ffmpeg: {FFMPEG}")

# 음성: ko-KR-SunHiNeural (여성, 차분하고 명료)
VOICE = "ko-KR-SunHiNeural"

# 장면 정의: (image_path, narration_text)
SCENES = [
    (PNGS / "logo.png",
     "함께걸음, TripForAll. 휠체어 할머니부터 8살 손주까지, 한 코스로 함께 걸을 수 있는 무장애 다세대 동반 여행 AI 어시스턴트입니다."),

    (FRAMES / "01_home_hero.png",
     "한 가족이 한 코스로 함께 갈 수 있을까요? 가장 느린 사람을 기준으로, 모두가 즐거운 여행. 함께걸음은 그 답을 찾는 AI 도구입니다."),

    (FRAMES / "02_home_cards.png",
     "가장 느린 동행자의 체력을 시뮬레이션하고, 여행이 끝났을 때 더 건강한 동선인지 회복 점수로 평가하며, 3세대를 잇는 공통과 분기 동선을 자동으로 설계합니다."),

    (FRAMES / "03_plan_top.png",
     "여행은 단 한 번의 입력으로 시작합니다. 서울 종로구, 5시간, 9시 30분 출발."),

    (FRAMES / "04_plan_companions.png",
     "동행자를 추가합니다. 78세 할머니는 수동 휠체어, 52세 어머니는 일반, 8살 손주까지. 한 가족 3세대입니다."),

    (FRAMES / "05_plan_themes.png",
     "10개 테마 중 역사·궁궐을 선택. 한식 점심, 오늘 날짜."),

    (PNGS / "io-flow.png",
     "여정 만들기를 누르면, 백엔드가 14종 외부 데이터를 병렬로 수집하고 Ennoia 에이전트 3개가 동시에 추론합니다. 총 응답 시간 약 15초."),

    (PNGS / "architecture.png",
     "사용자 입력은 Next.js API 경로로 들어가, KTO 5종, 행정안전부 5종, 기타 4종 외부 데이터와 함께 Ennoia 에이전트 pace, wellness, multiGen 3종이 병렬로 호출됩니다."),

    (PNGS / "data-sources.png",
     "한국관광공사 5종, 행정안전부 표준데이터 5종, 그리고 KCISA, Open-Meteo, 국립의료원, 지하철 엘리베이터까지. 총 14종 외부 데이터가 통합됩니다."),

    (FRAMES / "06_result_course.png",
     "결과가 도착했습니다. 서울 종로구 다섯 장소, 5시간. 모두 가장 느린 페이스 기준으로 정렬됐어요. 한 장소는 휴무여서 자동으로 시간 변경 안내가 표시됩니다."),

    (FRAMES / "07_result_barrier_free.png",
     "각 장소에는 무장애 배지가 붙어 있습니다. 휠체어 접근, 엘리베이터, 장애인 화장실. 한국관광공사 무장애 인증 25항목을 모두 검증한 결과입니다."),

    (FRAMES / "08_result_recommended.png",
     "마음에 들지 않으면 추천 풀에서 다른 장소를 선택해 코스를 다시 구성할 수 있습니다. 또는 다른 조합 보기 버튼으로 새로운 anchor에서 재추천도 가능해요."),

    (FRAMES / "09_result_narrative.png",
     "체력 시뮬레이션 결과, 할머니의 체력이 30퍼센트 미만으로 떨어지기 직전에 자동으로 휴식 시간이 삽입됐습니다. 회복 점수는 85점. Multi-Generation Bridge가 3세대 공통 동선과 짧은 분기 미션까지 설계합니다."),

    (FRAMES / "10_result_emergency.png",
     "응급실 두 곳과 반경 500미터 안 장애인 화장실까지 자동으로 매핑됩니다. 만약의 상황까지 대비합니다."),

    (PNGS / "comparison.png",
     "기존 여행 앱과 비교했을 때, 함께걸음은 무장애 정보, 동행자 페이스, 세대 간 분기, 휴무 회피, 응급 대비, LLM 활용까지 여섯 가지 영역에서 모두 차별화됩니다."),

    (PNGS / "logo.png",
     "함께걸음. 누구도 두고 가지 않는 여행. TripForAll이 함께합니다."),
]

print(f"\nScenes: {len(SCENES)}")
for i, (img, _) in enumerate(SCENES, 1):
    assert img.exists(), f"Missing: {img}"
    print(f"  {i:02d}. {img.name}")


async def synth_audio(text, out_path):
    """edge-tts로 mp3 생성. 명령은 비동기."""
    communicate = edge_tts.Communicate(text, VOICE, rate="-5%")
    await communicate.save(str(out_path))


async def synth_all():
    print(f"\n[TTS] Generating audio with {VOICE}")
    for i, (_, text) in enumerate(SCENES, 1):
        out = AUDIO_DIR / f"scene_{i:02d}.mp3"
        await synth_audio(text, out)
        print(f"  ✓ scene_{i:02d}.mp3 ({len(text)} chars)")


asyncio.run(synth_all())


def probe_duration(mp3_path):
    """ffprobe로 mp3 길이 측정."""
    ffprobe = str(Path(FFMPEG).parent / "ffprobe.exe") if FFMPEG.endswith(".exe") else "ffprobe"
    res = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(mp3_path)],
        capture_output=True, text=True, check=True
    )
    return float(res.stdout.strip())


# 각 장면 mp3 길이 측정 + 자막 timing
print(f"\n[Probe] Measuring audio durations")
durations = []
for i in range(1, len(SCENES) + 1):
    d = probe_duration(AUDIO_DIR / f"scene_{i:02d}.mp3")
    durations.append(d + 0.5)  # 각 장면에 0.5초 여유
    print(f"  scene_{i:02d}: {d:.1f}s (+0.5s pad)")
total = sum(durations)
print(f"  TOTAL: {total:.1f}s ({total//60:.0f}m {total%60:.0f}s)")


def fmt_srt(t):
    h = int(t // 3600); m = int((t % 3600) // 60); s = int(t % 60)
    ms = int((t - int(t)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


print(f"\n[SRT] Writing {SRT_PATH}")
with open(SRT_PATH, "w", encoding="utf-8") as f:
    t = 0.0
    for i, ((_, text), dur) in enumerate(zip(SCENES, durations), 1):
        start = t
        end = t + dur
        f.write(f"{i}\n{fmt_srt(start)} --> {fmt_srt(end)}\n{text}\n\n")
        t = end


# ffmpeg concat: 각 장면 image + audio → 임시 mp4 → 마지막에 concat
print(f"\n[ffmpeg] Building per-scene MP4 fragments")
TMP_DIR = AUDIO_DIR.parent / "video-tmp"
TMP_DIR.mkdir(exist_ok=True)
scene_mp4s = []
for i, ((img, _), dur) in enumerate(zip(SCENES, durations), 1):
    out_mp4 = TMP_DIR / f"scene_{i:02d}.mp4"
    audio = AUDIO_DIR / f"scene_{i:02d}.mp3"
    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", str(img),
        "-i", str(audio),
        "-c:v", "libx264", "-tune", "stillimage",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white,fps=30",
        "-shortest",
        "-t", f"{dur:.2f}",
        str(out_mp4),
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    scene_mp4s.append(out_mp4)
    print(f"  ✓ scene_{i:02d}.mp4")


# 모든 장면 concat
print(f"\n[ffmpeg] Concatenating into {OUT_VIDEO}")
concat_list = TMP_DIR / "concat.txt"
with open(concat_list, "w", encoding="utf-8") as f:
    for mp4 in scene_mp4s:
        f.write(f"file '{mp4.as_posix()}'\n")

cmd = [
    FFMPEG, "-y",
    "-f", "concat", "-safe", "0",
    "-i", str(concat_list),
    "-c", "copy",
    str(OUT_VIDEO),
]
subprocess.run(cmd, capture_output=True, check=True)

# 임시 파일 정리
shutil.rmtree(TMP_DIR)

print(f"\n✓ DONE")
print(f"  Video: {OUT_VIDEO}")
print(f"  SRT:   {SRT_PATH}")
print(f"  Duration: {total:.1f}s")
