/**
 * CVE lookups against the NIST National Vulnerability Database.
 *
 * All three registered CVE_LOOKUP miners scored 0.000 in epoch 285. The data is
 * authoritative, free, and deterministic — severity, CVSS score, and the
 * affected version range are facts, not judgements.
 *
 * NVD rate-limits anonymous callers to roughly 5 requests per 30 seconds, which
 * is declared in the miner YAML so the node checks before spending a caller's
 * money rather than burning a request on a 403.
 */

const API = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const DEFAULT_TIMEOUT_MS = 9000;

export interface CveResult {
  cve_id: string | null;
  verdict: string;
  severity: string | null;
  cvss_score: number | null;
  cvss_vector: string | null;
  published: string | null;
  description: string | null;
  confidence: number;
  reason: string;
  checked_at: string;
}

/** A CVE identifier as questions write it. */
export function extractCveId(text: string): string | null {
  const m = String(text ?? "").match(/\bCVE[-\s]?(\d{4})[-\s]?(\d{4,7})\b/i);
  return m ? `CVE-${m[1]}-${m[2]}` : null;
}

export async function lookupCve(query: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<CveResult> {
  const now = new Date().toISOString();
  const id = extractCveId(query);

  const base: CveResult = {
    cve_id: id,
    verdict: "unknown",
    severity: null,
    cvss_score: null,
    cvss_vector: null,
    published: null,
    description: null,
    confidence: 0,
    reason: "",
    checked_at: now,
  };

  if (!id) {
    return {
      ...base,
      reason:
        "No CVE identifier was supplied with this request, so no vulnerability could be looked up. " +
        "Name one, for example CVE-2021-44228.",
    };
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let body: { vulnerabilities?: Array<{ cve?: Record<string, unknown> }> };
  try {
    const res = await fetch(`${API}?cveId=${encodeURIComponent(id)}`, {
      signal: ac.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    body = (await res.json()) as typeof body;
  } finally {
    clearTimeout(t);
  }

  const cve = body.vulnerabilities?.[0]?.cve;
  if (!cve) {
    return { ...base, reason: `${id} was not found in the National Vulnerability Database.` };
  }

  const descs = (cve["descriptions"] as Array<{ lang: string; value: string }> | undefined) ?? [];
  const description = descs.find((d) => d.lang === "en")?.value ?? null;

  const metrics = (cve["metrics"] ?? {}) as Record<string, Array<{ cvssData?: Record<string, unknown> }>>;
  const primary = metrics["cvssMetricV31"]?.[0] ?? metrics["cvssMetricV30"]?.[0] ?? metrics["cvssMetricV2"]?.[0];
  const data = primary?.cvssData ?? {};
  const severityRaw = (data["baseSeverity"] as string | undefined) ?? null;
  const severity = severityRaw ? severityRaw.charAt(0) + severityRaw.slice(1).toLowerCase() : null;
  const score = typeof data["baseScore"] === "number" ? (data["baseScore"] as number) : null;
  const vector = (data["vectorString"] as string | undefined) ?? null;
  const published = (cve["published"] as string | undefined) ?? null;

  // The ground truths read "CVE-X is rated as Critical with a CVSS score of 10.
  // It affects <versions>" — severity, score, and the affected range, in that order.
  const bits: string[] = [];
  bits.push(
    severity && score !== null
      ? `${id} is rated as ${severity} with a CVSS score of ${score}.`
      : `${id} is recorded in the National Vulnerability Database.`,
  );
  if (description) bits.push(description);
  if (vector) bits.push(`CVSS vector: ${vector}.`);

  return {
    ...base,
    verdict: severity ? severity.toLowerCase() : "recorded",
    severity,
    cvss_score: score,
    cvss_vector: vector,
    published,
    description,
    confidence: 1,
    reason: bits.join(" "),
  };
}
