import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupTransaction, weiToDecimal, type TxResult } from "../src/onchain";

/**
 * The transaction's facts as fields, which Season I's winner returned and we
 * did not (track1-miner/docs/SEASON2_PLAN.md, item 0). Selectors are unique to
 * this file because resolved names are cached for the life of the process.
 */

const HASH = "0x" + "7".repeat(64);
const FROM = "0x2CE910fbba65b454bbaf6a18c952a70f3bcd8299";
const TO = "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1";
const BLOCK_HASH = "0x" + "ab".repeat(32);
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const OK = {
  status: "0x1", gasUsed: "0x9eceb", effectiveGasPrice: "0x7a86ba0", contractAddress: null,
  logs: [{ address: TO, topics: [TRANSFER] }],
};
const tx = (over: Record<string, unknown> = {}) => ({
  from: FROM, to: TO, value: "0x14d1120d7b160000", blockNumber: "0x18826a0", blockHash: BLOCK_HASH,
  gasPrice: "0x7a86ba0", input: `0x1a2b3c4d${"00".repeat(32)}`, ...over,
});

async function lookup(txBody: unknown, receipt: unknown): Promise<TxResult> {
  const original = globalThis.fetch;
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  globalThis.fetch = (async (input: unknown, init?: { body?: string }) => {
    const url = String(input);
    if (url.includes("openchain.xyz")) {
      const selector = new URL(url).searchParams.get("function") ?? "";
      return json({ ok: true, result: { function: { [selector]: [{ name: "settleFields(uint256)" }] } } });
    }
    if (url.includes("4byte.directory")) throw new Error("offline");
    const method = JSON.parse(String(init?.body ?? "{}")).method;
    return json({ jsonrpc: "2.0", id: 1, result: method === "eth_getTransactionByHash" ? txBody : receipt });
  }) as typeof globalThis.fetch;
  try {
    return await lookupTransaction(HASH, "ethereum");
  } finally {
    globalThis.fetch = original;
  }
}

test("a confirmed contract call returns its facts as fields", async () => {
  const r = await lookup(tx(), OK);
  assert.equal(r.verdict, "confirmed");
  assert.deepEqual(r.transaction, {
    status: "confirmed", from: FROM.toLowerCase(), to: TO, value_wei: "1500000000000000000", value: "1.5",
    symbol: "ETH", block_number: 25700000, block_hash: BLOCK_HASH, receipt_status: "success",
    method: "settleFields", method_selector: "0x1a2b3c4d", contract_created: null, token_transfers: 1,
    gas_used: "650475", fee_wei: (650475n * 0x7a86ba0n).toString(),
  });
});

test("a reverted call reports a failed receipt", async () => {
  const r = await lookup(tx({ input: `0x5e6f7a8b${"00".repeat(32)}` }), { ...OK, status: "0x0" });
  assert.equal(r.verdict, "reverted");
  assert.equal(r.transaction?.receipt_status, "failure");
});

test("a pending transaction has its parties and value but no block", async () => {
  const r = await lookup(tx({ blockNumber: null, blockHash: null }), null);
  assert.equal(r.verdict, "pending");
  assert.equal(r.transaction?.block_number, null);
  assert.equal(r.transaction?.value, "1.5");
});

test("wei converts to an exact decimal amount", () => {
  assert.equal(weiToDecimal(31337n), "0.000000000000031337");
  assert.equal(weiToDecimal(10n ** 18n), "1");
  assert.equal(weiToDecimal(0n), "0");
});
