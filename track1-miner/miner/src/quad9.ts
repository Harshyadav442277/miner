/**
 * Quad9's threat-blocking resolver as a third URL threat source, beside
 * Cloudflare's security resolver and the URLhaus lists (urlscan.ts).
 *
 * Quad9 answers NXDOMAIN for a domain its threat intelligence blocks, while its
 * unfiltered resolver (dns10) still resolves it: all twelve live URLhaus hosts
 * sampled on 2026-10-14 showed exactly that, and example.com resolved on both.
 * Its DNS-over-HTTPS endpoint speaks only the binary wire format over HTTP/2
 * (HTTP/1.1 is refused with 505, and the JSON port 5053 timed out from here),
 * hence node:http2 and a hand-built query rather than fetch.
 */
import { connect } from "node:http2";

const TIMEOUT_MS = Number(process.env.QUAD9_TIMEOUT_MS ?? 3_000);
export const QUAD9_FILTERED = "https://dns.quad9.net";
export const QUAD9_UNFILTERED = "https://dns10.quad9.net";

/** An A query for `name` in DNS wire format, base64url, for the ?dns= parameter. */
export function dnsQuery(name: string): string | null {
  const labels = name.replace(/\.$/, "").split(".");
  if (!labels.length || labels.some((l) => !l || l.length > 63 || !/^[a-z0-9_-]+$/i.test(l)) || name.length > 253) return null;
  const parts = [Buffer.from([0, 0, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0])];
  for (const l of labels) parts.push(Buffer.from([l.length]), Buffer.from(l, "ascii"));
  parts.push(Buffer.from([0, 0, 1, 0, 1]));
  return Buffer.concat(parts).toString("base64url");
}

/** The response code and answer count from a DNS wire header. Pure. */
export function dnsHeader(buf: Buffer): { rcode: number; answers: number } | null {
  return buf.length >= 12 ? { rcode: buf[3]! & 0x0f, answers: buf.readUInt16BE(6) } : null;
}

function ask(origin: string, query: string): Promise<{ rcode: number; answers: number } | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: { rcode: number; answers: number } | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      session.destroy();
      resolve(v);
    };
    const session = connect(origin);
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);
    session.on("error", () => finish(null));
    const req = session.request({ ":path": `/dns-query?dns=${query}`, accept: "application/dns-message" });
    const chunks: Buffer[] = [];
    let ok = false;
    req.on("response", (h) => { ok = h[":status"] === 200; });
    req.on("data", (d: Buffer) => chunks.push(d));
    req.on("end", () => finish(ok ? dnsHeader(Buffer.concat(chunks)) : null));
    req.on("error", () => finish(null));
    req.end();
  });
}

/** blocked: filtered NXDOMAIN while unfiltered resolves. Anything less certain is not a block. */
export async function quad9Verdict(host: string): Promise<"blocked" | "passed" | "unavailable"> {
  const query = dnsQuery(host);
  if (!query) return "unavailable";
  const [filtered, open] = await Promise.all([ask(QUAD9_FILTERED, query), ask(QUAD9_UNFILTERED, query)]);
  if (!filtered || !open) return "unavailable";
  if (filtered.rcode === 3 && open.rcode === 0 && open.answers > 0) return "blocked";
  return "passed";
}
