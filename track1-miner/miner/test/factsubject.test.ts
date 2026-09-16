import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkFact } from "../src/factcheck";
import { extractSubject, sentencesOf, settle } from "../src/factsubject";

/**
 * FACT_CHECK subject resolution, against a mocked Wikimedia.
 *
 * The article text below is transcribed from the live articles on 2026-09-16 —
 * including the two Shark sentences that mention mammals without saying what a
 * shark is, which is what made "sharks are mammals" answer `supported` while the
 * classification guard was too loose. Fixtures, not paraphrase: a test that
 * invents the encyclopaedia's wording proves nothing about the encyclopaedia.
 */
const BAT =
  "Bats (order Chiroptera ) are winged mammals, the only mammals capable of true and sustained " +
  "flight. Bats are more agile in flight than most birds, using long, spread-out digits covered " +
  "with a thin membrane or patagium. ==== Vision ==== Microbats tend to have small eyes but are " +
  "still sensitive to light, and no species is truly blind. Most microbats have mesopic vision, " +
  "meaning that they can detect light only in low levels, whereas other mammals have photopic " +
  "vision, which allows colour vision.";

const SHARK =
  "Sharks are a group of elasmobranch cartilaginous fishes characterized by a ribless " +
  "endoskeleton, dermal denticles, five to seven gill slits on each side, and pectoral fins that " +
  "are not fused to the head. Modern sharks are classified within the division Selachii and are " +
  "the sister group to the Batomorphi. Tooth shape depends on the shark's diet: those that feed " +
  "on mollusks and crustaceans have dense and flattened teeth used for crushing, those that feed " +
  "on fish have needle-like teeth for gripping, and those that feed on larger prey such as " +
  "mammals have pointed lower teeth for gripping and triangular upper teeth with serrated edges " +
  "for cutting. Sharks possess brain-to-body mass ratios that are similar to mammals and birds, " +
  "and have exhibited apparent curiosity and behavior resembling play in the wild.";

const TITLES: Record<string, string[]> = {
  bats: ["Bat", "Bathsheba", "Bats language", "Batsuit"],
  sharks: ["Shark", "Shark Tale", "Sharks (rugby union)", "List of sharks"],
};
const EXTRACTS: Record<string, string> = { Bat: BAT, Shark: SHARK };

/** Serves opensearch and prop=extracts; the fallback full-text search finds nothing. */
function mockWikipedia(): () => void {
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string) => {
    const url = new URL(String(u));
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    const action = url.searchParams.get("action");
    if (action === "opensearch") {
      const term = (url.searchParams.get("search") ?? "").toLowerCase();
      return json([term, TITLES[term] ?? [], [], []]);
    }
    if (action === "query" && url.searchParams.get("prop") === "extracts") {
      const title = url.searchParams.get("titles") ?? "";
      const extract = EXTRACTS[title];
      if (!extract) return json({ query: { pages: { "-1": { title, missing: "" } } } });
      return json({ query: { pages: { "1": { title, extract } } } });
    }
    if (action === "query" && url.searchParams.get("list") === "search") {
      return json({ query: { search: [] } });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return () => { globalThis.fetch = real; };
}

describe("extractSubject", () => {
  test("takes the noun phrase before the predicate", () => {
    assert.equal(extractSubject("Bats are the only mammals capable of sustained flight"), "Bats");
    assert.equal(extractSubject("sharks are mammals"), "sharks");
    assert.equal(extractSubject("humans only use 10% of their brains"), "humans");
  });
  test("drops the leading article, which retrieves a different page", () => {
    // Wikipedia's title search answers "the Eiffel Tower" with *The Eiffel
    // Tower*, a Barthes essay, and "Eiffel Tower" with the tower.
    assert.equal(extractSubject("the Eiffel Tower is located in Paris"), "Eiffel Tower");
  });
  test("a question with no asserted subject yields nothing, not a guess", () => {
    assert.equal(extractSubject("Will Sudan violence escalate further"), "");
    assert.equal(extractSubject(""), "");
    // No verb in the closed list: fall back to search rather than invent a subject.
    assert.equal(extractSubject("water boils at 100 degrees Celsius"), "");
  });
});

describe("settle", () => {
  test("a section heading is not glued to the sentence after it", () => {
    const s = sentencesOf(BAT);
    assert.ok(s.some((x) => x.startsWith("Microbats tend to have small eyes")), s.join(" | "));
    assert.ok(!s.some((x) => x.includes("====")), "headings must be stripped");
  });

  test("a sentence that merely shares a word is not evidence", () => {
    // Both Shark sentences below name sharks AND mammals. Neither says what a
    // shark is, so neither may settle "sharks are mammals".
    const decoys = sentencesOf(SHARK).filter((s) => /mammals/.test(s) && !/cartilaginous/.test(s));
    assert.equal(decoys.length, 2, decoys.join(" | "));
    const found = settle("sharks are mammals", "sharks", decoys);
    assert.equal(found, null);
  });

  test("an unmentioned predicate settles nothing", () => {
    assert.equal(settle("bats are made of solid gold", "bats", sentencesOf(BAT)), null);
  });
});

describe("checkFact resolves the subject first", () => {
  test("bats and flight: supported, quoting the lead sentence", async () => {
    const restore = mockWikipedia();
    try {
      const r = await checkFact("Fact-check this claim: Bats are the only mammals capable of sustained flight.");
      assert.equal(r.verdict, "supported");
      assert.equal(r.source, "Wikipedia");
      assert.equal(r.source_url, "https://en.wikipedia.org/wiki/Bat");
      assert.match(String(r.evidence), /the only mammals capable of true and sustained flight/);
      assert.match(r.reason, /is supported by the reference source consulted/);
      assert.match(r.reason, /not a full adjudication/);
    } finally {
      restore();
    }
  });

  test("sharks and mammals: contradicted, quoting the sentence that says fishes", async () => {
    const restore = mockWikipedia();
    try {
      const r = await checkFact("Fact check: sharks are mammals.");
      assert.equal(r.verdict, "contradicted");
      assert.equal(r.source_url, "https://en.wikipedia.org/wiki/Shark");
      assert.match(String(r.evidence), /a group of elasmobranch cartilaginous fishes/);
      // Not the tooth sentence and not the brain-mass sentence.
      assert.doesNotMatch(String(r.evidence), /Tooth shape|brain-to-body/);
    } finally {
      restore();
    }
  });

  test("bats are blind: contradicted by the article's own Vision section", async () => {
    const restore = mockWikipedia();
    try {
      const r = await checkFact("Fact check: bats are blind.");
      assert.equal(r.verdict, "contradicted");
      assert.equal(r.source_url, "https://en.wikipedia.org/wiki/Bat");
      assert.match(String(r.evidence), /no species is truly blind/);
    } finally {
      restore();
    }
  });

  test("a predicate the subject's article never mentions stays unverified", async () => {
    const restore = mockWikipedia();
    try {
      const r = await checkFact("Fact check: bats are made of solid gold.");
      assert.equal(r.verdict, "unverified");
      assert.doesNotMatch(r.reason, /\bis supported\b/i);
    } finally {
      restore();
    }
  });

  test("a negated claim is judged on polarity, not on the words it shares", async () => {
    const restore = mockWikipedia();
    try {
      // Negated claim, negated evidence: the same finding, so the claim holds.
      const blind = await checkFact("Fact check: bats are not blind.");
      assert.equal(blind.verdict, "supported");
      assert.match(String(blind.evidence), /no species is truly blind/);
      // Negated claim, incompatible class: also the same finding.
      const sharks = await checkFact("Fact check: sharks are not mammals.");
      assert.equal(sharks.verdict, "supported");
      assert.match(String(sharks.evidence), /cartilaginous fishes/);
    } finally {
      restore();
    }
  });

  test("the subject's own article is preferred over a full-text match", async () => {
    // The fallback search is mocked to find nothing at all, so a verdict here can
    // only have come from the subject article.
    const restore = mockWikipedia();
    try {
      const r = await checkFact("Fact-check this claim: Bats are the only mammals capable of sustained flight.");
      assert.equal(r.source_url, "https://en.wikipedia.org/wiki/Bat");
    } finally {
      restore();
    }
  });
});
