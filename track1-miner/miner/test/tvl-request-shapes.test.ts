/**
 * TVL_LOOKUP request shapes — the node's own question template, and the `chain`
 * parameter that turned a working answer into an outage.
 *
 * TWO DEFECTS, both verified against https://miner-wine.vercel.app on
 * 2026-09-19 with the subject epochs 342 and 343 leaked (`tvlwire-oracle` was
 * answered `404 {"detail":"protocol not found: Aave V3"}` in both, so the node
 * asked about Aave V3 and sent it as `protocol`).
 *
 * 1. `query=What is the total value locked (TVL) in USD for Aave V3?` alone was
 *    refused: "No protocol, chain or token contract was identified in this
 *    request". The manifest promises the subject is read from the question, and
 *    three of the recorded TVL_LOOKUP questions are exactly this template — the
 *    parenthetical and the "in USD" clause sit between the TVL phrase and the
 *    preposition every subject pattern needs.
 *
 * 2. `protocol=Aave V3` answered $17.97bn; `protocol=Aave V3&chain=ethereum`
 *    answered "DefiLlama did not respond", in the same minute. The per-chain
 *    read is `/protocol/{slug}`, which is 29 MB and takes 47 s against a 4 s
 *    budget, so the parameter was not intolerant occasionally — it was fatal
 *    every time.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupTvl, protocolSubject, protocolTvl } from "../src/tvl";

async function withFetch(stub: typeof fetch, run: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try { await run(); } finally { globalThis.fetch = original; }
}

/** DefiLlama with the global figure up and the per-chain record timing out. */
const chainReadTimesOut: typeof fetch = (async (url: string | URL | Request) => {
  const href = String(url);
  if (href.includes("/protocol/")) throw new Error("The operation was aborted due to timeout");
  if (href.includes("/tvl/aave-v3")) return new Response("17974425830");
  return new Response("", { status: 400 });
}) as typeof fetch;

test("the node's own question template names its subject", () => {
  assert.equal(protocolSubject("What is the total value locked (TVL) in USD for Aave V3?"), "Aave V3");
  assert.equal(protocolSubject("What is the total value locked (TVL) in USD for protocol/token Aave V3?"), "Aave V3");
  assert.equal(protocolSubject("What is the total value locked (TVL) in USD for Uniswap?"), "Uniswap");
  // The plain shapes that already worked keep working.
  assert.equal(protocolSubject("what is the TVL of Aave?"), "Aave");
  assert.equal(protocolSubject("What is Curve's TVL?"), "Curve");
  assert.equal(protocolSubject("What is the total value locked in usdc?"), "usdc");
});

test("a question with no protocol in it is still refused rather than given one", () => {
  for (const q of ["protocol total value locked", "TVL check for this smart contract", "total value locked in protocol"]) {
    assert.equal(protocolSubject(q), "", `${q} produced a subject`);
  }
});

test("a chain the per-chain read cannot answer falls back to the all-chain total", async () => {
  await withFetch(chainReadTimesOut, async () => {
    const r = await protocolTvl("Aave V3", "ethereum");
    assert.notEqual(r, "unavailable");
    assert.notEqual(r, null);
    assert.equal((r as { usd: number }).usd, 17_974_425_830);
    assert.equal((r as { chainScoped: boolean }).chainScoped, false);
  });
});

test("the fallback total is reported as the all-chain total, never as the chain's", async () => {
  await withFetch(chainReadTimesOut, async () => {
    const r = await lookupTvl("protocol", "Aave V3", "ethereum");
    assert.equal(r.verdict, "found");
    assert.match(r.reason, /aggregated across every chain it is deployed on/);
    assert.doesNotMatch(r.reason, /on ethereum/);
    assert.equal(r.chain, null);
  });
});

test("a per-chain figure that does arrive is still reported as that chain's", async () => {
  const chainReadWorks: typeof fetch = (async (url: string | URL | Request) =>
    String(url).includes("/protocol/aave-v3")
      ? new Response(JSON.stringify({ currentChainTvls: { Ethereum: 8_000_000_000 } }))
      : new Response("", { status: 400 })) as typeof fetch;
  await withFetch(chainReadWorks, async () => {
    const r = await lookupTvl("protocol", "Aave V3", "ethereum");
    assert.equal(r.verdict, "found");
    assert.equal(r.usd, 8_000_000_000);
    assert.match(r.reason, /on ethereum/);
  });
});

test("a real outage on both reads is still an outage, not a fabricated total", async () => {
  const everythingDown: typeof fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
  await withFetch(everythingDown, async () => {
    assert.equal(await protocolTvl("Aave V3", "ethereum"), "unavailable");
  });
});
