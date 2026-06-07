import { callLlmJson, activeProvider } from "../lib/llm.ts";

console.log("Provider:", JSON.stringify(activeProvider()));
const start = Date.now();
try {
  const json = await callLlmJson({
    system: "당신은 여행 도우미입니다. 응답은 반드시 JSON 한 객체만.",
    user: '서울 종로구의 무장애 관광지 3곳을 JSON으로 알려주세요. 형식: {"spots":[{"name":"","reason":""}]}',
    maxTokens: 800,
  });
  console.log("JSON parsed OK:");
  console.log(JSON.stringify(json, null, 2));
} catch (e) {
  console.log("ERROR:", e.message);
}
console.log("Elapsed:", ((Date.now() - start) / 1000).toFixed(1) + "s");
