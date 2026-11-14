import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupTransaction, resolveChain, toCoin } from "../src/onchain";
import { dateWindow, findPapers } from "../src/papers";
import { lookupCve } from "../src/cve";
import { programAnswer } from "../src/cve-program";
import { thinMarket } from "../src/cryptoprice";

const HASH = "0x" + "a".repeat(64);
const TX = { from: "0x" + "b".repeat(40), to: "0x" + "c".repeat(40),
  value: "0x1", blockNumber: "0x1312d00", gasPrice: "0x1" };
const RECEIPT = { status: "0x1", gasUsed: "0x5208", effectiveGasPrice: "0x1", logs: [] };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
async function withFetch(stub: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try { await run(); } finally { globalThis.fetch = original; }
}

test("rank regression: a named L2 outranks the words mainnet and ETH", () => {
  for (const [question, chain] of [["Transfer ETH on Base mainnet", "base"],
    ["Transfer ETH on Arbitrum", "arbitrum"], ["Check OP mainnet", "optimism"]]) {
    assert.equal(resolveChain("", question!).chain, chain);
  }
});

test("rank regression: transaction value preserves every wei", () => {
  assert.equal(toCoin(1234567890123456789n, "ETH"), "1.234567890123456789 ETH");
  assert.equal(toCoin(14097973540575n, "ETH"), "0.000014097973540575 ETH");
});

test("rank regression: a modern receipt without status cannot be called reverted", async () => {
  await withFetch((async (_url, init) => json({ result: JSON.parse(String(init?.body)).method === "eth_getTransactionByHash"
    ? TX : { gasUsed: "0x5208", effectiveGasPrice: "0x1", logs: [] } })) as typeof fetch, async () => {
    const r = await lookupTransaction(HASH, "base");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "receipt_status_unavailable");
  });
});

test("rank regression: reverted transfers are described as attempted rather than moved", async () => {
  await withFetch((async (_url, init) => json({ result: JSON.parse(String(init?.body)).method === "eth_getTransactionByHash"
    ? TX : { ...RECEIPT, status: "0x0" } })) as typeof fetch, async () => {
    const r = await lookupTransaction(HASH, "base");
    assert.equal(r.verdict, "reverted");
    assert.match(r.reason, /attempted to move/);
    assert.doesNotMatch(r.reason, /and moved/);
  });
});

test("rank regression: a throwing receipt request cannot erase a mined transaction", async () => {
  await withFetch((async (_url, init) => {
    if (JSON.parse(String(init?.body)).method === "eth_getTransactionReceipt") throw new Error("receipt offline");
    return json({ result: TX });
  }) as typeof fetch, async () => {
    const r = await lookupTransaction(HASH, "ethereum");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "receipt_unavailable");
    // Plain, like every other block number this module writes since 2026-09-16.
    assert.match(r.reason, /mined in block 20000000,/);
  });
});

test("rank regression: an HTTP 200 without a JSON-RPC result is an outage", async () => {
  await withFetch((async () => json({ message: "quota exceeded" })) as typeof fetch, async () => {
    const r = await lookupTransaction(HASH, "ethereum");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "rpc_unavailable");
  });
});

test("rank regression: a failed chain probe cannot support a global not-found claim", async () => {
  await withFetch((async (url) => {
    if (String(url).includes("base")) throw new Error("Base offline");
    return json({ result: null });
  }) as typeof fetch, async () => {
    const r = await lookupTransaction(HASH, "ethereum", null, false);
    assert.equal(r.verdict, "unknown");
    assert.match(r.reason, /base/i);
    assert.doesNotMatch(r.reason, /does not correspond to any transaction/);
  });
});

test("rank regression: an Ethereum outage does not prevent finding a Base transaction", async () => {
  await withFetch((async (url, init) => {
    if (/ethereum|eth\./.test(String(url))) throw new Error("Ethereum offline");
    const method = JSON.parse(String(init?.body)).method;
    return json({ result: String(url).includes("base") ? method === "eth_getTransactionByHash" ? TX : RECEIPT : null });
  }) as typeof fetch, async () => {
    const r = await lookupTransaction(HASH, "ethereum", null, false);
    assert.equal(r.verdict, "confirmed");
    assert.equal(r.chain, "base");
  });
});

test("rank regression: academic windows preserve explicit days", () => {
  assert.deepEqual(dateWindow("between January 15, 2025 and June 10, 2026"), { from: "2025-01-15", to: "2026-06-10" });
  assert.deepEqual(dateWindow("between 2025-01-15 and 2026-06-10"), { from: "2025-01-15", to: "2026-06-10" });
});

test("rank regression: an academic retry preserves the requested publication window", async () => {
  const urls: URL[] = [];
  await withFetch((async (url) => {
    urls.push(new URL(String(url)));
    return json({ results: [] });
  }) as typeof fetch, async () => {
    await findPapers("Find papers on quantum computing published in 2025", 3, 100);
    assert.ok(urls.length > 0);
    assert.ok(urls.every(url => url.searchParams.get("filter")?.includes("from_publication_date:2025-01-01")),
      "retry must not silently remove the date filter");
  });
});

const CVE = { cveMetadata: { cveId: "CVE-2024-3094", state: "PUBLISHED", assignerShortName: "redhat" }, containers: { cna: {
  descriptions: [{ lang: "en", value: "Malicious code was found in xz 5.6.0 and 5.6.1." }],
  metrics: [{ cvssV3_1: { version: "3.1", baseScore: 10, baseSeverity: "CRITICAL" } }],
  affected: [{ packageName: "xz", versions: [{ version: "5.6.0", status: "affected" }, { version: "5.6.1", status: "affected" },
    { version: "5.4.6", status: "unaffected" }] }],
} } };

test("rank regression: NVD rate limits fall back to the matching authoritative CVE record", async () => {
  await withFetch((async url => String(url).includes("nist.gov") ? new Response("rate limit", { status: 429 }) : json(CVE)) as typeof fetch, async () => {
    const r = await lookupCve("CVE-2024-3094");
    assert.equal(r.verdict, "critical");
    assert.match(r.reason, /5\.6\.0, 5\.6\.1/);
    assert.match(r.reason, /10\.0/);
    assert.match(r.reason, /CVE Program record from redhat/);
    assert.doesNotMatch(r.reason, /5\.4\.6/);
  });
  assert.equal(programAnswer("CVE-2021-44228", CVE), null, "a different record must not be substituted");
});

test("rank regression: the CVE fallback reads a score CISA's ADP container carries when the CNA gave none", () => {
  const r = programAnswer("CVE-2021-44228", {
    cveMetadata: { cveId: "CVE-2021-44228", state: "PUBLISHED", assignerShortName: "apache", datePublished: "2021-12-10T00:00:00.000Z" },
    containers: {
      cna: { descriptions: [{ lang: "en", value: "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP endpoints." }], metrics: [{ other: {} }] },
      adp: [{ providerMetadata: { shortName: "CVE" } }, { providerMetadata: { shortName: "CISA-ADP" }, metrics: [{ cvssV3_1: { version: "3.1", baseScore: 10, baseSeverity: "CRITICAL" } }] }],
    },
  });
  assert.equal(r?.verdict, "critical");
  assert.equal(r?.cvss_score, 10);
  assert.equal(r?.severity, "CRITICAL");
  assert.equal(r?.scored_by, "CISA-ADP");
  assert.match(r!.reason, /base score of 10\.0, assigned by CISA-ADP/);
});

test("rank regression: both CVE providers down remains an explicit availability failure", async () => {
  await withFetch((async () => new Response("offline", { status: 503 })) as typeof fetch, async () => {
    const r = await lookupCve("CVE-2024-3094");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "upstream_unavailable");
  });
});

test("rank regression: an NVD rate limit is answered from the NVD record's mirror, not the CNA's score", async () => {
  const record = { id: "CVE-2020-1472", vulnStatus: "Analyzed", published: "2020-08-17T19:15:15.117",
    descriptions: [{ lang: "en", value: "An elevation of privilege vulnerability exists in Netlogon." }],
    metrics: { cvssMetricV31: [{ source: "secure@microsoft.com", type: "Secondary", cvssData: { version: "3.1", baseScore: 5.5, baseSeverity: "MEDIUM" } },
      { source: "nvd@nist.gov", type: "Secondary", cvssData: { version: "3.1", baseScore: 10, baseSeverity: "CRITICAL" } }] } };
  const seen: string[] = [];
  await withFetch((async (input: unknown) => {
    const url = String(input);
    seen.push(url);
    if (url.includes("services.nvd.nist.gov")) return new Response("limited", { status: 429 });
    if (url.endsWith("/CVE-2020/CVE-2020-14xx/CVE-2020-1472.json")) return json(record);
    return new Response("unexpected", { status: 500 });
  }) as typeof fetch, async () => {
    const r = await lookupCve("CVE-2020-1472");
    assert.equal(r.cvss_score, 10);
    assert.equal(r.severity, "CRITICAL");
    assert.match(String(r.source), /National Vulnerability Database \(fkie-cad mirror/);
    assert.ok(!seen.some((u) => u.includes("cveawg.mitre.org")), "the CVE Program is not asked when the mirror answered");
  });
});

test("rank regression: a Bitstamp market with no volume or a wide book is not quoted", () => {
  assert.equal(thinMarket({ bid: 0.4441, ask: 4, volume: 0 }), true); // APT, 2026-11-14
  assert.equal(thinMarket({ bid: 7.15, ask: 9.4508, volume: 19747.733 }), true); // INJ: 32% wide
  assert.equal(thinMarket({ bid: 0, ask: 0, volume: 0 }), true); // TIA
  assert.equal(thinMarket({ bid: 65148.67, ask: 65148.68, volume: 1496.08 }), false);
  assert.equal(thinMarket({ bid: NaN, ask: NaN, volume: NaN }), false); // a ticker without a book is not judged
});

