/**
 * CVE_LOOKUP's last refusal class: a vulnerability named by PRODUCT and TYPE.
 *
 * `cvesurvey.ts` closed the year and severity questions. Two routed questions
 * remain that this intent plainly exists to answer:
 *
 *   "Will Forgejo fix RCE vulnerability?"
 *   "Will Forgejo patch RCE vulnerability?"
 *
 * Neither carries a CVE identifier and neither is a year survey, so both hit
 * "No CVE identifier was supplied with this request." NVD's `keywordSearch`
 * answers them directly: measured 2026-09-12, "Forgejo remote code execution"
 * returns exactly one record, CVE-2026-89094 at CVSS 9.9 CRITICAL, fixed in
 * Forgejo 16.0.4.
 *
 * THE QUESTION IS A PREDICTION AND THE ANSWER IS NOT. "Will Forgejo fix it" is
 * asked in the future tense; what is documented is that the fix already exists
 * and which release carries it. The answer reports that, and says so as a
 * record rather than as a forecast. Where NVD documents no fixed version, the
 * answer says the vulnerability is documented and no fixed release is recorded —
 * it never predicts one.
 *
 * DELIBERATELY NARROW. A keyword search always returns something, and answering
 * "is Apple's 'Deathray' vulnerability patched" — a routed question about a
 * vulnerability that does not exist — with whatever Apple CVE ranks first would
 * be the confidently-wrong failure. So a class of vulnerability must be NAMED,
 * and a result is only used when it mentions the product asked about.
 */
import { baseScore } from "./cvesurvey";

const NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const TIMEOUT_MS = Number(process.env.CVE_KEYWORD_TIMEOUT_MS ?? 9_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

/** Vulnerability classes worth searching on, with the phrase NVD indexes. */
const CLASSES: Array<[RegExp, string]> = [
  [/\brce\b|\bremote code execution\b/i, "remote code execution"],
  [/\bsql\s*injection\b|\bsqli\b/i, "sql injection"],
  [/\bxss\b|\bcross[- ]site scripting\b/i, "cross-site scripting"],
  [/\bcsrf\b|\bcross[- ]site request forgery\b/i, "cross-site request forgery"],
  [/\bbuffer overflow\b/i, "buffer overflow"],
  [/\bprivilege escalation\b/i, "privilege escalation"],
  [/\bpath traversal\b|\bdirectory traversal\b/i, "path traversal"],
  [/\bdeserialization\b/i, "deserialization"],
  [/\bauthentication bypass\b/i, "authentication bypass"],
  [/\binformation disclosure\b/i, "information disclosure"],
  [/\bdenial[- ]of[- ]service\b|\bdos\b/i, "denial of service"],
];

/** Words that are never the product being asked about. */
const NOT_PRODUCT = new Set([
  "will", "does", "did", "is", "are", "has", "have", "the", "a", "an", "any", "what", "when",
  "fix", "fixes", "fixed", "patch", "patches", "patched", "vulnerability", "vulnerabilities",
  "cve", "cves", "bug", "flaw", "issue", "security", "critical", "high", "severity", "rce",
  "for", "in", "on", "of", "and", "or", "to", "be", "been", "there", "this", "that", "it",
]);

export interface CveKeywordRequest {
  product: string;
  klass: string;
}

/**
 * The product and the vulnerability class, or null when either is absent.
 *
 * The product is taken from capitalised words, which is what a product name
 * looks like in these questions. Requiring BOTH halves is what keeps a bare
 * "any critical vulnerabilities?" out of here.
 */
export function keywordRequest(text: string): CveKeywordRequest | null {
  const s = String(text ?? "");
  if (/\bCVE-\d{4}-\d{4,}\b/i.test(s)) return null; // a real identifier has its own path
  const klass = CLASSES.find(([re]) => re.test(s))?.[1] ?? null;
  if (!klass) return null;
  const candidates = (s.match(/\b[A-Z][A-Za-z0-9.+-]{2,}\b/g) ?? [])
    .filter((w) => !NOT_PRODUCT.has(w.toLowerCase()));
  const product = candidates[0] ?? null;
  return product ? { product, klass } : null;
}

interface Record_ {
  cve?: {
    id?: string;
    published?: string;
    metrics?: Record<string, Array<{ cvssData?: { baseScore?: number } }>>;
    descriptions?: Array<{ lang?: string; value?: string }>;
  };
}

export interface CveKeywordResult {
  cve_id: string | null;
  verdict: "found" | "not_found" | "unknown";
  confidence: number;
  reason: string;
  error?: string;
}

const severityOf = (score: number | null): string =>
  score === null ? "unrated"
    : score >= 9 ? "critical" : score >= 7 ? "high" : score >= 4 ? "medium" : "low";

/** Regex-safe form of a product name taken from a question. */
const quote = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, (m) => `\\${m}`);

/** "Forgejo before 16.0.4 allows …" — the release that carries the fix. */
function fixedIn(description: string, product: string): string | null {
  const re = new RegExp(`${quote(product)}\\s+before\\s+([0-9][0-9A-Za-z.-]*)`, "i");
  return description.match(re)?.[1]?.replace(/[.,]+$/, "") ?? null;
}

export async function lookupByKeyword(req: CveKeywordRequest): Promise<CveKeywordResult> {
  const search = `${req.product} ${req.klass}`;
  let records: Record_[];
  try {
    const url = `${NVD}?keywordSearch=${encodeURIComponent(search)}&resultsPerPage=5`;
    const r = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    records = ((await r.json()) as { vulnerabilities?: Record_[] }).vulnerabilities ?? [];
  } catch {
    return {
      cve_id: null, verdict: "unknown", confidence: 0,
      reason:
        `The National Vulnerability Database could not be read, so no ${req.klass} vulnerability in ` +
        `${req.product} was looked up. That is a source outage rather than an absence of one.`,
      error: "upstream_unavailable",
    };
  }

  // A keyword search always returns something. Only a record that actually
  // names the product is an answer about that product.
  const named = new RegExp(`\\b${quote(req.product)}\\b`, "i");
  const hit = records.find((v) => {
    const text = (v.cve?.descriptions ?? []).find((d) => d.lang === "en")?.value ?? "";
    return named.test(text);
  });
  if (!hit?.cve?.id) {
    return {
      cve_id: null, verdict: "not_found", confidence: 0.6,
      reason:
        `No ${req.klass} vulnerability in ${req.product} is recorded in the National Vulnerability ` +
        `Database. The database answered; it holds no such record, which is not the same as the ` +
        `product being free of undisclosed flaws.`,
    };
  }

  const cve = hit.cve;
  const id = cve.id as string;
  const description = (cve.descriptions ?? []).find((d) => d.lang === "en")?.value ?? "";
  const score = baseScore(cve);
  const rated = score === null
    ? "and carries no CVSS base score in the database"
    : `rated CVSS ${score} ${severityOf(score)}`;
  const fixed = fixedIn(description, req.product);
  // The question is asked in the future tense; the record is in the past.
  const remedy = fixed
    ? ` It is already fixed: the record states ${req.product} before ${fixed} is affected, so ` +
      `${fixed} carries the fix.`
    : ` The database records no fixed release for it, so none is reported here.`;
  const when = cve.published ? ` Published ${cve.published.slice(0, 10)}.` : "";

  return {
    cve_id: id,
    verdict: "found",
    confidence: 0.9,
    reason:
      `The ${req.klass} vulnerability in ${req.product} is ${id}, ${rated}.${remedy}${when} ` +
      `Read from the National Vulnerability Database.`,
  };
}
