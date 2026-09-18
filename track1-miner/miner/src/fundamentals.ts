/**
 * FINANCIAL_DATA company fundamentals — revenue, net income, EPS and the rest —
 * from the company's own 10-K, through the SEC's keyless XBRL API.
 *
 * Rank-loss report F8 (2026-09-15): "What was Apple's revenue in fiscal year
 * 2024?" was answered with today's trading range and a note that fundamentals
 * were not available, yet the canonical intent names company fundamentals
 * outright. EDGAR's companyconcept endpoint returns every value a filer has
 * reported for one us-gaap tag, so the annual figure comes from the filing
 * itself rather than from an aggregator's restatement of it.
 *
 * Never throws. An SEC outage is reported as `outage`, never as "no data"
 * (ARCHITECTURE A5: an outage is not an empty result).
 */
import type { FinancialResult } from "./financial";

const TIMEOUT_MS = Number(process.env.SEC_TIMEOUT_MS ?? 3_000);
// SEC blocks anonymous clients; this descriptive UA was answered 200 on 2026-09-15. No email in it.
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const CONCEPT = "https://data.sec.gov/api/xbrl/companyconcept";
const TICKERS = "https://www.sec.gov/files/company_tickers.json";
const DAY = 86_400_000;

/**
 * The largest US filers, so the common question costs no lookup: [ticker, CIK,
 * name, aliases]. CIKs checked against company_tickers.json on 2026-09-15, with
 * one deliberate exception: XOM is listed there under the new holding company
 * 2115436, which has no annual facts yet, so the filer of every Exxon 10-K,
 * 34088, is kept. An alias starting uppercase is matched case-sensitively,
 * because "visa", "oracle" and "ford" are ordinary words too.
 */
const COMPANIES: Array<[string, number, string, string]> = [
  ["AAPL", 320193, "Apple Inc.", "apple"], ["MSFT", 789019, "Microsoft Corporation", "microsoft"],
  ["NVDA", 1045810, "NVIDIA Corporation", "nvidia"], ["AMZN", 1018724, "Amazon.com, Inc.", "amazon"],
  ["GOOGL", 1652044, "Alphabet Inc.", "Alphabet|google"], ["META", 1326801, "Meta Platforms, Inc.", "Meta|facebook"],
  ["TSLA", 1318605, "Tesla, Inc.", "tesla"], ["BRK-B", 1067983, "Berkshire Hathaway Inc.", "berkshire"],
  ["AVGO", 1730168, "Broadcom Inc.", "broadcom"], ["LLY", 59478, "Eli Lilly and Company", "eli lilly|Lilly"],
  ["JPM", 19617, "JPMorgan Chase & Co.", "jpmorgan|jp morgan|j\\.p\\. morgan"], ["V", 1403161, "Visa Inc.", "Visa"],
  ["WMT", 104169, "Walmart Inc.", "walmart|wal-mart"], ["XOM", 34088, "Exxon Mobil Corporation", "exxon"],
  ["UNH", 731766, "UnitedHealth Group Incorporated", "unitedhealth"], ["MA", 1141391, "Mastercard Incorporated", "mastercard"],
  ["ORCL", 1341439, "Oracle Corporation", "Oracle"], ["COST", 909832, "Costco Wholesale Corporation", "costco"],
  ["HD", 354950, "The Home Depot, Inc.", "home depot"], ["PG", 80424, "The Procter & Gamble Company", "procter|p&g"],
  ["JNJ", 200406, "Johnson & Johnson", "johnson & johnson|johnson and johnson|j&j"], ["NFLX", 1065280, "Netflix, Inc.", "netflix"],
  ["BAC", 70858, "Bank of America Corporation", "bank of america"], ["ABBV", 1551152, "AbbVie Inc.", "abbvie"],
  ["KO", 21344, "The Coca-Cola Company", "coca-cola|coca cola"], ["CRM", 1108524, "Salesforce, Inc.", "salesforce"],
  ["CVX", 93410, "Chevron Corporation", "chevron"], ["MRK", 310158, "Merck & Co., Inc.", "merck"],
  ["AMD", 2488, "Advanced Micro Devices, Inc.", "advanced micro devices"], ["PEP", 77476, "PepsiCo, Inc.", "pepsico|pepsi"],
  ["ADBE", 796343, "Adobe Inc.", "adobe"], ["CSCO", 858877, "Cisco Systems, Inc.", "cisco"],
  ["TMO", 97745, "Thermo Fisher Scientific Inc.", "thermo fisher"], ["WFC", 72971, "Wells Fargo & Company", "wells fargo"],
  ["ACN", 1467373, "Accenture plc", "accenture"], ["MCD", 63908, "McDonald's Corporation", "mcdonald's|mcdonalds|mcdonald’s"],
  ["LIN", 1707925, "Linde plc", "Linde"], ["IBM", 51143, "International Business Machines Corporation", "international business machines"],
  ["ABT", 1800, "Abbott Laboratories", "abbott"], ["GE", 40545, "General Electric Company", "general electric"],
  ["DIS", 1744489, "The Walt Disney Company", "disney"], ["INTC", 50863, "Intel Corporation", "intel"],
  ["QCOM", 804328, "Qualcomm Incorporated", "qualcomm"], ["TXN", 97476, "Texas Instruments Incorporated", "texas instruments"],
  ["VZ", 732712, "Verizon Communications Inc.", "verizon"], ["T", 732717, "AT&T Inc.", "at&t"],
  ["CMCSA", 1166691, "Comcast Corporation", "comcast"], ["PFE", 78003, "Pfizer Inc.", "pfizer"],
  ["AMGN", 318154, "Amgen Inc.", "amgen"], ["NKE", 320187, "Nike, Inc.", "nike"],
  ["HON", 773840, "Honeywell International Inc.", "honeywell"], ["UPS", 1090727, "United Parcel Service, Inc.", "united parcel service"],
  ["BA", 12927, "The Boeing Company", "boeing"], ["CAT", 18230, "Caterpillar Inc.", "Caterpillar"],
  ["GS", 886982, "The Goldman Sachs Group, Inc.", "goldman sachs|Goldman"], ["MS", 895421, "Morgan Stanley", "morgan stanley"],
  ["C", 831001, "Citigroup Inc.", "citigroup|Citi"], ["PYPL", 1633917, "PayPal Holdings, Inc.", "paypal"],
  ["SBUX", 829224, "Starbucks Corporation", "starbucks"], ["UBER", 1543151, "Uber Technologies, Inc.", "uber"],
  ["F", 37996, "Ford Motor Company", "Ford"], ["GM", 1467858, "General Motors Company", "general motors"],
  ["LMT", 936468, "Lockheed Martin Corporation", "lockheed"], ["DE", 315189, "Deere & Company", "john deere|Deere"],
  ["MU", 723125, "Micron Technology, Inc.", "Micron"], ["NOW", 1373715, "ServiceNow, Inc.", "servicenow"],
  ["INTU", 896878, "Intuit Inc.", "Intuit"], ["AXP", 4962, "American Express Company", "american express|amex"],
  ["BLK", 2012383, "BlackRock, Inc.", "blackrock"], ["PLTR", 1321655, "Palantir Technologies Inc.", "palantir"],
];
const ALIASES: Array<[RegExp, string]> = COMPANIES.flatMap(([ticker, , , aliases]) =>
  aliases.split("|").map((a): [RegExp, string] => [new RegExp(`(?<![\\w&])${a}(?![\\w&])`, /^[A-Z]/.test(a) ? "" : "i"), ticker]));

interface Metric { label: string; tags: string[]; unit: string; re: RegExp }
/**
 * Metric words to us-gaap tags. Where a question names two, the one written
 * first wins, and a tie goes to the earlier row, so "earnings per share" is not
 * read as "earnings" and "operating income" is not read as "income".
 */
const METRICS: Metric[] = [
  { label: "diluted earnings per share", tags: ["EarningsPerShareDiluted"], unit: "USD/shares", re: /\beps\b|\bearnings per (?:diluted )?share\b/i },
  { label: "operating income", tags: ["OperatingIncomeLoss"], unit: "USD", re: /\boperating (?:income|profit|loss)\b/i },
  { label: "gross profit", tags: ["GrossProfit"], unit: "USD", re: /\bgross profits?\b/i },
  { label: "net income", tags: ["NetIncomeLoss"], unit: "USD", re: /\bnet (?:income|profit|earnings|loss)\b|\bprofits?\b(?! margin)|(?<!to[- ])\bearnings\b(?! (?:call|date|report|release|season))|\bincome\b/i },
  { label: "research and development expense", tags: ["ResearchAndDevelopmentExpense"], unit: "USD", re: /\br&d\b|\bresearch and development\b/i },
  // Total first: Walmart's and Berkshire's contract revenue is a subset of what they report as revenue.
  { label: "revenue", tags: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"], unit: "USD", re: /\brevenues?\b|\bsales\b|\bturnover\b|\btop[- ]line\b/i },
  { label: "total assets", tags: ["Assets"], unit: "USD", re: /\bassets\b/i },
  { label: "cash and cash equivalents", tags: ["CashAndCashEquivalentsAtCarryingValue"], unit: "USD", re: /\bcash\b(?! flow)/i },
  { label: "long-term debt", tags: ["LongTermDebt"], unit: "USD", re: /\bdebt\b(?![- ]to)/i },
];

export interface Fact { start?: string; end: string; val: number; fy?: number; fp?: string; form?: string; filed?: string; frame?: string }
export interface FundamentalFigures {
  metric: string; tag: string; value: number; unit: string; fiscal_year: number; period_end: string;
  form: string; source: "SEC EDGAR XBRL"; prior_value?: number; prior_period_end?: string; growth_pct?: number;
  fiscal_quarter?: number;
}
export type FundamentalsOutcome =
  | { status: "answer"; result: FinancialResult }
  | { status: "outage"; label: string }
  | { status: "unresolved" };

export function metricAsked(text: string): Metric | null {
  let best: { at: number; m: Metric } | null = null;
  for (const m of METRICS) {
    const hit = m.re.exec(String(text ?? ""));
    if (hit && (!best || hit.index < best.at)) best = { at: hit.index, m };
  }
  return best?.m ?? null;
}

/** The embedded company named in the text, earliest mention first. */
export function knownCompany(text: string): string | null {
  let best: { at: number; ticker: string } | null = null;
  for (const [re, ticker] of ALIASES) {
    const hit = re.exec(String(text ?? ""));
    if (hit && (!best || hit.index < best.at)) best = { at: hit.index, ticker };
  }
  return best?.ticker ?? null;
}

/** "fiscal year 2024", "fiscal 2025", "FY24", or a bare year. */
export function fiscalYearAsked(text: string): number | null {
  const s = String(text ?? "");
  const fy = s.match(/\b(?:fiscal(?:\s+year)?|fy)\s*'?(\d{4}|\d{2})\b/i);
  if (fy?.[1]) return fy[1].length === 2 ? 2000 + Number(fy[1]) : Number(fy[1]);
  const bare = s.match(/\b((?:19|20)\d{2})\b/);
  return bare?.[1] ? Number(bare[1]) : null;
}

/** A requested fiscal quarter, for example "Q2 2024" or "second quarter of 2024". */
export function quarterAsked(text: string): { quarter: number; year: number } | null {
  const s = String(text ?? "");
  const words: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };
  const n = s.match(/\bq\s*([1-4])\s*(?:fy\s*)?'?((?:19|20)\d{2})\b/i);
  if (n?.[1] && n[2]) return { quarter: Number(n[1]), year: Number(n[2]) };
  const word = s.match(/\b(first|second|third|fourth)\s+quarter(?:\s+of|\s*,?\s*fy?)\s*'?((?:19|20)\d{2})\b/i);
  if (word?.[1] && word[2]) return { quarter: words[word[1].toLowerCase()]!, year: Number(word[2]) };
  // "fiscal quarter 2 of 2024" is common in generated prompts.
  const fiscal = s.match(/\bfiscal\s+quarter\s*([1-4])\s*(?:of|for|in)?\s*'?((?:19|20)\d{2})\b/i);
  if (fiscal?.[1] && fiscal[2]) return { quarter: Number(fiscal[1]), year: Number(fiscal[2]) };
  return null;
}

/** A 52/53-week year ending in the first days of January is named for the year before. */
export function fiscalYearOf(end: string): number {
  const [y = 0, m = 0, d = 0] = end.split("-").map(Number);
  return m === 1 && d <= 7 ? y - 1 : y;
}

/**
 * One fact per annual period, latest filing first. A 10-K restates the two
 * prior years under its OWN `fy` (Apple's FY2025 10-K carries FY2024 revenue
 * with fy=2025), so periods are keyed by end date and a ~1-year duration, never
 * by `fy`. 10-Q facts and the quarterly figures some 10-Ks carry are dropped.
 */
export function annualFacts(facts: Fact[] | undefined): Fact[] {
  const byEnd = new Map<string, Fact>();
  for (const f of facts ?? []) {
    if (!/^10-K/.test(String(f.form)) || f.fp !== "FY" || !f.end || !Number.isFinite(f.val)) continue;
    if (f.start) {
      const days = (Date.parse(f.end) - Date.parse(f.start)) / DAY;
      if (!(days >= 350 && days <= 380)) continue;
    }
    const seen = byEnd.get(f.end);
    if (!seen || String(f.filed) >= String(seen.filed)) byEnd.set(f.end, f);
  }
  return [...byEnd.values()].sort((a, b) => a.end.localeCompare(b.end));
}

/** One fact per reported fiscal quarter. Year-to-date 10-Q facts are excluded. */
export function quarterlyFacts(facts: Fact[] | undefined): Fact[] {
  const byEnd = new Map<string, Fact>();
  for (const f of facts ?? []) {
    if (!/^10-[QK]/.test(String(f.form)) || !/^Q[1-3]$/.test(String(f.fp)) || !f.end || !Number.isFinite(f.val)) continue;
    if (!f.start) continue;
    const days = (Date.parse(f.end) - Date.parse(f.start)) / DAY;
    // 13-week quarters vary by a few days; this rejects the cumulative 6/9-month values.
    if (!(days >= 70 && days <= 110)) continue;
    const seen = byEnd.get(f.end);
    if (!seen || String(f.filed) >= String(seen.filed)) byEnd.set(f.end, f);
  }
  return [...byEnd.values()].sort((a, b) => a.end.localeCompare(b.end));
}

async function getJson(url: string): Promise<{ status: number; body?: unknown }> {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  return r.ok ? { status: r.status, body: await r.json() } : { status: r.status };
}

let tickerFile: Promise<Map<string, [number, string]>> | null = null;

/** Ticker to CIK: the embedded table, else SEC's full ticker file once per instance. `undefined` is an outage. */
async function lookupCik(ticker: string): Promise<{ cik: number; name: string } | null | undefined> {
  const t = ticker.toUpperCase().replace(/\./g, "-");
  const row = COMPANIES.find((c) => c[0] === t);
  if (row) return { cik: row[1], name: row[2] };
  tickerFile ??= getJson(TICKERS).then(({ body }) => {
    const rows = Object.values((body ?? {}) as Record<string, { cik_str?: number; ticker?: string; title?: string }>);
    const map = new Map<string, [number, string]>();
    for (const r of rows) if (r.ticker && Number.isFinite(r.cik_str)) map.set(r.ticker.toUpperCase(), [Number(r.cik_str), String(r.title)]);
    if (map.size < 1000) throw new Error("ticker file unreadable");
    return map;
  });
  try {
    const hit = (await tickerFile).get(t);
    return hit ? { cik: hit[0], name: hit[1] } : null;
  } catch {
    tickerFile = null;
    return undefined;
  }
}

/** Facts for one tag; `null` when the company never filed it, `undefined` when SEC did not answer. */
async function concept(cik: number, tag: string, unit: string, period: "annual" | "quarter"): Promise<Fact[] | null | undefined> {
  try {
    const r = await getJson(`${CONCEPT}/CIK${String(cik).padStart(10, "0")}/us-gaap/${tag}.json`);
    if (r.status === 404) return null;
    if (!r.body) return undefined; // 403, 429 and 5xx are outages
    const facts = (r.body as { units?: Record<string, Fact[]> }).units?.[unit];
    return period === "quarter" ? quarterlyFacts(facts) : annualFacts(facts);
  } catch {
    return undefined;
  }
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
};
function amount(v: number, unit: string): string {
  const a = Math.abs(v);
  if (unit !== "USD") return `$${a.toFixed(2)}`;
  return a >= 1e12 ? `$${(a / 1e12).toFixed(2)} trillion` : a >= 1e9 ? `$${(a / 1e9).toFixed(2)} billion`
    : a >= 1e6 ? `$${(a / 1e6).toFixed(2)} million` : `$${Math.round(a).toLocaleString("en-US")}`;
}
/** "net income" of -5 reads as "a net loss of $5". */
const figure = (label: string, v: number, unit: string): string =>
  `${v < 0 && label.endsWith("income") ? label.replace(/income$/, "loss") : label} of ${v < 0 && !label.endsWith("income") ? "-" : ""}${amount(v, unit)}`;

export async function getFundamentals(query: string, ticker: string): Promise<FundamentalsOutcome> {
  const metric = metricAsked(query);
  if (!metric) return { status: "unresolved" };
  const company = await lookupCik(ticker);
  if (company === undefined) return { status: "outage", label: metric.label };
  if (!company) return { status: "unresolved" };

  const quarter = quarterAsked(query);
  const period = quarter ? "quarter" : "annual";
  const series = await Promise.all(metric.tags.map((tag) => concept(company.cik, tag, metric.unit, period)));
  // A partial answer could be a subset tag standing in for the total, so any failure is an outage.
  if (series.some((s) => s === undefined)) return { status: "outage", label: metric.label };
  const filed = series.map((s, i) => ({ tag: metric.tags[i]!, facts: s ?? [] })).filter((s) => s.facts.length);
  if (!filed.length) return { status: "unresolved" };

  const year = quarter?.year ?? fiscalYearAsked(query);
  const pick = (facts: Fact[]) => {
    if (quarter) {
      return facts.filter((f) => fiscalYearOf(f.end) === quarter.year && f.fp === `Q${quarter.quarter}`).at(-1);
    }
    return year === null ? facts.at(-1) : facts.filter((f) => fiscalYearOf(f.end) === year).at(-1);
  };
  // The most recent period across tags (NVIDIA stopped filing contract revenue in 2022), then the largest value in it.
  const chosen = filed.map((s) => ({ ...s, fact: pick(s.facts) })).filter((s): s is typeof s & { fact: Fact } => !!s.fact)
    .sort((a, b) => b.fact.end.localeCompare(a.fact.end) || b.fact.val - a.fact.val)[0];
  const base = { subject: "equity" as const, name: company.name, chain: null };

  if (!chosen) {
    const latest = filed.flatMap((s) => s.facts).sort((a, b) => a.end.localeCompare(b.end)).at(-1)!;
    return {
      status: "answer",
      result: {
        ...base, verdict: "not_found", confidence: 0.6,
      reason: quarter
        ? `No 10-Q filed with the SEC reports ${company.name}'s ${metric.label} for fiscal Q${quarter.quarter} ${quarter.year}; ` +
          `the most recent quarterly figure is ${latest.val < 0 ? "-" : ""}${amount(latest.val, metric.unit)} for fiscal Q${latest.fp?.slice(1) ?? "?"} ${fiscalYearOf(latest.end)}, which ended ${longDate(latest.end)}.`
        : `No 10-K filed with the SEC reports ${company.name}'s ${metric.label} for fiscal year ${year}; ` +
          `the most recent annual figure is ${latest.val < 0 ? "-" : ""}${amount(latest.val, metric.unit)} ` +
          `for fiscal year ${fiscalYearOf(latest.end)}, which ended ${longDate(latest.end)}.`,
      },
    };
  }

  const { fact, tag } = chosen;
  const fy = fiscalYearOf(fact.end);
  const instant = !fact.start;
  const figures: FundamentalFigures = {
    metric: metric.label, tag, value: fact.val, unit: metric.unit, fiscal_year: fy, period_end: fact.end,
    form: String(fact.form), source: "SEC EDGAR XBRL",
  };
  if (quarter) figures.fiscal_quarter = quarter.quarter;
  let growth = "";
  if (/\bgrowth\b|\bgr[eo]w\b|\byoy\b|year[- ]over[- ]year|\bincrease|\bdecrease|\bdecline|\bchange/i.test(query)) {
    const prior = chosen.facts.filter((f) => {
      const gap = (Date.parse(fact.end) - Date.parse(f.end)) / DAY;
      return quarter
        ? gap >= 330 && gap <= 400 && f.fp === `Q${quarter.quarter}`
        : gap >= 350 && gap <= 380;
    }).at(-1);
    if (prior) {
      Object.assign(figures, { prior_value: prior.val, prior_period_end: prior.end });
      const priorText = quarter
        ? `${amount(prior.val, metric.unit)} in fiscal Q${quarter.quarter} ${fiscalYearOf(prior.end)}`
        : `${amount(prior.val, metric.unit)} in fiscal year ${fiscalYearOf(prior.end)}`;
      if (prior.val > 0) {
        const pct = ((fact.val - prior.val) / prior.val) * 100;
        figures.growth_pct = Math.round(pct * 100) / 100;
        growth = `, ${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(2)}% from ${priorText}`;
      } else {
        growth = `, against ${priorText}`;
      }
    }
  }
  const when = quarter
    ? `for fiscal Q${quarter.quarter} ${fy}, which ended ${longDate(fact.end)}`
    : instant ? `at the end of fiscal year ${fy} on ${longDate(fact.end)}` : `for fiscal year ${fy}, which ended ${longDate(fact.end)}`;
  return {
    status: "answer",
    result: {
      ...base, verdict: "financial_data", confidence: 0.9, fundamentals: figures,
      reason: `${company.name} reported ${figure(metric.label, fact.val, metric.unit)} ${when}${growth}, according to its ${figures.form} filed with the SEC.`,
    },
  };
}
