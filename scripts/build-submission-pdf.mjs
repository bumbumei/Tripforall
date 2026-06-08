// 서비스 소개서 마크다운 → 슬라이드 PDF 변환
// 21-ppt-template-filled.md → docs/submission/함께걸음_서비스소개서_TripForAll.pdf

import { readFile, writeFile } from "node:fs/promises";

const SRC = "docs/submission/21-ppt-template-filled.md";
const TMP = "docs/submission/.tmp-marp.md";

const MARP_FRONTMATTER = `---
marp: true
paginate: true
size: 16:9
theme: default
style: |
  section {
    font-family: 'Malgun Gothic', 'NanumGothic', 'AppleGothic', sans-serif;
    font-size: 16px;
    padding: 24px 40px;
    background: white;
    line-height: 1.4;
  }
  section h1 {
    color: #1565C0;
    font-size: 24px;
    border-bottom: 2px solid #1565C0;
    padding-bottom: 4px;
    margin: 0 0 10px 0;
  }
  section h2 {
    color: #1976D2;
    font-size: 18px;
    margin: 8px 0 4px 0;
  }
  section h3 {
    color: #333;
    font-size: 15px;
    margin: 6px 0 2px 0;
  }
  section h4 { font-size: 13px; margin: 4px 0 2px 0; color: #555; }
  table {
    font-size: 11px;
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0;
  }
  th { background: #1565C0; color: white; padding: 3px 5px; text-align: left; }
  td { border: 1px solid #ddd; padding: 3px 5px; vertical-align: top; }
  pre {
    font-size: 8px;
    line-height: 1.2;
    background: #f6f8fa;
    padding: 4px 6px;
    margin: 3px 0;
    border-radius: 3px;
    overflow: hidden;
  }
  code { font-size: 10px; background: #f0f0f0; padding: 1px 2px; }
  blockquote {
    border-left: 3px solid #1565C0;
    padding: 3px 8px;
    color: #555;
    margin: 3px 0;
    background: #f9fbfd;
    font-size: 13px;
  }
  ul, ol { font-size: 13px; line-height: 1.35; margin: 3px 0 3px 14px; }
  li { margin: 1px 0; }
  p { font-size: 13px; line-height: 1.4; margin: 3px 0; }
  strong { color: #1565C0; }

  /* 표지 전용 */
  section.cover {
    background: linear-gradient(135deg, #1565C0 0%, #1976D2 100%);
    color: white;
    text-align: center;
    padding: 80px 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.cover h1 {
    color: white;
    font-size: 52px;
    border: none;
    margin: 0;
  }
  section.cover h2 {
    color: rgba(255,255,255,0.95);
    font-size: 22px;
    margin: 16px 0;
    font-weight: 400;
  }
  section.cover p {
    color: rgba(255,255,255,0.85);
    font-size: 16px;
    margin: 28px 0 0 0;
  }
---

`;

const COVER = `<!-- _class: cover -->

# 함께걸음 (TripForAll)

## 휠체어 할머니부터 8살 손주까지,
## 한 코스로 함께 걸을 수 있는
## 무장애·다세대 동반 여행 AI 어시스턴트

2026 관광데이터 활용 공모전 · 생성형 AI 활용 관광 프롬프톤
2026. 06. 10.`;

const raw = await readFile(SRC, "utf8");
const lines = raw.split(/\r?\n/);

const slides = [];
let current = [];
let coverInjected = false;
let inCodeBlock = false;

for (const line of lines) {
  if (line.startsWith("```")) inCodeBlock = !inCodeBlock;
  // 슬라이드 구분자: "## 슬라이드 N" 패턴 (코드블록 밖에서만)
  if (!inCodeBlock && /^## 슬라이드 \d+/.test(line)) {
    if (current.length > 0) {
      const text = current.join("\n").trim();
      if (text) slides.push(text);
    }
    if (/^## 슬라이드 2 /.test(line)) {
      slides.push(COVER);
      current = [];
      coverInjected = true;
    } else {
      current = [line];
    }
  } else {
    current.push(line);
  }
}
if (current.length > 0) {
  const text = current.join("\n").trim();
  if (text) slides.push(text);
}

// 양식 외 텍스트(체크리스트·문서 메타) 제외
const skipPatterns = [
  /^## 📋 슬라이드 작성 체크리스트/m,
  /^> \*\*양식 슬라이드 번호와 1:1 매핑/m,
  /^# 서비스 소개서 PPT/m,
];

// 빈 콘텐츠 / 너무 짧은 (헤더만 있는) 슬라이드 필터링
const filtered = slides
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
  .filter((s) => !skipPatterns.some((p) => p.test(s)))
  .filter((s) => {
    // 헤더만 있고 본문이 없는 슬라이드 제외
    const nonHeaderLines = s.split("\n").filter((l) => l.trim() && !/^#+\s/.test(l));
    return nonHeaderLines.length > 0;
  });

if (coverInjected && filtered[0] !== COVER) {
  const idx = filtered.indexOf(COVER);
  if (idx > 0) {
    filtered.splice(idx, 1);
    filtered.unshift(COVER);
  }
} else if (!coverInjected) {
  filtered.unshift(COVER);
}

const body = filtered.join("\n\n---\n\n");
await writeFile(TMP, MARP_FRONTMATTER + body, "utf8");
console.log(`✓ marp source ready: ${TMP}`);
console.log(`  slides: ${filtered.length}`);
