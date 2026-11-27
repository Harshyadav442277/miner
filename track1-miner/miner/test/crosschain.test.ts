import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asksProof, crossChainFields, decodePacketDelivered, decodePacketSent, namedChains, references, refShape, verifyCrossChain,
} from "../src/crosschain";

/**
 * Real endpoint logs, copied from the receipts of one Stargate message on
 * 2026-09-12: PacketSent in Arbitrum tx 0x46b61721… and PacketDelivered in Base
 * tx 0x71585f25…. Decoding them is the verification, so they are fixtures, not
 * shapes invented to fit the decoder.
 */
const SENT = "0x00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000120000000000000000000000000975bcd720be66659e3eb3c0e4f1866a3020e493a000000000000000000000000000000000000000000000000000000000000009c0100000000000945340000759e00000000000000000000000019cfce47ed54a88614648dc3f19a5980097007dd000075e80000000000000000000000005634c4a5fed09819e3c46d86a965dd9447d86e47a2017ce31ee24b107ad0ad26b0928e1e43424035c68658ebf7f4518f305e390b01000d000000000000000000000000c01fd62500f4488057a23c0c1b6760821ef5d5470000000000000c12000000000000000000000000000000000000000000000000000000000000000000000016000301001101000000000000000000000000000249f000000000000000000000";
const DELIVERED = "0x000000000000000000000000000000000000000000000000000000000000759e00000000000000000000000019cfce47ed54a88614648dc3f19a5980097007dd00000000000000000000000000000000000000000000000000000000000945340000000000000000000000005634c4a5fed09819e3c46d86a965dd9447d86e47";
const SRC_TX = "0x46b617219a83f81f264e9e3f6ff6714e974701a207059989346fd092e4c81a22";
const GUID = "0xa2017ce31ee24b107ad0ad26b0928e1e43424035c68658ebf7f4518f305e390b";

test("PacketSent's encoded packet decodes to the message Scan reported", () => {
  const p = decodePacketSent(SENT);
  assert.deepEqual(p, {
    nonce: 607540, srcEid: 30110, sender: "0x19cfce47ed54a88614648dc3f19a5980097007dd",
    dstEid: 30184, receiver: "0x5634c4a5fed09819e3c46d86a965dd9447d86e47", guid: GUID,
  });
  assert.equal(decodePacketSent("0x1234"), null);
});

test("PacketDelivered decodes to the same pathway and nonce", () => {
  assert.deepEqual(decodePacketDelivered(DELIVERED), {
    srcEid: 30110, sender: "0x19cfce47ed54a88614648dc3f19a5980097007dd", nonce: 607540,
    receiver: "0x5634c4a5fed09819e3c46d86a965dd9447d86e47",
  });
  assert.equal(decodePacketDelivered("0x"), null);
});

test("chains are read in order of mention, and only as whole words", () => {
  assert.deepEqual(namedChains("the LayerZero message from arbitrum executed on base"), ["arbitrum", "base"]);
  assert.deepEqual(namedChains("a database of ethereal things"), []);
});

test("32-byte references are collected, a 20-byte address is not", () => {
  assert.deepEqual(references(`tx ${SRC_TX} and 0x19cfce47ed54a88614648dc3f19a5980097007dd`), [SRC_TX]);
  assert.deepEqual(references("nonce 4412 from arbitrum"), []);
  // Without its 0x, or in capitals, a hash is the same reference (GAPS G369: tx_hash answered no_reference).
  assert.deepEqual(references(SRC_TX.slice(2)), [SRC_TX]);
  assert.deepEqual(references(`tx ${SRC_TX.slice(2).toUpperCase()} on arbitrum`), [SRC_TX]);
  assert.deepEqual(references(`${SRC_TX} ${SRC_TX.slice(2)}`), [SRC_TX], "one reference, once");
  assert.deepEqual(references(`${SRC_TX}ab`), [], "66 hex digits are not a 32-byte reference");
});

test("a proof, root or header request is recognised", () => {
  assert.equal(asksProof("and that the committed state root matches"), true);
  assert.equal(asksProof("verify this Merkle-Patricia proof"), true);
  assert.equal(asksProof("did the message execute on base"), false);
});

test("the canonical example has no message reference and is asked for one, with the proof limit named", async () => {
  const r = await verifyCrossChain(
    "Verify that the LayerZero message with nonce 4412 from arbitrum executed on base and that the committed state root matches.",
  );
  assert.equal(r.verdict, "insufficient_input");
  assert.equal(r.error, "no_reference");
  assert.match(r.reason, /does not verify state roots/);
});

test("conceptual questions and empty input verify nothing", async () => {
  for (const q of ["How do cross-chain bridges work?", "", "github.com"]) {
    const r = await verifyCrossChain(q);
    assert.equal(r.verdict, "insufficient_input");
  }
});

test("(live) a delivered Arbitrum to Base message verifies on both chains", async () => {
  const r = await verifyCrossChain(`Verify the LayerZero message in arbitrum tx ${SRC_TX} executed on base.`);
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "verified");
  assert.match(r.reason, /nonce 607540, arbitrum to base/);
  assert.match(r.reason, /0x71585f251e6b0a53b2826fb8dd05ed940bfbb7541713dcc97f1b22c4f8c6005b/);
});

test("(live) the same message asked about the wrong destination is a mismatch, not a verification", async () => {
  const r = await verifyCrossChain(`Did bridge message ${GUID} from arbitrum execute on ethereum?`);
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "mismatch");
  assert.match(r.reason, /sent from arbitrum to base/);
});

test("refShape: the reference's shape, never its value", () => {
  const h = "46b61721" + "a".repeat(56);
  assert.equal(refShape(""), "none");
  assert.equal(refShape(`0x${h}`), "0x64");
  assert.equal(refShape(h.toUpperCase()), "hex64");
  assert.equal(refShape("0x1234"), "0x4");
  assert.equal(refShape(`${h}88`), "hex66");
  assert.equal(refShape("5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"), "b58_88");
  const other = refShape("nonce 4412 from arbitrum");
  assert.equal(other, "other_24");
  assert.doesNotMatch(other, /4412|arbitrum/);
});

test("answers carry the intent's response fields; consistent is false unless verified, null only for an outage", async () => {
  const none = await verifyCrossChain("Verify the state root of arbitrum block 280000000 against ethereum");
  assert.equal(none.consistent, false, "nothing was shown to be consistent; status says it was not verified");
  assert.equal(none.status, "not_verified");
  assert.deepEqual(none.chains, ["arbitrum", "ethereum"]);
  assert.equal(none.address, null);
  assert.match(none.summary, /^Nothing verifiable was supplied/);

  const message = { guid: GUID, nonce: 607540, source_chain: "arbitrum", destination_chain: "base", sender: "0x19", receiver: "0x56",
    source_tx: SRC_TX, destination_tx: null, scan_status: "DELIVERED" };
  const verified = crossChainFields({ verdict: "verified", confidence: 0.95, reason: "Verified: it was delivered. Both receipts agree.", message }, "on ethereum");
  assert.deepEqual([verified.consistent, verified.status, verified.chains, verified.address, verified.summary],
    [true, "executed", ["arbitrum", "base"], GUID, "Verified: it was delivered."]);
  for (const [verdict, status] of [["not_delivered", "pending"], ["mismatch", "inconsistent"]] as const) {
    const r = crossChainFields({ verdict, confidence: 0.8, reason: "x." }, `tx ${SRC_TX} from base to arbitrum`);
    assert.deepEqual([r.consistent, r.status], [false, status], verdict);
  }
  // Not found on LayerZero is not shown completed: false, and status says not_found.
  const missing = crossChainFields({ verdict: "not_found", confidence: 0.6, reason: "x." }, `tx ${SRC_TX} from base to arbitrum`);
  assert.deepEqual([missing.consistent, missing.status, missing.address, missing.chains], [false, "not_found", SRC_TX, ["base", "arbitrum"]]);
  for (const verdict of ["unsupported", "insufficient_input"] as const) {
    assert.equal(crossChainFields({ verdict, confidence: 0, reason: "x." }, "").consistent, false, verdict);
  }
  assert.equal(crossChainFields({ verdict: "unknown", confidence: 0, reason: "x." }, "").consistent, null, "an outage is not known");
});
