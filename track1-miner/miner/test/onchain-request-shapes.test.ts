/**
 * The request shapes `/tx-lookup` has to survive, driven through the handler.
 *
 * The node builds the HTTP request with an LLM, so the parameter NAMES it
 * writes are as variable as the values. `URLSearchParams.get` is case-sensitive,
 * so `txHash` — the exact spelling another miner's manifest uses in this intent
 * — reached the handler's "no hash was supplied" refusal even though the hash
 * was right there in the query string.
 *
 * Measured against production 2026-09-19 under champion reg642, against the two
 * miners that cross this intent (their answers agree at 0.9961, the bench gate):
 *
 *   /tx-lookup?hash=<h>            0.996209   the receipt
 *   /tx-lookup?tx_hash=<h>         0.996209   the receipt
 *   /tx-lookup?txHash=<h>          0.007247   "No transaction hash was supplied"
 *   /tx-lookup?transaction_hash=   0.007247   "No transaction hash was supplied"
 *   /tx-lookup?hash=<h>&chain=eth  0.005629   "not one this endpoint reads"
 *
 * These assert the subject reaches the lookup, not what the chain says: the
 * answer text for a real hash is covered by the live tests in onchain.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";

const HASH = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060";

/** Drive one query string through the handler and return the answer text. */
async function ask(query: string): Promise<string> {
  const req = { method: "GET", url: `/tx-lookup?${query}` } as IncomingMessage;
  let body = "";
  const res = {
    writeHead() {},
    end(chunk?: string) { body = String(chunk ?? ""); },
  } as unknown as ServerResponse;
  handleRequest(req, res);
  // The route answers asynchronously; poll rather than guess a delay.
  for (let i = 0; i < 400 && !body; i += 1) await new Promise((r) => setTimeout(r, 50));
  const parsed = JSON.parse(body) as { reason?: string; answer?: string };
  return parsed.reason ?? parsed.answer ?? body;
}

test("the hash is read whatever the parameter is called", async () => {
  for (const name of ["hash", "tx_hash", "txhash", "txHash",
    "transaction_hash", "transactionHash", "transaction", "tx"]) {
    const answer = await ask(`${name}=${HASH}`);
    assert.doesNotMatch(answer, /No transaction hash was supplied/,
      `the hash in ?${name}= was not read`);
    assert.ok(answer.includes(HASH), `the answer to ?${name}= does not name the hash`);
  }
});

test("a chain spelled as an alias is read rather than refused", async () => {
  for (const chain of ["eth", "ETH", "mainnet", "1", "l1", "ETH_MAINNET", "eip155:1"]) {
    const answer = await ask(`hash=${HASH}&chain=${encodeURIComponent(chain)}`);
    assert.doesNotMatch(answer, /not one this endpoint reads/, `chain=${chain} was refused`);
  }
});

test("a placeholder chain is read as no chain rather than as an unreadable one", async () => {
  for (const chain of ["unknown", "null", "none", "any", "auto", "evm"]) {
    const answer = await ask(`hash=${HASH}&chain=${chain}`);
    assert.doesNotMatch(answer, /not one this endpoint reads/, `chain=${chain} was refused`);
  }
});

/**
 * The counterexample. A chain we genuinely cannot read must still be refused
 * rather than answered from Ethereum's reading of the same hash — the same
 * 64-hex string exists on chains we do not speak, and a testnet is a different
 * chain from its mainnet.
 */
test("a chain this endpoint cannot read is still refused", async () => {
  for (const chain of ["solana", "bitcoin", "tron", "sui", "sepolia"]) {
    const answer = await ask(`hash=${HASH}&chain=${chain}`);
    assert.match(answer, /not one this endpoint reads/, `chain=${chain} was not refused`);
  }
});

/** Nothing supplied is still told apart from a hash we could not parse. */
test("an empty request and a malformed hash stay different answers", async () => {
  assert.match(await ask(""), /No transaction hash was supplied/);
  assert.match(await ask("hash=0xdeadbeef1234"), /is not a valid transaction hash/);
});
