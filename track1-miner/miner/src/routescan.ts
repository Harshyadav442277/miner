/**
 * Routescan, as the failover for contract activity on Ethereum (GAPS G116).
 *
 * WHY THIS SOURCE, AND WHY ONLY THIS FAR. Blockscout returned 503 on all five
 * chains on 2026-09-11 and contract activity had no second source. Routescan's
 * documentation states "No sign-up or API key is required for free-tier access"
 * (routescan.io/docs/getting-started/get-started, read 2026-09-12). It was
 * compared with Blockscout on the same facts before any code was written:
 *
 *   transactions recorded   Uniswap V2 router   Blockscout 90,439,431  Routescan 90,283,142  -0.17%
 *                           vitalik.eth         Blockscout 78,402      Routescan 78,319      -0.11%
 *                           UNI token contract  Blockscout 3,883,070   Routescan 3,876,489   -0.17%
 *   creation transaction    router and UNI      identical hashes; none for the account, on both
 *
 * The same comparison DISQUALIFIED it for holder counts, which is why holders.ts
 * does not use it: USDT 17,372,046 against 12,896,865 (-25.8%), USDC -16.2%, UNI
 * -6.5%, and 0 holders for Optimism USDC. Two indexes that disagree by a quarter
 * are not two readings of one fact. Optimism was also unusable for addresses
 * (HTTP 400), so this failover covers Ethereum only.
 */
const TIMEOUT_MS = Number(process.env.ROUTESCAN_TIMEOUT_MS ?? 3_500);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const BASE = "https://api.routescan.io/v2/network/mainnet/evm/1";

export interface RoutescanActivity {
  transactions: number | null;
  creationTx: string | null;
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Parses the two Routescan bodies. Pure, so the shapes are tested offline. */
export function parseRoutescan(address: unknown, creation: unknown): RoutescanActivity | null {
  const a = address as { transactionsCount?: unknown } | null;
  const n = typeof a?.transactionsCount === "number" && Number.isFinite(a.transactionsCount) ? a.transactionsCount : null;
  const c = creation as { status?: string; result?: Array<{ txHash?: unknown }> } | null;
  const hash = c?.status === "1" && typeof c.result?.[0]?.txHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(c.result[0].txHash)
    ? c.result[0].txHash
    : null;
  return n === null && hash === null ? null : { transactions: n, creationTx: hash };
}

/** Ethereum address activity from Routescan, or null when it could not be read. */
export async function routescanActivity(address: string): Promise<RoutescanActivity | null> {
  const [a, c] = await Promise.all([
    getJson(`${BASE}/addresses/${address}`).catch(() => null),
    getJson(`${BASE}/etherscan/api?module=contract&action=getcontractcreation&contractaddresses=${address}`).catch(() => null),
  ]);
  return parseRoutescan(a, c);
}

/** A Routescan transaction body's timestamp, ISO 8601, or null. Pure. */
export function parseTxTimestamp(body: unknown): string | null {
  const t = (body as { timestamp?: unknown } | null)?.timestamp;
  if (typeof t !== "string") return null;
  const d = new Date(t);
  return Number.isFinite(d.getTime()) && d.getTime() > 0 ? d.toISOString() : null;
}

/**
 * A transaction's timestamp from Routescan's own transaction record.
 *
 * NOT from the chain's RPC, and that is measured (2026-09-13): the router's
 * 2020 deployment transaction is below publicnode's pruning horizon, so
 * eth_getTransactionReceipt answered {"result":null} and eth_getBlockByNumber
 * "pruned history unavailable ... earliest available 15500000". The failover
 * answer then dropped the date. Routescan's record for the same hash reads
 * 2020-06-05T20:17:21Z in block 10207858, block hash 0xe190f892...f656, and
 * eth.drpc.org returned that same block hash for that number.
 */
export async function routescanTxTimestamp(hash: string): Promise<string | null> {
  try {
    return parseTxTimestamp(await getJson(`${BASE}/transactions/${hash}`));
  } catch {
    return null;
  }
}
