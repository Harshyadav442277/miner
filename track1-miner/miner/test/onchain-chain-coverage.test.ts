/**
 * The chains ONCHAIN_TX_LOOKUP can read, and the answer it gives when it cannot.
 *
 * G88 fixed a hash with no chain named defaulting to Ethereum, so a live Base,
 * Arbitrum or Polygon transaction was denied. This is the same defect one level
 * up: the chain was not in `RPCS` at all. `wallet.ts` has read BSC balances
 * since the 2026-09-11 repair, while this module did not read BSC transactions,
 * so a live BNB Chain hash — with the caller having written "on BSC" — was
 * answered "does not correspond to any transaction on ethereum, base, arbitrum,
 * optimism, polygon". Reproduced against production on 2026-09-12 with a hash
 * taken from the chain head.
 *
 * A denial of a transaction that exists scores in the ~0.006 not_found band G88
 * measured, and epochs 320 and 324 both put us there while the leader crossed
 * at 0.9957.
 *
 * Fixtures are fetched at run time: a hash pinned here would age out.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSupportedChain, lookupTransaction, resolveChain, supportedChains } from "../src/onchain";

test("BSC and Avalanche are chains this endpoint reads", () => {
  for (const chain of ["ethereum", "base", "arbitrum", "optimism", "polygon", "bsc", "avalanche"]) {
    assert.ok(supportedChains().includes(chain), `${chain} is not readable`);
    assert.equal(isSupportedChain(chain), true);
  }
});

/**
 * The caller writing "on BSC" must select BSC. Before this, no chain word
 * matched, the read defaulted to Ethereum and the transaction was denied.
 */
test("the chain words for the added chains resolve", () => {
  assert.equal(resolveChain("", "What is the status of that transaction on BSC?").chain, "bsc");
  assert.equal(resolveChain("", "status on BNB Chain?").chain, "bsc");
  assert.equal(resolveChain("", "status on Binance Smart Chain?").chain, "bsc");
  assert.equal(resolveChain("", "did it succeed on Avalanche?").chain, "avalanche");
  assert.equal(resolveChain("", "avax transaction status").chain, "avalanche");
  // The existing chains keep their answers: "eth" must not be captured by a new
  // pattern placed before it.
  assert.equal(resolveChain("", "status on ethereum").chain, "ethereum");
  assert.equal(resolveChain("", "eth mainnet tx").chain, "ethereum");
  assert.equal(resolveChain("", "on base").chain, "base");
});

const head = async (rpc: string): Promise<string | null> => {
  try {
    const r = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false] }),
      signal: AbortSignal.timeout(15_000),
    });
    const j = (await r.json()) as { result?: { transactions?: string[] } };
    return j.result?.transactions?.[0] ?? null;
  } catch {
    return null; // a provider being down is not a test failure
  }
};

test("a live BSC transaction is read, not denied (live)", async () => {
  const hash = await head("https://bsc-dataseed.bnbchain.org");
  if (!hash) return;
  const r = await lookupTransaction(hash, "bsc", null, true);
  if (r.verdict === "unknown") return;
  assert.notEqual(r.verdict, "not_found", `a live BSC transaction was denied: ${r.reason}`);
  assert.equal(r.chain, "bsc");
  assert.match(r.reason, /on bsc/);
  // Native coin, not ETH: calling a BNB amount ETH is the wrong figure.
  assert.doesNotMatch(r.reason, /\bETH\b/);
});

test("a live Avalanche transaction is read, not denied (live)", async () => {
  const hash = await head("https://api.avax.network/ext/bc/C/rpc");
  if (!hash) return;
  const r = await lookupTransaction(hash, "avalanche", null, true);
  if (r.verdict === "unknown") return;
  assert.notEqual(r.verdict, "not_found", `a live Avalanche transaction was denied: ${r.reason}`);
  assert.equal(r.chain, "avalanche");
  assert.doesNotMatch(r.reason, /\bETH\b/);
});

/**
 * The G88 case, extended: a BSC hash with NO chain named must still be found by
 * the cross-chain search rather than denied on Ethereum's behalf.
 */
test("a BSC hash with no chain named is discovered, not denied (live)", async () => {
  const hash = await head("https://bsc-dataseed.bnbchain.org");
  if (!hash) return;
  const r = await lookupTransaction(hash, "ethereum", null, false);
  if (r.verdict === "unknown") return;
  assert.notEqual(r.verdict, "not_found", `a live BSC transaction was denied: ${r.reason}`);
  assert.equal(r.chain, "bsc", "the answer must name the chain it was actually found on");
  assert.match(r.reason, /No chain was named/);
});
