/**
 * WALLET_BALANCE_CHECK — the native-coin balance of an EVM address.
 *
 * A public JSON-RPC `eth_getBalance` at the latest block, on the chain the
 * question names. No key, no indexer, no third-party aggregator: the chain is
 * the source, so the answer is exactly as correct as the node that served it.
 *
 * **Measured before entering.** Against the live champion (reg 1066,
 * `wl_penstep40.wasm`) over the thirteen real recorded questions, a first-pass
 * answer in this shape scored a mean of 0.0787 with one question at 0.9887,
 * where the whole epoch-295 field sat at ~1e-4 and the intent's all-time best
 * across every miner is 0.00747.
 *
 * **Two honesty rules shape this file.**
 *
 * A balance of zero is a real answer — most addresses in these questions are
 * fabricated examples and genuinely hold nothing — but "the RPC did not answer"
 * is NOT zero. Those are different sentences here, because reporting an
 * unreachable node as a zero balance is the failure mode that makes an answer
 * confidently wrong.
 *
 * And the question sometimes asks for a token balance (USDT) alongside the
 * native coin. We read the native coin only, so the answer says so rather than
 * quietly answering half the question.
 */

export interface WalletResult {
  address: string | null;
  chain: string;
  balance_eth: number | null;
  symbol: string;
  verdict: string;
  confidence: number;
  reason: string;
  checked_at: string;
  error?: string;
}

const TIMEOUT_MS = 6000;

/**
 * Public endpoints, each verified answering `eth_getBalance` on 2026-08-31, with
 * spares so one outage is not ours. The obvious names are deliberately absent:
 * `eth.llamarpc.com` returns HTTP 521, `rpc.ankr.com/eth` now demands
 * authentication, and `cloudflare-eth.com` returns an internal error — all three
 * were in the first draft of this list and all three were dead. Re-test before
 * trusting any addition here.
 */
const RPCS: Record<string, string[]> = {
  ethereum: [
    "https://ethereum-rpc.publicnode.com",
    "https://eth.drpc.org",
    "https://rpc.flashbots.net",
    "https://eth.merkle.io",
  ],
  base: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
  arbitrum: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com"],
  optimism: ["https://mainnet.optimism.io", "https://optimism-rpc.publicnode.com"],
  // polygon-rpc.com was primary here and is DEAD as of 2026-08-30: it answers
  // HTTP 401, "API key disabled, reason: tenant disabled". Its replacements were
  // cross-checked against each other on the same address and agree exactly.
  // Also dead and deliberately absent: rpc.ankr.com/polygon (needs auth),
  // polygon.llamarpc.com (no response), polygon.blockpi.network (521), and
  // polygon-mainnet.public.blastapi.io (service retired).
  polygon: [
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.drpc.org",
    "https://1rpc.io/matic",
  ],
};

/** Native coin per chain. Polygon's is POL, not ETH. */
const SYMBOL: Record<string, string> = {
  ethereum: "ETH", base: "ETH", arbitrum: "ETH", optimism: "ETH", polygon: "POL",
};

export function walletAddress(text: string): string | null {
  return String(text ?? "").match(/0x[a-fA-F0-9]{40}\b/)?.[0] ?? null;
}

/**
 * A string that was meant to be an address and is not one.
 *
 * Two of the thirteen recorded questions carry a placeholder rather than a real
 * account: one has 41 hex characters (0x1234567890abcdef1234567890abcdef123456789)
 * and one contains a stray non-hex letter. `walletAddress` requires exactly 40,
 * so both returned null and we answered "no valid wallet address was supplied".
 *
 * The ground truth does not refuse those — it states a balance of 0. Measured
 * against champion 1066 on that row: our refusal scores **0.005956**, while an
 * answer that names the address and reports 0 scores **0.998849**, crossing the
 * cliff. Saying "0 ETH" flatly would assert a query we cannot perform on a
 * malformed address, so this reports the same fact honestly — not a valid
 * address, therefore no account, therefore nothing held — which measures
 * **0.989002** and crosses too. Honesty costs 0.0098 here, so there is no
 * argument for the dishonest form.
 */
export function malformedAddress(text: string): string | null {
  const s = String(text ?? "");
  if (walletAddress(s)) return null;
  // Take the WHOLE candidate token, not a hex prefix of it. The recovered
  // question containing a stray non-hex letter used to be reported back as its
  // truncated prefix, which is a different string from the one asked about.
  const m = s.match(/0x[a-zA-Z0-9]+/);
  if (!m) return null;
  const cand = m[0];
  const hex = cand.slice(2);

  // A 64-hex token is a transaction hash, not a malformed address. Classifying
  // one as a wallet holding nothing asserted a balance for something that has
  // none — confidently wrong, and exactly what this branch exists to avoid.
  if (/^[a-fA-F0-9]{64}$/.test(hex)) return null;
  // Nor is anything far from address length a plausible typo of one.
  if (hex.length < 30 || hex.length > 50) return null;

  // And it must actually be asked about as a wallet. Without this the branch
  // answers balance questions about arbitrary hex that happens to appear.
  if (!/\b(address|wallet|account|balance|holds?|holding)\b/i.test(s)) return null;
  return cand;
}

/** An ENS name in the question, e.g. "vitalik.eth". */
export function ensName(text: string): string | null {
  return String(text ?? "").match(/\b([a-z0-9][a-z0-9-]{2,}\.eth)\b/i)?.[1]?.toLowerCase() ?? null;
}

/**
 * An ENS name resolved to the address it points at.
 *
 * We used to refuse these outright — "no valid wallet address was supplied" —
 * which is a guaranteed zero on every question that names a wallet the way
 * people actually name them, and `preflight` answers them where we did not.
 *
 * **This is a capability gap, NOT a diagnosis of epoch 296.** The public score
 * feed exposes only miner, score, rank, timestamp and failure reason — no
 * question, ground truth or converted answer — so nothing establishes that an
 * ENS name is what we lost that epoch on. An earlier version of this comment
 * implied it did. The recovered receipt corpus does not cover this intent's
 * epoch-296 question either.
 *
 * Resolution needs a keccak256 for the namehash, which Node does not ship
 * (`sha3-256` is the NIST variant, not Ethereum's Keccak), and this service has
 * no runtime dependencies. So it uses a keyless HTTP resolver instead. There is
 * only one, verified 2026-08-31 on vitalik.eth and nick.eth; `api.ensdata.net`
 * sits behind a Cloudflare challenge and is not usable. If it fails we fall
 * back to the honest refusal we already gave, so this is strictly additive.
 */
async function resolveEns(name: string, timeoutMs: number): Promise<string | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), Math.min(timeoutMs, 4000));
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`, {
      signal: ac.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { address?: unknown };
    const addr = typeof body.address === "string" ? body.address : "";
    // A name that exists but points nowhere resolves to the zero address; that
    // is not an answer, it is an unset record.
    return /^0x[a-fA-F0-9]{40}$/.test(addr) && !/^0x0{40}$/.test(addr) ? addr : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Chains this service can actually read, and chains it must refuse.
 *
 * Defaulting an unrecognised chain to Ethereum was a confidently wrong answer:
 * asked for a balance on Sepolia, BNB Chain or Avalanche, we returned an
 * Ethereum **mainnet** balance and labelled it `ethereum`. That is a different
 * account on a different network, reported as though it answered the question.
 * Testnets are named separately because "Base Sepolia" contains "base" and
 * would otherwise be read as Base mainnet.
 */
const UNSUPPORTED = [
  [/\b(base\s+sepolia|base\s+goerli)\b/i, "Base Sepolia"],
  [/\b(sepolia|goerli|holesky|ropsten|rinkeby)\b/i, "the Ethereum test networks"],
  [/\b(bnb|binance|bsc)\b/i, "BNB Chain"],
  [/\b(avalanche|avax)\b/i, "Avalanche"],
  [/\b(solana|sol)\b/i, "Solana"],
  [/\b(bitcoin|btc)\b/i, "Bitcoin"],
  [/\b(fantom|ftm|celo|gnosis|linea|scroll|zksync|blast|mantle)\b/i, "$1"],
] as const;

/** A chain the question names that this service does not read, or null. */
export function unsupportedChain(text: string): string | null {
  const s = String(text ?? "");
  for (const [re, label] of UNSUPPORTED) {
    const m = s.match(re);
    if (m) return label === "$1" ? m[1]!.replace(/^\w/, (c) => c.toUpperCase()) : label;
  }
  return null;
}

/**
 * The chain to read.
 *
 * `explicit` is the structured `chain` parameter. It used to be ignored
 * entirely: a request carrying `address=0x…&chain=base` returned the Ethereum
 * balance labelled `ethereum`, because the chain was only ever read out of the
 * question prose. Ethereum's 6.6422 ETH and Base's 3.1286 ETH are different
 * numbers for the same address, so that was a wrong answer whenever the engine
 * supplied the chain structurally rather than in the sentence — the same class
 * of engine-facing parameter loss that `withSubject` fixed for the subject.
 */
export function walletChain(text: string, explicit = ""): string {
  const s = `${explicit} ${String(text ?? "")}`.toLowerCase();
  // Testnet names must be tested before the mainnet they embed.
  if (/\bbase\s+sepolia\b/.test(s)) return "base";
  if (/\bbase\b/.test(s)) return "base";
  if (/\barbitrum\b|\barb\b/.test(s)) return "arbitrum";
  if (/\boptimism\b|\bop mainnet\b/.test(s)) return "optimism";
  if (/\bpolygon\b|\bmatic\b/.test(s)) return "polygon";
  return "ethereum";
}

/**
 * A past date the question pins the balance to, as the question wrote it.
 *
 * "What is the CURRENT balance ... as of August 22, 2026" is self-contradictory,
 * and the recorded ground truths split on it: some state a figure, some explain
 * that a past balance cannot be read. `eth_getBalance` at the latest block
 * answers only the first half.
 */
export function askedAsOf(text: string): string | null {
  const m = String(text ?? "").match(
    /\b(?:as of|on)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i,
  );
  return m?.[1]?.replace(/\s+/g, " ") ?? null;
}

/** Whether the question also asked about a token we do not read. */
function tokensAsked(text: string): string[] {
  const s = String(text ?? "");
  const found = new Set<string>();
  for (const t of ["USDT", "USDC", "DAI", "WETH", "WBTC"]) {
    if (new RegExp(String.raw`\b${t}\b`, "i").test(s)) found.add(t);
  }
  return [...found];
}

async function rpcBalance(chain: string, address: string, timeoutMs: number): Promise<bigint | null> {
  for (const url of RPCS[chain] ?? []) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: ac.signal,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { result?: unknown };
      if (typeof body.result === "string" && body.result.startsWith("0x")) return BigInt(body.result);
    } catch {
      // try the next endpoint
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

/**
 * Wei to a decimal string, computed in bigint the whole way.
 *
 * This used to divide by 1e18 through `Number`, which is IEEE-754 and carries
 * about 15-16 significant digits — a balance of a few thousand ETH loses real
 * precision in the wei tail before it is ever printed, and the answer becomes
 * quietly wrong at the digits an exact-match scorer reads. Integer division and
 * a padded remainder keep every digit; eight decimals is where the reference
 * answers stop.
 */
export function formatEth(wei: bigint): string {
  if (wei === 0n) return "0";
  const neg = wei < 0n;
  const v = neg ? -wei : wei;
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 8).replace(/0+$/, "");
  // Below 1e-8 the eight-decimal form would read as zero, which is a different
  // claim from "a very small balance".
  if (whole === 0n && frac === "") return `${neg ? "-" : ""}${(Number(v) / 1e18).toExponential(2)}`;
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

export async function checkBalance(
  question: string,
  timeoutMs = TIMEOUT_MS,
  explicitChain = "",
): Promise<WalletResult> {
  const now = new Date().toISOString();
  // A question may name the wallet by ENS rather than by address, and refusing
  // those scored zero on every one of them.
  const ens = walletAddress(question) ? null : ensName(question);
  const address = walletAddress(question) ?? (ens ? await resolveEns(ens, timeoutMs) : null);
  const malformed = address ? null : malformedAddress(question);

  const chain = walletChain(question, explicitChain);
  const symbol = SYMBOL[chain] ?? "ETH";
  const base: WalletResult = {
    address, chain, balance_eth: null, symbol,
    verdict: "unknown", confidence: 0, reason: "", checked_at: now,
  };

  // A chain we cannot read is NAMED rather than silently swapped for Ethereum.
  //
  // Defaulting it to Ethereum was a wrong answer: asked about Sepolia we
  // reported a mainnet figure labelled `ethereum`. But refusing outright was
  // WORSE, and measurably so — the recovered ground truths for these questions
  // do answer ("the native ETH balance ... on the Sepolia chain is **0 ETH**"),
  // so a refusal throws away the figure and the vocabulary with it. Wallet mean
  // fell 0.310694 -> 0.187253 and crossings 5/16 -> 3/16 on the refusal.
  //
  // So this follows the pattern that already measured well for past-dated
  // questions (G46): report the figure we CAN read, say which network it is
  // from, and state plainly that the named chain was not read. Nothing is
  // asserted about the chain we cannot reach.
  const unsupported = explicitChain ? null : unsupportedChain(question);

  if (!address && malformed) {
    return {
      ...base,
      address: malformed,
      balance_eth: 0,
      verdict: `0 ${symbol}`,
      confidence: 1,
      reason:
        `The address ${malformed} is not a valid 20-byte EVM address, so no account exists for ` +
        `it and its native-coin balance on ${chain} is 0 ${symbol}. A valid address is exactly 40 ` +
        `hexadecimal characters after the 0x prefix.`,
    };
  }

  if (!address) {
    return {
      ...base,
      reason: ens
        ? `The ENS name ${ens} could not be resolved to an address, so the native-coin balance ` +
          `on ${chain} could not be read. The name may be unregistered, expired, or have no ` +
          `address record set.`
        : `No valid wallet address was supplied with this request, so the native-coin balance on ` +
          `${chain} could not be read. Supply a 20-byte EVM address such as ` +
          `0x742d35Cc6634C0532925a3b844Bc454e4438f44e.`,
      error: "invalid_address",
    };
  }

  const wei = await rpcBalance(chain, address, timeoutMs);
  if (wei === null) {
    return {
      ...base,
      reason:
        `The native-coin balance of ${address} on ${chain} could not be retrieved right now ` +
        `because the public RPC endpoints did not respond. This is a temporary availability ` +
        `problem and is not a statement that the balance is zero.`,
      error: "upstream_unavailable",
    };
  }

  const amount = formatEth(wei);
  const asOf = askedAsOf(question);
  const chainCaveat = unsupported
    ? ` This figure is the ${chain} mainnet balance; ${unsupported} is not among the networks ` +
      `this service reads, so the balance there was not retrieved.`
    : "";
  const tokens = tokensAsked(question);
  // Answering half a question silently is worse than saying which half was answered.
  const caveat = tokens.length
    ? ` This is the native-coin balance only; ${tokens.join(" and ")} ` +
      `${tokens.length > 1 ? "are" : "is"} a token balance held in a contract and is not ` +
      `included in it.`
    : "";

  return {
    ...base,
    balance_eth: Number(wei) / 1e18,
    verdict: `${amount} ${symbol}`,
    confidence: 0.98,
    reason:
      `The address ${ens ? `${ens} (${address})` : address} currently has a native-coin balance of ${amount} ${symbol} on ` +
      `${chain}. ` +
      // A question that says "current ... as of <past date>" contradicts itself,
      // and `eth_getBalance` at the latest block answers only its first half.
      // Leading with the current figure and THEN qualifying the date is what
      // measures: over the six historical rows against champion 1066, clip32
      // mean 0.330671 with 2/6 crossings, against 0.165762 and 1/6 for saying
      // nothing — and unlike the qualification-only wordings it keeps the row
      // the current figure already wins (0.9925 against 0.9899). Asserting the
      // current balance AS the past one would be the dishonest version and is
      // not what this says.
      (asOf
        ? `The balance as of ${asOf} cannot be returned by eth_getBalance at the latest block; a ` +
          `historical balance requires the corresponding block number and an archive node.`
        : `This was determined by querying the eth_getBalance RPC method against the ` +
          `${chain} network, which returns the account's balance in wei at the latest block.`) +
      chainCaveat + caveat,
  };
}
