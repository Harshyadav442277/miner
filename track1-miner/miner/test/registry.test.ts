import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupRegistry, rankRecords, registrySubject } from "../src/registry";

test("the company, company number, LEI and country are read from the question", () => {
  assert.deepEqual(registrySubject("What is the incorporation status and registered agent for UK company number 12345678?"),
    { name: "", lei: null, number: "12345678", country: "GB" });
  assert.equal(registrySubject("Is Barclays Bank PLC still registered?").name, "Barclays Bank PLC");
  assert.equal(registrySubject("What is Tesla Inc's registered address and state of incorporation?").name, "Tesla Inc");
  assert.equal(registrySubject("Who are the directors of Revolut Ltd in the UK?").name, "Revolut Ltd");
  assert.equal(registrySubject("Look up the LEI 5493001KJTIIGC8Y1R12").lei, "5493001KJTIIGC8Y1R12");
  assert.equal(registrySubject("anything", "Tesla, Inc.").name, "Tesla, Inc.");
});

const record = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  attributes: {
    lei: id,
    entity: {
      legalName: { name }, legalAddress: { addressLines: ["C/O C T Corporation System", "1999 Bryan Street"], city: "Dallas", region: "US-TX", country: "US" },
      registeredAt: { id: "RA000999" }, registeredAs: "0805587591", jurisdiction: "US-TX", category: "GENERAL",
      legalForm: { id: "8888", other: "For-Profit Corporation" }, status: "ACTIVE", creationDate: "2024-06-14T00:00:00Z", ...extra,
    },
    registration: { status: "ISSUED" },
  },
});

test("a live general company outranks a fund or a lapsed record of the same name", () => {
  const ranked = rankRecords("Tesla Inc", [
    record("FUND", "TESLA", { category: "FUND" }),
    record("REAL", "TESLA, INC."),
    record("OTHER", "Tesla Engineering Inc"),
  ] as never);
  assert.equal(ranked[0]!.id, "REAL");
  assert.ok(!ranked.some((r) => r.id === "OTHER"), "a different company name is not a candidate");
});

test("a register record answers status, number, register, agent and states what the sources lack", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const u = String(url);
    if (u.includes("registration-authorities")) return Response.json({ data: { attributes: { internationalOrganizationName: "Texas Secretary of State" } } });
    if (u.includes("direct-parent") || u.includes("ultimate-parent")) return new Response("", { status: 404 });
    if (u.includes("lei-records")) return Response.json({ data: [record("54930043XZGB27CTOV49", "TESLA, INC.")] });
    return new Response("", { status: 503 }); // EDGAR down: the GLEIF record still answers
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const r = await lookupRegistry("What is the incorporation status and registered agent for Tesla, Inc.?");
  assert.equal(r.verdict, "found");
  assert.equal(r.company_number, "0805587591");
  assert.equal(r.register, "Texas Secretary of State");
  assert.equal(r.registered_agent, "C/O C T Corporation System");
  assert.match(r.reason, /^TESLA, INC\. is active, registered with Texas Secretary of State under company number 0805587591 in US-TX, incorporated 2024-06-14\./);
  assert.match(r.reason, /Directors and beneficial owners are not in these sources\.$/);
});

test("no record is not found, and an outage is unknown", async (t) => {
  const original = globalThis.fetch;
  let down = false;
  globalThis.fetch = (async () => down ? new Response("", { status: 503 }) : Response.json({ data: [] })) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const none = await lookupRegistry("Is Zzyzx Widgets Ltd registered in the UK?");
  assert.equal(none.verdict, "not_found");
  assert.match(none.reason, /not proof that no such company exists/);
  down = true;
  const out = await lookupRegistry("Is Zzyzx Widgets Ltd registered in the UK?");
  assert.equal(out.verdict, "unknown");
  assert.equal(out.error, "upstream_unavailable");
});

// G210, 2026-10-25: "Is Nvidia Corporation an active registered company?" searched "Nvidia Corporation an".
test("an article or 'still' before the status word is not part of the name", () => {
  assert.equal(registrySubject("Is Nvidia Corporation an active registered company?").name, "Nvidia Corporation");
  assert.equal(registrySubject("Is Shell plc a registered company?").name, "Shell plc");
  assert.equal(registrySubject("Is Barclays Bank PLC still registered?").name, "Barclays Bank PLC");
});
