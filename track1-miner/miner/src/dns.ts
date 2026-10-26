/**
 * DNS_RECORD_LOOKUP — the records a name publishes, read from two independent
 * public resolvers and compared.
 *
 * The site's row (hackathon Intents page, read 2026-10-25) asks for A, AAAA,
 * CNAME, MX and TXT records "across global resolvers", names Cloudflare 1.1.1.1,
 * Google DNS and Quad9, and sets a 200 ms target. Cloudflare and Google both
 * answer DNS-over-HTTPS as JSON with no key. Quad9's JSON port timed out from
 * here (quad9.ts), so it is not a third resolver.
 *
 * The two answers are compared record by record. Agreement is the propagation
 * check the row describes; a disagreement is reported with both sides rather
 * than resolved by picking one.
 */

const TIMEOUT_MS = Number(process.env.DNS_TIMEOUT_MS ?? 1_500);

export const RESOLVERS = [
  { name: "Cloudflare 1.1.1.1", url: "https://cloudflare-dns.com/dns-query" },
  { name: "Google Public DNS", url: "https://dns.google/resolve" },
] as const;

const TYPES: Record<string, number> = { A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28, CAA: 257 };
const RCODE: Record<number, string> = { 0: "NOERROR", 2: "SERVFAIL", 3: "NXDOMAIN", 5: "REFUSED" };

export interface ResolverAnswer {
  resolver: string;
  status: string | null;
  records: string[];
  ttl: number | null;
  dnssec_validated: boolean | null;
}

export interface DnsResult {
  name: string | null;
  record_type: string | null;
  records: string[] | null;
  ttl: number | null;
  resolvers_agree: boolean | null;
  resolvers: ResolverAnswer[];
  cname_chain: string[] | null;
  verdict: "resolved" | "no_records" | "nxdomain" | "resolvers_disagree" | "insufficient_input" | "unknown";
  confidence: number;
  reason: string;
  source: string;
  error?: string;
}

/** The record type a question asks for, or null. Pure. */
export function recordType(param: string, question: string): string | null {
  const p = String(param ?? "").trim().toUpperCase();
  if (TYPES[p]) return p;
  const q = String(question ?? "");
  if (/\bAAAA\b|\bipv6\b/i.test(q)) return "AAAA";
  if (/\bMX\b|\bmail (?:server|exchanger)s?\b/i.test(q)) return "MX";
  if (/\bTXT\b|\bSPF\b|\bDMARC\b|\bverification record\b/i.test(q)) return "TXT";
  if (/\bCNAME\b|\balias\b|\bcanonical name\b/i.test(q)) return "CNAME";
  if (/\bNS\b|\bname ?servers?\b/i.test(q)) return "NS";
  if (/\bSOA\b|\bstart of authority\b/i.test(q)) return "SOA";
  if (/\bCAA\b|\bcertificate authority authori[sz]ation\b/i.test(q)) return "CAA";
  if (/\bA record\b|\bipv4\b|\bIP address\b|\bresolve[sd]?\b/i.test(q)) return "A";
  return null;
}

/**
 * The name a question asks about. A DMARC record lives at `_dmarc.<domain>`,
 * so a question about one is asked of that name. Pure.
 */
export function queryName(param: string, question: string): string | null {
  const text = `${param ?? ""} ${question ?? ""}`;
  const host = text.match(/\b(?:https?:\/\/)?((?:[a-z0-9_](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62})\.?(?=[\s/:?#,;)"']|$)/i)?.[1];
  if (!host || host.length > 253) return null;
  const name = host.toLowerCase();
  return /\bDMARC\b/i.test(text) && !name.startsWith("_dmarc.") ? `_dmarc.${name}` : name;
}

/** TXT data arrives quoted, and long values split into quoted strings. Pure. */
export function cleanData(type: string, data: string): string {
  const d = String(data ?? "").trim();
  if (type === "TXT") return d.replace(/^"|"$/g, "").replace(/"\s+"/g, "");
  return d.replace(/\.$/, "").toLowerCase();
}

interface DohBody {
  Status?: number;
  AD?: boolean;
  Answer?: Array<{ name?: string; type?: number; TTL?: number; data?: string }>;
}

/** One resolver's answer, restated. Pure. */
export function readAnswer(resolver: string, type: string, body: DohBody | null): ResolverAnswer & { cnames: string[] } {
  if (!body || typeof body.Status !== "number") {
    return { resolver, status: null, records: [], ttl: null, dnssec_validated: null, cnames: [] };
  }
  const answers = body.Answer ?? [];
  const wanted = answers.filter((a) => a.type === TYPES[type]);
  const cnames = type === "CNAME" ? [] : answers.filter((a) => a.type === 5).map((a) => cleanData("CNAME", a.data ?? ""));
  return {
    resolver,
    status: RCODE[body.Status] ?? `RCODE ${body.Status}`,
    records: [...new Set(wanted.map((a) => cleanData(type, a.data ?? "")))].sort(),
    ttl: wanted.length ? Math.min(...wanted.map((a) => a.TTL ?? 0)) : null,
    dnssec_validated: typeof body.AD === "boolean" ? body.AD : null,
    cnames,
  };
}

async function ask(url: string, name: string, type: string): Promise<DohBody | null> {
  try {
    const r = await fetch(`${url}?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return r.ok ? (await r.json()) as DohBody : null;
  } catch {
    return null;
  }
}

const SOURCE = "Cloudflare 1.1.1.1 and Google Public DNS, DNS-over-HTTPS";

/** The two resolver answers, compared and stated. Pure. */
export function compare(name: string, type: string, answers: Array<ResolverAnswer & { cnames: string[] }>): DnsResult {
  const resolvers = answers.map(({ cnames: _c, ...a }) => a);
  const base = { name, record_type: type, resolvers, source: SOURCE };
  const answered = answers.filter((a) => a.status !== null);
  if (!answered.length) {
    return { ...base, records: null, ttl: null, resolvers_agree: null, cname_chain: null, verdict: "unknown",
      confidence: 0, error: "upstream_unavailable",
      reason: `Unknown: neither resolver answered for the ${type} records of ${name}. This is an outage, not an empty zone.` };
  }
  const key = (a: ResolverAnswer): string => `${a.status}|${a.records.join("\n")}`;
  const agree = answered.length === answers.length ? answered.every((a) => key(a) === key(answered[0]!)) : null;
  const first = answered[0]!;
  const chain = first.cnames.length ? first.cnames : null;
  const via = chain ? ` via ${chain.join(" → ")}` : "";
  const who = answered.length === answers.length ? "both resolvers" : `${first.resolver} only (the other did not answer)`;
  if (agree === false) {
    const sides = answered.map((a) => `${a.resolver}: ${a.status} ${a.records.length ? a.records.join(", ") : "(no records)"}`).join("; ");
    return { ...base, records: first.records, ttl: first.ttl, resolvers_agree: false, cname_chain: chain,
      verdict: "resolvers_disagree", confidence: 0.6,
      reason: `The resolvers disagree on the ${type} records of ${name}: ${sides}. A recent change still propagating is the usual cause.` };
  }
  const confidence = agree ? 1 : 0.8;
  if (first.status === "NXDOMAIN") {
    return { ...base, records: [], ttl: null, resolvers_agree: agree, cname_chain: null, verdict: "nxdomain", confidence,
      reason: `${name} does not exist in DNS: ${who} returned NXDOMAIN.` };
  }
  if (first.status !== "NOERROR") {
    return { ...base, records: null, ttl: null, resolvers_agree: agree, cname_chain: chain, verdict: "unknown", confidence: 0,
      error: "resolver_error", reason: `Unknown: ${who} returned ${first.status} for the ${type} records of ${name}.` };
  }
  if (!first.records.length) {
    return { ...base, records: [], ttl: null, resolvers_agree: agree, cname_chain: chain, verdict: "no_records", confidence,
      reason: `${name} exists but publishes no ${type} record${via}, according to ${who}.` };
  }
  const list = first.records.length <= 6 ? first.records.join(", ") : `${first.records.slice(0, 6).join(", ")} and ${first.records.length - 6} more`;
  return { ...base, records: first.records, ttl: first.ttl, resolvers_agree: agree, cname_chain: chain, verdict: "resolved", confidence,
    reason: `${name} has ${first.records.length} ${type} record${first.records.length === 1 ? "" : "s"}${via}: ${list}. ` +
      `${agree ? "Cloudflare 1.1.1.1 and Google Public DNS return the same set" : `Read from ${who}`}; lowest TTL ${first.ttl} s.` };
}

export async function lookupDns(question: string, nameParam = "", typeParam = ""): Promise<DnsResult> {
  const name = queryName(nameParam, question);
  if (!name) {
    return { name: null, record_type: null, records: null, ttl: null, resolvers_agree: null, resolvers: [], cname_chain: null,
      verdict: "insufficient_input", confidence: 0, error: "no_domain", source: SOURCE,
      reason: "No domain name was supplied, so no DNS record could be looked up. Supply a domain such as example.com and a record type (A, AAAA, CNAME, MX, TXT, NS, SOA or CAA)." };
  }
  const asked = recordType(typeParam, question);
  const type = asked ?? "A";
  const bodies = await Promise.all(RESOLVERS.map((r) => ask(r.url, name, type)));
  const result = compare(name, type, bodies.map((b, i) => readAnswer(RESOLVERS[i]!.name, type, b)));
  return asked ? result : { ...result, reason: `${result.reason} No record type was named, so A records were looked up.` };
}
