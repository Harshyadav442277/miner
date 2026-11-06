/**
 * ONCHAIN_METRIC_VERIFY — one named value read from chain nodes at a stated block height or at "latest".
 *
 * The intent's row (GET /engine/v1/intents, read 2026-11-07) asks for "a specific value read from a
 * blockchain node at a stated block height or 'latest': an event log field, gas consumed, a contract view
 * or storage value, a contract-held token balance". The block anchor is the point of the intent, so every
 * answer names the block it was read at, and "latest" is pinned a few blocks behind the head so two
 * providers read the same block.
 *
 * Five reads, picked from the question:
 *   - a transaction hash: its receipt (gas used, status, fee) and every ERC-20/721 Transfer log it carries;
 *   - "storage slot N" of a contract: eth_getStorageAt;
 *   - "total supply" of a token contract: totalSupply() at the block;
 *   - "balance" of an address: a token's balanceOf() when a token is named, else the native balance;
 *   - otherwise, with a block named: the block's gas used, gas limit, base fee and transaction count.
 *
 * Old state needs an archive node. On 2026-11-07 publicnode refused archive reads without a token and
 * flashbots answered "state at block … is pruned"; drpc and merkle answered. So every RPC of the chain is
 * asked and the first two that answer are kept; one answer is stated as one source, and none is an
 * "unknown", never a zero.
 */
import { chainLabel, contractAddress, resolveChain, tokenSymbol } from "./holders";
import { knownToken } from "./known-tokens";
import { abiString, readable, units } from "./token-supply";
import { RPCS } from "./wallet";

const TIMEOUT_MS = Number(process.env.ONCHAIN_METRIC_TIMEOUT_MS ?? 3_000);
const SECOND_MS = Number(process.env.ONCHAIN_METRIC_SECOND_MS ?? 700);
const LAG: Record<string, number> = { ethereum: 1, base: 5, optimism: 5, polygon: 5, arbitrum: 40, bsc: 5 };
const NATIVE: Record<string, string> = { ethereum: "ETH", base: "ETH", arbitrum: "ETH", optimism: "ETH", polygon: "POL", bsc: "BNB" };
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const SEL = { totalSupply: "0x18160ddd", decimals: "0x313ce567", symbol: "0x95d89b41", balanceOf: "0x70a08231" };

export type MetricKind = "tx_receipt" | "storage" | "total_supply" | "token_balance" | "native_balance" | "block";

export interface TransferLog { token: string; symbol: string | null; from: string; to: string; amount: string | null; amount_raw: string | null; token_id: string | null; log_index: number }

export interface OnchainMetricResult {
  chain: string | null;
  metric: MetricKind | null;
  block_number: number | null;
  block_anchor: "stated" | "latest" | null;
  value: string | null;
  value_raw: string | null;
  unit: string | null;
  providers: Array<{ provider: string; value_raw: string | null }>;
  providers_agree: boolean | null;
  verdict: "verified" | "providers_disagree" | "not_found" | "insufficient_input" | "unknown";
  confidence: number;
  reason: string;
  source: string;
  tx_hash?: string;
  tx_status?: "success" | "reverted" | null;
  gas_used?: string | null;
  fee?: string | null;
  transfers?: TransferLog[];
  address?: string;
  token_address?: string;
  error?: string;
}

interface Reply { result: unknown; error: string | null }

async function rpc(url: string, method: string, params: unknown[]): Promise<Reply> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return { result: null, error: `HTTP ${r.status}` };
    const body = await r.json() as { result?: unknown; error?: { message?: string } };
    return body.error ? { result: null, error: String(body.error.message ?? "error") } : { result: body.result ?? null, error: null };
  } catch (e) {
    return { result: null, error: e instanceof Error ? e.name : "error" };
  }
}

const host = (u: string): string => new URL(u).host;
const hex = (n: number): string => `0x${n.toString(16)}`;
const big = (v: unknown): bigint | null => (typeof v === "string" && /^0x[\da-f]*$/i.test(v) ? BigInt(v === "0x" ? 0 : v) : null);
const topicAddress = (t: string): string => `0x${t.slice(-40)}`;

/** The block a question names, "latest", or null when it names none. Pure. */
export function statedBlock(question: string, param = ""): number | "latest" | null {
  const p = String(param ?? "").trim().toLowerCase();
  if (p === "latest") return "latest";
  if (/^\d[\d,_]*$/.test(p)) return Number(p.replace(/[,_]/g, ""));
  const m = String(question).match(/\b(?:block(?:\s+(?:height|number))?|height)\s*(?:#|no\.?\s*)?(\d[\d,_]{0,14})\b/i);
  if (m) return Number(m[1]!.replace(/[,_]/g, ""));
  return /\blatest\b|\bcurrent(?:ly)?\b|\bright now\b|\bnow\b/i.test(question) ? "latest" : null;
}

/** What the question asks to read. Pure. */
export function metricKind(question: string, hasTx: boolean, addresses: string[], symbol: string | null): MetricKind | null {
  if (hasTx) return "tx_receipt";
  if (/\bstorage\s+slot\b|\bslot\s+(?:0x[\da-f]+|\d+)\b/i.test(question) && addresses.length) return "storage";
  if (/\btotal\s*supply\b|\btotalSupply\b/i.test(question) && (addresses.length || symbol)) return "total_supply";
  if (/\bbalance|\bhold(?:s|ing)?\b|\bheld\b|\bown(?:s|ed)?\b/i.test(question) && addresses.length) {
    return addresses.length > 1 || symbol ? "token_balance" : "native_balance";
  }
  if (/\bblock\b|\bheight\b/i.test(question)) return "block";
  return null;
}

function blank(verdict: OnchainMetricResult["verdict"], reason: string, extra: Partial<OnchainMetricResult> = {}): OnchainMetricResult {
  return { chain: null, metric: null, block_number: null, block_anchor: null, value: null, value_raw: null, unit: null,
    providers: [], providers_agree: null, verdict, confidence: 0, reason, source: "JSON-RPC on public chain nodes", ...extra };
}

/**
 * Ask every RPC of the chain at once and settle on the first `n` answers, as they arrive. Waiting for
 * all of them put the slowest provider's timeout on every answer (6.3 s for one receipt, 2026-11-07).
 */
function readTwo(urls: string[], method: string, params: unknown[], n = 2): Promise<Array<{ provider: string; result: unknown }>> {
  // A null result (no such receipt or block) counts only when no provider has a real one: a pruned node
  // can answer null for an old transaction that an archive node holds.
  return new Promise((done) => {
    const got: Array<{ provider: string; result: unknown }> = [];
    const empty: Array<{ provider: string; result: unknown }> = [];
    let left = urls.length, over = false, timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (): void => {
      if (over) return;
      over = true;
      if (timer) clearTimeout(timer);
      done(got.length ? got.slice() : empty.slice(0, n));
    };
    if (!left) finish();
    for (const u of urls) {
      void rpc(u, method, params).then((r) => {
        if (over) return;
        if (r.error === null && got.length < n) (r.result === null ? empty : got).push({ provider: host(u), result: r.result });
        // Once one real answer is in, a second source gets SECOND_MS more, not the full timeout: on old
        // blocks only the archive providers answer, and the rest would hold every answer for 3 s.
        if (got.length === 1 && n > 1 && !timer) timer = setTimeout(finish, SECOND_MS);
        left -= 1;
        if (got.length >= n || left === 0) finish();
      });
    }
  });
}

async function tokenMeta(urls: string[], token: string): Promise<{ decimals: number | null; symbol: string | null }> {
  const [d, s] = await Promise.all([SEL.decimals, SEL.symbol].map((data) => readTwo(urls, "eth_call", [{ to: token, data }, "latest"], 1)));
  const dRaw = d![0]?.result, sRaw = s![0]?.result;
  const dec = big(dRaw);
  return { decimals: dec !== null && dec <= 77n && String(dRaw).length === 66 ? Number(dec) : null, symbol: abiString(typeof sRaw === "string" ? sRaw : null) };
}

/** The holder and token in a balance question: the address next to "token" is the token. Pure. */
export function holderAndToken(question: string, addresses: string[]): { holder: string; token: string | null } {
  if (addresses.length < 2) return { holder: addresses[0]!, token: null };
  const [a, b] = addresses as [string, string];
  const marked = (x: string): boolean => new RegExp(`(?:token|erc-?20|contract of)\\s+(?:contract\\s+)?${x}|${x}\\s+(?:token|erc-?20)`, "i").test(question);
  return marked(a) && !marked(b) ? { holder: b, token: a } : { holder: a, token: b };
}

export async function verifyOnchainMetric(question: string, chainParam = "", blockParam = "", addressParam = ""): Promise<OnchainMetricResult> {
  const text = `${addressParam} ${question}`;
  const named = resolveChain(chainParam, question);
  const chain = named ?? "ethereum";
  const urls = RPCS[chain] ?? [];
  const where = `${chainLabel(chain)}${named ? "" : " (no chain was named, so Ethereum was read)"}`;
  const tx = text.match(/\b0x[a-fA-F0-9]{64}\b/)?.[0];
  const addresses = [...new Set((tx ? text.replace(tx, " ") : text).match(/\b0x[a-fA-F0-9]{40}\b/g) ?? [])];
  const sym = addresses.length < 2 ? tokenSymbol(question.replace(/\b0x[a-fA-F0-9]{40,64}\b/g, " ")) : null;
  const symbol = sym && sym !== NATIVE[chain] && knownToken(chain, sym) ? sym : null;
  const kind = metricKind(question, Boolean(tx), addresses, symbol);
  const stated = statedBlock(question, blockParam);
  if (!kind || (kind === "block" && stated === null)) {
    return blank("insufficient_input", "No readable on-chain value was named. Name a transaction hash, a contract's storage slot or total supply, an address's balance, or a block number, and the block to read it at (or 'latest').", { error: "no_metric" });
  }
  const head = await readTwo(urls, "eth_blockNumber", [], 1);
  const headBig = head.length ? big(head[0]!.result) : null;
  const headN = headBig === null ? null : Number(headBig);
  if (headN === null) return blank("unknown", `Unknown: no ${where} RPC answered, so nothing was read. This is an outage, not an empty value.`, { chain, metric: kind, error: "upstream_unavailable" });
  if (typeof stated === "number" && stated > headN) {
    return blank("not_found", `Block ${stated.toLocaleString("en-US")} has not been produced on ${where}; the head is ${headN.toLocaleString("en-US")}.`, { chain, metric: kind, error: "future_block" });
  }
  const block = typeof stated === "number" ? stated : headN - (LAG[chain] ?? 1);
  const anchor: "stated" | "latest" = typeof stated === "number" ? "stated" : "latest";
  const at = `at block ${block.toLocaleString("en-US")} on ${where}${anchor === "latest" ? ` (latest, pinned ${LAG[chain] ?? 1} behind the head so both providers read the same block)` : ""}`;
  const base = { chain, metric: kind, block_number: block, block_anchor: anchor } as const;

  if (kind === "tx_receipt") return readReceipt(urls, tx!, chain, where, stated, base);
  if (kind === "block") {
    const reads = await readTwo(urls, "eth_getBlockByNumber", [hex(block), false]);
    const blocks = reads.map((r) => r.result as { hash?: string; gasUsed?: string; gasLimit?: string; baseFeePerGas?: string; transactions?: unknown[]; timestamp?: string } | null).filter(Boolean);
    if (!blocks.length) return blank("unknown", `Unknown: no ${where} RPC returned block ${block}.`, { ...base, error: "upstream_unavailable" });
    const b = blocks[0]!;
    const agree = blocks.length > 1 ? blocks.every((x) => x!.hash === b.hash) : null;
    const used = big(b.gasUsed) ?? 0n, limit = big(b.gasLimit) ?? 0n, fee = big(b.baseFeePerGas);
    const pct = limit ? Number((used * 10000n) / limit) / 100 : 0;
    const when = b.timestamp ? new Date(Number(big(b.timestamp)) * 1000).toISOString() : null;
    return { ...base, value: used.toString(), value_raw: used.toString(), unit: "gas",
      providers: reads.map((r) => ({ provider: r.provider, value_raw: big((r.result as { gasUsed?: string })?.gasUsed)?.toString() ?? null })),
      providers_agree: agree, verdict: agree === false ? "providers_disagree" : "verified", confidence: agree ? 1 : agree === null ? 0.8 : 0.5,
      source: "eth_getBlockByNumber on public chain nodes",
      reason: `Block ${block.toLocaleString("en-US")} on ${where}${when ? ` (${when})` : ""} used ${used.toLocaleString("en-US")} gas of a ${limit.toLocaleString("en-US")} limit (${pct}%), held ${b.transactions?.length ?? 0} transactions` +
        `${fee !== null ? ` and had a base fee of ${units(fee, 9)} gwei` : ""}. ${agree ? "Both providers return the same block hash." : agree === null ? "Read from one provider." : "The providers return different block hashes."}` };
  }

  let call: [string, unknown[]], unit: string, decimals: number | null = null, label: string, holder = "", token = "";
  if (kind === "storage") {
    const slot = question.match(/\bslot\s+(0x[\da-f]+|\d+)\b/i)![1]!;
    const slotHex = slot.startsWith("0x") ? slot : hex(Number(slot));
    token = addresses[0]!;
    call = ["eth_getStorageAt", [token, slotHex, hex(block)]];
    unit = "32-byte word"; label = `Storage slot ${slot} of ${token}`;
  } else if (kind === "native_balance") {
    holder = addresses[0]!;
    call = ["eth_getBalance", [holder, hex(block)]];
    unit = NATIVE[chain] ?? "native units"; decimals = 18; label = `${holder}'s ${unit} balance`;
  } else {
    const pair = kind === "token_balance" ? holderAndToken(question, addresses) : { holder: "", token: addresses[0] ?? null };
    holder = pair.holder;
    token = pair.token ?? knownToken(chain, symbol ?? "") ?? "";
    if (!token) return blank("insufficient_input", "Name the token by contract address or a listed symbol (USDC, USDT, DAI, WETH, WBTC, LINK).", { ...base, error: "no_token" });
    const meta = await tokenMeta(urls, token);
    decimals = meta.decimals; unit = meta.symbol ?? symbol ?? "token units";
    const data = kind === "total_supply" ? SEL.totalSupply : `${SEL.balanceOf}${holder.slice(2).toLowerCase().padStart(64, "0")}`;
    call = ["eth_call", [{ to: token, data }, hex(block)]];
    label = kind === "total_supply" ? `${unit}'s total supply (${token})` : `The ${unit} (${token}) balance held by ${holder}`;
  }
  const reads = await readTwo(urls, call[0], call[1]);
  const vals = reads.map((r) => big(r.result));
  const extra = { ...(holder ? { address: holder } : {}), ...(token ? { token_address: token } : {}) };
  if (!reads.length || vals[0] === null) {
    return blank("unknown", `Unknown: no ${where} RPC returned state ${at}. Old blocks need an archive node, and the free providers that are not archives refuse or report the state as pruned.`, { ...base, ...extra, error: "upstream_unavailable" });
  }
  const v = vals[0]!;
  const agree = vals.length > 1 ? vals.every((x) => x === v) : null;
  const shown = kind === "storage" ? `0x${v.toString(16).padStart(64, "0")}` : decimals === null ? v.toString() : units(v, decimals);
  const said = kind === "storage" ? shown : `${readable(shown)} ${unit} (exact: ${shown})`;
  const check = agree ? "Both providers return the same value." : agree === null ? `Read from one provider (${reads[0]!.provider}); no second one answered for that block.` :
    `The providers disagree: ${reads.map((r) => `${r.provider} ${big(r.result)?.toString() ?? "no answer"}`).join("; ")} (raw).`;
  return { ...base, ...extra, value: shown, value_raw: v.toString(), unit,
    providers: reads.map((r, i) => ({ provider: r.provider, value_raw: vals[i]?.toString() ?? null })),
    providers_agree: agree, verdict: agree === false ? "providers_disagree" : "verified", confidence: agree ? 1 : agree === null ? 0.8 : 0.5,
    source: `${call[0]} on public chain nodes`, reason: `${label} ${at} is ${said}. ${check}` };
}

async function readReceipt(urls: string[], tx: string, chain: string, where: string, stated: number | "latest" | null,
  base: Pick<OnchainMetricResult, "chain" | "metric" | "block_number" | "block_anchor">): Promise<OnchainMetricResult> {
  type Receipt = { blockNumber?: string; gasUsed?: string; effectiveGasPrice?: string; status?: string; logs?: Array<{ address: string; topics: string[]; data: string; logIndex: string }> };
  const reads = await readTwo(urls, "eth_getTransactionReceipt", [tx]);
  const rs = reads.map((r) => r.result as Receipt | null).filter((r): r is Receipt => Boolean(r));
  if (!rs.length) {
    return blank(reads.length ? "not_found" : "unknown", reads.length ? `No transaction ${tx} has a receipt on ${where}: it is not on this chain or not yet mined.` : `Unknown: no ${where} RPC answered for ${tx}.`, { ...base, tx_hash: tx, error: reads.length ? "not_found" : "upstream_unavailable" });
  }
  const r = rs[0]!;
  const block = Number(big(r.blockNumber));
  const gas = big(r.gasUsed) ?? 0n, price = big(r.effectiveGasPrice);
  const agree = rs.length > 1 ? rs.every((x) => x.gasUsed === r.gasUsed && x.blockNumber === r.blockNumber) : null;
  const logs = (r.logs ?? []).filter((l) => l.topics[0]?.toLowerCase() === TRANSFER && l.topics.length >= 3).slice(0, 10);
  const tokens = [...new Set(logs.map((l) => l.address.toLowerCase()))];
  const metas = new Map(await Promise.all(tokens.map(async (t) => [t, await tokenMeta(urls, t)] as const)));
  const transfers: TransferLog[] = logs.map((l) => {
    const nft = l.topics.length === 4;
    const meta = metas.get(l.address.toLowerCase())!;
    const raw = nft ? null : big(l.data);
    return { token: l.address, symbol: meta.symbol, from: topicAddress(l.topics[1]!), to: topicAddress(l.topics[2]!), log_index: Number(big(l.logIndex)),
      amount_raw: raw?.toString() ?? null, amount: raw === null ? null : meta.decimals === null ? raw.toString() : units(raw, meta.decimals),
      token_id: nft ? big(l.topics[3])!.toString() : null };
  });
  const fee = price === null ? null : units(gas * price, 18);
  const status = r.status === "0x1" ? "success" : r.status === "0x0" ? "reverted" : null;
  const mismatch = typeof stated === "number" && stated !== block ? ` The question names block ${stated.toLocaleString("en-US")}, but the transaction is in block ${block.toLocaleString("en-US")}.` : "";
  const moves = transfers.map((t) => t.token_id !== null ? `token #${t.token_id} of ${t.symbol ?? t.token} from ${t.from} to ${t.to}`
    : `${t.amount === null ? "?" : readable(t.amount)} ${t.symbol ?? t.token} (exact: ${t.amount}) from ${t.from} to ${t.to}`);
  return { ...base, block_number: block, block_anchor: "stated", tx_hash: tx, tx_status: status, gas_used: gas.toString(), fee,
    transfers, value: gas.toString(), value_raw: gas.toString(), unit: "gas",
    providers: reads.map((x) => ({ provider: x.provider, value_raw: big((x.result as Receipt | null)?.gasUsed)?.toString() ?? null })),
    providers_agree: agree, verdict: agree === false ? "providers_disagree" : "verified", confidence: agree ? 1 : agree === null ? 0.8 : 0.5,
    source: "eth_getTransactionReceipt on public chain nodes",
    reason: `Transaction ${tx} on ${where}, block ${block.toLocaleString("en-US")}, ${status ?? "status not reported"}: it used ${gas.toLocaleString("en-US")} gas` +
      `${fee ? ` for a fee of ${fee} ${NATIVE[chain] ?? ""}`.trimEnd() : ""}. ` +
      (moves.length ? `Its Transfer log${moves.length > 1 ? "s carry" : " carries"} ${moves.join("; ")}.` : "It emitted no ERC-20 or ERC-721 Transfer log.") +
      `${mismatch} ${agree ? "Both providers return the same receipt." : agree === null ? "Read from one provider." : "The providers return different receipts."}` };
}
