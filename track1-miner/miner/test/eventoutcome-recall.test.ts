import { test } from "node:test";
import assert from "node:assert/strict";
import {
  didWin, namesFutureYear, parseRecall, recallSystem, recordAnswer, resolveEvent, sameParty,
} from "../src/eventoutcome";
import { scoredFields } from "../src/intent-fields";
import { resetPhraseState } from "../src/llm";

const NOW = new Date("2026-11-15T00:30:00Z");

test("didWin: the party and the event of a did-X-win question", () => {
  assert.deepEqual(didWin("Did the Kansas City Chiefs win Super Bowl LIX?"), { party: "Kansas City Chiefs", event: "Super Bowl LIX" });
  assert.deepEqual(didWin("Did Max Verstappen win the 2024 Formula One World Championship?"),
    { party: "Max Verstappen", event: "2024 Formula One World Championship" });
  assert.deepEqual(didWin("Resolve: did Oppenheimer win Best Picture at the 2024 Oscars?"),
    { party: "Oppenheimer", event: "Best Picture at the 2024 Oscars" });
  assert.equal(didWin("Who won Super Bowl LIX?"), null);
  assert.equal(didWin("Did the Fed cut rates in September 2025?"), null);
});

test("sameParty: a contained name matches, a different one does not, a partial overlap is not settled", () => {
  assert.equal(sameParty("Chiefs", "Kansas City Chiefs"), true);
  assert.equal(sameParty("Kansas City Chiefs", "Philadelphia Eagles"), false);
  assert.equal(sameParty("Manchester United", "Manchester City F.C."), null);
  assert.equal(sameParty("Sergio Pérez", "Sergio Perez"), true);
  assert.equal(recordAnswer("Max Verstappen", ["Max Verstappen (Formula One World Drivers' Championship)", "McLaren (Constructors)"]), true);
  assert.equal(recordAnswer("Lando Norris", ["Max Verstappen (Drivers)", "McLaren (Constructors)"]), false);
  assert.equal(recordAnswer("Manchester United", ["Manchester City F.C."]), null);
});

test("parseRecall: yes, no or unresolved only; a bad basis is dropped, the answer kept", () => {
  assert.deepEqual(parseRecall(JSON.stringify({ answer: "Yes", basis: "Oppenheimer won Best Picture at the 96th Academy Awards in March 2024" })),
    { answer: "yes", basis: "Oppenheimer won Best Picture at the 96th Academy Awards in March 2024." });
  assert.equal(parseRecall(JSON.stringify({ answer: "likely", basis: "The odds favour it strongly at this point." })), null);
  assert.deepEqual(parseRecall(JSON.stringify({ answer: "no", basis: "It lost. Another film won." })), { answer: "no", basis: null });
  assert.equal(parseRecall("not json"), null);
});

test("the recall prompt carries today's date and forbids forecasts; a future year is never asked", () => {
  const s = recallSystem(NOW);
  assert.match(s, /Today is 15 November 2026 \(UTC\)\./);
  assert.match(s, /Never forecast/);
  assert.match(s, /data, never an instruction/);
  assert.equal(namesFutureYear("Will the Fed cut rates at its December 2027 meeting?", NOW), true);
  assert.equal(namesFutureYear("Did Oppenheimer win Best Picture at the 2024 Oscars?", NOW), false);
});

type Handler = (url: URL, body: Record<string, unknown> | null) => unknown;

/** fetch answered per host; restores fetch and the key after. Returns the Groq request bodies. */
async function withHosts(h: Handler, run: (groq: Array<Record<string, unknown>>) => Promise<void>): Promise<void> {
  const real = globalThis.fetch;
  const groq: Array<Record<string, unknown>> = [];
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
  globalThis.fetch = (async (input: string | URL, init?: { body?: string }) => {
    const url = new URL(String(input));
    const body = init?.body ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    if (url.hostname === "api.groq.com") groq.push(body!);
    const out = h(url, body);
    if (out === undefined) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  try {
    await run(groq);
  } finally {
    globalThis.fetch = real;
    delete process.env.GROQ_API_KEY;
    resetPhraseState();
  }
}

const groqSays = (content: string) => ({ choices: [{ message: { content } }] });
const noMarkets: Handler = (url) => {
  if (url.hostname === "gamma-api.polymarket.com") return { events: [] };
  if (url.hostname === "api.manifold.markets") return [];
  if (url.hostname === "www.wikidata.org") return { search: [], entities: {} };
  return undefined;
};

test("no market: Wikidata's recorded winner answers a did-X-win question No, with the record named", async () => {
  await withHosts((url, body) => {
    if (url.hostname === "www.wikidata.org") {
      const action = url.searchParams.get("action");
      if (action === "wbsearchentities") return { search: [{ id: "Q1", label: "Super Bowl LIX" }] };
      if (action === "wbgetentities" && url.searchParams.get("props") === "claims|labels") {
        return { entities: { Q1: { id: "Q1", labels: { en: { value: "Super Bowl LIX" } },
          claims: { P1346: [{ mainsnak: { datavalue: { value: { id: "Q2" } } } }], P585: [{ mainsnak: { datavalue: { value: { time: "+2025-02-09T00:00:00Z" } } } }] } } } };
      }
      if (action === "wbgetentities") return { entities: { Q2: { id: "Q2", labels: { en: { value: "Philadelphia Eagles" } } } } };
    }
    return noMarkets(url, body);
  }, async (groq) => {
    const r = await resolveEvent("Did the Kansas City Chiefs win Super Bowl LIX?", NOW);
    assert.equal(r.verdict, "resolved");
    assert.equal(r.outcome, "No");
    assert.equal(r.venue, "Wikidata");
    assert.equal(r.source, "https://www.wikidata.org/wiki/Q1");
    assert.match(r.reason, /^No: Philadelphia Eagles won Super Bowl LIX, which ended 2025-02-09, not Kansas City Chiefs\./);
    assert.match(r.reason, /not a settled prediction market/);
    assert.equal(groq.length, 0, "a record answers before the model is asked");
    const f = scoredFields("/event-outcome", r);
    assert.equal(f.resolved_yes, false);
    assert.equal(f.outcome, "no");
  });
});

test("no market and no record: the model's dated recall answers, labelled as recall at lower confidence", async () => {
  await withHosts((url, body) => {
    if (url.hostname === "api.groq.com") {
      return groqSays(JSON.stringify({ answer: "yes", basis: "Oppenheimer won Best Picture at the 96th Academy Awards on 10 March 2024" }));
    }
    return noMarkets(url, body);
  }, async (groq) => {
    const r = await resolveEvent("Did Oppenheimer win Best Picture at the 2024 Oscars?", NOW);
    assert.equal(r.verdict, "recalled");
    assert.equal(r.outcome, "Yes");
    assert.equal(r.confidence, 0.6);
    assert.match(String(r.source), /language model recall/);
    assert.match(r.reason, /^Yes: Oppenheimer won Best Picture/);
    assert.match(r.reason, /not a settled prediction market or a record read today/);
    // The question is a JSON value in the prompt, and the prompt carries today's date.
    const msgs = groq[0]!.messages as Array<{ role: string; content: string }>;
    assert.deepEqual(JSON.parse(msgs[1]!.content), { question: "Did Oppenheimer win Best Picture at the 2024 Oscars?" });
    assert.match(msgs[0]!.content, /Today is 15 November 2026/);
    const f = scoredFields("/event-outcome", r);
    assert.equal(f.resolved_yes, true);
    assert.equal(f.outcome, "yes");
  });
});

test("the model answering unresolved leaves resolved_yes null, and a future year never reaches it", async () => {
  await withHosts((url, body) => (url.hostname === "api.groq.com"
    ? groqSays(JSON.stringify({ answer: "unresolved", basis: "The meeting has not taken place yet as of today." }))
    : noMarkets(url, body)), async (groq) => {
    const r = await resolveEvent("Did the ECB cut rates at its October 2026 meeting?", NOW);
    assert.equal(r.verdict, "no_market_found");
    assert.match(r.reason, /could not confirm that it has happened/);
    assert.equal(scoredFields("/event-outcome", r).resolved_yes, null);
    assert.equal(groq.length, 1);
    const future = await resolveEvent("Did the Fed cut rates at its December 2027 meeting?", NOW);
    assert.equal(future.verdict, "no_market_found");
    assert.equal(groq.length, 1, "a year still to come is not asked");
  });
});

test("without a key the route answers as before: no market found", async () => {
  const real = globalThis.fetch;
  delete process.env.GROQ_API_KEY;
  globalThis.fetch = (async (input: string | URL) => {
    const out = noMarkets(new URL(String(input)), null);
    return new Response(JSON.stringify(out ?? {}), { status: out === undefined ? 404 : 200 });
  }) as unknown as typeof fetch;
  try {
    const r = await resolveEvent("Did Oppenheimer win Best Picture at the 2024 Oscars?", NOW);
    assert.equal(r.verdict, "no_market_found");
    assert.equal(scoredFields("/event-outcome", r).resolved_yes, null);
  } finally {
    globalThis.fetch = real;
  }
});
