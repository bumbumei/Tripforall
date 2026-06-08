// SVG 5개를 Marp(headless chromium)로 PNG 변환.
// Marp가 ![](svg) image 참조를 chromium native renderer로 변환.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const SVG_DIR = "docs/submission/assets/svg";
const TMP_MD_DIR = "docs/submission/.tmp-svg-md";
const PNG_DIR = "docs/submission/assets/png";

if (!existsSync(TMP_MD_DIR)) await mkdir(TMP_MD_DIR, { recursive: true });
if (!existsSync(PNG_DIR)) await mkdir(PNG_DIR, { recursive: true });

const files = (await readdir(SVG_DIR)).filter((f) => f.endsWith(".svg"));
console.log(`Found ${files.length} SVG files`);

for (const f of files) {
  const svg = await readFile(join(SVG_DIR, f), "utf8");
  const vbMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const w = vbMatch ? parseInt(vbMatch[1]) : 1600;
  const h = vbMatch ? parseInt(vbMatch[2]) : 900;
  const svgAbs = resolve(SVG_DIR, f).replace(/\\/g, "/");

  // ![](file:///path/to/svg) — chromium native SVG render
  const md = `---
marp: true
size: ${w}x${h}
paginate: false
backgroundColor: white
style: |
  section {
    padding: 0;
    margin: 0;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  img { width: 100%; height: 100%; object-fit: contain; }
---

![](file:///${svgAbs})
`;
  const mdPath = join(TMP_MD_DIR, f.replace(".svg", ".md"));
  await writeFile(mdPath, md, "utf8");
}

console.log(`✓ md wrappers ready (image-ref style)`);
