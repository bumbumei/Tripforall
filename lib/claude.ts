import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export interface LlmCallOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

export async function callClaude({ system, user, maxTokens = 1200 }: LlmCallOptions): Promise<string> {
  const c = getClient();
  if (!c) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }
  const res = await c.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }]
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text;
}

export async function callClaudeJson<T>(opts: LlmCallOptions): Promise<T> {
  const raw = await callClaude({ ...opts, system: opts.system + "\n응답은 반드시 JSON 한 객체만 출력하라. 다른 텍스트 금지." });
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

export function hasClaudeKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
