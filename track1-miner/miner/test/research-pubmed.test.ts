import { test } from "node:test";
import assert from "node:assert/strict";
import { answerResearch, findLiterature } from "../src/research";

/**
 * Europe PMC answered routed research terms in 6.4 to 15.6 s on 2026-11-26 against the route's 6 s timeout, and with
 * no trial naming the subject the answer was `unavailable`. PubMed is read when Europe PMC fails or is slow.
 */
const PUBMED_XML = `<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID Version="1">41000001</PMID><Article>
<ArticleTitle>Riliprubart in chronic inflammatory demyelinating polyneuropathy: a phase 2 study.</ArticleTitle>
<Abstract><AbstractText>Riliprubart improved disability scores in patients with CIDP.</AbstractText></Abstract>
<AuthorList><Author><LastName>Querol</LastName></Author></AuthorList>
<Journal><JournalIssue><PubDate><Year>2025</Year></PubDate></JournalIssue></Journal></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;

function mock(epmc: (url: string) => Promise<Response>): () => void {
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string) => {
    const url = String(u);
    if (url.includes("ebi.ac.uk/europepmc")) return epmc(url);
    if (url.includes("esearch.fcgi")) return new Response(JSON.stringify({ esearchresult: { idlist: ["41000001"] } }), { status: 200 });
    if (url.includes("efetch.fcgi")) return new Response(PUBMED_XML, { status: 200 });
    if (url.includes("clinicaltrials.gov")) return new Response(JSON.stringify({ studies: [] }), { status: 200 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return () => { globalThis.fetch = real; };
}

test("a failed Europe PMC read falls back to PubMed, and the answer names PubMed", async () => {
  const restore = mock(async () => new Response("busy", { status: 503 }));
  try {
    const r = await answerResearch("Will Sanofi's Riliprubart trial succeed?");
    assert.equal(r.verdict, "evidence");
    assert.equal(r.citations[0]?.source, "PubMed");
    assert.match(r.reason, /"Riliprubart in chronic inflammatory demyelinating polyneuropathy: a phase 2 study" by Querol et al\. \(2025\) in PubMed\./);
  } finally {
    restore();
  }
});

test("a slow Europe PMC read is overtaken by PubMed after the hedge", async () => {
  const before = process.env.RESEARCH_HEDGE_MS;
  process.env.RESEARCH_HEDGE_MS = "30";
  const restore = mock(() => new Promise((r) => setTimeout(() => r(new Response(JSON.stringify({ resultList: { result: [] } }), { status: 200 })), 1_500)));
  try {
    const started = Date.now();
    const l = await findLiterature("Riliprubart");
    assert.ok(Array.isArray(l) && l.length === 1, JSON.stringify(l));
    assert.equal(l[0]!.source, "PubMed");
    assert.ok(Date.now() - started < 1_400, "answered before Europe PMC did");
  } finally {
    restore();
    if (before === undefined) delete process.env.RESEARCH_HEDGE_MS; else process.env.RESEARCH_HEDGE_MS = before;
  }
});

test("an outage names only the index that did not answer", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async (u: string) => {
    const url = String(u);
    if (url.includes("clinicaltrials.gov")) return new Response(JSON.stringify({ studies: [] }), { status: 200 });
    if (url.includes("wikipedia.org")) return new Response("{}", { status: 404 });
    return new Response("busy", { status: 503 });
  }) as typeof fetch;
  try {
    const r = await answerResearch("Will Polaris Group's ADI-PEG 20 trial succeed?");
    assert.equal(r.verdict, "unavailable");
    assert.match(r.reason, /^The literature indexes \(Europe PMC and PubMed\) did not answer/);
    assert.doesNotMatch(r.reason, /trial registry/);
  } finally {
    globalThis.fetch = real;
  }
});
