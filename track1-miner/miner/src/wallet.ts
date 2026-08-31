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

/** An ENS name in the question, e.g. "vitalik.eth". */
export function ensName(text: string): string | null {
  return String(text ?? "").match(/\b([a-z0-9][a-z0-9-]{2,}\.eth)\b/i)?.[1]?.toLowerCase() ?? null;
}

/**
 * An ENS name resolved to the address it points at.
 *
 * We used to refuse these outright — "no valid wallet address was supplied" —
 * which is a guaranteed zero on every question that names a wallet the way
 * people actually name them. `preflight` answers them, and answered the epoch
 * 296 question at 0.004328 against our 0.000123.
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

export function walletChain(text: string): string {
  const s = String(text ?? "").toLowerCase();
  if (/\bbase\b/.test(s)) return "base";
  if (/\barbitrum\b|\barb\b/.test(s)) return "arbitrum";
  if (/\boptimism\b|\bop mainnet\b/.test(s)) return "optimism";
  if (/\bpolygon\b|\bmatic\b/.test(s)) return "polygon";
  return "ethereum";
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

/** Wei to a decimal string that keeps small balances legible and drops trailing zeros. */
export function formatEth(wei: bigint): string {
  if (wei === 0n) return "0";
  const eth = Number(wei) / 1e18;
  const s = eth >= 0.0001 ? eth.toFixed(4) : eth.toExponential(2);
  return s.includes("e") ? s : s.replace(/0+$/, "").replace(/\.$/, "");
}

export async function checkBalance(question: string, timeoutMs = TIMEOUT_MS): Promise<WalletResult> {
  const now = new Date().toISOString();
  // A question may name the wallet by ENS rather than by address, and refusing
  // those scored zero on every one of them.
  const ens = walletAddress(question) ? null : ensName(question);
  const address = walletAddress(question) ?? (ens ? await resolveEns(ens, timeoutMs) : null);
  const chain = walletChain(question);
  const symbol = SYMBOL[chain] ?? "ETH";
  const base: WalletResult = {
    address, chain, balance_eth: null, symbol,
    verdict: "unknown", confidence: 0, reason: "", checked_at: now,
  };

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
      `${chain}. This was determined by querying the eth_getBalance RPC method against the ` +
      `${chain} network, which returns the account's balance in wei at the latest block.` +
      caveat,
  };
}
