/**
 * TVL_LOOKUP — total value locked, in the three scopes the intent actually asks
 * about.
 *
 * WHY THREE SCOPES. The canonical description's own worked example is not a
 * protocol lookup at all:
 *
 *   "For the token at contract 0x8335…913 on base, how deep is its own trading
 *    liquidity in DEX pools (e.g. Uniswap)? Give this token's pool liquidity in
 *    USD."
 *
 * That is a *token's* pool liquidity, keyed by contract address and chain. The
 * description also covers "a specific DeFi protocol, pool or chain", so the
 * endpoint has to tell three different questions apart and answer each from a
 * source that actually holds that quantity. Answering a token-liquidity question
 * with a protocol's TVL is the failure this file is shaped to avoid.
 *
 * WHAT THE SCORER REWARDS. Measured 2026-09-08 against the live champion
 * (`tvl_reg49.wasm`, reg 49) via tools/candidate-bench.mjs, three cases x three
 * authored ground-truth registers:
 *
 *   shape                                          clip32 mean
 *   chain TVL, entity + figure + scope + source       0.3397
 *   protocol TVL, entity + figure + scope + source    0.3323
 *   protocol TVL, bare number                         0.0973
 *   chain TVL, bare number                            0.0761
 *   answering the wrong scope                         0.0028 - 0.0083
 *
 * Two things follow. A full sentence naming the entity, the figure, the scope
 * and the source beats a bare number roughly fourfold; and answering the wrong
 * scope lands at the floor, which is what makes scope resolution the whole job.
 * Unlike CVE and ONCHAIN this scorer is a **gradient** — the live leader sits
 * between 0.001 and 0.21 and no miner has ever crossed 0.5 in 55 epochs — so
 * being better is measurable here rather than all-or-nothing.
 *
 * A caveat recorded rather than exploited: on the token-liquidity case an honest
 * "no liquidity data could be retrieved" scored *above* a correct answer against
 * two of three registers, because it echoes the question's own words. That is a
 * weakness of a lexical scorer, and tuning toward it would mean serving a false
 * answer. See GAPS.
 *
 * TVL is a moving quantity, so this intent is not the immutable-fact regime that
 * ONCHAIN_TX_LOOKUP is. It is playable anyway *because* the scorer is a gradient:
 * partial credit does not require our snapshot to equal the scorer's.
 */

const TIMEOUT_MS = Number(process.env.TVL_TIMEOUT_MS ?? 4_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

export type TvlScope = "token_pool" | "protocol" | "chain";
export type TvlVerdict = "found" | "not_found" | "unknown";

export interface TvlResult {
  scope: TvlScope | null;
  subject: string | null;
  chain: string | null;
  usd: number | null;
  verdict: TvlVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/**
 * Chain words to the ids each provider uses. DefiLlama names chains in prose
 * ("Ethereum"), GeckoTerminal uses short ids ("eth"), DexScreener uses its own
 * ("ethereum"). All three are kept explicitly because guessing one from another
 * is wrong often enough to matter: Polygon is `polygon_pos` on GeckoTerminal and
 * `polygon` on DexScreener, and Avalanche is `avax` on one and `avalanche` on
 * the other.
 */
const CHAINS: Record<string, { llama: string; gecko: string; dex: string; words: RegExp }> = {
  base: { llama: "Base", gecko: "base", dex: "base", words: /\bbase\b/i },
  arbitrum: { llama: "Arbitrum", gecko: "arbitrum", dex: "arbitrum", words: /\barbitrum\b|\barb\b/i },
  optimism: { llama: "Optimism", gecko: "optimism", dex: "optimism", words: /\boptimism\b|\bop mainnet\b/i },
  polygon: { llama: "Polygon", gecko: "polygon_pos", dex: "polygon", words: /\bpolygon\b|\bmatic\b/i },
  bsc: { llama: "BSC", gecko: "bsc", dex: "bsc", words: /\bbsc\b|\bbnb\b|\bbinance smart chain\b/i },
  avalanche: { llama: "Avalanche", gecko: "avax", dex: "avalanche", words: /\bavalanche\b|\bavax\b/i },
  solana: { llama: "Solana", gecko: "solana", dex: "solana", words: /\bsolana\b|\bsol\b/i },
  ethereum: { llama: "Ethereum", gecko: "eth", dex: "ethereum", words: /\bethereum\b|\bmainnet\b|\beth\b|\bl1\b/i },
};

/**
 * Protocol names whose DefiLlama slug is not the slugified name. Kept short and
 * explicit: the full `/protocols` index is 8.7 MB and takes 4.7 s to download,
 * which does not fit inside an 11 s watchdog that also has to fetch an answer.
 * `resolveProtocol` therefore tries a handful of derived slugs directly, and
 * this map covers the ones no derivation reaches.
 */
const PROTOCOL_ALIASES: Record<string, string> = {
  curve: "curve-dex",
  "curve finance": "curve-dex",
  uniswap: "uniswap",
  "pancake swap": "pancakeswap",
  makerdao: "makerdao",
  maker: "makerdao",
  compound: "compound-finance",
  "compound finance": "compound-finance",
  gmx: "gmx",
  "lido finance": "lido",
  rocketpool: "rocket-pool",
  "rocket pool": "rocket-pool",
  "eigen layer": "eigenlayer",
  balancer: "balancer",
  sushiswap: "sushi",
  sushi: "sushi",
  "yearn finance": "yearn-finance",
  yearn: "yearn-finance",
  convex: "convex-finance",
  "convex finance": "convex-finance",
  "aave v3": "aave-v3",
  "aave v2": "aave-v2",
  "uniswap v3": "uniswap-v3",
  "uniswap v2": "uniswap-v2",
};

/** An EVM contract address, which is what makes a question a token question. */
export function contractAddress(text: string): string | null {
  const m = String(text ?? "").match(/\b0x[a-fA-F0-9]{40}\b/);
  return m ? m[0].toLowerCase() : null;
}

/** Solana mint addresses are base58 and 32-44 chars; only read one when Solana is named. */
function solanaMint(text: string): string | null {
  const s = String(text ?? "");
  if (!/\bsolana\b|\bsol\b/i.test(s)) return null;
  const m = s.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  return m ? m[0] : null;
}

export function resolveChain(param: string, question: string): string | null {
  const p = String(param ?? "").trim().toLowerCase();
  if (p && CHAINS[p]) return p;
  for (const [name, c] of Object.entries(CHAINS)) if (c.words.test(String(param ?? ""))) return name;
  for (const [name, c] of Object.entries(CHAINS)) if (c.words.test(String(question ?? ""))) return name;
  return null;
}

export function supportedChains(): string[] {
  return Object.keys(CHAINS);
}

/**
 * Which of the three questions is this?
 *
 * Order matters and is not arbitrary. A contract address is the strongest
 * signal there is — the canonical example is exactly that — so it wins outright.
 * After that an explicit `protocol` parameter beats prose. Only then is the
 * question read, and "TVL on Base" is a chain question while "Aave's TVL" is a
 * protocol one; the discriminator is whether the named entity IS a chain.
 */
export function resolveScope(
  params: { address?: string; protocol?: string; chain?: string },
  question: string,
): TvlScope {
  const q = String(question ?? "");
  if (contractAddress(params.address ?? "") || contractAddress(q) || solanaMint(q)) return "token_pool";
  if (String(params.protocol ?? "").trim()) return "protocol";

  // "pool liquidity" / "DEX liquidity" asked without an address is still a
  // token-pool question in wording, but with nothing to look the token up by we
  // would have to guess a contract. It is answered as a protocol/chain question
  // when an entity is named, and refused honestly when one is not.
  const chainNamed = resolveChain(params.chain ?? "", q);
  const looksChain = /\b(on|for|of)\s+(the\s+)?\w+\s+(chain|network|l2)\b/i.test(q)
    || /\bchain(?:'s)?\s+(tvl|total value locked)\b/i.test(q)
    || /\b(tvl|total value locked)\s+(on|across)\s+\w+/i.test(q);
  if (chainNamed && (looksChain || !/\bprotocol\b|\bdefi app\b/i.test(q))) {
    // Only treat it as a chain question when the chain word is the SUBJECT.
    // "What is Aave's TVL on Base" names a chain but asks about a protocol.
    const subjectIsProtocol = /\b(aave|uniswap|lido|curve|compound|maker|sushi|balancer|gmx|pancake|convex|yearn|eigen|rocket)\b/i.test(q)
      || /\bprotocol\b/i.test(q);
    if (!subjectIsProtocol) return "chain";
  }
  return "protocol";
}

/**
 * The protocol name inside a question, when no `protocol` parameter was sent.
 *
 * Deliberately pattern-based rather than "the longest capitalised phrase": the
 * questions this intent gets are short and formulaic, and a wrong extraction
 * here is a lookup for the wrong protocol, which scores at the floor. Anything
 * these patterns do not match returns "" and the caller refuses honestly rather
 * than looking up a guess.
 */
const SUBJECT_PATTERNS: RegExp[] = [
  // "TVL of/in/for X", "total value locked in X"
  /\b(?:tvl|total value locked)\s+(?:in|of|for)\s+(?:the\s+)?([A-Za-z][\w .-]{1,40}?)(?=\s+(?:protocol|right now|now|today|currently|on\b)|[?.,!]|$)/i,
  // "how much is locked in X"
  /\bhow much (?:is\s+)?(?:value\s+)?(?:is\s+)?locked\s+(?:in|on)\s+(?:the\s+)?([A-Za-z][\w .-]{1,40}?)(?=\s+(?:protocol|right now|now|today|currently|on\b)|[?.,!]|$)/i,
  // "how much TVL does X have", "what TVL does X have"
  /\b(?:tvl|total value locked)\s+does\s+(?:the\s+)?([A-Za-z][\w .-]{1,40}?)\s+(?:have|hold)\b/i,
  // "X's TVL". Capped at three words so a whole interrogative clause cannot be
  // swallowed: "What is Curve's TVL?" must yield "Curve", not "What is Curve".
  /([A-Za-z][\w.-]*(?:\s+[A-Za-z][\w.-]*){0,2})(?:['’]s|s['’])\s+(?:tvl|total value locked)\b/i,
];

/** Words that are never a protocol name, so a pattern that captures one has mis-fired. */
const NOT_A_PROTOCOL = /^(the|a|an|it|this|that|defi|crypto|chain|network|protocol|total|value|token)$/i;

/**
 * Interrogative scaffolding that can end up inside a capture when the pattern
 * starts mid-sentence. Stripped from the FRONT only, repeatedly, so
 * "What is Curve" becomes "Curve" while a protocol whose name genuinely
 * contains one of these words keeps it in the middle.
 */
const LEADING_FILLER = /^(?:what|which|how|much|many|is|are|was|were|does|do|did|the|a|an|of|in|for|on|tell|me|about|right|now)\s+/i;

export function protocolSubject(question: string): string {
  const q = String(question ?? "").trim();
  for (const re of SUBJECT_PATTERNS) {
    const m = q.match(re);
    let raw = m?.[1]?.trim();
    if (!raw) continue;
    let previous = "";
    while (raw !== previous) { previous = raw; raw = raw.replace(LEADING_FILLER, "").trim(); }
    raw = raw.replace(/\s+(protocol|finance|defi)$/i, "").trim();
    if (raw && !NOT_A_PROTOCOL.test(raw) && raw.length >= 2) return raw;
  }
  return "";
}

async function getJson(url: string, timeout = TIMEOUT_MS): Promise<unknown> {
  const r = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeout),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function getText(url: string, timeout = TIMEOUT_MS): Promise<string> {
  const r = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeout),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

/** "$18.08 billion" alongside the exact figure — ground truths use both registers. */
export function human(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)} trillion`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)} billion`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)} million`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)} thousand`;
  return usd(n);
}

/** Candidate DefiLlama slugs for a protocol name, most likely first. */
export function protocolSlugs(name: string): string[] {
  const clean = String(name ?? "").trim().toLowerCase().replace(/[’']/g, "");
  if (!clean) return [];
  const alias = PROTOCOL_ALIASES[clean];
  const base = clean.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const noSuffix = base.replace(/-(protocol|finance|dao|network|exchange)$/i, "");
  const joined = clean.replace(/\s+/g, "");
  return [...new Set([alias, base, noSuffix, joined, `${noSuffix}-finance`, `${noSuffix}-dex`].filter(Boolean) as string[])];
}

/**
 * Protocol TVL from DefiLlama.
 *
 * `/tvl/{slug}` answers with a bare number and 400 "Protocol not found" for an
 * unknown slug, so an unknown protocol is distinguishable from an outage: a 400
 * on every candidate slug means we could not resolve the name, while a thrown
 * timeout means we do not know. Those are different answers.
 */
export async function protocolTvl(name: string, chain?: string | null): Promise<{ slug: string; usd: number } | null | "unavailable"> {
  const slugs = protocolSlugs(name);
  if (!slugs.length) return null;
  let sawRefusal = false;
  let sawUnavailable = false;
  for (const slug of slugs.slice(0, 4)) {
    try {
      if (chain) {
        const record = await getJson(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`) as {
          currentChainTvls?: Record<string, number>;
        };
        const label = chain === "optimism" ? "OP Mainnet" : CHAINS[chain]?.llama;
        const n = label ? record.currentChainTvls?.[label] : undefined;
        if (typeof n === "number" && Number.isFinite(n) && n >= 0) return { slug, usd: n };
        // A valid protocol record without that chain cannot justify the global total.
        if (record.currentChainTvls) sawRefusal = true;
        else sawUnavailable = true;
        continue;
      }
      const body = (await getText(`https://api.llama.fi/tvl/${encodeURIComponent(slug)}`)).trim();
      const n = Number(body);
      if (body && Number.isFinite(n) && n >= 0) return { slug, usd: n };
      sawUnavailable = true;
    } catch (e) {
      // A 400 is DefiLlama saying the slug is not a protocol; anything else is
      // an availability problem and must not become "this protocol has no TVL".
      if (/^HTTP (400|404)$/.test(String((e as Error).message))) sawRefusal = true;
      else sawUnavailable = true;
    }
  }
  return sawRefusal && !sawUnavailable ? null : "unavailable";
}

export async function chainTvl(chain: string): Promise<{ name: string; usd: number } | null | "unavailable"> {
  const want = CHAINS[chain]?.llama;
  if (!want) return null;
  let rows: Array<{ name: string; tvl: number }>;
  try {
    rows = (await getJson("https://api.llama.fi/v2/chains", 6_000)) as Array<{ name: string; tvl: number }>;
  } catch {
    return "unavailable";
  }
  const hit = rows.find((r) => String(r.name).toLowerCase() === want.toLowerCase() ||
    (chain === "optimism" && r.name === "OP Mainnet"));
  if (!hit || !Number.isFinite(hit.tvl)) return null;
  return { name: hit.name, usd: hit.tvl };
}

export interface PoolLiquidity {
  symbol: string | null;
  name: string | null;
  usd: number;
  /** True when the figure is the token's whole tracked reserve rather than a sum of listed pools. */
  complete: boolean;
  pools: number | null;
  top: { dex: string; pair: string; usd: number } | null;
}

/**
 * A token's own DEX pool liquidity.
 *
 * Two providers, and the distinction between them is reported rather than
 * smoothed over. GeckoTerminal's `total_reserve_in_usd` is the token's whole
 * tracked reserve across every pool it appears in. DexScreener returns at most
 * 30 pairs, so summing them is a floor, not a total — measured on USDC/Base the
 * same day, GeckoTerminal said $209,368,856 and the DexScreener top-30 sum said
 * $40,611,243. Reporting the second as "the" liquidity would understate it
 * fivefold, so `complete` records which one the figure came from and the answer
 * says so.
 */
export async function poolLiquidity(address: string, chain: string): Promise<PoolLiquidity | null | "unavailable"> {
  const gecko = CHAINS[chain]?.gecko;
  const dex = CHAINS[chain]?.dex;
  let out: PoolLiquidity | null = null;
  let sawRefusal = false;

  if (gecko) {
    try {
      const j = (await getJson(
        `https://api.geckoterminal.com/api/v2/networks/${gecko}/tokens/${encodeURIComponent(address)}`,
      )) as { data?: { attributes?: Record<string, string> } };
      const a = j.data?.attributes;
      const n = a ? Number.parseFloat(String(a.total_reserve_in_usd ?? "")) : NaN;
      if (Number.isFinite(n)) {
        out = { symbol: a?.symbol ?? null, name: a?.name ?? null, usd: n, complete: true, pools: null, top: null };
      }
    } catch (e) {
      if (String((e as Error).message) === "HTTP 404") sawRefusal = true;
    }
  }

  // DexScreener is asked either way: it names pools and their DEXes, which is
  // the part of the question that says "in DEX pools (e.g. Uniswap)". It returns
  // at most 30 and which 30 varies, so the pool it names is the largest OF THAT
  // SAMPLE and the answer says so rather than calling it the deepest.
  if (dex) {
    try {
      const j = (await getJson(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`)) as {
        pairs?: Array<{
          chainId: string; dexId: string; liquidity?: { usd?: number };
          baseToken: { symbol: string; name: string; address: string }; quoteToken: { symbol: string };
        }>;
      };
      const pairs = (j.pairs ?? [])
        .filter((p) => p.chainId === dex && Number.isFinite(p.liquidity?.usd))
        .sort((x, y) => (y.liquidity?.usd ?? 0) - (x.liquidity?.usd ?? 0));
      const t = pairs[0];
      if (t) {
        const sum = pairs.reduce((s, p) => s + (p.liquidity?.usd ?? 0), 0);
        const top = { dex: t.dexId, pair: `${t.baseToken.symbol}/${t.quoteToken.symbol}`, usd: t.liquidity?.usd ?? 0 };
        if (out) { out.pools = pairs.length; out.top = top; out.symbol ??= t.baseToken.symbol; out.name ??= t.baseToken.name; }
        else out = { symbol: t.baseToken.symbol, name: t.baseToken.name, usd: sum, complete: false, pools: pairs.length, top };
      } else if (!out) sawRefusal = true;
    } catch { /* GeckoTerminal alone is enough when it answered */ }
  }

  if (out) return out;
  return sawRefusal ? null : "unavailable";
}

/** The measured answer shape: entity, exact figure, scope, source. */
export async function lookupTvl(
  scope: TvlScope,
  subject: string,
  chain: string | null,
): Promise<TvlResult> {
  const base = { scope, subject: subject || null, chain, usd: null as number | null };

  if (scope === "token_pool") {
    const addr = contractAddress(subject) ?? solanaMint(subject) ?? subject;
    const c = chain ?? "ethereum";
    const r = await poolLiquidity(addr, c);
    if (r === "unavailable") {
      return {
        ...base, chain: c, verdict: "unknown", confidence: 0,
        reason:
          `The DEX pool liquidity for token ${addr} on ${c} could not be determined because the ` +
          `liquidity providers did not respond. This is an availability problem here, not a ` +
          `statement that the token has no liquidity.`,
        error: "provider_unavailable",
      };
    }
    if (!r) {
      return {
        ...base, chain: c, verdict: "not_found", confidence: 0.6,
        reason:
          `No DEX pool liquidity is tracked for the token at ${addr} on ${c}. The token was not ` +
          `found in the indexed pools of either liquidity source, which means it has no listed ` +
          `pools on that chain rather than that its liquidity is zero somewhere else.`,
      };
    }
    const named = r.symbol ? `${r.name ?? r.symbol} (${r.symbol})` : "the token";
    const scopeNote = r.complete
      ? "across all of its tracked pools"
      : `summed across its ${r.pools} largest listed pools, which is a floor rather than a total`;
    const topNote = r.top
      /**
       * "of the N listed", not "the deepest".
       *
       * DexScreener returns at most 30 pairs and WHICH 30 varies between reads:
       * for USDC on Base it named AERO/USDC at $33.4M one hour and LAPTOP/USDC
       * at $900k the next, from a stable 30-pair response each time. The real
       * deepest pool is certainly larger than either. Calling a sample maximum
       * "the deepest single pool" is a claim we cannot support, so the answer
       * says what it actually is.
       */
      ? ` The largest of the ${r.pools ?? 0} pools listed for it is ${r.top.pair} on ${r.top.dex} at ${usd(r.top.usd)}.`
      : "";
    return {
      ...base, chain: c, usd: r.usd, verdict: "found", confidence: r.complete ? 0.9 : 0.75,
      reason:
        `The token at ${addr} on ${c} is ${named}. Its own DEX pool liquidity is ${usd(r.usd)} ` +
        `(${human(r.usd)}) ${scopeNote}.${topNote} This is trading liquidity held in decentralised ` +
        `exchange pools, not the token's market capitalisation.`,
    };
  }

  if (scope === "chain") {
    const c = chain ?? "";
    const r = await chainTvl(c);
    if (r === "unavailable") {
      return {
        ...base, verdict: "unknown", confidence: 0,
        reason:
          `The total value locked on ${c || "that chain"} could not be determined because DefiLlama ` +
          `did not respond. This is an availability problem here, not a statement about the chain.`,
        error: "provider_unavailable",
      };
    }
    if (!r) {
      return {
        ...base, verdict: "not_found", confidence: 0.5,
        reason:
          `No total value locked figure is published for "${subject}". Chains this endpoint reads ` +
          `are ${supportedChains().join(", ")}.`,
      };
    }
    return {
      ...base, usd: r.usd, verdict: "found", confidence: 0.9,
      reason:
        `The ${r.name} chain has ${usd(r.usd)} (${human(r.usd)}) in total value locked across all ` +
        `DeFi protocols deployed on it, according to DefiLlama. This is the chain's aggregate TVL, ` +
        `not any single protocol's.`,
    };
  }

  const r = await protocolTvl(subject, chain);
  if (r === "unavailable") {
    return {
      ...base, verdict: "unknown", confidence: 0,
      reason:
        `The total value locked in ${subject || "that protocol"} could not be determined because ` +
        `DefiLlama did not respond. This is an availability problem here, not a statement that the ` +
        `protocol holds nothing.`,
      error: "provider_unavailable",
    };
  }
  if (!r) {
    return {
      ...base, verdict: "not_found", confidence: 0.5,
      reason:
        `No TVL for "${subject}"${chain ? ` on ${chain}` : ""} could be resolved on DefiLlama, so no total value locked ` +
        `figure is reported for it. A different spelling of the protocol's name, or its contract ` +
        `address if the question is about a token's pool liquidity, would be answerable.`,
    };
  }
  return {
    ...base, usd: r.usd, verdict: "found", confidence: 0.9,
    reason:
      `The ${subject} protocol has ${usd(r.usd)} (${human(r.usd)}) in total value locked, ` +
      `${chain ? `on ${chain}` : "aggregated across every chain it is deployed on"}, according to DefiLlama. This is value ` +
      `locked in the protocol, not the market capitalisation of its token.`,
  };
}
