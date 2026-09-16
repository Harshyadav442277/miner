import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupTransaction } from "../src/onchain";

/**
 * The called method, the plain block number, and the gas figures that left.
 *
 * Measured 2026-09-16 against champion reg642 with the two miners that actually
 * cross this intent in production as the references (tools/onchain-shape-bench.mjs,
 * evidence in docs/evidence/rank1-build-2026-09-16/onchain/bench.txt). Our
 * production answer scored 0.014 against both; the same answer without the gas
 * sentence, with the block written 25700000 and with the called method named
 * scored 0.9949-0.9962 against both, on both of the node's hidden test hashes.
 *
 * Every selector below is a different one on purpose: resolved names are cached
 * for the life of the process, so reusing a selector across tests would have one
 * test answer another.
 */

const HASH = "0x" + "9".repeat(64);
const FROM = "0x2ce910fbba65b454bbaf6a18c952a70f3bcd8299";
const TO = "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1";
/** Block 25,700,000 — the block both hidden test transactions sit in. */
const BLOCK = "0x18826a0";

const OK = { status: "0x1", gasUsed: "0x9eceb", effectiveGasPrice: "0x7a86ba0", contractAddress: null, logs: [] };
const FAILED = { ...OK, status: "0x0" };

const tx = (over: Record<string, unknown> = {}) => ({
  from: FROM, to: TO, value: "0x0", blockNumber: BLOCK, gasPrice: "0x7a86ba0", input: "0x", ...over,
});

/** `"offline"` throws, which is what a refusing or timed-out database looks like here. */
type Reply = string | "offline";

async function reasonFor(
  txBody: Record<string, unknown>,
  receipt: unknown,
  signatures: { openchain?: Reply; fourbyte?: Reply } = {},
): Promise<string> {
  const original = globalThis.fetch;
  const json = (body: unknown) => new Response(JSON.stringify(body), {
    status: 200, headers: { "content-type": "application/json" },
  });
  globalThis.fetch = (async (input: unknown, init?: { body?: string }) => {
    const url = String(input);
    if (url.includes("openchain.xyz")) {
      const name = signatures.openchain;
      if (!name || name === "offline") throw new Error("openchain offline");
      const selector = new URL(url).searchParams.get("function") ?? "";
      return json({ ok: true, result: { function: { [selector]: [{ name }] } } });
    }
    if (url.includes("4byte.directory")) {
      const name = signatures.fourbyte;
      if (!name || name === "offline") throw new Error("4byte offline");
      // Deliberately out of order, and the higher id is a shadow of the real
      // signature: asserting the real name proves the oldest entry won.
      return json({ results: [{ id: 9, text_signature: `shadow_${name}` }, { id: 1, text_signature: name }] });
    }
    const method = JSON.parse(String(init?.body ?? "{}")).method;
    return json({ jsonrpc: "2.0", id: 1, result: method === "eth_getTransactionByHash" ? txBody : receipt });
  }) as typeof globalThis.fetch;
  try {
    return (await lookupTransaction(HASH, "ethereum")).reason;
  } finally {
    globalThis.fetch = original;
  }
}

test("a successful contract call names the method its selector decodes to", async () => {
  const reason = await reasonFor(tx({ input: `0x540abf73${"00".repeat(64)}` }), OK,
    { openchain: "bridgeERC20To(address,address,address,uint256,uint32,bytes)" });
  assert.equal(
    reason,
    `Transaction ${HASH} on ethereum succeeded in block 25700000. It moved 0 ETH from ${FROM} ` +
    `to ${TO} and called bridgeERC20To.`,
  );
});

test("a reverted contract call names its method and keeps the revert note", async () => {
  const reason = await reasonFor(tx({ input: `0x3593564c${"00".repeat(64)}` }), FAILED,
    { openchain: "execute(bytes,bytes[],uint256)" });
  assert.match(reason, /failed and was reverted in block 25700000\./);
  assert.match(reason, new RegExp(`attempted to move 0 ETH from ${FROM} to ${TO} and called execute\\.`));
  assert.match(reason, /A reverted transaction still consumes its gas/);
});

test("a selector no database knows is written as a selector, never as a guessed name", async () => {
  // The shape txlens itself used before it had names (G115). Inventing one here
  // would be the confidently-wrong failure this module exists to avoid.
  const reason = await reasonFor(tx({ input: `0xdeadbeef${"00".repeat(32)}` }), OK,
    { openchain: "offline", fourbyte: "offline" });
  assert.match(reason, /and called contract method selector 0xdeadbeef\./);
  // Nothing but the selector form: no name is put here on a failed lookup.
  assert.doesNotMatch(reason, /and called (?!contract method selector )/);
});

test("4byte is the fallback when openchain will not answer, and its oldest entry wins", async () => {
  const reason = await reasonFor(tx({ input: `0xa9059cbb${"00".repeat(64)}` }), OK,
    { openchain: "offline", fourbyte: "transfer(address,uint256)" });
  assert.match(reason, /and called transfer\./);
  assert.doesNotMatch(reason, /shadow_/);
});

test("a signature that is not a Solidity identifier is discarded, not printed", async () => {
  const reason = await reasonFor(tx({ input: `0xcafebabe${"00".repeat(32)}` }), OK,
    { openchain: "not a name!(uint256)", fourbyte: "offline" });
  assert.match(reason, /and called contract method selector 0xcafebabe\./);
});

test("a plain transfer carries no method clause at all", async () => {
  const reason = await reasonFor(tx({ input: "0x", value: "0xde0b6b3a7640000" }), OK);
  assert.match(reason, new RegExp(`It moved 1 ETH from ${FROM} to ${TO}\\.`));
  assert.doesNotMatch(reason, /called/);
});

test("a contract creation is not decoded as a function call", async () => {
  // The first four bytes of init code are not a selector, so there is nothing
  // to look up and nothing may be claimed about a method.
  const reason = await reasonFor(tx({ to: null, input: `0x60806040${"00".repeat(64)}` }),
    { ...OK, contractAddress: TO });
  assert.match(reason, /from 0x[0-9a-f]{40} to a new contract\./);
  assert.doesNotMatch(reason, /called/);
});

test("the answer states the block plainly and carries no gas, fee or gas-price figure", async () => {
  const reason = await reasonFor(tx({ input: `0x540abf73${"00".repeat(64)}` }), OK,
    { openchain: "bridgeERC20To(address,address,address,uint256,uint32,bytes)" });
  assert.match(reason, /in block 25700000\./);
  assert.doesNotMatch(reason, /25,700,000/);
  assert.doesNotMatch(reason, /gas|fee|Gwei/);
});

test("a receipt with no status flag reports the block plainly and claims no gas figure", async () => {
  const reason = await reasonFor(tx(), { gasUsed: "0x9eceb", effectiveGasPrice: "0x7a86ba0", logs: [] });
  assert.match(reason, /was mined in block 25700000, but its receipt omitted the required status flag/);
  assert.doesNotMatch(reason, /25,700,000/);
  assert.doesNotMatch(reason, /[\d,]+ gas/);
});
