// 빌드 타임 변환 — ref/공중화장실정보.csv (CP949, 53k건) →
//                  lib/data/accessible-toilets.json (UTF-8, 장애인 화장실만)
//
// 실행: node scripts/build-toilets.mjs
// 재실행 불필요 — 원본 CSV 갱신될 때만.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../ref/공중화장실정보.csv");
const DST = resolve(__dirname, "../lib/data/accessible-toilets.json");

// CP949 → UTF-8
const raw = readFileSync(SRC);
const dec = new TextDecoder("euc-kr"); // Node TextDecoder는 euc-kr alias로 CP949 지원
const text = dec.decode(raw);

// 헤더 파싱 (간단한 CSV — quoted field 거의 없음)
const lines = text.split(/\r?\n/);
const header = lines[0].split(",");
const col = (name) => header.indexOf(name);

const IDX = {
  name: col("화장실명"),
  road: col("소재지도로명주소"),
  jibun: col("소재지지번주소"),
  manAccDae: col("남성용-장애인용대변기수"),
  manAccSo: col("남성용-장애인용소변기수"),
  womAccDae: col("여성용-장애인용대변기수"),
  org: col("관리기관명"),
  tel: col("전화번호"),
  open: col("개방시간"),
  lat: col("WGS84위도"),
  lng: col("WGS84경도"),
  bell: col("비상벨설치여부")
};

// 필수 컬럼 확인
for (const [k, v] of Object.entries(IDX)) {
  if (v < 0) {
    console.error(`헤더 컬럼 누락: ${k}`);
    process.exit(1);
  }
}

const toilets = [];
let total = 0;
let skippedNoCoord = 0;
let skippedNotAccessible = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  total++;
  const cols = line.split(",");
  if (cols.length < header.length - 5) continue;

  const accCount =
    (parseInt(cols[IDX.manAccDae], 10) || 0) +
    (parseInt(cols[IDX.manAccSo], 10) || 0) +
    (parseInt(cols[IDX.womAccDae], 10) || 0);
  if (accCount === 0) {
    skippedNotAccessible++;
    continue;
  }

  const lat = parseFloat(cols[IDX.lat]);
  const lng = parseFloat(cols[IDX.lng]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    skippedNoCoord++;
    continue;
  }
  // 한반도 대략 범위
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    skippedNoCoord++;
    continue;
  }

  toilets.push({
    n: cols[IDX.name]?.trim() || "",
    a: cols[IDX.road]?.trim() || cols[IDX.jibun]?.trim() || "",
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    c: accCount,
    o: cols[IDX.open]?.trim() || "",
    b: cols[IDX.bell]?.trim() === "Y" ? 1 : 0
  });
}

mkdirSync(dirname(DST), { recursive: true });
writeFileSync(DST, JSON.stringify(toilets));

console.log(`원본 행: ${total}`);
console.log(`장애인용 변기 없음으로 제외: ${skippedNotAccessible}`);
console.log(`좌표 누락/범위 외로 제외: ${skippedNoCoord}`);
console.log(`최종 화장실: ${toilets.length}`);
console.log(`출력 파일: ${DST}`);
const stat = (await import("node:fs/promises")).statSync(DST);
console.log(`크기: ${(stat.size / 1024).toFixed(0)}KB`);
