import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBalance, walletChain } from "../src/wallet";

const ADDRESS = "0x8b224783FE5b3c52B7DB0cb9B1754f8812b75287";
const word = (value: bigint) => `0x${value.toString(16).padStart(64, "0")}`;
async function mockFetch(fn: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = fn;
  try { await run(); } finally { globalThis.fetch = original; }
}

test("wallet structured Ethereum takes precedence over Base in prose", () => {
  assert.equal(walletChain("balance on Base", "ethereum"), "ethereum");
  assert.equal(walletChain("balance on Base", "arbitrum"), "arbitrum");
});

test("wallet accepts structured chain IDs without replacing Base with Ethereum", () => {
  assert.equal(walletChain("balance", "8453"), "base");
  assert.equal(walletChain("balance", "0xa4b1"), "arbitrum");
});

test("wallet reads the requested Base USDC contract and six-decimal amount", async () => {
  await mockFetch(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.method, "eth_call", "a token-only question must not read native ETH");
    assert.equal(body.params[0].to.toLowerCase(), "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
    assert.equal(body.params[0].data, `0x70a08231${ADDRESS.slice(2).toLowerCase().padStart(64, "0")}`);
    return Response.json({ result: word(123456789n) });
  }, async () => {
    const result = await checkBalance(`What is the USDC balance of ${ADDRESS} on base?`);
    assert.match(result.reason, /123\.456789 USDC/);
    assert.equal(result.balance_eth, null);
    assert.doesNotMatch(result.reason, /not included|native-coin balance only/);
  });
});

test("wallet answers both native ETH and Ethereum USDT when both are requested", async () => {
  await mockFetch(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    if (body.method === "eth_getBalance") return Response.json({ result: "0xde0b6b3a7640000" });
    assert.equal(body.params[0].to.toLowerCase(), "0xdac17f958d2ee523a2206206994597c13d831ec7");
    return Response.json({ result: word(42000001n) });
  }, async () => {
    const result = await checkBalance(`ETH and USDT balance for ${ADDRESS} on Ethereum`);
    assert.match(result.reason, /1 ETH/);
    assert.match(result.reason, /42\.000001 USDT/);
  });
});

test("wallet never substitutes native USDC for explicitly bridged USDC.e", async () => {
  await mockFetch(async () => { throw new Error("no RPC should be used for an unresolved token"); }, async () => {
    const result = await checkBalance(`USDC.e balance for ${ADDRESS} on Arbitrum`);
    assert.equal(result.verdict, "unknown");
    assert.match(result.reason, /USDC\.e/);
  });
});

test("wallet reports token failure as unknown even if native ETH would be available", async () => {
  await mockFetch(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    return Response.json(body.method === "eth_call" ? { error: { code: -32000 } } : { result: "0x0" });
  }, async () => {
    const result = await checkBalance(`USDC balance for ${ADDRESS} on base`);
    assert.equal(result.verdict, "unknown");
    assert.equal(result.balance_eth, null);
    assert.match(result.reason, /USDC.*unavailable|USDC.*could not/);
  });
});

test("wallet reads BNB Chain natively rather than returning an Ethereum substitute", async () => {
  await mockFetch(async (url) => {
    assert.match(String(url), /bnbchain/);
    return Response.json({ result: "0xde0b6b3a7640000" });
  }, async () => {
    const result = await checkBalance(`native balance of ${ADDRESS} on bsc (chain id 56)`);
    assert.equal(result.chain, "bsc");
    assert.equal(result.verdict, "1 BNB");
  });
});

test("wallet does not accept a result bundled with a JSON-RPC error", async () => {
  await mockFetch(async () => Response.json({ result: "0x0", error: { code: -32000 } }), async () => {
    const result = await checkBalance(`balance of ${ADDRESS}`);
    assert.equal(result.balance_eth, null);
    assert.equal(result.error, "upstream_unavailable");
  });
});

test("wallet starts a healthy alternate while the first RPC is still stalled", async () => {
  let primaryAborted = false;
  await mockFetch(async (url, init) => {
    if (String(url).includes("mainnet.base.org")) {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          primaryAborted = true;
          reject(new Error("aborted"));
        }, { once: true });
      });
    }
    assert.equal(primaryAborted, false, "alternate should start before primary times out");
    return Response.json({ result: "0x1" });
  }, async () => {
    const result = await checkBalance(`balance of ${ADDRESS} on Base`, 100);
    assert.equal(result.balance_eth, 1e-18);
    assert.equal(primaryAborted, true, "cancel the unused request after success");
  });
});

test("malformed wallet addresses have no known balance, not an invented zero", async () => {
  const result = await checkBalance("wallet balance of 0x1234567890abcdef1234567890abcdef123456789");
  assert.equal(result.balance_eth, null);
  assert.equal(result.verdict, "unknown");
  assert.equal(result.error, "invalid_address");
});

test("wallet does not read Ethereum USDC for an unknown structured network", async () => {
  await mockFetch(async () => { throw new Error("unexpected RPC"); }, async () => {
    const result = await checkBalance(`USDC balance of ${ADDRESS}`, 100, "imaginary-chain");
    assert.equal(result.verdict, "unknown");
    assert.match(result.reason, /imaginary-chain/);
  });
});

test("wallet does not substitute mainnet USDC for Base-Sepolia or Linea", async () => {
  await mockFetch(async () => { throw new Error("unexpected RPC"); }, async () => {
    for (const network of ["base-sepolia", "linea"]) {
      const result = await checkBalance(`USDC balance of ${ADDRESS} on ${network}`);
      assert.equal(result.verdict, "unknown");
      assert.equal(result.error, "unsupported_chain");
    }
  });
});

test("wallet distinguishes a zero token balance from an empty contract result", async () => {
  for (const result of ["0x", word(0n)]) {
    await mockFetch(async () => Response.json({ result }), async () => {
      const balance = await checkBalance(`USDC balance of ${ADDRESS} on base`);
      assert.equal(balance.verdict, result === "0x" ? "unknown" : "0 USDC");
    });
  }
});

test("a token contract beside the wallet is read by balanceOf, and the wallet is not mistaken for it (Daemon feed, 2026-11-25)", async () => {
  const WALLET = "0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c";
  const LDO = "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32";
  const symbolWord = `0x${word(32n).slice(2)}${word(3n).slice(2)}${Buffer.from("LDO").toString("hex").padEnd(64, "0")}`;
  const calls: Array<{ method: string; to?: string; data?: string }> = [];
  await mockFetch((async (_url: string, init?: { body?: string }) => {
    const body = JSON.parse(String(init?.body)) as { method: string; params: Array<{ to?: string; data?: string }> };
    calls.push({ method: body.method, to: body.params[0]?.to, data: body.params[0]?.data });
    const data = body.params[0]?.data ?? "";
    const result = body.method !== "eth_call" ? "0x0" : data.startsWith("0x70a08231") ? word(128086165184599365251635349n)
      : data === "0x313ce567" ? word(18n) : symbolWord;
    return Response.json({ jsonrpc: "2.0", id: 1, result });
  }) as typeof fetch, async () => {
    for (const q of [`What is the balance of token ${LDO} held by ${WALLET} on ethereum?`, `LDO (${LDO}) balance of ${WALLET}`, `${WALLET} ${LDO.toLowerCase()} contract`.replace(/(0x5a98)/, "token $1")]) {
      calls.length = 0;
      const r = await checkBalance(q, 3000, "ethereum");
      assert.equal(r.address, WALLET, q);
      assert.equal(r.verdict, "128086165.184599365251635349 LDO", q);
      assert.equal(r.symbol, "LDO", q);
      assert.equal(r.token_balances?.[0]?.contract?.toLowerCase(), LDO.toLowerCase());
      assert.ok(calls.every((c) => c.method === "eth_call" && c.to?.toLowerCase() === LDO.toLowerCase()), "only the token contract is called");
      assert.ok(calls.some((c) => c.data === `0x70a08231${WALLET.slice(2).toLowerCase().padStart(64, "0")}`), "balanceOf the wallet");
    }
  });
});

test("one address, or two with neither marked as a token, keeps the first as the wallet", async () => {
  const { walletAndToken } = await import("../src/wallet-tokens");
  const A = "0x8b224783FE5b3c52B7DB0cb9B1754f8812b75287";
  const B = "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32";
  assert.deepEqual(walletAndToken(`balance of ${A}`), { wallet: A, token: null });
  assert.deepEqual(walletAndToken(`compare ${A} and ${B}`), { wallet: A, token: null });
  assert.deepEqual(walletAndToken(`How many holders does the token at ${A} have?`), { wallet: A, token: null });
});
