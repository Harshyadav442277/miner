import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRoutescan, parseTxTimestamp, routescanActivity, routescanTxTimestamp } from "../src/routescan";

const ROUTER_CREATION = "0x4fc1580e7f66c58b7c26881cce0aab9c3509afe6e507527f30566fbf8039bcd0";

test("the two Routescan bodies parse to a count and a creation hash", () => {
  assert.deepEqual(
    parseRoutescan({ transactionsCount: 90283142 }, { status: "1", result: [{ txHash: ROUTER_CREATION }] }),
    { transactions: 90283142, creationTx: ROUTER_CREATION },
  );
  // An account: a count and no creation transaction.
  assert.deepEqual(parseRoutescan({ transactionsCount: 78319 }, { status: "1", result: [] }), { transactions: 78319, creationTx: null });
  // Non-matches: a malformed hash is not a hash, a string count is not a count, and nothing is null.
  assert.deepEqual(parseRoutescan({ transactionsCount: 5 }, { status: "1", result: [{ txHash: "0x1234" }] }), { transactions: 5, creationTx: null });
  assert.equal(parseRoutescan({ transactionsCount: "5" }, { status: "0", result: null }), null);
  assert.equal(parseRoutescan(null, null), null);
});

test("a transaction record's timestamp parses, and a missing or bad one does not", () => {
  assert.equal(parseTxTimestamp({ timestamp: "2020-06-05T20:17:21.000Z" }), "2020-06-05T20:17:21.000Z");
  assert.equal(parseTxTimestamp({ timestamp: "not a date" }), null);
  assert.equal(parseTxTimestamp({ timestamp: 1591388241 }), null);
  assert.equal(parseTxTimestamp(null), null);
});

test("the router's deployment is dated 5 June 2020 by Routescan's record (live)", async () => {
  const t = await routescanTxTimestamp(ROUTER_CREATION);
  if (!t) return; // Routescan unreachable is not a test failure
  assert.equal(t, "2020-06-05T20:17:21.000Z");
});

test("the Uniswap V2 router's creation transaction matches Blockscout's (live)", async () => {
  const r = await routescanActivity("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  if (!r) return; // Routescan unreachable is not a test failure
  assert.equal(r.creationTx, ROUTER_CREATION);
  assert.ok((r.transactions ?? 0) > 90_000_000, `count ${r.transactions} implausible`);
});
