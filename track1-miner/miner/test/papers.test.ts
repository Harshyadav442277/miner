import { test } from "node:test";
import assert from "node:assert/strict";
import { academicAnswer, searchTopic, dateWindow, requestedLimit, requestedSort, findPapers, type PaperResult } from "../src/papers";

// The four questions below are the real recorded ACADEMIC_SEARCH questions from
// the public score feed, verbatim. Two of them used to make searchTopic return
// null, which returns "No research topic was supplied" — a guaranteed near-zero
// on a question we can answer. The date clause sits mid-sentence in those, and
// the old strip ran to end-of-string, deleting the subject along with the date.

const Q_FIELD_OF = `Find all papers published in 2025 in the field of quantum computing that mention either 'error correction' or 'topological qubits', returning the paper title, authors, publication venue, and abstract for the most recent 10 results sorted by publication date descending.`;
const Q_QUOTED_FIELD = `Find papers published in 2023 in the field of 'artificial intelligence' that mention 'transformer models' in their abstract, returning only the paper title, year, and citation count, limited to 10 results`;
const Q_DAY_RANGE = `Find scholarly articles published between January 1, 2025 and June 30, 2026 that discuss the impact of quantum computing on cryptographic protocols, and return the top 5 results sorted by citation count`;
const Q_MONTH_RANGE = `Find peer-reviewed articles published between January 2023 and June 2026 that discuss the impact of decentralized blockchain networks on supply chain transparency, filtering results to return only those where 'supply chain' appears in the abstract and 'blockchain' appears in the title, limiting the output to 10 papers sorted by most recent publication date`;

test("a mid-sentence date clause does not delete the topic", () => {
  const topic = searchTopic(Q_FIELD_OF);
  assert.ok(topic, "topic must not be null — refusing is a guaranteed near-zero");
  assert.match(topic, /quantum computing/i);
});

test("quoted terms from the question are carried into the topic", () => {
  const topic = searchTopic(Q_FIELD_OF) ?? "";
  assert.match(topic, /error correction/i);
  assert.match(topic, /topological qubits/i);
});

test("a quoted field name is unwrapped and its quoted terms kept", () => {
  const topic = searchTopic(Q_QUOTED_FIELD) ?? "";
  assert.match(topic, /artificial intelligence/i);
  assert.match(topic, /transformer models/i);
  assert.doesNotMatch(topic, /^['"]/, "surrounding quotes should be stripped");
});

test("a bare topic still works — the engine sends the declared param alone", () => {
  assert.equal(searchTopic("zero knowledge proofs"), "zero knowledge proofs");
});

test("a day-numbered range parses — 'between January 1, 2025 and June 30, 2026'", () => {
  assert.deepEqual(dateWindow(Q_DAY_RANGE), { from: "2025-01-01", to: "2026-06-30" });
});

test("a month-only range still parses", () => {
  assert.deepEqual(dateWindow(Q_MONTH_RANGE), { from: "2023-01-01", to: "2026-06-30" });
});

test("a bare publication year still parses", () => {
  assert.deepEqual(dateWindow(Q_FIELD_OF), { from: "2025-01-01", to: "2025-12-31" });
});

test("the requested result count is honoured", () => {
  assert.equal(requestedLimit(Q_FIELD_OF), 10, "'the most recent 10 results'");
  assert.equal(requestedLimit(Q_QUOTED_FIELD), 10, "'limited to 10 results'");
  assert.equal(requestedLimit(Q_DAY_RANGE), 5, "'the top 5 results'");
  assert.equal(requestedLimit(Q_MONTH_RANGE), 10, "'limiting the output to 10 papers'");
  assert.equal(requestedLimit("and limit results to 10"), 10, "'limit results to 10'");
  assert.equal(requestedLimit("zero knowledge proofs"), 5, "no count named -> default");
});

test("a named source is not mistaken for the subject", () => {
  const topic = searchTopic(
    "Search Semantic Scholar for papers published between 2020 and 2023 in the field of machine learning, with 'transformer networks' in the abstract",
  );
  assert.ok(topic);
  assert.doesNotMatch(topic, /semantic scholar/i, "the database is not the topic");
  assert.match(topic, /machine learning/i);
});

test("a relative window becomes a real date range", () => {
  const w = dateWindow("peer-reviewed articles from the last 5 years on AI ethics");
  assert.ok(w.from && w.to, "a relative window must resolve");
  assert.equal(Number(w.to.slice(0, 4)) - Number(w.from.slice(0, 4)), 5);
});

test("database query syntax is stripped from the topic", () => {
  const topic = searchTopic(
    "Search PubMed for reviews that examine CRISPR-Cas9 gene editing, using the search terms 'CRISPR-Cas9' AND 'gene editing' with the filter Humans[Mesh]",
  ) ?? "";
  assert.doesNotMatch(topic, /\[Mesh\]/i);
  assert.doesNotMatch(topic, /\bAND\b/);
  assert.match(topic, /CRISPR-Cas9/i);
});

test("an explicitly requested ordering is honoured, and only then", () => {
  assert.equal(requestedSort(Q_DAY_RANGE), "cited_by_count:desc");
  assert.equal(requestedSort(Q_FIELD_OF), "publication_date:desc");
  assert.equal(requestedSort(Q_MONTH_RANGE), "publication_date:desc");
  // Relevance stays the default: sorting by citations unasked returned a highly
  // cited survey on the wrong subject for a blockchain supply-chain query.
  assert.equal(requestedSort("zero knowledge proofs"), null);
});

test("the served academic body carries only the signal fields and the prose", () => {
  // Telegraph converts the WHOLE payload (keys re-sorted) into the ~32 words it
  // scores, so every extra field competes with the restated reason. Measured in
  // bench/acad_shape.mjs against champion 688: the full PaperResult scores
  // 0.006041 on the payload surface, this shape 0.013419, winning 22/22 rows
  // with the prose surface unchanged.
  const r: PaperResult = {
    topic: "CRISPR gene editing", from_date: "2024-01-01", to_date: "2024-12-31",
    verdict: "papers",
    papers: [{ title: "A Paper", year: 2024, authors: ["A. Researcher"], citations: 42, venue: "Nature", doi: null }],
    count: 1, confidence: 1,
    reason: "Here are 1 peer-reviewed papers on CRISPR gene editing: 1) A Paper by A. Researcher (2024), cited 42 times.",
    checked_at: "2026-08-31T00:00:00.000Z",
  };
  const body = academicAnswer(r);
  assert.deepEqual(Object.keys(body).sort(), ["confidence", "reason", "verdict"]);
  assert.equal(body.reason, r.reason);
  assert.equal(body.verdict, "papers");
  assert.equal(body.confidence, 1);
  // The bench still needs the old payload to score the before/after honestly.
  assert.deepEqual(academicAnswer(r, "full"), { ...r });
});

test("a failed search stays lean too, so the degraded answer is the question echo", () => {
  // OpenAlex sheds anonymous load (G43). When it does, the whole payload should
  // be the restated question plus the honest "none found" — the highest-scoring
  // real conversion ever archived for this intent (0.0149) was exactly that
  // shape from another miner, while a bare "no results" scored 0.0009.
  const r: PaperResult = {
    topic: "quantum computing", from_date: null, to_date: null,
    verdict: "unknown", papers: [], count: 0, confidence: 0,
    reason: "No peer-reviewed papers on quantum computing were found for the requested period.",
    checked_at: "2026-08-31T00:00:00.000Z",
  };
  const body = academicAnswer(r);
  assert.deepEqual(Object.keys(body).sort(), ["confidence", "reason", "verdict"]);
  assert.equal(body.confidence, 0, "confidence 0 keeps the honest-failure marker isAnswered() reads");
});

test("a title's hard wrapping never reaches the scored prose", async () => {
  // OpenAlex passes through what the publisher deposited; arXiv records keep
  // their line breaks, and one live answer carried a literal backslash-n inside
  // the sentence. Every field is converted into the prose the scorer reads.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        results: [{
          title: "Exploring the Limits of Transfer Learning with a Unified Text-to-Text\n Transformer",
          publication_year: 2019,
          cited_by_count: 1,
          authorships: [],
        }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof globalThis.fetch;
  try {
    const r = await findPapers("transformers");
    assert.equal(r.papers[0]?.title, "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer");
    assert.doesNotMatch(r.reason, /\n|\s{2,}/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a timing-out upstream still falls through to the narrower retry", async () => {
  // OpenAlex answers HTTP 504 query_timeout to a broad search combined with a
  // date filter, and pauses anonymous search under load with a 503. Both used
  // to propagate out of findPapers and answer "could not be retrieved", because
  // the retry only ran when the FIRST call returned zero results rather than
  // when it threw — skipping it in exactly the case it exists for.
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (input: unknown) => {
    calls++;
    // The first call carries the date filter; fail it the way OpenAlex does.
    if (String(input).includes("filter=")) {
      return new Response(JSON.stringify({ error: "Gateway timeout", reason: "query_timeout" }), { status: 504 });
    }
    return new Response(
      JSON.stringify({ results: [{ title: "A real paper", publication_year: 2025, cited_by_count: 7, authorships: [] }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof globalThis.fetch;
  try {
    const r = await findPapers("Find papers published in 2025 that discuss machine learning applications");
    assert.ok(calls >= 2, `expected a retry after the 504, saw ${calls} call(s)`);
    assert.equal(r.papers.length, 1);
    assert.match(r.reason, /A real paper/);
    assert.doesNotMatch(r.reason, /could not be retrieved/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
