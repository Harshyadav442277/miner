import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanData, compare, queryName, readAnswer, recordType } from "../src/dns";
import { KNOWN_TOKENS } from "../src/known-tokens";
import { abiString, readable, units, verdictFor } from "../src/token-supply";

test("dns: the name and record type are read from the question", () => {
  assert.equal(queryName("", "What are the MX records for github.com?"), "github.com");
  assert.equal(queryName("https://Example.org/path", ""), "example.org");
  assert.equal(queryName("", "Does paypal.com publish a DMARC record?"), "_dmarc.paypal.com");
  assert.equal(queryName("", "Resolve 1.1.1.1 please"), null);
  assert.equal(recordType("", "What is the IPv6 address of google.com?"), "AAAA");
  assert.equal(recordType("", "Which mail servers does github.com use?"), "MX");
  assert.equal(recordType("", "Show the SPF record of google.com"), "TXT");
  assert.equal(recordType("cname", ""), "CNAME");
  assert.equal(recordType("", "Tell me about github.com"), null);
});

test("dns: TXT strings are unquoted and joined; names lose the trailing dot", () => {
  assert.equal(cleanData("TXT", '"v=spf1 include:_spf.google.com" "~all"'), "v=spf1 include:_spf.google.com~all");
  assert.equal(cleanData("MX", "0 GitHub-com.mail.protection.outlook.com."), "0 github-com.mail.protection.outlook.com");
});

test("dns: agreement, disagreement, NXDOMAIN and outage are told apart", () => {
  const ok = { Status: 0, AD: false, Answer: [{ type: 5, data: "github.com." }, { type: 1, TTL: 60, data: "140.82.112.3" }] };
  const both = compare("www.github.com", "A", [readAnswer("Cloudflare 1.1.1.1", "A", ok), readAnswer("Google Public DNS", "A", ok)]);
  assert.equal(both.verdict, "resolved");
  assert.equal(both.resolvers_agree, true);
  assert.deepEqual(both.records, ["140.82.112.3"]);
  assert.deepEqual(both.cname_chain, ["github.com"]);
  assert.equal(both.confidence, 1);

  const other = { Status: 0, Answer: [{ type: 1, TTL: 60, data: "140.82.112.4" }] };
  const split = compare("github.com", "A", [readAnswer("a", "A", ok), readAnswer("b", "A", other)]);
  assert.equal(split.verdict, "resolvers_disagree");
  assert.equal(split.resolvers_agree, false);

  const nx = compare("nope.example", "A", [readAnswer("a", "A", { Status: 3 }), readAnswer("b", "A", { Status: 3 })]);
  assert.equal(nx.verdict, "nxdomain");

  const down = compare("github.com", "A", [readAnswer("a", "A", null), readAnswer("b", "A", null)]);
  assert.equal(down.verdict, "unknown");
  assert.equal(down.error, "upstream_unavailable");

  const one = compare("github.com", "A", [readAnswer("a", "A", ok), readAnswer("b", "A", null)]);
  assert.equal(one.verdict, "resolved");
  assert.equal(one.resolvers_agree, null);
  assert.equal(one.confidence, 0.8);
});

test("token supply: units are exact and ABI strings decode in both encodings", () => {
  assert.equal(units(47_518_013_431_656_494n, 6), "47518013431.656494");
  assert.equal(units(1_000_000n, 6), "1");
  assert.equal(units(5n, 0), "5");
  assert.equal(readable("47518013431.656494"), "47,518,013,431.66");
  const dynamic = "0x" + "20".padStart(64, "0") + "4".padStart(64, "0") + Buffer.from("USDC").toString("hex").padEnd(64, "0");
  assert.equal(abiString(dynamic), "USDC");
  assert.equal(abiString("0x" + Buffer.from("MKR").toString("hex").padEnd(64, "0")), "MKR");
  assert.equal(abiString(null), null);
});

test("token supply: agreeing providers verify; a disagreement and a non-token are reported", () => {
  const read = (s: bigint | null) => ({ responded: true, totalSupply: s, decimals: 6n, symbol: "USDC", burned: [0n, 0n] });
  const ok = verdictFor("ethereum", "0xA0b8", 100, ["a", "b"], [read(5_000_000n), read(5_000_000n)], true);
  assert.equal(ok.verdict, "verified");
  assert.equal(ok.total_supply, "5");
  assert.equal(ok.providers_agree, true);
  assert.equal(ok.confidence, 1);
  assert.match(ok.reason, /not computed/);
  const split = verdictFor("ethereum", "0xA0b8", 100, ["a", "b"], [read(5n), read(6n)], true);
  assert.equal(split.verdict, "providers_disagree");
  const notToken = verdictFor("ethereum", "0xA0b8", 100, ["a", "b"],
    [{ responded: true, totalSupply: null, decimals: null, symbol: null, burned: [null, null] }, read(null)], true);
  assert.equal(notToken.verdict, "not_a_token");
  const down = { responded: false, totalSupply: null, decimals: null, symbol: null, burned: [null, null] };
  assert.equal(verdictFor("ethereum", "0xA0b8", 100, ["a", "b"], [down, down], true).verdict, "unknown");
  const unnamed = verdictFor("ethereum", "0xA0b8", 100, ["a", "b"], [read(5n), read(5n)], false);
  assert.match(unnamed.reason, /no chain was named/);
});

test("token supply: every listed contract is a well-formed address on a supported chain", () => {
  for (const [chain, tokens] of Object.entries(KNOWN_TOKENS)) {
    assert.ok(["ethereum", "base", "arbitrum", "optimism", "polygon"].includes(chain), chain);
    for (const [symbol, address] of Object.entries(tokens)) {
      assert.match(symbol, /^[A-Z]{3,5}$/);
      assert.match(address, /^0x[0-9a-fA-F]{40}$/, `${chain} ${symbol}`);
    }
  }
  assert.equal(KNOWN_TOKENS.polygon!.USDC, "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359");
});
