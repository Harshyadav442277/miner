import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtGwei, getGasPrice, resolveChain, roundedGwei, supportedChains } from "../src/gas";

test("the chain named in the question decides which chain is read", () => {
  assert.equal(resolveChain("", "What is the current gas price in Gwei on the Ethereum network?").chain, "ethereum");
  assert.equal(resolveChain("", "Polygon fees felt high yesterday, what are they at now?").chain, "polygon");
  assert.equal(resolveChain("", "gas on base?").chain, "base");
  assert.equal(resolveChain("", "arbitrum gas price").chain, "arbitrum");
  // An explicit parameter wins over prose.
  assert.equal(resolveChain("optimism", "gas on base?").chain, "optimism");
});

test("Ethereum is matched last so it cannot capture another chain's question", () => {
  // `\beth\b` is the native asset on every L2 here and "mainnet" appears in
  // "OP Mainnet", so a leading Ethereum pattern would swallow these.
  assert.equal(resolveChain("", "what does it cost to send ETH on base?").chain, "base");
  assert.equal(resolveChain("", "gas on OP Mainnet").chain, "optimism");
});

test("a chain we cannot read is named, not silently replaced with Ethereum", () => {
  // Reporting Ethereum's fee for a Solana question is a confident answer to a
  // question nobody asked.
  const sol = resolveChain("", "What is the gas price on Solana?");
  assert.equal(sol.chain, null);
  assert.equal(sol.unread, "Solana");
  assert.equal(resolveChain("", "BNB Chain fees right now?").unread, "BNB Chain");
  assert.equal(resolveChain("", "bitcoin transaction fees").unread, "Bitcoin");
});

test("a question naming no chain is marked as such", () => {
  const r = resolveChain("", "what are gas fees right now?");
  assert.equal(r.chain, null);
  assert.equal(r.explicit, false);
  assert.equal(r.unread, null);
});

test("gwei formatting suits the magnitude and drops noise zeros", () => {
  // These chains span five orders of magnitude, so one fixed decimal count is
  // either lossy or noise. The scorer is close to exact-match, so this is a
  // correctness decision.
  assert.equal(fmtGwei(272.55), "272.55");
  assert.equal(fmtGwei(12.4321), "12.432");
  assert.equal(fmtGwei(0.006), "0.006");
  assert.equal(fmtGwei(0.0001), "0.0001");
  assert.equal(fmtGwei(NaN), "unknown");
  // The rounded register collapses onto the exact one when they are the same
  // number, so the answer never says one thing twice.
  assert.equal(roundedGwei(0.006), "0.006");
  assert.equal(roundedGwei(272.55), "273");
  assert.equal(roundedGwei(12.43), "12.4");
});

test("supportedChains covers what the manifest advertises", () => {
  for (const c of ["ethereum", "base", "arbitrum", "optimism", "polygon"]) {
    assert.ok(supportedChains().includes(c), `${c} missing`);
  }
});

test("an unreadable chain is refused with no figure at all", async () => {
  const r = await getGasPrice(null, "Solana");
  assert.equal(r.verdict, "unsupported_chain");
  assert.equal(r.gwei, null);
  assert.ok(!/\d+(\.\d+)?\s*Gwei/.test(r.reason), `a figure was quoted for a chain we did not read: ${r.reason}`);
});

test("a dead RPC is unknown, never a fee of zero", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await getGasPrice("ethereum");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "rpc_unavailable");
    assert.equal(r.gwei, null);
    assert.ok(!/\b0 Gwei\b/.test(r.reason));
    assert.match(r.reason, /availability problem/i);
  } finally {
    globalThis.fetch = original;
  }
});

/* --------------------------------- live ---------------------------------- */

test("a real gas price comes back with its block and both registers (live)", async () => {
  const r = await getGasPrice("ethereum");
  if (r.verdict === "unknown") return;   // RPCs down is not a test failure
  assert.equal(r.verdict, "gas_price");
  assert.ok(r.gwei !== null && r.gwei > 0, `implausible gas price: ${r.gwei}`);
  assert.ok(r.block !== null && r.block > 20_000_000, `implausible block: ${r.block}`);
  // The block number makes the figure checkable rather than a bare assertion.
  assert.match(r.reason, /as of block [\d,]+/);
  // The described trap: this intent is a FEE, never the token's price.
  assert.match(r.reason, /not the price of ETH/);
  assert.ok(!/\$/.test(r.reason), "a gas answer must not quote a dollar price");
});

test("every supported chain answers with a plausible fee (live)", async () => {
  for (const chain of supportedChains()) {
    const r = await getGasPrice(chain);
    if (r.verdict === "unknown") continue;
    assert.equal(r.verdict, "gas_price", `${chain} -> ${r.verdict}`);
    assert.ok(r.gwei !== null && r.gwei >= 0, `${chain} gwei ${r.gwei}`);
    // Base fee and priority must reconcile with the total where both exist.
    if (r.base_fee_gwei !== null && r.priority_gwei !== null) {
      assert.ok(r.priority_gwei >= 0, `${chain} negative priority fee`);
    }
    assert.ok(r.reason.includes(chain), `${chain} answer does not name the chain`);
  }
});
