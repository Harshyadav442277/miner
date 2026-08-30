import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { walletAddress, walletChain, formatEth, checkBalance } from "../src/wallet";

describe("wallet parsing", () => {
  test("reads an address out of a question", () =>
    assert.equal(
      walletAddress("What is the current ETH balance of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Base?"),
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    ));

  test("rejects a malformed address rather than guessing", () =>
    assert.equal(walletAddress("balance of 0x1234567890abcdef1234567890abcdef123456789 on Arbitrum"), null));

  test("names the chain the question names, defaulting to ethereum", () => {
    assert.equal(walletChain("balance on Base chain"), "base");
    assert.equal(walletChain("on the Arbitrum chain"), "arbitrum");
    assert.equal(walletChain("on Polygon"), "polygon");
    assert.equal(walletChain("on Ethereum mainnet"), "ethereum");
    assert.equal(walletChain("what is the balance"), "ethereum");
  });

  test("formats wei without trailing noise, and zero as zero", () => {
    assert.equal(formatEth(0n), "0");
    assert.equal(formatEth(2470000000000000000n), "2.47");
    assert.match(formatEth(1000n), /e-/);
  });
});

describe("checkBalance (live)", () => {
  test("a real Base address returns a balance and names the method", async () => {
    const r = await checkBalance("native-coin balance of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Base chain");
    assert.equal(r.chain, "base");
    assert.ok(r.balance_eth !== null);
    assert.match(r.reason, /eth_getBalance/);
    assert.match(r.reason, /ETH on base/);
  });

  // A zero balance and an unreachable node must never be the same sentence:
  // reporting a dead RPC as "0" is how an answer becomes confidently wrong.
  test("an unreachable RPC is reported as unavailable, never as zero", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response("nope", { status: 503 })) as typeof globalThis.fetch;
    try {
      const r = await checkBalance("balance of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Base");
      assert.equal(r.balance_eth, null);
      assert.equal(r.error, "upstream_unavailable");
      assert.match(r.reason, /not a statement that the balance is zero/);
    } finally {
      globalThis.fetch = original;
    }
  });

  test("a token asked about alongside the native coin is called out, not ignored", async () => {
    const r = await checkBalance("current ETH and USDT balance for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum");
    assert.match(r.reason, /USDT/);
    assert.match(r.reason, /native-coin balance only/);
  });

  test("no address degrades to a shaped answer, not a crash", async () => {
    const r = await checkBalance("what is the balance");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.confidence, 0);
    assert.ok(r.reason.length > 0);
  });
});
