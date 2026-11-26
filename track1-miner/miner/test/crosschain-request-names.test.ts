/**
 * CROSS_CHAIN_STATE_VERIFY's own request names, `reference` and `chains` (GET /engine/v1/intents/
 * CROSS_CHAIN_STATE_VERIFY_GENERAL, read 2026-11-26), are read beside the YAML's tx_hash / source_chain /
 * destination_chain. Offline: LayerZero Scan is stubbed to know no message.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/handler";

function get(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const req = { method: "GET", url, headers: { "user-agent": "telegraph-node/2" } } as unknown as IncomingMessage;
    const res = { writeHead() {}, setHeader() {}, end(b: string) { resolve(JSON.parse(b)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("cross-chain: reads the intent's reference and chains parameters", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 404 })) as unknown as typeof globalThis.fetch;
  try {
    const hash = "46b61721" + "ab".repeat(28);
    const found = await get(`/cross-chain?reference=0x${hash}&chains=arbitrum%2C%20base`);
    assert.equal(found.address, `0x${hash}`);
    assert.notEqual(found.error, "no_reference");
    const named = await get("/cross-chain?chains=optimism%20to%20ethereum");
    assert.equal(named.error, "no_reference");
    assert.deepEqual(named.chains, ["optimism", "ethereum"]);
  } finally {
    globalThis.fetch = real;
  }
});
