// Provider-agnostic LLM wrapper.
// 우선순위: Ennoia → OpenRouter → OpenAI → Anthropic. 모두 없으면 throw.
//
// Ennoia (경진대회 필수 플랫폼):
//  - 사내/폐쇄망 B2B AI 플랫폼. Studio preset을 hash로 식별해서 호출.
//  - 엔드포인트: POST https://api.ennoia.so/api/preset/v2/chat/completions
//  - 인증: 헤더 project + apiKey (Bearer 아님)
//  - body: { hash, params, messages: [{role, content: [{type:"text", text}]}] }
//  - system 역할 없음 — 시스템 프롬프트는 Studio preset에 내장돼 있다고 가정.
//    우리 코드의 system+user는 합쳐서 user 메시지 한 개로 전달.
//  - env: ENNOIA_API_KEY, ENNOIA_PROJECT, ENNOIA_PRESET_HASH, ENNOIA_USER_ID (모두 필수)
//         ENNOIA_BASE_URL (선택, 기본 https://api.ennoia.so/api/preset/v2/chat/completions)
//  - ENNOIA_USER_ID는 Ennoia 내부 32-char hex UUID (이메일 아님). MCP 키가 등록된 user.
//
// OpenRouter:
//  - OpenAI SDK 호환 (baseURL만 다름)
//  - 무료 모델 다수 (google/gemma-4-31b-it:free, meta-llama/llama-3.3-70b-instruct:free 등)
//  - HTTP-Referer/X-Title 헤더는 OpenRouter 리더보드용 (선택)

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type Provider = "ennoia" | "openrouter" | "openai" | "anthropic";

export interface LlmCallOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

let openrouterClient: OpenAI | null = null;
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

const ENNOIA_DEFAULT_URL = "https://api.ennoia.so/api/preset/v2/chat/completions";

// Ennoia preset 호출. system 프롬프트는 preset에 내장돼 있다고 가정하고,
// 우리 system+user를 합쳐서 user 메시지 하나로 전달.
async function callEnnoia(opts: LlmCallOptions): Promise<string> {
  const apiKey = process.env.ENNOIA_API_KEY;
  const project = process.env.ENNOIA_PROJECT;
  const hash = process.env.ENNOIA_PRESET_HASH;
  const userId = process.env.ENNOIA_USER_ID;
  if (!apiKey || !project || !hash || !userId) {
    throw new Error(
      "Ennoia 환경변수 누락: ENNOIA_API_KEY, ENNOIA_PROJECT, ENNOIA_PRESET_HASH, ENNOIA_USER_ID 모두 필요"
    );
  }
  const url = process.env.ENNOIA_BASE_URL ?? ENNOIA_DEFAULT_URL;

  // system 역할이 없으므로 합쳐서 전달.
  // preset 자체에 시스템 프롬프트가 있다면 [SYSTEM] 블록을 보조 컨텍스트로 작동.
  const combined = `[SYSTEM]\n${opts.system}\n\n[USER]\n${opts.user}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      project,
      apiKey,
      "X-ENNOIA-USER-ID": userId,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      hash,
      params: {},
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: combined }]
        }
      ]
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Ennoia HTTP ${res.status}: ${errBody.slice(0, 400)}`);
  }

  const data = await res.json();
  return extractEnnoiaText(data);
}

// Ennoia 응답: choices[0].message.content이 Anthropic 스타일 블록 배열.
//   { choices: [{ message: { content: [{ type: "text", text: "…" }] } }] }
function extractEnnoiaText(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b?.type === "text" && typeof b.text === "string")
      .map((b: any) => b.text)
      .join("\n");
  }
  if (typeof content === "string") return content;
  console.warn("[Ennoia] 응답 텍스트 경로를 찾지 못함:", JSON.stringify(data).slice(0, 500));
  return JSON.stringify(data);
}

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
  // Ennoia 최우선 — 경진대회 필수 플랫폼. 4개 env 모두 있어야 활성.
  if (
    process.env.ENNOIA_API_KEY &&
    process.env.ENNOIA_PROJECT &&
    process.env.ENNOIA_PRESET_HASH &&
    process.env.ENNOIA_USER_ID
  ) {
    return "ennoia";
  }
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function getModel(provider: Provider): string {
  if (provider === "ennoia") {
    // Ennoia는 모델 대신 preset hash를 식별자로 사용.
    const hash = process.env.ENNOIA_PRESET_HASH ?? "";
    return `ennoia:${hash.slice(0, 12)}…`;
  }
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

  if (provider === "ennoia") {
    return callEnnoia(opts);
  }

  if (provider === "openrouter" || provider === "openai") {
    const client =
      provider === "openrouter"
        ? getOpenRouterClient()
        : (openaiClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
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

  // Ennoia / OpenRouter / Anthropic: 텍스트 응답에서 JSON 추출
  // (Ennoia가 response_format json_object를 지원하면 위 openai 분기처럼 강제 가능 — 스펙 확인 후)
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
