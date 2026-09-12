/**
 * FRAUD_DETECTION's paper questions, found by replaying the routed feed.
 *
 * Five of the twenty-nine routed questions for this intent ask whether a named
 * publication is retracted or the product of a paper mill. None carries a wallet
 * address, a transaction hash or a domain, so `assessFraud` refused every one of
 * them with "no subject supplied" — to a caller who had supplied a perfectly
 * good subject.
 *
 * Every question here is verbatim from `tools/routed-questions.json`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { asksPaperFraud, assessPaperFraud, quotedTitle } from "../src/paperfraud";
import { assessFraud } from "../src/fraud";

const BERT =
  "How likely is the paper “BERT: Pre-training of Deep Bidirectional Transformers for Language " +
  "Understanding” by Devlin, Jacob, Chang, Ming-Wei, Lee, Kenton et al. (2018) to be fraudulent? " +
  "Consider retractions, misconduct findings, paper mills and predatory publishers, and answer only " +
  "with what is documented.";
const JOURNAL =
  "Fraud risk assessment: is “Experimental Biology and Medicine” by Metropolis Team known to be " +
  "fraudulent, retracted, or the product of a paper mill? Give a risk level with reasons.";

test("routed refusal: a paper fraud question is recognised and its title extracted", () => {
  assert.equal(asksPaperFraud(BERT), true);
  assert.equal(asksPaperFraud(JOURNAL), true);
  assert.equal(
    quotedTitle(BERT),
    "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
  );
});

/**
 * The address, hash and domain questions are the intent's main business and
 * must keep their existing path. A quoted phrase inside one of those is not a
 * paper title.
 */
test("an address or domain fraud question is not a paper question", () => {
  assert.equal(asksPaperFraud("is 0xb3FB14FEcac09efbD0C74Fc07d50d7eD1eef2B53 fraudulent"), false);
  assert.equal(asksPaperFraud("Is paypal-secure-login.com a phishing domain?"), false);
  // A short quotation is a phrase, not a title, and searching on it matches
  // something confidently unrelated.
  assert.equal(asksPaperFraud("Is the message “act now” a scam?"), false);
});

/**
 * A three-word generic title cannot identify a work. Measured 2026-09-12: this
 * question matched "Proceedings of the Society for Experimental Biology and
 * Medicine" under one-directional coverage and "Advances in Experimental
 * Medicine and Biology" under overlap-over-union at 0.7 — two different
 * journals, neither of them the subject asked about.
 */
test("a generic title is not matched to a different work (live)", async () => {
  const r = await assessPaperFraud(JOURNAL);
  assert.equal(r.verdict, "unknown");
  assert.equal(r.matched, null);
  assert.match(r.reason, /not evidence of fraud and not evidence against it/);
});

test("a documented retraction is reported as high risk (live)", async () => {
  const r = await assessPaperFraud(
    "How likely is the paper “Ileal-lymphoid-nodular hyperplasia, non-specific colitis, and " +
    "pervasive developmental disorder in children” to be fraudulent? Consider retractions.",
  );
  // An index outage is not a finding either way.
  if (r.verdict === "unknown" && r.matched === null) return;
  assert.equal(r.retracted, true);
  assert.equal(r.verdict, "high_risk");
  assert.match(r.reason, /RETRACTED/);
});

/**
 * The rule this whole intent is built around: absence of evidence is not
 * evidence of safety. OpenAlex documents one of the four things the question
 * asks about, so an unretracted paper must not read as cleared of the other
 * three.
 */
test("an unretracted paper never claims a clean record overall (live)", async () => {
  const r = await assessPaperFraud(BERT);
  if (r.matched === null) return;
  assert.equal(r.retracted, false);
  assert.equal(r.verdict, "no_indicators");
  assert.match(r.reason, /neither confirmed nor ruled out/);
  assert.match(r.reason, /paper-mill membership/);
  assert.doesNotMatch(r.reason, /\bis not fraudulent\b/);
  assert.doesNotMatch(r.reason, /\bis legitimate\b/);
});

test("the routed question reaches an answer through assessFraud (live)", async () => {
  const r = await assessFraud(BERT);
  assert.notEqual(r.verdict, "unknown");
  assert.ok(r.subject, "a paper question must not be answered with no subject");
  assert.doesNotMatch(r.reason, /No wallet address, transaction hash, domain or message text/);
});
