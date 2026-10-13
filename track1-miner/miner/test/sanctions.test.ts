import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseOfac, parseUn } from "../src/sanctions-lists";
import { jaroWinkler, nameScore, nameTokens, screenParties, screenSanctions, screeningSubject } from "../src/sanctions";

// Rows in the published formats (sdn.csv, alt.csv, consolidated.xml, read 2026-10-13).
const SDN = [
  `306,"BANCO NACIONAL DE CUBA",-0- ,"CUBA",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"a.k.a. 'BNC'."`,
  `9999,"BOUT, Viktor Anatolijevitch","individual","SDGT] [LIBERIA",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"DOB 13 Jan 1967; alt. DOB 13 Jan 1970; nationality Russia; Digital Currency Address - ETH 0x1111111111111111111111111111111111111111."`,
  `40917,"PETROV, Sergei Valentinovich","individual","RUSSIA-EO14024",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"DOB 26 Apr 1961; POB Russia; nationality Russia."`,
  `12345,"IVANOV, Victor Petrovich","individual","RUSSIA-EO14024",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"DOB 12 May 1952."`,
].join("\r\n");
const ALT = `306,220,"aka","NATIONAL BANK OF CUBA",-0- \r\n9999,1,"aka","BUT, Victor",-0- `;
const UN = `<?xml version="1.0"?><CONSOLIDATED_LIST dateGenerated="2026-10-12T23:00:04.896Z"><INDIVIDUALS>
<INDIVIDUAL><DATAID>1</DATAID><FIRST_NAME>ERIC</FIRST_NAME><SECOND_NAME>BADEGE</SECOND_NAME><UN_LIST_TYPE>DRC</UN_LIST_TYPE>
<REFERENCE_NUMBER>CDi.001</REFERENCE_NUMBER><LISTED_ON>2012-12-31</LISTED_ON><NATIONALITY><VALUE>Democratic Republic of the Congo</VALUE></NATIONALITY>
<INDIVIDUAL_ALIAS><QUALITY/><ALIAS_NAME/></INDIVIDUAL_ALIAS><INDIVIDUAL_DATE_OF_BIRTH><TYPE_OF_DATE>EXACT</TYPE_OF_DATE><YEAR>1971</YEAR></INDIVIDUAL_DATE_OF_BIRTH></INDIVIDUAL>
</INDIVIDUALS><ENTITIES><ENTITY><DATAID>2</DATAID><FIRST_NAME>ADF</FIRST_NAME><UN_LIST_TYPE>DRC</UN_LIST_TYPE><REFERENCE_NUMBER>CDe.001</REFERENCE_NUMBER>
<LISTED_ON>2014-06-30</LISTED_ON><ENTITY_ALIAS><QUALITY>a.k.a.</QUALITY><ALIAS_NAME>Allied Democratic Forces</ALIAS_NAME></ENTITY_ALIAS></ENTITY></ENTITIES></CONSOLIDATED_LIST>`;

const lists = () => ({ parties: [...parseOfac(SDN, ALT), ...parseUn(UN)], editions: [], unavailable: [] });

test("CSV fields keep quoted commas, doubled quotes and OFAC's empty marker", () => {
  assert.deepEqual(parseCsv(`1,"A, B ""C""",-0- \r\n2,x,y`), [["1", 'A, B "C"', "-0- "], ["2", "x", "y"]]);
});

test("OFAC rows join their aliases and read birth years, nationality, programmes and wallets", () => {
  const [cuba, bout] = parseOfac(SDN, ALT);
  assert.equal(cuba!.type, "entity");
  assert.deepEqual(cuba!.aliases, ["NATIONAL BANK OF CUBA"]);
  assert.equal(bout!.type, "individual");
  assert.deepEqual(bout!.programs, ["SDGT", "LIBERIA"]);
  assert.deepEqual(bout!.dob_years, [1967, 1970]);
  assert.deepEqual(bout!.nationalities, ["Russia"]);
  assert.deepEqual(bout!.wallets, ["ETH 0x1111111111111111111111111111111111111111"]);
  assert.equal(bout!.url, "https://sanctionssearch.ofac.treas.gov/Details.aspx?id=9999");
});

test("UN individuals and entities are read with names, aliases and listing dates", () => {
  const [eric, adf] = parseUn(UN);
  assert.equal(eric!.name, "ERIC BADEGE");
  assert.deepEqual(eric!.dob_years, [1971]);
  assert.equal(eric!.listed_on, "2012-12-31");
  assert.deepEqual(adf!.aliases, ["Allied Democratic Forces"]);
  assert.equal(adf!.type, "entity");
});

test("names match across word order, a missing patronymic and a transliteration", () => {
  assert.ok(jaroWinkler("petrov", "petrof") > 0.9);
  assert.equal(nameScore(nameTokens("Viktor Bout"), nameTokens("BOUT, Viktor Anatolijevitch")), 0.95);
  assert.ok(nameScore(nameTokens("Viktor But"), nameTokens("BOUT, Viktor Anatolijevitch")) >= 0.9);
  // A one-word subject cannot reach a possible match against a longer name.
  assert.ok(nameScore(nameTokens("Petrov"), nameTokens("PETROV, Sergei Valentinovich")) <= 0.85);
  // Legal forms do not decide a match.
  assert.equal(nameScore(nameTokens("Banco Nacional de Cuba S.A."), nameTokens("BANCO NACIONAL DE CUBA")), 1);
});

test("the subject, birth year and kind are read from the question", () => {
  assert.deepEqual(screeningSubject("Screen 'Ivan Petrov, DOB 1974, Cyprus' against the OFAC SDN and EU consolidated lists."),
    { name: "Ivan Petrov", dob_year: 1974, kind: null, wallet: null });
  assert.equal(screeningSubject("Is Viktor Bout sanctioned?").name, "Viktor Bout");
  assert.equal(screeningSubject("Screen Kim Jong Un").name, "Kim Jong Un");
  assert.equal(screeningSubject("Is the company Banco Nacional de Cuba on the OFAC list?").kind, "entity");
  assert.equal(screeningSubject("Is 0x1111111111111111111111111111111111111111 sanctioned?").wallet, "0x1111111111111111111111111111111111111111");
});

test("a near name with a different birth year is not a match", () => {
  const m = screenParties({ name: "Viktor Bout", dob_year: 1980, kind: null, wallet: null }, lists());
  assert.equal(m[0]!.dob_check, "differs");
  const ivan = screenParties({ name: "Ivan Petrov", dob_year: 1974, kind: null, wallet: null }, lists());
  assert.ok(ivan.every((x) => x.score < 0.9), JSON.stringify(ivan.map((x) => [x.matched_name, x.score])));
});

// The loader treats a list under 1,000 (OFAC) or 100 (UN) parties as a broken
// download, so the stub pads each fixture with filler parties.
function stubLists(t: { after: (fn: () => void) => void }): void {
  const original = globalThis.fetch;
  const sdnFiller = Array.from({ length: 1_100 }, (_, i) => `${100_000 + i},"FILLER ${i}",-0- ,"X",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `);
  const unFiller = Array.from({ length: 120 }, (_, i) => `<INDIVIDUAL><FIRST_NAME>FILLER</FIRST_NAME><SECOND_NAME>N${i}</SECOND_NAME></INDIVIDUAL>`);
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    const body = u.endsWith("SDN.CSV") ? [SDN, ...sdnFiller].join("\r\n")
      : u.endsWith("ALT.CSV") ? ALT
      : u.endsWith(".xml") ? UN.replace("<INDIVIDUALS>", `<INDIVIDUALS>${unFiller.join("")}`)
      : "";
    return new Response(body, { status: 200 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
}

test("a listed person is a potential match with every list and its edition named", async (t) => {
  stubLists(t);
  const r = await screenSanctions("Is Viktor Bout sanctioned?");
  assert.equal(r.verdict, "match");
  assert.equal(r.matches[0]!.name, "BOUT, Viktor Anatolijevitch");
  assert.deepEqual(r.lists_checked.map((e) => e.list), ["OFAC SDN", "UN Security Council Consolidated"]);
  assert.match(r.reason, /^Potential match: "Viktor Bout" matches BOUT, Viktor Anatolijevitch on the OFAC SDN list/);
  assert.match(r.reason, /EU and UK lists were not screened/);
});

test("an unlisted name is no match and names the closest entry; a listed wallet matches", async (t) => {
  stubLists(t);
  const none = await screenSanctions("Screen 'Ivan Petrov, DOB 1974, Cyprus' against the OFAC SDN list");
  assert.equal(none.verdict, "no_match");
  assert.match(none.reason, /^No match: "Ivan Petrov"/);
  const wallet = await screenSanctions("Is 0x1111111111111111111111111111111111111111 sanctioned?");
  assert.equal(wallet.verdict, "match");
  assert.equal(wallet.subject_type, "wallet");
});

test("a paragraph-length subject is bounded before it is matched", () => {
  const long = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
  const t = Date.now();
  screenParties({ name: long, dob_year: null, kind: null, wallet: null }, lists());
  screeningSubject(`Is ${"a ".repeat(5_000)}on the list?`);
  assert.ok(Date.now() - t < 500, `took ${Date.now() - t} ms`);
});
