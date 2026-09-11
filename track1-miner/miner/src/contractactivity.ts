/**
 * ONCHAIN_TX_LOOKUP, the shape we were refusing: a CONTRACT's activity.
 *
 * The routed corpus holds two questions for this intent and we answered neither.
 * One of them is:
 *
 *   "For the contract address 0x7a250d…488D on ethereum, report its on-chain
 *    activity: the date it was deployed and the total number of transactions…"
 *
 * That is not a hash lookup, so `/tx-lookup` told the caller an address is the
 * wrong subject and pointed at WALLET_BALANCE_CHECK — which does not answer it
 * either, because a deployment date and a transaction count are not a balance.
 * The network routed the question here and nothing in this miner could answer it.
 *
 * WHY A BLOCK EXPLORER AND NOT AN RPC. Neither figure is readable from a node.
 * `eth_getTransactionCount` on a contract returns its nonce, which counts the
 * contracts it has created, not the transactions sent to it — reporting that as
 * "total transactions" would be a confidently wrong number of exactly the kind
 * this repo keeps finding. The deployment date needs the creation transaction,
 * which is an index lookup. Blockscout publishes both, keylessly, per chain.
 *
 * THE REDIRECT STAYS FOR EVERYTHING ELSE. "What is the status of 0xd8dA…045?"
 * is still answered by naming the address as the wrong subject, because it asks
 * a transaction question about something that is not a transaction. Only a
 * question that actually asks about deployment or activity takes this path.
 */
import { accountKind } from "./fraud";

const TIMEOUT_MS = Number(process.env.ACTIVITY_TIMEOUT_MS ?? 7_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

const HOSTS: Record<string, { host: string; label: string; rpc: string }> = {
  ethereum: { host: "eth.blockscout.com", label: "Ethereum", rpc: "https://ethereum-rpc.publicnode.com" },
  base: { host: "base.blockscout.com", label: "Base", rpc: "https://mainnet.base.org" },
  arbitrum: { host: "arbitrum.blockscout.com", label: "Arbitrum", rpc: "https://arb1.arbitrum.io/rpc" },
  optimism: { host: "optimism.blockscout.com", label: "Optimism", rpc: "https://mainnet.optimism.io" },
  polygon: { host: "polygon.blockscout.com", label: "Polygon", rpc: "https://polygon-bor-rpc.publicnode.com" },
};

export type ActivityVerdict = "contract_activity" | "account_activity" | "not_found" | "unavailable";

export interface ActivityResult {
  address: string | null;
  chain: string | null;
  is_contract: boolean | null;
  name: string | null;
  deployed_at: string | null;
  deployment_tx: string | null;
  transactions: number | null;
  verdict: ActivityVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/**
 * Does this question ask about a contract's activity rather than about one
 * transaction?
 *
 * Deliberately narrow. A question that merely contains an address is not this —
 * the redirect that sends it to the balance intent is correct and stays — so the
 * question has to name what it wants: a deployment, a creation, an activity
 * summary, or a count of transactions.
 */
export function asksActivity(text: string): boolean {
  const s = String(text ?? "");
  if (!/\b0x[a-fA-F0-9]{40}\b/.test(s)) return false;
  return /\bdeploy\w*\b/i.test(s)
    || /\bcreat(?:ed|ion)\b/i.test(s)
    || /\bon-?chain activity\b/i.test(s)
    || /\bactivity\b/i.test(s)
    || /\b(?:total |number of |how many )\w*\s*transactions?\b/i.test(s)
    || /\btransactions?\s+count\b/i.test(s);
}

export function activityAddress(text: string): string | null {
  return String(text ?? "").match(/\b0x[a-fA-F0-9]{40}\b/)?.[0] ?? null;
}

export function resolveChain(param: string, question: string): string | null {
  const p = String(param ?? "").trim().toLowerCase();
  if (HOSTS[p]) return p;
  const s = `${param ?? ""} ${question ?? ""}`;
  if (/\bbase\b/i.test(s)) return "base";
  if (/\barbitrum\b|\barb\b/i.test(s)) return "arbitrum";
  if (/\boptimism\b|\bop mainnet\b/i.test(s)) return "optimism";
  if (/\bpolygon\b|\bmatic\b/i.test(s)) return "polygon";
  if (/\bethereum\b|\bmainnet\b|\beth\b/i.test(s)) return "ethereum";
  return null;
}

export function supportedChains(): string[] {
  return Object.keys(HOSTS);
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

/**
 * The account's code, so EIP-7702 can be told from a deployment.
 *
 * Blockscout's `is_contract` is true for a delegated externally owned account,
 * and the first address tested against this module was vitalik.eth, which it
 * duly described as "a contract". That is G93 exactly, in a second place, and
 * the note there warned that any future code reading this signal has the same
 * trap. `accountKind` is the classifier that already gets it right.
 */
async function getCode(rpc: string, address: string): Promise<string | null> {
  const r = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [address, "latest"] }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { result?: string };
  return typeof j.result === "string" ? j.result : null;
}

const fmtCount = (n: number): string => n.toLocaleString("en-US");

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export async function lookupActivity(address: string, chain: string): Promise<ActivityResult> {
  const entry = HOSTS[chain];
  const empty = {
    address, chain, is_contract: null, name: null,
    deployed_at: null, deployment_tx: null, transactions: null,
  };
  if (!entry) {
    return {
      ...empty, verdict: "unavailable", confidence: 0,
      reason:
        `On-chain activity is read for ${Object.values(HOSTS).map((h) => h.label).join(", ")}, and ` +
        `${chain} is not among them, so nothing was reported for ${address} rather than another ` +
        `chain's figures being given for it.`,
      error: "unsupported_chain",
    };
  }

  // Three reads, together: chained they cost three times the latency against a
  // route budget of 11 seconds.
  const [rec, counters, code] = await Promise.all([
    getJson(`https://${entry.host}/api/v2/addresses/${address}`).catch((e) => e as Error),
    getJson(`https://${entry.host}/api/v2/addresses/${address}/counters`).catch(() => null),
    getCode(entry.rpc, address).catch(() => null),
  ]);

  if (rec instanceof Error) {
    const missing = /HTTP 404/.test(String(rec));
    return {
      ...empty,
      verdict: missing ? "not_found" : "unavailable",
      confidence: missing ? 0.6 : 0,
      reason: missing
        ? `${address} is not indexed on ${entry.label}, so no deployment date or transaction count ` +
          `was reported for it. The index answered; it holds no such address.`
        : `The ${entry.label} block explorer did not answer, so no activity could be read for ` +
          `${address}. That is an index outage rather than an address with no activity, and the ` +
          `two are not the same thing.`,
      error: missing ? undefined : "upstream_unavailable",
    };
  }

  const r = rec as {
    is_contract?: boolean; name?: string | null;
    creation_transaction_hash?: string | null; creator_address_hash?: string | null;
    is_verified?: boolean;
  };
  const c = counters as { transactions_count?: string } | null;
  const txRaw = Number(c?.transactions_count);
  const transactions = Number.isFinite(txRaw) ? txRaw : null;

  // The deployment DATE lives on the creation transaction, not on the address.
  let deployedAt: string | null = null;
  const creationTx = r.creation_transaction_hash ?? null;
  if (creationTx) {
    try {
      const t = (await getJson(`https://${entry.host}/api/v2/transactions/${creationTx}`)) as { timestamp?: string };
      deployedAt = t.timestamp ?? null;
    } catch {
      // A missing timestamp is reported as missing, never guessed from the
      // block number or from the address's first transfer.
      deployedAt = null;
    }
  }

  /**
   * The chain's own code is the authority, not the explorer's flag. Where the
   * node could not be reached, the explorer's flag is used and the answer does
   * not claim more than "a contract".
   */
  const kind = code === null ? (r.is_contract === true ? "contract" : "account") : accountKind(code);
  const isContract = kind === "contract";
  const named = r.name ? `${r.name} at ${address}` : address;
  const parts: string[] = [];

  if (isContract) {
    parts.push(
      deployedAt
        ? `${named} is a contract deployed on ${entry.label} on ${fmtDate(deployedAt)}`
        : `${named} is a contract on ${entry.label} whose deployment date is not recorded in the index`,
    );
  } else if (kind === "delegated account") {
    // Not a deployment. It is a key-controlled account carrying an EIP-7702
    // delegation, and calling it a contract is a false statement about who
    // controls the funds.
    parts.push(
      `${address} is an externally owned account on ${entry.label} carrying an EIP-7702 delegation, ` +
      `not a deployed contract, so it has no deployment date`,
    );
  } else {
    parts.push(`${address} is an externally owned account on ${entry.label}, not a contract`);
  }

  if (transactions !== null) {
    parts.push(`with ${fmtCount(transactions)} transactions recorded against it`);
  }

  const tail = transactions === null
    ? ` The transaction count was not returned by the index, so none is reported.`
    : ``;
  const source = ` Read from the ${entry.label} explorer's own address index${creationTx ? `, deployment transaction ${creationTx}` : ""}.`;

  return {
    address, chain, is_contract: isContract, name: r.name ?? null,
    deployed_at: deployedAt, deployment_tx: creationTx, transactions,
    verdict: isContract ? "contract_activity" : "account_activity",
    confidence: 0.95,
    reason: `${parts.join(", ")}.${tail}${source}`,
  };
}
