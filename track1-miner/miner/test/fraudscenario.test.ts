import { test } from "node:test";
import assert from "node:assert/strict";
import { assessScenario, negatedSpans } from "../src/fraudscenario";
import { assessFraud } from "../src/fraud";

// The node's own FRAUD_DETECTION cases are described scenarios, read from other
// miners' failure_reason fields (2026-09-15). All were refused as "no subject".
const BEC = "An accounts-payable employee receives an email that appears to be from the company's CEO, sent from 'ceo@acme-c0rp.com', urgently requesting a wire transfer of $48,000 to a new vendor account and asking them not to discuss it.";
const ATO = "A cardholder calls their bank from a new phone number to report a lost phone, verifies their identity with only their date of birth, and asks to change the email and phone number on the account.";

/**
 * The node truncates the question it shows, so these are prefixes, not whole
 * cases. Epochs 330–335, read 2026-09-16. Every one of them must reach an
 * answer: refusing a fraud question for "no subject" is what scored ~5e-14
 * while the leaders scored 1.0.
 */
const LEAKED_PREFIXES: Array<[string, string]> = [
  ["e330", "Evaluate the likelihood of fraud in the describe"],
  ["e331", "Insurance claim for a stolen vehicle."],
  ["e332", "A cardholder calls their bank from a new phone number to report a lost phone, verifies their identity with"],
  ["e334", "An accounts-payable employee receives an email that appears to be from the company's CEO, sent from '"],
  ["e335", "The credit account activity described below is f"],
];

/** Codex's two production probes, 2026-09-16. Both were answered "no subject" / wrong advice. */
const PROBE_CARD = "Assess this credit account activity: ten purchases in five minutes from two countries, followed by a request to increase the credit limit.";
const PROBE_BENIGN = "Assess this invoice: the invoice uses our verified vendor bank account, no bank details changed, and our finance team confirmed the payment by phone.";

test("a CEO-impersonation payment request is high-risk business email compromise, with its flags named", () => {
  const r = assessScenario(BEC)!;
  assert.equal(r.verdict, "high_risk");
  assert.match(r.reason, /^High fraud risk: this is a likely business email compromise \(CEO fraud\)\. Red flags: /);
  assert.ok(r.flags.length >= 4, JSON.stringify(r.flags));
});

test("a weakly verified request to change contact details is account takeover", () => {
  const r = assessScenario(ATO)!;
  assert.equal(r.verdict, "high_risk");
  assert.match(r.reason, /account takeover/);
});

test("a scenario with no stated red flag is not called fraud", () => {
  const r = assessScenario("Insurance claim for a stolen vehicle.")!;
  assert.equal(r.verdict, "insufficient_evidence");
  assert.equal(r.flags.length, 0);
  assert.match(r.reason, /^Unknown fraud risk: insufficient information\. An insurance claim for a stolen vehicle needs verification of the police report/);
});

test("a disputed charge for a stay that happened is chargeback fraud", () => {
  const r = assessScenario("A cardholder who booked and paid for a hotel in Paris stayed three nights, then disputed the charge as unauthorized two weeks later.")!;
  assert.equal(r.typology, "chargeback (friendly) fraud");
  assert.equal(r.verdict, "high_risk");
});

test("assessFraud answers scenarios without a network call, and still checks addresses and messages as before", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("must not fetch"); }) as typeof fetch;
  try {
    const r = await assessFraud(BEC);
    assert.equal(r.verdict, "high_risk");
    assert.equal(r.subject, "business email compromise (CEO fraud)");
    const m = await assessFraud("Does this email asking me to wire money to a new account urgently look like a scam?");
    assert.match(m.reason, /^This shows elevated risk indicators\./);
  } finally {
    globalThis.fetch = real;
  }
  assert.equal(assessScenario("What is the weather in Paris?"), null);
});

/* ------------------------- card / credit-account ------------------------- */

test("card-activity anomalies are graded, and the answer quotes the numbers the question gave", () => {
  const r = assessScenario(PROBE_CARD)!;
  assert.equal(r.verdict, "high_risk");
  assert.equal(r.typology, "card compromise (anomalous credit-account activity)");
  // The indicators are the question's own words, not a category name.
  assert.match(r.reason, /ten purchases in five minutes/);
  assert.match(r.reason, /two countries/);
  assert.match(r.reason, /credit-limit increase/);
  assert.match(r.reason, /pattern recognition on the description, not a transaction-graph or account-data assessment/);
});

test("a hours-long burst counts only when the count is large, because three purchases in two hours is a morning", () => {
  const slow = assessScenario("Assess this credit account activity: three purchases in two hours, all card-present in the home city.")!;
  assert.deepEqual(slow.flags, []);
  const burst = assessScenario("Assess this credit account activity: forty transactions in one hour, all card-not-present, on a dormant account.")!;
  assert.equal(burst.verdict, "high_risk");
  assert.match(burst.reason, /forty transactions in one hour/);
});

test("an ordinary card statement is low risk, and says which controls make it so", () => {
  const r = assessScenario("Assess this credit account activity: three card-present purchases in the cardholder's home city over two days, all chip and pin, consistent with the usual spending pattern, and the cardholder has confirmed them.")!;
  assert.equal(r.verdict, "low_risk");
  assert.deepEqual(r.flags, []);
  assert.match(r.reason, /^Low fraud risk: no red flag is stated/);
  assert.match(r.reason, /card-present/);
});

/* ---------------------- account-recovery social engineering ---------------------- */

test("a recovery call that refuses the callback and moves to money is high risk", () => {
  const r = assessScenario("A caller says their phone was lost and asks the bank to change the registered email and add a new payee urgently, and refuses a callback to the number on file.")!;
  assert.equal(r.verdict, "high_risk");
  assert.match(r.reason, /account takeover/);
  assert.match(r.reason, /will not accept the standard callback/);
  assert.match(r.reason, /presses for it to be done immediately/);
});

test("a recovery call that passed the real checks is low risk, not elevated", () => {
  const r = assessScenario("A cardholder calls their bank about a statement query; the bank called back on the number already on file, the caller passed the full security questions, and no contact details were changed.")!;
  assert.equal(r.verdict, "low_risk");
  assert.deepEqual(r.flags, []);
  assert.match(r.reason, /called back on the number already on file/);
});

/* ------------------------- benign context and negation ------------------------- */

test("a verified, unchanged, phone-confirmed invoice is low risk and gets no account-takeover advice", () => {
  const r = assessScenario(PROBE_BENIGN)!;
  assert.equal(r.verdict, "low_risk");
  assert.deepEqual(r.flags, []);
  assert.equal(r.typology, "vendor payment diversion (invoice fraud)");
  // Each affirmation the text makes is named back.
  assert.match(r.reason, /verified one already on file/);
  assert.match(r.reason, /no bank details were changed/);
  assert.match(r.reason, /confirmed out of band, by phone/);
  // The old answer volunteered SIM-swap advice for an invoice. It must not.
  assert.ok(!/SIM swap|account takeover|contact-detail changes/i.test(r.reason), r.reason);
});

test("a negated red flag is not a red flag, and a flag that reads the absence still is", () => {
  // "no unusual purchases" must not count as "unusual".
  const negated = assessScenario("Assess this credit account activity: no unusual purchases, the card was not used abroad, and the spending matches the usual pattern.")!;
  assert.deepEqual(negated.flags, []);

  // "no police report" is the flag itself: the pattern starts at the negation cue.
  const absence = assessScenario("Insurance claim for a stolen vehicle; there is no police report and all the keys were produced.")!;
  assert.deepEqual(absence.flags, [
    "the loss was not reported to police promptly",
    "there is no sign of forced entry or the keys are unaccounted for",
  ]);

  // A negation earlier in the sentence does not cancel a positive statement later in it.
  const later = assessScenario("The vendor invoice says no urgent deadline applies, but the accounts-payable email urgently asks to change the bank details.")!;
  assert.equal(later.verdict, "high_risk");
});

test("negated spans run from the cue to the end of the clause, not the sentence", () => {
  const s = "wire to a new vendor account and do not discuss it";
  const [span] = negatedSpans(s);
  assert.equal(s.slice(span![0], span![1]), "not discuss it");
});

/* --------------------------- the node's own inputs --------------------------- */

test("every leaked test input reaches an answer instead of 'no subject'", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("must not fetch"); }) as typeof fetch;
  try {
    for (const [epoch, text] of LEAKED_PREFIXES) {
      const r = await assessFraud(text);
      assert.notEqual(r.error, "no_subject", `${epoch}: ${r.reason}`);
      assert.match(r.reason, /fraud risk/i, `${epoch}: ${r.reason}`);
      assert.ok(r.confidence > 0, `${epoch} answered with zero confidence`);
    }
  } finally {
    globalThis.fetch = real;
  }
});

test("an 'evaluate the likelihood of fraud in the described ...' wrapper routes to what it describes", () => {
  const wrapped = assessScenario("Evaluate the likelihood of fraud in the described activity: ten purchases in five minutes from two countries, followed by a request to increase the credit limit.")!;
  assert.equal(wrapped.typology, "card compromise (anomalous credit-account activity)");
  assert.equal(wrapped.verdict, "high_risk");

  // The same wrapper with the description truncated away is unknown, not a refusal.
  const bare = assessScenario("Evaluate the likelihood of fraud in the describe")!;
  assert.equal(bare.verdict, "insufficient_evidence");
  assert.match(bare.reason, /^Unknown fraud risk: insufficient information\. The question asks for a fraud assessment/);

  // A question that names nothing at all keeps its honest refusal (fraud.test.ts pins it).
  assert.equal(assessScenario("is this fraudulent?"), null);
});

test("a truncated question is not read as its own subject", () => {
  const r = assessScenario("The credit account activity described below is f")!;
  assert.equal(r.verdict, "insufficient_evidence");
  assert.match(r.reason, /No indicator of card compromise .* is stated in the credit-account activity as described/);
  // The bug this pins: "A credit account activity described below is f needs …".
  assert.ok(!/described below is f needs/.test(r.reason), r.reason);
});

/* ------------------------------- regression ------------------------------- */

test("the address path is byte-identical: the scenario work did not touch it", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: unknown, init?: { body?: string }) => {
    const url = String(input);
    if (url.includes("sanctioned_addresses_ETH.txt")) {
      return new Response("0x7f367cc41522ce07553e823bf3be79a889debe1b\n");
    }
    if (url.includes("ethereum-rpc")) {
      const { method } = JSON.parse(String(init?.body ?? "{}")) as { method: string };
      const result = method === "eth_getCode" ? "0x"
        : method === "eth_getTransactionCount" ? "0x5"
          : "0x0de0b6b3a7640000";
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }));
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
  try {
    const r = await assessFraud("Is 0x0000000000000000000000000000000000000abc fraudulent?");
    assert.equal(r.verdict, "no_indicators");
    assert.equal(r.confidence, 0.5);
    assert.equal(
      r.reason,
      "No fraud indicators were found among the checks performed. Assessed on the following: " +
        "the address 0x0000000000000000000000000000000000000abc is not on the OFAC sanctioned digital-currency address list; " +
        "on chain it is an externally owned account with 5 outgoing transactions and a balance of 1.0000 ETH. " +
        "That is not the same as being safe: these checks detect known-bad addresses, flagged domains and common scam wording, " +
        "and fraud that is none of those would not appear here.",
    );
  } finally {
    globalThis.fetch = real;
  }
});
