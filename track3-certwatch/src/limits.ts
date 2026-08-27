import { timingSafeEqual } from "node:crypto";

/**
 * Guards for the endpoints that can spend money.
 *
 * CertWatch pays $0.01 in USDC per routed Telegraph query. `POST /api/check` and
 * `POST /api/domains` both trigger those calls, so without these an open
 * deployment is a public button that drains a funded wallet.
 *
 * Three independent layers, because each fails differently:
 *   - a shared token stops strangers entirely;
 *   - a rate limit stops a loop from the holder of that token;
 *   - a daily cap bounds the worst case even if both are somehow defeated.
 */

const DAY_MS = 86_400_000;

/** Constant-time compare so the token cannot be recovered a character at a time. */
export function tokenMatches(provided: string | undefined, expected: string | undefined): boolean {
  if (!expected) return false;
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function bearerFrom(header: string | string[] | undefined): string | undefined {
  const h = Array.isArray(header) ? header[0] : header;
  if (!h) return undefined;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim();
}

export interface SpendState {
  /** Paid calls made in the current UTC day. */
  paidToday: number;
  /** Start of the day those calls are counted against. */
  dayStartedMs: number;
}

export function emptySpend(nowMs: number): SpendState {
  return { paidToday: 0, dayStartedMs: nowMs };
}

/** Rolls the counter over at a day boundary. */
export function rollDay(s: SpendState, nowMs: number): SpendState {
  if (nowMs - s.dayStartedMs >= DAY_MS) return { paidToday: 0, dayStartedMs: nowMs };
  return s;
}

export interface CapDecision {
  allowed: boolean;
  reason?: string;
  remaining: number;
}

/**
 * Whether `count` more paid calls fit under the daily cap.
 * Cap of 0 disables paid work entirely — the safe default before funding.
 */
export function checkCap(s: SpendState, count: number, dailyCap: number, nowMs: number): CapDecision {
  const rolled = rollDay(s, nowMs);
  const remaining = Math.max(0, dailyCap - rolled.paidToday);
  if (count > remaining) {
    return {
      allowed: false,
      remaining,
      reason:
        dailyCap === 0
          ? "paid calls are disabled — set MAX_PAID_CALLS_PER_DAY to enable them"
          : `daily cap of ${dailyCap} paid calls reached (${rolled.paidToday} used)`,
    };
  }
  return { allowed: true, remaining };
}

/** A fixed-window limiter. Per-instance, so it bounds a loop rather than proving a global rate. */
export class RateLimiter {
  private hits: number[] = [];
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  take(nowMs: number): { allowed: boolean; retryAfterS: number } {
    this.hits = this.hits.filter((t) => nowMs - t < this.windowMs);
    if (this.hits.length >= this.max) {
      const oldest = this.hits[0] ?? nowMs;
      return { allowed: false, retryAfterS: Math.ceil((this.windowMs - (nowMs - oldest)) / 1000) };
    }
    this.hits.push(nowMs);
    return { allowed: true, retryAfterS: 0 };
  }
}
