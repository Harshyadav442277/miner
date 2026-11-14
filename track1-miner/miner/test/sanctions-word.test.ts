import { test } from "node:test";
import assert from "node:assert/strict";
import type { ListedParty, SanctionsLists } from "../src/sanctions-lists";
import { screenSanctions, wordHits, type Subject } from "../src/sanctions";
import { sanctionsIntentFields } from "../src/intent-fields";

// "Hezbollah" was cleared on 2026-11-08: its closest name, LEBANESE HEZBOLLAH (an OFAC alias of HIZBALLAH),
// scored 0.85, and a one-word name never reaches the 0.9 threshold against a longer listed name.

const party = (id: string, name: string, aliases: string[] = [], type: ListedParty["type"] = "entity", nationalities: string[] = []): ListedParty => ({
  list: "OFAC SDN", id, name, aliases, type, programs: ["SDGT"], dob_years: [], nationalities, listed_on: null, wallets: [],
  url: `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${id}`,
});
// Six banks, so "bank" and "lebanese" are common words; five carry "trading".
const common = Array.from({ length: 6 }, (_, i) => party(`b${i}`, `LEBANESE TRADING BANK ${i}`));
const lists = (): SanctionsLists => ({
  editions: [], unavailable: [], not_screened: [],
  parties: [
    ...common,
    party("4697", "HIZBALLAH", ["LEBANESE HEZBOLLAH", "PARTY OF GOD"]),
    party("27307", "LAZARUS GROUP"),
    party("p1", "NELSON, Mark", [], "individual"),
    party("p2", "NELSON HOLDINGS"),
    party("k1", "BANK OF KAZAKHSTAN", [], "entity", ["Kazakhstan"]),
    party("k2", "KAZAKHSTAN", [], "individual", ["Kazakhstan"]),
    party("pk", "PLATINUM KNIGHTS LTD"),
    party("sp", "SUPREME SHIPPING COMPANY LIMITED"),
    ...Array.from({ length: 6 }, (_, i) => party(`s${i}`, `SHIPPING LINE ${i}`)),
  ],
});
const subject = (name: string, kind: Subject["kind"] = null): Subject => ({ name, dob_year: null, kind, wallet: null });

test("a rare, telling word of a listed organisation's name is a possible match", () => {
  const h = wordHits(subject("Hezbollah"), lists());
  assert.equal(h.parties, 1);
  assert.equal(h.matches[0]!.name, "HIZBALLAH");
  assert.equal(h.matches[0]!.matched_name, "LEBANESE HEZBOLLAH");
  assert.equal(h.matches[0]!.score, 0.85, "the score stays what the name scored");
  assert.equal(wordHits(subject("Lazarus"), lists()).matches[0]!.name, "LAZARUS GROUP", "a descriptor beside it is common");
});

test("common words, people's names, places, generic words and short words are never a word hit", () => {
  for (const name of ["Bank", "Trading", "Group", "Shipping", "Lebanese", "Nelson", "Kazakhstan", "Platinum", "Supreme", "Party", "Hezbollah Bank"]) {
    assert.deepEqual(wordHits(subject(name), lists()).matches, [], name);
  }
  assert.deepEqual(wordHits(subject("Hezbollah", "individual"), lists()).matches, [], "a person is not screened against an organisation's word");
});

// The loader treats a list under 1,000 (OFAC) or 100 (UN) parties as a broken download: pad with filler.
function stub(t: { after: (fn: () => void) => void }): void {
  const original = globalThis.fetch;
  const row = (id: string | number, name: string, type = "-0- ") => `${id},"${name}",${type},"SDGT",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `;
  const sdn = [row(4697, "HIZBALLAH"), ...Array.from({ length: 6 }, (_, i) => row(300 + i, `LEBANESE BANK ${i}`)), ...Array.from({ length: 1_100 }, (_, i) => row(100_000 + i, `FILLER ${i}`))].join("\r\n");
  const cons = Array.from({ length: 150 }, (_, i) => row(200_000 + i, `NONSDN FILLER ${i}`)).join("\r\n");
  const un = `<?xml version="1.0"?><CONSOLIDATED_LIST dateGenerated="2026-11-08T00:00:00Z"><INDIVIDUALS>${Array.from({ length: 120 }, (_, i) =>
    `<INDIVIDUAL><FIRST_NAME>FILLER</FIRST_NAME><SECOND_NAME>N${i}</SECOND_NAME></INDIVIDUAL>`).join("")}</INDIVIDUALS><ENTITIES/></CONSOLIDATED_LIST>`;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    const body = u.endsWith("CONS_PRIM.CSV") ? cons : u.endsWith("CONS_ALT.CSV") ? `200000,1,"aka","NONSDN ALIAS",-0- ` : u.endsWith("SDN.CSV") ? sdn
      : u.endsWith("ALT.CSV") ? `4697,1,"aka","LEBANESE HEZBOLLAH",-0- ` : u.endsWith(".xml") ? un : "";
    return new Response(body, { status: 200 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
}

test("screening Hezbollah is a possible match on HIZBALLAH, with the reason, and the scored field says matched", async (t) => {
  stub(t);
  const r = await screenSanctions("Is Hezbollah sanctioned?", "Hezbollah");
  assert.equal(r.verdict, "possible_match", r.reason);
  assert.match(r.reason, /^Possible match: "Hezbollah" is a whole word of LEBANESE HEZBOLLAH, a listed name of HIZBALLAH on the OFAC SDN list/);
  assert.match(r.reason, /Only one listed party carries that word, so it is distinctive/);
  const f = sanctionsIntentFields(r);
  assert.equal(f.matched, true);
  assert.equal(f.match_score, 0.85);
  const clear = await screenSanctions("Is Filler sanctioned?", "Filler");
  assert.equal(clear.verdict, "no_match", "a word in a thousand names is not a hit");
});
