/**
 * FACT_CHECK, step one: resolve the claim's SUBJECT, then read that article.
 *
 * **The failure this exists to fix.** `factcheck.ts` asked Wikipedia's full-text
 * search for the whole claim and graded the hits. Full-text search ranks on term
 * frequency, so "Bats are the only mammals capable of sustained flight" retrieved
 * the article **Flight** — which contains "flight" many times and bats once — and
 * the answer was `unverified`. The Bat article's first sentence is the claim,
 * near verbatim. Likewise "sharks are mammals" retrieved **Shark attack**, and
 * "bats are blind" retrieved **The Blind Watchmaker**, a book about evolution.
 *
 * A claim is about its subject. Resolve the subject noun phrase to its canonical
 * article FIRST, read that one article, and only then decide. The predicate is
 * what we look for inside it, not what we search the encyclopaedia for.
 *
 * **What is deliberately NOT done here.** No verdict is inferred from an article
 * merely being on topic — that is the trap `judge()` in factcheck.ts documents at
 * length, which rated "vaccines cause autism" as supported because the article
 * refuting it contains every word of it. Support here requires a sentence that
 * asserts the relation, in the subject's own article, with no negation and no
 * "it is claimed that" framing. Anything else returns null and the caller keeps
 * its honest `unverified`.
 */

/** A word reduced to a comparable form. Crude on purpose; see fold(). */
function stemWord(w: string): string {
  if (/^\d+$/.test(w)) return w;
  if (w.length > 5 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/**
 * The comparison form used on BOTH sides of every test in this file.
 *
 * It drops a trailing "e" after stemming so that "vaccines" (stem `vaccin`) and
 * "vaccine" land on the same token — without it the subject "vaccines" scored
 * zero against the title "Vaccine" and picked `Vaccines and autism` instead.
 * `factcheck.ts` keeps its own `stem`, unchanged, for the fallback search path.
 */
function fold(w: string): string {
  const s = stemWord(w);
  return s.length > 4 && s.endsWith("e") ? s.slice(0, -1) : s;
}

const STOP = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or", "is", "are", "was", "were",
  "be", "been", "am", "it", "its", "their", "there", "with", "from", "by", "as", "than", "then",
  "not", "no", "but", "if", "so", "up", "out", "all", "any", "each", "per", "via",
]);

/** Content tokens, folded. Short words are KEPT — the subject may be "bat". */
export function contentTokens(s: string): string[] {
  return String(s ?? "")
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(fold);
}

/**
 * Verbs and auxiliaries that close a claim's subject noun phrase.
 *
 * Deliberately a closed list rather than a heuristic. When nothing matches we
 * return "" and the caller falls back to the existing full-text search, which is
 * the behaviour every pre-existing test pins. Guessing "the first three words"
 * was tried and mis-read "water boils at 100 degrees Celsius" as being about
 * *Water*, displacing the `Boiling_point` article that case is pinned on.
 */
const PREDICATE_HEAD =
  /\b(?:isn't|is|aren't|are|wasn't|was|weren't|were|hasn't|has|haven't|have|hadn't|had|cannot|can't|can|couldn't|could|won't|will|wouldn't|would|shouldn't|should|doesn't|does|don't|do|didn't|did|may|might|must|only|never|always|causes|cause|caused|contains|contain|contained|consists|consist|makes|make|made|uses|use|used|lives|live|lived|eats|eat|orbits|orbit|emits|emit|kills|kill|holds|hold|weighs|weigh|measures|measure|produces|produce|becomes|become|became|remains|remain|means|mean|meant|comes|come|came)\b/i;

/**
 * The grammatical subject of the claim, as a search phrase.
 *
 * "Bats are the only mammals capable of sustained flight" -> "Bats".
 * "the Eiffel Tower is located in Paris" -> "Eiffel Tower" (the article is
 * stripped: Wikipedia's title search returns *The Eiffel Tower*, a Barthes
 * essay, for the phrase with "the" on the front).
 * "Will Sudan violence escalate further" -> "" — a question, not a claim.
 */
export function extractSubject(claim: string): string {
  const s = String(claim ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const m = s.match(PREDICATE_HEAD);
  if (!m || m.index === undefined || m.index === 0) return "";
  let head = s.slice(0, m.index);
  head = head.replace(/^\s*(?:the|a|an)\s+/i, "");
  head = head.replace(/[^A-Za-z0-9\s'-]+/g, " ").replace(/\s+/g, " ").trim();
  head = head.replace(/\s+\b(?:also|even|still|really|actually|generally|usually|often|now)\b$/i, "").trim();
  if (head.split(" ").length > 6) return "";
  return head;
}

/** Relational filler: words the evidence need not repeat to assert the relation. */
const LIGHT = new Set(
  [
    "located", "situated", "find", "found", "known", "called", "considered", "said", "really",
    "actually", "also", "very", "such", "like", "about", "into", "have", "has", "had", "been",
    "being", "can", "could", "would", "should", "will", "may", "might", "must", "does", "did",
    "which", "that", "they", "them", "these", "those", "when", "where", "what", "how", "who",
  ].map(fold),
);

/**
 * A negation or refutation, either in the claim or in the evidence clause.
 * Polarity is compared, not asserted: a negated claim met by negated evidence is
 * supported ("sharks are not mammals" against "Sharks are a group of ... fishes").
 */
const NEGATION =
  /\b(?:not|never|none|no|cannot|can't|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|nor|without|myth|mythical|misconception|debunked|disproven|disproved|refuted|hoax|falsely|incorrectly|untrue|false|fictional)\b/i;

/**
 * The sentence reports a claim rather than making one. Such a sentence may still
 * CONTRADICT (an encyclopaedia calling something a myth is an assertion), but it
 * can never be read as support — this is the guard that stops an article quoting
 * a piece of misinformation from being mistaken for the article endorsing it.
 */
const REPORTED =
  /\b(?:claim|claims|claimed|claiming|alleged|allegedly|belief|beliefs|believed|believe|purported|purportedly|supposed|supposedly|rumor|rumour|rumored|rumoured|myth|legend|folklore|misconception|anecdotal|factoid|factoids|reportedly|according)\b/i;

const COPULA = new Set(
  ["is", "are", "was", "were", "belong", "belongs", "classified", "comprise", "comprises",
    "refers", "denotes", "means"].map(fold),
);

/**
 * The sentence CLASSIFIES the subject: the subject opens it and a copula follows
 * within a few words — "Sharks are a group of ... fishes".
 *
 * This positional test is the difference between a verdict and a coincidence.
 * Two sentences from the Shark article both name sharks and mammals and both
 * answered "sharks are mammals" as **supported** while this test was too loose:
 * "Tooth shape depends on the shark's diet: ... those that feed on larger prey
 * such as mammals have pointed lower teeth", and "Sharks possess brain-to-body
 * mass ratios that are similar to mammals and birds". Neither says what a shark
 * IS. So the copula must be the subject's own — within three words of it, with
 * parentheticals removed first so the Bat article's "(order Chiroptera)" does
 * not push its own copula out of reach.
 */
function classifiesSubject(sentence: string, subjectTokens: Set<string>): boolean {
  const words = sentence
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .split(/\s+/)
    .slice(0, 12)
    .map((w) => fold(w.toLowerCase().replace(/[^a-z0-9]/g, "")))
    .filter((w) => w.length > 0);
  let subjectAt = -1;
  let copulaAt = -1;
  for (let i = 0; i < words.length; i++) {
    const w = words[i] as string;
    if (subjectAt < 0 && [...subjectTokens].some((st) => st.length >= 3 && w.includes(st))) subjectAt = i;
    if (copulaAt < 0 && COPULA.has(w)) copulaAt = i;
  }
  return subjectAt >= 0 && subjectAt < 4 && copulaAt > subjectAt && copulaAt - subjectAt <= 3;
}

/**
 * Mutually exclusive classes. Membership of one rules out the others in the same
 * row, which is how "sharks are mammals" is refuted by a sentence that never uses
 * the word "mammal": the Shark article's first sentence says "cartilaginous
 * fishes", and fish and mammal cannot both be true of the same group.
 */
const CLASS_ROWS: string[][] = [
  ["mammal", "mammals", "bird", "birds", "fish", "fishes", "reptile", "reptiles", "amphibian",
    "amphibians", "insect", "insects", "arachnid", "arachnids", "crustacean", "crustaceans",
    "mollusc", "molluscs", "mollusk", "mollusks", "fungus", "fungi", "plant", "plants",
    "bacterium", "bacteria", "virus", "viruses", "alga", "algae"],
  ["planet", "planets", "star", "stars", "moon", "moons", "asteroid", "asteroids", "comet",
    "comets", "galaxy", "galaxies", "constellation", "constellations"],
  ["metal", "metals", "nonmetal", "nonmetals", "mineral", "minerals", "gas", "gases", "liquid",
    "liquids", "solid", "solids"],
  ["country", "countries", "city", "cities", "continent", "continents", "island", "islands",
    "river", "rivers", "mountain", "mountains", "lake", "lakes", "ocean", "oceans", "sea", "seas"],
];

const CLASS_OF = new Map<string, number>();
for (let row = 0; row < CLASS_ROWS.length; row++) {
  for (const w of CLASS_ROWS[row] ?? []) CLASS_OF.set(fold(w), row);
}

/**
 * Sentences of a plain-text Wikipedia extract, in document order, lead first.
 * Section markers ("==== Vision ====") are dropped rather than glued to the
 * sentence that follows them.
 */
export function sentencesOf(text: string): string[] {
  return String(text ?? "")
    .slice(0, 120000)
    .replace(/={2,}[^=\n]*={2,}/g, " ")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(“])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25);
}

/** Clauses, so a negation elsewhere in a long sentence does not flip the verdict. */
function clausesOf(sentence: string): string[] {
  return sentence
    .split(/,|;|\s+\b(?:and|but|although|though|while|whereas|because)\b\s+/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export interface Settlement {
  verdict: "supported" | "contradicted";
  /** The exact sentence that settles it. */
  evidence: string;
  /** Index into the scanned sentence list, so the caller can quote context. */
  at: number;
}

/**
 * Whether any sentence of the subject's article asserts, or rules out, the
 * relation the claim asserts. Returns null when none does — which is the common
 * case and an honest `unverified`, not a failure.
 */
export function settle(claim: string, subject: string, sentences: string[]): Settlement | null {
  const subjectTokens = new Set(contentTokens(subject));
  if (subjectTokens.size === 0) return null;
  const keys = [...new Set(contentTokens(claim))].filter((t) => !subjectTokens.has(t) && !LIGHT.has(t));
  if (keys.length === 0) return null;
  const need = Math.max(1, Math.ceil(keys.length * (2 / 3)));
  const claimNegated = NEGATION.test(claim);
  const claimClassTerm = keys.find((k) => CLASS_OF.has(k));
  const claimClass = claimClassTerm === undefined ? undefined : CLASS_OF.get(claimClassTerm);

  let best: Settlement | null = null;
  let bestHit = 0;
  let classHit: Settlement | null = null;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i] as string;
    const tokens = new Set(contentTokens(sentence));
    // Every sentence in this article is about the subject, but requiring the
    // subject to be NAMED keeps a stray aside from being quoted as the finding.
    // "Microbats" counts for "bats": the article's own compound of the subject.
    const names = [...subjectTokens].some(
      (st) => st.length >= 3 && [...tokens].some((t) => t === st || t.includes(st)),
    );
    if (!names) continue;

    // A claim that puts the subject in a CLASS may only be settled by a sentence
    // that says what the subject is. Any sentence mentioning the class word will
    // not do — see classifiesSubject().
    const classifies = claimClass === undefined || classifiesSubject(sentence, subjectTokens);

    const hit = keys.filter((k) => tokens.has(k)).length;
    if (classifies && hit >= need && hit > bestHit) {
      // Judge polarity on the clause that carries the relation, not on the whole
      // sentence: the Shark lead ends "...pectoral fins that are NOT fused to the
      // head", which would otherwise read as a negation of everything before it.
      let clause = sentence;
      let clauseHit = -1;
      for (const c of clausesOf(sentence)) {
        const ct = new Set(contentTokens(c));
        const n = keys.filter((k) => ct.has(k)).length;
        if (n > clauseHit) { clauseHit = n; clause = c; }
      }
      const evidenceNegated = NEGATION.test(clause);
      if (evidenceNegated !== claimNegated) {
        best = { verdict: "contradicted", evidence: sentence, at: i };
        bestHit = hit;
      } else if (!REPORTED.test(sentence)) {
        best = { verdict: "supported", evidence: sentence, at: i };
        bestHit = hit;
      }
      continue;
    }

    // The classification route: the article puts the subject in a DIFFERENT class
    // of the same mutually exclusive set, in words the claim never uses. This is
    // how "sharks are mammals" is refuted by a sentence about cartilaginous
    // fishes. Consulted only when nothing matched the claim's own terms.
    if (classHit === null && claimClass !== undefined && classifiesSubject(sentence, subjectTokens)) {
      const rival = [...tokens].find((t) => CLASS_OF.get(t) === claimClass && t !== claimClassTerm);
      if (rival) {
        classHit = { verdict: claimNegated ? "supported" : "contradicted", evidence: sentence, at: i };
      }
    }
  }

  return best ?? classHit;
}
