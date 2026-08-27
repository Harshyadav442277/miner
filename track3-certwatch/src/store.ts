import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** A single check, as Telegraph answered it. */
export interface Check {
  domain: string;
  at: string;
  verdict: string | null;
  daysRemaining: number | null;
  issuer: string | null;
  validTo: string | null;
  minerName: string | null;
  minerId: string | null;
  intent: string | null;
  signalHash: string | null;
  costUsd: number | null;
  durationMs: number | null;
  error: string | null;
}

export interface State {
  domains: string[];
  checks: Check[];
  totals: { requests: number; spentUsd: number; sslVerificationRequests: number };
}

/**
 * Where durable history lives.
 *
 * Serverless filesystems are read-only apart from /tmp, and /tmp does not survive
 * a cold start — so paid calls made on Vercel were being forgotten, which made
 * spending money on them pointless.
 *
 * Rather than add a database, the scheduled sweep runs in GitHub Actions and
 * commits its results to `app/data/history.json` in this repo. Git becomes the
 * durable store and Actions the scheduler, both of which already exist and neither
 * of which can silently lose a paid result. The serverless app reads that file
 * over HTTP and renders it, falling back to local state when it cannot.
 */
const HISTORY_URL =
  process.env.HISTORY_URL ??
  "https://raw.githubusercontent.com/Harshyadav442277/miner/main/track3-certwatch/data/history.json";

/** Committed history, or null if it is unreachable or absent. */
export async function loadCommittedHistory(timeoutMs = 6000): Promise<State | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${HISTORY_URL}?t=${Date.now()}`, {
      signal: ac.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<State>;
    if (!Array.isArray(body.checks)) return null;
    return {
      domains: Array.isArray(body.domains) ? body.domains : [],
      checks: body.checks,
      totals: body.totals ?? { requests: 0, spentUsd: 0, sslVerificationRequests: 0 },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const ON_SERVERLESS = Boolean(process.env.VERCEL);
const FILE = resolve(process.env.STATE_FILE ?? (ON_SERVERLESS ? "/tmp/state.json" : "data/state.json"));
const MAX_CHECKS = 500;

/** Comma-separated seed list, so a fresh serverless instance is never empty. */
function seedDomains(): string[] {
  return (process.env.WATCH_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

const empty: State = {
  domains: [],
  checks: [],
  totals: { requests: 0, spentUsd: 0, sslVerificationRequests: 0 },
};

export async function load(): Promise<State> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<State>;
    const domains = parsed.domains ?? [];
    for (const d of seedDomains()) if (!domains.includes(d)) domains.push(d);
    return {
      domains,
      checks: parsed.checks ?? [],
      totals: parsed.totals ?? { ...empty.totals },
    };
  } catch {
    return { domains: seedDomains(), checks: [], totals: { ...empty.totals } };
  }
}

export async function save(state: State): Promise<void> {
  // Best-effort: a read-only filesystem must not take the dashboard down.
  try {
    await mkdir(dirname(FILE), { recursive: true });
    const trimmed: State = { ...state, checks: state.checks.slice(-MAX_CHECKS) };
    await writeFile(FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch {
    /* ignore — state is in memory for the life of this instance */
  }
}

export function record(state: State, check: Check): void {
  state.checks.push(check);
  if (!check.error) {
    state.totals.requests += 1;
    state.totals.spentUsd = Number((state.totals.spentUsd + (check.costUsd ?? 0)).toFixed(6));
    // Tracked separately: the hackathon's prize-eligibility guardrail counts
    // requests to an *intent*, so what the router classified matters, not who served it.
    if (check.intent === "SSL_VERIFICATION") state.totals.sslVerificationRequests += 1;
  }
}

/** Latest check per domain, newest first. */
export function latest(state: State): Check[] {
  const seen = new Map<string, Check>();
  for (const c of state.checks) seen.set(c.domain, c);
  return [...seen.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
}
