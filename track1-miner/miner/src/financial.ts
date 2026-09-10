/**
 * FINANCIAL_DATA — market data and statistics, deliberately *beyond* one price.
 *
 * The canonical description draws the line itself:
 *
 *   "Query asks for market data, company fundamentals, or financial statistics
 *    beyond a single quoted price. Example: 'Give the market cap and 24h trading
 *    volume for token X on base.' or 'What is Apple's P/E ratio and revenue
 *    growth this quarter?' … Not: 'What is the price of token X?' or 'What is
 *    Apple's share price?' alone (single quoted price) → CRYPTO_PRICE or
 *    STOCK_PRICE."
 *
 * So a bare price is the WRONG answer here even when it is the right number, and
 * the two worked examples are different asset classes. This file therefore
 * answers two subjects from two sources:
 *
 *   token   — GeckoTerminal: price, market cap, fully diluted valuation, 24h
 *             volume and supply, keyed by contract address and chain. The same
 *             provider tvl.ts already uses.
 *   equity  — Yahoo's chart endpoint: last price, day range, volume, 52-week
 *             range and change on the day, with the ticker resolved from a
 *             company name through Yahoo's search endpoint.
 *
 * WHAT IS HONESTLY NOT COVERED. Company *fundamentals* — P/E, revenue growth,
 * margins — sit behind Yahoo's `quoteSummary`, which returns HTTP 401 "Invalid
 * Crumb" without a session (verified 2026-09-10). No keyless source for them was
 * found. A question asking for a P/E ratio is answered with the market data we
 * do hold and an explicit statement that the ratio was not retrieved, rather
 * than a number derived from something else and presented as the ratio.
 */

const TIMEOUT_MS = Number(process.env.FINANCIAL_TIMEOUT_MS ?? 5_000);
// Yahoo returns 401 to an unfamiliar user-agent, in the same way ESPN does.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const GECKO = "https://api.geckoterminal.com/api/v2/networks";
const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search";

/** Chain words to GeckoTerminal network ids. Ethereum last, as in tvl.ts and gas.ts. */
const NETWORKS: Array<[RegExp, string, string]> = [
  [/\bbase\b/i, "base", "base"],
  [/\barbitrum\b|\barb\b/i, "arbitrum", "arbitrum"],
  [/\boptimism\b|\bop\s+mainnet\b/i, "optimism", "optimism"],
  [/\bpolygon\b|\bmatic\b/i, "polygon_pos", "polygon"],
  [/\bbsc\b|\bbnb\b|\bbinance smart chain\b/i, "bsc", "bsc"],
  [/\bavalanche\b|\bavax\b/i, "avax", "avalanche"],
  [/\bsolana\b/i, "solana", "solana"],
  [/\bethereum\b|\bmainnet\b|\beth\b|\bl1\b/i, "eth", "ethereum"],
];

export type FinancialSubject = "token" | "equity";
export type FinancialVerdict = "financial_data" | "not_found" | "unknown";

export interface FinancialResult {
  subject: FinancialSubject | null;
  name: string | null;
  chain: string | null;
  verdict: FinancialVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/** An EVM contract address makes the question a token question outright. */
export function contractAddress(text: string): string | null {
  return String(text ?? "").match(/\b0x[a-fA-F0-9]{40}\b/)?.[0]?.toLowerCase() ?? null;
}

export function resolveNetwork(text: string): { gecko: string; label: string } | null {
  const hit = NETWORKS.find(([re]) => re.test(String(text ?? "")));
  return hit ? { gecko: hit[1], label: hit[2] } : null;
}

/** Words that look like tickers but are ordinary English, so they are not treated as one. */
const NOT_A_TICKER = new Set([
  "THE", "AND", "FOR", "WHAT", "IS", "ARE", "PE", "P", "E", "USD", "EUR", "GBP", "CEO", "IPO",
  "ETF", "API", "USA", "US", "UK", "EU", "Q1", "Q2", "Q3", "Q4", "YOY", "TTM", "EPS", "GIVE",
  "THIS", "THAT", "WITH", "FROM", "DATA", "CAP", "24H", "VS", "ON", "IN", "OF", "TO", "A", "AN",
]);

/**
 * A ticker written explicitly, e.g. "AAPL" or "$TSLA".
 *
 * A bare uppercase run is ambiguous with ordinary words in a sentence, so this
 * only accepts a `$`-prefixed symbol or an uppercase token that is not common
 * English. A miss here falls through to the company-name search, which is the
 * safer resolver.
 */
export function explicitTicker(text: string): string | null {
  const s = String(text ?? "");
  const dollar = s.match(/\$([A-Za-z][A-Za-z.-]{0,5})\b/);
  if (dollar?.[1]) return dollar[1].toUpperCase();
  for (const m of s.matchAll(/\b([A-Z][A-Z.]{1,5})\b/g)) {
    const t = m[1] ?? "";
    if (!NOT_A_TICKER.has(t.replace(/\./g, ""))) return t;
  }
  return null;
}

/**
 * Words that open a question rather than name a company. A capitalised run is
 * matched greedily, so "Will Sandoz's Fidaxomicin sales exceed expectations?"
 * yielded the name "Will Sandoz" — and Yahoo's search resolves "Sandoz" to
 * SDZ.SW and "Will Sandoz" to nothing at all. This is the "Will Dubai" defect
 * that refused fourteen WEATHER_CHECK questions, in a second intent.
 */
const NOT_A_COMPANY = new Set([
  "will", "is", "are", "was", "were", "do", "does", "did", "can", "could",
  "should", "would", "has", "have", "had", "what", "when", "why", "how",
  "which", "who", "the", "a", "an", "give", "show", "tell", "report",
  "provide", "and", "for", "of", "about", "in", "on", "to",
]);

/** Stop words trimmed off both ends of a capitalised run, never from the middle. */
function trimName(run: string): string | null {
  let words = run.split(/\s+/).filter(Boolean);
  while (words.length && NOT_A_COMPANY.has(words[0]!.toLowerCase())) words = words.slice(1);
  while (words.length && NOT_A_COMPANY.has(words[words.length - 1]!.toLowerCase())) words = words.slice(0, -1);
  return words.length ? words.join(" ") : null;
}

/**
 * The company name for the ticker search.
 *
 * A possessive or an "of X" phrase is the strongest signal, and a leading
 * capitalised run is the fallback: twelve of the fourteen routed FINANCIAL_DATA
 * questions are "Will <subject> ...?" and named no company by either of the
 * first two patterns, so every one was refused. Yahoo's search stays the
 * arbiter — "Zepbound", "YESAFILI" and "Novitium Pharma" resolve to nothing
 * there and are still refused rather than answered with a guess.
 */
export function companyName(text: string): string | null {
  const s = String(text ?? "").replace(/[?!.]+\s*$/, "");
  const poss = s.match(/\b([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3})['’]s\b/);
  if (poss?.[1]) {
    const trimmed = trimName(poss[1]);
    if (trimmed) return trimmed;
  }
  const of = s.match(/\b(?:for|of|about)\s+([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3})/);
  if (of?.[1]) {
    const trimmed = trimName(of[1]);
    if (trimmed) return trimmed;
  }
  for (const m of s.matchAll(/\b[A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3}/g)) {
    const trimmed = trimName(m[0]);
    // One capitalised letter is an initial, not a searchable name.
    if (trimmed && trimmed.length > 1) return trimmed;
  }
  return null;
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const money = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
const human = (n: number): string =>
  Math.abs(n) >= 1e12 ? `$${(n / 1e12).toFixed(2)} trillion`
    : Math.abs(n) >= 1e9 ? `$${(n / 1e9).toFixed(2)} billion`
      : Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)} million`
        : money(n);
/** Prices need more precision than totals; a sub-cent token price must not round to $0. */
const price = (n: number): string =>
  n >= 1 ? `$${n.toFixed(2)}` : `$${n.toPrecision(4).replace(/0+$/, "").replace(/\.$/, "")}`;

/** Whether the question asked for fundamentals we cannot retrieve. */
export function asksFundamentals(text: string): string[] {
  const s = String(text ?? "");
  const found: string[] = [];
  if (/\bp\/?e\b|price[- ]to[- ]earnings/i.test(s)) found.push("price-to-earnings ratio");
  if (/\brevenue growth\b|\brevenue\b/i.test(s)) found.push("revenue growth");
  if (/\bmargin/i.test(s)) found.push("margins");
  if (/\beps\b|earnings per share/i.test(s)) found.push("earnings per share");
  return found;
}

export async function tokenData(address: string, network: string, label: string): Promise<FinancialResult> {
  const base = { subject: "token" as const, name: null, chain: label };
  let a: Record<string, unknown>;
  try {
    const j = (await getJson(`${GECKO}/${network}/tokens/${encodeURIComponent(address)}`)) as {
      data?: { attributes?: Record<string, unknown> };
    };
    if (!j.data?.attributes) {
      return {
        ...base, verdict: "not_found", confidence: 0.5,
        reason:
          `No market data is tracked for the token at ${address} on ${label}. The contract was not ` +
          `found in the indexed markets, so no figures are reported for it.`,
      };
    }
    a = j.data.attributes;
  } catch (e) {
    if (String((e as Error).message) === "HTTP 404") {
      return {
        ...base, verdict: "not_found", confidence: 0.5,
        reason: `No market data is tracked for the token at ${address} on ${label}.`,
      };
    }
    return {
      ...base, verdict: "unknown", confidence: 0,
      reason:
        `Market data for the token at ${address} on ${label} could not be retrieved because the ` +
        `market data provider did not respond. This is an availability problem here, not a ` +
        `statement that the token has no market.`,
      error: "provider_unavailable",
    };
  }

  const sym = String(a.symbol ?? "") || "the token";
  const nm = String(a.name ?? "") || sym;
  const p = Number.parseFloat(String(a.price_usd ?? ""));
  const mcap = Number.parseFloat(String(a.market_cap_usd ?? ""));
  const fdv = Number.parseFloat(String(a.fdv_usd ?? ""));
  const vol = Number.parseFloat(String((a.volume_usd as { h24?: string } | undefined)?.h24 ?? ""));

  // At least one statistic beyond the price must exist, or this is a
  // CRYPTO_PRICE answer wearing the wrong hat.
  const stats: string[] = [];
  if (Number.isFinite(mcap) && mcap > 0) stats.push(`a market capitalisation of ${money(mcap)} (${human(mcap)})`);
  if (Number.isFinite(vol) && vol > 0) stats.push(`24-hour trading volume of ${money(vol)} (${human(vol)})`);
  if (Number.isFinite(fdv) && fdv > 0) stats.push(`a fully diluted valuation of ${money(fdv)} (${human(fdv)})`);

  if (stats.length === 0) {
    return {
      ...base, name: nm, verdict: "not_found", confidence: 0.4,
      reason:
        `The token at ${address} on ${label} is ${nm} (${sym}), but no market capitalisation, ` +
        `volume or valuation figures are published for it, so no financial statistics are reported.`,
    };
  }

  const priced = Number.isFinite(p) ? ` It last traded at ${price(p)}.` : "";
  return {
    ...base, name: nm, verdict: "financial_data", confidence: 0.9,
    reason:
      `${nm} (${sym}) at ${address} on ${label} has ${stats.join(", ")}.${priced} ` +
      `These are market statistics for the token, not a single quoted price.`,
  };
}

export async function equityData(query: string, ticker: string): Promise<FinancialResult> {
  const base = { subject: "equity" as const, name: null, chain: null };
  let meta: Record<string, unknown>;
  try {
    const j = (await getJson(`${YAHOO_CHART}/${encodeURIComponent(ticker)}?range=5d&interval=1d`)) as {
      chart?: { result?: Array<{ meta?: Record<string, unknown> }> };
    };
    const m = j.chart?.result?.[0]?.meta;
    if (!m) {
      return {
        ...base, verdict: "not_found", confidence: 0.5,
        reason: `No market data was found for the symbol ${ticker}.`,
      };
    }
    meta = m;
  } catch (e) {
    if (/^HTTP (404|400)$/.test(String((e as Error).message))) {
      return {
        ...base, verdict: "not_found", confidence: 0.5,
        reason: `No market data was found for the symbol ${ticker}.`,
      };
    }
    return {
      ...base, verdict: "unknown", confidence: 0,
      reason:
        `Market data for ${ticker} could not be retrieved because the market data provider did not ` +
        `respond. This is an availability problem here, not a statement about the company.`,
      error: "provider_unavailable",
    };
  }

  const nm = String(meta.longName ?? meta.shortName ?? ticker);
  const cur = String(meta.currency ?? "USD");
  const last = Number(meta.regularMarketPrice);
  const prev = Number(meta.chartPreviousClose);
  const hi = Number(meta.regularMarketDayHigh);
  const lo = Number(meta.regularMarketDayLow);
  const vol = Number(meta.regularMarketVolume);
  const wkHi = Number(meta.fiftyTwoWeekHigh);
  const wkLo = Number(meta.fiftyTwoWeekLow);

  const stats: string[] = [];
  if (Number.isFinite(lo) && Number.isFinite(hi)) stats.push(`a day range of ${lo.toFixed(2)} to ${hi.toFixed(2)} ${cur}`);
  if (Number.isFinite(vol) && vol > 0) stats.push(`volume of ${vol.toLocaleString("en-US")} shares`);
  if (Number.isFinite(wkLo) && Number.isFinite(wkHi)) stats.push(`a 52-week range of ${wkLo.toFixed(2)} to ${wkHi.toFixed(2)} ${cur}`);
  if (Number.isFinite(last) && Number.isFinite(prev) && prev > 0) {
    const pct = ((last - prev) / prev) * 100;
    stats.push(`a change of ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% against the previous close of ${prev.toFixed(2)} ${cur}`);
  }

  if (stats.length === 0) {
    return {
      ...base, name: nm, verdict: "not_found", confidence: 0.4,
      reason: `${nm} (${ticker}) was found, but no market statistics beyond the last price are published for it.`,
    };
  }

  // Fundamentals are behind an authenticated endpoint. Say so rather than
  // letting the caller read the market data as an answer to a P/E question.
  const wanted = asksFundamentals(query);
  const gap = wanted.length
    ? ` The ${wanted.join(" and ")} ${wanted.length > 1 ? "were" : "was"} not retrieved: company ` +
      `fundamentals are not available from this data source, so ${wanted.length > 1 ? "they are" : "it is"} ` +
      `not reported here.`
    : "";
  const priced = Number.isFinite(last) ? ` It last traded at ${last.toFixed(2)} ${cur}.` : "";

  return {
    ...base, name: nm, verdict: "financial_data", confidence: 0.9,
    reason: `${nm} (${ticker}) has ${stats.join(", ")}.${priced}${gap}`,
  };
}

/**
 * Whether a search hit is actually the company that was asked about.
 *
 * Yahoo's search is fuzzy, and fuzzy is dangerous here: "Iran" returns the
 * Brazilian paper company IRANI, and reporting its market data as the answer to
 * "Will Iran's inflation rate decrease?" would be exactly the confidently-wrong
 * answer this miner refuses everywhere else. The first word of the asked name
 * therefore has to appear as a WHOLE word in the hit's own name or symbol —
 * which "SUN PHARMACEUTICAL IND L" satisfies for "Sun Pharma" and "IRANI ON NM"
 * does not satisfy for "Iran".
 */
export function nameMatchesQuote(name: string, quote: { symbol?: string; shortname?: string; longname?: string }): boolean {
  const head = name.split(/\s+/).filter(Boolean)[0] ?? "";
  if (head.length < 3) return false;
  const haystack = [quote.symbol, quote.shortname, quote.longname].filter(Boolean).join(" ").toUpperCase();
  const escaped = head.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`).test(haystack);
}

/** One Yahoo search, filtered to hits that really name the company asked about. */
async function searchTicker(name: string): Promise<string | null> {
  try {
    const j = (await getJson(
      `${YAHOO_SEARCH}?q=${encodeURIComponent(name)}&quotesCount=5&newsCount=0`,
    )) as { quotes?: Array<{ symbol?: string; quoteType?: string; shortname?: string; longname?: string }> };
    const quotes = (j.quotes ?? []).filter((q) => q.symbol && nameMatchesQuote(name, q));
    const eq = quotes.find((q) => q.quoteType === "EQUITY" && !q.symbol!.includes("."));
    return eq?.symbol ?? quotes[0]?.symbol ?? null;
  } catch {
    return null;
  }
}

/**
 * Company name to ticker, through Yahoo's own search, shortening on a miss.
 *
 * "Will Apple AirPods 5 sell well?" and "Will Hitachi CO2 heat pumps sell well?"
 * name a product after the company, and Yahoo resolves neither phrase; it
 * resolves "Apple" and "Hitachi". So the leading words are tried in turn once
 * the full phrase misses. Yahoo stays the arbiter: "Zepbound", "YESAFILI" and
 * "Novitium Pharma" resolve to nothing at any length and are still refused.
 */
export async function resolveTicker(name: string, shorten = true): Promise<string | null> {
  const words = String(name ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  // Shortening a whole SENTENCE is not the same as shortening a name. The
  // fallback that hands this function the raw question would otherwise trim
  // "market data please" down to "market", which Yahoo happily resolves to
  // Vanguard's total-market ETF — a confident answer to a question that named
  // no subject at all. Only a name the extractor actually found is shortened.
  if (!shorten) return searchTicker(words.join(" "));
  // At most three attempts: the search is a network round-trip inside the
  // route's budget, and a name is not made more findable by a fourth trim.
  for (let length = words.length; length >= 1 && length > words.length - 3; length--) {
    const hit = await searchTicker(words.slice(0, length).join(" "));
    if (hit) return hit;
  }
  return null;
}

export async function getFinancialData(query: string, addressParam = "", symbolParam = ""): Promise<FinancialResult> {
  const address = contractAddress(addressParam) ?? contractAddress(query);
  if (address) {
    const net = resolveNetwork(`${addressParam} ${query}`) ?? { gecko: "eth", label: "ethereum" };
    return tokenData(address, net.gecko, net.label);
  }

  const named = companyName(query);
  const declared = String(symbolParam ?? "").trim().toUpperCase();
  const ticker = /^[A-Z][A-Z.-]{0,5}$/.test(declared)
    ? declared
    : explicitTicker(query) ?? (await (named ? resolveTicker(named) : resolveTicker(query, false)));

  if (!ticker) {
    return {
      subject: null, name: null, chain: null, verdict: "unknown", confidence: 0,
      reason:
        "No company, ticker symbol or token contract was identified in this request, so no market " +
        "data could be looked up. Name a listed company or ticker, or a token contract address with " +
        "its chain, and the market statistics for it can be returned.",
      error: "no_subject",
    };
  }
  return equityData(query, ticker);
}
