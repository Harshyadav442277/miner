import { test } from "node:test";
import assert from "node:assert/strict";
import { accountKind, assessFraud, evmAddress, hostnames, scamMarkers } from "../src/fraud";

test("an EIP-7702 delegated account is not a contract", () => {
  /**
   * `eth_getCode` returning something non-empty no longer means "contract".
   * Under EIP-7702 an EOA carries a 23-byte designator `0xef0100 || address` and
   * remains key-controlled. vitalik.eth returns exactly that and was being
   * described as a contract, which is a false statement about who controls the
   * funds — the thing this intent is asked about.
   */
  assert.equal(accountKind("0x"), "account");
  assert.equal(accountKind(""), "account");
  assert.equal(accountKind("0xef01005a7fc11397e9a8ad41bf10bf13f22b0a63f96f6d"), "delegated account");
  assert.equal(accountKind("0x60806040523480156100"), "contract");
});

test("scam markers are specific things a legitimate message does not do", () => {
  assert.ok(scamMarkers("Send me your seed phrase to verify").length > 0);
  assert.ok(scamMarkers("our bank details have changed, please wire urgently").length > 0);
  assert.ok(scamMarkers("double your bitcoin in 24 hours").length > 0);
  // Ordinary business language must not trip it.
  assert.deepEqual(scamMarkers("Please find attached the invoice for last month."), []);
  assert.deepEqual(scamMarkers("What is the status of my order?"), []);
});

test("hostnames are read from links and bare domains, not from every dotted word", () => {
  assert.ok(hostnames("Is http://malware.testcategory.com/login a scam?").includes("malware.testcategory.com"));
  assert.ok(hostnames("go to secure-login.xyz now").includes("secure-login.xyz"));
  // A version number or a sentence is not a hostname.
  assert.deepEqual(hostnames("upgrade to version 2.1 today"), []);
});

test("an address is read case-insensitively and normalised", () => {
  assert.equal(
    evmAddress("from 0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045 please"),
    "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  );
});

test("a request with nothing to assess is refused", async () => {
  const r = await assessFraud("is this fraudulent?");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "no_subject");
});

test("a clean result is never reported as safe", async () => {
  /**
   * The failure mode that matters in this intent: a caller acts on the
   * sentence. "No indicators were found among the checks performed" and "this
   * is safe" are different claims, and only the first is supported by having
   * checked a sanctions list and a threat feed.
   */
  const r = await assessFraud("Is 0x0000000000000000000000000000000000000001 risky?");
  if (r.verdict === "unknown") return;
  if (r.verdict !== "no_indicators") return;
  assert.match(r.reason, /No fraud indicators were found among the checks performed/);
  assert.match(r.reason, /not the same as being safe/i);
  assert.ok(!/\bis safe\b|\bsafe to\b|\btrustworthy\b/i.test(r.reason.replace(/not the same as being safe/i, "")));
});

test("scam wording alone raises risk without any network call", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("should not be needed"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await assessFraud("They asked me to buy gift cards to settle the invoice.");
    assert.equal(r.verdict, "elevated_risk");
    assert.match(r.reason, /gift cards/);
  } finally {
    globalThis.fetch = original;
  }
});

/* --------------------------------- live ---------------------------------- */

test("a sanctioned address is high risk and says why (live)", async () => {
  // Taken from the OFAC list itself at run time, so the fixture cannot go stale.
  let addr: string | null = null;
  try {
    const body = await (await fetch(
      "https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt",
      { signal: AbortSignal.timeout(15_000) },
    )).text();
    addr = body.trim().split(/\r?\n/)[0] ?? null;
  } catch { /* list unavailable is not a test failure */ }
  if (!addr) return;

  const r = await assessFraud(`Is it safe to receive funds from ${addr}?`);
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "high_risk");
  assert.match(r.reason, /OFAC sanctioned/);
});

test("a domain a threat feed blocks is high risk (live)", async () => {
  const r = await assessFraud("Is http://malware.testcategory.com/login a scam?");
  if (r.verdict === "unknown") return;
  // If the feed could not be reached the check is skipped, not failed.
  if (/could not be checked/.test(r.reason)) return;
  assert.equal(r.verdict, "high_risk");
  assert.match(r.reason, /malware or phishing/);
});
