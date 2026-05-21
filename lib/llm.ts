// Provider-agnostic LLM wrapper.
// 우선순위: OpenRouter → OpenAI → Anthropic. 셋 다 없으면 throw.
//
// OpenRouter:
//  - OpenAI SDK 호환 (baseURL만 다름)
//  - 무료 모델 다수 (google/gemma-4-31b-it:free, meta-llama/llama-3.3-70b-instruct:free 등)
//  - HTTP-Referer/X-Title 헤더는 OpenRouter 리더보드용 (선택)

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type Provider = "openrouter" | "openai" | "anthropic";

export interface LlmCallOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

let openrouterClient: OpenAI | null = null;
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenRouterClient(): OpenAI {
  if (!openrouterClient) {
    openrouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://tripforall.local",
        "X-Title": process.env.OPENROUTER_TITLE ?? "TripForAll"
      }
    });
  }
  return openrouterClient;
}

export function getProvider(): Provider | null {
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function getModel(provider: Provider): string {
  if (provider === "openrouter") {
    // 무료 기본값. 사용자가 OPENROUTER_MODEL로 paid 모델 (예: anthropic/claude-3.5-sonnet) 지정 가능.
    return process.env.OPENROUTER_MODEL ?? "google/gemma-4-31b-it:free";
  }
  if (provider === "openai") return process.env.OPENAI_MODEL ?? "gpt-4o";
  return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
}

export function hasLlmKey(): boolean {
  return getProvider() !== null;
}

export function activeProvider(): { provider: Provider; model: string } | null {
  const p = getProvider();
  if (!p) return null;
  return { provider: p, model: getModel(p) };
}

export async function callLlm(opts: LlmCallOptions): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No LLM key configured (OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)");
  }

  if (provider === "openrouter" || provider === "openai") {
    const client = provider === "openrouter" ? getOpenRouterClient() : (openaiClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
    const res = await client.chat.completions.create({
      model: getModel(provider),
      max_tokens: opts.maxTokens ?? 1500,
      temperature: 0.5,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user }
      ]
    });
    return res.choices[0]?.message?.content ?? "";
  }

  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await anthropicClient.messages.create({
    model: getModel("anthropic"),
    max_tokens: opts.maxTokens ?? 1500,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }]
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export async function callLlmJson<T>(opts: LlmCallOptions): Promise<T> {
  const provider = getProvider();
  if (!provider) throw new Error("No LLM key configured");

  const jsonSystem =
    opts.system +
    "\n\n[JSON ONLY] 응답은 반드시 JSON 한 객체만 출력하라. 다른 텍스트 금지. Return valid JSON only.";

  // OpenAI는 response_format json_object 강제 가능.
  // OpenRouter는 모델마다 지원 다름 — 안전하게 텍스트로 받아 파싱.
  if (provider === "openai") {
    if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openaiClient.chat.completions.create({
      model: getModel("openai"),
      max_tokens: opts.maxTokens ?? 1500,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: jsonSystem },
        { role: "user", content: opts.user }
      ]
    });
    const text = res.choices[0]?.message?.content ?? "{}";
    return JSON.parse(text) as T;
  }

  // OpenRouter / Anthropic: 텍스트 응답에서 JSON 추출
  const raw = await callLlm({ ...opts, system: jsonSystem });
  return extractJson<T>(raw);
}

function extractJson<T>(raw: string): T {
  // ```json ... ``` 또는 ``` ... ``` 마커 제거 + 첫 { ~ 마지막 } 슬라이스
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}
