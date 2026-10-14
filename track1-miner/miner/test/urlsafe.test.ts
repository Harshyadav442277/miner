import { test } from "node:test";
import assert from "node:assert/strict";
import { dnsHeader, dnsQuery } from "../src/quad9";
import { classify, type Evidence } from "../src/urlscan";
import { listing } from "../src/urlsafe";

test("the DNS wire query is an A question for each label, and the header gives rcode and answers", () => {
  const q = Buffer.from(dnsQuery("example.com")!, "base64url");
  assert.deepEqual([...q.subarray(12)], [7, ...Buffer.from("example"), 3, ...Buffer.from("com"), 0, 0, 1, 0, 1]);
  assert.equal(dnsQuery("bad..host"), null);
  assert.equal(dnsQuery(`${"a".repeat(64)}.com`), null);
  assert.deepEqual(dnsHeader(Buffer.from([0x12, 0x34, 0x81, 0x83, 0, 1, 0, 0, 0, 0, 0, 0])), { rcode: 3, answers: 0 });
  assert.equal(dnsHeader(Buffer.from([1, 2])), null);
});

const base = (over: Partial<Evidence>): Evidence => ({
  url: new URL("https://example.com/"),
  security: { status: 0, ips: ["93.184.215.14"], censored: false },
  open: { status: 0, ips: ["93.184.215.14"], censored: false },
  urlhaus: { host: false, url: false },
  hops: [{ url: "https://example.com/", status: 200 }],
  tls: null,
  quad9: "passed",
  ...over,
});

test("a Quad9 block alone makes a URL unsafe and names Quad9 as the source", () => {
  const r = classify(base({ url: new URL("http://198-macros.com/"), quad9: "blocked" }));
  assert.equal(r.verdict, "unsafe");
  assert.deepEqual(r.flagged_by, ["Quad9 threat-blocking DNS"]);
  assert.match(r.reason, /Quad9's threat-blocking resolver refuses to resolve 198-macros\.com/);
});

test("a listing names each source and what it said", () => {
  const listed = listing(classify(base({ url: new URL("http://198-macros.com/"), quad9: "blocked", urlhaus: { host: true, url: false } })));
  assert.equal(listed.listed, true);
  assert.match(listed.reason, /^Listed: 198-macros\.com is flagged as malicious by 2 of 3 threat sources checked: Quad9 threat-blocking DNS, URLhaus \(abuse\.ch\) \(the host\)\. Cloudflare security DNS did not flag it\./);
  const clean = listing(classify(base({})));
  assert.equal(clean.listed, false);
  assert.match(clean.reason, /^Not listed: example\.com is on none of the 3 threat sources that answered/);
  const partial = listing(classify(base({ quad9: "unavailable" })));
  assert.equal(partial.listed, null, "a source that did not answer leaves the listing open");
  assert.match(partial.reason, /Quad9 threat-blocking DNS did not give a clear answer/);
});
