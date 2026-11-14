import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyTokenSupply } from "../src/token-supply";
import { nativeCoin } from "../src/known-tokens";

const word = (n: bigint): string => `0x${n.toString(16).padStart(64, "0")}`;
/** An ABI-encoded string return value. */
const abiStr = (s: string): string => `0x${(32n).toString(16).padStart(64, "0")}${BigInt(s.length).toString(16).padStart(64, "0")}${Buffer.from(s).toString("hex").padEnd(64, "0")}`;

/** RPCs answering for one contract; every eth_call `to` is recorded. Explorer search answers `search`. */
async function withChain(symbol: string, search: unknown, run: (to: string[], hosts: string[]) => Promise<void>): Promise<void> {
  const real = globalThis.fetch;
  const to: string[] = [];
  const hosts: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: { body?: string }) => {
    const url = new URL(String(input));
    hosts.push(url.hostname);
    if (url.pathname.startsWith("/api/v2/tokens")) return Response.json(search);
    const body = JSON.parse(String(init?.body ?? "{}")) as { method: string; params: Array<{ to?: string; data?: string }> };
    if (body.method === "eth_blockNumber") return Response.json({ jsonrpc: "2.0", id: 1, result: "0x100" });
    const call = body.params[0]!;
    to.push(String(call.to).toLowerCase());
    const data = String(call.data);
    const result = data === "0x18160ddd" ? word(1_000_000n * 10n ** 6n) : data === "0x313ce567" ? word(6n) : data === "0x95d89b41" ? abiStr(symbol) : word(0n);
    return Response.json({ jsonrpc: "2.0", id: 1, result });
  }) as typeof fetch;
  try {
    await run(to, hosts);
  } finally {
    globalThis.fetch = real;
  }
}

test("native coins are answered as native coins, never resolved to a look-alike contract (2026-11-08)", async () => {
  // Production read token=ethereum as a contract named "ETHEREUM" (1,000,000,000) and token=solana as 888,888,888,888,888.
  await withChain("ETHEREUM", { items: [{ address_hash: "0x1111111111111111111111111111111111111111", symbol: "ETHEREUM", holders_count: "9" }] }, async (to, hosts) => {
    for (const [token, coin] of [["ethereum", "ETH"], ["ETH", "ETH"], ["solana", "SOL"], ["bitcoin", "BTC"], ["BNB", "BNB"], ["matic", "POL"], ["avax", "AVAX"]] as const) {
      const r = await verifyTokenSupply("", token);
      assert.equal(r.verdict, "not_a_token", token);
      assert.equal(r.error, "native_coin");
      assert.equal(r.symbol, coin);
      assert.equal(r.total_supply, null);
      assert.match(r.reason, new RegExp(`^${coin} is the native coin of .+, not an ERC-20 token contract, so it has no totalSupply\\(\\) to read`));
    }
    const q = await verifyTokenSupply("What is the total supply of ethereum?");
    assert.equal(q.error, "native_coin");
    assert.deepEqual([to, hosts], [[], []], "nothing is read for a native coin");
  });
  assert.equal(nativeCoin("WETH"), null);
  assert.match(String(nativeCoin("ether")?.wrapped), /^WETH$/);
});

test("a token name maps to its listed symbol, and a resolved contract must report the symbol asked for", async () => {
  const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
  await withChain("USDT", { items: [] }, async (to) => {
    const r = await verifyTokenSupply("", "tether", "ethereum");
    assert.equal(r.verdict, "verified");
    assert.ok(to.length && to.every((a) => a === USDT), "tether is read at Tether's listed contract");
  });
  const other = "0x2222222222222222222222222222222222222222";
  await withChain("ZZZ", { items: [{ address_hash: other, symbol: "QQQ", holders_count: "500" }] }, async () => {
    const r = await verifyTokenSupply("", "QQQ", "ethereum");
    assert.equal(r.verdict, "ambiguous");
    assert.equal(r.error, "symbol_mismatch");
    assert.equal(r.total_supply, null);
    assert.match(r.reason, /reports its symbol as ZZZ/);
  });
});
