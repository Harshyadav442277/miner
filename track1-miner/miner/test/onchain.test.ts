import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSupportedChain, lookupTransaction, malformedHash, resolveChain, supportedChains, toCoin, txHash,
} from "../src/onchain";

// The first transaction ever mined on Ethereum mainnet. Chosen as the live
// fixture precisely because it is awkward: block 46,147 predates Byzantium, so
// its receipt carries a state root and NO status field, and it moves 31,337 wei
// — far below anything a six-decimal coin rendering can hold. Both are the
// cases that produce a confidently wrong answer if handled naively.
const FIRST_TX = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060";
const NOT_ON_CHAIN = "0xa1b2b1a90b1d9bea0b1a7e5e9a3b31c88f8a3d16f2f4b0e0d1f7b8e1d6c8a9f0";

test("txHash accepts a 64-hex hash and lowercases it", () => {
  assert.equal(txHash(`Look up ${FIRST_TX.toUpperCase()} please`), FIRST_TX);
  assert.equal(txHash(FIRST_TX), FIRST_TX);
});

test("txHash rejects a 40-hex wallet address", () => {
  // WALLET_BALANCE_CHECK's subject must never be read as this intent's subject.
  assert.equal(txHash("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"), null);
});

test("txHash rejects hashes of the wrong length", () => {
  assert.equal(txHash("0x" + "a".repeat(63)), null);
  assert.equal(txHash("0x" + "a".repeat(65)), null);
});

test("malformedHash names a near-miss but not an address or a valid hash", () => {
  assert.equal(malformedHash("0x" + "a".repeat(63)), "0x" + "a".repeat(63));
  assert.equal(malformedHash("0x" + "a".repeat(65)), "0x" + "a".repeat(65));
  // A short stub is still something the caller supplied, and saying "no hash
  // was supplied" to someone who supplied one is the wrong answer.
  assert.equal(malformedHash("0xdeadbeef1234"), "0xdeadbeef1234");
  assert.equal(malformedHash(FIRST_TX), null);
  assert.equal(malformedHash("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"), null);
  assert.equal(malformedHash("what is the status?"), null);
});

test("resolveChain prefers the parameter and reports a conflict rather than hiding it", () => {
  assert.deepEqual(resolveChain("", "What happened to this tx on Base?"), { chain: "base", conflict: null });
  assert.deepEqual(resolveChain("polygon", ""), { chain: "polygon", conflict: null });
  // Parameter and prose disagree: the parameter wins AND the caller is told.
  assert.deepEqual(resolveChain("base", "this transaction on polygon"), { chain: "base", conflict: "polygon" });
  // Nothing named at all falls back to Ethereum.
  assert.deepEqual(resolveChain("", "what is the status of this transaction?"), { chain: "ethereum", conflict: null });
});

test("unsupported chains are identified, not silently coerced", () => {
  assert.equal(isSupportedChain("solana"), false);
  assert.equal(isSupportedChain("ethereum"), true);
  assert.ok(supportedChains().includes("polygon"));
});

test("toCoin keeps every significant digit instead of truncating to zero", () => {
  // 31,337 wei rendered with six decimals is 0.000000000000031 — a different
  // number from the one on chain. Sub-microcoin amounts stay in wei.
  assert.equal(toCoin(31337n, "ETH"), "31,337 wei");
  assert.equal(toCoin(0n, "ETH"), "0 ETH");
  assert.equal(toCoin(10n ** 18n, "ETH"), "1 ETH");
  assert.equal(toCoin(15n * 10n ** 17n, "ETH"), "1.5 ETH");
  assert.equal(toCoin(10n ** 18n, "POL"), "1 POL");
  // 0.0000140979735405 ETH must not become 0.000014.
  assert.equal(toCoin(14097973540575n, "ETH"), "0.0000140979 ETH");
});

test("a pre-Byzantium receipt is confirmed, not reverted (live)", async () => {
  const r = await lookupTransaction(FIRST_TX, "ethereum");
  // If the RPCs are unavailable the honest answer is `unknown`; that is not a
  // test failure, but it must never be `reverted`.
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "confirmed");
  assert.match(r.reason, /21,000 gas/);
  assert.match(r.reason, /block 46,147/);
  assert.match(r.reason, /31,337 wei/);
  assert.match(r.reason, /Byzantium/);
  assert.ok(!/reverted/.test(r.reason), "a successful transaction must not be described as reverted");
});

test("a hash that is not on the chain is not_found, with no invented receipt (live)", async () => {
  const r = await lookupTransaction(NOT_ON_CHAIN, "ethereum");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "not_found");
  assert.equal(r.confidence, 0.9);
  // The claim to guard is that no receipt was invented, so the assertion is on
  // figures, not on the word: "it has no status, no gas used and no block
  // number" is the correct answer and names gas without asserting an amount.
  assert.ok(!/\d[\d,]* gas\b/.test(r.reason), "a missing transaction must not be given a gas figure");
  assert.ok(!/block \d/.test(r.reason), "a missing transaction must not be given a block number");
  assert.match(r.reason, /does not correspond to any transaction/);
});

test("an RPC outage reports unknown, never not_found", async () => {
  // Point the module at a chain with no endpoints by asking for one that does
  // not exist in the table: fetchTx sees no working endpoint and must say so.
  const r = await lookupTransaction(FIRST_TX, "no-such-chain");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "rpc_unavailable");
  assert.match(r.reason, /not a statement about the transaction/);
  assert.ok(!/does not exist/.test(r.reason), "an outage must not be reported as absence");
});

test("a conflicting chain is named in the answer (live)", async () => {
  const r = await lookupTransaction(FIRST_TX, "ethereum", "polygon");
  if (r.verdict === "unknown" && r.error === "rpc_unavailable") return;
  assert.match(r.reason, /chain parameter said ethereum while the question mentioned polygon/);
});
