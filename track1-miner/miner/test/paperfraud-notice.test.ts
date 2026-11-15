import { test } from "node:test";
import assert from "node:assert/strict";
import { assessPaperFraud, isNotice, stripNotice } from "../src/paperfraud";

const TITLE = "Ileal-lymphoid-nodular hyperplasia, non-specific colitis, and pervasive developmental disorder in children";
const Q = `How likely is the paper “${TITLE}” to be fraudulent? Consider retractions.`;
const NOTICE = { display_name: `Retraction—${TITLE}`, is_retracted: false, publication_year: 2010, cited_by_count: 506,
  primary_location: { source: { display_name: "The Lancet" } } };
const PAPER = { display_name: TITLE, is_retracted: true, publication_year: 1998, cited_by_count: 3000,
  primary_location: { source: { display_name: "The Lancet" } } };

async function withWorks(results: unknown[], run: () => Promise<void>): Promise<void> {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ results }), { status: 200 })) as unknown as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = real;
  }
}

test("isNotice and stripNotice read a retraction notice's title", () => {
  assert.equal(isNotice(`Retraction—${TITLE}`), true);
  assert.equal(isNotice(`Notice of Retraction: ${TITLE}`), true);
  assert.equal(isNotice(`RETRACTED ARTICLE: ${TITLE}`), true);
  assert.equal(isNotice("Retraction Watch and the integrity of science"), true, "a notice-shaped title is still only a candidate; titleMatches decides");
  assert.equal(isNotice(TITLE), false);
  assert.equal(stripNotice(`Retraction—${TITLE}`), TITLE);
  assert.equal(stripNotice(`Notice of Retraction: "${TITLE}"`), TITLE);
});

test("the paper is used when its retraction notice ranks above it (OpenAlex, 2026-11-15)", async () => {
  await withWorks([NOTICE, PAPER], async () => {
    const r = await assessPaperFraud(Q);
    assert.equal(r.matched, TITLE);
    assert.equal(r.year, 1998);
    assert.equal(r.retracted, true);
    assert.equal(r.verdict, "high_risk");
    assert.match(r.reason, /flagged as RETRACTED/);
    assert.match(r.reason, /A retraction notice for it is indexed as well: "Retraction—Ileal/);
  });
});

test("a notice alone is a documented retraction, never 'not flagged'", async () => {
  await withWorks([NOTICE], async () => {
    const r = await assessPaperFraud(Q);
    assert.equal(r.matched, TITLE);
    assert.equal(r.retracted, true);
    assert.equal(r.verdict, "high_risk");
    assert.match(r.reason, /is RETRACTED: the OpenAlex scholarly index holds a retraction notice for it/);
  });
});

test("a paper with no notice and no flag is still no_indicators", async () => {
  await withWorks([{ ...PAPER, is_retracted: false }], async () => {
    const r = await assessPaperFraud(Q);
    assert.equal(r.retracted, false);
    assert.equal(r.verdict, "no_indicators");
    assert.doesNotMatch(r.reason, /retraction notice/);
  });
});
