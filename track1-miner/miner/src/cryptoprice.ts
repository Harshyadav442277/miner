/**
 * CRYPTO_PRICE — one cryptocurrency's current or historical price.
 *
 * The canonical description draws two lines: a single price, not market
 * statistics (FINANCIAL_DATA), and not what an address holds
 * (WALLET_BALANCE_CHECK). So the answer is one quoted number, with the instant it
 * was quoted and the venue that quoted it, because a live crypto price is only
 * meaningful with both — two honest reads a minute apart disagree.
 *
 * Two independent keyless sources, read concurrently (verified live 2026-09-12):
 *   Coinbase Exchange  /products/{BASE}-{QUOTE}/ticker  last trade price and trade time
 *   CoinGecko          /simple/price                    cross-venue aggregate, last_updated_at
 * Coinbase is the headline where it lists the pair, because its figure is a
 * real trade at a stated instant; CoinGecko covers everything else and is the
 * cross-check. Binance was NOT used: it answers HTTP 451 to US datacenter IPs,
 * which is where the deployment runs.
 *
 * Historical prices come from the same two: Coinbase's daily candle for that UTC
 * day and CoinGecko's `/coins/{id}/history` snapshot for the date. Their figures
 * differ (a candle open is a trade, the snapshot an aggregate) and both are named.
 *
 * Refused by name: testnet assets, which have no market price at all ("What is
 * the price of Base sepolia now?" is a real routed question), a future date,
 * which would be a prediction, and a question naming no asset.
 */

const TIMEOUT_MS = Number(process.env.CRYPTO_TIMEOUT_MS ?? 4_000);
const COINBASE = "https://api.exchange.coinbase.com/products";
const GECKO = "https://api.coingecko.com/api/v3";
const KRAKEN = "https://api.kraken.com/0/public/Ticker";
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

export type CryptoVerdict = "price" | "historical_price" | "no_market_price" | "not_found" | "unknown";

export interface CryptoPriceResult {
  asset: string | null;
  symbol: string | null;
  verdict: CryptoVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

export interface Asset { name: string; symbol: string; gecko: string; coinbase: boolean }

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
 * Majors, matched by name or ticker. `coinbase` marks a pair verified to exist there.
 * Tickers that are also English words or names (LINK, DOT, ADA) match only in
 * capitals: "Send me the link to the price of PEPE" is about PEPE, and
 * "link my wallet" names no asset.
 */
const ASSETS: Array<[RegExp[], Asset]> = [
  [[/\bbitcoin\s+cash\b|\bbch\b/i], { name: "Bitcoin Cash", symbol: "BCH", gecko: "bitcoin-cash", coinbase: true }],
  [[/\bethereum\s+classic\b|\betc\b/i], { name: "Ethereum Classic", symbol: "ETC", gecko: "ethereum-classic", coinbase: true }],
  // Coinbase delisted WBTC-USD ("Not allowed for delisted products", 2026-09-13); Kraken lists WBTCUSD.
  [[/\bwrapped\s+(?:bitcoin|btc)\b|\bwbtc\b/i], { name: "Wrapped Bitcoin", symbol: "WBTC", gecko: "wrapped-bitcoin", coinbase: false }],
  [[major("bitcoin|btc|xbt")], { name: "Bitcoin", symbol: "BTC", gecko: "bitcoin", coinbase: true }],
  [[major("ethereum|eth|ether")], { name: "Ethereum", symbol: "ETH", gecko: "ethereum", coinbase: true }],
  [[major("solana|sol")], { name: "Solana", symbol: "SOL", gecko: "solana", coinbase: true }],
  [[/\busd\s*coin\b|\busdc\b/i], { name: "USD Coin", symbol: "USDC", gecko: "usd-coin", coinbase: false }],
  [[/\btether\b|\busdt\b/i], { name: "Tether", symbol: "USDT", gecko: "tether", coinbase: true }],
  [[major("xrp|ripple")], { name: "XRP", symbol: "XRP", gecko: "ripple", coinbase: true }],
  [[major("dogecoin|doge")], { name: "Dogecoin", symbol: "DOGE", gecko: "dogecoin", coinbase: true }],
  [[major("cardano"), major("ADA", "")], { name: "Cardano", symbol: "ADA", gecko: "cardano", coinbase: true }],
  [[major("avalanche|avax")], { name: "Avalanche", symbol: "AVAX", gecko: "avalanche-2", coinbase: true }],
  [[major("chainlink"), major("LINK", "")], { name: "Chainlink", symbol: "LINK", gecko: "chainlink", coinbase: true }],
  [[major("litecoin|ltc")], { name: "Litecoin", symbol: "LTC", gecko: "litecoin", coinbase: true }],
  [[major("polkadot"), major("DOT", "")], { name: "Polkadot", symbol: "DOT", gecko: "polkadot", coinbase: true }],
  [[major("bnb|binance coin")], { name: "BNB", symbol: "BNB", gecko: "binancecoin", coinbase: false }],
  [[major("dai")], { name: "Dai", symbol: "DAI", gecko: "dai", coinbase: true }],
];

const STABLE = new Set(["USDC", "USDT", "DAI"]);

/**
 * Quote currencies CoinGecko's /simple/price accepts (checked 2026-09-13 against
 * /simple/supported_vs_currencies), plus BTC and ETH, which Coinbase also lists
 * as quotes (ETH-BTC answered HTTP 200 on 2026-09-13).
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
  const body = n >= 1
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toPrecision(4);
  return `${sym}${body} ${quote}`;
}

const utc = (ms: number): string => `${new Date(ms).toISOString().slice(0, 19).replace("T", " ")} UTC`;

/** Resolve an asset outside the table through CoinGecko search, exact symbol or name only. */
export async function searchAsset(name: string): Promise<Asset | null | undefined> {
  let j: { coins?: Array<{ id?: string; name?: string; symbol?: string; market_cap_rank?: number | null }> };
  try {
    j = (await getJson(`${GECKO}/search?query=${encodeURIComponent(name)}`)) as typeof j;
  } catch {
    return undefined; // unknown, not absent
  }
  const want = name.toLowerCase().replace(/\s+/g, " ").trim();
  // Exact matches only: CoinGecko's search is fuzzy, and a near-miss is a
  // different asset — the substitution A5 forbids. A multi-word phrase is a
  // name and must equal a coin's full name; only a single word may also be a
  // ticker. An exact name beats an exact ticker, then market-cap rank decides.
  const coins = (j.coins ?? []).filter((c) => c.id);
  const byName = coins.filter((c) => c.name?.toLowerCase() === want);
  const bySymbol = want.includes(" ") ? [] : coins.filter((c) => c.symbol?.toLowerCase() === want);
  const rank = (a: { market_cap_rank?: number | null }, b: { market_cap_rank?: number | null }): number =>
    (a.market_cap_rank ?? 1e9) - (b.market_cap_rank ?? 1e9);
  const hit = [...byName.sort(rank), ...bySymbol.sort(rank)]
    // An unranked exact name does not beat a ranked exact ticker ("pepe" the name vs PEPE).
    .sort((a, b) => ((a.market_cap_rank == null) === (b.market_cap_rank == null) ? 0 : a.market_cap_rank == null ? 1 : -1))[0];
  return hit ? { name: hit.name ?? name, symbol: (hit.symbol ?? name).toUpperCase(), gecko: hit.id!, coinbase: false } : null;
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
    const found = cand ? await searchAsset(cand) : null;
    if (found === undefined) {
      return { asset: cand, symbol: null, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
        reason: `The asset ${cand} could not be looked up because the price index did not respond. This is an availability problem, not a statement that it has no price.` };
    }
    if (!found) {
      return { asset: cand, symbol: null, verdict: cand ? "not_found" : "unknown", confidence: cand ? 0.5 : 0, error: cand ? undefined : "no_subject",
        reason: cand
          ? `No cryptocurrency whose name or ticker is exactly ${cand} is listed in the price index, so no price is reported for it rather than one for a similarly named asset.`
          : "No cryptocurrency was named in this request, so no price could be quoted. Name an asset, for example: What is the current price of Ethereum (ETH) in USD?" };
    }
    asset = found;
  }
  // "Should I invest in bitcoin?" reads "in bitcoin" as a quote clause; an asset
  // is never quoted in itself, so that falls back to USD.
  const asked = quoteCurrency(q);
  const quote = asked === asset.symbol ? "USD" : asked;
  const label = `${asset.name} (${asset.symbol})`;
  const date = requestedDate(q, now);
  if (date) return historical(asset, quote, date, now);

  const [pair, cg] = await Promise.all([
    venueQuote(asset, quote, now),
    getJson(`${GECKO}/simple/price?ids=${asset.gecko}&vs_currencies=${quote.toLowerCase()}&include_last_updated_at=true&precision=full`)
      .then((j) => (j as Record<string, Record<string, number>>)[asset!.gecko] ?? null).catch(() => null),
  ]);
  const cgPrice = Number(cg?.[quote.toLowerCase()]);
  const cgTime = Number(cg?.last_updated_at) * 1000;
  const haveCg = Number.isFinite(cgPrice) && cgPrice > 0 && Number.isFinite(cgTime);
  // An exchange pair is looked up by ticker, and tickers are not unique: a coin
  // resolved through search may share its ticker with a different listed coin.
  // A venue price more than 10% from CoinGecko's figure for the resolved coin is
  // treated as that other coin and dropped.
  const venue = pair && haveCg && Math.abs(pair.price - cgPrice) / cgPrice > 0.1 ? null : pair;
  if (!venue && !haveCg) {
    return { asset: asset.name, symbol: asset.symbol, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `The current price of ${label} could not be retrieved because neither an exchange nor CoinGecko responded with a quote. This is an availability problem, not a statement about ${asset.symbol}.` };
  }
  const head = venue
    ? `${label} is ${formatPrice(venue.price, quote)}, ${venue.what} ${utc(venue.at)}.`
    : `${label} is ${formatPrice(cgPrice, quote)}, the CoinGecko aggregate price updated at ${utc(cgTime)}.`;
  const cross = venue && haveCg ? ` CoinGecko's aggregate read ${formatPrice(cgPrice, quote)} at ${utc(cgTime)}.` : "";
  // "is USDC price stable?" is a routed question: for a dollar stablecoin the
  // distance from the peg is the part of the price that answers it.
  const peg = STABLE.has(asset.symbol) && quote === "USD"
    ? ` That is ${(Math.abs((venue ? venue.price : cgPrice) - 1) * 100).toFixed(2)}% from its $1.00 peg.` : "";
  return { asset: asset.name, symbol: asset.symbol, verdict: "price", confidence: 0.9,
    reason: `${head}${peg}${cross} This is a live market quote and moves between reads.` };
}

/**
 * One exchange trade price. Coinbase first, which stamps each trade; Kraken where
 * Coinbase has no pair (USDC-USD is 404 there, verified 2026-09-12). Kraken's
 * ticker carries no trade time, so its figure is stamped with the read time and
 * worded as such. CoinGecko's keyless tier sheds bursts (observed 2026-09-12
 * after about ten calls in a minute), which is why an exchange is always tried.
 */
async function venueQuote(asset: Asset, quote: string, now: Date): Promise<{ price: number; at: number; what: string } | null> {
  const [cb, kr] = await Promise.all([
    getJson(`${COINBASE}/${asset.symbol}-${quote}/ticker`).then((j) => j as { price?: string; time?: string }).catch(() => null),
    // Kraken also where Coinbase has no quote in that currency (BTC-JPY is 404 on
    // Coinbase, XBTJPY is 200 on Kraken, 2026-09-13). Kraken spells BTC as XBT.
    !asset.coinbase || !["USD", "EUR", "GBP", "BTC", "ETH"].includes(quote)
      ? getJson(`${KRAKEN}?pair=${asset.symbol === "BTC" ? "XBT" : asset.symbol}${quote === "BTC" ? "XBT" : quote}`)
        .then((j) => Object.values((j as { result?: Record<string, { c?: string[] }> }).result ?? {})[0] ?? null).catch(() => null)
      : Promise.resolve(null),
  ]);
  const p = Number(cb?.price);
  const t = Date.parse(String(cb?.time ?? ""));
  if (Number.isFinite(p) && p > 0 && Number.isFinite(t)) return { price: p, at: t, what: "the last Coinbase trade at" };
  const kp = Number(kr?.c?.[0]);
  return Number.isFinite(kp) && kp > 0 ? { price: kp, at: now.getTime(), what: "Kraken's last trade price as read at" } : null;
}

async function historical(asset: Asset, quote: string, date: string, now: Date): Promise<CryptoPriceResult> {
  const label = `${asset.name} (${asset.symbol})`;
  const start = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(start) || start > now.getTime()) {
    return { asset: asset.name, symbol: asset.symbol, verdict: "unknown", confidence: 0, error: "future_date",
      reason: `${date} has not happened yet, so ${label} has no price for it; a price for a future date would be a prediction, and none is made.` };
  }
  const [dd, mm, yyyy] = [date.slice(8, 10), date.slice(5, 7), date.slice(0, 4)];
  const end = new Date(start + 86_400_000).toISOString();
  const [cb, cg] = await Promise.all([
    asset.coinbase
      ? getJson(`${COINBASE}/${asset.symbol}-${quote}/candles?granularity=86400&start=${date}T00:00:00Z&end=${end}`)
        .then((j) => (j as number[][]).find((row) => row[0] === start / 1000) ?? null).catch(() => null)
      : Promise.resolve(null),
    getJson(`${GECKO}/coins/${asset.gecko}/history?date=${dd}-${mm}-${yyyy}&localization=false`)
      .then((j) => Number((j as { market_data?: { current_price?: Record<string, number> } }).market_data?.current_price?.[quote.toLowerCase()]))
      .catch(() => Number.NaN),
  ]);
  const parts: string[] = [];
  // Coinbase candle rows are [time, low, high, open, close, volume].
  if (cb && Number.isFinite(cb[3]) && Number.isFinite(cb[4])) {
    parts.push(`opened at ${formatPrice(cb[3]!, quote)} and closed at ${formatPrice(cb[4]!, quote)} on Coinbase for the UTC day`);
  }
  if (Number.isFinite(cg) && cg > 0) parts.push(`${parts.length ? "and " : ""}CoinGecko's daily snapshot for the date was ${formatPrice(cg, quote)}`);
  if (!parts.length) {
    return { asset: asset.name, symbol: asset.symbol, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `The price of ${label} on ${date} could not be retrieved: neither Coinbase nor CoinGecko returned a figure for that date. This is not a statement that it had no price.` };
  }
  return { asset: asset.name, symbol: asset.symbol, verdict: "historical_price", confidence: 0.85,
    reason: `On ${date}, ${label} ${parts.join(", ")}. These are historical figures for that day, not a current price.` };
}
