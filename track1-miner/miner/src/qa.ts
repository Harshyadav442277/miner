/**
 * QUESTION_ANSWERING: "open-domain and context-bounded user queries with cited
 * factual assertions and logical deductions" (canonical definition, 2026-10-13).
 *
 * The sources come first and are numbered: a passage the question supplies
 * (context-bounded), else the three closest English Wikipedia articles'
 * summaries (open-domain; CC BY-SA, cited by title and URL). A free Groq model
 * (llm.ts) phrases an answer from those sources only, citing each claim as [n].
 * The reply is kept only if every sentence carries a citation to a source that
 * exists; otherwise, or with no key, the answer is the source sentence that
 * best matches the question, quoted with its citation. Nothing uncited ships.
 */
import { phrase } from "./llm";

const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const WIKI = "https://en.wikipedia.org";
const TIMEOUT_MS = Number(process.env.QA_TIMEOUT_MS ?? 4_000);

export interface Source { n: number; title: string; url: string | null; kind: "supplied text" | "Wikipedia"; text: string }

export interface QaResult {
  question: string | null;
  verdict: "answered" | "not_in_sources" | "unknown";
  confidence: number;
  reason: string;
  error?: string;
  /** How the answer was written: phrased by a model from the sources, or quoted from them. */
  method?: "model_phrased_from_sources" | "extracted_from_sources";
  citations?: Array<Omit<Source, "text">>;
}

/** A passage the question supplies, and the question asked about it. Pure. */
export function suppliedContext(text: string): { context: string; question: string } | null {
  // Parsed with anchored labels and index searches rather than one pattern
  // over the whole passage: lazy spans around optional whitespace backtrack
  // on caller text, and a passage can be 6,000 characters long.
  const s = String(text ?? "").slice(0, 6_000).trim();
  const found = (context: string, question: string): { context: string; question: string } | null =>
    context.trim().length >= 40 && question.trim().length >= 3 ? { context: context.trim(), question: question.trim() } : null;

  // "Context: … \n Question: …"
  const label = s.match(/^(?:context|passage|text|document)\s{0,3}:/i);
  if (label) {
    const at = s.search(/\n[ \t]{0,8}(?:question|q)[ \t]{0,3}:/i);
    if (at > 0) return found(s.slice(label[0].length, at), s.slice(s.indexOf(":", at) + 1));
  }

  // "Based on the following text: … <question>?"
  const lead = s.match(/^(?:based on|according to|using|given|from)\s{1,3}(?:the\s{1,3})?(?:following|this|below)\s{1,3}(?:text|passage|context|paragraph|article|document)\s{0,3}[,:]/i);
  if (lead && s.endsWith("?")) {
    const body = s.slice(lead[0].length);
    let start = body.length - 2;
    while (start >= 0 && !/[.!\n]/.test(body[start]!)) start--;
    const question = body.slice(start + 1);
    if (/^\s*(?:what|who|when|where|why|how|which|is|are|was|were|does|do|did|can|according)\b/i.test(question)) return found(body.slice(0, start + 1), question);
  }

  // "<question>? \n Context: …"
  const nl = s.indexOf("\n");
  if (nl > 0) {
    const first = s.slice(0, nl).trim();
    const rest = s.slice(nl + 1).trimStart();
    const ctx = rest.match(/^(?:context|passage|text)\s{0,3}:/i);
    if (first.endsWith("?") && first.length <= 300 && ctx) return found(rest.slice(ctx[0].length), first);
  }
  return null;
}

const STOP = new Set("a an the of in on at to for and or is are was were be been what who whom whose when where why how which does do did can could should would will with by from about as that this these those it its into than then there their they have has had many much get got".split(" "));
const words = (s: string): string[] => String(s).toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => !STOP.has(w)) ?? [];
const IRREGULAR: Record<string, string> = { wrote: "writ", written: "writ", writer: "writ", writes: "writ", write: "writ", writing: "writ", author: "writ", authored: "writ" };
/**
 * Words reduced to a rough stem for matching only, so "Who painted the Mona
 * Lisa?" meets "a portrait painting by Leonardo" and "invented" meets
 * "inventor" (G207). Never used to build a search query.
 */
const stems = (s: string): string[] => words(s).map((w) => {
  const stem = w.replace(/(?:ings?|ers?|ors?|ions?|ed|es|e|s)$/, "");
  return IRREGULAR[w] ?? (stem.length >= 4 ? stem : w);
});

/**
 * Sentences, without breaking at an initial or an abbreviation: "succeeding
 * Steve Ballmer in 2014 as CEO and John W. Thompson" was cut at "W." (2026-10-14).
 */
export function sentences(text: string): string[] {
  const out: string[] = [];
  for (const piece of String(text).split(/(?<=[.!?])\s+(?=[A-Z"“(])/)) {
    const prev = out[out.length - 1];
    if (prev !== undefined && /(?:^|\s)(?:[A-Z]|Mr|Mrs|Ms|Dr|St|Jr|Sr|Inc|Ltd|Co|Corp|vs|No|U\.S)\.$/.test(prev)) out[out.length - 1] = `${prev} ${piece}`;
    else out.push(piece);
  }
  return out;
}

/**
 * 【1】 and ［1］, which gpt-oss writes, as [1]; and "Microsoft. [2]", a citation
 * after the full stop, as "Microsoft [2]." so the claim keeps its citation.
 */
export const normaliseCitations = (s: string): string =>
  s.replace(/[【［]\s*(\d+)\s*[】］]/g, "[$1]")
    .replace(/([.!?])\s*((?:\[\d+\]\s*)+)/g, (_m, stop: string, cites: string) => ` ${cites.replace(/\s+/g, "")}${stop} `)
    .replace(/\s+/g, " ").trim();

/**
 * Half a point for a sentence of the kind the question asks for: a number for
 * "how many", a year for "when", a capitalised name for "who". Without it "How
 * many moons does Mars have?" quoted a sentence about the moons' origin
 * (2026-10-14) over "The two moons of Mars are Phobos and Deimos."
 */
function cueBonus(question: string, sentence: string): number {
  const q = question.toLowerCase();
  if (/\bhow\s+(?:many|much)\b/.test(q)) return /\b(?:\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|dozen|hundred|thousand|million|billion)\b/i.test(sentence) ? 0.5 : 0;
  if (/^\s*when\b|\bwhat\s+year\b/.test(q)) return /\b(?:1[0-9]|20)\d{2}\b/.test(sentence) ? 0.5 : 0;
  if (/^\s*who\b/.test(q)) return /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(sentence) ? 0.5 : 0;
  return 0;
}

/**
 * How well an article's title fits the question, to break ties between
 * quoted sentences that share as many words with it. Pure.
 *
 * Wikipedia's search ranks a title that contains the question's words above
 * the article about them, and with no model the quote came from the first:
 * "Who wrote Pride and Prejudice?" quoted "Pride and Prejudice and Zombies
 * (film)", "What is the capital of Canada?" quoted "Capital punishment in
 * Canada" (G207, 2026-10-23). So: +1 when every title
 * word is in the question; −1 for a lowercase disambiguator the question does
 * not use, "(film)" or "(band)" but not "(Vivaldi)"; −1 for a common noun the
 * question does not use ("punishment"), or a "List of" page.
 */
export function titleFit(question: string, title: string): number {
  const asked = new Set(stems(question));
  const paren = String(title).match(/\s*\(([^)]*)\)\s*$/);
  const base = paren ? title.slice(0, paren.index) : String(title);
  const named = stems(base);
  let fit = named.length && named.every((w) => asked.has(w)) ? 1 : 0;
  if (paren && /^[a-z\d]/.test(paren[1]!) && stems(paren[1]!).some((w) => !asked.has(w))) fit -= 1;
  // The first word is capitalised by Wikipedia's style, so only later words show case.
  const common = base.split(/\s+/).slice(1).filter((t) => /^[a-z]/.test(t)).flatMap(stems).filter((w) => !asked.has(w));
  if (common.length || /^List of\b/.test(base)) fit -= 1;
  return fit;
}

/** A sentence defining a film, band or song: a title that only collides with the question's words. */
const WORK = /\b(?:film|movie|band|album|single|song|soundtrack|sitcom|miniseries|(?:television|tv|web)\s+series|video\s+game|musician|singer|rapper|episode)\b/i;
/** A question that is itself about a film or a recording. */
const ASKS_WORK = /\b(?:film|movie|band|album|song|series|show|episode|game|direct(?:ed|or)|star(?:red|ring|s)?|act(?:or|ress)|sang|sing(?:er|s)?|cast|soundtrack|box\s+office)\b/i;

/** The sentence in the sources that shares most words with the question. Pure. */
export function bestSentence(question: string, sources: Source[]): { sentence: string; n: number } | null {
  const want = new Set(stems(question));
  // Every number the question names must be in the sentence: for "the 2022
  // FIFA World Cup" the closest sentence came from the 2030 article and was
  // returned as the answer (2026-10-14). Without the numbers, half the words.
  const numbers = [...want].filter((w) => /^\d+$/.test(w));
  const needed = Math.max(1, Math.ceil(want.size / 2));
  const work = ASKS_WORK.test(question);
  let best = null as { sentence: string; n: number; rank: number } | null;
  for (const s of sources) {
    // A quarter point: the title breaks ties between sentences, it never
    // outweighs a word: "Canada is a country in North America" must not beat
    // "Ottawa is the capital city of Canada".
    const fit = s.kind === "Wikipedia" ? titleFit(question, s.title) / 4 : 0;
    for (const sentence of sentences(s.text)) {
      const has = new Set(stems(sentence));
      if (!numbers.every((n) => has.has(n))) continue;
      const score = [...want].filter((w) => has.has(w)).length + cueBonus(question, sentence);
      if (score < needed) continue;
      // A sentence defining a film or a band, for a question about neither,
      // is a title collision: "A Walk on the Moon is a 1999 American drama film".
      const rank = score + fit - (!work && WORK.test(sentence) ? 1.5 : 0);
      const text = sentence.trim();
      // On a tie the shorter sentence, which says the same in fewer words:
      // "Canberra is the capital city of Australia." over the ACT's definition.
      if (!best || rank > best.rank || (rank === best.rank && text.length < best.sentence.length)) best = { sentence: text, n: s.n, rank };
    }
  }
  return best ? { sentence: best.sentence, n: best.n } : null;
}

/** The capitalised or numbered run a question is about: "2022 FIFA World Cup", "Berlin Wall". Pure. */
export function subjectPhrase(question: string): string | null {
  const tokens = String(question).replace(/[?!.,;:]/g, " ").split(/\s+/).filter(Boolean);
  let best: string[] = [];
  let run: string[] = [];
  tokens.forEach((t, i) => {
    if (i > 0 && (/^[A-Z][\w'’-]*$/.test(t) || /^\d{2,4}$/.test(t))) run.push(t);
    else run = [];
    if (run.length > best.length) best = [...run];
  });
  return best.length >= 2 ? best.join(" ") : null;
}

/**
 * A model reply is kept only when every sentence cites a source that exists,
 * except a sentence saying what the sources do not cover. Pure.
 */
export function citedEverywhere(answer: string, count: number): boolean {
  const parts = answer.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return false;
  let cited = 0;
  const ok = parts.every((x) => {
    if (/^The sources do not\b/.test(x)) return !/\[\d+\]/.test(x) || [...x.matchAll(/\[(\d+)\]/g)].every((m) => Number(m[1]) >= 1 && Number(m[1]) <= count);
    const cites = [...x.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
    if (cites.length) cited++;
    return cites.length > 0 && cites.every((n) => n >= 1 && n <= count);
  });
  return ok && (cited > 0 || /^The sources do not say\.?$/.test(answer));
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

type Page = { title: string; fullurl?: string; extract?: string; index: number };

async function searchIntros(term: string): Promise<Page[]> {
  const j = (await getJson(`${WIKI}/w/api.php?action=query&generator=search&gsrlimit=4&prop=extracts%7Cinfo&exintro=1&explaintext=1` +
    `&inprop=url&format=json&origin=*&gsrsearch=${encodeURIComponent(term.slice(0, 200))}`)) as { query?: { pages?: Record<string, Page> } };
  return Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index);
}

/**
 * Up to five Wikipedia article intros. The whole question and its keywords are
 * both searched, because each finds what the other misses (2026-10-14): the
 * question found "Diffuse sky radiation" for "Why is the sky blue?" where the
 * keywords found only the colour; the keywords found "Satya Nadella" for "Who
 * is the current CEO of Microsoft?" where the question did not. `undefined` is
 * an outage.
 */
async function wikipediaSources(question: string): Promise<Source[] | undefined> {
  const keywords = words(question).filter((w) => !["current", "currently", "now", "today"].includes(w)).join(" ");
  // The subject phrase first: "the 2022 FIFA World Cup" searched as a whole
  // question found only the 2026 and 2030 tournaments.
  const phrase = subjectPhrase(question);
  const [titled, asked, keyed] = await Promise.all([
    phrase ? searchIntros(phrase).catch(() => null) : Promise.resolve([]),
    searchIntros(question).catch(() => null),
    keywords && keywords !== question.toLowerCase() ? searchIntros(keywords).catch(() => null) : Promise.resolve([]),
  ]);
  if (!titled && !asked && !keyed) return undefined;
  const merged: Page[] = [];
  for (let i = 0; i < 4; i++) {
    for (const p of [titled?.[i], asked?.[i], keyed?.[i]]) {
      // A disambiguation page answers nothing and took a slot from "Canberra".
      if (!p?.extract || /\(disambiguation\)$/.test(p.title) || merged.some((m) => m.title === p.title)) continue;
      merged.push(p);
    }
  }
  return merged.slice(0, 5).map((p, i) => ({
    n: i + 1, kind: "Wikipedia" as const, title: p.title,
    url: p.fullurl ?? `${WIKI}/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`, text: clip(p.extract!, i < 2 ? 1_600 : 600),
  }));
}

/**
 * An extract cut to `max` characters at a sentence end, so a cut never leaves
 * half a sentence to quote: "The Mona Lisa is one of the most valuable paint"
 * (2026-10-24). Only a first sentence longer than `max` is still cut. Pure.
 */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const all = sentences(text);
  let out = all[0]!.slice(0, max);
  for (const s of all.slice(1)) {
    if (out.length + 1 + s.length > max) break;
    out += ` ${s}`;
  }
  return out;
}

const SYSTEM =
  "Answer the question using only the numbered sources. Cite every sentence with the number of the source it comes from, as [1]. " +
  "A logical deduction is allowed when each premise is cited. If the sources answer only part of the question, answer that part and add one sentence beginning " +
  "'The sources do not' naming what is missing. If they contain none of the answer, reply exactly: The sources do not say. " +
  "At most 70 words, plain text, no preamble, no lists.";

export async function answerQuestion(text: string, contextParam = ""): Promise<QaResult> {
  const raw = String(text ?? "").trim().slice(0, 6_000);
  const supplied = contextParam.trim()
    ? { context: contextParam.trim().slice(0, 6_000), question: raw }
    : suppliedContext(raw);
  const question = (supplied?.question ?? raw).slice(0, 500);
  if (!question) {
    return { question: null, verdict: "unknown", confidence: 0, error: "no_question",
      reason: "No question was supplied, so nothing was answered. Ask it in the query, optionally with the passage to answer from." };
  }
  const sources: Source[] | undefined = supplied
    ? [{ n: 1, title: "The text supplied with the question", url: null, kind: "supplied text", text: supplied.context }]
    : await wikipediaSources(question);
  if (!sources) {
    return { question, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: "The question could not be answered because the reference source (Wikipedia) did not respond. This is an availability problem, not a finding about the question." };
  }
  const citations = sources.map(({ text: _t, ...c }) => c);
  if (!sources.length) {
    return { question, verdict: "not_in_sources", confidence: 0.3, citations,
      reason: "No reference article matching the question was found in Wikipedia, so no cited answer can be given. Supply a passage to answer from." };
  }
  const user = `${sources.map((s) => `[${s.n}] ${s.title}: ${s.text}`).join("\n\n")}\n\nQuestion: ${question}`;
  const reply = await phrase({ system: SYSTEM, user, maxTokens: 220 });
  const tidy = reply === null ? null : normaliseCitations(reply);
  const phrased = tidy && !/[.!?]$/.test(tidy) ? `${tidy}.` : tidy;
  const where = (n: number): string => sources[n - 1]!.kind === "Wikipedia" ? `Wikipedia's "${sources[n - 1]!.title}"` : "the supplied text";
  if (phrased && citedEverywhere(phrased, sources.length)) {
    const none = /^The sources do not say\.?$/.test(phrased);
    return { question, verdict: none ? "not_in_sources" : "answered", confidence: none ? 0.4 : 0.8, method: "model_phrased_from_sources", citations,
      reason: `${phrased}${none ? "" : ` Sources: ${[...new Set([...phrased.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))].map((n) => `[${n}] ${where(n)}`).join("; ")}.`}` };
  }
  const best = bestSentence(question, sources);
  if (!best) {
    return { question, verdict: "not_in_sources", confidence: 0.3, method: "extracted_from_sources", citations,
      reason: `The sources consulted (${sources.map((s) => where(s.n)).join(", ")}) do not contain a sentence that answers the question.` };
  }
  return { question, verdict: "answered", confidence: 0.6, method: "extracted_from_sources", citations,
    // Quoted with its article named, so a sentence that opens "He is…" still
    // says who it is about.
    reason: `From ${where(best.n)}: "${best.sentence}" [${best.n}] This sentence is quoted from the source, not phrased.` };
}
