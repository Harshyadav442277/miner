/**
 * The network half of URL_SCAN: DNS over HTTPS, the URLhaus lists, and a guarded
 * walk of the redirect chain. Split from urlscan.ts so the classifier there stays
 * a pure function that can be tested without a socket.
 *
 * PROVIDERS, each verified live on 2026-09-12 with no key and no header:
 *   security.cloudflare-dns.com  Cloudflare's 1.1.1.2 malware-and-phishing
 *                                filter. Answers 0.0.0.0 with EDE 16 "Censored"
 *                                for malware.testcategory.com and
 *                                phishing.testcategory.com, which Cloudflare
 *                                publishes as its test domains.
 *   cloudflare-dns.com, dns.google  Unfiltered, for comparison. The same names
 *                                resolve to 104.18.4.35 / 104.18.5.35 there, which
 *                                is what proves the 0.0.0.0 is a block rather
 *                                than a parked domain.
 *   urlhaus.abuse.ch/downloads   hostfile (10.9 KB) and text_online (1.1 MB).
 *                                The per-URL API now answers 401 without an
 *                                Auth-Key, so only the documented bulk downloads
 *                                are used, cached for fifteen minutes.
 *
 * Tried and dropped: Quad9's DoH answers HTTP 505 to Node's HTTP/1.1 fetch, and
 * its JSON port 5053 did not connect from this machine in 10 s.
 */
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { assertPublicHost } from "./guard";

const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const DOH_TIMEOUT_MS = Number(process.env.URLSCAN_DOH_TIMEOUT_MS ?? 4_000);
const LIST_TIMEOUT_MS = Number(process.env.URLSCAN_LIST_TIMEOUT_MS ?? 5_000);
const HOP_TIMEOUT_MS = Number(process.env.URLSCAN_HOP_TIMEOUT_MS ?? 3_000);
const LIST_TTL_MS = 15 * 60 * 1000;

export interface DnsAnswer {
  status: number;
  ips: string[];
  censored: boolean;
}

/** One JSON DNS-over-HTTPS A query. "unavailable" is an outage, never an empty answer. */
export async function dohA(endpoint: string, name: string): Promise<DnsAnswer | "unavailable"> {
  try {
    const r = await fetch(`${endpoint}?name=${encodeURIComponent(name)}&type=A`, {
      headers: { accept: "application/dns-json", "user-agent": UA },
      signal: AbortSignal.timeout(DOH_TIMEOUT_MS),
    });
    if (!r.ok) return "unavailable";
    const j = (await r.json()) as { Status?: number; Answer?: { type?: number; data?: string }[]; Comment?: unknown };
    if (typeof j.Status !== "number") return "unavailable";
    const ips = (j.Answer ?? []).filter((a) => a.type === 1 && typeof a.data === "string").map((a) => a.data as string);
    return { status: j.Status, ips, censored: /EDE\(16\)|censored/i.test(JSON.stringify(j.Comment ?? "")) };
  } catch {
    return "unavailable";
  }
}

export const SECURITY_RESOLVER = "https://security.cloudflare-dns.com/dns-query";
const OPEN_RESOLVERS = ["https://cloudflare-dns.com/dns-query", "https://dns.google/resolve"];

/** The unfiltered answer, with failover: the second resolver is asked only if the first is down. */
export async function openResolve(name: string): Promise<DnsAnswer | "unavailable"> {
  for (const e of OPEN_RESOLVERS) {
    const a = await dohA(e, name);
    if (a !== "unavailable") return a;
  }
  return "unavailable";
}

let lists: { at: number; hosts: Set<string>; urls: Set<string> } | null = null;

/** "127.0.0.1\thost" lines, comments skipped. Exported for the parser test. */
export function parseHostfile(text: string): Set<string> {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:127\.0\.0\.1|0\.0\.0\.0)\s+(\S+)/);
    if (m?.[1]) out.add(m[1].toLowerCase());
  }
  return out;
}

/** One URL per line, comments skipped. */
export function parseUrlList(text: string): Set<string> {
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (s && !s.startsWith("#")) out.add(s);
  }
  return out;
}

/** URLhaus's current lists, cached. A failed read is not cached, so the next request retries. */
export async function urlhausLists(): Promise<{ hosts: Set<string>; urls: Set<string> } | "unavailable"> {
  if (lists && Date.now() - lists.at < LIST_TTL_MS) return lists;
  const read = async (u: string): Promise<string> => {
    const r = await fetch(u, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(LIST_TIMEOUT_MS) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  };
  try {
    const [h, u] = await Promise.all([
      read("https://urlhaus.abuse.ch/downloads/hostfile/"),
      read("https://urlhaus.abuse.ch/downloads/text_online/"),
    ]);
    const hosts = parseHostfile(h);
    // An empty host list is a broken download, not a clean internet.
    if (hosts.size === 0) return "unavailable";
    lists = { at: Date.now(), hosts, urls: parseUrlList(u) };
    return lists;
  } catch {
    return "unavailable";
  }
}

export interface Hop {
  url: string;
  status: number | null;
  note?: string;
}

/**
 * Status of one URL, over a socket pinned to the address the guard vetted.
 *
 * `fetch` would resolve the name again after the guard did, which is the DNS
 * rebinding gap ssl.ts already closes by connecting to the vetted IP. The same
 * is done here through `lookup`, so a hostile name cannot answer the guard with a
 * public address and the connection with a private one. The body is never read.
 */
function statusOf(u: URL, address: string): Promise<{ status: number; location: string | null }> {
  const family = address.includes(":") ? 6 : 4;
  const req = u.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const r = req(u, {
      method: "GET",
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      // Certificate verification stays ON. A host with a bad certificate ends
      // the walk at that hop with the TLS error as its note; the certificate
      // itself is reported by ssl.ts, which inspects it without trusting it.
      lookup: ((_h: string, o: { all?: boolean }, cb: (...a: unknown[]) => void) =>
        o?.all ? cb(null, [{ address, family }]) : cb(null, address, family)) as never,
    }, (res: IncomingMessage) => {
      const loc = res.headers.location;
      resolve({ status: res.statusCode ?? 0, location: typeof loc === "string" ? loc : null });
      res.destroy();
    });
    r.setTimeout(HOP_TIMEOUT_MS, () => r.destroy(new Error("timeout")));
    r.on("error", reject);
    r.end();
  });
}

/** Up to five hops, every hop's host guarded before any byte is sent to it. */
export async function redirectChain(start: URL, maxHops = 5, budgetMs = 6_000): Promise<Hop[]> {
  const hops: Hop[] = [];
  let current: URL | null = start;
  // Five hops at 3 s each is 15 s, past the route's 11 s watchdog; the walk
  // stops at its own budget and says so rather than taking the answer with it.
  const deadline = Date.now() + budgetMs;
  while (current && hops.length < maxHops) {
    if (Date.now() > deadline) {
      hops.push({ url: current.href, status: null, note: "redirect walk stopped at its time budget" });
      break;
    }
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      hops.push({ url: current.href, status: null, note: `non-web scheme ${current.protocol}` });
      break;
    }
    const guard = await assertPublicHost(current.hostname.replace(/^\[|\]$/g, ""));
    if (!guard.allowed) {
      hops.push({ url: current.href, status: null, note: guard.reason });
      break;
    }
    const here: URL = current;
    try {
      const { status, location } = await statusOf(here, guard.address);
      hops.push({ url: here.href, status });
      current = status >= 300 && status < 400 && location ? new URL(location, here) : null;
    } catch (e) {
      hops.push({ url: here.href, status: null, note: (e as Error).message });
      break;
    }
  }
  return hops;
}
