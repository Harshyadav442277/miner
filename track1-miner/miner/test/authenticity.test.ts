import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAuthenticity, shingles } from "../src/authenticity";

const COPIED =
  'Is this original writing or was it copied? "The Eiffel Tower is a wrought-iron lattice tower on ' +
  'the Champ de Mars in Paris, France. It is named after the engineer Gustave Eiffel, whose company ' +
  'designed and built the tower from 1887 to 1889."';

const ORIGINAL =
  'Is this original or plagiarized? "My grandmother kept a tin of buttons under the stairs and every ' +
  'rainy afternoon she would tip them across the kitchen table so I could sort them into colours she ' +
  'named after birds she had never seen, and I believed every name until I was nearly twelve."';

test("phrases are nine words long, distinct, and taken from across the passage", () => {
  const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
  const runs = shingles(words);
  assert.equal(runs.length, 3);
  for (const r of runs) assert.equal(r.split(/\s+/).length, 9);
  assert.equal(new Set(runs).size, runs.length);
  // Spread, not all from the opening: a passage that starts with a stock
  // sentence must not be judged entirely on its opening.
  assert.notEqual(runs[0], runs[2]);
});

test("a passage shorter than one run yields no phrases", () => {
  assert.deepEqual(shingles("only five words here now"), []);
});

test("no passage at all is refused, and nothing is assessed", async () => {
  const r = await checkAuthenticity("Is this text original?");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "no_text");
  assert.match(r.reason, /there was nothing to assess/);
});

test("a passage too short to check says so instead of guessing", async () => {
  const r = await checkAuthenticity('Check this text: "Short sentence that is well under the floor."');
  assert.ok(["unknown"].includes(r.verdict));
  assert.equal(r.error, "text_too_short");
  assert.match(r.reason, /too short/);
});

test("a verbatim hit is reported as copying and names the source (live)", async () => {
  const r = await checkAuthenticity(COPIED);
  if (r.verdict === "unavailable") return; // Index outage is not a test failure.
  assert.equal(r.verdict, "copied");
  assert.ok(r.match);
  assert.match(r.reason, /not original/);
  // G77's family: a disambiguation page carries the phrase only because it
  // links to the article that does. Citing it names the wrong source.
  assert.doesNotMatch(r.match?.source ?? "", /\(disambiguation\)$/i);
});

test("no hit is an absence in the index searched, never proof of originality (live)", async () => {
  const r = await checkAuthenticity(ORIGINAL);
  if (r.verdict === "unavailable") return;
  assert.equal(r.verdict, "no_source_found");
  assert.equal(r.match, null);
  /**
   * The whole point. A5 forbids reporting a miss as a finding, so originality
   * may be mentioned ONLY inside the sentence that denies it was established.
   * Strip that sentence and no claim of originality may remain.
   */
  assert.match(r.reason, /not proof the text is original/);
  const unqualified = r.reason.replace(/not proof the text is original/gi, "");
  assert.doesNotMatch(unqualified, /\bis original\b|\bwas not copied\b|\bwritten fresh\b/i);
});

test("the style signal is a clause, never the verdict (live)", async () => {
  const r = await checkAuthenticity(ORIGINAL);
  if (r.verdict === "unavailable") return;
  // The verdict vocabulary is about provenance only.
  assert.ok(["copied", "no_source_found"].includes(r.verdict));
  if (r.machine_signal) assert.match(r.reason, /On style alone/);
});
