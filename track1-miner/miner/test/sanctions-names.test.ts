import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOfac } from "../src/sanctions-lists";
import { nameScore, nameTokens, screenParties, screenSanctions } from "../src/sanctions";

// The forms paying callers sent on 2026-11-01/02 (GAPS G258), against rows in sdn.csv's format. The listed
// names and the two websites are copied from the live SDN list of 2026-11-05.
const SDN = [
  `50641,"CRYPTEX",-0- ,"CYBER2] [RUSSIA-EO14024",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"Website cryptex.net; Organization Type: Activities auxiliary to financial services."`,
  `33151,"SUEX OTC, S.R.O.",-0- ,"CYBER2",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"Website suex.io; Digital Currency Address - XBT 12HQDsicffSBaYdJ6BhnE22sfjTESmmzKx."`,
  `17018,"PUBLIC JOINT STOCK COMPANY SBERBANK OF RUSSIA",-0- ,"RUSSIA-EO14024",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `,
  `40001,"AEZA GROUP LLC",-0- ,"CYBER4",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `,
  `40002,"GRINEX",-0- ,"CYBER4",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `,
  `40003,"TELA",-0- ,"SDGT",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `,
  `40004,"ATLAS",-0- ,"UKRAINE-EO13662",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `,
  `57488,"NASSER GHASEMI RAD AND ASSOCIATES PARTNERSHIP COMPANY",-0- ,"IRAN-EO13902",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `,
  `25902,"MOTOJEN AUTO INDUSTRY COMPANY",-0- ,"IRAN",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `,
].join("\r\n");
const ALT = `17018,1,"aka","SBERBANK",-0- `;
const lists = () => ({ parties: parseOfac(SDN, ALT), editions: [], unavailable: [] });
const top = (name: string) => screenParties({ name, dob_year: null, kind: null, wallet: null }, lists())[0];

test("Cyrillic, look-alike letters, digits for letters and abbreviations fold to the list's words", () => {
  assert.deepEqual(nameTokens("Сбербанк"), ["sberbank"]);
  assert.deepEqual(nameTokens("Тинькофф Банк"), ["tinkoff", "bank"]);
  assert.deepEqual(nameTokens("Gаrаntex"), ["garantex"], "two Cyrillic а in a Latin word");
  assert.deepEqual(nameTokens("Gr1nex"), ["grinex"]);
  assert.deepEqual(nameTokens("L4zarus Grp."), ["lazarus", "group"]);
  assert.deepEqual(nameTokens("Suex dot io"), ["suex", "io"]);
  assert.deepEqual(nameTokens("SUEX OTC, S.R.O."), ["suex", "otc"]);
  assert.deepEqual(nameTokens("общество с ограниченнои отвецтвенностю втб форекс"), ["vtb", "foreks"]);
  assert.deepEqual(nameTokens("3M Company"), ["3m"], "a leading digit is not a letter");
});

test("listed names written in Cyrillic, abbreviated or as a domain are matches", () => {
  for (const [name, id] of [
    ["Сбербанк", "17018"],
    ["нассер гhасеми рад анд ассоcиатес партнершип cомпанй", "57488"],
    ["мотоjен ауто индустрй cомпанй", "25902"],
    ["AEZA Grp", "40001"],
    ["Suex dot io", "33151"],
    ["suex.io", "33151"],
  ] as const) {
    const m = top(name);
    assert.equal(m?.id, id, name);
    assert.ok(m!.score >= 0.95, `${name}: ${m!.score}`);
  }
  assert.equal(top("Suex dot io")!.matched_name, "suex.io");
});

test("a descriptor added to a one-word listed name is a possible match, not a match", () => {
  for (const name of ["Cryptex Platform", "Grinex Exchange"]) {
    const m = top(name);
    assert.ok(m && m.score >= 0.9 && m.score < 0.95, `${name}: ${m?.score}`);
  }
  assert.ok((top("Bitzlato Services")?.score ?? 0) < 0.9, "an unlisted name stays unlisted");
});

test("a one-word name one letter from a listed word is not a hit when screening", () => {
  for (const name of ["Tesla, Inc.", "Atlassian"]) {
    assert.ok((top(name)?.score ?? 0) < 0.9, `${name}: ${top(name)?.score}`);
  }
  // Registry and EDGAR lookups keep the looser rule.
  assert.ok(nameScore(nameTokens("Tesla"), nameTokens("TELA")) > 0.9);
});

test("look-alike letters match whichever way the scripts are mixed", () => {
  // Three Latin and three Cyrillic letters: read by sound this is "grinekh", by shape "grinex".
  const balanced = "Grіnех";
  assert.equal(top(balanced)?.id, "40002");
  assert.ok(top(balanced)!.score >= 0.95, String(top(balanced)!.score));
  // Greek capitals Alpha and Tau inside a Latin word.
  assert.equal(top("ΑΤLΑS")?.id, "40004");
  assert.ok(top("ΑΤLΑS")!.score >= 0.95);
});

test("one letter off a short listed name stays a possible match for review", () => {
  const m = top("Grinez");
  assert.equal(m?.id, "40002");
  assert.ok(m!.score >= 0.9 && m!.score < 0.95, String(m!.score));
});

test("a name in a script this screen cannot read is not called unnamed", async () => {
  const r = await screenSanctions("", "بنك ملي");
  assert.equal(r.verdict, "unknown");
  assert.equal(r.error, "unsupported_script");
  assert.equal((await screenSanctions("", "Ltd")).error, "no_subject");
});

test("the listed website is read as an alias", () => {
  const suex = parseOfac(SDN, ALT).find((p) => p.id === "33151");
  assert.deepEqual(suex!.aliases, ["suex.io"]);
});
