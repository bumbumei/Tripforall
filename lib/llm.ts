// Provider-agnostic LLM wrapper.
// OpenAI 키가 있으면 GPT-4o 사용, 없으면 Anthropic Claude 사용, 둘 다 없으면 throw.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type Provider = "openai" | "anthropic";

export interface LlmCallOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

export function getProvider(): Provider | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export function getModel(provider: Provider): string {
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
  if (!provider) throw new Error("No LLM key configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)");

  if (provider === "openai") {
    if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openaiClient.chat.completions.create({
      model: getModel("openai"),
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

  const raw = await callLlm({ ...opts, system: jsonSystem });
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}
