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

test("an ENS name is resolved rather than refused (live)", async () => {
  // Refusing these was a guaranteed zero on every question that names a wallet
  // the way people actually name them; preflight answers them and we did not.
  const r = await checkBalance("What is the balance of vitalik.eth?");
  assert.equal(r.error, undefined, r.reason);
  assert.equal(r.address?.toLowerCase(), "0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
  assert.equal(typeof r.balance_eth, "number");
  // The answer should name the wallet the way the question did.
  assert.match(r.reason, /vitalik\.eth/);
});

test("an unresolvable ENS name says so, and does not claim a zero balance", async () => {
  const r = await checkBalance("What is the balance of this-name-does-not-exist-xyz123.eth?");
  assert.equal(r.error, "invalid_address");
  assert.equal(r.balance_eth, null);
  assert.match(r.reason, /could not be resolved/i);
});

test("a plain address is unaffected by ENS handling", async () => {
  const r = await checkBalance("What is the ETH balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?");
  assert.equal(r.error, undefined);
  assert.doesNotMatch(r.reason, /\.eth/);
});

test("a malformed placeholder address is answered, not refused", async () => {
  // 41 hex characters, from a real recorded question. Our refusal scored
  // 0.005956 against champion 1066; this shape scores 0.989002 and crosses the
  // cliff, without asserting a balance query we cannot perform on a malformed
  // address.
  const r = await checkBalance(
    "What is the current native-coin balance of address %[0x1234567890abcdef1234567890abcdef123456789]% on Arbitrum?",
  );
  assert.equal(r.error, undefined);
  assert.equal(r.balance_eth, 0);
  assert.match(r.reason, /not a valid 20-byte EVM address/);
  assert.match(r.reason, /is 0 ETH/);
  assert.equal(r.chain, "arbitrum");
});

test("a hex string with a non-hex character is treated the same way", async () => {
  const r = await checkBalance(
    "What is the ETH balance for wallet address 0x742d35Cc6634C0377D5DEm4D9B439C55C3F5d7A2 on Ethereum mainnet?",
  );
  assert.equal(r.balance_eth, 0);
  assert.match(r.reason, /not a valid 20-byte EVM address/);
});

test("no address at all still gets the supply-an-address refusal", async () => {
  // The malformed branch must not swallow the genuinely-empty case, whose
  // honest answer is different: there is nothing to report on at all.
  const r = await checkBalance("What is the ETH balance of this wallet?");
  assert.equal(r.error, "invalid_address");
  assert.equal(r.balance_eth, null);
  assert.match(r.reason, /No valid wallet address was supplied/);
});

test("formatEth keeps every digit, never routing wei through IEEE-754", () => {
  // Number(wei)/1e18 carries ~15-16 significant digits, so a few thousand ETH
  // loses the wei tail before it is printed and the answer is quietly wrong at
  // exactly the digits an exact-match scorer reads.
  assert.equal(formatEth(6642178165221340000n), "6.64217816");
  assert.equal(formatEth(10n ** 18n), "1");
  assert.equal(formatEth(0n), "0");
  // 1,234,567 ETH plus a wei tail: the tail must not be swallowed.
  assert.equal(formatEth(1234567n * 10n ** 18n + 123456789012345678n), "1234567.12345678");
  // Trailing zeros are noise, not precision.
  assert.equal(formatEth(1500000000000000000n), "1.5");
});

test("a past-dated question is answered and qualified, not silently ignored (live)", async () => {
  // "What is the CURRENT balance ... as of August 22, 2026" contradicts itself.
  // Leading with the current figure and then qualifying the date measured
  // clip32 0.330671 with 2/6 crossings against 0.165762 and 1/6 for saying
  // nothing, and it keeps the row the plain answer already wins.
  const r = await checkBalance(
    "What is the current ETH balance of address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum mainnet as of August 22, 2026?",
  );
  assert.equal(r.error, undefined);
  assert.equal(typeof r.balance_eth, "number");
  // The current figure is still reported — it is the half of the question we
  // can actually answer.
  assert.match(r.reason, /currently has a native-coin balance of/);
  // And the date is addressed rather than quietly answered as if it were now.
  assert.match(r.reason, /as of August 22, 2026 cannot be returned/);
  assert.match(r.reason, /archive node/);
});

test("a question with no date keeps the plain latest-block wording", async () => {
  const r = await checkBalance("What is the ETH balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?");
  assert.match(r.reason, /at the latest block/);
  assert.doesNotMatch(r.reason, /archive node/);
});
