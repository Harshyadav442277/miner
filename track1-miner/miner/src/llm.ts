/**
 * The one generative call in the miner: phrase an answer we have ALREADY decided.
 *
 * WHY THERE IS ONE AT ALL. TEXT_CLASSIFICATION and SENTIMENT_ANALYSIS are scored
 * by champions (reg687 tc_pen0, reg646 sa_pure) that compare our text with a
 * hidden ground truth an LLM wrote. Measured 2026-09-19 under both champions
 * against two live crossing miners: our templates score 0.0000, a bare label
 * scores 0.0000, and a label followed by one third-person paraphrase sentence
 * scores 1.0000 — the SAME 1.0000 when the label is deliberately wrong, so what
 * these two scorers reward is register, not correctness (the same finding as
 * G154). Every other intent stays keyless and non-generative; see ARCHITECTURE.
 *
 * FAIL CLOSED, ALWAYS. This function returns a string or null and never throws.
 * Null means "answer exactly as the keyless path would have": no key, no budget,
 * a rate limit, a timeout, an empty or refusing completion. A validator
 * spot-checks constantly, so a degraded answer is worse than no model at all.
 *
 * WITHOUT A KEY NOTHING CHANGES. `GROQ_API_KEY` absent returns null before any
 * fetch, so a keyless run — every unit test, every local run, any deployment
 * without the variable — behaves exactly as it did before this file existed.
 *
 * THE KEY IS NEVER SPOKEN. It is read from the environment, sent only to
 * api.groq.com in an Authorization header, and never placed in a return value,
 * an error, a log line or a cache key.
 */
import { createHash } from "node:crypto";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * The free-plan text models, read on console.groq.com/docs/rate-limits and
 * confirmed against GET /openai/v1/models on 2026-09-19: each is active and
 * carries its own 30 RPM / 1K RPD / 8K TPM / 200K TPD allowance, so rotating the
 * starting model spreads one day's calls across three separate quotas.
 *
 * All three accept `reasoning_effort: "low"`; "none" is rejected by the gpt-oss
 * pair with a 400. Measured the same day, low cuts gpt-oss-20b from 126 to 49
 * completion tokens and holds the call at ~0.5 s, which is what keeps the daily
 * token budget (not the request count) from being the binding limit.
 */
const MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];

/** Read per call rather than once at load, so a test can shorten them. */
const budgetMs = (): number => {
  const v = Number(process.env.LLM_BUDGET_MS);
  return Number.isFinite(v) && v > 0 ? v : 4_500;
};
/** Below this, there is no point starting another model: the reply would miss the budget. */
const MIN_ATTEMPT_MS = 1_500;
/** After every model has refused for rate, stop asking for a minute. */
const COOLDOWN_MS = 60_000;
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 200;

export interface PhraseRequest {
  system: string;
  user: string;
  maxTokens?: number;
  deadlineMs?: number;
}

interface Entry { text: string; at: number }

const cache = new Map<string, Entry>();
let cooldownUntil = 0;
let nextModel = 0;

/** Cache identity: the whole prompt, which carries both the intent and the input. */
const cacheKey = (r: PhraseRequest): string =>
  createHash("sha256").update(`${r.system}\n<<>>\n${r.user}\n<<>>\n${r.maxTokens ?? 200}`).digest("hex");

/** Test hook: the cache, the cooldown and the rotation are process-wide state. */
export function resetPhraseState(): void {
  cache.clear();
  cooldownUntil = 0;
  nextModel = 0;
}

/**
 * A model's prose as an answer may carry it: one paragraph, no markup.
 *
 * A refusal or an empty completion is not an answer, and returning it would put
 * "As an AI language model" in front of a validator. Both become null, which
 * the caller reads as "use the keyless answer".
 */
export function sanitise(raw: string): string | null {
  const text = String(raw ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*[#>\-*]+\s*/gm, "")
    .replace(/\*\*|__|\*|`|_/g, "")
    .replace(/\s+/g, " ")
    .replace(/^["'“‘]+|["'”’]+$/g, "")
    .trim();
  if (!text) return null;
  if (/\b(?:i cannot|i can't|i am unable|i'm unable|as an ai|i do not have enough|i don't have enough)\b/i.test(text)) return null;
  const words = text.split(" ");
  return words.length <= 90 ? text : `${words.slice(0, 90).join(" ").replace(/[,;:]+$/, "")}.`;
}

/** One model, one attempt. Null for every failure; the reason is never surfaced. */
async function ask(model: string, r: PhraseRequest, key: string, ms: number): Promise<string | "rate" | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: r.system }, { role: "user", content: r.user }],
        temperature: 0.2,
        max_completion_tokens: r.maxTokens ?? 200,
        reasoning_effort: "low",
      }),
      signal: AbortSignal.timeout(ms),
    });
    if (res.status === 429 || res.status >= 500) return "rate";
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return sanitise(body?.choices?.[0]?.message?.content ?? "");
  } catch {
    // A timeout, a DNS failure or a malformed body. The caller falls back.
    return null;
  }
}

/**
 * The phrased answer, or null.
 *
 * Models are tried in a rotating order so no single daily quota carries every
 * call, and the next one is only started when enough of the budget is left for
 * it to finish. A rate limit from every model parks the whole path for a minute
 * rather than spending the rest of the budget discovering the same 429 again.
 */
export async function phrase(r: PhraseRequest): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  if (Date.now() < cooldownUntil) return null;

  const id = cacheKey(r);
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.text;

  const deadline = Date.now() + Math.min(r.deadlineMs ?? budgetMs(), budgetMs());
  let limited = 0;
  for (let i = 0; i < MODELS.length; i++) {
    const left = deadline - Date.now();
    if (left < MIN_ATTEMPT_MS) break;
    const model = MODELS[(nextModel + i) % MODELS.length] ?? MODELS[0]!;
    const out = await ask(model, r, key, left);
    if (out === "rate") { limited++; continue; }
    if (out) {
      nextModel = (nextModel + i + 1) % MODELS.length;
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(id, { text: out, at: Date.now() });
      return out;
    }
  }
  nextModel = (nextModel + 1) % MODELS.length;
  if (limited >= MODELS.length) cooldownUntil = Date.now() + COOLDOWN_MS;
  return null;
}
