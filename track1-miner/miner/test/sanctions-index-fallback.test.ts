import { test } from "node:test";
import assert from "node:assert/strict";
import { screenSanctions } from "../src/sanctions";

// Its own file, so the list cache starts empty: node --test runs each file in a separate process.
test("an unreadable index falls back to the direct OFAC and UN downloads, naming the UK and EU lists as not screened", async (t) => {
  const original = globalThis.fetch;
  const sdn = [
    `9999,"BOUT, Viktor Anatolijevitch","individual","SDGT",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"DOB 13 Jan 1967."`,
    ...Array.from({ length: 1_100 }, (_, i) => `${100_000 + i},"FILLER ${i}",-0- ,"X",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `),
  ].join("\n");
  const cons = Array.from({ length: 150 }, (_, i) => `${200_000 + i},"NONSDN FILLER ${i}",-0- ,"X",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `).join("\n");
  const un = `<CONSOLIDATED_LIST dateGenerated="2026-11-07T00:00:00Z"><INDIVIDUALS>${
    Array.from({ length: 120 }, (_, i) => `<INDIVIDUAL><FIRST_NAME>FILLER</FIRST_NAME><SECOND_NAME>N${i}</SECOND_NAME></INDIVIDUAL>`).join("")
  }</INDIVIDUALS></CONSOLIDATED_LIST>`;
  const asked: string[] = [];
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    asked.push(u);
    const body = u.endsWith("sanctions-index.json") ? null
      : u.endsWith("CONS_PRIM.CSV") ? cons
      : u.endsWith("CONS_ALT.CSV") ? `200000,1,"aka","FILLER ALIAS",-0- `
      : u.endsWith("SDN.CSV") ? sdn
      : u.endsWith("ALT.CSV") ? `9999,1,"aka","BUT, Victor",-0- `
      : u.endsWith(".xml") ? un : null;
    return body === null ? new Response("not found", { status: 404 }) : new Response(body, { status: 200 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });

  const r = await screenSanctions("Is Viktor Bout sanctioned?");
  assert.equal(r.verdict, "match");
  assert.equal(asked[0], "https://raw.githubusercontent.com/Harshyadav442277/miner/sanctions-data/sanctions-index.json");
  assert.equal(asked.length, 6, "the index, then the five direct files");
  assert.deepEqual(r.lists_checked.map((e) => e.list), ["OFAC SDN", "OFAC Consolidated (non-SDN)", "UN Security Council Consolidated"]);
  assert.deepEqual(r.lists_not_checked, ["EU Financial Sanctions Consolidated List", "UK Sanctions List"]);
  assert.match(r.reason, /the EU and UK lists were not screened/);
  assert.equal(r.confidence, 0.95, "an optional list not screened is not an unread core list");
});
