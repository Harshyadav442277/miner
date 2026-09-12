/**
 * RESEARCH_SYNTHESIS — findings gathered across several sources and combined.
 *
 * The canonical description: "gather findings across multiple sources and
 * synthesise them into a combined answer or summary, rather than returning a
 * single fact or a list of links", as distinct from RESEARCH_QUERY (/research),
 * which wants one cited answer to one question.
 *
 * EXTRACTIVE, NEVER GENERATIVE. There is no model here. Every finding in an
 * answer is a sentence quoted from a named study's abstract, attributed to its
 * first author, year and PubMed id. The synthesis is the selection and the
 * ordering, and the count of how many independent studies were read; nothing is
 * stated that a cited abstract does not state, and whether the studies AGREE is
 * explicitly not claimed, because judging that is exactly what a rule cannot do
 * honestly.
 *
 * TWO REQUEST SHAPES, both seen in the explorer feed on 2026-09-12:
 *   1. A topic — "Summarize what the latest studies say about coffee's effect on
 *      longevity, across multiple sources." Answered from Europe PMC and PubMed.
 *   2. Supplied notes — "Summarise these notes on <topic> in one paragraph …
 *      adding nothing that is not in the notes. Notes: - … (Source, date)". The
 *      two routed questions of this intent in the feed are this shape. Nothing
 *      is fetched: the notes are grouped by their attribution and restated with
 *      the attributions kept, and when no note addresses the stated topic the
 *      answer says so instead of pretending they do.
 */
import { mentions, topicOf } from "./research";
import { dateWindow } from "./papers";
import { europePmc, pubmed, type Study } from "./synthesis-sources";

export type SynthesisVerdict = "synthesis" | "single_source" | "no_sources" | "unavailable" | "unknown";

export interface SynthesisResult {
  verdict: SynthesisVerdict;
  confidence: number;
  reason: string;
  sources: string[];
  error?: string;
}

export interface Note { text: string; attribution: string | null }

/** Bulleted or numbered note lines, each with its trailing "(Source, date)" kept apart. */
const ATTRIBUTION = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/;

function toNote(line: string): Note[] {
  const l = line.trim();
  if (!l) return [];
  const attr = l.match(ATTRIBUTION);
  const text = attr ? l.slice(0, attr.index).trim() : l;
  return [{ text: text || l, attribution: attr?.[1]?.trim() ?? null }];
}

export function parseNotes(question: string): Note[] {
  const s = String(question ?? "");
  const block = s.match(/\bnotes?\s*:\s*\n([\s\S]*)$/i)?.[1] ?? s;
  const lines = [...block.matchAll(/^\s*(?:[-*•]|\d{1,2}[.)])\s+(.+?)\s*$/gm)].flatMap((m) => toNote(m[1] ?? ""));
  if (lines.length >= 2) return lines;
  return inlineNotes(s) ?? lines;
}

/**
 * Notes run together on one line: "Notes: - A (X, 1) - B (Y, 2) Now write it."
 * Split on " - " bullets, but a piece without a closing attribution is rejoined
 * to the next, so a hyphen inside a title ("Storm - Mali (NASA, 1)") survives.
 * Only accepted when every note carries an attribution; otherwise null.
 */
export function inlineNotes(question: string): Note[] | null {
  const m = String(question ?? "").match(/\bnotes?\s*:\s*[-*•]\s+([^\n]+)$/i);
  if (!m?.[1]) return null;
  const pieces = m[1].split(/\s+[-*•]\s+/);
  const merged: string[] = [];
  let carry = "";
  for (const p of pieces) {
    const joined = carry ? `${carry} - ${p}` : p;
    if (ATTRIBUTION.test(joined.trim())) { merged.push(joined); carry = ""; } else carry = joined;
  }
  // Trailing instruction after the last attribution: "(NASA, 2026-09-10) Now write that paragraph."
  if (carry) {
    const tail = carry.match(/^(.*\))\s+[A-Z][^()]*$/);
    if (!tail?.[1]) return null;
    merged.push(tail[1]);
  }
  const notes = merged.flatMap(toNote);
  return notes.length >= 2 && notes.every((n) => n.attribution) ? notes : null;
}

/** The topic a notes request names: "these notes on X in one paragraph". */
export function notesTopic(question: string): string | null {
  const m = String(question ?? "").match(/\bnotes\s+(?:on|about|regarding|covering)\s+(.+?)(?:\s+in(?:to)?\s+(?:one|a|two|three|\d+)\s+paragraphs?\b|\s*[,.:\n])/i);
  return m?.[1]?.trim() || null;
}

const lister = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number): string => NUMBER_WORDS[n] ?? String(n);

export function synthesiseNotes(question: string, notes: Note[]): SynthesisResult {
  const bySource = new Map<string, number>();
  for (const n of notes) {
    const src = n.attribution?.split(",")[0]?.trim() || "an unattributed source";
    bySource.set(src, (bySource.get(src) ?? 0) + 1);
  }
  const lead =
    `The notes report ${count(notes.length)} item${notes.length === 1 ? "" : "s"}, ` +
    `${lister([...bySource].map(([src, n]) => `${count(n)} from ${src}`))}.`;
  const body = notes.map((n) => `${n.text.replace(/[.;]+$/, "")}${n.attribution ? ` (${n.attribution})` : ""}.`).join(" ");
  const topic = notesTopic(question);
  const words = topic ? topicWords(topic) : [];
  const addressed = words.length === 0 || notes.some((n) => words.some((w) => hasWord(n.text, w)));
  const caveat = topic && !addressed
    ? ` None of the notes addresses ${topic}, so nothing about it is stated here.`
    : "";
  return {
    verdict: "synthesis", confidence: addressed ? 0.9 : 0.6, sources: [...bySource.keys()],
    reason: `${lead} ${body}${caveat}`,
  };
}

/** Words that frame a synthesis request but never appear in a finding about the subject. */
const FRAME = new Set([
  "summarize", "summarise", "summary", "synthesize", "synthesise", "synthesis", "latest", "recent", "new",
  "studies", "study", "research", "literature", "sources", "multiple", "across", "effect", "effects", "impact",
  "role", "known", "everything", "major", "findings", "evidence", "what", "say", "says", "papers", "all",
  // Function words topicOf keeps. "over" matched "Dust Storm Sweeps Over Mali" and
  // made an unrelated note look as though it addressed the requested topic.
  "over", "under", "help", "how", "use", "using", "between", "among", "about", "than", "then", "its", "their",
]);

export function topicWords(topic: string): string[] {
  return topicOf(topic).toLowerCase().replace(/['’]s\b/g, "").split(/\s+/)
    .filter((w) => w.length >= 3 && !FRAME.has(w)).slice(0, 4);
}

/** The subject of a topic request. */
export function synthesisTopic(question: string): string | null {
  const s = String(question ?? "").replace(/\s+/g, " ").trim();
  const m = s.match(/\b(?:about|on|regarding|of)\s+(.+?)(?:,|\s+across\b|\s+from\s+(?:multiple|several|many|the)\b|\s+in\s+(?:one|a)\s+paragraph\b|[.?!]|$)/i);
  const t = (m?.[1] ?? s).trim();
  return topicWords(t).length ? t : null;
}

/**
 * A finding states a result, so a sentence without a result verb is never quoted
 * as one. This is a requirement, not a bonus: on 2026-09-13 the verifier found
 * Maruthai et al. (PMID 40189644, pest detection in coffee plants) quoted for
 * "the longevity of the coffee business is of paramount significance", a
 * sentence that names both topic words and states no result.
 */
const CUES = new RegExp([
  // Reporting verbs. Bare nouns such as "benefits", "increase" or "reduced" are
  // NOT cues on their own: measured live 2026-09-13, "reduced meal frequency" (a
  // search keyword list), "potential health benefits" (background) and "terrible
  // increase in annual emissions" (background) all passed a noun-level cue.
  String.raw`\b(?:conclu(?:de|des|ded|sion|sions)|suggest(?:s|ed|ing)?|indicat(?:e|es|ed|ing|ion)|associat(?:ed|ions?)\s+(?:with|between)|found|findings?\s+(?:suggest|show|indicate|reveal|support)|show(?:s|ed|n)?|demonstrat(?:e|es|ed|ing)|reveal(?:s|ed)?|observed|linked\s+(?:to|with)|correlat(?:ed|es|ion)\s+(?:with|between)|no\s+significant|significantly|effective(?:ness)?\s+(?:in|for|at)|resulted\s+in|led\s+to|did\s+not|does\s+not|do\s+not|has\s+the\s+potential|have\s+the\s+potential)\b`,
  String.raw`\b(?:reduces|increases|decreases|improves|lowers|raises|protects|promotes|prevents|worsens)\b`,
  String.raw`\b(?:reduced|increased|decreased|improved|lowered|raised)\s+(?:the\s+)?(?:\w+\s+)?(?:risk|weight|mortality|levels?|incidence|symptoms?|markers?|scores?|pressure|glucose|inflammation|fat|mass|odds|rates?|severity)\b`,
  String.raw`\b(?:may|might|can|could|did|does|to)\s+(?:\w+\s+)?(?:reduce|increase|decrease|lower|improve|protect|contribute|promote|prevent|harm|affect|worsen|extend)\b`,
  String.raw`\b(?:was|were|is|are|be|been|remained)\s+(?:\w+\s+)?(?:lower|higher|greater|smaller|superior|inferior|comparable|similar|equivalent|non-inferior|associated|linked|related|effective|beneficial|harmful|protective|safe)\b`,
  String.raw`\b(?:similar|greater|more|less|fewer)\s+(?:\w+\s+){0,3}(?:than|compared)\b`,
].join("|"), "i");

/** Methods and background that can carry a reporting word: search strategies, sampling, "concerns were raised". */
const NOT_A_RESULT = new RegExp([
  String.raw`\b(?:searched|search(?:es)?\s+(?:was|were|of|in|through|from)|databases?|MEDLINE|EMBASE|Scopus|Web\s+of\s+Science|Cochrane\s+Library|inclusion\s+criteria|key\s?words|yielded\s+\d+|PRISMA)\b`,
  String.raw`\b(?:were|was)\s+(?:recruited|randomi[sz]ed|enrolled|included|measured|collected|assessed\s+using|analy[sz]ed\s+using)\b`,
  String.raw`\b(?:techniques?|methods?|methodolog\w*|protocols?|instruments?)\b[^.]*\b(?:vary|varied|differ|differed)\b`,
  String.raw`\b(?:(?:is|are)\s+(?:widely\s+|increasingly\s+|often\s+|commonly\s+)?(?:seen|regarded|considered|viewed|proposed|recognized|recognised)\s+as|concerns?\s+(?:were|was|have\s+been|has\s+been)\s+raised|attract\w*\s+(?:considerable\s+|increasing\s+|growing\s+)?(?:interest|attention)|(?:gained|garnered|received)\s+(?:\w+\s+)?(?:interest|attention|popularity)|become\s+(?:very\s+|increasingly\s+)?popular|(?:has|have)\s+not\s+been\s+(?:widely\s+|well\s+|fully\s+)?(?:studied|examined|investigated|explored|established)|remains?\s+(?:unclear|controversial|uncertain|poorly\s+understood|unknown))\b`,
].join("|"), "i");

/**
 * Not findings: statements of purpose ("To examine the evidence for intermittent
 * fasting …", Welton et al. 2020's Objective line, verifier 2026-09-13; "The
 * objective of this review is …", Patterson, 2026-09-12), methods ("We searched
 * MEDLINE …"), background attributed to earlier work ("Previous research has
 * shown …", Kunutsor 2025), and calls for more research.
 */
const PURPOSE = new RegExp([
  String.raw`^(?:objectives?|aims?|purpose|background|introduction|methods?|design|context|importance)\s*[:.-]`,
  String.raw`^to\s+(?:examine|assess|evaluate|determine|investigate|identify|compare|explore|review|summari[sz]e|describe|quantify|analy[sz]e|characteri[sz]e|test|estimate|understand|provide|synthesi[sz]e|clarify|update|establish|report|appraise|address)\b`,
  String.raw`^(?:(?:previous|prior|earlier|existing|many|several|some|numerous)\s+(?:research|studies|work|evidence|reports|trials))\b`,
  String.raw`^the\s+(?:main\s+|primary\s+)?(?:objective|aim|purpose|goal)s?\s+(?:of|was|is)\b`,
  String.raw`^(?:this|the\s+present|the\s+current|our)\s+(?:systematic\s+|narrative\s+|comprehensive\s+|scoping\s+)?(?:review|study|article|paper|meta-analysis|manuscript|analysis|work)\s+(?:aims?|aimed|investigat\w*|examin\w*|evaluat\w*|assess\w*|explor\w*|provid\w*|summari[sz]\w*|synthesi[sz]\w*|highlight\w*|review\w*|analy[sz]\w*|describ\w*|discuss\w*|emphasi[sz]\w*|focus\w*|seeks?|sought|presents?|was\s+designed|is\s+designed)\b`,
  String.raw`^(?:we|here,?\s+we|herein,?\s+we)\s+(?:aim\w*|sought|seek|review\w*|describ\w*|present\w*|propos\w*|search\w*|conduct\w*|perform\w*|investigat\w*|examin\w*|evaluat\w*|assess\w*|analy[sz]\w*|compar\w*|includ\w*|identif\w*|explor\w*|summari[sz]\w*|discuss\w*|highlight\w*|used|recruited|enrolled|collected)\b`,
  String.raw`^in\s+this\s+(?:systematic\s+|narrative\s+)?(?:review|study|article|paper|meta-analysis)\b`,
  String.raw`\b(?:further|future|more|additional|longer-term)\s+(?:\w+\s+)?(?:research|studies|investigations?|trials|work)\s+(?:is|are)\s+(?:needed|required|warranted|recommended)\b`,
].join("|"), "i");

/** "X is a …" / "X are plastic particles …": a definition, which is background rather than a result. */
const DEFINITION = /^[A-Z][\w\s()'’-]{0,60}?\s(?:is|are)\s+(?:an?|the)?\s*(?:\w+\s+){0,3}(?:defined|characteri[sz]ed|described|known|considered|referred|widely|commonly|highly|complex|chronic|group|class|type|form|source|matrix|condition|disease|disorder|particles?|compounds?|protein|beverage|practice|approach|method|pattern|strategy|diet)\b/;

/**
 * A topic word present as a WORD, optionally plural. A substring test let "com"
 * (from "github.com") match "computational" in a title on 2026-09-13.
 */
export function hasWord(text: string, word: string): boolean {
  const singular = word.length > 4 ? word.replace(/s$/i, "") : word;
  const esc = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(String.raw`(?:^|[^\p{L}\p{N}])(?:${esc(word)}|${esc(singular)})(?:s|es)?(?![\p{L}\p{N}])`, "iu").test(String(text ?? ""));
}

/** The abstract sentence that best states a finding about the topic, or null. */
export function findingSentence(abstract: string, words: string[], title = ""): string | null {
  const sentences = abstract.split(/(?<=[.!?])\s+(?=[A-Z(])/).map((x) => x.trim()).filter(Boolean);
  const need = Math.min(2, words.length);
  let best: { s: string; score: number } | null = null;
  sentences.forEach((sentence, i) => {
    const hits = words.filter((w) => hasWord(sentence, w)).length;
    const wordCount = sentence.split(/\s+/).length;
    if (hits < need || wordCount > 45 || wordCount < 6) return;
    /**
     * Every topic word must be in the title or the quoted sentence itself. Measured
     * live 2026-09-13: for "intermittent fasting and weight loss", Barati et al.
     * (PMID 37572827, autoimmune disease) was quoted for a sentence naming
     * intermittent fasting and no weight loss at all.
     */
    if (title && !words.every((w) => hasWord(sentence, w) || hasWord(title, w))) return;
    if (PURPOSE.test(sentence) || DEFINITION.test(sentence) || NOT_A_RESULT.test(sentence) || !CUES.test(sentence)) return;
    // An abstract's opening sentence is its background unless it reports a result.
    if (i === 0 && sentences.length >= 4 && !/\b(?:we\s+found|results?|conclu\w*|this\s+(?:study|trial|meta-analysis)\s+(?:found|shows?|showed|demonstrat\w*))\b/i.test(sentence)) return;
    const score = hits * 2 + (i >= sentences.length - 3 ? 1 : 0);
    if (!best || score > best.score) best = { s: sentence, score };
  });
  return (best as { s: string } | null)?.s ?? null;
}

const cite = (s: Study): string => `${s.firstAuthor ? `${s.firstAuthor} et al.` : "One study"} (${s.year ?? "n.d."}, ${s.id})`;

export async function synthesise(question: string, topicParam = ""): Promise<SynthesisResult> {
  const q = String(question ?? "").trim();
  const notes = parseNotes(q);
  if (notes.length >= 2) return synthesiseNotes(q, notes);

  const topic = String(topicParam ?? "").trim() || synthesisTopic(q);
  const words = topic ? topicWords(topic) : [];
  if (!topic || words.length === 0) {
    return {
      verdict: "unknown", confidence: 0, sources: [], error: "no_topic",
      reason:
        "No research topic could be read from this request, so there is nothing to synthesise. Name the subject, " +
        "for example: Summarize what recent studies say about coffee and longevity, across multiple sources.",
    };
  }
  const { from } = dateWindow(q);
  const fromYear = from ? Number(from.slice(0, 4)) : /\b(?:latest|recent|new|current)\b/i.test(q) ? new Date().getUTCFullYear() - 5 : null;
  const [epmc, pm] = await Promise.all([europePmc(words, fromYear), pubmed(words, fromYear)]);
  if (epmc === "unavailable" && pm === "unavailable") {
    return {
      verdict: "unavailable", confidence: 0, sources: [], error: "upstream_unavailable",
      reason:
        `Neither Europe PMC nor PubMed answered, so no findings on ${topic} could be gathered. That is a source ` +
        `outage rather than an absence of research on it.`,
    };
  }
  const seen = new Set<string>();
  const findings: Array<{ study: Study; sentence: string }> = [];
  for (const study of [...(pm === "unavailable" ? [] : pm), ...(epmc === "unavailable" ? [] : epmc)]) {
    const key = study.title.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (seen.has(key) || !words.some((w) => hasWord(study.title, w))) continue;
    if (!mentions(`${study.title} ${study.abstract}`, words.join(" "))) continue;
    const sentence = findingSentence(study.abstract, words, study.title);
    if (!sentence) continue;
    seen.add(key);
    findings.push({ study, sentence });
    if (findings.length === 3) break;
  }
  const down = epmc === "unavailable" ? " Europe PMC did not respond, so only PubMed was read." : pm === "unavailable" ? " PubMed did not respond, so only Europe PMC was read." : "";
  const method = ` Each finding is quoted from that study's abstract; whether the studies agree is not assessed here.${down}`;
  const sources = findings.map((f) => cite(f.study));

  if (findings.length === 0) {
    return {
      verdict: "no_sources", confidence: 0.5, sources,
      reason:
        `No indexed study whose title and abstract both address ${topic} stated a finding that could be quoted, so ` +
        `nothing is claimed about it. PubMed and Europe PMC were searched; an absence there is not proof that no work exists.${down}`,
    };
  }
  const quoted = findings.map((f) => `${cite(f.study)}: "${f.sentence.replace(/[.]$/, "")}."`).join(" ");
  if (findings.length === 1) {
    return {
      verdict: "single_source", confidence: 0.5, sources,
      reason: `Only one indexed study on ${topic} stated a quotable finding, so no synthesis across sources is possible. ${quoted}${method}`,
    };
  }
  return {
    verdict: "synthesis", confidence: 0.75, sources,
    reason: `Across ${count(findings.length)} studies on ${topic}, the findings are: ${quoted}${method}`,
  };
}
