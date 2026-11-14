import { test } from "node:test";
import assert from "node:assert/strict";
import { classWinners, resolveEvent } from "../src/eventoutcome";
import { scoredFields } from "../src/intent-fields";

// "Who won the 2024 Bahrain Grand Prix?" named "Max Verstappen (Formula One World Drivers' Championship) and Red
// Bull Racing (Formula One World Constructors' Championship)" as the winner (production, 2026-11-08): the race item
// Q115495949 records both, each with its competition class (P2094), and the pair read as the season's champions.

test("winners split by class lead with the person", () => {
  const s = classWinners(["Red Bull Racing (Formula One World Constructors' Championship)", "Max Verstappen (Formula One World Drivers' Championship)"]);
  assert.equal(s!.lead.name, "Max Verstappen");
  assert.deepEqual(s!.rest, [{ name: "Red Bull Racing", klass: "Formula One World Constructors' Championship" }]);
  assert.equal(classWinners(["Argentina"]), null);
  assert.equal(classWinners(["A (x)", "B"]), null, "every winner needs a class");
});

const claim = (id: string, klass: string) => ({ rank: "normal", mainsnak: { datavalue: { value: { id } } }, qualifiers: { P2094: [{ datavalue: { value: { id: klass } } }] } });

test("a race's recorded winners answer with the driver, and name the constructor apart", async (t) => {
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string) => {
    const url = new URL(String(u));
    if (url.hostname.includes("wikidata")) {
      const action = url.searchParams.get("action");
      if (action === "wbsearchentities") return Response.json({ search: [{ id: "Q115495949", label: "2024 Bahrain Grand Prix" }] });
      if (url.searchParams.get("props") === "claims|labels") {
        return Response.json({ entities: { Q115495949: { id: "Q115495949", labels: { en: { value: "2024 Bahrain Grand Prix" } }, claims: {
          P1346: [claim("Q2239218", "Q63436479"), claim("Q173663", "Q63436495")],
          P582: [{ mainsnak: { datavalue: { value: { time: "+2024-03-02T00:00:00Z" } } } }],
        } } } });
      }
      const names: Record<string, string> = { Q2239218: "Max Verstappen", Q173663: "Red Bull Racing",
        Q63436479: "Formula One World Drivers' Championship", Q63436495: "Formula One World Constructors' Championship" };
      return Response.json({ entities: Object.fromEntries(Object.entries(names).map(([id, value]) => [id, { id, labels: { en: { value } } }])) });
    }
    if (url.hostname.includes("polymarket")) return Response.json({ events: [] });
    return Response.json([]);
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = real; });
  const r = await resolveEvent("Who won the 2024 Bahrain Grand Prix?");
  assert.equal(r.winner, "Max Verstappen", r.reason);
  assert.match(r.reason, /^Max Verstappen won the 2024 Bahrain Grand Prix, which ended 2024-03-02 \(the Formula One World Drivers' Championship classification\); Red Bull Racing won its Formula One World Constructors' Championship classification/);
  assert.equal(scoredFields("/event-outcome", r).winner, "Max Verstappen");
});
