import { test } from "node:test";
import assert from "node:assert/strict";
import { holderAndToken, metricKind, statedBlock, verifyOnchainMetric } from "../src/onchain-metric";

const TX = "0x24e20c506fd16546178a03c955bca381376f97b9ff5aefb726abf84dea6c8913";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const VAULT = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

test("onchain metric: the block anchor is read from the question or the parameter", () => {
  assert.equal(statedBlock("At block 21000000 on ethereum, what gas did it use?"), 21_000_000);
  assert.equal(statedBlock("at block height 21,000,000"), 21_000_000);
  assert.equal(statedBlock("block #19_000_001"), 19_000_001);
  assert.equal(statedBlock("What is the latest USDC balance of 0xabc?"), "latest");
  assert.equal(statedBlock("anything", "latest"), "latest");
  assert.equal(statedBlock("anything", "123"), 123);
  assert.equal(statedBlock("What is the USDC supply?"), null);
});

test("onchain metric: the read is picked from the question", () => {
  assert.equal(metricKind("how much gas did tx use", true, [], null), "tx_receipt");
  assert.equal(metricKind("storage slot 3 of 0x…", false, [USDC], null), "storage");
  assert.equal(metricKind("total supply of USDC at block 1", false, [], "USDC"), "total_supply");
  assert.equal(metricKind("ETH balance of 0x… at block 5", false, [VAULT], null), "native_balance");
  assert.equal(metricKind("USDC held by 0x…", false, [VAULT], "USDC"), "token_balance");
  assert.equal(metricKind("gas used at block 5", false, [], null), "block");
  assert.equal(metricKind("What is the price of ETH?", false, [], null), null);
});

test("onchain metric: the address named as the token is the token, the other the holder", () => {
  assert.deepEqual(holderAndToken(`balance of token ${USDC} held by ${VAULT}`, [USDC, VAULT]), { holder: VAULT, token: USDC });
  assert.deepEqual(holderAndToken(`how much of ${USDC} does ${VAULT} hold`, [VAULT, USDC]), { holder: VAULT, token: USDC });
  assert.deepEqual(holderAndToken(`balance of ${VAULT}`, [VAULT]), { holder: VAULT, token: null });
});

/** A chain whose RPCs answer from a table; `null` methods answer null, missing ones error. */
function stubRpc(table: Record<string, (params: unknown[]) => unknown>): () => void {
  const real = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const { method, params } = JSON.parse(init.body) as { method: string; params: unknown[] };
    const f = table[method];
    const body = f ? { jsonrpc: "2.0", id: 1, result: f(params) } : { jsonrpc: "2.0", id: 1, error: { message: "not whitelisted" } };
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return () => { globalThis.fetch = real; };
}

const word = (n: bigint): string => `0x${n.toString(16).padStart(64, "0")}`;
const addrTopic = (a: string): string => `0x${a.slice(2).toLowerCase().padStart(64, "0")}`;

test("onchain metric: a receipt gives gas, fee and the Transfer amount, and a wrong block is said", async () => {
  const restore = stubRpc({
    eth_blockNumber: () => "0x1922000",
    eth_getTransactionReceipt: () => ({
      blockNumber: "0x1406f40", gasUsed: "0x409ad", effectiveGasPrice: "0x4a817c800", status: "0x1",
      logs: [{ address: USDC, logIndex: "0x5", data: word(7_534_659_460n),
        topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", addrTopic(VAULT), addrTopic(USDC)] }],
    }),
    eth_call: (p) => ((p[0] as { data: string }).data === "0x313ce567" ? word(6n)
      : `0x${"20".padStart(64, "0")}${"4".padStart(64, "0")}${Buffer.from("USDC").toString("hex").padEnd(64, "0")}`),
  });
  try {
    const a = await verifyOnchainMetric(`At block 21000001 on ethereum, what did the Transfer log in tx ${TX} carry and how much gas did it use?`);
    assert.equal(a.verdict, "verified");
    assert.equal(a.metric, "tx_receipt");
    assert.equal(a.block_number, 21_000_000);
    assert.equal(a.gas_used, "264621");
    assert.equal(a.fee, "0.00529242");
    assert.equal(a.transfers?.[0]?.amount, "7534.65946");
    assert.equal(a.transfers?.[0]?.symbol, "USDC");
    assert.equal(a.providers_agree, true);
    assert.match(a.reason, /names block 21,000,001, but the transaction is in block 21,000,000/);
  } finally { restore(); }
});

test("onchain metric: no answer is unknown, never a zero; a future block is refused", async () => {
  let restore = stubRpc({ eth_blockNumber: () => "0x10" });
  try {
    const a = await verifyOnchainMetric(`What was the ETH balance of ${VAULT} at block 5?`);
    assert.equal(a.verdict, "unknown");
    assert.equal(a.value, null);
    const f = await verifyOnchainMetric("How much gas did block 99 use?");
    assert.equal(f.verdict, "not_found");
    assert.equal(f.error, "future_block");
  } finally { restore(); }
  restore = stubRpc({});
  try {
    const down = await verifyOnchainMetric("How much gas did block 5 use?");
    assert.equal(down.verdict, "unknown");
    assert.equal(down.error, "upstream_unavailable");
  } finally { restore(); }
});
