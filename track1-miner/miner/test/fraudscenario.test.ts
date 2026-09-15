import { test } from "node:test";
import assert from "node:assert/strict";
import { assessScenario } from "../src/fraudscenario";
import { assessFraud } from "../src/fraud";

// The node's own FRAUD_DETECTION cases are described scenarios, read from other
// miners' failure_reason fields (2026-09-15). All were refused as "no subject".
const BEC = "An accounts-payable employee receives an email that appears to be from the company's CEO, sent from 'ceo@acme-c0rp.com', urgently requesting a wire transfer of $48,000 to a new vendor account and asking them not to discuss it.";
const ATO = "A cardholder calls their bank from a new phone number to report a lost phone, verifies their identity with only their date of birth, and asks to change the email and phone number on the account.";

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
