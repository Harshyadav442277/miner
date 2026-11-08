/**
 * CRYPTO_PRICE — one cryptocurrency's current or historical price.
 *
 * The canonical description draws two lines: a single price, not market
 * statistics (FINANCIAL_DATA), and not what an address holds
 * (WALLET_BALANCE_CHECK). So the answer is one quoted number, with the instant it
 * was quoted and the venue that quoted it, because a live crypto price is only
 * meaningful with both — two honest reads a minute apart disagree.
 *
 * ONE SOURCE, CHOSEN FOR ITS LICENCE (2026-10-24). Bitstamp is the only
 * exchange whose terms allow "the incorporation and redistribution of our
 * exchange data for commercial purposes", subject to its commercial Data
 * License Agreement. Coinbase's market-data terms bar redistribution "to any
 * third party outside of your organization", Kraken's allow use "only for your
 * own benefit", and CoinGecko reserves redistribution for its Enterprise plan.
 * A paid miner answer is redistribution, so those three are not called.
 *
 * EXCEPT COINBASE'S SPOT PRICE, WITH THE GATE OFF (2026-11-08). Bitstamp lists no PEPE, TON or HYPE market,
 * and those answered price_usd null. Since the owner turned LICENCE_GATE off on 2026-11-07 (payments are
 * testnet), a USD pair Bitstamp lacks or did not answer is read from Coinbase's keyless spot price
 * (api.coinbase.com/v2/prices/{BASE}-USD/spot), named as Coinbase in the answer. LICENCE_GATE=on removes it.
 *
 *   /api/v2/ticker/{pair}/   last trade price and its unix timestamp, spot only
 *   /api/v2/ohlc/{pair}/     a past UTC day's open and close (step 86400)
 *
 * An UNKNOWN pair is not an error: Bitstamp answers 200 with an array of every
 * ticker (seen 2026-10-24 for ethjpy and zzzusd). Only a single object counts
 * as a quote, or BTC's price would be reported under another asset's name.
 *
 * A fiat currency Bitstamp does not quote (INR, JPY, ...) is derived from its
 * USD pair and Frankfurter's blended central-bank rate (currency.ts), and the
 * answer says so. A crypto quote with no direct pair (SOL in BTC) is the ratio
 * of two Bitstamp USD pairs. With one venue there is no cross-check, and the
 * answer does not claim one.
 *
 * Refused by name: testnet assets, which have no market price at all ("What is
 * the price of Base sepolia now?" is a real routed question), a future date,
 * which would be a prediction, and a question naming no asset.
 */

import { fetchBlended, formatRate } from "./currency";
import { permitted } from "./sources";

/** Whether the Coinbase fallback may be called (LICENCE_GATE off; its terms bar resale). */
const gateOff = (): boolean => permitted("https://api.coinbase.com/");

const TIMEOUT_MS = Number(process.env.CRYPTO_TIMEOUT_MS ?? 4_000);
const BITSTAMP = "https://www.bitstamp.net/api/v2";
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

export type CryptoVerdict = "price" | "historical_price" | "no_market_price" | "not_found" | "unknown";

export interface CryptoPriceResult {
  asset: string | null;
  symbol: string | null;
  verdict: CryptoVerdict;
  confidence: number;
  reason: string;
  error?: string;
  /** The quote as a number, in `quote` currency, and when it was struck. */
  price?: number;
  quote?: string;
  price_at?: string;
  source?: string;
  /** Bitstamp's best bid and ask and 24-hour base volume, when quoted directly. */
  bid?: number;
  ask?: number;
  volume_24h?: number;
  /** For a derived quote: the USD price and the USD-to-quote rate it was multiplied by. */
  usd_price?: number;
  fx_rate?: number;
  fx_as_of?: string;
  /** A dollar stablecoin's distance from $1.00, in percent. */
  peg_deviation_pct?: number;
  /** A past day: Bitstamp's UTC-day open and close. */
  date?: string;
  open?: number;
  close?: number;
}

/** `gecko` is CoinGecko's id, still read by financial.ts; this file no longer calls CoinGecko. */
export interface Asset { name: string; symbol: string; gecko: string }

/**
 * A major's name inside a different coin's name: "Bitcoin Cash", "Ethereum
 * Classic", "Wrapped Bitcoin", "Shiba Inu"-style forks. On 2026-09-12 the bare
 * /bitcoin/ pattern answered "Bitcoin Cash price" with Bitcoin's $77,151.99 while
 * BCH traded at $227.05 — the substituted subject A5 forbids. A major's word
 * qualified by one of these is never that major.
 */
const PRE = String.raw`(?<!\b(?:wrapped|staked|bridged|liquid|lido|coinbase|binance|renbtc|tbtc|synthetic|pegged|baby|mini)[\s-]+)`;
const POST = String.raw`(?![\s-]+(?:cash|sv|satoshi|classic|gold|diamond|private|pow|fair|2\.0|name|inu|killer|cat|dog|pepe|wif)\b)`;
const major = (words: string, ci = "i"): RegExp => new RegExp(`${PRE}\\b(?:${words})\\b${POST}`, ci);

/**
 * Majors, matched by name or ticker. WBTC and DAI have no Bitstamp pair
 * (2026-10-24) and stay for financial.ts; a price question about them is
 * answered as unlisted. Tickers that are also English words or names (LINK, DOT, ADA) match only in
 * capitals: "Send me the link to the price of PEPE" is about PEPE, and
 * "link my wallet" names no asset.
 */
const ASSETS: Array<[RegExp[], Asset]> = [
  [[/\bbitcoin\s+cash\b|\bbch\b/i], { name: "Bitcoin Cash", symbol: "BCH", gecko: "bitcoin-cash" }],
  [[/\bethereum\s+classic\b|\betc\b/i], { name: "Ethereum Classic", symbol: "ETC", gecko: "ethereum-classic" }],
  [[/\bwrapped\s+(?:bitcoin|btc)\b|\bwbtc\b/i], { name: "Wrapped Bitcoin", symbol: "WBTC", gecko: "wrapped-bitcoin" }],
  [[major("bitcoin|btc|xbt")], { name: "Bitcoin", symbol: "BTC", gecko: "bitcoin" }],
  [[major("ethereum|eth|ether")], { name: "Ethereum", symbol: "ETH", gecko: "ethereum" }],
  [[major("solana|sol")], { name: "Solana", symbol: "SOL", gecko: "solana" }],
  [[/\busd\s*coin\b|\busdc\b/i], { name: "USD Coin", symbol: "USDC", gecko: "usd-coin" }],
  [[/\btether\b|\busdt\b/i], { name: "Tether", symbol: "USDT", gecko: "tether" }],
  [[major("xrp|ripple")], { name: "XRP", symbol: "XRP", gecko: "ripple" }],
  [[major("dogecoin|doge")], { name: "Dogecoin", symbol: "DOGE", gecko: "dogecoin" }],
  [[major("cardano"), major("ADA", "")], { name: "Cardano", symbol: "ADA", gecko: "cardano" }],
  [[major("avalanche|avax")], { name: "Avalanche", symbol: "AVAX", gecko: "avalanche-2" }],
  [[major("chainlink"), major("LINK", "")], { name: "Chainlink", symbol: "LINK", gecko: "chainlink" }],
  [[major("litecoin|ltc")], { name: "Litecoin", symbol: "LTC", gecko: "litecoin" }],
  [[major("polkadot"), major("DOT", "")], { name: "Polkadot", symbol: "DOT", gecko: "polkadot" }],
  [[major("bnb|binance coin")], { name: "BNB", symbol: "BNB", gecko: "binancecoin" }],
  [[major("dai")], { name: "Dai", symbol: "DAI", gecko: "dai" }],
];

const STABLE = new Set(["USDC", "USDT", "DAI"]);

/**
 * Quote currencies read from a question. Bitstamp quotes USD, EUR, GBP, BTC and
 * ETH directly for some assets (2026-10-24); the other fiat quotes are derived
 * from the USD pair (see FIAT_DERIVED), and BTC or ETH from two USD pairs.
 */
const QUOTES: Record<string, string> = {
  usd: "USD", eur: "EUR", gbp: "GBP", jpy: "JPY", inr: "INR", cad: "CAD", aud: "AUD", chf: "CHF", cny: "CNY",
  krw: "KRW", sgd: "SGD", hkd: "HKD", brl: "BRL", try: "TRY", aed: "AED", btc: "BTC", eth: "ETH",
  euro: "EUR", euros: "EUR", pounds: "GBP", dollars: "USD", yen: "JPY", rupees: "INR", bitcoin: "BTC", ether: "ETH", ethereum: "ETH",
};
const QUOTE_WORDS = Object.keys(QUOTES).join("|");
const QUOTE_CLAUSE = new RegExp(`\\b(?:in|to|vs\\.?|versus|against|denominated in|priced in)\\s+(${QUOTE_WORDS})\\b`, "i");

/** A testnet named anywhere means there is no market to quote. */
export function testnetName(text: string): string | null {
  const m = String(text ?? "").match(/\b(?:([a-z]+)\s+)?(sepolia|goerli|holesky|hoodi|testnet|devnet)\b/i);
  if (!m) return null;
  // Only a chain word is a prefix: "ETH on Sepolia" names Sepolia, not "on Sepolia".
  const prefix = m[1] && /^(?:base|arbitrum|optimism|op|polygon|amoy|mumbai|bsc|avalanche|fuji|linea|scroll|zksync|blast|ethereum|eth|solana|ton|monad|berachain|unichain|mantle)$/i.test(m[1]) ? `${m[1]} ` : "";
  return `${prefix}${m[2]}`;
}

/** The question with its quote clause removed, so "price of ETH in BTC" is about ETH. */
function withoutQuote(text: string): string {
  return String(text ?? "").replace(new RegExp(QUOTE_CLAUSE.source, "gi"), " ");
}

export function knownAsset(text: string): Asset | null {
  // The asset the question names FIRST, not the first row of the table: "the
  // price of ETH in BTC" is about ETH. Word boundaries exclude "dotted" and "linked".
  // The quote clause is set aside first; if that leaves no asset ("invest in
  // bitcoin"), the clause was the subject, and the whole text is read.
  return firstAsset(withoutQuote(text)) ?? firstAsset(String(text ?? ""));
}

function firstAsset(s: string): Asset | null {
  let best: { at: number; asset: Asset } | null = null;
  for (const [res, asset] of ASSETS) {
    for (const re of res) {
      const at = s.search(re);
      if (at >= 0 && (!best || at < best.at)) best = { at, asset };
    }
  }
  return best?.asset ?? null;
}

/** The quote currency, defaulting to USD, which is what an unqualified price means. */
export function quoteCurrency(text: string): string {
  const m = String(text ?? "").match(QUOTE_CLAUSE);
  return m?.[1] ? QUOTES[m[1].toLowerCase()] ?? "USD" : "USD";
}

/**
 * A candidate ticker or name for an asset outside the table: "$PEPE", "price of
 * Shiba Inu", "Shiba Inu price". Up to three words are kept, because a one-word
 * capture turned "Shiba Inu" into "Shiba" and CoinGecko's exact-symbol hit for
 * that is BitShiba (SHIBA), a different coin (verifier, 2026-09-12).
 */
export function candidateName(text: string): string | null {
  return candidateIn(withoutQuote(text)) ?? candidateIn(String(text ?? ""));
}

function candidateIn(s: string): string | null {
  const dollar = s.match(/\$([A-Za-z][A-Za-z0-9]{1,9})\b/)?.[1];
  if (dollar) return dollar;
  const W = "[A-Za-z][A-Za-z0-9-]{0,20}";
  const of = s.match(new RegExp(`\\b(?:price|value|worth)\\s+of\\s+((?:${W}\\s+){0,2}${W})`, "i"))?.[1];
  const ofName = of ? trimPhrase(of, "tail") : null;
  if (ofName) return ofName;
  const before = s.match(new RegExp(`((?:${W}\\s+){0,2}${W})\\s+(?:token\\s+|coin\\s+)?price\\b`, "i"))?.[1];
  return before ? trimPhrase(before, "head") : null;
}

/**
 * Filler cut from a captured phrase: from the end for "price of X today", from
 * the start for "what is the X price". A phrase that is all filler names nothing.
 */
function trimPhrase(phrase: string, from: "head" | "tail"): string | null {
  const words = phrase.trim().split(/\s+/);
  let kept: string[];
  if (from === "tail") {
    const start = words.findIndex((w) => !FILLER.test(w));
    const rest = start >= 0 ? words.slice(start) : [];
    const cut = rest.findIndex((w) => FILLER.test(w));
    kept = cut >= 0 ? rest.slice(0, cut) : rest;
  } else {
    kept = words.slice(words.map((w) => FILLER.test(w)).lastIndexOf(true) + 1);
  }
  return kept.length && kept.every((w) => !GENERIC.test(w)) ? kept.join(" ") : null;
}

/** Words that sit where an asset name would but name none: "crypto price check" is a real routed question. */
const GENERIC = /^(?:the|a|an|this|that|it|its|crypto|cryptocurrency|token|coin|current|market|live|latest|what|whats|spot)$/i;
/** Words that end or precede a name: "price of Hyperliquid right now", "send me the Pepe price". */
const FILLER = /^(?:the|a|an|is|was|of|in|on|at|to|for|now|today|right|currently|current|please|vs|and|or|what|whats|what's|how|much|me|my|us|send|show|tell|give|get|check|latest|live|spot|market|crypto|cryptocurrency|token|coin|this|that|it|its|today's|yesterday|price|usd|with|from|per|by|compared)$/i;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** A calendar date the question asks about, as YYYY-MM-DD, or null for "now". */
export function requestedDate(text: string, now = new Date()): string | null {
  const s = String(text ?? "");
  const iso = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const pad = (n: number): string => String(n).padStart(2, "0");
  const named = s.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i)
    ?? s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december),?\s+(20\d{2})\b/i);
  if (named) {
    const monthWord = /^\d/.test(named[1] ?? "") ? named[2] : named[1];
    const day = /^\d/.test(named[1] ?? "") ? named[1] : named[2];
    return `${named[3]}-${pad(MONTHS.indexOf(String(monthWord).toLowerCase()) + 1)}-${pad(Number(day))}`;
  }
  if (/\byesterday\b/i.test(s)) return new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  return null;
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Sub-dollar prices keep four significant figures, so a $0.9999 stablecoin is not "$1.00". */
export function formatPrice(n: number, quote: string): string {
  const sym = quote === "USD" ? "$" : quote === "EUR" ? "€" : quote === "GBP" ? "£" : "";
  // toPrecision switches to exponent form below 1e-6 ("9.700e-7"), which a
  // BTC-quoted small coin reaches; those keep four significant figures in fixed form.
  const body = n >= 1
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n > 0 && n < 1e-6 ? n.toFixed(3 - Math.floor(Math.log10(n))) : n.toPrecision(4);
  return `${sym}${body} ${quote}`;
}

const utc = (ms: number): string => `${new Date(ms).toISOString().slice(0, 19).replace("T", " ")} UTC`;

/** A spot ticker: Bitstamp's last trade, or Coinbase's spot price at the instant it was read (no bid, ask or volume). */
interface Ticker { price: number; at: number; bid: number; ask: number; volume: number; venue: "Bitstamp" | "Coinbase" }

/**
 * Coinbase's public spot price, keyless, for a USD pair Bitstamp does not list or did not answer: PEPE, TON and
 * HYPE had no Bitstamp market and answered price_usd null, and Coinbase quoted all three on 2026-11-08. Its terms
 * bar redistribution (sources.ts), so it is called only while LICENCE_GATE is off. Null when Coinbase has no
 * such pair (404), undefined when it did not answer.
 */
const COINBASE = "https://api.coinbase.com/v2/prices";
async function coinbaseSpot(base: string): Promise<Ticker | null | undefined> {
  const url = `${COINBASE}/${encodeURIComponent(base.toUpperCase())}-USD/spot`;
  if (!permitted(url)) return null;
  const key = `coinbase:${base.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  try {
    const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (r.status === 404 || r.status === 400) {
      cache.set(key, { at: Date.now(), value: null });
      return null;
    }
    if (!r.ok) return undefined;
    const d = ((await r.json()) as { data?: { amount?: string; base?: string; currency?: string } }).data;
    const price = Number(d?.amount);
    if (!(price > 0) || d?.currency !== "USD" || String(d?.base).toUpperCase() !== base.toUpperCase()) return undefined;
    const value: Ticker = { price, at: Date.now(), bid: NaN, ask: NaN, volume: NaN, venue: "Coinbase" };
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return undefined;
  }
}

/** The USD ticker: Bitstamp's, else Coinbase's when Bitstamp lists no pair or did not answer. */
async function usdTicker(base: string): Promise<Ticker | null | undefined> {
  const b = await ticker(base, "USD");
  if (b) return b;
  const c = await coinbaseSpot(base);
  return c ?? (b === undefined || c === undefined ? undefined : null);
}

/**
 * Bitstamp's bot wall answered 503 after about six requests within a few
 * seconds from one IP (2026-10-24), and cleared seconds later. A pair read in
 * the last 10 s is reused, and so is "unlisted"; an outage is never cached.
 */
const CACHE_MS = 10_000;
const cache = new Map<string, { at: number; value: Ticker | null }>();

/** For tests: forget cached tickers. */
export function clearTickerCache(): void {
  cache.clear();
}

/**
 * One Bitstamp pair's ticker: null when Bitstamp lists no such pair (it answers
 * with an array of every ticker instead), undefined when it did not answer
 * usably (timeout, the bot wall's 503, HTML, a malformed body).
 */
async function ticker(base: string, quote: string): Promise<Ticker | null | undefined> {
  const pair = (base + quote).toLowerCase();
  const hit = cache.get(pair);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  let j: unknown;
  try {
    j = await getJson(`${BITSTAMP}/ticker/${pair}/`);
  } catch {
    return undefined;
  }
  const t = (j ?? {}) as Record<string, unknown>;
  const price = Number(t.last);
  const at = Number(t.timestamp) * 1000;
  if (!Array.isArray(j) && (!(price > 0) || !Number.isFinite(at))) return undefined;
  const value = Array.isArray(j) ? null : { price, at, bid: Number(t.bid), ask: Number(t.ask), volume: Number(t.volume), venue: "Bitstamp" as const };
  cache.set(pair, { at: Date.now(), value });
  return value;
}

/** A ticker-shaped word: what Bitstamp's pair names are built from. */
const TICKER = /^[A-Z0-9]{2,10}$/;

type Quoted =
  | { how: "direct"; price: number; t: Ticker }
  | { how: "fiat"; price: number; t: Ticker; rate: number; rateDate: string }
  | { how: "cross"; price: number; t: Ticker; q: Ticker };

/**
 * The quotes of QUOTES that Bitstamp lists any pair in (2026-10-24 listing). For
 * any other, asking for the direct pair only fetches the 80 KB all-tickers reply.
 */
const DIRECT_QUOTES = new Set(["USD", "EUR", "GBP", "BTC", "ETH"]);

/** The price of `symbol` in `quote` from Bitstamp, directly or derived; null unlisted, undefined unavailable. */
async function quoteNow(symbol: string, quote: string): Promise<Quoted | null | undefined> {
  const direct = DIRECT_QUOTES.has(quote) ? await (quote === "USD" ? usdTicker(symbol) : ticker(symbol, quote)) : null;
  if (direct) return { how: "direct", price: direct.price, t: direct };
  if (quote === "USD") return direct;
  // A non-USD pair Bitstamp lacks, or that it did not answer, is derived from the USD quote.
  const usd = await usdTicker(symbol);
  if (!usd) return direct === undefined && usd === null ? undefined : usd;
  if (quote === "BTC" || quote === "ETH") {
    const q = await usdTicker(quote);
    return q ? { how: "cross", price: usd.price / q.price, t: usd, q } : undefined;
  }
  const fx = await fetchBlended("USD", quote);
  const rate = fx?.rates[quote];
  return fx && rate ? { how: "fiat", price: usd.price * rate, t: usd, rate, rateDate: fx.date } : undefined;
}

export async function lookupCryptoPrice(question: string, symbolParam = "", now = new Date()): Promise<CryptoPriceResult> {
  const q = `${symbolParam} ${question}`.trim();
  const testnet = testnetName(q);
  if (testnet) {
    return { asset: testnet, symbol: null, verdict: "no_market_price", confidence: 0.9,
      reason: `${testnet} is a test network, and its tokens have no market price: they are not traded and carry no monetary value, so no price can be quoted for them.` };
  }
  let asset = knownAsset(q);
  if (!asset) {
    const cand = candidateName(q);
    if (!cand) {
      return { asset: null, symbol: null, verdict: "unknown", confidence: 0, error: "no_subject",
        reason: "No cryptocurrency was named in this request, so no price could be quoted. Name an asset, for example: What is the current price of Ethereum (ETH) in USD?" };
    }
    // Outside the table, an asset is accepted only as an exact ticker. A name
    // ("Shiba Inu") cannot be checked against Bitstamp, which lists pairs, not
    // coin names, and a guessed ticker could be a different coin.
    const sym = cand.toUpperCase();
    if (!TICKER.test(sym)) {
      return { asset: cand, symbol: null, verdict: "not_found", confidence: 0.5,
        reason: `${cand} is not a ticker, and the price source here is looked up by ticker only, so no price is reported rather than one for a coin guessed from the name. Ask with the asset's ticker, for example $PEPE.` };
    }
    asset = { name: sym, symbol: sym, gecko: "" };
  }
  // "Should I invest in bitcoin?" reads "in bitcoin" as a quote clause; an asset
  // is never quoted in itself, so that falls back to USD.
  const asked = quoteCurrency(q);
  const quote = asked === asset.symbol ? "USD" : asked;
  const label = asset.name === asset.symbol ? asset.symbol : `${asset.name} (${asset.symbol})`;
  const date = requestedDate(q, now);
  if (date) return historical(asset, label, quote, date, now);

  const got = await quoteNow(asset.symbol, quote);
  if (got === undefined) {
    return { asset: asset.name, symbol: asset.symbol, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `The current price of ${label} could not be retrieved because Bitstamp${gateOff() ? " and Coinbase" : ""}${quote === "USD" || quote === "EUR" || quote === "GBP" ? "" : " or the exchange-rate source"} did not answer with a usable quote. This is an availability problem, not a statement about ${asset.symbol}.` };
  }
  if (got === null) {
    return { asset: asset.name, symbol: asset.symbol, verdict: "not_found", confidence: 0.5,
      reason: gateOff()
        ? `Neither Bitstamp nor Coinbase lists a ${asset.symbol} market, so no price is reported for ${label} rather than one for a coin guessed from the ticker.`
        : `Bitstamp lists no ${asset.symbol} market, and it is the only price source here whose terms allow its data to be resold, so no price is reported for ${label} rather than one from an unlicensed source.` };
  }
  const { t } = got;
  // "the last Bitstamp trade at …" or "Coinbase's spot price read at …": what the instant is the instant of.
  const struck = (x: Ticker, pair: string): string => (x.venue === "Bitstamp" ? `Bitstamp's last ${pair} trade at ${utc(x.at)}` : `Coinbase's ${pair} spot price read at ${utc(x.at)}`);
  const head = got.how === "direct"
    ? `${label} is ${formatPrice(got.price, quote)}, ${t.venue === "Bitstamp" ? `the last Bitstamp trade at ${utc(t.at)}` : `Coinbase's spot price read at ${utc(t.at)}`}.`
    : got.how === "fiat"
      ? `${label} is about ${formatPrice(got.price, quote)}: ${struck(t, `${asset.symbol}-USD`)} was ` +
        `${formatPrice(t.price, "USD")}, converted at 1 USD = ${formatRate(got.rate)} ${quote}, Frankfurter's blended ` +
        `central-bank rate whose newest contributing rate is dated ${got.rateDate}. Bitstamp does not quote ${asset.symbol} in ${quote}.`
      : t.venue === "Bitstamp" && got.q.venue === "Bitstamp"
        ? `${label} is about ${formatPrice(got.price, quote)}, derived from Bitstamp's last ${asset.symbol}-USD trade ` +
          `(${formatPrice(t.price, "USD")}) and ${quote}-USD trade (${formatPrice(got.q.price, "USD")}), ` +
          `the older of the two at ${utc(Math.min(t.at, got.q.at))}.`
        : `${label} is about ${formatPrice(got.price, quote)}, derived from ${struck(t, `${asset.symbol}-USD`)} ` +
          `(${formatPrice(t.price, "USD")}) and ${struck(got.q, `${quote}-USD`)} (${formatPrice(got.q.price, "USD")}).`;
  // "is USDC price stable?" is a routed question: for a dollar stablecoin the
  // distance from the peg is the part of the price that answers it.
  const peg = STABLE.has(asset.symbol) && quote === "USD"
    ? ` That is ${(Math.abs(got.price - 1) * 100).toFixed(2)}% from its $1.00 peg.` : "";
  return { asset: asset.name, symbol: asset.symbol, verdict: "price", confidence: got.how === "direct" ? 0.9 : 0.8,
    price: got.price, quote, price_at: new Date(t.at).toISOString(),
    source: [...new Set([t.venue, ...(got.how === "cross" ? [got.q.venue] : []), ...(got.how === "fiat" ? ["Frankfurter"] : [])])].join(", "),
    ...(got.how === "direct" && Number.isFinite(t.bid) && Number.isFinite(t.ask) ? { bid: t.bid, ask: t.ask } : {}),
    ...(got.how === "direct" && Number.isFinite(t.volume) ? { volume_24h: t.volume } : {}),
    ...(got.how === "fiat" ? { usd_price: t.price, fx_rate: got.rate, fx_as_of: got.rateDate } : {}),
    ...(peg ? { peg_deviation_pct: Number((Math.abs(got.price - 1) * 100).toFixed(2)) } : {}),
    reason: `${head}${peg} This is a live market quote from one exchange and moves between reads.` };
}

/**
 * Bitstamp's daily candle for one UTC day: null when the pair is unlisted (404),
 * undefined when unavailable. A start with no candle returns the LATEST day
 * instead (seen 2026-10-24 for a future start), so the timestamp must match.
 */
async function candle(base: string, quote: string, startMs: number): Promise<{ open: number; close: number } | null | undefined> {
  const start = startMs / 1000;
  let r: Response;
  try {
    r = await fetch(`${BITSTAMP}/ohlc/${(base + quote).toLowerCase()}/?step=86400&limit=1&start=${start}`,
      { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return undefined;
  }
  if (r.status === 404) return null;
  if (!r.ok) return undefined;
  let j: { data?: { ohlc?: Array<Record<string, string>> } };
  try {
    j = (await r.json()) as typeof j;
  } catch {
    return undefined;
  }
  const row = j.data?.ohlc?.[0];
  const open = Number(row?.open);
  const close = Number(row?.close);
  if (Number(row?.timestamp) !== start || !(open > 0) || !(close > 0)) return undefined;
  return { open, close };
}

async function historical(asset: Asset, label: string, quote: string, date: string, now: Date): Promise<CryptoPriceResult> {
  const start = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(start) || start > now.getTime()) {
    return { asset: asset.name, symbol: asset.symbol, verdict: "unknown", confidence: 0, error: "future_date",
      reason: `${date} has not happened yet, so ${label} has no price for it; a price for a future date would be a prediction, and none is made.` };
  }
  const c = await candle(asset.symbol, quote, start);
  if (c === null) {
    return { asset: asset.name, symbol: asset.symbol, verdict: "not_found", confidence: 0.5,
      reason: `Bitstamp lists no ${asset.symbol}-${quote} market, and it is the only price source here whose terms allow its data to be resold, so no price for ${label} on ${date} is reported.` };
  }
  if (c === undefined) {
    return { asset: asset.name, symbol: asset.symbol, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `The price of ${label} on ${date} could not be retrieved: Bitstamp returned no daily candle for that date. This is not a statement that it had no price.` };
  }
  return { asset: asset.name, symbol: asset.symbol, verdict: "historical_price", confidence: 0.85,
    date, quote, open: c.open, close: c.close, source: "Bitstamp",
    reason: `On ${date}, ${label} opened at ${formatPrice(c.open, quote)} and closed at ${formatPrice(c.close, quote)} on Bitstamp for the UTC day. These are historical figures for that day, not a current price.` };
}
