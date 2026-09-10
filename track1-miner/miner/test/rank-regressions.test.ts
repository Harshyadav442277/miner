import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupTransaction, resolveChain, toCoin } from "../src/onchain";
import { lookupGame, parseDate } from "../src/gameresult";
import { dateWindow, findPapers } from "../src/papers";
import { lookupTvl, protocolTvl, resolveChain as tvlChain, poolLiquidity } from "../src/tvl";
import { lookupCve } from "../src/cve";
import { programAnswer } from "../src/cve-program";
import { handleRequest } from "../src/handler";
import type { IncomingMessage, ServerResponse } from "node:http";

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
    assert.match(r.reason, /20,000,000/);
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

test("rank regression: sports dates accept month names in both common orders", () => {
  assert.equal(parseDate("Arsenal vs Chelsea on March 16, 2025"), "20250316");
  assert.equal(parseDate("Arsenal vs Chelsea on 16 March 2025"), "20250316");
});

function sportsStub(event: Record<string, unknown>): typeof fetch {
  return (async (url) => {
    if (String(url).includes("scoreboard")) return json({ events: [], leagues: [{ name: "English Premier League" }] });
    if (String(url).includes("searchevents")) return json({ event: [event] });
    return json({ teams: [] });
  }) as typeof fetch;
}
const GAME = { strHomeTeam: "Arsenal", strAwayTeam: "Chelsea", intHomeScore: "1", intAwayScore: "0",
  strLeague: "English Premier League", strStatus: "FT", strTimestamp: "2025-03-16T13:30:00" };

test("rank regression: sports fallback cannot substitute a match from a different date", async () => {
  await withFetch(sportsStub(GAME), async () => {
    const r = await lookupGame("Arsenal vs Chelsea in the Premier League on 2025-03-17", new Date("2026-09-10T00:00:00Z"));
    assert.notEqual(r.verdict, "result");
    assert.equal(r.winner, null);
  });
});

test("rank regression: sports fallback verifies both teams returned by fuzzy search", async () => {
  await withFetch(sportsStub({ ...GAME, strHomeTeam: "Manchester City", strAwayTeam: "Liverpool" }), async () => {
    const r = await lookupGame("Arsenal vs Chelsea in the Premier League", new Date("2026-09-10T00:00:00Z"));
    assert.notEqual(r.verdict, "result");
    assert.equal(r.winner, null);
  });
});

test("rank regression: sports fallback accepts an ISO timestamp already ending in Z", async () => {
  await withFetch(sportsStub({ ...GAME, strTimestamp: GAME.strTimestamp + "Z" }), async () => {
    const r = await lookupGame("Arsenal vs Chelsea in the Premier League on 2025-03-16");
    assert.equal(r.verdict, "result");
    assert.equal(r.played_at, "2025-03-16T13:30:00.000Z");
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

test("rank regression: TVL uses the named L2 and its protocol subtotal", async () => {
  assert.equal(tvlChain("", "Aave TVL on Base mainnet"), "base");
  await withFetch((async () => json({ currentChainTvls: { Ethereum: 1000, Base: 42, "Base-borrowed": 99 } })) as typeof fetch, async () => {
    const r = await lookupTvl("protocol", "Aave", "base");
    assert.equal(r.usd, 42);
    assert.match(r.reason, /on base/);
    assert.doesNotMatch(r.reason, /across every chain/);
  });
});

test("rank regression: TVL rate limits remain unknown instead of not-found", async () => {
  await withFetch((async () => new Response("rate limited", { status: 429 })) as typeof fetch, async () => {
    assert.equal(await protocolTvl("Aave"), "unavailable");
    assert.equal(await poolLiquidity("0x" + "d".repeat(40), "base"), "unavailable");
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

test("rank regression: both CVE providers down remains an explicit availability failure", async () => {
  await withFetch((async () => new Response("offline", { status: 503 })) as typeof fetch, async () => {
    const r = await lookupCve("CVE-2024-3094");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "upstream_unavailable");
  });
});

function request(params: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise(resolve => {
    const req = { method: "GET", url: `/game-result?${new URLSearchParams(params)}` } as IncomingMessage;
    const res = { writeHead() {}, end(payload: string) { resolve(JSON.parse(payload)); } } as unknown as ServerResponse;
    handleRequest(req, res);
  });
}

test("rank regression: game route uses structured dates and never shares results between dates in prose", async () => {
  await withFetch(sportsStub(GAME), async () => {
    const first = await request({ query: "Arsenal vs Chelsea in the Premier League on 2025-03-16" });
    assert.equal(first.verdict, "result");
    const second = await request({ query: "Arsenal vs Chelsea in the Premier League on 2025-03-17" });
    assert.notEqual(second.verdict, "result");
    const explicit = await request({ query: "Who won in the Premier League?", team1: "Arsenal", team2: "Chelsea", date: "2025-03-17" });
    assert.notEqual(explicit.verdict, "result");
  });
});
