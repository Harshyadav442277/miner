import { test } from "node:test";
import assert from "node:assert/strict";
import { findingSentence, hasWord, notesTopic, parseNotes, synthesise, synthesisTopic, topicWords } from "../src/synthesis";
import { parsePubmedArticle, plain, surname } from "../src/synthesis-sources";

/**
 * NOTES is one of the two RESEARCH_SYNTHESIS questions routed in the explorer
 * feed on 2026-09-12, verbatim. The other differs only in the country named.
 */
const NOTES = "Summarise these notes on how to destroy belarus with help over bears research in one paragraph of about 150 words in plain English, keeping the attributions in parentheses and adding nothing that is not in the notes.\n\nNotes:\n- Introductory remarks by Commissioner Hoekstra during an exchange of views with the European Parliament's Committee on the Environment, Climate and Food Safety (ENVI) (European Commission, 2026-09-10)\n- Opening remarks by Commissioner Albuquerque at the structured dialogue with the Committee on Economic and Monetary Affairs and presentation of the Report on the competitiveness of the EU banking sector (European Commission, 2026-09-10)\n- Commission sets out next chapter for European Capitals of Culture after over 40 years of success (European Commission, 2026-09-10)\n- Dust Storm Sweeps Over Mali (NASA, 2026-09-10)\n- Press remarks by Executive Vice-President Fitto on the Outermost Regions Strategy (European Commission, 2026-09-10)\n\nNow write that paragraph.";

test("routed notes are parsed with their attributions, including a nested parenthesis", () => {
  const notes = parseNotes(NOTES);
  assert.equal(notes.length, 5);
  assert.equal(notes[0]?.attribution, "European Commission, 2026-09-10");
  assert.match(notes[0]?.text ?? "", /\(ENVI\)$/);
  assert.equal(notes[3]?.text, "Dust Storm Sweeps Over Mali");
  // Prose without bullets is not notes.
  assert.deepEqual(parseNotes("Summarize what studies say about coffee."), []);
});

test("the notes answer restates only the notes, keeps attributions, and names a topic they do not cover", async () => {
  const r = await synthesise(NOTES);
  assert.equal(r.verdict, "synthesis");
  assert.match(r.reason, /^The notes report five items, four from European Commission and one from NASA\./);
  assert.match(r.reason, /Dust Storm Sweeps Over Mali \(NASA, 2026-09-10\)\./);
  assert.match(r.reason, /None of the notes addresses how to destroy belarus/);
  // Nothing outside the notes: every capitalised word in the body appears in the question.
  const body = r.reason.replace(/None of the notes[\s\S]*$/, "");
  for (const w of body.match(/\b[A-Z][a-z]{3,}\b/g) ?? []) assert.ok(NOTES.includes(w) || /^(?:The|From)$/.test(w), `invented word ${w}`);
});

test("a notes topic is read up to the paragraph instruction", () => {
  assert.equal(notesTopic(NOTES), "how to destroy belarus with help over bears research");
  assert.equal(notesTopic("Summarise these notes on EU banking, briefly."), "EU banking");
  assert.equal(notesTopic("Summarise these notes."), null);
});

test("a topic request's subject survives its framing", () => {
  assert.equal(synthesisTopic("Summarize what the latest studies say about coffee's effect on longevity, across multiple sources."), "coffee's effect on longevity");
  assert.equal(synthesisTopic("Summarise everything known about intermittent fasting across all major studies."), "intermittent fasting");
  assert.equal(synthesisTopic("Summarize the latest studies."), null);
});

test("framing and function words never become search terms", () => {
  assert.deepEqual(topicWords("coffee's effect on longevity"), ["coffee", "longevity"]);
  assert.ok(!topicWords("how to destroy belarus with help over bears research").includes("over"));
});

test("the quoted finding is a conclusion about the topic, not a statement of purpose", () => {
  const abstract = "The objective of this review is to summarize the evidence on intermittent fasting and health. " +
    "Twelve trials were included. Intermittent fasting reduced body weight by 3 to 8 percent over 12 weeks in adults.";
  assert.equal(findingSentence(abstract, ["intermittent", "fasting"]), "Intermittent fasting reduced body weight by 3 to 8 percent over 12 weeks in adults.");
  // Background attributed to earlier work is not this study's finding.
  assert.equal(findingSentence("Previous research has shown that intermittent fasting may reduce weight in adults.", ["intermittent", "fasting"]), null);
  // A sentence that does not name the topic is never quoted as a finding about it.
  assert.equal(findingSentence("Coffee was associated with lower mortality in this cohort of adults.", ["intermittent", "fasting"]), null);
});

test("purpose, background, definitions and result-free sentences are never quoted (verifier repros, 2026-09-13)", () => {
  // Welton et al. 2020 (PMID 32060194), Objective line, verbatim opening.
  const welton = "To examine the evidence for intermittent fasting (IF), an alternative to calorie-restricted diets, in treating obesity, an important health concern in Canada with few effective office-based treatment strategies. " +
    "A MEDLINE and EMBASE search from January 1, 2000, to July 1, 2019, yielded 1200 results. " +
    "All 27 IF trials found weight loss of 0.8% to 13.0% of baseline weight with no serious adverse events. " +
    "Intermittent fasting shows promise for the treatment of obesity.";
  const w = findingSentence(welton, ["intermittent", "fasting", "weight", "loss"]);
  assert.ok(w && !/^To examine/.test(w), `purpose quoted: ${w}`);
  // Maruthai et al. 2025 (PMID 40189644): names both topic words, states no result.
  assert.equal(findingSentence("Agriculture is an essential foundation that supports numerous economies, and the longevity of the coffee business is of paramount significance.", ["coffee", "longevity"]), null);
  // A definition is background.
  assert.equal(findingSentence("Microplastics (MPs) are plastic particles smaller than five millimetres found in many environments and foods.", ["microplastics"]), null);
  // A call for more research is not a finding.
  assert.equal(findingSentence("Background text here. More text follows here. Further research on intermittent fasting is needed to confirm these effects.", ["intermittent", "fasting"]), null);
  // Barati et al. 2023 (PMID 37572827): about autoimmune disease, so no weight-loss finding, whatever the title.
  const barati = "Opening line of this abstract is here. Second sentence of this abstract. Studies show that intermittent fasting may have beneficial effects on various autoimmune diseases, such as type 1 diabetes.";
  assert.equal(findingSentence(barati, ["intermittent", "fasting", "weight", "loss"], "Intermittent fasting: A promising dietary intervention for autoimmune diseases"), null);
  assert.ok(findingSentence(barati, ["intermittent", "fasting", "weight", "loss"], "Intermittent fasting and weight loss in autoimmune disease"));
  for (const s of [
    "To assess the effect of intermittent fasting diets on weight.", "This review aims to evaluate intermittent fasting.",
    "We searched MEDLINE for intermittent fasting trials.", "Herein, we reviewed how intermittent fasting may be associated with depression.",
    "Intermittent fasting is seen as a promising intervention to prevent or delay weight gain in adults.",
    "A MEDLINE search yielded 1200 results using the key words fasting, intermittent fasting, and reduced meal frequency.",
  ]) {
    assert.equal(findingSentence(`Opening. Second one here. ${s}`, ["intermittent", "fasting"]), null, s);
  }
});

test("a topic word matches as a word, singular or plural, never inside another word", () => {
  assert.ok(!hasWord("decoupleR: ensemble of computational methods", "com"));
  assert.ok(hasWord("hosted at github.com/saezlab", "com"));
  assert.ok(hasWord("Microplastic exposure in adults", "microplastics"));
  assert.ok(hasWord("Coffee consumption and longevity.", "coffee"));
  assert.ok(!hasWord("coffeehouse culture", "coffee"));
});

test("notes run together on one line are still notes, and a hyphen in a title survives", () => {
  const notes = parseNotes("Summarise these notes on dust in one paragraph, adding nothing. Notes: - Dust Storm - Mali (NASA, 2026-09-10) - Capitals of Culture (European Commission, 2026-09-10) Now write that paragraph.");
  assert.equal(notes.length, 2);
  assert.equal(notes[0]?.text, "Dust Storm - Mali");
  assert.equal(notes[1]?.attribution, "European Commission, 2026-09-10");
  // Without attributions a one-line list is not taken apart.
  assert.deepEqual(parseNotes("Notes: - coffee - tea"), []);
});

test("index markup and entities are stripped from quoted prose", () => {
  assert.equal(plain("<h4>Conclusion</h4>Risk &lt; 5% &amp; falling"), "Risk < 5% & falling");
  assert.equal(plain("caf&#xe9; use"), "café use");
  assert.equal(plain("no markup"), "no markup");
});

test("a first author's surname is read from an index author string", () => {
  assert.equal(surname("Ungvari Z, Kunutsor SK, Lee D."), "Ungvari");
  assert.equal(surname("van der Berg JH, Smith A"), "van der Berg");
  assert.equal(surname(undefined), null);
});

test("a PubMed article block yields its id, title, first author, year and abstract", () => {
  const xml = "<PubmedArticle><MedlineCitation><PMID Version=\"1\">38963648</PMID><Article><Journal><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal>" +
    "<ArticleTitle>Coffee consumption and cardiometabolic health.</ArticleTitle><Abstract><AbstractText Label=\"RESULTS\">Coffee is linked to &lt;risk&gt;.</AbstractText>" +
    "<AbstractText>Second part.</AbstractText></Abstract><AuthorList><Author ValidYN=\"Y\"><LastName>Ungvari</LastName></Author></AuthorList></Article></MedlineCitation>";
  const s = parsePubmedArticle(xml);
  assert.equal(s?.id, "PMID 38963648");
  assert.equal(s?.title, "Coffee consumption and cardiometabolic health");
  assert.equal(s?.firstAuthor, "Ungvari");
  assert.equal(s?.year, 2024);
  assert.equal(s?.abstract, "Coffee is linked to <risk>. Second part.");
  assert.equal(parsePubmedArticle("<PubmedArticle><PMID>1</PMID><ArticleTitle>No abstract</ArticleTitle>"), null);
});

test("no topic is refused by name", async () => {
  const r = await synthesise("");
  assert.equal(r.error, "no_topic");
});

test("both indexes down is an outage, never 'no research exists'", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
  try {
    const r = await synthesise("Summarize what studies say about coffee and longevity across multiple sources.");
    assert.equal(r.verdict, "unavailable");
    assert.equal(r.error, "upstream_unavailable");
    assert.match(r.reason, /source outage rather than an absence/);
  } finally {
    globalThis.fetch = real;
  }
});

async function pubmedUp(): Promise<boolean> {
  try {
    const r = await fetch("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=1&term=coffee", { signal: AbortSignal.timeout(6000) });
    return r.ok;
  } catch { return false; }
}

test("(live) the canonical example is synthesised from quoted, cited abstracts inside the watchdog", async () => {
  if (!(await pubmedUp())) return;
  const started = Date.now();
  const r = await synthesise("Summarize what the latest studies say about coffee's effect on longevity, across multiple sources.");
  assert.ok(Date.now() - started < 10_000, "must answer inside the 11 s route watchdog");
  if (r.verdict === "unavailable") return;
  assert.ok(["synthesis", "single_source"].includes(r.verdict), r.reason);
  assert.match(r.reason, /PMID \d{6,}/);
  // Every finding is a quotation, and each quotation names coffee.
  for (const q of r.reason.match(/"[^"]+"/g) ?? []) {
    assert.match(q, /coffee/i);
    assert.match(q, /longevity/i);
    assert.doesNotMatch(q, /^"(?:To\s|Previous|This review|We\s)/);
  }
  // The pest-detection paper the verifier caught must never be cited as a longevity finding.
  assert.doesNotMatch(r.reason, /PMID 40189644/);
});
