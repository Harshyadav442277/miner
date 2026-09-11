/**
 * CVE_LOOKUP, the other half: "which CVEs", not "what is this CVE".
 *
 * The endpoint's own refusal text used to say it "does not search for
 * vulnerabilities by product or by year". That was a deliberate scope decision
 * and the network disagreed with it. Replaying the routed corpus on 2026-09-11
 * against production, six of the thirteen CVE refusals are questions squarely
 * inside this intent:
 *
 *   "CVE"            "CVE 2015"          "Look up for latest CVEs"
 *   "CVEs 2010 high priority"            "Criticial CVE 2025"   "Criticial CVE 2026"
 *
 * A refusal scores in the 1e-11 band where an answer can cross, so refusing a
 * question this intent exists to answer is the most expensive thing the endpoint
 * was doing.
 *
 * TWO CONSTRAINTS SHAPE EVERY DECISION BELOW.
 *
 * 1. **NVD caps a published-date range at 120 days.** A full-year range returns
 *    HTTP 404, verified 2026-09-11. So a year question is answered over the last
 *    120 days of that year and the answer NAMES the window rather than implying
 *    it covered twelve months.
 * 2. **NVD's own severity filter does not filter.** `cvssV3Severity=CRITICAL`
 *    returned records scoring 7.3, which is HIGH, verified the same day. Every
 *    band here is therefore applied to the base score this module parsed itself.
 *    Reporting a "critical" list containing 7.3s would be a confidently wrong
 *    answer of exactly the kind this repo keeps finding.
 */
const NVD = "https://services.nvd.nist.gov/rest/json/cves/2.0";
/**
 * NVD is slow on older windows: a 2010 range took longer than 8 s and answered
 * 'outage' for a period that plainly had vulnerabilities. The route's watchdog is
 * at 11 s and this is its only upstream call, so 9.5 s is the budget that fits.
 */
const TIMEOUT_MS = Number(process.env.CVE_SURVEY_TIMEOUT_MS ?? 9_500);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** CVSS v3 bands, from the specification. */
const BANDS: Record<Severity, [number, number]> = {
  CRITICAL: [9.0, 10.0],
  HIGH: [7.0, 8.9],
  MEDIUM: [4.0, 6.9],
  LOW: [0.1, 3.9],
};

export interface SurveyRequest {
  year: number | null;
  severity: Severity | null;
}

export interface SurveyExample {
  id: string;
  score: number | null;
  published: string;
}

export interface SurveyResult {
  cve_id: null;
  year: number | null;
  severity: Severity | null;
  window: string | null;
  count: number | null;
  examples: SurveyExample[];
  verdict: string;
  confidence: number;
  reason: string;
  error?: string;
}

/**
 * Is this a "which CVEs" question rather than a "what is this CVE" one?
 *
 * Requires the subject word, so an unrelated sentence that happens to carry a
 * year cannot capture the route. "Criticial" is in the pattern because it is
 * what two real routed questions actually say; matching only the correct
 * spelling would leave the commonest phrasing refused, which is the G94 lesson.
 */
export function surveyRequest(text: string, now = new Date()): SurveyRequest | null {
  const s = String(text ?? "");
  if (!/\bcves?\b|\bvulnerabilit/i.test(s)) return null;
  // A complete identifier is a lookup, not a survey. The route only reaches here
  // when no id was found, but a parser that claims "CVE-2021-44228" is a request
  // for the CVEs of 2021 is one refactor away from answering the wrong question.
  if (/\bCVE-\d{4}-\d{4,}\b/i.test(s)) return null;

  const thisYear = now.getUTCFullYear();
  const yearMatch = s.match(/\b(19\d{2}|20\d{2})\b/);
  const parsed = yearMatch ? Number(yearMatch[1]) : null;
  const year = parsed !== null && parsed >= 1999 && parsed <= thisYear ? parsed : null;

  let severity: Severity | null = null;
  if (/\bcritic\w*\b/i.test(s)) severity = "CRITICAL";
  else if (/\bhigh\b/i.test(s)) severity = "HIGH";
  else if (/\bmedium\b|\bmoderate\b/i.test(s)) severity = "MEDIUM";
  else if (/\blow\b/i.test(s)) severity = "LOW";

  const recent = /\blatest\b|\brecent\b|\bnewest\b|\bthis (?:week|month)\b/i.test(s);
  // A bare "CVE" with no id is a request for the current picture, which is the
  // only reading that makes it a question at all.
  const bare = /^\s*cves?\s*$/i.test(s.trim());

  if (year === null && severity === null && !recent && !bare) return null;
  return { year, severity };
}

const iso = (d: Date): string => `${d.toISOString().slice(0, 19)}.000`;

/**
 * The window to read, always 120 days or fewer.
 *
 * A year question reads that year's last 120 days; anything else reads the 120
 * days ending now. Both are stated in the answer.
 */
export function windowFor(year: number | null, now = new Date()): { start: Date; end: Date } {
  if (year === null) {
    const end = now;
    return { start: new Date(end.getTime() - 119 * 86_400_000), end };
  }
  const end = new Date(Date.UTC(year, 11, 31, 0, 0, 0));
  const capped = end.getTime() > now.getTime() ? now : end;
  return { start: new Date(capped.getTime() - 119 * 86_400_000), end: capped };
}

const human = (d: Date): string =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

interface NvdRecord {
  cve?: {
    id?: string;
    published?: string;
    metrics?: Record<string, Array<{ cvssData?: { baseScore?: number } }>>;
  };
}

/** The highest base score any metric version records for a vulnerability. */
export function baseScore(cve: NvdRecord["cve"]): number | null {
  const scores: number[] = [];
  for (const list of Object.values(cve?.metrics ?? {})) {
    for (const m of list ?? []) {
      const v = m?.cvssData?.baseScore;
      if (typeof v === "number" && Number.isFinite(v)) scores.push(v);
    }
  }
  return scores.length ? Math.max(...scores) : null;
}

export function inBand(score: number | null, severity: Severity | null): boolean {
  if (severity === null) return true;
  if (score === null) return false;
  const [lo, hi] = BANDS[severity];
  return score >= lo && score <= hi;
}

export async function surveyCves(req: SurveyRequest, now = new Date()): Promise<SurveyResult> {
  const { start, end } = windowFor(req.year, now);
  const label = `${human(start)} and ${human(end)}`;
  const empty = {
    cve_id: null as null, year: req.year, severity: req.severity,
    window: label, count: null, examples: [] as SurveyExample[],
  };

  let body: { vulnerabilities?: NvdRecord[]; totalResults?: number };
  try {
    const url =
      `${NVD}?pubStartDate=${encodeURIComponent(iso(start))}&pubEndDate=${encodeURIComponent(iso(end))}` +
      `&resultsPerPage=100`;
    const r = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    body = (await r.json()) as typeof body;
  } catch {
    return {
      ...empty, verdict: "unknown", confidence: 0,
      reason:
        `The National Vulnerability Database did not answer, so no list of vulnerabilities for ` +
        `${label} could be read. That is an index outage rather than a period with no ` +
        `vulnerabilities, and the two are not the same thing.`,
      error: "upstream_unavailable",
    };
  }

  const all = (body.vulnerabilities ?? []).map((v) => ({
    id: v.cve?.id ?? "",
    score: baseScore(v.cve),
    published: String(v.cve?.published ?? "").slice(0, 10),
  })).filter((x) => x.id);

  const matching = all.filter((x) => inBand(x.score, req.severity)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const band = req.severity ? `${req.severity.toLowerCase()}-severity ` : "";

  if (matching.length === 0) {
    return {
      ...empty, count: 0,
      verdict: "no_matches", confidence: 0.7,
      reason:
        `No ${band}vulnerability was found in the page of records the National Vulnerability ` +
        `Database returned for ${label}. The index answered; this is what it holds for that ` +
        `window, read across ${all.length} records rather than inferred.`,
    };
  }

  const top = matching.slice(0, 3);
  const named = top.map((x) => `${x.id}${x.score === null ? "" : ` at CVSS ${x.score.toFixed(1)}`}`).join(", ");
  /**
   * `totalResults` counts the whole window before our own severity filter, so
   * it is reported as the window total and never as the band total. Saying "262
   * critical CVEs" when 262 is every CVE published would be a wrong number
   * dressed as a precise one.
   */
  const total = typeof body.totalResults === "number" ? body.totalResults : all.length;

  /**
   * Two different sentences, because two different things are known.
   *
   * With a severity asked for, the band count is a real finding about the page
   * read. Without one, `matching.length` is just the page size, and reporting it
   * as though it were a count would be a number that means nothing.
   */
  const finding = req.severity
    ? `of which ${matching.length} of the ${all.length} records read are ${band}rated`
    : `read across the ${all.length} most recent of them`;

  return {
    cve_id: null, year: req.year, severity: req.severity, window: label,
    count: req.severity ? matching.length : null, examples: top,
    verdict: "cve_survey", confidence: 0.9,
    reason:
      `The National Vulnerability Database published ${total} vulnerabilities between ${label}, ` +
      `${finding}. The highest-scored are ${named}. Scores are the CVSS base scores in each ` +
      `record, not the database's severity flag.`,
  };
}
