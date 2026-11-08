import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEu, parseUk, ukPublished, euPublished, UK_URL } from "../src/sanctions-uk-eu";
import { decodeIndex, encodeIndex } from "../src/sanctions-index";
import { EU, UK, fiveReads } from "./sanctions-fixtures";

test("UK designations read with primary name, aliases, kind, regime, birth year and designation date", () => {
  const [hiz, putin, ship] = parseUk(UK);
  assert.equal(ukPublished(UK), "2026-11-03");
  assert.equal(hiz!.name, "Hizballah");
  assert.deepEqual(hiz!.aliases, ["Hezbollah", "Hizbullah"], "a repeat in another case is dropped");
  assert.equal(hiz!.type, "entity");
  assert.equal(hiz!.listed_on, "2020-12-31");
  assert.equal(putin!.name, "Vladimir Vladimirovich PUTIN");
  assert.deepEqual(putin!.aliases, ["Владимир Владимирович Путин"]);
  assert.deepEqual(putin!.dob_years, [1952]);
  assert.deepEqual(putin!.nationalities, ["Russia"]);
  assert.deepEqual(putin!.programs, ["The Russia (Sanctions) (EU Exit) Regulations 2019"]);
  assert.equal(ship!.type, "vessel");
  assert.equal(ship!.url, UK_URL);
});

test("EU entities read from the v1.1 layout, with or without child elements", () => {
  const [putin, bank] = parseEu(EU);
  assert.equal(euPublished(EU), "2026-10-23");
  assert.equal(putin!.id, "EU.6522.73");
  assert.equal(putin!.name, "Vladimir Vladimirovich PUTIN");
  assert.deepEqual(putin!.aliases, ["Владимир Владимирович ПУТИН"]);
  assert.equal(putin!.type, "individual");
  assert.deepEqual(putin!.programs, ["RUS"]);
  assert.deepEqual(putin!.dob_years, [1952]);
  assert.deepEqual(putin!.nationalities, ["RUSSIA"]);
  assert.equal(putin!.listed_on, "2022-02-25");
  assert.equal(bank!.name, "Example Bank & Trust");
  assert.equal(bank!.type, "entity");
});

test("the index gives back every party of every list exactly, with its edition", () => {
  const reads = fiveReads();
  const ix = encodeIndex(reads, [], "2026-11-09T00:00:00.000Z");
  const back = decodeIndex(JSON.parse(JSON.stringify(ix)), Date.parse("2026-11-09T06:00:00Z"));
  assert.ok(back);
  assert.deepEqual(back.parties, reads.flatMap((r) => r.parties));
  assert.deepEqual(back.editions.map((e) => [e.list, e.published]), reads.map((r) => [r.list, r.published]));
  assert.deepEqual(back.unavailable, []);
  assert.deepEqual(back.not_screened, []);
});

test("an index that is stale, lacks a core list or holds a broken list is not used; a missing EU list is named", () => {
  const reads = fiveReads();
  const now = Date.parse("2026-11-09T06:00:00Z");
  assert.equal(decodeIndex(encodeIndex(reads, [], "2026-11-05T00:00:00Z"), now), null, "built four days ago");
  assert.equal(decodeIndex(encodeIndex(reads.filter((r) => r.list !== "OFAC SDN"), [], "2026-11-09T00:00:00Z"), now), null);
  const broken = reads.map((r) => (r.list === "UK Sanctions List" ? { ...r, parties: r.parties.slice(0, 10) } : r));
  assert.equal(decodeIndex(encodeIndex(broken, [], "2026-11-09T00:00:00Z"), now), null);
  assert.equal(decodeIndex({ v: 2 }, now), null);
  const noEu = decodeIndex(encodeIndex(reads.slice(0, 4), [{ n: "EU Financial Sanctions Consolidated List", error: "HTTP 500" }], "2026-11-09T00:00:00Z"), now);
  assert.deepEqual(noEu?.not_screened, ["EU Financial Sanctions Consolidated List"]);
  assert.deepEqual(noEu?.unavailable, []);
});
