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

/**
 * fiscal_year is set only when the question or period names one: "its 10-K for fiscal 2026", "FY2026". `until`
 * closes a window that has an end: a calendar year ("2025") or quarter ("Q3 2025").
 */
export interface FilingAsk { company: string; form: string | null; since: string | null; until?: string; latest: boolean; fiscal_year?: number }

const QUARTER: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };
const QUARTER_END = ["03-31", "06-30", "09-30", "12-31"];
const YEAR = String.raw`((?:19|20)\d{2})(?![-/]\d)`;

/**
 * A named year or quarter: "FY2025" or "fiscal 2025" (the fiscal year), "Q3 2025" (1 July to 30 September),
 * "2025" (the calendar year). A period parameter may be the year alone; in a question the year needs a
 * preposition ("filings in 2025"), so "Apple's 2025 10-K" is not a window. Pure.
 */
export function namedPeriod(text: string, bare: boolean): { since: string; until: string } | { fiscal_year: number } | null {
  const t = String(text ?? "");
  const fy = t.match(new RegExp(String.raw`\b(?:fiscal(?:\s+year)?\s*|FY\s?)${YEAR}`, "i"))?.[1];
  if (fy) return { fiscal_year: Number(fy) };
  const qa = t.match(new RegExp(String.raw`\bQ([1-4])\s*(?:of\s+)?${YEAR}`, "i"));
  const qb = t.match(new RegExp(String.raw`\b${YEAR}\s*-?\s*Q([1-4])\b`, "i"));
  const qc = t.match(new RegExp(String.raw`\b(first|second|third|fourth)\s+quarter\s+(?:of\s+)?${YEAR}`, "i"));
  const [n, yr] = qa ? [Number(qa[1]), qa[2]!] : qb ? [Number(qb[2]), qb[1]!] : qc ? [QUARTER[qc[1]!.toLowerCase()]!, qc[2]!] : [0, ""];
  if (n) return { since: `${yr}-${String(3 * n - 2).padStart(2, "0")}-01`, until: `${yr}-${QUARTER_END[n - 1]}` };
  const y = (bare ? t.match(new RegExp(String.raw`^\s*(?:(?:in|during|for|calendar(?:\s+year)?|year)\s+)?${YEAR}\s*$`, "i")) : null)
    ?? t.match(new RegExp(String.raw`\b(?:in|during|throughout|over)\s+(?:calendar\s+(?:year\s+)?|the\s+year\s+)?${YEAR}`, "i"));
  return y ? { since: `${y[1]}-01-01`, until: `${y[1]}-12-31` } : null;
}

const FORM = /\b(10-K|10-Q|8-K|20-F|6-K|40-F|S-1|S-3|S-4|F-1|DEF\s?14A|13F-HR|11-K|10-KT)(\/A)?\b/i;

const COUNT: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, eighteen: 18, "twenty-four": 24 };

/** The start of a window such as "in the last 12 months", "past two quarters" or "over the past year". */
function windowStart(w: string, now: Date): string | null {
  const rel = w.match(/\b(?:last|past)\s+(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|eighteen|twenty-four)\s+(day|week|month|quarter|year)s?\b/i)
    // Without a number only after a preposition: "versus the last quarter" compares, it is not a window.
    ?? w.match(/\b(?:in|over|during|within|for)\s+the\s+(?:last|past)\s+()(day|week|month|quarter|year)\b/i);
  if (rel) {
    const d = new Date(now);
    const n = !rel[1] ? 1 : /^\d+$/.test(rel[1]) ? Number(rel[1]) : COUNT[rel[1].toLowerCase()] ?? 1;
    const unit = rel[2]!.toLowerCase();
    if (unit === "day") d.setUTCDate(d.getUTCDate() - n);
    else if (unit === "week") d.setUTCDate(d.getUTCDate() - 7 * n);
    else if (unit === "month") d.setUTCMonth(d.getUTCMonth() - n);
    else if (unit === "quarter") d.setUTCMonth(d.getUTCMonth() - 3 * n);
    else d.setUTCFullYear(d.getUTCFullYear() - n);
    return d.toISOString().slice(0, 10);
  }
  if (/\btoday\b/i.test(w)) return now.toISOString().slice(0, 10);
  if (/\bthis\s+week\b/i.test(w)) return new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  // "This month" is the calendar month: Nvidia's September 8-K was answered
  // "Yes" to "Has Nvidia filed an 8-K this month?" on 2026-10-21.
  if (/\bthis\s+month\b/i.test(w)) return `${now.toISOString().slice(0, 7)}-01`;
  if (/\bthis\s+year\b/i.test(w)) return `${now.toISOString().slice(0, 4)}-01-01`;
  return w.match(/\bsince\s+(\d{4}-\d{2}-\d{2})\b/i)?.[1] ?? null;
}

// Where a question names the issuer, tried in order. The node's request builder may send only `query`, so
// "How many filings did Apple make in the last 12 months?" must find Apple on its own (GAPS G257).
const ISSUER: RegExp[] = [
  /\b(?:has|have|did|when\s+did|when\s+was)\s+(.+?)\s+(?:filed|file|submit(?:ted)?|publish(?:ed)?|release[sd]?|make|made|had)\b/i,
  /\b(?:filings?|10-K|10-Q|8-K|20-F|6-K|annual\s+report|quarterly\s+report|current\s+report)s?\s+(?:made\s+|filed\s+|submitted\s+)?(?:for|from|of|by)\s+(.+?)(?:[?,]|\s+(?:on|in|with|and|since|this|last|past|filed|over|during|within|between)\b|$)/i,
  /\b([A-Z][\w&.'-]*(?:,?\s+[A-Z][\w&.'-]*){0,4})(?:'s|’s)\s+(?:latest|last|most\s+recent|recent|newest|new)?\s*(?:10-K|10-Q|8-K|20-F|6-K|annual|quarterly|current|filing)/,
  /\b(?:made|filed|submitted|published)\s+by\s+(.+?)(?:[?,]|\s+(?:on|in|with|and|since|this|last|past|over|during|within|between)\b|$)/i,
  // A name in front of the form: "Microsoft 8-K filings in the last 6 months", "How many Tesla filings…".
  /(?:^|\b(?:[Ll]ist|[Ss]how|[Cc]ount|[Gg]et|[Ff]ind|[Hh]ow\s+many)\s+(?:all\s+|the\s+|of\s+)?)(?!(?:SEC|EDGAR|US|U\.S\.|List|Show|Count|Get|Find|How|What|Which|Recent|Latest|New|All|Any|Total|Regulatory|Annual|Quarterly|Current|The)\b)([A-Z][\w&.'-]*(?:,?\s+[A-Z][\w&.'-]*){0,4})\s+(?:SEC\s+|EDGAR\s+|regulatory\s+)?(?:10-K|10-Q|8-K|20-F|6-K|40-F|S-1|DEF\s?14A|filings?|annual\s+reports?|quarterly\s+reports?)/,
];

/**
 * The issuer, the form and the time window, read from the declared parameters and the question. `periodParam` is
 * the intent's own `period` ("last 12 months"); when given it sets the window instead of the question.
 */
export function filingAsk(question: string, companyParam = "", formParam = "", now = new Date(), periodParam = ""): FilingAsk {
  const q = String(question ?? "").slice(0, 600);
  const fm = (formParam.match(FORM) ?? q.match(FORM));
  const named = fm ? `${fm[1]!.toUpperCase().replace(/^DEF\s?14A$/, "DEF 14A")}${fm[2] ? "/A" : ""}` : null;
  const form = named ?? (/\bannual report\b/i.test(q) ? "10-K" : /\bquarterly report\b/i.test(q) ? "10-Q"
    : /\bcurrent report\b/i.test(q) ? "8-K" : /\bproxy\b/i.test(q) ? "DEF 14A" : null);
  const period = periodParam.trim().slice(0, 200);
  const periodRel = period ? windowStart(`in the ${period.replace(/^(?:(?:in|over|during|within|for)\s+)?(?:the\s+)?/i, "")}`, now) : null;
  // "2025", "FY2025" and "Q3 2025" as the period left filing_count null: only relative phrases were read (2026-11-08).
  // The period parameter wins over the question, and a relative window in the question over a year in it.
  const periodSpan = !periodRel && period ? namedPeriod(period, true) : null;
  const qRel = periodRel || (periodSpan && "since" in periodSpan) ? null : windowStart(q, now);
  const qSpan = namedPeriod(q, false);
  const span = periodSpan ?? (qRel && qSpan && "since" in qSpan ? null : qSpan);
  const since = periodRel || qRel || (span && "since" in span ? span.since : null);
  const until = !periodRel && !qRel && span && "until" in span ? span.until : undefined;
  const fy = span && "fiscal_year" in span ? span.fiscal_year : undefined;
  let m: RegExpMatchArray | null = null;
  for (const re of ISSUER) if ((m = q.match(re))) break;
  const company = (companyParam.trim() || (m?.[1] ?? "")).replace(/^(?:the|a)\s+/i, "").replace(/(?:'s|’s)$/, "")
    .replace(/[?!]+$/, "").replace(/\s*\([^)]*\)$/, "").trim();
  return { company, form, since, ...(until ? { until } : {}), latest: !since, ...(fy ? { fiscal_year: fy } : {}) };
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
  return usdFacts(await r.json());
}

/**
 * A concept's USD facts, or none. SEC answers some filers with `"USD": {}` rather
 * than a list (Coca-Cola's Revenues, 2026-10-25), which crashed the route and was
 * reported as the provider being down (G210). Pure.
 */
export function usdFacts(body: unknown): Fact[] {
  const usd = (body as { units?: { USD?: unknown } } | null)?.units?.USD;
  return Array.isArray(usd) ? (usd as Fact[]) : [];
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
/** "Form 4" for a form type that is only a number (insider reports 3, 4 and 5, notices 144). */
const formName = (form: string): string => (/^\d+(?:\/A)?$/.test(form) ? `Form ${form}` : form);
const article = (form: string): string => /^(?:8|11|18|S|F)/.test(form) ? `an ${form}` : `a ${formName(form)}`;

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
  /**
   * REGULATORY_FILING_MONITOR_GENERAL's response format, under its own names:
   * `filing_count` is the scored field. It counts the form asked, or every
   * material form, filed on or after `counted_since`; `null` when EDGAR could not
   * be read. `filings` and `urls` list the same filings newest first, up to 100.
   */
  entity?: string | null;
  filing_count?: number | null;
  filings?: string[];
  urls?: string[];
  counted_since?: string | null;
  /** The last filing date counted, when the window has an end (a calendar year or quarter). */
  counted_until?: string;
  /** False when the window reaches past the 1,000 filings EDGAR's index returns, so the count is a lower bound. */
  count_complete?: boolean;
}

/** EDGAR's submissions index returns at least a year of filings, or the newest 1,000. */
const INDEX_CAP = 1_000;
const LISTED = 100;

/** "10-Q filed 2026-10-31 for the period ended 2026-09-27", "8-K filed 2026-10-30, items 2.02, 9.01". Pure. */
export function filingTitle(f: Filing): string {
  const when = f.period ? (f.form === "8-K" || f.form === "6-K" ? `, event dated ${f.period}` : ` for the period ended ${f.period}`) : "";
  const items = f.items.length ? `, item${f.items.length > 1 ? "s" : ""} ${f.items.map((i) => i.item).join(", ")}` : "";
  return `${formName(f.form)} filed ${f.filed}${when}${items}`;
}

/**
 * The intent's count fields over the filings in the window, newest first. Pure. `windowed` is false when the
 * question gave no period or fiscal year: the count is then null, because a count of the whole index answers
 * no question that was asked.
 */
export function countFields(inWindow: Filing[], index: Filing[], since: string | null, windowed = since !== null): Pick<FilingResult, "filing_count" | "filings" | "urls" | "counted_since" | "count_complete"> {
  const oldest = index.at(-1)?.filed ?? null;
  const complete = !(index.length >= INDEX_CAP && oldest !== null && (since === null || since < oldest));
  return {
    filing_count: windowed ? inWindow.length : null,
    filings: inWindow.slice(0, LISTED).map(filingTitle),
    urls: inWindow.slice(0, LISTED).map((f) => f.url),
    counted_since: since,
    ...(complete || !windowed ? {} : { count_complete: false }),
  };
}

export async function monitorFilings(question: string, companyParam = "", formParam = "", now = new Date(), periodParam = ""): Promise<FilingResult> {
  const ask = filingAsk(question, companyParam, formParam, now, periodParam);
  const other = String(question ?? "").match(OTHER_REGULATOR)?.[0];
  const notCovered = other ? `Only SEC EDGAR is read; ${other} disclosures are not covered.` : undefined;
  const base = {
    company: ask.company || null, form_asked: ask.form, since: ask.since, ...(notCovered ? { not_covered: notCovered } : {}),
    entity: ask.company || null, filing_count: null,
  };
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
    // Not a count of 0: the intent covers any regulator's filings, and only SEC EDGAR was read.
    return { ...base, verdict: "not_found", confidence: 0.6, filings: [], urls: [], counted_since: ask.since,
      reason: `No SEC registrant matching ${ask.company} was found, so it has no EDGAR filings to report.${notCovered ? ` ${notCovered}` : " Issuers that file only with regulators outside the US are not covered."}` };
  }
  const co: EdgarCompany | null | undefined = await submissions(cik.cik);
  if (!co) {
    return { ...base, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `${cik.title}'s filing index could not be read from SEC EDGAR. This is an availability problem, not a finding that nothing was filed.` };
  }
  // A fiscal year is matched on the period the filing covers, which ends inside
  // that year for every issuer (Apple's FY2026 ends in September 2026, NVIDIA's
  // in January 2026). Apple's FY2025 10-K was answered "Yes" to "Has Apple
  // filed its 10-K for fiscal 2026?" on 2026-10-21.
  const ofForm = (f: Filing): boolean => ask.form ? f.form === ask.form : MATERIAL.has(f.form);
  const inYear = (f: Filing): boolean => !ask.fiscal_year || (f.period ?? "").startsWith(String(ask.fiscal_year));
  const all = co.filings.filter((f) => ofForm(f) && inYear(f));
  const fiscal = ask.fiscal_year ? ` for fiscal ${ask.fiscal_year}` : "";
  const within = (f: Filing): boolean => (!ask.since || f.filed >= ask.since) && (!ask.until || f.filed <= ask.until);
  const inWindow = all.filter(within);
  const span = ask.until ? `between ${ask.since} and ${ask.until}` : `since ${ask.since}`;
  // `filing_count` counts every form in the window unless a form was asked, as zk-filing does ("defaults to all
  // forms"). Counting material forms only, we scored 0.8145 and 0.8749 against zk-filing's 0.9975 (epochs 2019,
  // 2021; GAPS G263). The answer's own filing is still the latest material one.
  const counted = co.filings.filter((f) => (ask.form ? f.form === ask.form : true) && inYear(f) && within(f));
  const ident = {
    company: co.name, cik: co.cik, tickers: co.tickers, source_url: co.source_url, recent_filings: inWindow.slice(0, 5),
    ...(ask.until ? { counted_until: ask.until } : {}),
    // A fiscal year's filings are all filed on or after 1 January of that year: the bound for completeness.
    entity: co.name, ...countFields(counted, co.filings, ask.since ?? (ask.fiscal_year ? `${ask.fiscal_year}-01-01` : null),
      Boolean(ask.since || ask.fiscal_year)),
  };
  const what = ask.form ?? "material filing";
  const f = inWindow[0];
  if (!f) {
    const last = co.filings.find(ofForm);
    const others = !ask.form && ask.since && counted.length
      ? `; it made ${counted.length} other EDGAR filing${counted.length === 1 ? "" : "s"} in that window, the latest ${article(counted[0]!.form)} on ${counted[0]!.filed}` : "";
    return { ...base, ...ident, verdict: "not_filed", confidence: 0.85, filing: last ?? null,
      reason: `No: ${co.name} has filed no ${what === "material filing" ? "material filing" : what}${fiscal}${ask.since ? ` ${span}` : " among its recent EDGAR filings"}` +
        `${others}${last ? `; its last${ask.form ? "" : " material"} one was filed on ${last.filed}${last.period ? ` for the period ended ${last.period}` : ""}` : ""}.${notCovered ? ` ${notCovered}` : ""}` };
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
  // A window is a count question as well: "how many filings in the last 12 months". The count leads, and it is
  // the same number as `filing_count`.
  const lead = ask.latest
    ? `${co.name}'s latest ${ask.form ? `${ask.form} was filed` : `filing is ${article(f.form)}, filed`}`
    : ask.form
      ? inWindow.length === 1 ? `${co.name} has filed ${article(f.form)} ${span}; the latest was filed`
        : `${co.name} has filed ${inWindow.length} ${ask.form}s ${span}; the latest was filed`
      : `${co.name} has made ${counted.length} EDGAR filing${counted.length === 1 ? "" : "s"} ${span}, ` +
        `${inWindow.length} of them material (10-K, 10-Q, 8-K and the like); the latest material one, ${article(f.form)}, was filed`;
  return {
    ...base, ...ident, verdict: "filed", confidence: 0.95, filing: f, figures: c ?? null, prior_year_figures: p ?? null,
    reason: `${yes}${lead} on ${f.filed}${accepted}${dated}, accession ${f.accession}.${items}${numbers}` +
      ` Filing: ${f.url}${notCovered ? ` ${notCovered}` : ""}`,
  };
}
