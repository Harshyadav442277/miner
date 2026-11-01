/**
 * URL_SAFE: is this URL or domain listed as malicious, and by which sources?
 *
 * The same reads as URL_SCAN (urlscan.ts), answered as a listing rather than a
 * single click-or-not verdict: every source is named with what it said, so an
 * app can apply its own policy. Two sources, both keyless: Cloudflare's
 * security resolver and Quad9's threat-blocking resolver (DNS blocklists fed by
 * their threat intelligence). URLhaus (abuse.ch) was a third until it retired its
 * free downloads on or before 2026-10-25 (G210); its API needs a key.
 */
import { scanUrl, type UrlScanResult } from "./urlscan";

export interface SourceResult {
  source: string;
  kind: "DNS blocklist";
  result: "listed" | "not_listed" | "unknown" | "unavailable" | "not_applicable";
  detail?: string;
}

export interface UrlSafeResult extends UrlScanResult {
  listed?: boolean | null;
  sources?: SourceResult[];
}

/** The scan, restated as which sources list it. Pure. */
export function listing(r: UrlScanResult): UrlSafeResult {
  if (!r.checks || !r.url) return r;
  const c = r.checks;
  const dns = (v: string): SourceResult["result"] =>
    v === "blocked" ? "listed" : v === "passed" ? "not_listed" : v === "ambiguous" ? "unknown" : (v as SourceResult["result"]);
  const sources: SourceResult[] = [
    { source: "Cloudflare security DNS", kind: "DNS blocklist", result: dns(c.cloudflare_filter) },
    { source: "Quad9 threat-blocking DNS", kind: "DNS blocklist", result: dns(c.quad9_filter) },
  ];
  const listedBy = sources.filter((s) => s.result === "listed");
  const clear = sources.filter((s) => s.result === "not_listed");
  const silent = sources.filter((s) => s.result === "unavailable" || s.result === "unknown");
  const host = new URL(r.url).hostname;
  const names = (xs: SourceResult[]): string => xs.map((s) => `${s.source}${s.detail ? ` (${s.detail})` : ""}`).join(", ");
  const markers = c.lookalike_markers.length ? ` Lookalike markers: ${c.lookalike_markers.join("; ")}.` : "";
  const gap = silent.length ? ` ${names(silent)} did not give a clear answer.` : "";
  if (listedBy.length) {
    return { ...r, verdict: "unsafe", confidence: 0.95, listed: true, sources,
      reason: `Listed: ${host} is flagged as malicious by ${listedBy.length} of ${sources.length} threat sources checked: ${names(listedBy)}.` +
        `${clear.length ? ` ${names(clear)} did not flag it.` : ""}${gap}${markers}` };
  }
  if (!clear.length) {
    return { ...r, verdict: "unknown", confidence: 0, listed: null, sources, error: r.error ?? "upstream_unavailable",
      reason: `Unknown: no threat source answered for ${host}, so whether it is listed could not be checked. This is an outage, not a clean result.` };
  }
  return { ...r, listed: silent.length ? null : false, sources,
    confidence: silent.length ? 0.5 : r.confidence,
    reason: `Not listed: ${host} is on none of the ${clear.length} threat sources that answered: ${names(clear)}.${gap}${markers}` +
      " A clean listing cannot prove a site safe; a new phishing page is often not yet on any list." };
}

export async function urlReputation(question: string, urlParam = ""): Promise<UrlSafeResult> {
  return listing(await scanUrl(urlParam.trim() ? `${urlParam.trim().slice(0, 2_000)} ${question}` : question));
}
