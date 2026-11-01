/**
 * FACT_CHECK, step two: the fallback full-text search, unchanged.
 *
 * Reached only when the claim's subject could not be resolved, or when the
 * subject's own article settled nothing (`factarticle.ts`). Everything in this
 * file predates that step and is pinned by the cases in GAPS G77 and G79 — the
 * Eiffel Tower replica in Tennessee, the ten-percent-of-the-brain myth, and
 * *Anders Celsius* the astronomer. It was moved out of `factcheck.ts` whole,
 * without a change to the scoring, when subject resolution was added.
 *
 * This path can never return "supported"; see `judge()` in factcheck.ts.
 */

/**
 * The search string. The claim itself, near-verbatim.
 *
 * A stop-worded bag of content words was tried first and retrieved the wrong
 * article often enough to be dangerous: "humans only use 10% of their brains"
 * became "humans only 10% brains" and matched **Boltzmann brain**. Wikipedia's
 * own search handles a natural-language claim better than any bag we build, so
 * only the fact-check framing is stripped.
 */
export function searchTerms(claim: string): string {
  return claim
    .replace(/\b(?:is it true that|true or false|fact check|claim)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", twenty: "20", thirty: "30", forty: "40", fifty: "50", hundred: "100", thousand: "1000",
};

/**
 * A word reduced to the form the article-selection score compares on.
 *
 * Plain word overlap could not see that "boils" and "Boiling point" are the same
 * word, or that "10%" and "Ten-percent-of-the-brain myth" name the same number,
 * so "water boils at 100 degrees Celsius" picked the astronomer *Anders Celsius*
 * and "humans only use 10% of their brains" picked the film *Flight of the
 * Navigator* (GAPS G77). Number words become digits, a percent sign becomes the
 * word, and the commonest inflections are stripped. This is deliberately crude
 * and used ONLY to choose the article; `judge` keeps its own exact tokens, so
 * the no-supported-verdict safety property is untouched.
 */
function stem(w: string): string {
  if (NUMBER_WORDS[w]) return NUMBER_WORDS[w]!;
  if (/^\d+$/.test(w)) return w;
  if (w.length > 5 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function matchTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map(stem)
    .filter((w) => w.length > 3 || /^\d+$/.test(w));
}

/** The best of the search hits for this claim, or null when there are none. */
export function chooseArticle(claim: string, hits: Array<Record<string, unknown>>): string | null {
  const claimWords = new Set(matchTokens(claim));
  let title: string | null = null;
  let bestScore = -1;
  for (const h of hits) {
    const t = typeof h["title"] === "string" ? (h["title"] as string) : "";
    if (!t) continue;
    // Score on the TITLE, which names the subject, plus the snippet, which
    // shows whether the article is about the claim or merely mentions it.
    const snippet = String(h["snippet"] ?? "").replace(/<[^>]*>/g, " ");
    const hay = new Set(matchTokens(`${t} ${snippet}`));
    let hit = 0;
    for (const w of claimWords) if (hay.has(w)) hit++;
    // Score the title WITHOUT its parenthetical, which is a disambiguator rather
    // than part of the subject's name. Splitting the raw title on whitespace also
    // left punctuation stuck to the tokens — "(paris," and "tennessee)" could
    // never match a claim word at all.
    const baseTitle = t.replace(/\s*\([^)]*\)\s*/g, " ");
    const titleHit = matchTokens(baseTitle).filter((w) => claimWords.has(w)).length;
    // "Eiffel Tower (Paris, Tennessee)" is a 60-foot replica, and it beat "Eiffel
    // Tower" on "the Eiffel Tower is located in Paris" 8-7, purely because its
    // snippet contains "located". A disambiguated title is the right article only
    // when the claim names EVERY word inside the parentheses; requiring just one
    // is what let "Paris" waive it here while "Tennessee" went unnoticed.
    const paren = t.match(/\(([^)]*)\)/);
    let disambiguation = 0;
    if (paren) {
      const inside = matchTokens(paren[1] ?? "");
      if (inside.length > 0 && !inside.every((w) => claimWords.has(w))) disambiguation = 3;
    }
    // Ten candidates bring in near-namesakes: "Hôtel Pullman Paris Tour Eiffel"
    // carries "Paris" and "Eiffel" from the claim plus two words it does not. A
    // title word the claim never uses counts against the article.
    const extra = matchTokens(baseTitle).filter((w) => !claimWords.has(w)).length;
    const score = hit + titleHit * 2 - disambiguation - extra * 0.75;
    if (score > bestScore) { bestScore = score; title = t; }
  }
  return title;
}
