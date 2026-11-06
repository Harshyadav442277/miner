import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanData, compare, queryName, readAnswer, recordType } from "../src/dns";
import { KNOWN_TOKENS } from "../src/known-tokens";
import { abiString, readable, units, verdictFor } from "../src/token-supply";
import { bodyOf, extractKeywords, verbLike, wanted, yake } from "../src/keywords";
import { criticality, cveIds, priority, rank, recordFacts, type Facts } from "../src/vulntriage";

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

test("keywords: the body and the count are read from the question", () => {
  assert.equal(bodyOf("", "Extract the keywords from this: Solar panels convert sunlight into electricity."), "Solar panels convert sunlight into electricity.");
  assert.equal(bodyOf("given text", "ignored"), "given text");
  assert.equal(wanted("", "List the top 5 keywords"), 5);
  assert.equal(wanted("", "Give me 3 keyphrases"), 3);
  assert.equal(wanted("99", ""), 30);
  assert.equal(wanted("", "keywords please"), 10);
});

test("keywords: YAKE ranks the repeated topical phrase first and is deterministic", () => {
  const text = "Ethereum validators stake ETH to secure the network. Validators that go offline lose part of their stake. " +
    "Staking rewards are paid to validators every epoch. The Ethereum network moved to proof of stake in 2022.";
  const a = yake(text, 5);
  assert.deepEqual(a, yake(text, 5));
  assert.ok(a.length === 5);
  assert.ok(a.slice(0, 3).some((k) => /validators|ethereum/.test(k.keyword)), JSON.stringify(a));
  assert.ok(!a.some((k) => /^(?:the|to|of)\b|\b(?:the|to|of)$/.test(k.keyword)));
  assert.equal(extractKeywords("keywords:").verdict, "insufficient_input");
  const ecb = yake("The European Central Bank kept rates unchanged on Thursday, saying inflation is near target. " +
    "ECB President Christine Lagarde said inflation is falling.", 10);
  assert.ok(!ecb.some((k) => k.keyword === "thursday saying" || k.keyword.startsWith("thursday saying")), JSON.stringify(ecb));
});

const fact = (over: Partial<Facts>): Facts => ({ cve_id: "CVE-2024-0001", cvss_score: null, cvss_version: null, severity: null,
  scored_by: null, epss: null, epss_percentile: null, kev: false, kev_date_added: null, known_ransomware_use: null,
  exploitation: null, automatable: null, summary: null, found: true, ...over });

test("triage: ids and asset criticality are read from the question", () => {
  assert.deepEqual(cveIds("Rank cve-2024-3094, CVE-2023-4863 and CVE-2024-3094"), ["CVE-2024-3094", "CVE-2023-4863"]);
  assert.equal(criticality("", "on an internet-facing payments service"), "high");
  assert.equal(criticality("", "on our staging box"), "low");
  assert.equal(criticality("", "rank these"), "unspecified");
  assert.equal(criticality("critical", ""), "high");
});

test("triage: exploited first, then probability, then severity; asset shifts but never into act_now", () => {
  assert.equal(priority(fact({ kev: true }), "low").priority, "act_now");
  assert.equal(priority(fact({ exploitation: "active" }), "unspecified").priority, "act_now");
  assert.equal(priority(fact({ epss: 0.5 }), "high").priority, "high");
  assert.equal(priority(fact({ cvss_score: 9.8 }), "unspecified").priority, "medium");
  assert.equal(priority(fact({ cvss_score: 9.8 }), "high").priority, "high");
  assert.equal(priority(fact({ cvss_score: 9.8 }), "low").priority, "low");
  assert.equal(priority(fact({ cvss_score: 4 }), "unspecified").priority, "low");
  assert.equal(priority(fact({ found: false }), "high").priority, "unknown");
  const ranked = rank([
    fact({ cve_id: "CVE-A", cvss_score: 9.8 }),
    fact({ cve_id: "CVE-B", kev: true, cvss_score: 5 }),
    fact({ cve_id: "CVE-C", found: false }),
    fact({ cve_id: "CVE-D", epss: 0.3, cvss_score: 6 }),
  ], "unspecified");
  assert.deepEqual(ranked.map((r) => r.cve_id), ["CVE-B", "CVE-D", "CVE-A", "CVE-C"]);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3, 4]);
});

test("triage: a ranked answer's lead sentence carries the ranking, not a bare list number", async () => {
  const { leadSentence } = await import("../src/envelope");
  const reason = "Fix first: CVE-2021-44228 (act now: on CISA's Known Exploited Vulnerabilities list since 2021-12-10), then CVE-2024-3094 (high: EPSS gives a 90.9% chance of exploitation in the next 30 days). The asset was read as critical.";
  assert.match(leadSentence(reason), /CVE-2024-3094/);
});

test("triage: a CVE record's CNA score is preferred, CISA-ADP fills the gap, SSVC and KEV are read", () => {
  const rec = {
    cveMetadata: { cveId: "CVE-2023-4863", state: "PUBLISHED", assignerShortName: "Chrome" },
    containers: {
      cna: { descriptions: [{ lang: "en", value: "Heap buffer overflow in libwebp." }], metrics: [] },
      adp: [{ providerMetadata: { shortName: "CISA-ADP" }, metrics: [
        { cvssV3_1: { baseScore: 8.8, baseSeverity: "HIGH", version: "3.1" } },
        { other: { type: "ssvc", content: { options: [{ Exploitation: "active" }, { Automatable: "no" }] } } },
        { other: { type: "kev", content: { dateAdded: "2023-09-13" } } },
      ] }],
    },
  };
  const f = recordFacts("CVE-2023-4863", rec);
  assert.equal(f.cvss_score, 8.8);
  assert.equal(f.scored_by, "CISA-ADP");
  assert.equal(f.exploitation, "active");
  assert.equal(f.automatable, false);
  assert.equal(f.kev, true);
  assert.equal(f.kev_date_added, "2023-09-13");
  assert.equal(recordFacts("CVE-2023-4863", null).found, false);
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

test("keyphrases do not run through a verb (G214, audit 2026-11-06)", () => {
  const k = yake("The Federal Reserve held interest rates steady while inflation cooled and unemployment edged higher in October.", 5).map((x) => x.keyword);
  assert.ok(k.includes("federal reserve"), k.join(" | "));
  assert.ok(!k.some((p) => /\b(held|cooled|edged)\b/.test(p)), k.join(" | "));
  assert.equal(verbLike("held"), true);
  assert.equal(verbLike("speed"), false);
  assert.equal(verbLike("supply"), false);
});
