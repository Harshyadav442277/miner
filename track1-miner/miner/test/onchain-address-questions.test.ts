/**
 * ONCHAIN_TX_LOOKUP's address questions, found by replaying the routed feed.
 *
 * The corpus for this intent grew from 2 questions to 13 on 2026-09-12, and
 * five of the eleven new ones ask about an ADDRESS rather than about a hash.
 * Production refused every one of them: `/tx-lookup` named the address as the
 * wrong subject and pointed at WALLET_BALANCE_CHECK, which does not answer a
 * transaction-history or contract-or-wallet question either.
 *
 * That matters more here than the wording work does. At epoch 325 this intent
 * scored us 0.0122 against a leader on 0.9950, and a refusal cannot cross a
 * cliff at all — so a question we decline is a guaranteed loss where an answered
 * one is at least in the running.
 *
 * Every question below is verbatim from `tools/routed-questions.json`. Each one
 * fails on the previous build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { activityAddress, asksActivity, lookupActivity } from "../src/contractactivity";

/** The five that were refused, exactly as the network sent them. */
const ROUTED = [
  "is 0x1234567890123456789012345678901234567890 a contract or wallet?",
  "transaction history for 0x742d35Cc6634C0532925a3b844Bc9e7595f42aE6",
  "did this address move money: 0x742d35Cc6634C0532925a3b844Bc9e7595f42aE6",
  "did 0x742d35Cc6634C0532925a3b844Bc9e7595f42aE6 send ETH in the last hour?",
  "analyze this transaction hash: 0x9b59b4d3d808ba8c60766c0cebead45313d934b1",
];

test("routed refusal: every address question reaches the activity path", () => {
  for (const q of ROUTED) {
    assert.equal(asksActivity(q), true, `not recognised: ${q}`);
    assert.ok(activityAddress(q), `no address extracted from: ${q}`);
  }
});

/**
 * The widening must not swallow the redirect. A transaction question that
 * happens to carry an address is still the wrong subject for this endpoint, and
 * answering it with an account summary would be a confidently wrong answer
 * rather than a refusal.
 */
test("a transaction question carrying an address is still not an activity question", () => {
  const a = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  assert.equal(asksActivity(`${a} status?`), false);
  assert.equal(asksActivity(`Is ${a} confirmed or failed?`), false);
  assert.equal(asksActivity(`What block is ${a} in?`), false);
  // "confirmed or failed" must not reach the "contract or wallet" pattern.
  assert.equal(asksActivity(`Is ${a} pending or confirmed?`), false);
});

/**
 * The nonce is the whole reason the recency questions can be answered at all.
 * 0x742d…2aE6 is a placeholder address that appears throughout AI-generated
 * text; it has never sent a transaction, so "did it send ETH in the last hour"
 * has a definite answer rather than an unknown one. Verified independently on
 * 2026-09-12 with eth_getTransactionCount and eth_getBalance, both zero.
 */
test("an account that never sent anything answers the recency question definitely (live)", async () => {
  const r = await lookupActivity("0x742d35Cc6634C0532925a3b844Bc9e7595f42aE6", "ethereum", { recency: true });
  if (r.verdict === "unavailable") return;
  assert.equal(r.verdict, "account_activity");
  assert.equal(r.is_contract, false);
  assert.equal(r.sent, 0);
  assert.match(r.reason, /never sent a transaction of its own/);
  assert.match(r.reason, /nonce is 0/);
  // The answer has to actually address the window the question asked about.
  assert.match(r.reason, /last hour/);
});

/**
 * An account can hold thousands of transactions and a nonce of zero, because
 * the count is of transactions recorded AGAINST it. Stating both numbers
 * without saying which is which reads as a contradiction.
 */
test("inbound transactions are told apart from sent ones (live)", async () => {
  const r = await lookupActivity("0x1234567890123456789012345678901234567890", "ethereum");
  if (r.verdict === "unavailable") return;
  assert.equal(r.sent, 0);
  if ((r.transactions ?? 0) > 0) {
    assert.match(r.reason, /were sent to it/);
  }
});

/**
 * A contract's nonce counts the contracts it has created, not the transactions
 * sent to it. Reporting it as a send count is the confidently-wrong number the
 * module header warns about, so it is never read for a contract.
 */
test("a contract never reports a sent count (live)", async () => {
  const r = await lookupActivity("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "ethereum");
  if (r.verdict === "unavailable") return;
  assert.equal(r.verdict, "contract_activity");
  assert.equal(r.sent, null);
  assert.doesNotMatch(r.reason, /sent by the account itself/);
  assert.doesNotMatch(r.reason, /never sent a transaction/);
});

/**
 * An undated recency read is reported as undated. Letting it fall silent would
 * let a reader infer "no recent activity" from an index that simply did not
 * return a timestamp — the same absence-versus-outage distinction the rest of
 * this module already keeps.
 */
test("a recency read that returns nothing says so rather than implying inactivity (live)", async () => {
  const r = await lookupActivity("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "ethereum", { recency: true });
  if (r.verdict === "unavailable") return;
  if (r.last_activity === null) {
    assert.match(r.reason, /did not date its most recent transaction/);
  } else {
    assert.match(r.reason, /most recent recorded transaction is dated/);
  }
});
