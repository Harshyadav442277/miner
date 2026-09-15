import { test } from "node:test";
import assert from "node:assert/strict";
import { currentFact, currentHolder, officePhrase, productSlugs, releaseProduct } from "../src/currentfacts";
import { webSearch } from "../src/websearch";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
async function mocked(stub: (url: URL) => Response | Promise<Response>, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => stub(new URL(String(input)))) as typeof fetch;
  try { await run(); } finally { globalThis.fetch = original; }
}

const PYTHON = [
  { cycle: "3.15", releaseDate: "2099-10-01", eol: "2104-10-31", latest: "3.15.0", latestReleaseDate: "2099-10-01" },
  { cycle: "3.14", releaseDate: "2025-10-07", eol: "2030-10-31", latest: "3.14.7", latestReleaseDate: "2026-08-05" },
  { cycle: "3.13", releaseDate: "2024-10-07", eol: "2029-10-31", latest: "3.13.15", latestReleaseDate: "2026-08-05" },
];
const claim = (id: string, rank: string, start?: string, end?: string) => ({
  rank, mainsnak: { snaktype: "value", datavalue: { value: { id } } },
  qualifiers: {
    ...(start ? { P580: [{ datavalue: { value: { time: `+${start}T00:00:00Z`, precision: 11 } } }] } : {}),
    ...(end ? { P582: [{ datavalue: { value: { time: `+${end}T00:00:00Z`, precision: 11 } } }] } : {}),
  },
});

/** A Wikidata stub: search results per query text, claims per entity+property, English labels per id. */
function wikidata(search: Record<string, unknown[]>, claimsBy: Record<string, unknown[]>, labels: Record<string, string | { mul: string }>) {
  return (url: URL): Response => {
    const p = url.searchParams;
    if (url.hostname !== "www.wikidata.org") throw new Error(`unexpected ${url.hostname}`);
    if (p.get("action") === "wbsearchentities") return json({ search: search[p.get("search") ?? ""] ?? [] });
    if (p.get("action") === "wbgetclaims") {
      const key = `${p.get("entity")}/${p.get("property")}`;
      return json({ claims: claimsBy[key] ? { [String(p.get("property"))]: claimsBy[key] } : {} });
    }
    const id = String(p.get("ids"));
    const l = labels[id];
    const shaped = typeof l === "string" ? { en: { language: "en", value: l } } : l ? { mul: { language: "mul", value: l.mul } } : {};
    return json({ entities: { [id]: { id, labels: shaped } } });
  };
}

test("release and office questions are recognised, and news questions are not", () => {
  assert.equal(releaseProduct("What is the latest stable Python release?"), "Python");
  assert.equal(releaseProduct("What is the latest version of Node.js?"), "Node.js");
  assert.equal(releaseProduct("What version of PostgreSQL is current?"), "PostgreSQL");
  assert.equal(releaseProduct("What's the latest news on the Fed's interest rate decision?"), null);
  assert.equal(releaseProduct("What's the latest on the release of the new album?"), null);
  assert.equal(releaseProduct("What is the latest version of Java?"), null);
  assert.deepEqual(productSlugs("Node.js"), ["nodejs", "node.js"]);
  assert.equal(officePhrase("Who is the current Secretary-General of the United Nations?"), "Secretary-General of the United Nations");
  assert.equal(officePhrase("Who is the CEO of Microsoft?"), "CEO of Microsoft");
  assert.equal(officePhrase("Who is President of France now?"), "President of France");
  assert.equal(officePhrase("Who was the first President of France?"), null);
  assert.equal(officePhrase("What is the current Fed interest rate?"), null);
  assert.equal(officePhrase("Who is Taylor Swift?"), null);
});

test("the latest Python release comes from endoflife.date, skipping an unreleased cycle", async () => {
  const seen: string[] = [];
  await mocked((url) => { seen.push(url.href); return json(PYTHON); }, async () => {
    const r = await currentFact("What is the latest stable Python release?");
    assert.equal(r, "The latest stable Python release is 3.14.7, released on 5 August 2026 (the 3.14 release cycle). Source: endoflife.date.");
  });
  assert.deepEqual(seen, ["https://endoflife.date/api/python.json"]);
});

test("a product endoflife.date does not cover is null, and so is an outage", async () => {
  await mocked(() => new Response("<html>Page not Found</html>", { status: 404 }), async () => {
    assert.equal(await currentFact("What is the latest version of Frobnicator?"), null);
  });
  await mocked(() => { throw new Error("down"); }, async () => {
    assert.equal(await currentFact("What is the latest stable Python release?"), null);
  });
});

test("the UN Secretary-General is read from the office's preferred holder claim", async () => {
  const stub = wikidata(
    { "Secretary-General of the United Nations": [{ id: "Q81066", label: "United Nations Secretary-General", match: { type: "alias", text: "Secretary-General of the United Nations" } }] },
    { "Q81066/P1308": [claim("Q1253", "normal", "2007-01-01", "2016-12-31"), claim("Q311440", "preferred", "2017-01-01", "2099-12-31")] },
    { Q311440: "António Guterres" },
  );
  await mocked(stub, async () => {
    const r = await currentFact("Who is the current Secretary-General of the United Nations?");
    assert.equal(r, "The current Secretary-General of the United Nations is António Guterres, whose term began in 2017 and runs to 31 December 2099. Source: Wikidata.");
  });
});

test("an office matched by alias is named by its label, and a mul-only name is read", async () => {
  const stub = wikidata(
    { "President of France": [{ id: "Q191954", label: "President of the French Republic", match: { type: "alias", text: "President of France" } }] },
    { "Q191954/P1308": [claim("Q3052772", "normal", "2017-05-14")] },
    { Q3052772: { mul: "Emmanuel Macron" } },
  );
  await mocked(stub, async () => {
    const r = await currentFact("Who is the current President of France?");
    assert.equal(r, "The current President of the French Republic is Emmanuel Macron, in office since 2017. Source: Wikidata.");
  });
});

test("without an office item, a head of state is read off the country only under the asked title", async () => {
  const office = (id: string) => [{ rank: "normal", mainsnak: { datavalue: { value: { id } } } }];
  const stub = wikidata(
    { Ruritania: [{ id: "Q1", label: "Ruritania", match: { type: "label", text: "Ruritania" } }] },
    { "Q1/P35": [claim("Q2", "preferred", "2020-03-01")], "Q1/P1906": office("Q3"), "Q1/P6": [claim("Q4", "preferred", "2021-01-01")], "Q1/P1313": office("Q5") },
    { Q2: "Ada Head", Q3: "President of Ruritania", Q4: "Bo Leader", Q5: "Chancellor of Ruritania" },
  );
  await mocked(stub, async () => {
    assert.equal(await currentFact("Who is the current President of Ruritania?"), "The current President of Ruritania is Ada Head, in office since 2020. Source: Wikidata.");
    assert.equal(await currentFact("Who is the current Prime Minister of Ruritania?"), null);
  });
});

test("a holder Wikidata records as dead is not reported as current", async () => {
  const stub = wikidata(
    { "Mayor of Somewhere": [{ id: "Q9", label: "Mayor of Somewhere", match: { type: "label", text: "Mayor of Somewhere" } }] },
    { "Q9/P1308": [claim("Q10", "preferred", "2001-01-01")], "Q10/P570": [claim("Q0", "normal")] },
    { Q10: "Late Mayor" },
  );
  await mocked(stub, async () => {
    assert.equal(await currentFact("Who is the current Mayor of Somewhere?"), null);
  });
});

test("a search result naming a different office is refused, not substituted", async () => {
  const stub = wikidata(
    { "President of the United States": [{ id: "Q11699", label: "Vice President of the United States", match: { type: "alias", text: "President of the United States Senate" } }] },
    { "Q11699/P1308": [claim("Q6279", "preferred", "2025-01-20")] },
    { Q6279: "Someone Else" },
  );
  await mocked(stub, async () => {
    assert.equal(await currentFact("Who is the current President of the United States?"), null);
  });
});

test("holders: ended, future and ambiguous claims are not current", () => {
  const now = Date.parse("2026-09-15");
  assert.equal(currentHolder([claim("Q1", "normal", "2010-01-01", "2020-01-01")], now), null);
  assert.equal(currentHolder([claim("Q1", "preferred", "2030-01-01")], now), null);
  assert.equal(currentHolder([claim("Q1", "normal", "2017-01-01"), claim("Q2", "normal")], now), null);
  assert.equal(currentHolder([claim("Q1", "normal", "2010-01-01", "2017-01-01"), claim("Q2", "normal", "2017-01-01")], now)?.id, "Q2");
});

test("webSearch returns the current fact without calling the news search", async () => {
  const seen: string[] = [];
  await mocked((url) => { seen.push(url.hostname); return json(PYTHON); }, async () => {
    const r = await webSearch("What is the latest stable Python release?");
    assert.equal(r.verdict, "answered");
    assert.equal(r.confidence, 0.9);
    assert.deepEqual(r.articles, []);
    assert.equal(r.background, null);
    assert.match(r.reason, /^The latest stable Python release is 3\.14\.7/);
  });
  assert.deepEqual(seen, ["endoflife.date"]);
});

test("the latest Python release (live)", async () => {
  const r = await currentFact("What is the latest stable Python release?");
  assert.match(r ?? "", /^The latest stable Python release is 3\.\d+\.\d+/);
});

test("the UN Secretary-General (live)", async () => {
  const r = await currentFact("Who is the current Secretary-General of the United Nations?");
  assert.match(r ?? "", /^The current Secretary-General of the United Nations is \S/);
});
