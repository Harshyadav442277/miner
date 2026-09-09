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
  assert.deepEqual(resolveChain("", "What happened to this tx on Base?"), { chain: "base", conflict: null, explicit: true });
  assert.deepEqual(resolveChain("polygon", ""), { chain: "polygon", conflict: null, explicit: true });
  // Parameter and prose disagree: the parameter wins AND the caller is told.
  assert.deepEqual(resolveChain("base", "this transaction on polygon"), { chain: "base", conflict: "polygon", explicit: true });
  // Nothing named at all falls back to Ethereum, and says so: Ethereum is the
  // reading ORDER, not a claim, so a miss there must not become "not found".
  assert.deepEqual(resolveChain("", "what is the status of this transaction?"), { chain: "ethereum", conflict: null, explicit: false });
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

/**
 * The providers disagree about pre-Byzantium receipts, and the answer must not.
 *
 * Recorded 2026-09-08 from the three ethereum endpoints in `RPCS`, for the first
 * mainnet transaction (block 46,147). `publicnode` returns the canonical state
 * root and no status; `drpc` and `merkle` synthesise `status: 0x1`. Detection
 * used to key off the field, so the same transaction produced two different
 * answers depending on which endpoint answered first — the live test only
 * caught it on the days a synthesising endpoint won the race.
 */
const PRE_BYZANTIUM_TX = {
  from: "0xa1e4380a3b1f749673e270229993ee55f35663b4",
  to: "0x5df9b87991262f6ba471f09758cde1c0fc1de734",
  value: "0x7a69", blockNumber: "0xb443", gasPrice: "0x2d79883d2000",
};
const CANONICAL_RECEIPT = {
  root: "0x96a8e009d2b88b1483e6941e6812e32263b05683fac202abc622a3e31aed1957",
  gasUsed: "0x5208", effectiveGasPrice: "0x2d79883d2000", contractAddress: null, logs: [],
};
const SYNTHESISED_RECEIPT = {
  status: "0x1",
  gasUsed: "0x5208", effectiveGasPrice: "0x2d79883d2000", contractAddress: null, logs: [],
};

async function answerWith(receipt: unknown): Promise<{ verdict: string; reason: string }> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: unknown, init: { body?: string }) => {
    const method = JSON.parse(String(init?.body ?? "{}")).method;
    const result = method === "eth_getTransactionByHash" ? PRE_BYZANTIUM_TX : receipt;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  try {
    const r = await lookupTransaction(FIRST_TX, "ethereum");
    return { verdict: r.verdict, reason: r.reason };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("a pre-Byzantium receipt reads the same whichever provider answers", async () => {
  const canonical = await answerWith(CANONICAL_RECEIPT);
  const synthesised = await answerWith(SYNTHESISED_RECEIPT);
  assert.equal(canonical.verdict, "confirmed");
  assert.equal(synthesised.verdict, "confirmed");
  // Byte-identical, because the fork height is a property of the chain and not
  // of the endpoint that happened to respond.
  assert.equal(canonical.reason, synthesised.reason);
  assert.match(canonical.reason, /predates the Byzantium fork/);
});

test("a post-Byzantium reverted transaction is still reported as reverted", async () => {
  // The pre-Byzantium branch must not swallow real failures on modern blocks.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: unknown, init: { body?: string }) => {
    const method = JSON.parse(String(init?.body ?? "{}")).method;
    const result = method === "eth_getTransactionByHash"
      ? { ...PRE_BYZANTIUM_TX, blockNumber: "0x1312d00" }   // block 20,000,000
      : { status: "0x0", gasUsed: "0x5208", effectiveGasPrice: "0x2d79883d2000", contractAddress: null, logs: [] };
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  try {
    const r = await lookupTransaction(FIRST_TX, "ethereum");
    assert.equal(r.verdict, "reverted");
    assert.ok(!/Byzantium/.test(r.reason), "a modern block must not carry the fork caveat");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a pre-Byzantium receipt whose provider re-executed to a failure is not called a success", async () => {
  // A synthesised 0x0 is a node reporting that re-execution failed. That is
  // evidence, and it outranks "inclusion implies success".
  const r = await answerWith({ ...SYNTHESISED_RECEIPT, status: "0x0" });
  assert.equal(r.verdict, "reverted");
});

test("a mined transaction whose receipt will not load is unknown, not pending", async () => {
  // The correctness gate caught this against production about one run in four:
  // an endpoint returned the transaction but null for its receipt, and the first
  // mainnet transfer — mined in 2015 — was reported as sitting in the mempool.
  // `unknown` is the honest verdict; `pending` and `not_found` are both false
  // statements about a transaction that is demonstrably in a block.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input: unknown, init: { body?: string }) => {
    const method = JSON.parse(String(init?.body ?? "{}")).method;
    const result = method === "eth_getTransactionByHash" ? PRE_BYZANTIUM_TX : null;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  try {
    const r = await lookupTransaction(FIRST_TX, "ethereum");
    assert.equal(r.verdict, "unknown");
    assert.ok(!/pending|mempool/i.test(r.reason), "a mined transaction is not pending");
    assert.ok(!/does not correspond|no transaction/i.test(r.reason), "a seen transaction is not absent");
    // The facts we DO hold are still stated rather than withheld.
    assert.match(r.reason, /block 46,147/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a receipt that loads from a later endpoint is used, not abandoned", async () => {
  // The first endpoint sheds the receipt, the second serves it. The answer must
  // be the complete one, because a partial receipt scores in the 0.01 band.
  const originalFetch = globalThis.fetch;
  let receiptCalls = 0;
  globalThis.fetch = (async (_input: unknown, init: { body?: string }) => {
    const method = JSON.parse(String(init?.body ?? "{}")).method;
    let result: unknown = PRE_BYZANTIUM_TX;
    if (method === "eth_getTransactionReceipt") result = ++receiptCalls === 1 ? null : CANONICAL_RECEIPT;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  try {
    const r = await lookupTransaction(FIRST_TX, "ethereum");
    assert.equal(r.verdict, "confirmed");
    assert.match(r.reason, /21,000 gas/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a transaction on another supported chain is found without being named (live)", async () => {
  /**
   * The epoch-319 defect, pinned.
   *
   * A hash with no chain named defaulted to Ethereum, and a live Base,
   * Arbitrum or Polygon transaction came back as "does not correspond to any
   * transaction on ethereum" with confidence 0.9 — a confident denial of a
   * transaction that exists on a chain we already read. It scores in the
   * not_found band (~0.006), which is what we scored the first epoch this
   * intent was live.
   *
   * The fixture is fetched at run time rather than hard-coded because a hash
   * pinned here would age out of the providers' history.
   */
  const rpc = async (url: string, method: string, params: unknown[]): Promise<any> => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(15_000),
    });
    return ((await r.json()) as { result?: unknown }).result;
  };

  let hash: string | null = null;
  try {
    const block = await rpc("https://mainnet.base.org", "eth_getBlockByNumber", ["latest", false]);
    hash = (block?.transactions ?? [])[0] ?? null;
  } catch { /* provider down is not a test failure */ }
  if (!hash) return;

  // explicitChain = false: the caller named no chain, which is the failing case.
  const r = await lookupTransaction(hash, "ethereum", null, false);
  if (r.verdict === "unknown") return;
  assert.notEqual(r.verdict, "not_found", `a live Base transaction was denied: ${r.reason}`);
  assert.equal(r.chain, "base", "the answer must name the chain it was actually found on");
  assert.match(r.reason, /on base/);

  // And the caller is told we chose the chain rather than being given a bare
  // fact that silently contradicts the "ethereum" they might have assumed.
  assert.match(r.reason, /No chain was named/);
});

test("an explicitly named chain is still answered about THAT chain (live)", async () => {
  // The mirror case: asking about Ethereum for a hash that is not on Ethereum
  // is a real question about Ethereum, and must not wander off to another chain.
  const notOnEthereum = "0x" + "b".repeat(64);
  const r = await lookupTransaction(notOnEthereum, "ethereum", null, true);
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "not_found");
  assert.equal(r.chain, "ethereum");
  assert.ok(!/No chain was named/.test(r.reason));
});
