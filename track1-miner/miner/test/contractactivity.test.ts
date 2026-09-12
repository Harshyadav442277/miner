import { test } from "node:test";
import assert from "node:assert/strict";
import { activityAddress, asksActivity, lookupActivity, resolveChain, supportedChains } from "../src/contractactivity";

const ROUTED =
  "For the contract address 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D on ethereum, report its "
  + "on-chain activity: the date it was deployed and the total number of transactions.";

test("the routed activity question is recognised", () => {
  // This is one of only two questions ONCHAIN_TX_LOOKUP has ever been routed,
  // and we answered neither.
  assert.equal(asksActivity(ROUTED), true);
  assert.equal(activityAddress(ROUTED), "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  assert.equal(resolveChain("", ROUTED), "ethereum");
});

/**
 * The redirect that sends an address to the balance intent is correct for a
 * transaction question and must survive. Only a question naming a deployment or
 * a count takes the activity path.
 */
test("an address with a transaction question is not an activity question", () => {
  assert.equal(asksActivity("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 status?"), false);
  assert.equal(asksActivity("Is 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 confirmed or failed?"), false);
  // No address at all is never an activity question.
  assert.equal(asksActivity("how many transactions were there?"), false);
  assert.equal(asksActivity("when was it deployed?"), false);
});

test("deployment and count wording both trigger it", () => {
  const a = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  assert.equal(asksActivity(`When was ${a} deployed?`), true);
  assert.equal(asksActivity(`How many transactions does ${a} have?`), true);
  assert.equal(asksActivity(`total number of transactions for ${a}`), true);
  assert.equal(asksActivity(`${a} on-chain activity`), true);
});

test("every supported chain resolves, and an unsupported one is named", async () => {
  for (const c of supportedChains()) assert.equal(resolveChain(c, ""), c);
  const r = await lookupActivity("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "solana");
  assert.equal(r.verdict, "unavailable");
  assert.equal(r.error, "unsupported_chain");
  // The refusal names the chain rather than answering from a different one.
  assert.match(r.reason, /solana is not among them/);
});

/**
 * G116: Blockscout down on Ethereum. The stub answers every upstream by URL, so
 * the failover's whole path runs offline: Blockscout 503, Routescan's count,
 * creation hash and transaction record. The chain's RPC answers the receipt
 * with null, as publicnode really does for the router's pruned 2020 deployment
 * (measured 2026-09-13), so the date must not depend on it.
 */
function stubUpstreams(blockscoutStatus: number): () => void {
  const original = globalThis.fetch;
  const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("blockscout.com")) return json({ message: "down" }, blockscoutStatus);
    if (url.includes("routescan.io") && url.includes("/addresses/")) return json({ transactionsCount: 90283142 });
    if (url.includes("routescan.io") && url.includes("/transactions/")) return json({ timestamp: "2020-06-05T20:17:21.000Z", blockNumber: 10207858 });
    if (url.includes("routescan.io")) {
      return json({ status: "1", result: [{ txHash: "0x4fc1580e7f66c58b7c26881cce0aab9c3509afe6e507527f30566fbf8039bcd0" }] });
    }
    const method = (JSON.parse(String(init?.body ?? "{}")) as { method?: string }).method;
    if (method === "eth_getCode") return json({ result: "0x60806040" });
    if (method === "eth_getTransactionCount") return json({ result: "0x1" });
    return json({ result: null });
  }) as unknown as typeof globalThis.fetch;
  return () => { globalThis.fetch = original; };
}

test("a Blockscout outage on Ethereum fails over to Routescan and says so", async () => {
  const restore = stubUpstreams(503);
  try {
    const r = await lookupActivity("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "ethereum");
    assert.equal(r.verdict, "contract_activity");
    assert.equal(r.transactions, 90283142);
    assert.equal(r.deployed_at, "2020-06-05T20:17:21.000Z");
    assert.match(r.reason, /deployed on Ethereum on 5 June 2020/);
    // Routescan's count can trail the chain, so it is attributed and not called current.
    assert.match(r.reason, /90,283,142 transactions recorded against it in Routescan's index, a count that can trail the live chain/);
    assert.match(r.reason, /Read from Routescan's Ethereum index because the Blockscout explorer did not answer/);
    assert.doesNotMatch(r.reason, /not recorded in the index/);
  } finally {
    restore();
  }
});

test("a Blockscout 404 is an absence and is not failed over", async () => {
  const restore = stubUpstreams(404);
  try {
    const r = await lookupActivity("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "ethereum");
    assert.equal(r.verdict, "not_found");
    assert.doesNotMatch(r.reason, /Routescan/);
  } finally {
    restore();
  }
});

test("an outage on a chain Routescan does not cover stays an outage", async () => {
  const restore = stubUpstreams(503);
  try {
    const r = await lookupActivity("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "base");
    assert.equal(r.verdict, "unavailable");
    assert.equal(r.error, "upstream_unavailable");
    assert.match(r.reason, /index outage rather than an address with no activity/);
  } finally {
    restore();
  }
});

/**
 * G93, in a second place. Blockscout's `is_contract` is true for an externally
 * owned account carrying an EIP-7702 delegation, and the first address tested
 * against this module was vitalik.eth, which it duly called "a contract". That
 * is a false statement about who controls the funds.
 */
test("a delegated account is not reported as a deployed contract (live)", async () => {
  const r = await lookupActivity("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "ethereum");
  if (r.verdict === "unavailable") return; // An index outage is not a test failure.
  assert.equal(r.is_contract, false);
  assert.equal(r.verdict, "account_activity");
  assert.match(r.reason, /externally owned account/);
  assert.doesNotMatch(r.reason, /\bis a contract\b/);
  // No deployment date is claimed for something that was never deployed.
  assert.equal(r.deployed_at, null);
});

test("a real contract reports its deployment date and transaction count (live)", async () => {
  const r = await lookupActivity("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "ethereum");
  if (r.verdict === "unavailable") return;
  assert.equal(r.verdict, "contract_activity");
  assert.equal(r.is_contract, true);
  // The router was deployed in June 2020 and that date does not change.
  assert.match(r.reason, /5 June 2020/);
  assert.ok((r.transactions ?? 0) > 1_000_000, `transaction count ${r.transactions} is implausibly low`);
  // The figure is attributed, so a reader can check it.
  assert.match(r.reason, /deployment transaction 0x[a-f0-9]{64}/i);
});

test("an address the index does not hold is an absence, not an outage (live)", async () => {
  const r = await lookupActivity("0x000000000000000000000000000000000000dEaD", "ethereum");
  if (r.verdict === "unavailable") return;
  // Either it is indexed as an account, or it is honestly not found. Neither
  // may claim a deployment.
  assert.ok(["account_activity", "contract_activity", "not_found"].includes(r.verdict));
  if (r.verdict === "not_found") assert.match(r.reason, /The index answered/);
});
