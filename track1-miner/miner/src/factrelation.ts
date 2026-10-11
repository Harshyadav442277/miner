/**
 * FACT_CHECK: whether a sentence ASSERTS a claim, for claims too short for word
 * overlap to mean anything.
 *
 * **The failure this exists to fix (GAPS G188).** settle() in factsubject.ts
 * settles a claim when two thirds of its key terms appear in a sentence of the
 * subject's article that names the subject. Take the subject's own words out of
 * "The Eiffel Tower is in Berlin" and one key is left, "berlin"; two thirds of
 * one is one. On 2026-10-11 production answered `supported`, quoting "During
 * World War I, the Eiffel Tower's wireless station played a crucial role in
 * intercepting enemy communications from Berlin." That is a co-occurrence, not
 * a statement, and every "X is in Y" / "X is Y" claim was settled the same way,
 * in either direction.
 *
 * So for a claim of one or two keys, a key counts only inside a clause that
 * states something of the subject, and a place only after a preposition that
 * puts something in it. When nothing states the claim, the article's lead may
 * still rule a place out — but only with a rival of the same kind: a thing in
 * Paris is not in Berlin, yet it is in France and in Europe.
 */

import { fold } from "./factwords";

interface Word {
  raw: string;
  f: string;
}

/**
 * Parentheticals and bracketed marks removed. The Eiffel Tower lead opens
 * "The Eiffel Tower (  EYE-fəl; French: Tour Eiffel [tuʁ ɛfɛl] ) is ...", and
 * that semicolon would otherwise cut the subject off from its own verb. Brackets
 * go first and parentheses innermost-out: the Taj Mahal's IPA, "[...mɛɦ(ɛ)l]",
 * nests a parenthesis inside a bracket inside a parenthesis.
 */
function bare(sentence: string): string {
  let s = sentence.replace(/\[[^\]]*\]/g, " ");
  while (/\([^()]*\)/.test(s)) s = s.replace(/\([^()]*\)/g, " ");
  return s;
}

function wordsOf(text: string): Word[] {
  return text
    .split(/[\s–—-]+/)
    .map((raw) => ({ raw, f: fold(raw.toLowerCase().replace(/[^a-z0-9]/g, "")) }))
    .filter((w) => w.f.length > 0);
}

const lettersOf = (w: Word) => w.raw.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Clauses, so a negation elsewhere in a long sentence does not flip the verdict.
 * A clause of capitalised words alone ("France." after "in Paris,") is an
 * appositive of the place before it, and stays in that place's clause.
 */
export function clausesOf(sentence: string): string[] {
  const out: string[] = [];
  for (const part of sentence.split(/,|;|\s+\b(?:and|but|although|though|while|whereas|because)\b\s+/i)) {
    const c = part.trim();
    if (!c) continue;
    if (out.length > 0 && /^[A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*)*[.!?]?$/.test(c)) out[out.length - 1] += `, ${c}`;
    else out.push(c);
  }
  return out;
}

/** Verbs through which a clause states something of its subject. */
const RELATION = new Set(
  ["is", "are", "was", "were", "be", "been", "remains", "remain", "became", "becomes", "lies", "lie",
    "stands", "stand", "sits", "sit", "located", "situated", "has", "have", "had"].map(fold),
);
const COPULA = new Set(["is", "are", "was", "were", "be", "been"].map(fold));

/**
 * Tense, compared on the letters rather than the folded form ("remained" and
 * "remains" fold alike). A present claim needs a present verb: "The statue
 * remained intact in Paris pending ... the pedestal" SUPPORTED "The Statue of
 * Liberty is in Paris" — where it was in 1884, not where it is.
 */
const PRESENT = new Set(["is", "are", "isnt", "arent", "lies", "lie", "stands", "stand", "sits", "sit",
  "remains", "remain", "has", "have", "becomes", "become", "located", "situated"]);
const PAST = new Set(["was", "were", "wasnt", "werent", "lay", "stood", "sat", "remained", "had", "became"]);

/** Whether the claim's own verb is present tense — the first verb either set knows. */
export function presentClaim(claim: string): boolean {
  for (const w of wordsOf(claim)) {
    if (PRESENT.has(lettersOf(w))) return true;
    if (PAST.has(lettersOf(w))) return false;
  }
  return false;
}

/** What a copula may be predicated of when the subject is not named in its clause. */
const GENERIC = new Set(
  ["it", "they", "this", "these", "those", "the", "a", "an", "all", "no", "none", "most", "many",
    "some", "each", "every", "both", "species"].map(fold),
);

/** Prepositions that put a thing IN a place. "near" and "from" do not. */
const LOCATIVE = new Set(["in", "at", "on", "within", "inside"]);
/**
 * Words a place name may carry after its preposition. The Colosseum's lead puts
 * it "in the centre of the city of Rome, Italy" — without the positional nouns
 * here, "The Colosseum is in Rome" lost the support it had before G188.
 */
const PLACE_LINK = new Set([
  "the", "of", "de", "du", "des", "la", "le", "del", "di", "da", "city", "town", "centre", "center",
  "heart", "middle", "north", "south", "east", "west", "northern", "southern", "eastern", "western",
  "central", "outskirts",
]);
/**
 * A preposition between the subject's verb and a place hands the place to
 * something else: "The Taj Mahal was designated as a UNESCO World Heritage Site
 * in 1983 FOR being the jewel of Muslim art in India" says nothing of where the
 * Taj Mahal is, though it is a headed clause with "in India" in it.
 */
const BREAK = new Set(["as", "for", "from", "by", "with", "to", "than", "like", "after", "before",
  "during", "since", "until", "against", "toward", "towards", "unlike", "about"]);

function names(w: Word, subjectTokens: Set<string>): boolean {
  return [...subjectTokens].some((st) => st.length >= 3 && (w.f === st || w.f.includes(st)));
}

/**
 * The clause states something OF the subject: it opens with the subject, not as
 * a possessive ("the Eiffel Tower's wireless station"), and a relation verb
 * follows within three words — "The Eiffel Tower is a lattice tower". Returns
 * the verb's index, or -1.
 */
function headed(words: Word[], subjectTokens: Set<string>): number {
  const start = words.findIndex((w) => names(w, subjectTokens));
  if (start < 0 || start > 3) return -1;
  let end = start;
  while (end + 1 < words.length && names(words[end + 1] as Word, subjectTokens)) end++;
  if (/['’]s?$/.test((words[end] as Word).raw.replace(/[^\w'’]+$/, ""))) return -1;
  const verb = words.slice(end + 1, end + 4).findIndex((w) => RELATION.has(w.f));
  return verb < 0 ? -1 : end + 1 + verb;
}

/**
 * The clause predicates a key with a copula, of the subject or of a generic
 * stand-in for it: "no species is truly blind", in a Bat article sentence that
 * names microbats. Something must precede the copula — a clause that opens on
 * one has borrowed its subject from a clause this test cannot see. Returns the
 * copula's index, or -1.
 */
function predicative(words: Word[], subjectTokens: Set<string>, keys: string[]): number {
  for (let v = 1; v < words.length; v++) {
    if (!COPULA.has((words[v] as Word).f)) continue;
    if (!words.slice(v + 1, v + 4).some((w) => keys.includes(w.f))) continue;
    if (words.slice(0, v).every((w) => GENERIC.has(w.f) || names(w, subjectTokens))) return v;
  }
  return -1;
}

/**
 * A relative clause in a later clause of a sentence the subject opens: "Big Ben
 * is the nickname for the Great Bell of the Great Clock of Westminster, and, by
 * extension, for the clock tower that stands at the north end of the Palace of
 * Westminster in London, England." Returns the index of the verb right after
 * the pronoun, or -1.
 */
function relative(words: Word[]): number {
  for (let r = 0; r + 1 < words.length; r++) {
    if (["which", "who", "that"].includes(lettersOf(words[r] as Word)) && RELATION.has((words[r + 1] as Word).f)) {
      return r + 1;
    }
  }
  return -1;
}

/** words[i] is in a place position: a locative preposition, then only the place's own name. */
function locative(words: Word[], i: number): boolean {
  for (let j = i - 1; j >= 0; j--) {
    const w = words[j] as Word;
    if (LOCATIVE.has(lettersOf(w))) return true;
    if (!PLACE_LINK.has(lettersOf(w)) && !/^[A-Z]/.test(w.raw)) return false;
  }
  return false;
}

/** The claim's keys that name where it puts the subject: "berlin" in "is in Berlin". */
export function placeKeys(claim: string, keys: string[]): Set<string> {
  const words = wordsOf(claim);
  return new Set(keys.filter((k) => words.some((w, i) => w.f === k && locative(words, i))));
}

/**
 * The keys a sentence ASSERTS of the subject, and the clause that asserts them.
 * A key counts only in a clause that is headed(), predicative() or relative() to
 * a headed sentence, whose verb agrees with a present claim's tense; a place key
 * only in a locative() position after that verb, with no BREAK preposition
 * between them. Null when no clause asserts any — the wireless-station sentence
 * of G188.
 */
export function assertedKeys(
  sentence: string,
  subjectTokens: Set<string>,
  keys: string[],
  places: Set<string>,
  present: boolean,
): { hit: number; clause: string } | null {
  let best: { hit: number; clause: string } | null = null;
  const clauses = clausesOf(bare(sentence));
  const opensOnSubject = headed(wordsOf(clauses[0] ?? ""), subjectTokens) >= 0;
  for (const clause of clauses) {
    const words = wordsOf(clause);
    let verb = headed(words, subjectTokens);
    if (verb < 0) verb = predicative(words, subjectTokens, keys);
    if (verb < 0 && opensOnSubject) verb = relative(words);
    if (verb < 0 || (present && !PRESENT.has(lettersOf(words[verb] as Word)))) continue;
    const placed = (i: number) =>
      i > verb && locative(words, i) && !words.slice(verb + 1, i).some((w) => BREAK.has(lettersOf(w)));
    const hit = keys.filter((k) => words.some((w, i) => w.f === k && (!places.has(k) || placed(i)))).length;
    if (hit > (best?.hit ?? 0)) best = { hit, clause };
  }
  return best;
}

/**
 * Places that rule each other out, one row per kind. Nothing here is also a
 * common word, a US state or a constituent country (England sits inside the
 * United Kingdom), and no entry lies inside another of its row (New Delhi is
 * inside Delhi, so only Delhi is listed). A short list is the point: a place
 * missing from it can never be contradicted, only left unverified.
 */
const PLACE_ROWS: string[][] = [
  ["africa", "antarctica", "asia", "europe", "north america", "south america", "oceania"],
  ["argentina", "australia", "austria", "belgium", "brazil", "canada", "chile", "china", "colombia",
    "cuba", "denmark", "egypt", "finland", "france", "germany", "greece", "india", "indonesia", "iran",
    "iraq", "italy", "japan", "kenya", "mexico", "morocco", "nepal", "netherlands", "new zealand",
    "nigeria", "norway", "pakistan", "peru", "poland", "portugal", "russia", "saudi arabia",
    "south africa", "south korea", "spain", "sweden", "switzerland", "thailand", "ukraine",
    "united kingdom", "united states", "vietnam"],
  ["amsterdam", "athens", "bangkok", "barcelona", "beijing", "berlin", "boston", "brussels",
    "buenos aires", "cairo", "chicago", "delhi", "dubai", "dublin", "florence", "hong kong", "istanbul",
    "kyoto", "lisbon", "london", "los angeles", "madrid", "mexico city", "milan", "moscow", "mumbai",
    "munich", "new york", "osaka", "paris", "prague", "rio de janeiro", "rome", "san francisco", "seoul",
    "shanghai", "stockholm", "sydney", "tokyo", "toronto", "venice", "vienna", "warsaw"],
];

/** Longest first, so "South Africa" is a country before "Africa" is a continent. */
const PLACES = PLACE_ROWS.flatMap((row, r) => row.map((p) => ({ phrase: p, parts: p.split(" "), row: r })))
  .sort((a, b) => b.parts.length - a.parts.length);

interface Place {
  phrase: string;
  row: number;
  at: number;
}

/**
 * Listed places named in the words, without overlaps. In article text only a
 * capitalised name counts ("fine china" is not a country); a claim's casing is
 * the asker's, so it is not held to that.
 */
function placesIn(words: Word[], proper = true): Place[] {
  const lower = words.map(lettersOf);
  const taken = new Set<number>();
  const out: Place[] = [];
  for (const p of PLACES) {
    for (let i = 0; i + p.parts.length <= lower.length; i++) {
      if (proper && !/^[A-Z]/.test((words[i] as Word).raw)) continue;
      if (p.parts.some((part, k) => lower[i + k] !== part || taken.has(i + k))) continue;
      p.parts.forEach((_, k) => taken.add(i + k));
      out.push({ phrase: p.phrase, row: p.row, at: i });
    }
  }
  return out;
}

/**
 * The listed place a claim of the form "X is in Y" puts its subject in. Only that
 * form: in "X was designed in London", London is where something happened.
 */
function claimedPlace(claim: string): Place | null {
  const m = claim.match(
    /\b(?:is|are|was|were|lies|lie|stands|stand|sits|sit)(?:n['’]t|\s+not)?\s+(?:(?:located|situated|based)\s+)?(?:in|at|within|inside)\s+(.+)$/i,
  );
  if (!m?.[1]) return null;
  const words = wordsOf(m[1]);
  const first = words[0] && lettersOf(words[0]) === "the" ? 1 : 0;
  return placesIn(words, false).find((p) => p.at === first) ?? null;
}

/** The opening sentences of an extract: where an article says where its subject is. */
const LEAD = 3;

/**
 * Index of a lead sentence that puts the subject in a place of the claimed
 * place's own kind, or -1. Never when any lead sentence names the claimed place
 * itself — the article is then not ruling it out, whatever else it says — and
 * only present against present: where a thing IS rules nothing out about where
 * it WAS, and a thing that was in Paris may be nowhere now.
 */
export function rivalPlace(claim: string, subjectTokens: Set<string>, sentences: string[]): number {
  const claimed = claimedPlace(claim);
  if (!claimed || !presentClaim(claim)) return -1;
  const lead = sentences.slice(0, LEAD).map((s) => wordsOf(bare(s)));
  if (lead.some((words) => placesIn(words).some((p) => p.phrase === claimed.phrase))) return -1;
  return lead.findIndex((words) => {
    const verb = headed(words, subjectTokens);
    return verb >= 0 && PRESENT.has(lettersOf(words[verb] as Word)) &&
      placesIn(words).some((p) => p.row === claimed.row && locative(words, p.at));
  });
}
