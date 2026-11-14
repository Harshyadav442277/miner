import { test } from "node:test";
import assert from "node:assert/strict";
import { longForms, lookupRegistry } from "../src/registry";

// "Siemens AG" found no record on 2026-11-08: GLEIF's search returned Siemens Energy AG and its siblings, and the
// register names the company "Siemens Aktiengesellschaft".

test("a trailing legal-form abbreviation has its long forms", () => {
  assert.deepEqual(longForms("Siemens AG"), ["Siemens Aktiengesellschaft"]);
  assert.deepEqual(longForms("Robert Bosch GmbH"), ["Robert Bosch Gesellschaft mit beschränkter Haftung"]);
  assert.deepEqual(longForms("Banco Santander, S.A."), ["Banco Santander Société Anonyme", "Banco Santander Sociedad Anónima"]);
  assert.deepEqual(longForms("Shell plc"), ["Shell Public Limited Company"]);
  assert.deepEqual(longForms("Toyota KK"), ["Toyota Kabushiki Kaisha"]);
  assert.deepEqual(longForms("Deutsche Bank"), [], "no legal form, nothing to expand");
  assert.deepEqual(longForms("AG"), [], "a bare legal form is no name");
});

const record = (id: string, name: string) => ({
  id,
  attributes: {
    lei: id,
    entity: {
      legalName: { name }, legalAddress: { addressLines: ["Werner-von-Siemens-Str. 1"], city: "München", country: "DE" },
      registeredAt: { id: "RA000250" }, registeredAs: "HRB 6684", jurisdiction: "DE", category: "GENERAL",
      legalForm: { id: "8888", other: "Aktiengesellschaft" }, status: "ACTIVE", creationDate: null,
    },
    registration: { status: "ISSUED" },
  },
});

test("the long form is searched when the short form finds no record of that name", async (t) => {
  const original = globalThis.fetch;
  const searched: string[] = [];
  globalThis.fetch = (async (url: string) => {
    const u = decodeURIComponent(String(url));
    if (u.includes("registration-authorities")) return Response.json({ data: { attributes: { internationalOrganizationName: "Amtsgericht München" } } });
    if (u.includes("parent")) return new Response("", { status: 404 });
    if (u.includes("filter[entity.legalName]=")) {
      searched.push(u.split("filter[entity.legalName]=")[1]!.split("&")[0]!);
      return Response.json({ data: u.includes("Aktiengesellschaft") ? [record("W38RGI023J3WT1HWRP32", "Siemens Aktiengesellschaft")]
        : [record("E1", "Siemens Energy AG"), record("H1", "Siemens Healthineers AG")] });
    }
    return new Response("", { status: 503 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const r = await lookupRegistry("Is Siemens AG an active registered company?");
  assert.equal(r.verdict, "found", r.reason);
  assert.equal(r.legal_name, "Siemens Aktiengesellschaft");
  assert.equal(r.lei, "W38RGI023J3WT1HWRP32");
  assert.deepEqual(searched, ["Siemens AG", "Siemens Aktiengesellschaft"]);
});

test("a long form of exactly the asked name outranks a longer name the short form found", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = decodeURIComponent(String(url));
    if (u.includes("registration-authorities") || u.includes("parent")) return new Response("", { status: 404 });
    if (u.includes("filter[entity.legalName]=")) {
      return Response.json({ data: u.includes("Gesellschaft mit") ? [record("BOSCH", "Robert Bosch Gesellschaft mit beschränkter Haftung")]
        : [record("KH", "Robert Bosch Krankenhaus GmbH")] });
    }
    return new Response("", { status: 503 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const r = await lookupRegistry("Is Robert Bosch GmbH an active registered company?");
  assert.equal(r.lei, "BOSCH", r.reason);
  assert.deepEqual(r.other_candidates!.map((c) => c.lei), ["KH"]);
});
