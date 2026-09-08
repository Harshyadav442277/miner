/**
 * ONCHAIN_TX_LOOKUP — one EVM transaction, read from public JSON-RPC.
 *
 * Why this intent, and why this shape. Measured 2026-09-08 against the live
 * champion (`otx_t74.wasm`, reg 642) in docs/EXPANSION_2026-09-08.md:
 *
 *   complete receipt, every field correct                0.99985
 *   the same with digits unformatted (21000, 4730207)    0.99945
 *   gas used off by one                                  0.0148
 *   status only                                          0.0085
 *   status + gas, no value/block/addresses               0.0119
 *   bare JSON                                            0.0072
 *
 * Those two bands are exactly the live leaderboard: one miner at ~0.995 and
 * eleven between 0.003 and 0.015, every epoch. The 0.01 band is not "nearly
 * right" — it is the score for a receipt that is incomplete or wrong in one
 * field. So the answer here carries the whole receipt, and every number in it
 * has to be exact.
 *
 * That exactness is achievable *only because a mined receipt is immutable*. The
 * same measurement on GAS_PRICE and CURRENCY_EXCHANGE shows a tolerance of about
 * one part in a thousand on quantities that move every block, which is why no
 * miner has ever crossed in those intents. Here our read and the scorer's read
 * are of the same permanent fact.
 *
 * The honesty rule that shapes the rest of the file: **an RPC that will not
 * answer is not a transaction that does not exist.** `not_found` is a claim
 * about the chain and is only ever made when a healthy endpoint said so.
 */

const RPC_TIMEOUT_MS = Number(process.env.ONCHAIN_RPC_TIMEOUT_MS ?? 4_000);

/**
 * Same endpoints as `wallet.ts`, which have been serving WALLET_BALANCE_CHECK at
 * 0.9999993 since 2026-08-31. Kept as a separate list rather than imported
 * because this module needs `eth_getTransactionByHash` and
 * `eth_getTransactionReceipt` — a provider can serve balances and still refuse
 * receipts, so the two lists are allowed to diverge as they are re-verified.
 * Every endpoint below answered `eth_getTransactionReceipt` on 2026-09-08.
 */
const RPCS: Record<string, string[]> = {
  ethereum: [
    "https://ethereum-rpc.publicnode.com",
    "https://eth.drpc.org",
    "https://eth.merkle.io",
  ],
  base: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
  arbitrum: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com"],
  optimism: ["https://mainnet.optimism.io", "https://optimism-rpc.publicnode.com"],
  polygon: ["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org"],
};

/** Native coin per chain. Polygon's is POL, not ETH. */
const SYMBOL: Record<string, string> = {
  ethereum: "ETH", base: "ETH", arbitrum: "ETH", optimism: "ETH", polygon: "POL",
};

/**
 * First block whose receipts carry an EIP-658 `status` flag. Below it a receipt
 * holds a post-state `root` instead, and there is no success flag on the chain
 * at all.
 *
 * This has to be a block height rather than "did the provider send a status
 * field", because **the providers disagree**. Measured 2026-09-08 on the first
 * ever mainnet transfer (block 46,147):
 *
 *   ethereum-rpc.publicnode.com   root present, status absent   (canonical)
 *   eth.drpc.org                  status 0x1, root absent       (synthesised)
 *   eth.merkle.io                 status 0x1, root absent       (synthesised)
 *
 * Keying off the field meant the same transaction produced two different
 * answers depending on which endpoint happened to answer first. The fork height
 * is a property of the chain, so it gives one answer. Verified the same day by
 * walking the boundary on publicnode: block 4,369,999 returns `root`, block
 * 4,370,000 returns `status`.
 *
 * The L2s and Polygon all launched years after Byzantium, so every receipt they
 * can return carries a real status; they are absent here and default to 0.
 */
const EIP658_FROM: Record<string, number> = { ethereum: 4_370_000 };

const CHAIN_WORDS: Array<[RegExp, string]> = [
  [/\bethereum\b|\bmainnet\b|\beth\b|\bl1\b/i, "ethereum"],
  [/\bbase\b/i, "base"],
  [/\barbitrum\b|\barb\b/i, "arbitrum"],
  [/\boptimism\b|\bop\s+mainnet\b/i, "optimism"],
  [/\bpolygon\b|\bmatic\b|\bpos\b/i, "polygon"],
];

/** ERC-20/721 `Transfer(address,address,uint256)`. */
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type TxStatus = "confirmed" | "reverted" | "pending" | "not_found" | "unknown";

export interface TxResult {
  hash: string | null;
  chain: string | null;
  verdict: TxStatus;
  confidence: number;
  reason: string;
  error?: string;
}

/**
 * A 0x-prefixed 64-hex transaction hash.
 *
 * Deliberately anchored on a word boundary so a 40-hex wallet address, which is
 * the other thing questions in this family carry, can never match. `wallet.ts`
 * makes the mirror-image exclusion for the same reason.
 */
export function txHash(text: string): string | null {
  // `0X` as well as `0x`: block explorers and copy-paste both produce it, and a
  // hash we decline to parse gets answered as "no hash was supplied", which is
  // a refusal on a question we can in fact answer.
  return String(text ?? "").match(/\b0[xX][a-fA-F0-9]{64}\b/)?.[0]?.toLowerCase() ?? null;
}

/**
 * Something meant to be a hash that is not one — 63 or 65 characters, or a
 * stray non-hex letter. Reported back as malformed rather than silently
 * ignored, because "you sent me something I could not parse" and "that
 * transaction is not on the chain" are different answers and only one of them
 * is true.
 */
export function malformedHash(text: string): string | null {
  const s = String(text ?? "");
  if (txHash(s)) return null;
  // Any 0x token that is not a valid hash. The window used to start at 50
  // characters, which meant a short stub like 0xdeadbeef1234 fell through to
  // "no transaction hash was supplied" — telling a caller who plainly did
  // supply something that they had not. An address is excluded below, and a
  // 64-hex token cannot reach here at all, so everything left is a near-miss.
  const m = s.match(/\b0[xX][a-zA-Z0-9]{1,80}\b/);
  if (!m) return null;
  // A 40-hex token is an address, and there is a whole other intent for those.
  if (/^0[xX][a-fA-F0-9]{40}$/.test(m[0])) return null;
  return m[0];
}

/**
 * Which chain to read.
 *
 * An explicit `chain` parameter always wins over a word in the question: the
 * engine fills parameters from our own manifest and a caller who set the field
 * meant it. When both are present and disagree, the parameter is used and the
 * disagreement is stated in the answer rather than hidden — silently picking one
 * of two conflicting instructions is how a confidently wrong answer happens.
 */
export function resolveChain(param: string, question: string): { chain: string; conflict: string | null } {
  const p = String(param ?? "").trim().toLowerCase();
  const named = p && RPCS[p] ? p : null;
  const fromText = CHAIN_WORDS.find(([re]) => re.test(String(question ?? "")))?.[1] ?? null;
  if (named && fromText && named !== fromText) return { chain: named, conflict: fromText };
  return { chain: named ?? fromText ?? "ethereum", conflict: null };
}

export function isSupportedChain(name: string): boolean {
  return Boolean(RPCS[String(name ?? "").trim().toLowerCase()]);
}

export function supportedChains(): string[] {
  return Object.keys(RPCS);
}

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "rpc error");
  return body.result;
}

interface RawTx {
  from: string; to: string | null; value: string; blockNumber: string | null;
  gasPrice?: string; input?: string; nonce?: string;
}
interface RawReceipt {
  status?: string; root?: string; gasUsed: string; effectiveGasPrice?: string;
  contractAddress?: string | null; logs: Array<{ topics: string[]; address: string }>;
}

/**
 * Fetch the transaction and its receipt, trying each endpoint in turn.
 *
 * The distinction this function exists to preserve: a `null` result from a
 * *working* endpoint means the chain does not have that transaction, while a
 * thrown error means we do not know. Only the first is allowed to become
 * `not_found`. If every endpoint throws, the caller is told `unknown`.
 */
async function fetchTx(chain: string, hash: string):
  Promise<{ tx: RawTx | null; receipt: RawReceipt | null } | null> {
  let sawWorkingEndpoint = false;
  // A transaction seen as mined whose receipt we could not read. Held so that
  // exhausting the endpoints reports `unknown` rather than `not_found`: we know
  // this transaction exists, so denying it would be the worst answer available.
  let minedNoReceipt: RawTx | null = null;
  for (const url of RPCS[chain] ?? []) {
    try {
      const tx = (await rpc(url, "eth_getTransactionByHash", [hash])) as RawTx | null;
      sawWorkingEndpoint = true;
      if (!tx) continue;
      // A transaction in the mempool has no block and therefore no receipt yet.
      if (tx.blockNumber === null) return { tx, receipt: null };
      const receipt = (await rpc(url, "eth_getTransactionReceipt", [hash])) as RawReceipt | null;
      // A MINED transaction whose receipt comes back null is a provider that is
      // behind or shedding, not a transaction without a receipt. Returning here
      // reported the first mainnet transfer as sitting in the mempool — caught
      // intermittently by the correctness gate, roughly one run in four.
      if (!receipt) { minedNoReceipt = tx; continue; }
      return { tx, receipt };
    } catch {
      // Try the next endpoint. A single provider refusing is not an answer.
    }
  }
  if (minedNoReceipt) return { tx: minedNoReceipt, receipt: null };
  return sawWorkingEndpoint ? { tx: null, receipt: null } : null;
}

const fmt = (n: number, dp: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });

/**
 * Wei to a decimal coin amount, without floating point for the integer part.
 *
 * Truncation is a correctness bug in this intent, not a formatting choice: the
 * scorer is an exact match on the number, so a value rendered as
 * "0.000000000000031" when the transaction moved 31,337 wei is simply the wrong
 * figure. Anything below a microcoin is therefore reported in exact wei — the
 * unit the chain itself uses — instead of a decimal that cannot hold it. The
 * first mainnet transaction, which moved 31,337 wei, is the case that found it.
 */
export function toCoin(wei: bigint, symbol = ""): string {
  if (wei === 0n) return symbol ? `0 ${symbol}` : "0";
  const suffix = symbol ? ` ${symbol}` : "";
  if (wei < 10n ** 12n) return `${wei.toLocaleString("en-US")} wei`;
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  if (!frac) return `${whole.toLocaleString("en-US")}${suffix}`;
  // Enough decimals to keep every significant digit of a sub-coin amount, so the
  // rendered figure equals the on-chain one rather than approximating it.
  const shown = frac.slice(0, Math.max(6, frac.search(/[1-9]/) + 6));
  return `${whole.toLocaleString("en-US")}.${shown.replace(/0+$/, "")}${suffix}`;
}

const short = (addr: string): string => addr;

export async function lookupTransaction(hash: string, chain: string, conflict: string | null = null):
  Promise<TxResult> {
  const coin = SYMBOL[chain] ?? "ETH";
  const note = conflict
    ? ` The chain parameter said ${chain} while the question mentioned ${conflict}; the ${chain} chain was read.`
    : "";

  let found: Awaited<ReturnType<typeof fetchTx>>;
  try {
    found = await fetchTx(chain, hash);
  } catch {
    found = null;
  }

  // Every endpoint failed. This is the branch that must never be dressed up as
  // an answer: we do not know whether this transaction exists.
  if (!found) {
    return {
      hash, chain, verdict: "unknown", confidence: 0,
      reason:
        `The status of transaction ${hash} on ${chain} could not be determined because the public ` +
        `JSON-RPC endpoints did not respond. This is an availability problem on our side, not a ` +
        `statement about the transaction: it may well exist and be confirmed.${note}`,
      error: "rpc_unavailable",
    };
  }

  const { tx, receipt } = found;

  if (!tx) {
    return {
      hash, chain, verdict: "not_found", confidence: 0.9,
      // Measured 2026-09-08 against champion 642 across three ground-truth
      // registers: this phrasing scores 0.995-0.999 against all three, while the
      // first version of it — which added "queried against public JSON-RPC
      // nodes … it may belong to a different network, or never have been
      // broadcast" — scored 0.013 against all three and crossed nothing. The
      // speculation about other networks is what cost it: it is unverifiable
      // filler, and answering "it has no status, no gas used and no block
      // number" is both shorter and a more direct answer to what was asked.
      reason:
        `The hash ${hash} does not correspond to any transaction on ${chain}. It has no status, ` +
        `no gas used and no block number.${note}`,
    };
  }

  /**
   * Mined, but no endpoint would hand over the receipt. This must not be called
   * `pending`: the transaction is in a block, so "it is in the mempool and has
   * no final status" is a false statement about the chain. What we have is the
   * block number and the transfer, and what we lack is the outcome — say both.
   */
  if (tx.blockNumber !== null && !receipt) {
    return {
      hash, chain, verdict: "unknown", confidence: 0,
      reason:
        `Transaction ${hash} on ${chain} was mined in block ` +
        `${fmt(Number(BigInt(tx.blockNumber)), 0)}, but its receipt could not be read: the public ` +
        `JSON-RPC endpoints returned no receipt for it. Its success or failure and its gas used are ` +
        `therefore unknown here. It sends ${toCoin(BigInt(tx.value), coin)} from ${short(tx.from)}` +
        `${tx.to ? ` to ${short(tx.to)}` : " to a new contract"}.${note}`,
      error: "receipt_unavailable",
    };
  }

  if (tx.blockNumber === null || !receipt) {
    const gwei = tx.gasPrice ? Number(BigInt(tx.gasPrice)) / 1e9 : null;
    return {
      hash, chain, verdict: "pending", confidence: 0.8,
      reason:
        `Transaction ${hash} on ${chain} is pending: it has been broadcast and is in the mempool ` +
        `but has not been included in a block, so it has no receipt, no gas used and no final ` +
        `status yet. It sends ${toCoin(BigInt(tx.value), coin)} from ${short(tx.from)}` +
        `${tx.to ? ` to ${short(tx.to)}` : " to a new contract"}` +
        `${gwei === null ? "" : ` at a gas price of ${fmt(gwei, 4)} Gwei`}.${note}`,
    };
  }

  const block = Number(BigInt(tx.blockNumber));
  const gasUsed = Number(BigInt(receipt.gasUsed));
  const effWei = receipt.effectiveGasPrice ? BigInt(receipt.effectiveGasPrice)
    : tx.gasPrice ? BigInt(tx.gasPrice) : 0n;
  const gwei = Number(effWei) / 1e9;
  const feeWei = BigInt(receipt.gasUsed) * effWei;
  const value = toCoin(BigInt(tx.value), coin);
  const transfers = receipt.logs.filter((l) => l.topics?.[0] === TRANSFER_TOPIC).length;

  /**
   * Pre-Byzantium receipts carry no success flag — see EIP658_FROM. Reading a
   * missing status as a failure would report a successful 2015 transfer as
   * reverted, so inclusion is the fact stated and the absence is named rather
   * than guessed.
   *
   * A synthesised `status` from one of the providers that sends one is still
   * used when it says `0x0`, because a node only reaches that by re-executing
   * and finding the call failed — but a `0x1` on a pre-Byzantium block is not
   * a fact read off the chain, so the answer says what it is.
   */
  const preByzantium = block < (EIP658_FROM[chain] ?? 0);
  const flagged = receipt.status !== undefined
    ? Number(BigInt(receipt.status)) === 1
    : null;
  const succeeded = preByzantium ? flagged !== false : flagged === true;
  const verdict: TxStatus = succeeded ? "confirmed" : "reverted";

  const created = receipt.contractAddress
    ? ` It deployed a new contract at ${receipt.contractAddress}.` : "";
  const erc20 = transfers > 0
    ? ` The receipt contains ${transfers} ERC-20 token transfer${transfers === 1 ? "" : "s"}.` : "";
  const statusNote = preByzantium
    ? " This block predates the Byzantium fork, so the canonical receipt carries a state root " +
      "rather than a status flag; inclusion in the chain is what is confirmed here."
    : "";

  /**
   * Fact order matters, and it is measured rather than stylistic.
   *
   * Telegraph scores roughly 32 words. A 66-character hash and two
   * 42-character addresses are four of those words but a large share of the
   * characters, and when the addresses sat before the block number the block
   * number fell outside the budget. Against champion 642 on 2026-09-08, across
   * four ground-truth registers:
   *
   *   addresses before the block number   2/4 crossed
   *   block number early, addresses last  3/4 crossed
   *   hash moved to the end               2/4 crossed  (the hash matters too)
   *
   * So: hash, status, block, then the numbers, then the parties. Nothing is
   * dropped — the same facts are stated, in the order that survives truncation.
   */
  return {
    hash, chain, verdict, confidence: 0.99,
    reason:
      `Transaction ${hash} on ${chain} ` +
      `${succeeded ? "succeeded" : "failed and was reverted"} in block ${fmt(block, 0)}. ` +
      `It used ${fmt(gasUsed, 0)} gas at an effective gas price of ${fmt(gwei, 4)} Gwei, ` +
      `a total fee of ${toCoin(feeWei, coin)}, and moved ${value}.` +
      `${created}${erc20}` +
      ` The transaction was sent from ${short(tx.from)}${tx.to ? ` to ${short(tx.to)}` : " to a new contract"}.` +
      `${statusNote}` +
      `${succeeded ? "" : " A reverted transaction still consumes its gas; the value transfer did not occur."}` +
      `${note}`,
  };
}
// No "read from <host> at <timestamp>" tail on a mined receipt, deliberately.
// A mined receipt is immutable, so a read timestamp carries no information about
// the answer's currency — there is nothing to be stale. It is not free, either:
// measured against champion 642 on 2026-09-08, the same answer WITH the
// provenance tail crossed two of three ground-truth registers and WITHOUT it
// crossed all three, because a host name and a high-entropy ISO timestamp are
// scored surface that appears in no ground truth. The `pending` branch above
// keeps its freshness wording, because a pending transaction genuinely changes.
