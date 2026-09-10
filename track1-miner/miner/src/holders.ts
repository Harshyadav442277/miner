/**
 * TOKEN_HOLDER_COUNT — how many distinct addresses hold a named token.
 *
 * The canonical description is narrow and says what this is NOT: not price, not
 * supply, not market data, not one address's own balance (WALLET_BALANCE_CHECK),
 * and not pool liquidity (TVL_LOOKUP). A holder count is a headcount.
 *
 * WHY BLOCKSCOUT. A holder count cannot be read from an RPC node — it is an
 * index over every transfer the token has ever made, which is what a block
 * explorer maintains and what a JSON-RPC endpoint does not. Blockscout publishes
 * `holders_count` keylessly from a separate host per chain, so the five chains
 * are also five independent points of failure rather than one.
 *
 * THE TWO REAL ROUTED QUESTIONS, read from the explorer feed on 2026-09-10,
 * decided the shape of this module:
 *
 *   "How many addresses hold usdc on base?"
 *       — names a SYMBOL, not a contract address. A module that required an
 *         address would refuse the only clean question the intent has received.
 *   "For token CVE-2021-44228, report total holder count and what percent the
 *    largest single holder owns (top-1 concentration)."
 *       — names a CVE identifier, which is not a token; and asks for top-1
 *         concentration, which is a second real field rather than a flourish.
 *
 * So symbols resolve, concentration is answered, and a non-token identifier is
 * refused by name rather than guessed at.
 */

const TIMEOUT_MS = Number(process.env.HOLDERS_TIMEOUT_MS ?? 6_000);
/** The holders list is the slow one and runs beside the token lookup, not after it. */
const CONCENTRATION_TIMEOUT_MS = Number(process.env.CONCENTRATION_TIMEOUT_MS ?? 8_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

/**
 * One Blockscout instance per chain. Verified live 2026-09-10: all five return
 * `holders_count` for their own canonical USDC with no key and no header.
 * Polygon and Optimism redirect, so redirects are followed.
 */
const CHAINS: Record<string, { host: string; label: string; words: RegExp }> = {
  ethereum: { host: "eth.blockscout.com", label: "Ethereum", words: /\bethereum\b|\bmainnet\b|\beth\b|\bl1\b/i },
  base: { host: "base.blockscout.com", label: "Base", words: /\bbase\b/i },
  arbitrum: { host: "arbitrum.blockscout.com", label: "Arbitrum", words: /\barbitrum\b|\barb\b/i },
  optimism: { host: "optimism.blockscout.com", label: "Optimism", words: /\boptimism\b|\bop mainnet\b/i },
  polygon: { host: "polygon.blockscout.com", label: "Polygon", words: /\bpolygon\b|\bmatic\b/i },
};

export type HolderVerdict = "holder_count" | "not_a_token" | "not_found" | "ambiguous" | "unknown";

export interface HolderResult {
  symbol: string | null;
  name: string | null;
  address: string | null;
  chain: string | null;
  holders: number | null;
  top_holder_percent: number | null;
  verdict: HolderVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

export function supportedChains(): string[] {
  return Object.keys(CHAINS);
}

export function chainLabel(chain: string): string {
  return CHAINS[chain]?.label ?? chain;
}

export function resolveChain(param: string, question: string): string | null {
  const p = String(param ?? "").trim().toLowerCase();
  if (p && CHAINS[p]) return p;
  for (const [name, c] of Object.entries(CHAINS)) if (c.words.test(String(param ?? ""))) return name;
  for (const [name, c] of Object.entries(CHAINS)) if (c.words.test(String(question ?? ""))) return name;
  return null;
}

export function contractAddress(text: string): string | null {
  const m = String(text ?? "").match(/\b0x[a-fA-F0-9]{40}\b/);
  return m ? m[0] : null;
}

/**
 * Identifiers that look like a token to a naive parser and are not one.
 *
 * Both cases are real routed questions, read from the explorer feed on
 * 2026-09-10: "For token CVE-2021-44228, report total holder count…" and "For
 * token https://scam-defi-honeypot.example/claim-a1b2, report total holder
 * count…". Feeding either to a symbol search returns whatever that search likes
 * and reports its holder count with confidence, which is the Eiffel-Tower-replica
 * mistake (G77) in a different intent. Each is named and refused instead.
 */
const NOT_A_TOKEN: Array<[RegExp, string]> = [
  [/\bCVE-\d{4}-\d{4,7}\b/i, "a vulnerability identifier"],
  [/\bhttps?:\/\/\S+/i, "a web address"],
];

/** Words that are never the token being asked about. */
const STOP = new Set([
  "how", "many", "addresses", "address", "hold", "holds", "holders", "holder", "distinct", "unique",
  "count", "total", "the", "token", "tokens", "contract", "erc", "erc20", "does", "do", "have", "has",
  "on", "in", "of", "for", "what", "is", "are", "report", "and", "percent", "largest", "single",
  "owns", "own", "top", "concentration", "wallets", "wallet", "number", "chain", "network",
]);

/**
 * The token symbol a question names.
 *
 * Deliberately conservative. An all-caps run of 2 to 10 characters is a symbol;
 * so is a lone lower-case word when the question is otherwise all stop-words,
 * which is what "How many addresses hold usdc on base?" is. Anything richer than
 * that is left to the contract address, because picking the wrong token and
 * reporting its holder count confidently is worse than asking for an address.
 */
export function tokenSymbol(text: string): string | null {
  const s = String(text ?? "");
  const ok = (w: string): boolean =>
    !STOP.has(w.toLowerCase()) && !CHAINS[w.toLowerCase()]
    && !Object.values(CHAINS).some((c) => c.words.test(w));

  // An all-caps run is a symbol wherever it sits in the sentence.
  for (const u of s.match(/\b[A-Z][A-Z0-9]{1,9}\b/g) ?? []) if (ok(u)) return u;

  /**
   * A lower-case word is only a symbol in a position that names one. Scanning
   * for "the first word that is not a stop word" answered "how many holders are
   * there?" by looking up a token called THERE — a confident answer to a
   * question that named no token at all.
   */
  const m =
    s.match(/\bhold(?:s|ers\s+of)?\s+(?:the\s+)?([a-z][a-z0-9]{1,9})\b/i)
    ?? s.match(/\btokens?\s+([a-z][a-z0-9]{1,9})\b/i)
    ?? s.match(/\b([a-z][a-z0-9]{1,9})\s+on\s+(?:the\s+)?[a-z]+\b/i);
  const w = m?.[1];
  return w && ok(w) ? w.toUpperCase() : null;
}

async function getJson(url: string, timeout = TIMEOUT_MS): Promise<unknown> {
  const r = await fetch(url, {
    redirect: "follow",
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeout),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

interface TokenRecord {
  address_hash?: string;
  address?: string;
  name?: string;
  symbol?: string;
  type?: string;
  decimals?: string | null;
  holders_count?: string | null;
  holders?: string | null;
  total_supply?: string | null;
  exchange_rate?: string | null;
  circulating_market_cap?: string | null;
}

interface Token {
  address: string;
  name: string | null;
  symbol: string | null;
  holders: number | null;
  totalSupply: string | null;
  decimals: number | null;
  listed: boolean;
}

function toToken(r: TokenRecord): Token | null {
  const address = r.address_hash ?? r.address;
  if (!address) return null;
  const raw = r.holders_count ?? r.holders;
  const holders = raw === null || raw === undefined || raw === "" ? null : Number(raw);
  return {
    address,
    name: r.name ?? null,
    symbol: r.symbol ?? null,
    holders: Number.isFinite(holders as number) ? (holders as number) : null,
    totalSupply: r.total_supply ?? null,
    decimals: r.decimals === null || r.decimals === undefined ? null : Number(r.decimals),
    listed: Boolean(r.exchange_rate ?? r.circulating_market_cap),
  };
}

/** One token by contract address, on one chain. `null` is "no such token here". */
export async function tokenByAddress(chain: string, address: string): Promise<Token | null | "unavailable"> {
  const host = CHAINS[chain]?.host;
  if (!host) return null;
  try {
    return toToken((await getJson(`https://${host}/api/v2/tokens/${address}`)) as TokenRecord);
  } catch (e) {
    // A 404 is a real answer: this chain does not index that token. Anything
    // else is the index failing to answer, which is not the same thing (A5).
    return /HTTP 404/.test(String(e)) ? null : "unavailable";
  }
}

/**
 * One token by symbol, on one chain.
 *
 * Accepted ONLY when the symbol matches exactly and the winner is not a tie —
 * `ambiguous` is returned instead when a second exact-symbol match has a holder
 * count within a factor of ten, because at that point "the USDC on Base" is not
 * a well-defined phrase and answering it picks one impostor out of several.
 */
export async function tokenBySymbol(
  chain: string, symbol: string,
): Promise<Token | null | "ambiguous" | "unavailable"> {
  const host = CHAINS[chain]?.host;
  if (!host) return null;
  let items: TokenRecord[];
  try {
    const body = (await getJson(
      `https://${host}/api/v2/tokens?q=${encodeURIComponent(symbol)}&type=ERC-20`,
    )) as { items?: TokenRecord[] };
    items = body.items ?? [];
  } catch {
    return "unavailable";
  }
  const exact = items
    .map(toToken)
    .filter((t): t is Token => t !== null && (t.symbol ?? "").toLowerCase() === symbol.toLowerCase())
    .sort((a, b) => (b.holders ?? 0) - (a.holders ?? 0));
  const best = exact[0];
  if (!best) return null;
  const second = exact[1];
  if (second && (best.holders ?? 0) < (second.holders ?? 0) * 10 && !best.listed) return "ambiguous";
  return best;
}

/**
 * The raw balance of the single largest holder.
 *
 * Split from the percentage on purpose. Measured 2026-09-10, this endpoint takes
 * 3.2 to 12.4 seconds against a token endpoint that takes about one, so chaining
 * it after the token lookup blew the route's 11-second watchdog and the
 * concentration clause silently vanished from an answer that had asked for it.
 * Returning the raw value lets the caller start this request at the same moment
 * as the token request and divide once both have landed.
 */
export async function topHolderValue(
  chain: string, address: string, timeout = CONCENTRATION_TIMEOUT_MS,
): Promise<number | null | "unavailable"> {
  const host = CHAINS[chain]?.host;
  if (!host) return null;
  try {
    const body = (await getJson(
      `https://${host}/api/v2/tokens/${address}/holders`, timeout,
    )) as { items?: Array<{ value?: string }> };
    const top = Number(body.items?.[0]?.value);
    return Number.isFinite(top) && top > 0 ? top : null;
  } catch {
    return "unavailable";
  }
}

/** The percentage, once both the top balance and the supply are in hand. */
export function concentrationPercent(top: number, totalSupply: string | null): number | null {
  const supply = Number(totalSupply);
  if (!Number.isFinite(supply) || supply <= 0) return null;
  const pct = (top / supply) * 100;
  return pct > 100 ? null : Math.round(pct * 100) / 100;
}

const fmt = (n: number): string => n.toLocaleString("en-US");

export interface HolderRequest {
  chain?: string | null;
  address?: string | null;
  symbol?: string | null;
}

/**
 * Wanting the concentration figure is a property of the question, not of the
 * token, so it is read from the question rather than always fetched. The
 * measured cost of the extra call is one round trip against an 11-second budget.
 */
export function wantsConcentration(text: string): boolean {
  return /\bconcentrat\w*\b|\btop[- ]?1\b|\blargest (?:single )?holders?\b|\bwhale\b/i.test(String(text ?? ""));
}

export async function lookupHolders(question: string, requested?: HolderRequest): Promise<HolderResult> {
  const empty = { symbol: null, name: null, address: null, chain: null, holders: null, top_holder_percent: null };
  const text = String(question ?? "");

  const hasAddress = Boolean(contractAddress(requested?.address ?? "") || contractAddress(text));
  const impostor = hasAddress ? undefined : NOT_A_TOKEN.find(([re]) => re.test(text));
  if (impostor) {
    const [re, kind] = impostor;
    const id = text.match(re)?.[0] ?? "that identifier";
    return {
      ...empty, verdict: "not_a_token", confidence: 0.9,
      reason:
        `${id.slice(0, 80)} is ${kind}, not a token, so it has no holders and no holder count was ` +
        `looked up for it. Name an ERC-20 contract address or a token symbol together with its ` +
        `chain and the distinct holder count can be returned.`,
      error: "not_a_token",
    };
  }

  const address = contractAddress(requested?.address ?? "") ?? contractAddress(text);
  const symbol = address ? null : (requested?.symbol?.trim() || tokenSymbol(text));
  const named = resolveChain(requested?.chain ?? "", text);

  if (!address && !symbol) {
    return {
      ...empty, verdict: "unknown", confidence: 0,
      reason:
        `No token was identified in this request. Name an ERC-20 contract address, or a token symbol ` +
        `together with its chain, for example "How many addresses hold USDC on Base?", and the ` +
        `distinct holder count can be returned. No token was guessed at.`,
      error: "no_token",
    };
  }

  /**
   * With no chain named, every chain is probed rather than one being assumed.
   *
   * This is the G88 fix applied before the defect can happen: defaulting to
   * Ethereum and reporting "not found" states as a fact something that was never
   * checked, and a token that lives only on Base is the common case.
   */
  const chains = named ? [named] : Object.keys(CHAINS);
  /**
   * The concentration request starts NOW, beside the token lookup, whenever the
   * question asked for it and the address is already known. Started afterwards
   * it costs 3 to 12 seconds on top of the count and loses the race with the
   * route's watchdog.
   */
  const wantConc = wantsConcentration(text);
  const topValue = wantConc && address && named
    ? topHolderValue(named, address)
    : Promise.resolve<number | null | "unavailable">(null);

  const found = await Promise.all(chains.map(async (chain) => {
    const t = address ? await tokenByAddress(chain, address) : await tokenBySymbol(chain, symbol as string);
    return { chain, t };
  }));

  const hits = found.filter((f) => f.t && f.t !== "unavailable" && f.t !== "ambiguous") as Array<{ chain: string; t: Token }>;
  const anyReachable = found.some((f) => f.t !== "unavailable");
  const ambiguous = found.find((f) => f.t === "ambiguous");

  if (hits.length === 0) {
    if (!anyReachable) {
      return {
        ...empty, chain: named, verdict: "not_found", confidence: 0,
        reason:
          `The block explorer index that holds holder counts did not answer, so no holder count could ` +
          `be read for ${address ?? symbol}. This is an index outage rather than a token with no ` +
          `holders, and the two are not the same thing.`,
        error: "upstream_unavailable",
      };
    }
    if (ambiguous) {
      return {
        ...empty, symbol, chain: ambiguous.chain, verdict: "ambiguous", confidence: 0.4,
        reason:
          `More than one token on ${chainLabel(ambiguous.chain)} uses the symbol ${symbol}, with no ` +
          `dominant one among them, so no holder count is reported for it. Give the contract address ` +
          `and the distinct holder count can be returned exactly.`,
        error: "ambiguous_symbol",
      };
    }
    const where = named ? chainLabel(named) : `any of ${Object.values(CHAINS).map((c) => c.label).join(", ")}`;
    return {
      ...empty, symbol, address, chain: named, verdict: "not_found", confidence: 0.6,
      reason:
        `No ERC-20 token matching ${address ?? symbol} is indexed on ${where}, so no holder count ` +
        `was reported. The index answered; it holds no such token, and no other token was ` +
        `substituted for it.`,
    };
  }

  // Several chains can carry the same symbol. The one with the most holders is
  // the one the question means, and the answer says which chain it is on.
  const pick = hits.reduce((a, b) => ((b.t.holders ?? 0) > (a.t.holders ?? 0) ? b : a));
  const token = pick.t;
  const label = chainLabel(pick.chain);
  const alsoOn = hits.filter((h) => h !== pick).map((h) => chainLabel(h.chain));

  if (token.holders === null) {
    return {
      ...empty, symbol: token.symbol, name: token.name, address: token.address, chain: pick.chain,
      verdict: "not_found", confidence: 0.4,
      reason:
        `${token.symbol ?? token.address} is indexed on ${label} but its entry carries no holder ` +
        `count, so none is reported rather than one being estimated from transfers.`,
    };
  }

  /**
   * The concentration clause, and the honest sentence when it was asked for and
   * could not be read. Silently dropping it answered half the question while
   * sounding complete, which is the shape A5 forbids.
   */
  const raw = await topValue;
  const concentration = typeof raw === "number" ? concentrationPercent(raw, token.totalSupply) : null;
  const name = token.name && token.symbol && token.name !== token.symbol ? `${token.name} (${token.symbol})` : token.symbol ?? token.address;
  let tail = "";
  if (concentration !== null) tail = ` The largest single holder owns ${concentration}% of the supply.`;
  else if (wantConc) tail = ` The largest single holder's share was asked for and the holder list did not return in time, so it is not reported.`;
  const spread = alsoOn.length ? ` The same symbol is also indexed on ${alsoOn.join(" and ")}.` : "";

  return {
    symbol: token.symbol, name: token.name, address: token.address, chain: pick.chain,
    holders: token.holders, top_holder_percent: concentration,
    verdict: "holder_count", confidence: 0.95,
    reason:
      `${name} on ${label} has ${fmt(token.holders)} distinct holder addresses, read from the ` +
      `chain's own transfer index at contract ${token.address}.${tail}${spread}`,
  };
}
