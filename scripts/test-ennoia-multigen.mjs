import { callLlmJson, activeProvider } from "../lib/llm.ts";
import { buildMultiGenPrompt } from "../lib/prompts/multigen.ts";

console.log("Provider:", JSON.stringify(activeProvider()));

const { system, user } = buildMultiGenPrompt({
  city: "서울 종로구",
  themeLabel: "역사·궁궐",
  themeVibe: "조선왕조 정취",
  companions: [
    { id: "1", nickname: "할머니", age: 78, mobility: "walking_aid", sensoryNeeds: [], staminaPercent: 60 },
    { id: "2", nickname: "어머니", age: 52, mobility: "general", sensoryNeeds: [], staminaPercent: 85 },
    { id: "3", nickname: "손주", age: 8, mobility: "child", sensoryNeeds: [], staminaPercent: 95 },
  ],
  course: [
    {
      spot: {
        contentId: "1",
        title: "경복궁",
        addr1: "서울 종로구 사직로 161",
        mapX: 126.977,
        mapY: 37.5796,
        contentTypeId: "12",
        firstImage: "",
        tel: "",
      },
      distFromPrevKm: 0,
      barrierFree: { wheelchair: "있음", elevator: "있음", restroom: "있음", ramp: "있음", guideHuman: "있음" },
    },
    {
      spot: {
        contentId: "2",
        title: "광화문광장",
        addr1: "서울 종로구 세종로",
        mapX: 126.9779,
        mapY: 37.5729,
        contentTypeId: "12",
        firstImage: "",
        tel: "",
      },
      distFromPrevKm: 0.8,
      barrierFree: { wheelchair: "있음", elevator: "없음", restroom: "있음", ramp: "있음", guideHuman: "없음" },
    },
  ],
});

const start = Date.now();
try {
  const json = await callLlmJson({ system, user, maxTokens: 2200 });
  console.log("---");
  console.log("segments:", json.segments?.length ?? 0);
  console.log("narrative length:", json.narrative?.length ?? 0, "chars");
  console.log("narrative preview:", (json.narrative ?? "").slice(0, 200));
  console.log("narrative truncated?:", (json.narrative ?? "").length > 0 && !/[.!?]$/.test((json.narrative ?? "").trim()));
} catch (e) {
  console.log("ERROR:", e.message);
}
console.log("Elapsed:", ((Date.now() - start) / 1000).toFixed(1) + "s");
