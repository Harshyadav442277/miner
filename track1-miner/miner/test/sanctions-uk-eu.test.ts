import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEu, parseUk, ukPublished, euPublished, UK_URL } from "../src/sanctions-uk-eu";
import { decodeIndex, encodeIndex } from "../src/sanctions-index";
import { parseOfac, parseUn, type ListRead } from "../src/sanctions-lists";

// Records in the layout of UK-Sanctions-List.xml as downloaded 2026-11-08 (generated 03/11/2026).
export const UK = `<?xml version="1.0" encoding="utf-8"?>
<Designations xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <DateGenerated>03/11/2026</DateGenerated>
  <Designation>
    <LastUpdated>09/04/2025</LastUpdated><DateDesignated>31/12/2020</DateDesignated><UniqueID>CTI0032</UniqueID>
    <Names>
      <Name><Name6>Hizballah</Name6><NameType>Primary name</NameType></Name>
      <Name><Name6>Hezbollah</Name6><NameType>Alias</NameType></Name>
      <Name><Name6>Hizbullah</Name6><NameType>Alias</NameType></Name>
      <Name><Name6>HEZBOLLAH</Name6><NameType>Alias</NameType></Name>
    </Names>
    <RegimeName>The Counter-Terrorism (International Sanctions) (EU Exit) Regulations 2019</RegimeName>
    <IndividualEntityShip>Entity</IndividualEntityShip>
  </Designation>
  <Designation>
    <DateDesignated>25/02/2022</DateDesignated><UniqueID>RUS0251</UniqueID>
    <Names>
      <Name><Name1>Vladimir</Name1><Name2>Vladimirovich</Name2><Name6>PUTIN</Name6><NameType>Primary Name</NameType></Name>
    </Names>
    <NonLatinNames><NonLatinName><NameNonLatinScript>Владимир Владимирович Путин</NameNonLatinScript></NonLatinName></NonLatinNames>
    <RegimeName>The Russia (Sanctions) (EU Exit) Regulations 2019</RegimeName>
    <IndividualEntityShip>Individual</IndividualEntityShip>
    <IndividualDetails><Individual><DOBs><DOB>07/10/1952</DOB></DOBs><Nationalities><Nationality>Russia</Nationality></Nationalities></Individual></IndividualDetails>
  </Designation>
  <Designation>
    <DateDesignated>03/10/2017</DateDesignated><UniqueID>DPR0075</UniqueID>
    <Names><Name><Name6>Petrel 8</Name6><NameType>Primary name</NameType></Name><Name><Name6>Jal Vahini</Name6><NameType>Alias</NameType></Name></Names>
    <RegimeName>The Democratic People's Republic of Korea (Sanctions) (EU Exit) Regulations 2019</RegimeName>
    <IndividualEntityShip>Ship</IndividualEntityShip>
  </Designation>
</Designations>`;

// The EU v1.1 layout as published (sanctionEntity, nameAlias, citizenship, birthdate). Not checked against a live
// file: the EU host answered HTTP 500 on 2026-11-08 (GAPS).
export const EU = `<?xml version="1.0" encoding="UTF-8"?>
<export xmlns="http://eu.europa.ec/fpi/fsd/export" generationDate="2026-10-23T15:10:13.000+02:00" globalFileId="1">
<sanctionEntity designationDetails="" unitedNationId="" euReferenceNumber="EU.6522.73" logicalId="148246" designationDate="2022-02-25">
  <regulation regulationType="regulation" programme="RUS" publicationDate="2022-02-25"><publicationUrl>x</publicationUrl></regulation>
  <subjectType code="person" classificationCode="P"/>
  <nameAlias firstName="Vladimir" middleName="Vladimirovich" lastName="PUTIN" wholeName="Vladimir Vladimirovich PUTIN" gender="M" strong="true" logicalId="1"/>
  <nameAlias firstName="" middleName="" lastName="" wholeName="Владимир Владимирович ПУТИН" strong="true" logicalId="2"><regulationSummary/></nameAlias>
  <citizenship countryIso2Code="RU" countryDescription="RUSSIA" logicalId="3"/>
  <birthdate birthdate="1952-10-07" year="1952" countryDescription="RUSSIA" logicalId="4"/>
</sanctionEntity>
<sanctionEntity euReferenceNumber="EU.A1.1" logicalId="9">
  <subjectType code="enterprise" classificationCode="E"/>
  <nameAlias wholeName="Example Bank &amp; Trust"/>
</sanctionEntity>
</export>`;

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

const SDN = `9999,"BOUT, Viktor Anatolijevitch","individual","SDGT] [LIBERIA",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,"DOB 13 Jan 1967; nationality Russia; Digital Currency Address - ETH 0x1111111111111111111111111111111111111111."`;
const filler = (n: number, f: (i: number) => string): string => Array.from({ length: n }, (_, i) => f(i)).join("\n");
/** Five lists large enough to pass the completeness checks. */
export function fiveReads(): ListRead[] {
  const sdn = parseOfac(`${SDN}\n${filler(1_100, (i) => `${100_000 + i},"FILLER ${i}",-0- ,"X",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `)}`,
    `9999,1,"aka","BUT, Victor",-0- `);
  const cons = parseOfac(filler(150, (i) => `${200_000 + i},"NONSDN FILLER ${i}",-0- ,"X",-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- ,-0- `),
    `200000,1,"aka","FILLER ALIAS",-0- `, "OFAC Consolidated (non-SDN)");
  const un = parseUn(`<CONSOLIDATED_LIST><INDIVIDUALS>${filler(120, (i) => `<INDIVIDUAL><FIRST_NAME>FILLER</FIRST_NAME><SECOND_NAME>N${i}</SECOND_NAME><REFERENCE_NUMBER>X${i}</REFERENCE_NUMBER></INDIVIDUAL>`)}</INDIVIDUALS></CONSOLIDATED_LIST>`);
  const uk = parseUk(UK.replace("</Designations>", `${filler(1_100, (i) => `<Designation><UniqueID>F${i}</UniqueID><Names><Name><Name6>UK FILLER ${i}</Name6><NameType>Primary name</NameType></Name></Names><IndividualEntityShip>Entity</IndividualEntityShip></Designation>`)}</Designations>`));
  const eu = parseEu(EU.replace("</export>", `${filler(1_100, (i) => `<sanctionEntity logicalId="${i}"><subjectType code="enterprise"/><nameAlias wholeName="EU FILLER ${i}"/></sanctionEntity>`)}</export>`));
  return [
    { list: "OFAC SDN", published: "2026-11-05", parties: sdn, source: "sdn" },
    { list: "OFAC Consolidated (non-SDN)", published: "2026-11-05", parties: cons, source: "cons" },
    { list: "UN Security Council Consolidated", published: "2026-11-07", parties: un, source: "un" },
    { list: "UK Sanctions List", published: "2026-11-03", parties: uk, source: "uk" },
    { list: "EU Financial Sanctions Consolidated List", published: "2026-10-23", parties: eu, source: "eu" },
  ];
}

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
