/**
 * FACT_CHECK's word layer: one stemmer and one stop list, so the subject, the
 * claim and the evidence are always compared in the same form. Shared by
 * `factsubject.ts` and `factrelation.ts`, which is why it is a file of its own.
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
 * The comparison form used on BOTH sides of every test in the FACT_CHECK files.
 *
 * It drops a trailing "e" after stemming so that "vaccines" (stem `vaccin`) and
 * "vaccine" land on the same token — without it the subject "vaccines" scored
 * zero against the title "Vaccine" and picked `Vaccines and autism` instead.
 * `factcheck.ts` keeps its own `stem`, unchanged, for the fallback search path.
 */
export function fold(w: string): string {
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
