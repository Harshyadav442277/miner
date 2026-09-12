/**
 * STOCK_PRICE — one listed equity's current or historical share price.
 *
 * The honesty problem specific to this intent is the market clock. Outside the
 * regular session every quote source still returns a "price", and it is the last
 * close — hours or a weekend old. Presenting that as the live price is the stale
 * answer A5 forbids, so every answer states whether the exchange's regular
 * session is open right now and the exact exchange-local time of the quote.
 *
 * Sources, keyless, verified live 2026-09-12 (a Saturday, market closed):
 *   Yahoo chart   /v8/finance/chart/{SYM}   price, regularMarketTime, the session window
 *   Nasdaq quote  /api/quote/{SYM}/info     last sale and market status, US listings only
 * Both are read concurrently; Yahoo is the headline because it carries the
 * session window that decides open-or-closed, Nasdaq is the failover. The
 * company-name to ticker step reuses financial.ts's Yahoo search, which already
 * refuses fuzzy hits that name a different company.
 *
 * The routed STOCK_PRICE traffic is thirteen "Will <company> stock rise?"
 * questions. A rise is a forecast and none is made: the answer gives the price
 * the question can be grounded in and says plainly that it is not a prediction.
 */
import { companyName, resolveTickerChecked } from "./financial";

const TIMEOUT_MS = Number(process.env.STOCK_TIMEOUT_MS ?? 4_000);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const NASDAQ = "https://api.nasdaq.com/api/quote";

export type StockVerdict = "price" | "historical_price" | "not_found" | "unknown";

export interface StockPriceResult {
  ticker: string | null;
  name: string | null;
  verdict: StockVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/**
 * Capitalised tokens that sit in ticker position but are not tickers. "(USD)" in
 * "What is Apple share price (USD)?" returned ProShares Ultra Semiconductors,
 * whose ticker is USD, on 2026-09-12.
 */
const NOT_TICKER = new Set(["USD", "EUR", "GBP", "JPY", "INR", "CAD", "AUD", "CHF", "CNY", "HKD", "SGD", "KRW", "BRL",
  "NYSE", "NASDAQ", "LSE", "TSX", "ADR", "ETF", "UTC", "GMT", "EST", "EDT", "ET", "PT", "IST", "AM", "PM", "US", "USA", "UK", "EU",
  "CEO", "IPO", "EPS", "YTD", "TTM", "AI"]);

/** A ticker the question writes as one: "(AAPL)", "$TSLA", "NASDAQ: MSFT", "ticker NVDA". */
export function writtenTicker(text: string): string | null {
  const s = String(text ?? "");
  // Case-sensitive on the captured symbol: with an `i` flag "ticker for Tesla"
  // read FOR (Forestar Group) as the ticker on 2026-09-12. Only the keyword may
  // be in any case; the symbol must be written in capitals.
  const patterns = [
    /\(([A-Z][A-Z.-]{0,6})\)/g,
    /\$([A-Za-z][A-Za-z.-]{0,5})\b/g,
    /\b(?:NASDAQ|NYSE|[Tt][Ii][Cc][Kk][Ee][Rr]|[Ss][Yy][Mm][Bb][Oo][Ll])\s*:?\s*([A-Z][A-Z.-]{0,6})\b/g,
  ];
  for (const re of patterns) {
    for (const m of s.matchAll(re)) {
      const t = m[1]?.toUpperCase();
      if (t && !NOT_TICKER.has(t)) return t;
    }
  }
  return null;
}

/**
 * Whether the question is about a share price at all. A misrouted "What is the
 * 24-hour weather forecast for Auckland?" resolved to Auckland International
 * Airport (AUKNY) and was priced on 2026-09-12. A strong equity word settles it;
 * a weak price word counts only when no other domain is named.
 */
export function asksAboutStock(text: string): boolean {
  const s = String(text ?? "");
  if (/\b(?:stocks?|shares?|equity|equities|ticker|symbol|nasdaq|nyse|listed|listing|market\s+cap|traded|trading|stock\s+exchange|dividend|ipo)\b/i.test(s)) return true;
  const weak = /\b(?:price|priced|quote|close[sd]?|closing|worth|valued?|valuation|rise|fall|drop|rally)\b/i.test(s);
  const other = /\b(?:weather|forecast|temperature|rain|snow|flights?|airfare|tickets?|hotels?|rent|salary|recipe|house|home|car|gas|petrol|fuel|gold|silver|oil|bitcoin|crypto|token|coin|eth|btc)\b/i.test(s);
  return weak && !other;
}

/** "Will X stock rise?" asks for a forecast; the price is answered, the forecast is declined. */
export function asksForecast(text: string): boolean {
  return /\bwill\b[^?]*\b(?:rise|fall|drop|climb|increase|decrease|go\s+(?:up|down)|crash|rally|recover)\b/i.test(String(text ?? ""));
}

/**
 * Every word of the asked name must appear in the listing's name.
 *
 * financial.ts's search filter checks only the first word, which is right for
 * finding candidates and wrong for a price: "Will Fresenius Kabi stock drop?"
 * resolved to Fresenius Medical Care (FMS) on 2026-09-12 — a different company,
 * whose price would have been the substituted subject A5 forbids. Kabi is not
 * listed on its own, so the honest answer is that no listing matches.
 * A whole-word prefix of four letters or more counts, so "Sun Pharma" still matches
 * "Sun Pharmaceutical" while "Apple" does not match "Applied".
 */
export function companyMatches(named: string, listed: string): boolean {
  const tokens = (s: string): string[] => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !/^(inc|corp|corporation|co|company|ltd|plc|sa|ag|nv|se|the|and|of)$/.test(w));
  const have = tokens(listed);
  return tokens(named).every((w) => have.some((h) => h === w || (w.length >= 4 && h.length >= 4 && (h.startsWith(w) || w.startsWith(h)))));
}

export function requestedDate(text: string): string | null {
  return String(text ?? "").match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ?? null;
}

export interface ChartMeta {
  symbol?: string; longName?: string; shortName?: string; currency?: string; instrumentType?: string;
  exchangeName?: string; fullExchangeName?: string; exchangeTimezoneName?: string;
  regularMarketPrice?: number; regularMarketTime?: number;
  currentTradingPeriod?: { regular?: { start?: number; end?: number } };
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Exchange-local wall time, e.g. "Fri 11 Sep 2026 16:00 America/New_York". */
export function exchangeTime(epochSec: number, zone: string): string {
  const d = new Date(epochSec * 1000);
  try {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    return `${f.format(d).replace(/,/g, "")} ${zone}`;
  } catch {
    return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  }
}

/** Open means now lies inside the regular session the exchange itself reports. */
export function sessionOpen(meta: ChartMeta, nowSec: number): boolean | null {
  const start = meta.currentTradingPeriod?.regular?.start;
  const end = meta.currentTradingPeriod?.regular?.end;
  if (typeof start !== "number" || typeof end !== "number") return null;
  return nowSec >= start && nowSec < end;
}

/** The headline sentence for a quote, which is where "live" versus "last close" is decided. */
export function describeQuote(meta: ChartMeta, nowSec: number): string | null {
  const price = Number(meta.regularMarketPrice);
  const t = Number(meta.regularMarketTime);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(t)) return null;
  const zone = meta.exchangeTimezoneName ?? "UTC";
  const cur = meta.currency ?? "USD";
  const name = meta.longName ?? meta.shortName ?? meta.symbol ?? "";
  const venue = meta.fullExchangeName ?? meta.exchangeName ?? "its exchange";
  const open = sessionOpen(meta, nowSec);
  const px = `${price.toFixed(2)} ${cur}`;
  if (open === true) {
    return `${name} (${meta.symbol}) is trading at ${px} on ${venue}, quoted at ${exchangeTime(t, zone)}; the regular session is open.`;
  }
  // Closed, or a session window we could not read: never call this live.
  return `${name} (${meta.symbol}) last traded at ${px} on ${venue} at ${exchangeTime(t, zone)}. ` +
    `The regular session is ${open === false ? "closed now" : "of unknown status"}, so this is the last session price, not a live quote.`;
}

async function yahooQuote(ticker: string): Promise<ChartMeta | null | undefined> {
  try {
    const j = (await getJson(`${YAHOO_CHART}/${encodeURIComponent(ticker)}?range=1d&interval=1d`)) as { chart?: { result?: Array<{ meta?: ChartMeta }> } };
    return j.chart?.result?.[0]?.meta ?? null;
  } catch (e) {
    return /^HTTP 404$/.test((e as Error).message) ? null : undefined;
  }
}

async function nasdaqQuote(ticker: string): Promise<{ price: number; when: string; status: string; name: string } | null> {
  if (!/^[A-Z]{1,5}$/.test(ticker)) return null; // US listings only
  try {
    const j = (await getJson(`${NASDAQ}/${ticker}/info?assetclass=stocks`)) as {
      data?: { companyName?: string; marketStatus?: string; primaryData?: { lastSalePrice?: string; lastTradeTimestamp?: string } } | null;
    };
    const price = Number(String(j.data?.primaryData?.lastSalePrice ?? "").replace(/[$,]/g, ""));
    if (!j.data || !Number.isFinite(price) || price <= 0) return null;
    return { price, when: j.data.primaryData?.lastTradeTimestamp ?? "", status: j.data.marketStatus ?? "", name: j.data.companyName ?? ticker };
  } catch {
    return null;
  }
}

/** The ticker, from the declared parameter, a written ticker, or the company name. */
async function resolve(question: string, symbolParam: string): Promise<{ ticker: string | null; named: string | null; outage: boolean; offTopic: boolean }> {
  // Only an already-uppercase parameter is a ticker: the engine fills `symbol`
  // from the question and may put a company name there, and "Apple" uppercased
  // is not Apple's ticker. A name is left to the resolver below.
  const declared = symbolParam.trim();
  if (/^[A-Z][A-Z.-]{0,6}$/.test(declared) && !NOT_TICKER.has(declared)) return { ticker: declared, named: declared, outage: false, offTopic: false };
  const written = writtenTicker(question);
  if (written) return { ticker: written, named: written, outage: false, offTopic: false };
  // A company name alone is not a stock question: the question itself must ask
  // about a price or a listing, unless there is no question text at all.
  if (String(question ?? "").trim() && !asksAboutStock(question)) return { ticker: null, named: null, outage: false, offTopic: true };
  const named = declared || companyName(question);
  if (!named) return { ticker: null, named: null, outage: false, offTopic: false };
  const { ticker, outage } = await resolveTickerChecked(named);
  return { ticker, named, outage, offTopic: false };
}

export async function lookupStockPrice(question: string, symbolParam = "", now = new Date()): Promise<StockPriceResult> {
  const { ticker, named, outage, offTopic } = await resolve(question, symbolParam);
  const forecast = asksForecast(question) ? " Whether the price will rise or fall is a forecast, and no forecast is made here." : "";
  if (offTopic) {
    return { ticker: null, name: null, verdict: "unknown", confidence: 0, error: "no_subject",
      reason: "This request does not ask for a share price or name a listed company's stock, so no share price is reported. Name one, for example: What is the current share price of Apple (AAPL)?" };
  }
  if (!ticker && outage) {
    return { ticker: null, name: named, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `The ticker for ${named} could not be looked up because the symbol search did not respond. This is an availability problem, not a statement that ${named} is unlisted.${forecast}` };
  }
  if (!ticker) {
    return { ticker: null, name: named, verdict: named ? "not_found" : "unknown", confidence: named ? 0.5 : 0,
      error: named ? undefined : "no_subject",
      reason: named
        ? `No listed equity matching ${named} was found, so no share price is reported for it rather than one for a similarly named company.${forecast}`
        : "No listed company or ticker was named in this request, so no share price could be quoted. Name one, for example: What is the current share price of Apple (AAPL)?" };
  }
  const date = requestedDate(question);
  if (date) return historical(ticker, date, now);

  const [meta, nq] = await Promise.all([yahooQuote(ticker), nasdaqQuote(ticker)]);
  const nowSec = Math.floor(now.getTime() / 1000);
  const listed = meta?.longName ?? meta?.shortName ?? nq?.name ?? "";
  if (named && named !== ticker && listed && !companyMatches(named, listed)) {
    return { ticker: null, name: named, verdict: "not_found", confidence: 0.5,
      reason: `No listed equity matching ${named} was found: the nearest listing, ${listed} (${ticker}), is a different company name, so its price is not reported as ${named}'s.${forecast}` };
  }
  if (meta && meta.instrumentType && !/^(EQUITY|ETF)$/.test(meta.instrumentType)) {
    return { ticker, name: meta.longName ?? null, verdict: "not_found", confidence: 0.6,
      reason: `${ticker} is listed as ${meta.instrumentType.toLowerCase()}, not an equity, so no share price is reported for it.` };
  }
  const head = meta ? describeQuote(meta, nowSec) : null;
  if (head) {
    return { ticker, name: meta?.longName ?? null, verdict: "price", confidence: 0.9, reason: `${head}${forecast}` };
  }
  if (nq) {
    const closed = !/^open$/i.test(nq.status);
    return { ticker, name: nq.name, verdict: "price", confidence: 0.8,
      reason: `${nq.name} (${ticker}) last sold at ${nq.price.toFixed(2)} USD on Nasdaq's feed${nq.when ? `, trade date ${nq.when}` : ""}. ` +
        `The market status is ${nq.status || "not reported"}${closed ? ", so this is not a live quote" : ""}.${forecast}` };
  }
  if (meta === null) {
    return { ticker, name: null, verdict: "not_found", confidence: 0.5,
      reason: `No quote exists for the symbol ${ticker}, so no share price is reported.${forecast}` };
  }
  return { ticker, name: null, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
    reason: `The share price of ${ticker} could not be retrieved because neither Yahoo Finance nor Nasdaq responded with a quote. This is an availability problem, not a statement about the company.` };
}

async function historical(ticker: string, date: string, now: Date): Promise<StockPriceResult> {
  const start = Date.parse(`${date}T00:00:00Z`) / 1000;
  if (!Number.isFinite(start) || start * 1000 > now.getTime()) {
    return { ticker, name: null, verdict: "unknown", confidence: 0, error: "future_date",
      reason: `${date} has not happened yet, so ${ticker} has no closing price for it; a price for a future date would be a prediction, and none is made.` };
  }
  let j: { chart?: { result?: Array<{ meta?: ChartMeta; timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } };
  try {
    j = (await getJson(`${YAHOO_CHART}/${encodeURIComponent(ticker)}?period1=${start}&period2=${start + 86_400}&interval=1d`)) as typeof j;
  } catch {
    return { ticker, name: null, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `The ${date} closing price of ${ticker} could not be retrieved because the price history source did not respond.` };
  }
  const r = j.chart?.result?.[0];
  const close = r?.indicators?.quote?.[0]?.close?.[0];
  const cur = r?.meta?.currency ?? "USD";
  const name = r?.meta?.longName ?? r?.meta?.shortName ?? ticker;
  if (typeof close !== "number" || !Number.isFinite(close)) {
    return { ticker, name, verdict: "not_found", confidence: 0.6,
      reason: `${name} (${ticker}) has no trading session recorded on ${date}, which is usually a weekend or exchange holiday, so there is no closing price for that date.` };
  }
  return { ticker, name, verdict: "historical_price", confidence: 0.85,
    reason: `${name} (${ticker}) closed at ${close.toFixed(2)} ${cur} on ${date}. This is that day's closing price, not a current quote.` };
}
