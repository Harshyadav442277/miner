import { test } from "node:test";
import assert from "node:assert/strict";
import { screenSanctions } from "../src/sanctions";

// Its own file, so the list cache starts empty: node --test runs each file in
// a separate process.
test("an unread OFAC list never yields a clearance, for a name or a wallet", async (t) => {
  const original = globalThis.fetch;
  const un = `<CONSOLIDATED_LIST dateGenerated="2026-10-12T00:00:00Z"><INDIVIDUALS>${
    Array.from({ length: 120 }, (_, i) => `<INDIVIDUAL><FIRST_NAME>FILLER</FIRST_NAME><SECOND_NAME>N${i}</SECOND_NAME></INDIVIDUAL>`).join("")
  }</INDIVIDUALS></CONSOLIDATED_LIST>`;
  // The non-SDN list reads fine, so only the SDN files are missing.
  const cons = Array.from({ length: 150 }, (_, i) => `${200_000 + i},"NONSDN FILLER ${i}",-0- ,"X",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `).join("\n");
  globalThis.fetch = (async (url: string) =>
    String(url).endsWith(".xml") ? new Response(un, { status: 200 })
      : String(url).endsWith("CONS_PRIM.CSV") ? new Response(cons, { status: 200 })
      : String(url).endsWith("CONS_ALT.CSV") ? new Response(`200000,1,"aka","FILLER ALIAS",-0- `, { status: 200 })
      : new Response("", { status: 503 })) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });

  // Kim Jong Un is on OFAC's list and not the UN one.
  const name = await screenSanctions("Screen Kim Jong Un");
  assert.equal(name.verdict, "unknown");
  assert.equal(name.error, "list_unavailable");
  assert.match(name.reason, /^Not cleared: "Kim Jong Un"/);
  assert.match(name.reason, /OFAC SDN list could not be read/);
  const wallet = await screenSanctions("Is 0x1111111111111111111111111111111111111111 sanctioned?");
  assert.equal(wallet.verdict, "unknown");
});
