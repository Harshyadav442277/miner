/**
 * VULNERABILITY_TRIAGE — rank a supplied set of CVEs by what to fix first.
 *
 * The canonical description (devnode /engine/v1/intents, 2026-10-26): the query
 * "supplies a set of already-detected vulnerabilities or CVEs and asks how to rank
 * or prioritise them, by CVSS, known exploitation in the wild, and how critical
 * the affected asset is". The site's row calls it Hybrid: "CVE lookup is a fact;
 * priority ordering is judgment". So every fact is read from a named public
 * source, and the ordering rule is stated in the answer (`method`) so a caller
 * can disagree with it.
 *
 * Facts, per CVE, all keyless:
 * - CVSS: the CVE Program record (cveawg.mitre.org), the CNA's score first and
 *   CISA's ADP score when the CNA gave none. NVD is not used: it allows five
 *   anonymous requests per thirty seconds, which one ten-CVE question exceeds.
 * - Known exploited: CISA's KEV catalog, read whole and kept six hours; the
 *   record's own CISA-ADP KEV flag when the catalog cannot be read.
 * - Exploitation status: CISA's SSVC decision points in the same record.
 * - EPSS: FIRST's exploit-probability score, one batched request. FIRST asks for
 *   attribution in products; the answer names it.
 *
 * Findings without a CVE id cannot be ranked from public data and are refused.
 */

const RECORD_TIMEOUT_MS = Number(process.env.CVE_RECORD_TIMEOUT_MS ?? 3_000);
const KEV_TIMEOUT_MS = Number(process.env.KEV_TIMEOUT_MS ?? 2_500);
const KEV_TTL_MS = 6 * 3600_000;
const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const MAX_CVES = 25;

export type Priority = "act_now" | "high" | "medium" | "low" | "unknown";
export type Criticality = "high" | "low" | "unspecified";

export interface Facts {
  cve_id: string;
  cvss_score: number | null;
  cvss_version: string | null;
  severity: string | null;
  scored_by: string | null;
  epss: number | null;
  epss_percentile: number | null;
  kev: boolean | null;
  kev_date_added: string | null;
  known_ransomware_use: boolean | null;
  exploitation: string | null;
  automatable: boolean | null;
  summary: string | null;
  found: boolean;
}

export interface Ranked extends Facts { rank: number; priority: Priority; why: string }

export interface TriageResult {
  ranked: Ranked[] | null;
  asset_criticality: Criticality;
  method: string;
  sources: string[];
  verdict: "ranked" | "insufficient_input" | "unknown";
  confidence: number;
  reason: string;
  error?: string;
}

/** Every distinct CVE id in the text, in order of first mention. Pure. */
export function cveIds(text: string): string[] {
  return [...new Set((String(text ?? "").match(/\bCVE-\d{4}-\d{4,}\b/gi) ?? []).map((s) => s.toUpperCase()))];
}

/** How critical the asset is, from the parameter or the question's words. Pure. */
export function criticality(param: string, question: string): Criticality {
  const p = String(param ?? "").trim().toLowerCase();
  if (/^(?:high|critical)$/.test(p)) return "high";
  if (/^low$/.test(p)) return "low";
  const q = String(question ?? "");
  if (/internet[- ]facing|public[- ]facing|externally exposed|\bproduction\b|\bprod\b|payments?\b|customer data|\bPII\b|crown[- ]jewel|domain controller|business[- ]critical/i.test(q)) return "high";
  if (/internal[- ]only|\bdev(?:elopment)? (?:box|server|environment)|\btest (?:server|environment)|\bstaging\b|\bsandbox\b|\blab\b|air[- ]gapped|\bisolated\b/i.test(q)) return "low";
  return "unspecified";
}

interface Metric { baseScore?: number; baseSeverity?: string; version?: string }
interface Container {
  descriptions?: Array<{ lang?: string; value?: string }>;
  metrics?: Array<Record<string, unknown>>;
  providerMetadata?: { shortName?: string };
}
export interface CveRecord {
  cveMetadata?: { cveId?: string; state?: string; assignerShortName?: string };
  containers?: { cna?: Container; adp?: Container[] };
}

function bestMetric(c: Container | undefined): Metric | null {
  const all = (c?.metrics ?? []).flatMap((m) => [m.cvssV4_0, m.cvssV3_1, m.cvssV3_0, m.cvssV2_0] as Array<Metric | undefined>)
    .filter((m): m is Metric => !!m && typeof m.baseScore === "number" && m.baseScore >= 0 && m.baseScore <= 10);
  return all.sort((a, b) => Number(b.version) - Number(a.version))[0] ?? null;
}

/** The facts one CVE Program record holds. Pure. */
export function recordFacts(id: string, record: CveRecord | null): Facts {
  const none: Facts = { cve_id: id, cvss_score: null, cvss_version: null, severity: null, scored_by: null, epss: null,
    epss_percentile: null, kev: null, kev_date_added: null, known_ransomware_use: null, exploitation: null,
    automatable: null, summary: null, found: false };
  const cna = record?.containers?.cna;
  if (record?.cveMetadata?.cveId !== id || record.cveMetadata.state !== "PUBLISHED" || !cna) return none;
  const cisa = (record.containers?.adp ?? []).find((a) => a.providerMetadata?.shortName === "CISA-ADP");
  const own = bestMetric(cna);
  const metric = own ?? bestMetric(cisa);
  const other = (cisa?.metrics ?? []).map((m) => m.other as { type?: string; content?: Record<string, unknown> } | undefined);
  const ssvc = other.find((o) => o?.type === "ssvc")?.content?.options as Array<Record<string, string>> | undefined;
  const opt = (k: string): string | null => ssvc?.find((o) => k in o)?.[k] ?? null;
  const kev = other.find((o) => o?.type === "kev")?.content as { dateAdded?: string } | undefined;
  const text = cna.descriptions?.find((d) => d.lang?.startsWith("en"))?.value?.replace(/\s+/g, " ").trim() ?? null;
  return { ...none, found: true,
    cvss_score: metric?.baseScore ?? null, cvss_version: metric?.version ?? null,
    severity: metric?.baseSeverity?.toUpperCase() ?? null,
    scored_by: metric ? (own ? record.cveMetadata.assignerShortName ?? "the CNA" : "CISA-ADP") : null,
    exploitation: opt("Exploitation"), automatable: opt("Automatable") === null ? null : opt("Automatable") === "yes",
    kev: kev ? true : null, kev_date_added: kev?.dateAdded ?? null,
    summary: text && text.length > 200 ? `${text.slice(0, 200).replace(/\s+\S*$/, "")}…` : text };
}

const TIERS: Priority[] = ["act_now", "high", "medium", "low"];

/** One CVE's priority and the reason for it. Pure. */
export function priority(f: Facts, asset: Criticality): { priority: Priority; why: string } {
  if (!f.found) return { priority: "unknown", why: "no published CVE record was found" };
  if (f.kev) return { priority: "act_now", why: `on CISA's Known Exploited Vulnerabilities list${f.kev_date_added ? ` since ${f.kev_date_added}` : ""}` };
  if (f.exploitation === "active") return { priority: "act_now", why: "CISA's SSVC assessment records active exploitation" };
  const score = f.cvss_score ?? -1;
  const epss = f.epss ?? 0;
  let tier: number;
  let why: string;
  if (epss >= 0.1) { tier = 1; why = `EPSS gives a ${(epss * 100).toFixed(1)}% chance of exploitation in the next 30 days`; }
  else if (f.exploitation === "poc" && score >= 7) { tier = 1; why = `public proof-of-concept exploit and CVSS ${score}`; }
  else if (score >= 9 && f.automatable) { tier = 1; why = `CVSS ${score} and exploitation is automatable`; }
  else if (score >= 7) { tier = 2; why = `CVSS ${score}`; }
  else if (epss >= 0.01) { tier = 2; why = `EPSS ${(epss * 100).toFixed(1)}%`; }
  else { tier = 3; why = f.cvss_score === null ? "no CVSS score and low exploit probability" : `CVSS ${score} and low exploit probability`; }
  if (asset === "high" && tier > 1) { tier--; why += ", raised one level for a critical asset"; }
  if (asset === "low" && tier < 3) { tier++; why += ", lowered one level for a non-critical asset"; }
  return { priority: TIERS[tier]!, why };
}

/** The facts, ranked: priority, then EPSS, then CVSS, then id. Pure. */
export function rank(facts: Facts[], asset: Criticality): Ranked[] {
  const order = (p: Priority): number => (p === "unknown" ? 9 : TIERS.indexOf(p));
  return facts.map((f) => ({ ...f, ...priority(f, asset) }))
    .sort((a, b) => order(a.priority) - order(b.priority) || (b.epss ?? -1) - (a.epss ?? -1)
      || (b.cvss_score ?? -1) - (a.cvss_score ?? -1) || a.cve_id.localeCompare(b.cve_id))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

let kevCache: { at: number; byId: Map<string, { dateAdded?: string; knownRansomwareCampaignUse?: string }> } | null = null;

async function kevCatalog(): Promise<typeof kevCache> {
  if (kevCache && Date.now() - kevCache.at < KEV_TTL_MS) return kevCache;
  try {
    const r = await fetch(KEV_URL, { signal: AbortSignal.timeout(KEV_TIMEOUT_MS) });
    if (!r.ok) return kevCache;
    const body = await r.json() as { vulnerabilities?: Array<{ cveID?: string; dateAdded?: string; knownRansomwareCampaignUse?: string }> };
    if (!body.vulnerabilities?.length) return kevCache;
    kevCache = { at: Date.now(), byId: new Map(body.vulnerabilities.map((v) => [String(v.cveID).toUpperCase(), v])) };
    return kevCache;
  } catch {
    return kevCache;
  }
}

async function record(id: string): Promise<CveRecord | null> {
  try {
    const r = await fetch(`https://cveawg.mitre.org/api/cve/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" }, signal: AbortSignal.timeout(RECORD_TIMEOUT_MS),
    });
    return r.ok ? await r.json() as CveRecord : null;
  } catch {
    return null;
  }
}

async function epssScores(ids: string[]): Promise<Map<string, { epss: number; percentile: number }> | null> {
  try {
    const r = await fetch(`https://api.first.org/data/v1/epss?cve=${ids.join(",")}`, { signal: AbortSignal.timeout(RECORD_TIMEOUT_MS) });
    if (!r.ok) return null;
    const body = await r.json() as { data?: Array<{ cve?: string; epss?: string; percentile?: string }> };
    return new Map((body.data ?? []).map((d) => [String(d.cve).toUpperCase(), { epss: Number(d.epss), percentile: Number(d.percentile) }]));
  } catch {
    return null;
  }
}

const METHOD = "Priority tiers, highest first. act_now: on CISA KEV, or CISA SSVC records active exploitation. " +
  "high: EPSS >= 10%, or a public proof-of-concept with CVSS >= 7, or CVSS >= 9 and automatable. " +
  "medium: CVSS >= 7 or EPSS >= 1%. low: the rest. A critical asset raises a CVE one tier, never into act_now, which needs " +
  "evidence of exploitation; a non-critical asset lowers it one, except act_now. Within a tier: EPSS, then CVSS.";

export async function triageVulnerabilities(question: string, cvesParam = "", assetParam = ""): Promise<TriageResult> {
  const asset = criticality(assetParam, question);
  const ids = cveIds(`${cvesParam} ${question}`);
  if (!ids.length) {
    return { ranked: null, asset_criticality: asset, method: METHOD, sources: [], verdict: "insufficient_input", confidence: 0, error: "no_cve_ids",
      reason: "No CVE identifiers were supplied, so nothing could be ranked. Findings are ranked from their CVE records; supply the CVE ids (CVE-YYYY-NNNN) of the findings to triage." };
  }
  const list = ids.slice(0, MAX_CVES);
  const [records, epss, kev] = await Promise.all([Promise.all(list.map(record)), epssScores(list), kevCatalog()]);
  const facts = list.map((id, i) => {
    const f = recordFacts(id, records[i] ?? null);
    const e = epss?.get(id);
    const k = kev?.byId.get(id);
    return { ...f,
      epss: e && Number.isFinite(e.epss) ? e.epss : null,
      epss_percentile: e && Number.isFinite(e.percentile) ? e.percentile : null,
      kev: kev ? !!k : f.kev,
      kev_date_added: k?.dateAdded ?? f.kev_date_added,
      known_ransomware_use: k ? k.knownRansomwareCampaignUse === "Known" : null };
  });
  if (!facts.some((f) => f.found)) {
    return { ranked: null, asset_criticality: asset, method: METHOD, sources: [], verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `Unknown: none of the ${list.length} CVE records could be read from the CVE Program, so the set could not be ranked. This is an outage or an unknown id, not a clean result.` };
  }
  const ranked = rank(facts, asset);
  const sources = ["CVE Program records (cveawg.mitre.org), with CISA-ADP scores and SSVC",
    kev ? "CISA Known Exploited Vulnerabilities catalog" : "CISA-ADP KEV flags (the KEV catalog did not answer)",
    ...(epss ? ["EPSS scores by FIRST (first.org/epss)"] : [])];
  // No "1." numbering: the envelope's lead sentence would end at it (envelope.ts).
  const top = ranked.slice(0, 3).map((r) => `${r.cve_id} (${r.priority.replace("_", " ")}: ${r.why})`).join(", then ");
  const gaps = [
    ...(ids.length > MAX_CVES ? [`only the first ${MAX_CVES} of ${ids.length} CVEs were ranked`] : []),
    ...(epss ? [] : ["EPSS did not answer, so exploit probability was not used"]),
    ...(ranked.some((r) => !r.found) ? [`${ranked.filter((r) => !r.found).length} id(s) have no published record and are ranked last`] : []),
  ];
  const assetNote = asset === "unspecified" ? " No asset criticality was stated, so none was applied."
    : ` The asset was read as ${asset === "high" ? "critical" : "non-critical"} and applied to every CVE in the set.`;
  return { ranked, asset_criticality: asset, method: METHOD, sources, verdict: "ranked",
    confidence: epss && kev ? 0.8 : 0.6,
    reason: `Fix first: ${top}.${assetNote}${gaps.length ? ` Note: ${gaps.join("; ")}.` : ""} ` +
      "Facts are read from public records; the ordering follows the rule in `method`." };
}
