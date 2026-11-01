/**
 * The receipt every answer carries: which upstream requests the miner actually made
 * to answer it, when, and what came back. A reviewer or an app can re-run the same
 * requests and check the answer against what the sources say now.
 *
 * Recorded, not reconstructed. `fetch` is wrapped once, and each request runs in its
 * own AsyncLocalStorage context, so every call made while answering is logged
 * whatever module made it. The modules name their sources in many shapes (source,
 * source_url, sources, citations, prose), and SSL and weather name no URL at all;
 * a receipt assembled from those fields would be patchy and partly guessed.
 *
 * What it does not show:
 * - Data a module already held in memory: the sanctions lists (6 h), the ECB table
 *   (10 min) and model replies (10 min). The receipt then says so, and the answer's own
 *   source fields name where that data came from.
 * - Request bodies and headers. Keys travel in headers (Groq, NVD), and a query
 *   parameter whose name looks like a credential is redacted.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface UpstreamRead {
  /** The URL with credential-like query values replaced by REDACTED; tls:// or dns:// for socket reads. */
  url: string;
  /** An HTTP method, or "TLS" / "DNS" for the reads that do not go through fetch. */
  method: string;
  /** HTTP status, or null when the request failed, timed out or was not HTTP. */
  status: number | null;
  /** For a TLS or DNS read: what came back, e.g. "connected", "4 addresses", "failed". */
  result?: string;
  started_at: string;
  ms: number;
}

export interface Receipt {
  id: string;
  /** The deployment that answered: VERCEL_URL on Vercel, else "local". */
  deployment: string;
  answered_at: string;
  upstream: UpstreamRead[];
  /** True when the answer came from this instance's one-minute response cache. */
  from_cache: boolean;
  note?: string;
}

interface Context { reads: UpstreamRead[]; fromCache: boolean }

const store = new AsyncLocalStorage<Context>();
const SECRET_PARAM = /key|token|secret|auth|sig|password|mailto|credential/i;

/** A URL safe to publish: credential-like query values and userinfo removed. Pure. */
export function redact(raw: string): string {
  try {
    const u = new URL(raw);
    u.username = "";
    u.password = "";
    for (const name of [...u.searchParams.keys()]) if (SECRET_PARAM.test(name)) u.searchParams.set(name, "REDACTED");
    return u.toString();
  } catch {
    return "unparseable URL";
  }
}

let installed = false;

/** Wraps the global fetch once so reads made inside a receipt context are recorded. */
export function installRecorder(): void {
  if (installed) return;
  installed = true;
  globalThis.fetch = recording(globalThis.fetch);
}

/** `inner`, recording each call made inside a receipt context. Exported for tests. */
export function recording(inner: typeof fetch): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const ctx = store.getStore();
    if (!ctx) return inner(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const t = Date.now();
    const read: UpstreamRead = { url: redact(url), method, status: null, started_at: new Date(t).toISOString(), ms: 0 };
    ctx.reads.push(read);
    try {
      const res = await inner(input, init);
      read.status = res.status;
      return res;
    } finally {
      read.ms = Date.now() - t;
    }
  }) as typeof fetch;
}

/**
 * Records a read made without fetch: the SSL check's TLS handshake, the IP lookup's
 * DNS resolve and URL_SCAN's redirect walk open sockets directly.
 */
export function noteRead(read: UpstreamRead): void {
  store.getStore()?.reads.push({ ...read, url: read.url.startsWith("http") ? redact(read.url) : read.url });
}

/** Runs `fn` in a fresh receipt context. */
export function withReceipt<T>(fn: () => T): T {
  return store.run({ reads: [], fromCache: false }, fn);
}

/** The reads so far in this context, copied so a cache can keep them. */
export function readsSoFar(): UpstreamRead[] {
  return [...(store.getStore()?.reads ?? [])];
}

/** Marks this answer as served from the response cache, with the reads that first produced it. */
export function replayFromCache(reads: UpstreamRead[]): void {
  const ctx = store.getStore();
  if (!ctx) return;
  ctx.fromCache = true;
  ctx.reads.push(...reads);
}

/** The receipt for the answer being sent now. */
export function currentReceipt(now = new Date()): Receipt {
  const ctx = store.getStore();
  const upstream = ctx ? [...ctx.reads] : [];
  const fromCache = ctx?.fromCache ?? false;
  return {
    id: randomUUID(),
    deployment: process.env.VERCEL_URL ?? "local",
    answered_at: now.toISOString(),
    upstream,
    from_cache: fromCache,
    ...(upstream.length ? {} : {
      note: "No upstream request was made for this answer: it was computed from the question alone, or from data this " +
        "instance already held from an earlier request (for example sanctions lists, the ECB rate table, a weather " +
        "forecast, a place lookup or a model reply). The answer's own source fields name where that data came from.",
    }),
  };
}
