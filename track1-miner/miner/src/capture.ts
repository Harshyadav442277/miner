/**
 * Request capture: what each request asked and what we answered, so the questions the network actually sends
 * (ranking questions included, which no other miner sees) can be replayed, measured and tuned against.
 *
 * Off unless a Redis REST store is configured: KV_REST_API_URL + KV_REST_API_TOKEN (the names Vercel's Upstash
 * integration sets) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN. With neither, nothing is sent
 * anywhere and answers are unchanged.
 *
 * What is kept: the route, its query parameters, the HTTP status, the verdict and error, the answer's lead
 * sentence (cut to 300 characters), the user-agent (cut to 80) and the time taken. Never the caller's IP,
 * cookies, authorisation or other headers. A day's list expires after 14 days. Sanctions requests carry people's
 * names, so the store holds personal data for at most that long (GAPS).
 *
 * Fire-and-forget after the response is written: a slow or failing store never delays or changes an answer.
 */

export interface Captured {
  at: string;
  path: string;
  params: Record<string, string>;
  status: number;
  verdict: string | null;
  error: string | null;
  answer: string | null;
  ua: string | null;
  ms: number;
}

const TTL_S = 14 * 86_400;
const TIMEOUT_MS = 2_000;

function store(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token && /^https:\/\//.test(url) ? { url: url.replace(/\/$/, ""), token } : null;
}

export const captureEnabled = (): boolean => store() !== null;

/** The record kept for one answered request. Pure. */
export function record(path: string, params: URLSearchParams, status: number, body: unknown, ua: string | null, started: number, now = Date.now()): Captured {
  const b = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const p: Record<string, string> = {};
  for (const [k, v] of params) p[k] = v.slice(0, 2_000);
  const str = (v: unknown, n: number): string | null => (typeof v === "string" && v ? v.slice(0, n) : null);
  return {
    at: new Date(now).toISOString(), path, params: p, status,
    verdict: str(b.verdict, 60), error: str(b.error, 60), answer: str(b.answer ?? b.reason, 300),
    ua: str(ua, 80), ms: Math.max(0, now - started),
  };
}

/** The day's list key: one Redis list per UTC day. Pure. */
export const dayKey = (at: string): string => `capture:${at.slice(0, 10)}`;

/** Send one record. Never throws and is never awaited by the request path. */
export async function capture(rec: Captured): Promise<void> {
  const s = store();
  if (!s) return;
  const key = dayKey(rec.at);
  try {
    await fetch(`${s.url}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" },
      body: JSON.stringify([["LPUSH", key, JSON.stringify(rec)], ["EXPIRE", key, String(TTL_S)]]),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // A capture miss costs a data point, never an answer.
  }
}
