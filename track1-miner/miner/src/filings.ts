/**
 * REGULATORY_FILING_MONITOR: has an issuer filed a 10-K, 10-Q, 8-K or other
 * statutory filing, when was it accepted, and what does it report?
 *
 * Read from SEC EDGAR (edgar.ts): the filer's own filing index gives the form,
 * filing date, acceptance time, period, accession number and 8-K items. For a
 * 10-Q, 10-K or 20-F the headline figures come from the XBRL facts tagged with
 * that filing's accession number (data.sec.gov companyconcept), so "what did
 * it disclose about margins" is answered from the filing, not from a feed.
 * Only EDGAR is read; exchange disclosures elsewhere are named as not covered.
 */
import { resolveCik, submissions, type EdgarCompany, type Filing } from "./edgar";

const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const TIMEOUT_MS = Number(process.env.EDGAR_TIMEOUT_MS ?? 5_000);
const MATERIAL = new Set(["10-K", "10-Q", "8-K", "20-F", "6-K", "40-F", "DEF 14A", "S-1", "S-4", "F-1", "10-KT"]);
const OTHER_REGULATOR = /\b(?:FCA|RNS|SEDAR|SEBI|BSE|NSE|LSE|ASX|HKEX|ESMA|Companies House|AMF|BaFin)\b/;

export interface FilingAsk { company: string; form: string | null; since: string | null; latest: boolean }

const FORM = /\b(10-K|10-Q|8-K|20-F|6-K|40-F|S-1|S-3|S-4|F-1|DEF\s?14A|13F-HR|11-K|10-KT)(\/A)?\b/i;

/** The issuer, the form and the time window, read from the declared parameters and the question. */
export function filingAsk(question: string, companyParam = "", formParam = "", now = new Date()): FilingAsk {
  const q = String(question ?? "").slice(0, 600);
  const fm = (formParam.match(FORM) ?? q.match(FORM));
  const named = fm ? `${fm[1]!.toUpperCase().replace(/^DEF\s?14A$/, "DEF 14A")}${fm[2] ? "/A" : ""}` : null;
  const form = named ?? (/\bannual report\b/i.test(q) ? "10-K" : /\bquarterly report\b/i.test(q) ? "10-Q"
    : /\bcurrent report\b/i.test(q) ? "8-K" : /\bproxy\b/i.test(q) ? "DEF 14A" : null);
  let since: string | null = q.match(/\bsince\s+(\d{4}-\d{2}-\d{2})\b/i)?.[1] ?? null;
  const rel = q.match(/\b(?:in\s+the\s+)?(?:last|past)\s+(\d{1,3})\s+(day|week|month)s?\b/i);
  if (rel) {
    const d = new Date(now);
    const n = Number(rel[1]);
    if (/day/i.test(rel[2]!)) d.setUTCDate(d.getUTCDate() - n);
    else if (/week/i.test(rel[2]!)) d.setUTCDate(d.getUTCDate() - 7 * n);
    else d.setUTCMonth(d.getUTCMonth() - n);
    since = d.toISOString().slice(0, 10);
  } else if (/\b(?:today)\b/i.test(q)) since = now.toISOString().slice(0, 10);
  else if (/\bthis\s+week\b/i.test(q)) since = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const m =
    q.match(/\b(?:has|have|did|when\s+did|when\s+was)\s+(.+?)\s+(?:filed|file|submit(?:ted)?|publish(?:ed)?|release[sd]?)\b/i) ??
    q.match(/\b(?:filings?|10-K|10-Q|8-K|20-F|6-K|annual\s+report|quarterly\s+report|current\s+report)\s+(?:for|from|of|by)\s+(.+?)(?:[?,]|\s+(?:on|in|with|and|since|this|last|filed)\b|$)/i) ??
    q.match(/\b([A-Z][\w&.'-]*(?:,?\s+[A-Z][\w&.'-]*){0,4})(?:'s|’s)\s+(?:latest|last|most\s+recent|recent|newest|new)?\s*(?:10-K|10-Q|8-K|20-F|6-K|annual|quarterly|current|filing)/);
  const company = (companyParam.trim() || (m?.[1] ?? "")).replace(/^(?:the|a)\s+/i, "").replace(/(?:'s|’s)$/, "").replace(/[?!]+$/, "").trim();
  return { company, form, since, latest: !since };
}

export interface Figures {
  period_start: string; period_end: string;
  revenue: number | null; gross_profit: number | null; gross_margin_pct: number | null;
  operating_income: number | null; net_income: number | null;
}

interface Fact { start?: string; end: string; val: number; accn: string }

async function concept(cik: number, tag: string): Promise<Fact[]> {
  const r = await fetch(`https://data.sec.gov/api/xbrl/companyconcept/CIK${String(cik).padStart(10, "0")}/us-gaap/${tag}.json`,
    { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) return [];
  return ((await r.json()) as { units?: { USD?: Fact[] } }).units?.USD ?? [];
}

/** The filing's own facts for its period: the shortest span ending on it, and the same span a year earlier. Pure. */
export function figuresFor(facts: Record<string, Fact[]>, accession: string, period: string): { current: Figures; prior: Figures | null } | null {
  // A year earlier ends within a week of the same date: 52/53-week fiscal
  // years (NVIDIA's ends on the last Sunday of January) never repeat exactly.
  const pick = (tag: string, end: string, days: number | null, slack = 0): Fact | null => {
    const near = (e: string): boolean => Math.abs(Date.parse(e) - Date.parse(end)) <= slack * 86_400_000;
    const own = (facts[tag] ?? []).filter((f) => f.accn === accession && near(f.end) && f.start);
    const span = (f: Fact): number => (Date.parse(f.end) - Date.parse(f.start!)) / 86_400_000;
    const fit = days === null ? own : own.filter((f) => Math.abs(span(f) - days) < 10);
    return fit.sort((a, b) => span(a) - span(b))[0] ?? null;
  };
  const build = (end: string, days: number | null, slack = 0): Figures | null => {
    const rev = pick("Revenues", end, days, slack) ?? pick("RevenueFromContractWithCustomerExcludingAssessedTax", end, days, slack);
    if (!rev) return null;
    const span = (Date.parse(rev.end) - Date.parse(rev.start!)) / 86_400_000;
    const at = rev.end;
    const g = pick("GrossProfit", at, span)?.val ?? null;
    return {
      period_start: rev.start!, period_end: rev.end, revenue: rev.val, gross_profit: g,
      gross_margin_pct: g !== null && rev.val ? Number(((g / rev.val) * 100).toFixed(1)) : null,
      operating_income: pick("OperatingIncomeLoss", at, span)?.val ?? null,
      net_income: pick("NetIncomeLoss", at, span)?.val ?? null,
    };
  };
  const current = build(period, null);
  if (!current) return null;
  const d = new Date(`${period}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  const days = (Date.parse(current.period_end) - Date.parse(current.period_start)) / 86_400_000;
  return { current, prior: build(d.toISOString().slice(0, 10), days, 7) };
}

/** "an 8-K", "an S-1", "a 10-Q". */
const article = (form: string): string => /^(?:8|11|18|S|F)/.test(form) ? `an ${form}` : `a ${form}`;

const money = (v: number | null): string =>
  v === null ? "not tagged" : `${v < 0 ? "-" : ""}$${(Math.abs(v) / 1e9 >= 1 ? `${(Math.abs(v) / 1e9).toFixed(2)} billion` : `${(Math.abs(v) / 1e6).toFixed(1)} million`)}`;

export interface FilingResult {
  company: string | null;
  verdict: "filed" | "not_filed" | "not_found" | "unknown";
  confidence: number;
  reason: string;
  error?: string;
  cik?: number;
  tickers?: string[];
  form_asked?: string | null;
  since?: string | null;
  filing?: Filing | null;
  recent_filings?: Filing[];
  figures?: Figures | null;
  prior_year_figures?: Figures | null;
  source_url?: string;
  not_covered?: string;
}

export async function monitorFilings(question: string, companyParam = "", formParam = "", now = new Date()): Promise<FilingResult> {
  const ask = filingAsk(question, companyParam, formParam, now);
  const other = String(question ?? "").match(OTHER_REGULATOR)?.[0];
  const notCovered = other ? `Only SEC EDGAR is read; ${other} disclosures are not covered.` : undefined;
  const base = { company: ask.company || null, form_asked: ask.form, since: ask.since, ...(notCovered ? { not_covered: notCovered } : {}) };
  if (!ask.company) {
    return { ...base, verdict: "unknown", confidence: 0, error: "no_subject",
      reason: "No issuer was named, so no filing was looked up. Name the company or ticker, for example: Has Tesla filed its latest 10-Q on SEC EDGAR?" };
  }
  const cik = await resolveCik(ask.company);
  if (cik === undefined) {
    return { ...base, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `${ask.company}'s filings could not be checked because SEC EDGAR did not answer. This is an availability problem, not a finding that nothing was filed.` };
  }
  if (cik === null) {
    return { ...base, verdict: "not_found", confidence: 0.6,
      reason: `No SEC registrant matching ${ask.company} was found, so it has no EDGAR filings to report.${notCovered ? ` ${notCovered}` : " Issuers that file only with regulators outside the US are not covered."}` };
  }
  const co: EdgarCompany | null | undefined = await submissions(cik.cik);
  if (!co) {
    return { ...base, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `${cik.title}'s filing index could not be read from SEC EDGAR. This is an availability problem, not a finding that nothing was filed.` };
  }
  const wanted = (f: Filing): boolean => ask.form ? f.form === ask.form : MATERIAL.has(f.form);
  const all = co.filings.filter(wanted);
  const inWindow = ask.since ? all.filter((f) => f.filed >= ask.since!) : all;
  const ident = { company: co.name, cik: co.cik, tickers: co.tickers, source_url: co.source_url, recent_filings: inWindow.slice(0, 5) };
  const what = ask.form ?? "material filing";
  const f = inWindow[0];
  if (!f) {
    const last = all[0];
    return { ...base, ...ident, verdict: "not_filed", confidence: 0.85, filing: last ?? null,
      reason: `No: ${co.name} has filed no ${what === "material filing" ? "material filing" : what}${ask.since ? ` since ${ask.since}` : " among its recent EDGAR filings"}` +
        `${last ? `; its last one was filed on ${last.filed}${last.period ? ` for the period ended ${last.period}` : ""}` : ""}.${notCovered ? ` ${notCovered}` : ""}` };
  }
  let figures: { current: Figures; prior: Figures | null } | null = null;
  if (["10-Q", "10-K", "20-F", "10-KT"].includes(f.form) && f.period) {
    const tags = ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "GrossProfit", "OperatingIncomeLoss", "NetIncomeLoss"];
    const facts = Object.fromEntries(await Promise.all(tags.map(async (t) => [t, await concept(co.cik, t).catch(() => [])] as const)));
    figures = figuresFor(facts, f.accession, f.period);
  }
  const accepted = f.accepted ? ` and accepted by EDGAR at ${f.accepted.slice(11, 16)} UTC` : "";
  const dated = f.period ? (f.form === "8-K" || f.form === "6-K" ? `, reporting an event dated ${f.period}` : `, for the period ended ${f.period}`) : "";
  const items = f.items.length ? ` It reports ${f.items.map((i) => `item ${i.item} (${i.name})`).join(", ")}.` : "";
  const c = figures?.current;
  const p = figures?.prior;
  const numbers = c
    ? ` For ${c.period_start} to ${c.period_end} it reports revenue of ${money(c.revenue)}` +
      `${c.gross_margin_pct !== null ? `, a gross margin of ${c.gross_margin_pct.toFixed(1)}%` : ""}` +
      `${p?.gross_margin_pct != null ? ` against ${p.gross_margin_pct.toFixed(1)}% a year earlier` : ""}` +
      `, operating income of ${money(c.operating_income)} and net income of ${money(c.net_income)}, as tagged in the filing's XBRL.`
    : "";
  const yes = /^\s*(?:has|have|did|is|was|were|does)\b/i.test(String(question ?? "")) ? "Yes: " : "";
  const lead = ask.latest
    ? `${co.name}'s latest ${ask.form ? `${ask.form} was filed` : `filing is ${article(f.form)}, filed`}`
    : `${co.name} has filed ${article(f.form)} since ${ask.since}; the latest was filed`;
  return {
    ...base, ...ident, verdict: "filed", confidence: 0.95, filing: f, figures: c ?? null, prior_year_figures: p ?? null,
    reason: `${yes}${lead} on ${f.filed}${accepted}${dated}, accession ${f.accession}.${items}${numbers}` +
      ` Filing: ${f.url}${notCovered ? ` ${notCovered}` : ""}`,
  };
}
