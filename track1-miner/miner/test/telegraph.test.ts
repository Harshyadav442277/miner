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
