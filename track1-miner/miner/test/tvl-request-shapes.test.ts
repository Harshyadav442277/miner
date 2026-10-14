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
 *    every time. Moot since 2026-10-14: protocol TVL is no longer served
 *    (GAPS G186), so only the subject reading below is still tested.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { protocolSubject } from "../src/tvl";

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

