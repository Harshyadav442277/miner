/**
 * RESEARCH_QUERY — a research question answered from sources, with the sources
 * named.
 *
 * The canonical description: "asks a research question and expects an answer
 * supported by citations to sources", as distinct from RESEARCH_SYNTHESIS, which
 * wants findings combined across many sources.
 *
 * WHAT THE ROUTED QUESTIONS ACTUALLY ARE. Read from the explorer feed on
 * 2026-09-10, eleven of eleven are forward-looking questions about drugs and
 * trials:
 *
 *   "Will Novartis' Ianalumab be approved?"
 *   "Will Lepodisiran reduce coronary plaque?"
 *   "Was BIOSTREAM.HF trial successful?"
 *   "Will Winclove probiotic treat allergic rhinitis?"
 *
 * Nobody knows whether a drug will be approved, which is why the whole field has
 * sat at 0.0147 for fifty-two epochs. So this module does not predict. It
 * answers the answerable half — what the registered trial record and the
 * published literature show right now — and says plainly that the outcome is not
 * yet decided when it is not. That is a cited answer to a research question,
 * which is what the intent asks for, and it is the only honest one available.
 *
 * THREE SOURCES, EACH NAMED IN THE ANSWER.
 *   ClinicalTrials.gov v2  — the registry. Phase, status and completion date are
 *                            facts about a trial, not opinions about it.
 *   Europe PMC             — the literature. Keyless, and not the OpenAlex index
 *                            that G81 has rate-limited since 2026-09-09.
 *   Wikipedia REST         — the general fallback, for the questions that are
 *                            not biomedical at all.
 */
const TIMEOUT_MS = Number(process.env.RESEARCH_TIMEOUT_MS ?? 6_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const CTGOV = "https://clinicaltrials.gov/api/v2/studies";
const EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
const WIKI = "https://en.wikipedia.org/api/rest_v1/page/summary";

export type ResearchVerdict = "evidence" | "no_evidence" | "unavailable" | "unknown";

export interface Trial {
  id: string;
  title: string;
  status: string;
  phase: string | null;
  completion: string | null;
}

export interface Citation {
  title: string;
  authors: string | null;
  year: number | null;
  source: string;
}

export interface ResearchResult {
  subject: string | null;
  trials: Trial[];
  citations: Citation[];
  verdict: ResearchVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

async function getJson(url: string, timeout = TIMEOUT_MS): Promise<unknown> {
  const r = await fetch(url, {
    redirect: "follow",
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeout),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/**
 * The research question inside the request.
 *
 * One of the eleven routed questions arrives as "Extract the dates, quantities,
 * named entities and events from: <a real research question>". The prefix is a
 * misroute from CONTENT_EXTRACTION, and the text after the colon is a genuine
 * research question, so it is read rather than the whole string being searched.
 */
export function researchSubject(text: string): string | null {
  let s = String(text ?? "").trim();
  const after = s.match(/^\s*extracts?\b[^:]{0,120}:\s*([\s\S]+)$/i);
  if (after?.[1]) s = after[1].trim();
  s = s
    .replace(/^\s*(?:please\s+)?(?:tell me|answer|research|find out|look up)\b[\s,:-]*/i, "")
    .replace(/\bcite (?:your )?sources?\b\.?/i, "")
    .replace(/^\s*(?:will|was|is|are|does|do|did|can|could|should|has|have)\b\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[?.!]+\s*$/, "")
    .trim();
  return s.length >= 3 ? s.slice(0, 200) : null;
}

/**
 * The distinctive name a question turns on — a drug, a trial, a company.
 *
 * The registry is keyed by name, so searching it with a whole sentence returns
 * nothing. A capitalised token that is not a sentence-opening stop word is the
 * signal; a dotted trial code such as "BIOSTREAM.HF" is one too.
 */
const NAME_STOP = new Set([
  "will", "was", "is", "are", "does", "do", "did", "can", "could", "should", "has", "have",
  "the", "a", "an", "and", "or", "of", "in", "on", "for", "to", "study", "trial", "phase",
  "what", "which", "who", "when", "where", "why", "how", "evidence", "research", "inc",
]);

export function namedEntities(text: string): string[] {
  const s = String(text ?? "");
  const out: string[] = [];
  const push = (v: string): void => {
    const t = v.replace(/['’]s$/i, "").trim();
    if (t && !out.includes(t)) out.push(t);
  };
  for (const m of s.match(/\b[A-Z][A-Z0-9]{2,}[.\-][A-Z0-9]{2,}\b/g) ?? []) push(m);
  /**
   * A word is only a proper noun if its capital is not just the start of a
   * sentence. Without this, "Cite your sources." — the tail of the intent's own
   * canonical example — makes "Cite" the subject and the answer becomes
   * Wikipedia's article on citation.
   */
  for (const m of s.matchAll(/(^|[.!?]\s+|\s|^)([A-Z][A-Za-z0-9-]{2,}(?:\s+[A-Z][A-Za-z0-9-]{2,})*)/g)) {
    const run = m[2] ?? "";
    const raw = run.split(/\s+/);
    const words = raw.filter((w) => !NAME_STOP.has(w.toLowerCase()));
    if (words.length === 0) continue;
    /**
     * A capital only signals a name when it is not merely the start of a
     * sentence — but if the sentence STARTED with a stop word that was just
     * dropped, what remains is mid-sentence and is a name after all. Without
     * that second half, "Will Patisiran be approved?" loses Patisiran.
     */
    const opens = (m[1] === "" || /[.!?]\s+$/.test(m[1] ?? "")) && !NAME_STOP.has((raw[0] ?? "").toLowerCase());
    if (opens && words.length === 1) continue;
    if (words.length > 1) push(words.join(" "));
    for (const w of words.slice(opens ? 1 : 0)) if (w.length >= 4) push(w);
  }
  return out;
}

/**
 * Question scaffolding, speculation and filler. None of it appears in the title
 * of a paper about the subject, so leaving it in the search term is what turned
 * the intent's own worked example into a miss.
 */
const TOPIC_STOP = new Set([
  "what", "does", "do", "did", "the", "an", "and", "are", "was", "were", "will", "would",
  "can", "could", "should", "has", "have", "evidence", "say", "says", "about", "for",
  "how", "why", "when", "which", "who", "study", "studies", "find", "finds", "complete",
  "show", "shows", "succeed", "treat", "treats", "reduce", "reduces", "approved", "approval",
  "positive", "successful", "success", "more", "plus", "trial", "trials", "phase", "cite",
  "sources", "source", "your", "there", "any", "with", "from", "that", "this", "into",
]);

/** The searchable topic inside a research question. */
export function topicOf(subject: string): string {
  const words = String(subject ?? "")
    .split(/[^A-Za-z0-9-]+/)
    .filter((w) => w.length >= 3 && !TOPIC_STOP.has(w.toLowerCase()));
  return words.join(" ").trim();
}

export function namedEntity(text: string): string | null {
  return namedEntities(text)[0] ?? null;
}

/**
 * Does this source record actually concern the term it was found with?
 *
 * The check exists because of a measured failure, not a hypothetical one. Asked
 * "Will Novartis' Ianalumab be approved?", the registry was queried for the
 * SPONSOR and answered with a terminated docetaxel study, and Europe PMC
 * answered with a paper on Chagas disease. Both were confident, both were
 * citations, and neither was about ianalumab. A source that does not name the
 * subject is not evidence about the subject.
 */
export function mentions(haystack: string, term: string): boolean {
  const words = term.toLowerCase().match(/[a-z0-9-]{4,}/g) ?? [];
  const t = haystack.toLowerCase();
  if (words.length === 0) return t.includes(term.toLowerCase());
  // A single name has to appear. A phrase is a topic, and a title that carries
  // most of its content words is about that topic.
  if (words.length === 1) return t.includes(words[0] as string);
  return words.filter((w) => t.includes(w)).length / words.length >= 0.6;
}

interface CtStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    statusModule?: { overallStatus?: string; primaryCompletionDateStruct?: { date?: string } };
    designModule?: { phases?: string[] };
  };
}

const humanStatus = (s: string): string => s.toLowerCase().replace(/_/g, " ");
/** "NA" is the registry's way of saying a study has no phase, not a phase called NA. */
const humanPhase = (p: string[]): string | null => {
  const named = p.filter((x) => !/^na$/i.test(x)).map((x) => x.replace(/^PHASE/i, "Phase "));
  return named.length ? named.join("/") : null;
};

export async function findTrials(term: string): Promise<Trial[] | "unavailable"> {
  try {
    const d = (await getJson(
      `${CTGOV}?query.term=${encodeURIComponent(term)}&pageSize=4&countTotal=true`,
    )) as { studies?: CtStudy[] };
    return (d.studies ?? []).flatMap((s) => {
      const p = s.protocolSection;
      const id = p?.identificationModule?.nctId;
      const title = p?.identificationModule?.briefTitle;
      if (!id || !title) return [];
      return [{
        id,
        title,
        status: humanStatus(p?.statusModule?.overallStatus ?? "unknown"),
        phase: humanPhase(p?.designModule?.phases ?? []),
        completion: p?.statusModule?.primaryCompletionDateStruct?.date ?? null,
      }];
    });
  } catch {
    return "unavailable";
  }
}

export async function findLiterature(term: string): Promise<Citation[] | "unavailable"> {
  try {
    const d = (await getJson(
      `${EPMC}?query=${encodeURIComponent(term)}&format=json&pageSize=3&resultType=core`,
    )) as { resultList?: { result?: Array<{ title?: string; authorString?: string; pubYear?: string }> } };
    return (d.resultList?.result ?? []).flatMap((r) => {
      if (!r.title) return [];
      const year = Number(r.pubYear);
      return [{
        title: r.title.replace(/\.$/, ""),
        authors: r.authorString ? r.authorString.replace(/\.$/, "") : null,
        year: Number.isFinite(year) ? year : null,
        source: "Europe PMC",
      }];
    });
  } catch {
    return "unavailable";
  }
}

export async function findEncyclopedia(term: string): Promise<Citation | null | "unavailable"> {
  try {
    const d = (await getJson(`${WIKI}/${encodeURIComponent(term.replace(/\s+/g, "_"))}`)) as {
      title?: string; extract?: string; type?: string;
    };
    if (!d.extract || d.type === "disambiguation") return null;
    return { title: d.title ?? term, authors: null, year: null, source: `Wikipedia: ${d.extract.split(/(?<=\.)\s/)[0]}` };
  } catch (e) {
    return /HTTP 404/.test(String(e)) ? null : "unavailable";
  }
}

/**
 * The concepts a research question combines, with its scaffolding removed.
 *
 * The node's own RESEARCH_QUERY cases, read from another miner's failure_reason
 * (2026-09-15), are clinical-evidence questions:
 *   "What are the most recent findings regarding the efficacy of CRISPR-Cas9 gene
 *    editing for treating Huntington's disease…"                      (epoch 334)
 *   "What are the current recommendations for managing type 2 diabetes in
 *    patients with chronic kidney disease…"                            (epoch 332)
 * The second became the single search term "current recommendations managing type
 * diabetes patients chronic kidney disease" — the "2" gone, the scaffolding kept —
 * and answered no_evidence; the first found a generic CRISPR review. Split into
 * ["type 2 diabetes", "chronic kidney disease"], Europe PMC returns a 2026
 * consensus statement on exactly that.
 */
export function researchConcepts(question: string): { concepts: string[]; guidance: boolean; recent: boolean } {
  const q = String(question ?? "").replace(/\bcite (?:your )?sources?\b\.?/gi, "").replace(/[?!]+/g, " ").trim();
  const guidance = /\b(?:recommendations?|guidelines?|consensus|best practices?|standard of care)\b/i.test(q);
  const recent = /\b(?:recent|latest|current|new(?:est)?|up-to-date)\b/i.test(q);
  const core = q
    .replace(/^\s*(?:what|which)\s+(?:are|is|were|was)\s+(?:the\s+)?/i, "")
    .replace(/^(?:(?:most\s+)?(?:recent|latest|current|new(?:est)?|up-to-date|main|key)\s+)*(?:research\s+|clinical\s+)?(?:findings|evidence|recommendations|guidelines|data|results|studies|research|consensus|understanding|advances|developments)\s+(?:on|regarding|about|for|in|of|concerning)\s+/i, "")
    .replace(/\b(?:the\s+)?(?:efficacy|effectiveness|safety|role|use|impact|effects?|benefits?)\s+of\s+/gi, "")
    .replace(/\b(?:for\s+)?(?:treating|managing|treatment\s+of|management\s+of|patients\s+with|people\s+with|adults\s+with|individuals\s+with)\b/gi, " | ")
    .replace(/\bin\s+(?:human\s+)?(?:clinical\s+)?(?:trials?|studies|humans|patients|adults|children)\b.*$/i, "")
    .replace(/[.;]+\s*$/, "");
  const GENERIC = /^(?:gene editing|treatment|therapy|therapies|patients?|management|humans?|adults|children|clinical trials?|efficacy|outcomes?|disease)$/i;
  const concepts = core.split(/\s*\|\s*|\s*,\s*|\s+(?:for|in|with|among|and|versus|vs\.?|on)\s+/i)
    .map((c) => c.replace(/^(?:the|a|an)\s+/i, "")
      .replace(/(?:\s+(?:gene editing|therapy|treatment|efficacy|effectiveness|safety|outcomes?|research|findings))+$/i, "")
      .replace(/['’]s\b/g, "").trim())
    .filter((c) => c.length >= 3 && !GENERIC.test(c));
  return { concepts: [...new Set(concepts)].slice(0, 3), guidance, recent };
}

export interface Finding extends Citation { conclusion: string | null }

/** Literature that covers every concept, with each abstract's concluding sentence. */
export async function findConceptLiterature(concepts: string[], guidance: boolean, recent: boolean): Promise<Finding[] | "unavailable"> {
  const term = concepts.map((c) => (c.split(/\s+/).length <= 4 ? `"${c}"` : c)).join(" AND ") +
    (guidance ? " AND (guideline OR recommendations OR consensus)" : "") +
    (recent ? ` AND PUB_YEAR:[${new Date().getUTCFullYear() - 5} TO ${new Date().getUTCFullYear()}]` : "") +
    " NOT SRC:PPR";
  try {
    const d = (await getJson(`${EPMC}?query=${encodeURIComponent(term)}&format=json&pageSize=8&resultType=core`)) as {
      resultList?: { result?: Array<{ title?: string; authorString?: string; pubYear?: string; abstractText?: string; pubTypeList?: { pubType?: string[] } }> };
    };
    // Relevance order, then: every concept in the TITLE first, and for a guidance
    // question a guideline, consensus statement or review first. Measured live on
    // the diabetes/CKD case: relevance alone led with a pharmacy research letter.
    const kinds = (r: { pubTypeList?: { pubType?: string[] } }): string => (r.pubTypeList?.pubType ?? []).join(" ");
    const rank = (r: { title?: string; pubTypeList?: { pubType?: string[] } }): number =>
      (concepts.every((c) => strip(r.title ?? "").toLowerCase().includes(key(c))) ? 0 : 2) +
      (/guideline|consensus|systematic review|meta-analysis|review/i.test(kinds(r)) ? 0 : guidance ? 1.5 : 0.5);
    const strip = (s: string): string => s.replace(/<[^>]+>/g, "").replace(/&lt;[^&]*&gt;/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    const key = (c: string): string => (c.toLowerCase().match(/[a-z0-9-]{4,}/g) ?? [c.toLowerCase()]).sort((a, b) => b.length - a.length)[0]!.slice(0, 6);
    const results = (d.resultList?.result ?? []).map((r, i) => ({ r, i })).sort((x, y) => rank(x.r) - rank(y.r) || x.i - y.i).map((x) => x.r);
    return results.flatMap((r) => {
      if (!r.title) return [];
      const title = strip(r.title).replace(/\.$/, "");
      const abstract = strip(r.abstractText ?? "");
      const hay = `${title} ${abstract}`.toLowerCase();
      if (!concepts.every((c) => hay.includes(key(c)))) return [];
      const conc = abstract.match(/(?:CONCLUSIONS?|Conclusions?|In conclusion|INTERPRETATION)[:.,]?\s*(.+)$/)?.[1] ?? abstract.split(/(?<=[.])\s+(?=[A-Z])/).slice(-1)[0] ?? "";
      const sentence = conc.split(/(?<=[.])\s+(?=[A-Z])/)[0]?.trim() ?? "";
      const year = Number(r.pubYear);
      return [{
        title, authors: r.authorString ? r.authorString.replace(/\.$/, "") : null,
        year: Number.isFinite(year) ? year : null, source: "Europe PMC",
        conclusion: sentence.split(/\s+/).length >= 6 ? sentence : null,
      }];
    }).slice(0, 3);
  } catch {
    return "unavailable";
  }
}

/** "differences between A and B", "A vs B", "compare A with B" — the two subjects, or null. */
export function comparedSubjects(text: string): [string, string] | null {
  const s = String(text ?? "").replace(/\?.*$/s, "").trim();
  const m =
    s.match(/\b(?:differences?|distinction|compar(?:e|ison|ing))\s+(?:between\s+|of\s+)?(.{2,60}?)\s+(?:and|with|to|versus|vs\.?)\s+(.{2,60}?)\s*(?:[.;,]|$)/i) ??
    s.match(/^(?:how\s+(?:does|do|is|are)\s+)?(.{2,60}?)\s+(?:versus|vs\.?|compared\s+(?:to|with))\s+(.{2,60}?)\s*(?:[.;,]|$)/i);
  const clean = (x: string | undefined): string => String(x ?? "").replace(/^(?:the|a|an)\s+/i, "").replace(/\s+(?:differ|compare)\b.*$/i, "").trim();
  const a = clean(m?.[1]), b = clean(m?.[2]);
  return a && b && a.toLowerCase() !== b.toLowerCase() ? [a, b] : null;
}

/** The encyclopedia article a phrase names, resolved through Wikipedia's title search first. */
export async function findEncyclopediaBySearch(term: string): Promise<Citation | null | "unavailable"> {
  try {
    const d = (await getJson(`https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(term)}&limit=1`)) as {
      pages?: Array<{ key?: string; title?: string }>;
    };
    const page = d.pages?.[0];
    // The found title must carry the phrase's words, or it is a different subject.
    const words = term.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
    if (!page?.key || !words.every((w) => String(page.title ?? "").toLowerCase().includes(w))) return findEncyclopedia(term);
    return findEncyclopedia(page.key);
  } catch {
    return "unavailable";
  }
}

/** Whether the question asks about something not yet settled. */
function isForwardLooking(text: string): boolean {
  return /^\s*(?:will|would|is\s+\w+\s+going to|are\s+\w+\s+going to)\b/i.test(String(text ?? ""));
}

const firstAuthor = (c: Citation): string => (c.authors ? `${c.authors.split(",")[0]} et al.` : "the authors");

export async function answerResearch(question: string): Promise<ResearchResult> {
  const empty = { subject: null, trials: [], citations: [] };
  const subject = researchSubject(question);
  if (!subject) {
    return {
      ...empty, verdict: "unknown", confidence: 0,
      reason:
        `No research question could be read from this request. State the question, for example ` +
        `"What does the evidence say about intermittent fasting?", and it can be answered from the ` +
        `trial registry and the published literature with the sources named.`,
      error: "no_question",
    };
  }

  /**
   * Every candidate name is tried and only a source that NAMES the candidate is
   * kept. The first candidate is often the sponsor rather than the drug, so
   * taking it on faith is how a question about ianalumab gets answered with a
   * docetaxel trial.
   */
  /**
   * Names come from the ORIGINAL question, where an auxiliary still precedes
   * them, and the topic from the cleaned subject. Reading names off the cleaned
   * subject puts the drug at position zero and the sentence-opening rule then
   * discards it.
   */
  const topic = topicOf(subject);
  const terms = [...namedEntities(question).slice(0, 3), ...(topic ? [topic] : [subject])];
  let term = terms[0] ?? subject;
  let trials: Trial[] = [];
  let lit: Citation[] = [];
  let wiki: Citation | null = null;
  let anyIndexDown = false;

  /**
   * Pass one: every candidate against the real indexes, ALL AT ONCE.
   *
   * Tried one after another this cost a full upstream timeout per candidate —
   * measured at 23 seconds for a name neither index holds, against a route
   * watchdog of 11. The watchdog would have fired and turned a perfectly honest
   * "no evidence" into an outage. Firing them together bounds the whole pass to
   * one timeout, and preference is restored afterwards by walking the results in
   * candidate order rather than in completion order.
   *
   * The encyclopedia stays out of this pass: settling for Wikipedia's page about
   * the SPONSOR before the DRUG has been looked up is how "Will Novartis'
   * Ianalumab be approved?" gets answered with a corporate profile of Novartis.
   */
  const { concepts, guidance, recent } = researchConcepts(question);
  const conceptSearch = concepts.length >= 2 && !isForwardLooking(question)
    ? findConceptLiterature(concepts, guidance, recent)
    : Promise.resolve(null);
  const probes = await Promise.all(terms.map(async (candidate) => {
    const [t, l] = await Promise.all([findTrials(candidate), findLiterature(candidate)]);
    return { candidate, t, l };
  }));

  for (const { candidate, t, l } of probes) {
    if (t === "unavailable" || l === "unavailable") anyIndexDown = true;
  }
  for (const { candidate, t, l } of probes) {
    const relevantTrials = t === "unavailable" ? [] : t.filter((x) => mentions(x.title, candidate));
    const relevantLit = l === "unavailable" ? [] : l.filter((x) => mentions(x.title, candidate));
    if (relevantTrials.length || relevantLit.length) {
      term = candidate;
      trials = relevantTrials;
      lit = relevantLit;
      break;
    }
  }

  // Pass two: only once no candidate is named by a trial or a paper. Here the
  // encyclopedia is the right source, because the subject is a company or a
  // product rather than a molecule. Concurrent for the same reason as pass one.
  if (trials.length === 0 && lit.length === 0) {
    const pages = await Promise.all(terms.map((candidate) =>
      findEncyclopedia(candidate).then((w) => ({ candidate, w }))));
    for (const { candidate, w } of pages) {
      if (w === "unavailable") { anyIndexDown = true; continue; }
      if (w) { wiki = w; term = candidate; break; }
    }
  }

  /**
   * A question that combines concepts is answered from literature covering all
   * of them, led by what that literature concludes, unless a candidate name
   * already found a registered trial (a trial record is the stronger fact).
   */
  const found = await conceptSearch;
  if (Array.isArray(found) && found.length && trials.length === 0) {
    const [a, b] = found;
    const by = (c: Finding): string => `${firstAuthor(c)}${c.year ? `, ${c.year}` : ""}`;
    const lead = a!.conclusion
      ? `"${a!.title}" (${by(a!)}) concludes: ${a!.conclusion}`
      : `The published evidence includes "${a!.title}" (${by(a!)}).`;
    return {
      subject, trials: [], citations: found.map(({ conclusion: _c, ...c }) => c), verdict: "evidence", confidence: 0.8,
      reason: `${lead}${b ? ` See also "${b.title}" (${by(b)}).` : ""} Source: Europe PMC.`,
    };
  }

  /**
   * A comparison outside medicine. "What are the main differences between proof
   * of work and proof of stake? Cite sources." searched the registry and Europe
   * PMC for "main differences between proof work proof stake", found nothing,
   * and answered no_evidence (rank-loss report F7). Each side of the comparison
   * is its own subject, so each is looked up in the encyclopedia and cited.
   */
  if (trials.length === 0 && lit.length === 0) {
    const sides = comparedSubjects(question);
    if (sides) {
      const pages = await Promise.all(sides.map((s) => findEncyclopediaBySearch(s)));
      if (pages.every((p): p is Citation => p !== null && p !== "unavailable")) {
        return {
          subject, trials: [], citations: pages, verdict: "evidence", confidence: 0.75,
          reason: pages.map((p) => `${p.title}: ${p.source.replace(/^Wikipedia:\s*/, "")}`).join(" ") +
            ` Sources: Wikipedia, "${pages[0]!.title}" and "${pages[1]!.title}".`,
        };
      }
    }
  }

  const gotTrials = trials;
  const gotLit = lit;
  const gotWiki = wiki;
  const allDown = anyIndexDown && gotTrials.length === 0 && gotLit.length === 0 && gotWiki === null;

  if (allDown) {
    return {
      ...empty, subject, verdict: "unavailable", confidence: 0,
      reason:
        `Neither the trial registry nor the literature index answered, so no cited evidence on ` +
        `${subject} could be gathered. That is a source outage rather than an absence of research, ` +
        `and the two are not the same thing.`,
      error: "upstream_unavailable",
    };
  }

  const citations = [...gotLit, ...(gotWiki ? [gotWiki] : [])];

  if (gotTrials.length === 0 && citations.length === 0) {
    return {
      ...empty, subject, verdict: "no_evidence", confidence: 0.6,
      reason:
        `No registered trial and no indexed publication on ${term} was found, so nothing is claimed ` +
        `about ${subject}. ClinicalTrials.gov and Europe PMC were both searched and both answered; ` +
        `an absence in those two indexes is not proof that no work exists.`,
    };
  }

  /**
   * The lead sentence carries the answer. Roughly 32 words are scored, so the
   * strongest citable fact goes first and the caveat goes last, never the other
   * way round.
   */
  /**
   * Of the trials that name the subject, lead with the one closest to what was
   * actually asked. "Will Lepodisiran reduce coronary plaque?" was being
   * answered with a liver-function study purely because the registry listed it
   * first, when a coronary-plaque study was in the same result set.
   */
  const asked = new Set((topicOf(subject).toLowerCase().match(/[a-z0-9-]{4,}/g) ?? []));
  const overlap = (title: string): number => {
    const t = title.toLowerCase();
    return [...asked].filter((w) => t.includes(w)).length;
  };
  const ranked = [...gotTrials].sort((a, b) => overlap(b.title) - overlap(a.title));

  const parts: string[] = [];
  const t = ranked[0];
  if (t) {
    const phase = t.phase ? `${t.phase} ` : "";
    const due = t.completion ? `, primary completion ${t.completion}` : "";
    const count = ranked.length > 1
      ? `${ranked.length} registered trials, including `
      : "one registered trial, ";
    // A single proper name is a grammatical subject. A topic phrase is not, and
    // reads as broken English when used as one.
    const lead = term.includes(" ")
      ? `Research on ${term} covers ${count}`
      : `${term} is the subject of ${count}`;
    parts.push(`${lead}${t.id}, a ${phase}study titled "${t.title}", currently ${t.status}${due}.`);
  }
  const c = gotLit[0];
  if (c) {
    parts.push(
      `The published evidence includes "${c.title}" by ${firstAuthor(c)}${c.year ? ` (${c.year})` : ""} in Europe PMC.`,
    );
  } else if (gotWiki) {
    parts.push(gotWiki.source);
  }
  if (isForwardLooking(question)) {
    // The caveat has to name what was actually found. Saying "the trial record
    // above" when the answer carries only a paper describes evidence that is
    // not there.
    const held = gotTrials.length ? "trial record" : gotLit.length ? "published work" : "source";
    // The LEAD trial's status, not any trial's. A finished liver-function study
    // does not mean the coronary-plaque question has been settled.
    parts.push(
      t && /completed|terminated/.test(t.status)
        ? `The outcome is reported in those records rather than predicted here.`
        : `No decision has been recorded, so the ${held} above is the evidence and the outcome is not predicted here.`,
    );
  }

  return {
    subject, trials: gotTrials, citations,
    verdict: "evidence", confidence: gotTrials.length ? 0.9 : 0.75,
    reason: parts.join(" "),
  };
}
