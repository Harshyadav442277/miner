/**
 * FACT_CHECK: what a sentence must contain before it counts, from the claims paid callers sent (GAPS G262).
 *
 * On 2026-11-03 one caller sent 37 claims. Three got a confident wrong verdict, each for a reason fixed here:
 * - "Venus is the largest planet in the Solar System" was SUPPORTED by "Venus is one of the four terrestrial
 *   planets in the Solar System": three of four key words matched, and the missing one, "largest", was the claim.
 *   Numbers, superlatives and proper names are now required in a supporting sentence (criticalKeys).
 * - "The Eiffel Tower is located in Berlin and was completed in 1889" was SUPPORTED by its true half. A claim joined
 *   by "and" before a verb is now checked part by part (conjuncts): one part ruled out rules the claim out, and
 *   support needs every part.
 * - "Mount Kilimanjaro is the tallest mountain in Africa" was CONTRADICTED by "Kilimanjaro is drained by a network
 *   of rivers": "river" is a rival of "mountain", but the sentence never says Kilimanjaro is one. A rival class
 *   now counts only as the complement of the subject's own copula (complementTokens).
 * Most true claims came back unverified. eventSentence() reads "X opened in 1937" against "The bridge opened to
 * the public on May 27, 1937", the event verb and the year in one stretch of the subject's own article.
 */

import { contentTokens, fold } from "./factwords";

/** Superlatives and ordinals: "the largest planet" is not "a planet". */
const SUPERLATIVE = new Set(
  ["largest", "biggest", "smallest", "tallest", "highest", "lowest", "longest", "shortest", "deepest", "oldest",
    "youngest", "newest", "earliest", "latest", "fastest", "slowest", "heaviest", "lightest", "hottest", "coldest",
    "brightest", "closest", "nearest", "farthest", "furthest", "richest", "poorest", "best", "worst", "greatest",
    "widest", "densest", "busiest", "strongest", "weakest", "least", "most", "first", "second", "third", "fourth",
    "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "last", "only"].map(fold),
);

/** Superlatives an encyclopaedia writes for the same thing: Kilimanjaro is "the highest mountain in Africa". */
const SYNONYM = new Map([["tallest", "highest"], ["biggest", "largest"], ["nearest", "closest"]].map(([a, b]) => [fold(a as string), fold(b as string)]));
export const canon = (t: string): string => SYNONYM.get(t) ?? t;

/** Era marks are not names: "80 AD" is written "AD 80" as often as not. */
const ERA = new Set(["ad", "bc", "ce", "bce"]);

/**
 * The claim's terms a supporting sentence must contain: every number of two or more digits, every superlative or
 * ordinal, and the last word of every capitalised name outside the subject ("Mark Zuckerberg" needs
 * "Zuckerberg"; "the Solar System" needs "System"). Canonical form (canon), as the caller compares it.
 */
export function criticalKeys(claim: string, subjectTokens: Set<string>): string[] {
  const out = new Set<string>();
  for (const t of contentTokens(claim)) {
    if (subjectTokens.has(t)) continue;
    if (/^\d{2,}$/.test(t) || SUPERLATIVE.has(t)) out.add(canon(t));
  }
  let last = "";
  const flush = () => {
    if (last && !subjectTokens.has(last) && !ERA.has(last)) out.add(canon(last));
    last = "";
  };
  String(claim ?? "").split(/\s+/).forEach((raw, i) => {
    const word = raw.replace(/^[^A-Za-z0-9]+/, "");
    if (i > 0 && /^[A-Z]/.test(word)) {
      const toks = contentTokens(word);
      last = toks[toks.length - 1] ?? last;
      if (/[,.;:!?)]$/.test(raw)) flush();
    } else flush();
  });
  flush();
  return [...out];
}

/** Verbs a later part of a claim may open on, sharing the first part's subject. */
const CONJUNCT = new RegExp(
  "\\s*,?\\s+and\\s+(?=(?:was|were|is|are|has|have|had|became|becomes|remains|won|opened|completed|released|" +
    "launched|introduced|founded|built|lies|stands)\\b)",
  "i",
);

/** "X is in Berlin and was completed in 1889" -> ["X is in Berlin", "X was completed in 1889"]. */
export function conjuncts(claim: string, subject: string): string[] {
  const parts = String(claim ?? "").split(CONJUNCT).map((p) => p.trim()).filter(Boolean);
  if (!subject || parts.length < 2) return [claim];
  return parts.map((p, i) => (i === 0 ? p : `${subject} ${p}`).replace(/[.?!]+$/, ""));
}

const COPULA = new Set(["is", "are", "was", "were"]);
/** Words after a copula that still introduce a class: "are classified as mammals". */
const AS_CLASS = new Set(["classified", "considered", "regarded", "known", "recognised", "recognized", "as"]);
/** A complement ends at a preposition other than "of", or a relative pronoun. */
const ENDS = new Set(["by", "in", "at", "on", "from", "with", "to", "for", "as", "than", "like", "near", "within", "inside",
  "after", "before", "during", "since", "until", "against", "toward", "towards", "about", "under", "over",
  "between", "among", "which", "who", "that", "where", "when", "while", "whose"]);
/** Adjectives that end like a participle: "a sacred river" is still a river. */
const NOT_PASSIVE = new Set(["sacred", "naked", "wicked", "hundred", "kindred", "rugged", "beloved", "aged"]);

/**
 * The folded words of what the sentence says its subject IS: the noun phrase after a copula within three words of
 * the subject, up to a preposition or a comma. "Sharks are a group of elasmobranch cartilaginous fishes
 * characterized by ..." gives group, elasmobranch, cartilaginous, fish, characteriz. A passive ("is drained by",
 * "is located in") says nothing of a class and gives nothing.
 */
export function complementTokens(sentence: string, subjectTokens: Set<string>): string[] {
  let s = String(sentence ?? "").replace(/\[[^\]]*\]/g, " ");
  while (/\([^()]*\)/.test(s)) s = s.replace(/\([^()]*\)/g, " ");
  const raw = s.split(/\s+/).filter(Boolean);
  const low = raw.map((w) => w.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  const subjectAt = low.findIndex((w, i) => i < 4 && [...subjectTokens].some((st) => st.length >= 3 && fold(w).includes(st)));
  if (subjectAt < 0) return [];
  let at = low.findIndex((w, i) => i > subjectAt && i - subjectAt <= 3 && COPULA.has(w));
  if (at < 0) return [];
  while (AS_CLASS.has(low[at + 1] ?? "")) at++;
  const out: string[] = [];
  let opened = false;
  for (let i = at + 1; i < Math.min(raw.length, at + 10); i++) {
    const w = low[i] as string;
    if (!w || ENDS.has(w)) break;
    if (!opened && !["a", "an", "the"].includes(w)) {
      // A passive is a participle and its preposition: "is drained by", "is located in". "winged" in "Bats are
      // winged mammals" is followed by its noun and stays.
      if (/^[a-z]{3,}ed$/.test(w) && !NOT_PASSIVE.has(w) && ENDS.has(low[i + 1] ?? "")) return [];
      opened = true;
    }
    out.push(...w.split("-").filter(Boolean).map(fold));
    if (/[,;:]$/.test(raw[i] as string)) break;
  }
  return out;
}

const EVENT = "opened|completed|released|launched|introduced|founded|established|built|unveiled|inaugurated|published|finished|formed|created|started|won";
const ADVERB = "(?:first|formally|officially|originally|initially|publicly)";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const when = (year: string) => `\\b(?:in|on)\\s+(?:[A-Za-z]+\\s+\\d{1,2},?\\s+|\\d{1,2}\\s+[A-Za-z]+,?\\s+)?${year}\\b`;
/** Words in a claim's middle that a sentence need not repeat: "opened to the public", "released by Apple". */
const MIDDLE_LIGHT = new Set(["by", "to", "the", "public", "first", "time"].map(fold));
/** The sentences a leading "It" may stand for the subject in: the article's lead. */
export const PRONOUN_LEAD = 5;

/** "<subject> [was] <event verb> [<middle>] in|on <year>": verb, middle, year. */
const EVENT_CLAIM = new RegExp(`\\s(?:(?:was|were)\\s+)?(?:${ADVERB}\\s+)?(${EVENT})\\b(.*?)${when("(\\d{4})")}\\s*[.?!]?$`, "i");

/** How an encyclopaedia words the same event: Marie Curie "shared the 1903 Nobel Prize in Physics". */
const SAME_EVENT: Record<string, string[]> = {
  won: ["won", "win", "shared", "awarded", "received"],
  introduced: ["introduced", "proposed", "presented"],
  opened: ["opened", "inaugurated"],
  completed: ["completed", "finished"],
  founded: ["founded", "established", "formed"],
  built: ["built", "constructed", "erected"],
  published: ["published", "authored"],
};
const EVENT_VERB = new RegExp(`\\b(?:(?:was|were|is|are)\\s+)?(?:${ADVERB}\\s+)?(${EVENT})\\b`, "i");

/** How a sentence may name the subject: the subject itself, or "the"/"its" plus its trailing words. */
function subjectRefs(subject: string): string[] {
  const words = subject.split(/\s+/).filter(Boolean);
  const refs = [escapeRe(subject)];
  for (let k = 1; k < words.length; k++) {
    if (/^(?:in|of|at|on|the|a|an|and|de|du|la|le)$/i.test(words[k] as string)) continue;
    refs.push(`(?:the|its)\\s+${words.slice(k).map(escapeRe).join("\\s+")}`);
  }
  return refs;
}

/**
 * For a claim whose predicate is an event verb, whether the sentence states that event OF the subject: the subject
 * and then the verb (or a wording of it, SAME_EVENT) within one clause-free stretch, or the verb with the subject or
 * "it" as its object. Any other claim passes. "By Q4 2007, strong iPhone sales put Apple at second place" SUPPORTED
 * "The first iPhone was released by Apple in 2007", and "Speaking from a platform erected on the steps of Rathaus
 * Schöneberg" SUPPORTED "the Berlin Wall was built by the United States", each on words scattered through the
 * sentence (G262).
 */
export function statesEvent(claim: string, subject: string, sentence: string): boolean {
  const verb = String(claim ?? "").match(EVENT_VERB)?.[1]?.toLowerCase();
  if (!verb) return true;
  if (!subject) return false;
  const forms = (SAME_EVENT[verb] ?? [verb]).join("|");
  const refs = subjectRefs(subject).join("|");
  const passive = new RegExp(`(?:^|[^\\w])(?:${refs})(?![\\w])[^.;:]{0,60}?\\b(?:${forms})\\b`, "i");
  const active = new RegExp(`\\b(?:${forms})\\s+(?:it|them|(?:${refs}))(?![\\w])`, "i");
  return passive.test(sentence) || active.test(sentence);
}

/** Units a claim's figure may carry, by kind. */
const UNIT: Record<string, string> = {
  m: "m", metre: "m", metres: "m", meter: "m", meters: "m", ft: "ft", foot: "ft", feet: "ft", km: "km",
  kilometre: "km", kilometres: "km", kilometer: "km", kilometers: "km", mi: "mi", mile: "mi", miles: "mi",
  kg: "kg", kilograms: "kg", billion: "billion", million: "million", percent: "%", "%": "%",
};
function quantities(text: string): Array<{ n: number; u: string }> {
  const t = String(text ?? "").replace(/(\d),(?=\d{3}\b)/g, "$1");
  return [...t.matchAll(/(\d+(?:\.\d+)?)\s*(%|[A-Za-z]+)\b/g)]
    .map((m) => ({ n: Number(m[1]), u: UNIT[(m[2] ?? "").toLowerCase()] ?? "" }))
    .filter((q) => q.u);
}

/**
 * Each figure the claim states with a unit is the FIRST figure of that unit in the sentence. Kilimanjaro's lead
 * reads "the highest mountain in Africa ... at 5,895 m (19,341 ft) above sea level and 4,900 m (16,100 ft) above
 * its plateau base": 5,895 m is its height, and 4,900 m in the same sentence must not support "the tallest
 * mountain in Africa at 4900 metres".
 */
export function quantitiesAgree(claim: string, sentence: string): boolean {
  const have = quantities(sentence);
  return quantities(claim).every((w) => have.find((h) => h.u === w.u)?.n === w.n);
}

/**
 * A list, not a statement: Marie Curie's "Awards and honours that she received include: Nobel Prize in Physics
 * (1903, ...) Davy Medal (1903, ...) ..." holds every word of "won the Nobel Prize in Chemistry in 1903". Three
 * bracketed figures, or a colon followed by three commas outside brackets. The Taj Mahal's lead keeps a colon and
 * a bracket in its pronunciation note ("Hindustani: [...]") and is not a list.
 */
export function listLike(sentence: string): boolean {
  const s = String(sentence ?? "");
  if ((s.match(/\([^()]*\d[^()]*\)/g) ?? []).length >= 3) return true;
  let b = s.replace(/\[[^\]]*\]/g, " ");
  while (/\([^()]*\)/.test(b)) b = b.replace(/\([^()]*\)/g, " ");
  const colon = b.indexOf(": ");
  return colon >= 0 && (b.slice(colon).match(/,/g) ?? []).length >= 3;
}

/**
 * Index of a sentence of the subject's own article that states the claimed event in the claimed year, or -1.
 * The claim must read "<subject> [was] <event verb> [<middle>] in|on <year>". The sentence must name the subject,
 * or "the" plus the subject's trailing words ("The bridge", "The Opera House"), or open on "It" in the lead; then
 * the same verb, then the year, with no full stop between and no "not"/"never"; and it must contain every content
 * word of the middle ("by Apple"). Another year is not read as refutation: opening, completion and release dates
 * differ by source and by stage, and "Python 2.0 was released in 2000" says nothing of Python 3.0.
 */
export function eventSentence(claim: string, subject: string, sentences: string[]): number {
  const m = String(claim ?? "").trim().match(EVENT_CLAIM);
  if (!m?.[1] || !m[3] || !subject) return -1;
  const verb = m[1].toLowerCase();
  const year = m[3];
  const middle = contentTokens(m[2] ?? "").filter((t) => !MIDDLE_LIGHT.has(t));
  const refs = subjectRefs(subject);
  const tail = `\\b[^.;:]{0,60}?\\b(?:(?:was|were)\\s+)?(?:\\w+ly\\s+)?${verb}\\b[^.;:]{0,80}?${when(year)}`;
  const named = new RegExp(`\\b(?:${refs.join("|")})${tail}`, "i");
  const pronoun = new RegExp(`^It${tail}`);
  return sentences.findIndex((x, i) => {
    let b = x.replace(/\[[^\]]*\]/g, " ");
    while (/\([^()]*\)/.test(b)) b = b.replace(/\([^()]*\)/g, " ");
    b = b.replace(/\s+/g, " ").trim();
    if (!(named.test(b) || (i < PRONOUN_LEAD && pronoun.test(b))) || /\b(?:not|never)\b/i.test(b)) return false;
    const tokens = new Set(contentTokens(b));
    return middle.every((t) => tokens.has(t));
  });
}
