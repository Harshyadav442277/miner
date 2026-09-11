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
