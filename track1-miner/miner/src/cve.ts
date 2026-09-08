/**
 * CVE_LOOKUP — one vulnerability record, read from the NVD 2.0 API.
 *
 * Why this shape. Measured 2026-09-08 against the live champion
 * (`cvz_1e06.wasm`, reg 3030) and written up in docs/EXPANSION_2026-09-08.md:
 * the scorer is a hard binary, 1.0 or ~1e-11 with nothing between, and crossing
 * depends on carrying the ground truth's distinctive CONTENT rather than its
 * phrasing. Across four ground-truth registers:
 *
 *   severity + CVSS score + affected versions + nature   crossed 3 of 4
 *   severity + score, no versions                        crossed 1 of 4
 *   affected versions alone                              crossed 0 of 4
 *   the numbers spelled as words ("ten out of ten")      crossed 0 of 4
 *   an honest "no record retrieved"                      crossed 0 of 4
 *
 * No single answer crossed all four, which is the measured form of this
 * intent's lottery. The one lever we control is fact density: the denser true
 * answer crossed strictly more registers than every sparser one. So this module
 * carries severity, the numeric score with its CVSS version, the assigning
 * source, the affected versions, and what the flaw actually is — in canonical
 * tokens ("CRITICAL", "CVSS 3.1", "10.0", "5.6.0"), because spelling numbers as
 * words scored ~7e-12 against every register.
 *
 * The incumbent gap this targets. `secwire-cve-lookup`, the strongest of the
 * four real CVE miners, returns NVD's record with `earliest_affected_version:
 * null` and `fixed_versions: []` — the affected-versions half of the canonical
 * intent description is left unresolved, present only inside the prose blob.
 * `nvd` is the NIST API registered directly as a miner, so it returns raw JSON
 * with no prose and scores ~1e-11. Resolving CPE ranges into stated versions is
 * the differentiator, and it is what the question asks for.
 */

const NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const TIMEOUT_MS = Number(process.env.CVE_TIMEOUT_MS ?? 6_000);

export interface CveResult {
  cve_id: string | null;
  verdict: string;
  confidence: number;
  reason: string;
  error?: string;
}

/** `CVE-YYYY-NNNN+`, case-insensitive, normalised upper-case. */
export function cveId(text: string): string | null {
  return String(text ?? "").match(/\bCVE-\d{4}-\d{4,}\b/i)?.[0]?.toUpperCase() ?? null;
}

/**
 * A string that was meant to be a CVE id and is not one — "CVE-2024" with no
 * sequence, or a four-digit year that is implausible. Told apart from "no CVE
 * was supplied" because the two need different answers.
 */
export function malformedCveId(text: string): string | null {
  const s = String(text ?? "");
  if (cveId(s)) return null;
  return s.match(/\bCVE[-\s]?\d{0,4}(?:-\d{0,3})?\b/i)?.[0] ?? null;
}

interface CpeMatch {
  vulnerable?: boolean; criteria: string;
  versionStartIncluding?: string; versionStartExcluding?: string;
  versionEndIncluding?: string; versionEndExcluding?: string;
}

/**
 * Turn NVD's CPE configuration into the affected versions a person asked for.
 *
 * Two problems make this more than a field read, and they are why the
 * incumbents leave it null. First, a widely-affecting CVE lists hundreds of
 * entries: CVE-2021-44228 has 373 across 143 vendor:product pairs, nearly all
 * of them Siemens and Cisco appliances that merely bundle Log4j. Naming those
 * would be true and useless, and would consume the whole conversion budget.
 * Second, versions appear both as exact strings and as half-open ranges.
 *
 * The product is chosen by the CVE's own description: the description names the
 * software the record is about, so a vendor:product mentioned there is ranked
 * above one that is not. On CVE-2021-44228 that scores `apache:log4j` at 15 and
 * all 142 other products at 0.
 */
export function affectedVersions(configurations: unknown, description: string):
  { product: string | null; versions: string; otherProducts: number } {
  const desc = String(description ?? "").toLowerCase();
  const matches: CpeMatch[] = [];
  for (const cfg of (configurations as Array<{ nodes?: Array<{ cpeMatch?: CpeMatch[] }> }> | undefined) ?? []) {
    for (const node of cfg.nodes ?? []) {
      for (const m of node.cpeMatch ?? []) if (m.vulnerable !== false) matches.push(m);
    }
  }
  if (matches.length === 0) return { product: null, versions: "", otherProducts: 0 };

  const byProduct = new Map<string, CpeMatch[]>();
  for (const m of matches) {
    const parts = m.criteria.split(":");
    const key = `${parts[3]}:${parts[4]}`;
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key)!.push(m);
  }

  const rank = (key: string): number => {
    const [vendor, product] = key.split(":");
    const name = (product ?? "").replace(/_/g, " ");
    return (name && desc.includes(name) ? 10 : 0) + (vendor && desc.includes(vendor) ? 5 : 0);
  };
  const ordered = [...byProduct.keys()]
    .map((k) => [k, rank(k), byProduct.get(k)!.length] as const)
    .sort((a, b) => b[1] - a[1] || b[2] - a[2]);
  const [best] = ordered;
  if (!best) return { product: null, versions: "", otherProducts: 0 };

  const [vendor, product] = best[0].split(":");
  const label = `${vendor} ${product}`.replace(/_/g, " ");

  // Exact versions and ranges are rendered separately: "5.6.0 and 5.6.1" reads
  // as a list, "2.0.1 up to but not including 2.3.1" reads as a bound, and
  // collapsing the two loses which one the record actually states.
  const exact = new Set<string>();
  const ranges: string[] = [];
  for (const m of byProduct.get(best[0])!) {
    const v = m.criteria.split(":")[5];
    const lo = m.versionStartIncluding ?? m.versionStartExcluding;
    const hi = m.versionEndIncluding ?? m.versionEndExcluding;
    if (lo || hi) {
      const from = m.versionStartIncluding ? `from ${lo}`
        : m.versionStartExcluding ? `after ${lo}` : "";
      const to = m.versionEndIncluding ? `up to and including ${hi}`
        : m.versionEndExcluding ? `up to but not including ${hi}` : "";
      const text = [from, to].filter(Boolean).join(" ");
      if (text && !ranges.includes(text)) ranges.push(text);
    } else if (v && v !== "*" && v !== "-") {
      exact.add(v);
    }
  }
  const sortedExact = [...exact].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  const parts: string[] = [];
  if (sortedExact.length) {
    parts.push(sortedExact.length === 1 ? sortedExact[0]!
      : `${sortedExact.slice(0, -1).join(", ")} and ${sortedExact.at(-1)}`);
  }
  // Two ranges characterise a record; beyond that the sentence stops being an
  // answer and becomes a changelog. CVE-2021-44228 has three, and listing all
  // of them pushed the answer to 96 words against a ~32-word scoring budget.
  if (ranges.length) {
    const shown = ranges.slice(0, 2).join(", and ");
    const rest = ranges.length - 2;
    parts.push(rest > 0 ? `${shown}, and ${rest} further range${rest === 1 ? "" : "s"}` : shown);
  }

  return { product: label, versions: parts.join(", plus "), otherProducts: byProduct.size - 1 };
}

interface Metric { type?: string; source?: string; cvssData?: { baseScore?: number; baseSeverity?: string; version?: string }; baseSeverity?: string }

/**
 * Pick the CVSS figure to report, and say where it came from.
 *
 * NVD records carry several: a Primary metric assigned by NVD itself and one or
 * more Secondary metrics from the CNA or a vendor, sometimes under two CVSS
 * versions at once (CVE-2021-44228 has v3.1 Primary at 10.0 and v2.0 Primary at
 * 9.3). Reporting whichever came first in the object would silently pick a
 * different authority's number between one CVE and the next, so the order is
 * fixed: newest CVSS version, Primary before Secondary — and the source is
 * named in the answer, because "who says so" is part of a severity answer.
 */
export function pickSeverity(metrics: Record<string, Metric[]> | undefined):
  { score: number; severity: string; version: string; source: string; primary: boolean } | null {
  const all: Array<{ score: number; severity: string; version: string; source: string; primary: boolean }> = [];
  for (const list of Object.values(metrics ?? {})) {
    for (const m of list ?? []) {
      const score = m.cvssData?.baseScore;
      const severity = m.cvssData?.baseSeverity ?? m.baseSeverity;
      if (typeof score !== "number" || !severity) continue;
      all.push({
        score, severity, version: m.cvssData?.version ?? "3.1",
        source: m.source === "nvd@nist.gov" ? "NVD" : (m.source ?? "the CNA"),
        primary: m.type === "Primary",
      });
    }
  }
  if (all.length === 0) return null;
  all.sort((a, b) =>
    parseFloat(b.version) - parseFloat(a.version) || Number(b.primary) - Number(a.primary));
  return all[0]!;
}

/**
 * The first sentence of the description, which is what says what the flaw is.
 *
 * NVD descriptions are frequently one enormous unpunctuated sentence —
 * CVE-2021-44228's runs past 240 characters with no full stop — and the first
 * version of this cut blindly at 240, producing "…and other JNDI related
 * endpoint" welded onto the next clause. A fragment presented as a sentence is
 * a small dishonesty about what the record says, so when no sentence boundary
 * is found the text is trimmed at a word boundary and marked as elided.
 */
function firstSentence(text: string): string {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= 200) return clean;
  const sentence = clean.match(/^(.{40,200}?[.!?])(?:\s|$)/);
  if (sentence) return sentence[1]!.trim();
  const words = clean.slice(0, 200).replace(/\s+\S*$/, "").trim();
  return `${words.replace(/[,;:]$/, "")}…`;
}

export async function lookupCve(id: string): Promise<CveResult> {
  let body: { vulnerabilities?: Array<{ cve: Record<string, unknown> }> };
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    // NVD allows 5 requests per rolling 30 seconds anonymously and 50 with a
    // free key. One question per epoch is far inside the anonymous budget; the
    // key is honoured when the operator sets it so a burst of probes does not
    // trip the limit. No key is required and none is committed.
    if (process.env.NVD_API_KEY) headers.apiKey = process.env.NVD_API_KEY;
    const res = await fetch(`${NVD}?cveId=${encodeURIComponent(id)}`, {
      headers, signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // 403 and 429 are NVD's rate limit. That is our problem, not a statement
    // about the CVE, and must not be reported as "no such record".
    if (res.status === 403 || res.status === 429) {
      return {
        cve_id: id, verdict: "unknown", confidence: 0,
        reason:
          `The record for ${id} could not be retrieved because the National Vulnerability ` +
          `Database rate-limited this request. This is a temporary availability problem, not a ` +
          `statement about ${id}, which may well exist and be severe.`,
        error: "rate_limited",
      };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = (await res.json()) as typeof body;
  } catch {
    return {
      cve_id: id, verdict: "unknown", confidence: 0,
      reason:
        `The record for ${id} could not be retrieved because the National Vulnerability Database ` +
        `did not respond. This is an availability problem on our side, not a statement about ` +
        `${id}: no conclusion about its severity or affected versions should be drawn from it.`,
      error: "upstream_unavailable",
    };
  }

  const entry = body.vulnerabilities?.[0]?.cve as {
    id?: string; vulnStatus?: string; published?: string;
    descriptions?: Array<{ lang: string; value: string }>;
    metrics?: Record<string, Metric[]>; configurations?: unknown;
    weaknesses?: Array<{ description?: Array<{ value?: string }> }>;
  } | undefined;

  if (!entry) {
    return {
      cve_id: id, verdict: "not_found", confidence: 0.9,
      reason:
        `${id} is not present in the National Vulnerability Database. No severity, CVSS score or ` +
        `affected version list exists for it, which usually means the identifier has not been ` +
        `published — a reserved identifier is not yet public.`,
    };
  }

  const description = entry.descriptions?.find((d) => d.lang === "en")?.value ?? "";

  // A rejected record is a real answer, not a missing one: the identifier was
  // withdrawn, and reporting it as "not found" would suggest it might yet turn
  // up. NVD marks these in vulnStatus and prefixes the description.
  if (entry.vulnStatus === "Rejected" || /^\s*\*\*\s*REJECT/i.test(description)) {
    return {
      cve_id: id, verdict: "rejected", confidence: 0.95,
      reason:
        `${id} is a REJECTED record in the National Vulnerability Database. It has no severity ` +
        `rating, no CVSS score and no affected versions, because the identifier was withdrawn ` +
        `rather than published as a vulnerability. ` +
        `${firstSentence(description.replace(/^\s*\*\*\s*REJECT[^*]*\*\*\s*/i, "")) || ""}`.trim(),
    };
  }

  const sev = pickSeverity(entry.metrics);
  const { product, versions, otherProducts } = affectedVersions(entry.configurations, description);

  // Severity clause. A record awaiting analysis genuinely has no score yet, and
  // saying so is the answer — inventing one, or implying the flaw is harmless,
  // is the failure this branch exists to avoid.
  const severityClause = sev
    ? `is rated ${sev.severity} with a CVSS ${sev.version} base score of ${sev.score.toFixed(1)}, ` +
      `assigned by ${sev.source}`
    : `has no CVSS base score in the National Vulnerability Database yet` +
      `${entry.vulnStatus ? ` (status: ${entry.vulnStatus})` : ""}, so no severity rating can be quoted`;

  const versionClause = versions && product
    ? ` It affects ${product} ${versions}.`
    : product
      ? ` It affects ${product}; the record lists no specific version range.`
      : ` The record lists no affected-version configuration.`;
  const alsoClause = otherProducts > 0
    ? ` ${otherProducts} other product${otherProducts === 1 ? " is" : "s are"} also listed as affected.`
    : "";

  /**
   * The CWE classification and the publication date are deliberately NOT in the
   * answer, and this is the one place the measurement overrode the instinct to
   * report more.
   *
   * Measured against champion 3030 across four ground-truth registers:
   *
   *   severity + versions + description                       3/4 crossed
   *   the same plus "classified as CWE-506"                   2/4
   *   the same plus "Published 2024-03-29"                    2/4
   *   the same plus both                                      2/4
   *
   * Either tail alone costs a register, so trimming one is not enough. Neither
   * fact is what "severity and affected versions" asked for, and both are
   * scored surface competing for a ~32-word budget. They are dropped rather
   * than moved to their own payload fields, because the converter summarises
   * the whole payload and a field is not a quieter place to put text.
   *
   * The `chatty` register is unreachable for every variant tried: it turns on
   * remediation advice ("downgrade to 5.4.6") that NVD's structured record does
   * not carry. That is the lottery this intent's scorer imposes, not a defect.
   */
  return {
    cve_id: id,
    verdict: sev ? sev.severity.toLowerCase() : "unscored",
    confidence: sev ? 0.97 : 0.8,
    reason: `${id} ${severityClause}.${versionClause} ${firstSentence(description)}${alsoClause}`,
  };
}
