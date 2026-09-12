import { test } from "node:test";
import assert from "node:assert/strict";
import {
  certificateOnly, classify, extractUrl, lookalikeMarkers, notAUrl, registrable, scanUrl, type Evidence,
} from "../src/urlscan";
import { parseHostfile, parseUrlList } from "../src/urlscan-net";

test("a URL is read from inside a routed question, trailing punctuation dropped", () => {
  assert.equal(extractUrl("Scan the URL http://amaz0n-login.ru for malware or phishing.")?.href, "http://amaz0n-login.ru/");
  assert.equal(extractUrl("Is this URL safe to click: https://example.com/offer?")?.href, "https://example.com/offer");
  // A bare host is read as https.
  assert.equal(extractUrl("Is www.powermapper.com a known scam?")?.hostname, "www.powermapper.com");
  // Non-matches: no host, a file name, an ENS name.
  assert.equal(extractUrl("website safety check"), null);
  assert.equal(extractUrl("open report.pdf now"), null);
  assert.equal(extractUrl("is vitalik.eth safe"), null);
});

test("an identifier that is not a URL is named, and plain words are not", () => {
  assert.match(notAUrl("Scan and judge this URL safe or unsafe: CVE-2021-44228") ?? "", /CVE-2021-44228 is a vulnerability identifier/);
  assert.match(notAUrl("is 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 safe") ?? "", /blockchain address/);
  assert.equal(notAUrl("is this real"), null);
});

test("the registrable domain handles country second-level suffixes", () => {
  assert.equal(registrable("blog.researchpal.co"), "researchpal.co");
  assert.equal(registrable("www.amazon.co.uk"), "amazon.co.uk");
  assert.equal(registrable("a.b.example.com"), "example.com");
});

test("lookalike markers fire on impersonation and stay silent on the brand's own domains", () => {
  const m = (u: string): string[] => lookalikeMarkers(new URL(u));
  assert.match(m("https://paypal-login-verify-account.xyz/signin")[0] ?? "", /name paypal/);
  assert.match(m("http://amaz0n-login.ru")[0] ?? "", /name amazon on amaz0n-login\.ru, which is not a known amazon domain/);
  assert.match(m("https://binance-security-update.co/verify")[0] ?? "", /name binance/);
  // A brand glued to a phishing bait word is still flagged.
  assert.match(m("https://securepaypal.com/")[0] ?? "", /name paypal/);
  assert.match(m("https://paypallogin.net/")[0] ?? "", /name paypal/);
  // Verifier repro 2026-09-13: domains the brands themselves operate are not impersonation.
  for (const own of [
    "https://googleusercontent.com/", "https://s3.amazonaws.com/bucket/file", "https://storage.googleapis.com/x",
    "https://www.paypalobjects.com/x", "https://www.googletagmanager.com/gtm.js", "https://www.facebookmail.com/",
  ]) assert.deepEqual(m(own), [], own);
  assert.match(m("http://185.12.4.9/login")[0] ?? "", /bare IP address/);
  assert.match(m("https://xn--pypal-4ve.com")[0] ?? "", /punycode/);
  // Non-matches: the brand's own domains, and words that merely contain a brand.
  assert.deepEqual(m("https://www.google.com/maps/place/Seattle"), []);
  assert.deepEqual(m("https://www.amazon.co.uk/"), []);
  assert.deepEqual(m("https://purchase.example.com/"), []);
  assert.deepEqual(m("https://pineapple.com/"), []);
});

test("the URLhaus list parsers keep entries and skip comments", () => {
  const hosts = parseHostfile("# URLhaus\n127.0.0.1\tbad.example\n\n127.0.0.1\tEVIL.test\nnot a line\n");
  assert.deepEqual([...hosts], ["bad.example", "evil.test"]);
  const urls = parseUrlList("# comment\nhttp://1.2.3.4:80/i\n\n");
  assert.deepEqual([...urls], ["http://1.2.3.4:80/i"]);
});

const base = (over: Partial<Evidence>): Evidence => ({
  url: new URL("https://example.com/"),
  security: { status: 0, ips: ["93.184.215.14"], censored: false },
  open: { status: 0, ips: ["93.184.215.14"], censored: false },
  urlhaus: { host: false, url: false },
  hops: [{ url: "https://example.com/", status: 200 }],
  tls: null,
  ...over,
});

test("a filtering-resolver block is unsafe, with the comparison that proves it", () => {
  const r = classify(base({
    url: new URL("http://malware.testcategory.com/download"),
    security: { status: 0, ips: ["0.0.0.0"], censored: true },
    open: { status: 0, ips: ["104.18.4.35"], censored: false },
  }));
  assert.equal(r.verdict, "unsafe");
  assert.match(r.reason, /^No, .* is unsafe/);
  assert.match(r.reason, /0\.0\.0\.0 while an unfiltered resolver returns 104\.18\.4\.35/);
});

test("a URLhaus listing is unsafe even when the resolver is clean", () => {
  const r = classify(base({ urlhaus: { host: true, url: false } }));
  assert.equal(r.verdict, "unsafe");
  assert.match(r.reason, /URLhaus lists example\.com/);
});

test("both threat sources down is an outage, never a verdict", () => {
  const r = classify(base({ security: "unavailable", urlhaus: "unavailable" }));
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "upstream_unavailable");
  assert.doesNotMatch(r.reason, /appears safe/);
});

test("one threat source down is never a safe verdict", () => {
  // Verifier repro 2026-09-13: security resolver down, URLhaus up, Cloudflare's own test domain.
  const r = classify(base({ url: new URL("http://malware.testcategory.com/"), security: "unavailable" }));
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "upstream_unavailable");
  assert.doesNotMatch(r.reason, /appears safe|^Yes/);
  const lists = classify(base({ urlhaus: "unavailable" }));
  assert.equal(lists.verdict, "unknown");
  assert.match(lists.reason, /URLhaus lists could not be read/);
  // A 0.0.0.0 filter answer with no unfiltered answer to compare is not a pass either.
  const bare = classify(base({ security: { status: 0, ips: ["0.0.0.0"], censored: false }, open: "unavailable" }));
  assert.equal(bare.verdict, "unknown");
  // Evidence that did arrive still counts: a listing is unsafe with the resolver down.
  assert.equal(classify(base({ security: "unavailable", urlhaus: { host: true, url: false } })).verdict, "unsafe");
});

test("a literal IP is not described as passing a resolver it was never sent to", () => {
  const r = classify(base({ url: new URL("http://185.12.4.9/login"), security: null, open: null }));
  assert.equal(r.verdict, "suspicious");
  assert.doesNotMatch(r.reason, /Cloudflare/);
  assert.match(r.reason, /not listed by URLhaus/);
});

test("a certificate-only question and a non-public host are refused without a network call", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("must not be called"); }) as unknown as typeof globalThis.fetch;
  try {
    const cert = await scanUrl("Is example.com's SSL certificate valid?");
    assert.equal(cert.error, "out_of_scope");
    assert.match(cert.reason, /SSL_VERIFICATION/);
    assert.equal(certificateOnly("Is https://expired.badssl.com safe to click?"), false);
    assert.equal(certificateOnly("Is this site with a TLS certificate safe?"), false);
    const local = await scanUrl("Is http://localhost:8080/admin safe?");
    assert.equal(local.error, "not_public_host");
  } finally {
    globalThis.fetch = original;
  }
});

test("a clean result says it is not proof, and names a redirect off the site", () => {
  const r = classify(base({ hops: [{ url: "https://example.com/", status: 301 }, { url: "https://other.org/x", status: 200 }] }));
  assert.equal(r.verdict, "safe");
  assert.match(r.reason, /^Yes, https:\/\/example\.com\/ appears safe/);
  assert.match(r.reason, /leaves example\.com for other\.org/);
  assert.match(r.reason, /No blocklist can prove a site safe/);
});

test("a host that resolves but never answers is not described as reached", () => {
  const r = classify(base({ hops: [{ url: "https://example.com/", status: null, note: "timeout" }] }));
  assert.equal(r.verdict, "safe");
  assert.match(r.reason, /did not answer a live request \(timeout\)/);
});

test("a name that does not resolve is unreachable, and a lookalike stays suspicious", () => {
  const nx = { status: 3, ips: [], censored: false };
  assert.equal(classify(base({ url: new URL("https://nothing-here.example/"), security: nx, open: nx })).verdict, "unreachable");
  const r = classify(base({ url: new URL("http://amaz0n-login.ru/"), security: nx, open: nx }));
  assert.equal(r.verdict, "suspicious");
  assert.match(r.reason, /does not currently resolve/);
});

test("no URL and a CVE id are refused by name without any network call", async () => {
  const none = await scanUrl("website safety check");
  assert.equal(none.error, "no_url");
  const cve = await scanUrl("Scan and judge this URL safe or unsafe, give a risk from 0 (safe) to 1 (unsafe): CVE-2021-44228");
  assert.equal(cve.error, "not_a_url");
  assert.match(cve.reason, /CVE-2021-44228 is a vulnerability identifier, not a URL/);
});

test("Cloudflare's malware test domain is judged unsafe (live)", async () => {
  const r = await scanUrl("Is http://malware.testcategory.com/download safe?");
  if (r.verdict === "unknown") return; // both threat sources down is not a test failure
  assert.equal(r.verdict, "unsafe");
  assert.match(r.reason, /Cloudflare/);
});

test("a well-known site is judged safe with a valid certificate (live)", async () => {
  const r = await scanUrl("Is this URL safe to click: https://github.com/torvalds/linux ?");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "safe");
  assert.match(r.reason, /valid TLS certificate/);
});
