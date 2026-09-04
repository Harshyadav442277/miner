import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { answerTelegraph } from "../src/telegraph";

describe("answerTelegraph", () => {
  test("reads live protocol state rather than reciting it (live)", async () => {
    const r = await answerTelegraph("How many miners are registered on Telegraph?");
    assert.match(r.reason, /\d+ miners are currently registered|currently \d+ miners registered/);
    assert.match(r.source, /live/i);
    assert.ok(r.confidence >= 0.8);
  });

  test("answers a named intent with its current miner count (live)", async () => {
    const r = await answerTelegraph("How many miners serve SSL_VERIFICATION?");
    assert.match(r.reason, /SSL_VERIFICATION/);
    assert.match(r.reason, /\d+ registered\s+miners/);
  });

  test("answers a stable protocol fact from the verified record", async () => {
    const r = await answerTelegraph("How do I register a miner on Telegraph?");
    assert.equal(r.topic, "miner registration");
    assert.match(r.reason, /YAML manifest/);
    assert.match(r.reason, /SHA-256|hash/);
  });

  /**
   * The defect this locks out. Until 2026-09-04 the fact table covered seven
   * narrow topics, so "What is Telegraph Protocol?" — the plainest question in
   * the intent — answered `not_covered`, as did 20 of these 34. A refusal scores
   * ~1.3e-11 against champion 2104 where an answer crosses to 1.0, which is
   * exactly the 1.0/~0 alternation TELEGRAPH_KNOWLEDGE showed across epochs
   * 298-308. Every question here sits inside the canonical intent description.
   */
  test("answers the core questions of the intent rather than refusing them", async () => {
    const core = [
      "What is Telegraph Protocol?", "What is an intent in Telegraph?",
      "How are miners ranked on Telegraph?", "How long is a Telegraph epoch?",
      "How do miners earn money on Telegraph?", "What happens if a Telegraph miner goes offline?",
      "How does scoring work on Telegraph?", "What is the grace period for a new Telegraph miner?",
      "How do I register a miner on Telegraph?", "What is the Telegraph Explorer?",
      "What blockchain does Telegraph use?", "Can I update a Telegraph miner after registering it?",
      "What are the Telegraph hackathon tracks?", "What is Alexandria?",
      "What is the Miner YAML Registry?", "Explain me what is telegraph",
      "What can you do?", "Who are you?", "What is MACHINA?", "What is a signal hash?",
      "What is the Telegraph Daemon?", "How much does a Telegraph query cost?",
      "What is x402 and how does Telegraph use it?", "What is a WASM scoring module?",
      "How do I build an app on Telegraph?", "What is Telegraph's tokenomics?",
      "Where is Telegraph's documentation?", "What is a subnet in Telegraph?",
    ];
    const refused: string[] = [];
    for (const q of core) {
      const r = await answerTelegraph(q, 6000);
      if (r.verdict === "not_covered") refused.push(q);
    }
    assert.deepEqual(refused, [], `refused questions inside the intent: ${refused.join(" | ")}`);
  });

  /** Ordering: "registering" in an update question must not claim it for registration. */
  test("routes each question to the topic it is actually about", async () => {
    const cases: Array<[string, string]> = [
      ["Can I update a Telegraph miner after registering it?", "updating"],
      ["What happens if a Telegraph miner goes offline?", "spot checks"],
      ["How do I register a miner on Telegraph?", "miner registration"],
      ["How long is a Telegraph epoch?", "epochs"],
    ];
    for (const [q, topic] of cases) {
      assert.equal((await answerTelegraph(q, 6000)).topic, topic, q);
    }
  });

  test("declines what it cannot source, instead of inventing it", async () => {
    // The failure this project refuses everywhere else: a confident answer to
    // something we have no basis for.
    const r = await answerTelegraph("What is the airspeed velocity of an unladen swallow?");
    assert.equal(r.verdict, "not_covered");
    assert.match(r.reason, /docs\.telegraphprotocol\.com/);
  });

  test("an empty question is refused honestly", async () => {
    const r = await answerTelegraph("");
    assert.equal(r.error, "invalid_input");
  });
});
