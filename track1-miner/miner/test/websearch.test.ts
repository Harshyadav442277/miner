import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptBackground, clipTitle, codeTokens, isForwardLooking, misroute, namesCode, webSearch,
} from "../src/websearch";

test("misroutes are named, and ordinary questions are not", () => {
  assert.match(misroute("Verify the SSL/TLS certificate of the domain www.google.com: is it valid?") ?? "", /SSL_VERIFICATION/);
  assert.match(misroute("Search the scholarly literature for research on: AI") ?? "", /ACADEMIC_SEARCH/);
  assert.match(misroute("Find peer-reviewed papers on CRISPR") ?? "", /ACADEMIC_SEARCH/);
  assert.match(misroute("details of CVE-2024-3094") ?? "", /CVE_LOOKUP/);
  assert.equal(misroute("Will OpenAI face legal action?"), null);
  assert.equal(misroute("What's the latest news on the Fed's interest rate decision?"), null);
  // The canonical "Not" example is static knowledge; a current question of the same shape is not.
  assert.match(misroute("Explain what an interest rate is.") ?? "", /CHAT_COMPLETION/);
  assert.match(misroute("What is a stablecoin?") ?? "", /CHAT_COMPLETION/);
  assert.equal(misroute("What is the current Fed interest rate?"), null);
  assert.equal(misroute("Explain the latest news on the Fed's rate decision"), null);
  assert.equal(misroute("Who is the current Secretary-General of the United Nations?"), null);
});

test("a news outage with Wikipedia up is an outage, never an absence in both", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("news.google.com")) throw new Error("news down");
    // Wikipedia answers, with an article that is not about the entity.
    return new Response(JSON.stringify({ title: "Secretary (title)", extract: "Secretary is a title often used in organizations." }), { status: 200 });
  }) as unknown as typeof globalThis.fetch;
  try {
    const r = await webSearch("Who is the current Secretary-General of the United Nations?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "upstream_unavailable");
    assert.doesNotMatch(r.reason, /found in Google News or Wikipedia|absence/);
  } finally {
    globalThis.fetch = original;
  }
});

test("forward-looking questions are recognised", () => {
  assert.equal(isForwardLooking("Will MK-2870 receive FDA approval?"), true);
  assert.equal(isForwardLooking("Is Sony going to lose the lawsuit?"), true);
  assert.equal(isForwardLooking("What's the latest news on the Fed?"), false);
  assert.equal(isForwardLooking("Who will win?"), false);
});

test("product and trial codes are read, and ordinary words are not", () => {
  assert.deepEqual(codeTokens("Will AbbVie's ABBV-706 succeed in Phase 3?"), ["ABBV-706"]);
  assert.deepEqual(codeTokens("Will Sanofi's SAR441566 enter Phase 3 trials?"), ["SAR441566"]);
  assert.deepEqual(codeTokens("Will MK-2870-032 complete Phase 3 trials?"), ["MK-2870-032"]);
  assert.deepEqual(codeTokens("Will Ravulizumab get Chinese approval?"), []);
  assert.deepEqual(codeTokens("Phase 3 in 2026"), []);
});

test("a headline must name the code the question names", () => {
  assert.equal(namesCode("Merck's MK 2870 wins approval", ["MK-2870"]), true);
  assert.equal(namesCode("AbbVie reports positive etentamig results", ["ABBV-706"]), false);
  assert.equal(namesCode("anything at all", []), true);
});

test("encyclopedia background must be about the entity as a proper noun", () => {
  assert.equal(acceptBackground("Apple", "Apple", "Wikipedia: An apple is the round, edible fruit of an apple tree."), null);
  assert.equal(acceptBackground("Secretary-General", "Secretary (title)", "Wikipedia: Secretary is a title."), null);
  assert.match(
    acceptBackground("Ravulizumab", "Ravulizumab", "Wikipedia: Ravulizumab, sold under the brand name Ultomiris, is an antibody.") ?? "",
    /^Ravulizumab, sold under/,
  );
});

test("a long headline is clipped at a word boundary", () => {
  const long = Array.from({ length: 30 }, (_, i) => `w${i}`).join(" ");
  assert.equal(clipTitle(long).split(" ").length, 18);
  assert.match(clipTitle(long), /…$/);
  assert.equal(clipTitle("short headline"), "short headline");
});

test("an empty question and a misroute never reach the network", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("must not be called"); }) as unknown as typeof globalThis.fetch;
  try {
    assert.equal((await webSearch("")).error, "no_query");
    const tls = await webSearch("Verify the SSL/TLS certificate of the domain www.google.com");
    assert.equal(tls.verdict, "out_of_scope");
    assert.match(tls.reason, /no search was run/);
  } finally {
    globalThis.fetch = original;
  }
});

test("both sources down is an outage, not an absence", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("network down"); }) as unknown as typeof globalThis.fetch;
  try {
    const r = await webSearch("Will OpenAI face legal action?");
    assert.equal(r.verdict, "unknown");
    assert.equal(r.error, "upstream_unavailable");
    assert.match(r.reason, /data outage/);
  } finally {
    globalThis.fetch = original;
  }
});

test("the canonical example is answered from dated, attributed reports (live)", async () => {
  const r = await webSearch("What's the latest news on the Fed's interest rate decision?");
  if (r.verdict === "unknown") return;
  assert.equal(r.verdict, "answered");
  assert.match(r.reason, /^The most relevant current reports? (?:is|are) "/);
  assert.match(r.reason, /\(\S[^)]*, \d{1,2} \w+ \d{4}\)/);
  assert.match(r.reason, /Fed/i);
});

test("a forward-looking answer says it is not a prediction (live)", async () => {
  const r = await webSearch("Will OpenAI face legal action?");
  if (r.verdict === "unknown") return;
  assert.match(r.reason, /coverage, not a prediction/);
});
