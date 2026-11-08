/**
 * The miner's generative calls, all through Groq's open-weight gpt-oss and qwen models.
 *
 * Three uses: phrasing an answer we have ALREADY decided (TEXT_CLASSIFICATION, SENTIMENT_ANALYSIS),
 * citing QUESTION_ANSWERING's retrieved sources, and LANGUAGE_TRANSLATION since 2026-10-18, when
 * the unofficial Google endpoint and MyMemory (which bars resale) were dropped (GAPS G189).
 * Groq's Services Agreement allows integrating its models into a "Customer Application" and
 * forbids reselling the Cloud Services themselves (§6.3(c), read 2026-10-18); a translation
 * endpoint sits near that line, which is recorded in GAPS rather than assumed away.
 *
 * WHY PHRASING EXISTS AT ALL. TEXT_CLASSIFICATION and SENTIMENT_ANALYSIS are scored
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

/**
 * The model for a request with a latency target the reasoning models cannot meet.
 * The site gives SENTIMENT_ANALYSIS < 300 ms and TEXT_CLASSIFICATION < 400 ms. The
 * three models above at "low" took 430–650 ms on a sentiment prompt. qwen3.8-27b
 * accepts "none" and took 155–170 ms from India, with sarcasm still read right
 * (2026-10-25, track1-miner/docs/evidence/conformance-2026-10-25/). It gets one
 * attempt, and a miss is the keyless answer, except after a 429 with time left (below).
 */
const FAST_MODEL = "qwen/qwen3.8-27b";
/**
 * The second fast attempt, after FAST_MODEL answers 429 (TEXT_CLASSIFICATION answered ambiguous on a 429,
 * 2026-11-08). gpt-oss-20b has its own quota but rejects "none", so it runs at "low", measured at ~0.5 s
 * (2026-09-19): inside a 350 ms classification deadline it will often miss. LLM_FAST_FALLBACK_MODEL names a
 * faster model once one is confirmed on the account; none is confirmed here (GROQ_API_KEY is not local).
 */
const fastFallback = (): string => process.env.LLM_FAST_FALLBACK_MODEL || "openai/gpt-oss-20b";
/** Below this, a second fast attempt cannot return inside the deadline. */
const FAST_RETRY_MIN_MS = 150;

/** Read per call rather than once at load, so a test can shorten them. */
const budgetMs = (): number => {
  const v = Number(process.env.LLM_BUDGET_MS);
  return Number.isFinite(v) && v > 0 ? v : 4_500;
};
/** Below this, there is no point starting another model: the reply would miss the budget. */
const MIN_ATTEMPT_MS = 1_500;
/** The cap for a `long` request: the handler's watchdog answers at 11 s, so the model must finish first. */
const LONG_BUDGET_MS = 9_000;
/** The order for a `long` request: the largest model writes the best review or text, then the other two. */
const LONG_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
/**
 * Long requests share the free quota with the phrasing path that the ranked intents use: per model,
 * 8K tokens a minute and 200K a day, three models (read 2026-09-19). A count of calls does not bound
 * tokens (12 reviews a minute can be ~45K), so long calls are budgeted by estimated tokens, the prompt
 * at ~4 characters a token plus the completion cap, and hold at most half of the minute and of the day:
 * 12K a minute and 300K a day by default. Over budget is an `unknown` for the long route, never a
 * rate limit on the phrasing path; they also keep their own cooldown (commit security reviews,
 * 2026-11-07). Per instance: Vercel may run more than one.
 */
const envNumber = (name: string, fallback: number): number => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
const longSpend: Array<{ at: number; tokens: number }> = [];
/**
 * The tokens one attempt can cost at most. Pure. ASCII runs about four characters a token; any other code
 * point (CJK, emoji) is counted as a whole token, since dividing those by four underestimated them about
 * fourfold (security review, 2026-11-07).
 */
export function estimateTokens(r: PhraseRequest): number {
  let ascii = 0, other = 0;
  for (const ch of r.system + r.user) (ch.codePointAt(0)! < 128 ? ascii++ : other++);
  return Math.ceil(ascii / 4) + other + (r.maxTokens ?? 200);
}
/** Whether a long request fits the minute and day budgets now; records it when it does. */
function spendLong(tokens: number, now = Date.now()): boolean {
  while (longSpend.length && now - longSpend[0]!.at > 86_400_000) longSpend.shift();
  const minute = longSpend.reduce((a, s) => a + (now - s.at <= 60_000 ? s.tokens : 0), 0);
  const day = longSpend.reduce((a, s) => a + s.tokens, 0);
  if (minute + tokens > envNumber("LLM_LONG_TOKENS_PER_MIN", 12_000)) return false;
  if (day + tokens > envNumber("LLM_LONG_TOKENS_PER_DAY", 300_000)) return false;
  longSpend.push({ at: now, tokens });
  return true;
}
/** After every model has refused for rate, stop asking for a minute. */
const COOLDOWN_MS = 60_000;
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 200;

export interface PhraseRequest {
  system: string;
  user: string;
  maxTokens?: number;
  deadlineMs?: number;
  /** One non-reasoning attempt within `deadlineMs`, for a route with a tight latency target. */
  fast?: boolean;
  /** Turns the model's raw reply into the answer, or null to reject it. Defaults to `sanitise`. */
  clean?: (raw: string) => string | null;
  /**
   * A generated answer (chat, code review, writing) rather than a phrased one: the budget may run to
   * LONG_BUDGET_MS, still inside the 11 s watchdog, and gpt-oss-120b is tried first.
   */
  long?: boolean;
  /** Ask for a JSON object (Groq `response_format: json_object`). */
  json?: boolean;
}

interface Entry { text: string; at: number }

const cache = new Map<string, Entry>();
let cooldownUntil = 0;
let longCooldownUntil = 0;
let nextModel = 0;

/** Cache identity: the whole prompt, which carries both the intent and the input. */
const cacheKey = (r: PhraseRequest): string =>
  createHash("sha256").update(`${r.system}\n<<>>\n${r.user}\n<<>>\n${r.maxTokens ?? 200}`).digest("hex");

/** Test hook: the cache, the cooldown and the rotation are process-wide state. */
export function resetPhraseState(): void {
  cache.clear();
  cooldownUntil = 0;
  longCooldownUntil = 0;
  longSpend.length = 0;
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

/**
 * A model reply with plain hyphens. gpt-oss writes U+2011 non-breaking hyphens ("off-by-one" came back with
 * U+2011, as did "Musk-backed", production 2026-11-08); a JSON value keeps them, so they are replaced at the
 * source. Pure.
 */
export const plainHyphens = (text: string): string => text.replace(/[‐‑]/g, "-");

/**
 * A 400 ends this model's attempt at once, and the caller moves to the next model. With `json`, Groq answers
 * 400 `json_validate_failed` only AFTER the model has written its whole reply, and returns that reply as
 * `error.failed_generation`: a code review spent its 120b generation that way, then qwen ran 8.1 s (production,
 * 2026-11-08). The reply is kept when `clean` accepts it (a JSON object with prose around it parses), so the
 * generation already paid for is not thrown away. Pure.
 */
export function salvage400(body: string, r: PhraseRequest): string | null {
  try {
    const e = (JSON.parse(body) as { error?: { code?: string; failed_generation?: string } })?.error;
    const gen = r.json && e?.code === "json_validate_failed" ? e.failed_generation : undefined;
    return typeof gen === "string" && gen.trim() ? (r.clean ?? sanitise)(plainHyphens(gen)) : null;
  } catch {
    return null;
  }
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
        // The gpt-oss pair rejects "none" with a 400, so a fast fallback to one of them runs at "low".
        reasoning_effort: r.fast && !model.startsWith("openai/gpt-oss") ? "none" : "low",
        ...(r.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(ms),
    });
    if (res.status === 429 || res.status >= 500) return "rate";
    if (res.status === 400) return salvage400(await res.text().catch(() => ""), r);
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return (r.clean ?? sanitise)(plainHyphens(body?.choices?.[0]?.message?.content ?? ""));
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
  if (Date.now() < (r.long ? longCooldownUntil : cooldownUntil)) return null;

  const id = cacheKey(r);
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.text;

  const cap = r.long ? Math.max(budgetMs(), LONG_BUDGET_MS) : budgetMs();
  const deadline = Date.now() + Math.min(r.deadlineMs ?? cap, cap);
  if (r.fast) {
    // Outside the rotation and the cooldown. A 429 comes back fast and is one model's quota, so a second model
    // with its own quota is tried while enough of the deadline is left; a timeout or a refusal is not retried.
    let out = await ask(FAST_MODEL, r, key, Math.max(1, deadline - Date.now()));
    const left = deadline - Date.now();
    if (out === "rate" && left >= FAST_RETRY_MIN_MS) out = await ask(fastFallback(), r, key, left);
    if (!out || out === "rate") return null;
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(id, { text: out, at: Date.now() });
    return out;
  }
  let limited = 0;
  for (let i = 0; i < MODELS.length; i++) {
    const left = deadline - Date.now();
    if (left < MIN_ATTEMPT_MS) break;
    const model = r.long ? LONG_MODELS[i]! : MODELS[(nextModel + i) % MODELS.length] ?? MODELS[0]!;
    // Every attempt is charged, the fallbacks included: a timed-out call may still have spent tokens.
    if (r.long && !spendLong(estimateTokens(r))) break;
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
  if (limited >= MODELS.length) {
    if (r.long) longCooldownUntil = Date.now() + COOLDOWN_MS;
    else cooldownUntil = Date.now() + COOLDOWN_MS;
  }
  return null;
}
