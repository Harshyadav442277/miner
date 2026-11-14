/**
 * TOKEN_TOTAL_SUPPLY_VERIFY — an ERC-20's total supply and burned balance, read
 * with `eth_call` at one pinned block from two independent public RPCs.
 *
 * The site's row (read 2026-10-25): "Calling totalSupply() on an ERC-20/SPL
 * contract returns an exact integer"; miners "execute eth_call view functions
 * against token contracts via independent archive nodes"; target < 500 ms.
 *
 * Both providers are asked at the same block, so a difference between them is a
 * real disagreement and not two reads a block apart. The block sits a few blocks
 * behind the first provider's head, so a provider that lags slightly still has it.
 *
 * Burned supply is the balance held by the two conventional burn addresses
 * (0x…dEaD and the zero address). A token that burns by reducing totalSupply has
 * already removed it from the total. Circulating supply needs a list of treasury
 * and locked wallets that is not on-chain, so it is not computed, and the answer
 * says so. EVM chains only: no Solana SPL.
 */
import { addressForSymbol, chainLabel, contractAddress, resolveChain, tokenSymbol } from "./holders";
import { knownToken, nativeCoin, TABLE_NOTE, TOKEN_NAMES } from "./known-tokens";
import { RPCS } from "./wallet";

const TIMEOUT_MS = Number(process.env.TOKEN_SUPPLY_TIMEOUT_MS ?? 2_500);
const BURN_ADDRESSES = ["0x000000000000000000000000000000000000dEaD", "0x0000000000000000000000000000000000000000"];
/** Blocks behind the head, about ten seconds on each chain. */
const LAG: Record<string, number> = { ethereum: 1, base: 5, optimism: 5, polygon: 5, arbitrum: 40 };

/**
 * A symbol's contract does not move, and resolving it (GeckoTerminal, holders.ts)
 * took 2–3 s of a 500 ms target from India on 2026-10-26. Kept a day per instance.
 */
const SYMBOL_TTL_MS = 24 * 3600_000;
const symbolCache = new Map<string, { at: number; address: string }>();

const SEL = { totalSupply: "0x18160ddd", decimals: "0x313ce567", symbol: "0x95d89b41", balanceOf: "0x70a08231" };

export interface ProviderRead { provider: string; total_supply_raw: string | null }

export interface TokenSupplyResult {
  chain: string | null;
  token_address: string | null;
  symbol: string | null;
  decimals: number | null;
  total_supply: string | null;
  total_supply_raw: string | null;
  burned: string | null;
  burned_raw: string | null;
  burn_addresses: string[];
  supply_net_of_burn: string | null;
  block_number: number | null;
  providers: ProviderRead[];
  providers_agree: boolean | null;
  verdict: "verified" | "providers_disagree" | "not_a_token" | "ambiguous" | "not_found" | "insufficient_input" | "unknown";
  confidence: number;
  reason: string;
  source: string;
  error?: string;
}

/** `raw` in whole-token units, exact, without trailing zeros. Pure. */
export function units(raw: bigint, decimals: number): string {
  const neg = raw < 0n;
  const s = (neg ? -raw : raw).toString().padStart(decimals + 1, "0");
  const whole = decimals ? s.slice(0, -decimals) : s;
  const frac = decimals ? s.slice(-decimals).replace(/0+$/, "") : "";
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** An exact unit string, rounded for a sentence. Pure. */
export function readable(exact: string): string {
  return Number(exact).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** An ABI-encoded string, or a bytes32 for the older tokens (MKR) that return one. Pure. */
export function abiString(hex: string | null): string | null {
  const h = String(hex ?? "").replace(/^0x/, "");
  if (h.length === 64) return Buffer.from(h, "hex").toString("utf8").replace(/\0+$/, "") || null;
  if (h.length < 128) return null;
  const len = parseInt(h.slice(64, 128), 16);
  if (!Number.isFinite(len) || len > 64) return null;
  return Buffer.from(h.slice(128, 128 + len * 2), "hex").toString("utf8") || null;
}

function word(hex: string | null): bigint | null {
  return hex && /^0x[\da-f]{64}$/i.test(hex) ? BigInt(hex) : null;
}

async function rpc(url: string, method: string, params: unknown[]): Promise<string | null> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const body = await r.json() as { result?: unknown };
    return typeof body.result === "string" ? body.result : null;
  } catch {
    return null;
  }
}

/** `responded`: some call came back at all. An address with no code answers "0x", which is an answer, not an outage. */
interface ContractRead { responded: boolean; totalSupply: bigint | null; decimals: bigint | null; symbol: string | null; burned: Array<bigint | null> }

async function readContract(url: string, token: string, block: string): Promise<ContractRead> {
  const call = (data: string): Promise<string | null> => rpc(url, "eth_call", [{ to: token, data }, block]);
  const pad = (a: string): string => a.slice(2).toLowerCase().padStart(64, "0");
  const [supply, decimals, symbol, ...burned] = await Promise.all([
    call(SEL.totalSupply), call(SEL.decimals), call(SEL.symbol),
    ...BURN_ADDRESSES.map((a) => call(`${SEL.balanceOf}${pad(a)}`)),
  ]);
  return { responded: [supply, decimals, symbol, ...burned].some((x) => x !== null),
    totalSupply: word(supply), decimals: word(decimals), symbol: abiString(symbol), burned: burned.map(word) };
}

const SOURCE = "eth_call totalSupply(), decimals(), symbol() and balanceOf(burn addresses) on two public RPCs";

function empty(verdict: TokenSupplyResult["verdict"], reason: string, extra: Partial<TokenSupplyResult> = {}): TokenSupplyResult {
  return {
    chain: null, token_address: null, symbol: null, decimals: null, total_supply: null, total_supply_raw: null,
    burned: null, burned_raw: null, burn_addresses: BURN_ADDRESSES, supply_net_of_burn: null, block_number: null,
    providers: [], providers_agree: null, verdict, confidence: 0, reason, source: SOURCE, ...extra,
  };
}

/** Two providers' reads at one block, stated. Pure. */
export function verdictFor(
  chain: string, token: string, block: number, names: string[], reads: ContractRead[], chainNamed: boolean,
): TokenSupplyResult {
  const providers = reads.map((r, i) => ({ provider: names[i]!, total_supply_raw: r.totalSupply?.toString() ?? null }));
  const base = { chain, token_address: token, block_number: block, providers };
  const ok = reads.filter((r) => r.totalSupply !== null);
  if (!ok.length) {
    const answered = reads.some((r) => r.responded);
    return empty(answered ? "not_a_token" : "unknown",
      answered
        ? `${token} on ${chainLabel(chain)} did not return a totalSupply() value at block ${block}, so it is not an ERC-20 token contract.`
        : `Unknown: neither RPC answered a totalSupply() call for ${token} on ${chainLabel(chain)}. This is an outage, not a missing token.`,
      { ...base, error: answered ? "not_a_token" : "upstream_unavailable" });
  }
  const first = ok[0]!;
  const agree = ok.length === reads.length ? ok.every((r) => r.totalSupply === first.totalSupply) : null;
  const decimals = first.decimals !== null && first.decimals <= 77n ? Number(first.decimals) : null;
  const symbol = first.symbol ?? reads.find((r) => r.symbol)?.symbol ?? null;
  const name = symbol ?? token;
  const fmt = (v: bigint): string => (decimals === null ? v.toString() : units(v, decimals));
  const burnedParts = first.burned.filter((b): b is bigint => b !== null);
  const burned = burnedParts.length === BURN_ADDRESSES.length ? burnedParts.reduce((a, b) => a + b, 0n) : null;
  const total = first.totalSupply!;
  const out = {
    ...base, symbol, decimals,
    total_supply: fmt(total), total_supply_raw: total.toString(),
    burned: burned === null ? null : fmt(burned), burned_raw: burned?.toString() ?? null,
    burn_addresses: BURN_ADDRESSES,
    supply_net_of_burn: burned === null ? null : fmt(total - burned),
    providers_agree: agree, source: SOURCE,
  };
  const where = `on ${chainLabel(chain)} at block ${block}${chainNamed ? "" : " (no chain was named, so Ethereum was read)"}`;
  if (agree === false) {
    const sides = providers.map((p) => `${p.provider}: ${p.total_supply_raw ?? "no answer"}`).join("; ");
    return { ...out, verdict: "providers_disagree", confidence: 0.5,
      reason: `The two RPCs disagree on ${name}'s total supply ${where}: ${sides} (raw units).` };
  }
  const unit = decimals === null ? " raw units (decimals() did not answer)" : ` ${symbol ?? "tokens"}`;
  const burn = burned === null ? " The burn-address balances could not be read."
    : burned === 0n ? " Nothing is held at the burn addresses."
    : ` ${readable(fmt(burned))} are held at the burn addresses, leaving ${readable(fmt(total - burned))} net of burns.`;
  const check = agree ? "Both RPCs return the same value at that block." : "Read from one RPC; the other did not answer.";
  return { ...out, verdict: "verified", confidence: agree ? 1 : 0.8,
    reason: `${name}'s total supply ${where} is ${readable(fmt(total))}${unit} (exact: ${fmt(total)}).${burn} ${check}` +
      " Circulating supply, which excludes treasury and locked wallets, is not computed: those wallets are not on-chain facts." };
}

export async function verifyTokenSupply(question: string, tokenParam = "", chainParam = ""): Promise<TokenSupplyResult> {
  const text = `${tokenParam} ${question}`;
  const named = resolveChain(chainParam, question);
  const chain = named ?? "ethereum";
  const urls = (RPCS[chain] ?? []).slice(0, 2);
  const token = contractAddress(text);
  if (!token) {
    const supplyOf = question.match(/\bsupply\s+of\s+(?:the\s+)?([a-z][a-z0-9]{1,9})\b/i)?.[1];
    const asked = tokenParam.trim() && !/\s/.test(tokenParam.trim()) ? tokenParam.trim().toUpperCase()
      : tokenSymbol(question) ?? (supplyOf && !/^tokens?$/i.test(supplyOf) ? supplyOf.toUpperCase() : null);
    if (!asked) {
      return empty("insufficient_input", "No token contract address or symbol was supplied, so no supply could be read. Supply a contract address (0x…) or a symbol, and the chain.", { error: "no_token" });
    }
    const coin = nativeCoin(asked);
    if (coin) {
      return empty("not_a_token",
        `${coin.symbol} is the native coin of ${coin.of}, not an ERC-20 token contract, so it has no totalSupply() to read and no figure is given. ` +
          `${coin.note}${coin.wrapped ? ` For the wrapped token ${coin.wrapped}, whose supply is a contract value, ask for ${coin.wrapped}.` : ""}`,
        { chain: named, symbol: coin.symbol, error: "native_coin" });
    }
    const symbol = TOKEN_NAMES[asked] ?? asked;
    const listed = knownToken(chain, symbol);
    if (listed) {
      const r = await readSupply(chain, listed, urls, named !== null);
      const note = TABLE_NOTE[symbol];
      return r.verdict === "verified" && note ? { ...r, reason: `${r.reason} ${note}` } : r;
    }
    const cacheKey = `${chain}:${symbol}`;
    const cached = symbolCache.get(cacheKey);
    const found = cached && Date.now() - cached.at < SYMBOL_TTL_MS ? cached.address : await addressForSymbol(chain, symbol);
    if (found && found !== "ambiguous" && found !== "unavailable") symbolCache.set(cacheKey, { at: Date.now(), address: found });
    if (found === "ambiguous") {
      return empty("ambiguous", `More than one ${chainLabel(chain)} contract trades as ${symbol} with comparable liquidity, so which one is meant is unclear. Supply the contract address.`, { chain, symbol, error: "ambiguous_symbol" });
    }
    if (found === "unavailable") {
      return empty("unknown", `Unknown: the symbol ${symbol} could not be resolved to a contract because the token index did not answer. Supply the contract address.`, { chain, symbol, error: "upstream_unavailable" });
    }
    if (!found) {
      return empty("not_found", `No ${chainLabel(chain)} token trading as ${symbol} was found. Supply the contract address.`, { chain, symbol, error: "not_found" });
    }
    // A resolved contract is used only when its own symbol() is the one asked for: anything else is a guess.
    const r = await readSupply(chain, found, urls, named !== null);
    if (r.verdict === "verified" && r.symbol && r.symbol.toUpperCase() !== symbol) {
      return empty("ambiguous", `The ${chainLabel(chain)} contract found for ${symbol} reports its symbol as ${r.symbol}, so it is not certain to be the token meant, and no figure is given. Supply the contract address.`,
        { chain, symbol, token_address: found, error: "symbol_mismatch" });
    }
    return r;
  }
  return readSupply(chain, token, urls, named !== null);
}

async function readSupply(chain: string, token: string, urls: string[], chainNamed: boolean): Promise<TokenSupplyResult> {
  const head = await rpc(urls[0]!, "eth_blockNumber", []) ?? await rpc(urls[1] ?? urls[0]!, "eth_blockNumber", []);
  if (!head || !/^0x[\da-f]+$/i.test(head)) {
    return empty("unknown", `Unknown: the ${chainLabel(chain)} RPCs did not report a block height, so nothing could be read.`, { chain, token_address: token, error: "upstream_unavailable" });
  }
  const block = Number(BigInt(head)) - (LAG[chain] ?? 1);
  const tag = `0x${block.toString(16)}`;
  const reads = await Promise.all(urls.map((u) => readContract(u, token, tag)));
  return verdictFor(chain, token, block, urls.map((u) => new URL(u).hostname), reads, chainNamed);
}
