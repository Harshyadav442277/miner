import { test } from "node:test";
import assert from "node:assert/strict";
import { screenSanctions } from "../src/sanctions";

// Its own file, so the list cache starts empty: node --test runs each file in
// a separate process.
test("a failed alias download is an unread OFAC list, not a clearance by primary name (2026-10-21)", async (t) => {
  const original = globalThis.fetch;
  // 1,200 entries so the SDN parse looks complete; Rosneft is listed only under
  // its long primary name, and "ROSNEFT" is an alias in the alt.csv that fails.
  const sdn = [
    `17022,"OPEN JOINT-STOCK COMPANY ROSNEFT OIL COMPANY",-0- ,"RUSSIA-EO14024",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `,
    ...Array.from({ length: 1_200 }, (_, i) => `${30_000 + i},"FILLER ENTITY N${i}",-0- ,"SDGT",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `),
  ].join("\n");
  const un = `<CONSOLIDATED_LIST dateGenerated="2026-10-20T00:00:00Z"><INDIVIDUALS>${
    Array.from({ length: 120 }, (_, i) => `<INDIVIDUAL><FIRST_NAME>FILLER</FIRST_NAME><SECOND_NAME>N${i}</SECOND_NAME></INDIVIDUAL>`).join("")
  }</INDIVIDUALS></CONSOLIDATED_LIST>`;
  globalThis.fetch = (async (url: string) =>
    String(url).endsWith("SDN.CSV") ? new Response(sdn, { status: 200 })
      : String(url).endsWith(".xml") ? new Response(un, { status: 200 })
      : new Response("", { status: 503 })) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });

  const r = await screenSanctions("Screen the company Rosneft against OFAC and UN sanctions lists");
  assert.notEqual(r.verdict, "no_match");
  assert.equal(r.verdict, "unknown");
  assert.match(r.reason, /OFAC SDN list could not be read/);
});
