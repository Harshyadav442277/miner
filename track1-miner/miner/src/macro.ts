/**
 * MACRO_ECONOMIC_INDICATOR: a published statistic's latest print, from the
 * agency that publishes it, keyless (all checked 2026-10-14):
 *
 *   US CPI, core CPI, unemployment   BLS public API v1                  monthly
 *   US federal funds target range    New York Fed markets API (EFFR)    daily
 *   Euro area and EU HICP            Eurostat prc_hicp_minr (ECOICOP 2)  monthly; prc_hicp_manr stopped at 2025-12
 *   Euro area and EU unemployment    Eurostat une_rt_m                   monthly; the euro area is EA21 (Bulgaria, 2026)
 *   ECB deposit and refinancing      ECB Data Portal (FM)                daily
 *   Everything else, by country      World Bank WDI                      annual, and said to be
 *
 * A policy rate outside the US and the euro area is not read, and the answer
 * says so rather than reaching for a different statistic.
 */
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const TIMEOUT_MS = Number(process.env.MACRO_TIMEOUT_MS ?? 6_000);
const TTL_MS = 3 * 3_600_000;

export type Indicator = "cpi" | "core_cpi" | "unemployment" | "policy_rate" | "gdp_growth" | "gdp";

export interface Reading {
  indicator: Indicator;
  region: string;
  value: number | null;
  /** A second figure where the statistic has one: the top of a target range. */
  value_high?: number | null;
  unit: string;
  period: string | null;
  frequency: "daily" | "monthly" | "annual";
  series: string;
  source: string;
  source_url: string;
  /** For the federal funds rate: the effective rate on `period`. */
  effective?: number | null;
}

const EURO_AREA = new Set(["AT", "BE", "BG", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES"]);
const EU_OTHER = new Set(["CZ", "DK", "HU", "PL", "RO", "SE"]);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
// Withdrawn and private-use codes share live countries' names: DD (East
// Germany) is also "Germany" in ICU, and sorted before DE it took the lookup.
const NOT_A_COUNTRY = new Set(["DD", "FX", "YU", "CS", "SU", "ZR", "TP", "BU", "AN", "NT", "EU", "EZ", "UN", "AA", "ZZ"]);
const NAMES: Array<[string, string]> = [];
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b);
  if (NOT_A_COUNTRY.has(code) || code[0] === "X" || (code[0] === "Q" && code[1]! >= "M")) continue;
  const name = regionNames.of(code);
  if (name && name !== code && !/^Unknown/.test(name)) NAMES.push([name.toLowerCase(), code]);
}
NAMES.sort((x, y) => y[0].length - x[0].length);

/** "EA" for the euro area, else an ISO 3166 alpha-2 code; US when the question names a US statistic. */
export function macroRegion(text: string): string | null {
  const s = ` ${String(text ?? "").slice(0, 600).toLowerCase()} `;
  if (/\b(?:euro\s?area|euro\s?zone|ecb|hicp)\b/.test(s)) return "EA";
  if (/\b(?:u\.s\.|usa|us|united states|america|american|fed|federal reserve|fomc|federal funds|fed funds)\b/.test(s)) return "US";
  if (/\b(?:uk|u\.k\.|britain|british)\b/.test(s)) return "GB";
  for (const [name, code] of NAMES) if (s.includes(` ${name} `) || s.includes(` ${name}'s `) || s.includes(` ${name}?`) || s.includes(` ${name},`)) return code;
  return null;
}

export function indicatorsAsked(text: string): Indicator[] {
  const s = String(text ?? "").slice(0, 600);
  const out: Indicator[] = [];
  if (/\bcore\s+(?:cpi|inflation|consumer\s+prices?)\b/i.test(s)) out.push("core_cpi");
  if (/\b(?:cpi|inflation|consumer\s+prices?|hicp|price\s+index)\b/i.test(s.replace(/\bcore\s+(?:cpi|inflation)\b/gi, ""))) out.push("cpi");
  if (/\b(?:unemployment|jobless)\b/i.test(s)) out.push("unemployment");
  if (/\b(?:policy|interest|deposit(?:\s+facility)?|refinanc\w*|bank|repo|key|base|cash)\s+rates?\b|\b(?:fed(?:eral)?\s+funds|target\s+range|fomc)\b/i.test(s)) out.push("policy_rate");
  if (/\bgdp\b[^.?]*\b(?:growth|grew|grow|growing|expand\w*|contract\w*)\b|\b(?:growth|grew|grow)\b[^.?]*\bgdp\b|\beconomic\s+growth\b/i.test(s)) out.push("gdp_growth");
  else if (/\bgdp\b|\bgross\s+domestic\s+product\b/i.test(s)) out.push("gdp");
  return out;
}

const cache = new Map<string, { at: number; value: unknown }>();
async function getJson(url: string): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const value = await r.json();
  cache.set(url, { at: Date.now(), value });
  return value;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthName = (ym: string): string => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** BLS rows: the latest month, and for an index its change on the same month a year earlier. Pure. */
export function blsReading(body: unknown, yoy: boolean): { value: number; period: string } | null {
  const rows = ((body as { Results?: { series?: Array<{ data?: Array<{ year: string; period: string; value: string }> }> } })
    .Results?.series?.[0]?.data ?? []).filter((r) => /^M(0[1-9]|1[0-2])$/.test(r.period));
  const latest = rows[0];
  if (!latest) return null;
  const period = `${latest.year}-${latest.period.slice(1)}`;
  if (!yoy) return { value: Number(latest.value), period };
  const prior = rows.find((r) => Number(r.year) === Number(latest.year) - 1 && r.period === latest.period);
  if (!prior) return null;
  return { value: Number(((Number(latest.value) / Number(prior.value) - 1) * 100).toFixed(1)), period };
}

async function bls(series: string, indicator: Indicator, yoy: boolean): Promise<Reading | null> {
  const body = await getJson(`https://api.bls.gov/publicAPI/v1/timeseries/data/${series}`);
  const r = blsReading(body, yoy);
  return r && { indicator, region: "US", value: r.value, unit: "%", period: r.period, frequency: "monthly", series,
    source: "US Bureau of Labor Statistics", source_url: `https://data.bls.gov/timeseries/${series}` };
}

/** The latest non-empty value of a Eurostat JSON-stat response. Pure. */
export function eurostatReading(body: unknown): { value: number; period: string } | null {
  const j = body as { value?: Record<string, number>; dimension?: { time?: { category?: { index?: Record<string, number> } } } };
  const times = Object.entries(j.dimension?.time?.category?.index ?? {}).sort((a, b) => b[1] - a[1]);
  for (const [period, i] of times) if (j.value?.[String(i)] !== undefined) return { value: j.value[String(i)]!, period };
  return null;
}

async function eurostat(dataset: string, query: string, indicator: Indicator, region: string): Promise<Reading | null> {
  const body = await getJson(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?${query}&lastTimePeriod=3`);
  const r = eurostatReading(body);
  return r && { indicator, region, value: r.value, unit: "%", period: r.period, frequency: "monthly", series: `${dataset}?${query}`,
    source: "Eurostat", source_url: `https://ec.europa.eu/eurostat/databrowser/view/${dataset}/default/table` };
}

async function ecbRate(key: string): Promise<{ value: number; period: string } | null> {
  const j = (await getJson(`https://data-api.ecb.europa.eu/service/data/FM/${key}?lastNObservations=1&format=jsondata`)) as {
    dataSets?: Array<{ series?: Record<string, { observations?: Record<string, number[]> }> }>;
    structure?: { dimensions?: { observation?: Array<{ values?: Array<{ id: string }> }> } };
  };
  const obs = Object.entries(Object.values(j.dataSets?.[0]?.series ?? {})[0]?.observations ?? {})[0];
  const period = obs ? j.structure?.dimensions?.observation?.[0]?.values?.[Number(obs[0])]?.id : undefined;
  return obs && period && typeof obs[1][0] === "number" ? { value: obs[1][0], period } : null;
}

const WDI: Partial<Record<Indicator, [string, string]>> = {
  cpi: ["FP.CPI.TOTL.ZG", "%"], unemployment: ["SL.UEM.TOTL.ZS", "%"], gdp_growth: ["NY.GDP.MKTP.KD.ZG", "%"], gdp: ["NY.GDP.MKTP.CD", "USD"],
};

async function worldBank(indicator: Indicator, region: string): Promise<Reading | null> {
  const w = WDI[indicator];
  if (!w) return null;
  const code = region === "EA" ? "EMU" : region;
  const j = (await getJson(`https://api.worldbank.org/v2/country/${code}/indicator/${w[0]}?format=json&mrnev=1`)) as [unknown, Array<{ date: string; value: number | null }>?];
  const row = j[1]?.[0];
  return row && row.value !== null ? { indicator, region, value: Number(row.value.toFixed(w[1] === "%" ? 1 : 0)), unit: w[1], period: row.date,
    frequency: "annual", series: w[0], source: "World Bank World Development Indicators", source_url: `https://data.worldbank.org/indicator/${w[0]}?locations=${code}` } : null;
}

/** The reading for one indicator in one region, from its publisher; null when not covered. */
export async function readIndicator(indicator: Indicator, region: string): Promise<Reading | null> {
  const eu = region === "EA" || EURO_AREA.has(region) || EU_OTHER.has(region);
  const geo = region === "GR" ? "EL" : region;
  if (region === "US") {
    if (indicator === "cpi") return bls("CUUR0000SA0", "cpi", true);
    if (indicator === "core_cpi") return bls("CUUR0000SA0L1E", "core_cpi", true);
    if (indicator === "unemployment") return bls("LNS14000000", "unemployment", false);
    if (indicator === "policy_rate") {
      const j = (await getJson("https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json")) as {
        refRates?: Array<{ effectiveDate: string; percentRate: number; targetRateFrom: number; targetRateTo: number }>;
      };
      const r = j.refRates?.[0];
      return r ? { indicator, region, value: r.targetRateFrom, value_high: r.targetRateTo, effective: r.percentRate, unit: "%", period: r.effectiveDate,
        frequency: "daily", series: "EFFR", source: "Federal Reserve Bank of New York", source_url: "https://www.newyorkfed.org/markets/reference-rates/effr" } : null;
    }
  }
  if (eu && indicator === "cpi") return eurostat("prc_hicp_minr", `geo=${geo}&unit=RCH_A&coicop18=TOTAL`, "cpi", region);
  if (eu && indicator === "unemployment") return eurostat("une_rt_m", `geo=${region === "EA" ? "EA21" : geo}&s_adj=SA&age=TOTAL&sex=T&unit=PC_ACT`, "unemployment", region);
  if ((region === "EA" || EURO_AREA.has(region)) && indicator === "policy_rate") {
    const [dfr, mro] = await Promise.all([ecbRate("D.U2.EUR.4F.KR.DFR.LEV"), ecbRate("D.U2.EUR.4F.KR.MRR_FR.LEV")]);
    return dfr ? { indicator, region: "EA", value: dfr.value, value_high: mro?.value ?? null, unit: "%", period: dfr.period, frequency: "daily",
      series: "FM.D.U2.EUR.4F.KR.DFR.LEV", source: "European Central Bank", source_url: "https://data.ecb.europa.eu/main-figures/ecb-interest-rates-and-exchange-rates/key-ecb-interest-rates" } : null;
  }
  if (indicator === "policy_rate" || indicator === "core_cpi") return null;
  return worldBank(indicator, region);
}

const LABEL: Record<Indicator, string> = {
  cpi: "consumer price inflation", core_cpi: "core consumer price inflation", unemployment: "unemployment rate",
  policy_rate: "policy rate", gdp_growth: "real GDP growth", gdp: "GDP",
};

export function describe(r: Reading): string {
  const where = r.region === "EA" ? "the euro area" : r.region === "US" ? "the US" : regionNames.of(r.region) ?? r.region;
  const when = r.frequency === "monthly" && r.period ? monthName(r.period) : r.period;
  if (r.indicator === "policy_rate" && r.region === "US") {
    return `The federal funds target range is ${r.value!.toFixed(2)}% to ${r.value_high!.toFixed(2)}%; the effective rate was ${r.effective!.toFixed(2)}% on ${r.period} (${r.source}).`;
  }
  if (r.indicator === "policy_rate") {
    return `The ECB deposit facility rate is ${r.value!.toFixed(2)}%${r.value_high != null ? ` and its main refinancing rate ${r.value_high.toFixed(2)}%` : ""}, as of ${r.period} (${r.source}).`;
  }
  if (r.indicator === "gdp") return `${where[0]!.toUpperCase()}${where.slice(1)}'s GDP was $${(r.value! / 1e12).toFixed(2)} trillion in ${when} (current US dollars; ${r.source}, annual).`;
  const v = r.value!.toFixed(1);
  const rate = r.indicator === "unemployment" || r.frequency === "annual" ? `${v}%` : `${v}% year on year`;
  return `${LABEL[r.indicator][0]!.toUpperCase()}${LABEL[r.indicator].slice(1)} in ${where} was ${rate} in ${when} (${r.source}${r.frequency === "annual" ? ", annual figure" : ""}).`;
}

export interface MacroResult {
  region: string | null;
  verdict: "reported" | "not_covered" | "unknown";
  confidence: number;
  reason: string;
  error?: string;
  indicators: Reading[];
  not_covered: string[];
}

export async function macroIndicators(question: string, indicatorParam = "", countryParam = ""): Promise<MacroResult> {
  const asked = indicatorsAsked(`${indicatorParam} ${question}`);
  const region = macroRegion(countryParam) ?? macroRegion(question) ?? (asked.includes("policy_rate") && /\bfed\b/i.test(question) ? "US" : null);
  if (!asked.length || !region) {
    return { region, verdict: "unknown", confidence: 0, error: !asked.length ? "no_indicator" : "no_region", indicators: [], not_covered: [],
      reason: !asked.length
        ? "No macroeconomic statistic was named, so nothing was looked up. Name one, for example: What was the latest US CPI year-over-year print?"
        : "No country or region was named, so no statistic was looked up. Name one, for example the US, the euro area or Japan." };
  }
  const results = await Promise.all(asked.map((i) => readIndicator(i, region).then((r) => ({ i, r }), () => ({ i, r: undefined }))));
  const readings = results.flatMap((x) => (x.r ? [x.r] : []));
  const where = region === "EA" ? "the euro area" : regionNames.of(region) ?? region;
  const notCovered = results.filter((x) => x.r === null).map((x) => `${LABEL[x.i]} for ${where}`);
  const down = results.filter((x) => x.r === undefined).map((x) => `${LABEL[x.i]} for ${where}`);
  const tail = (notCovered.length ? ` The ${notCovered.join(" and ")} is not read here.` : "") +
    (down.length ? ` The ${down.join(" and ")} could not be retrieved because its publisher did not answer.` : "");
  if (!readings.length) {
    return { region, verdict: down.length ? "unknown" : "not_covered", confidence: 0, error: down.length ? "upstream_unavailable" : "not_covered",
      indicators: [], not_covered: notCovered, reason: `No figure is reported.${tail}` };
  }
  return { region, verdict: "reported", confidence: down.length ? 0.6 : 0.95, indicators: readings, not_covered: notCovered,
    reason: `${readings.map(describe).join(" ")}${tail}` };
}
