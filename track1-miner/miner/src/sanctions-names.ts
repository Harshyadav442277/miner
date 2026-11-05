/**
 * Party names as comparable words, for sanctions, registry and EDGAR matching.
 *
 * Callers write names the way they read them, not the way a list prints them: in Cyrillic ("Сбербанк"),
 * with Cyrillic look-alike letters inside a Latin word, abbreviated ("Lazarus Grp."), with digits for
 * letters ("Gr1nex"), or as a domain ("Suex dot io"). Every such form, measured on paid requests of
 * 2026-11-01/02 (GAPS G255), is folded here into the same words the list's own spelling gives.
 */

// BGN/PCGN romanisation, the one OFAC's Russian names mostly follow ("OBSHCHESTVO", "SBERBANK").
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g", ј: "j",
};
// The letters that look Latin: in a mostly Latin word ("Gаrаntex" with Cyrillic а) they stand for the look-alike.
const LOOKALIKE: Record<string, string> = {
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x",
  і: "i", ј: "j", ѕ: "s",
};

function latinWord(w: string): string {
  const cyr = (w.match(/[Ѐ-ӿ]/g) ?? []).length;
  if (!cyr) return w;
  const lat = (w.match(/[a-z]/gi) ?? []).length;
  const map = lat > cyr ? LOOKALIKE : CYRILLIC;
  return [...w].map((c) => {
    const lower = c.toLowerCase();
    return lower in map ? map[lower]! : c;
  }).join("");
}

/** Cyrillic to Latin, word by word. Before NFKD, which would turn й into и. */
export const latinise = (s: string): string => s.split(/(\s+)/).map(latinWord).join("");

/** Legal forms, honorifics and connectives: they say what a party is, not which one. */
const NOISE = new Set(["mr", "mrs", "ms", "dr", "the", "ltd", "llc", "inc", "co", "corp", "corporation",
  "incorporated", "company", "limited", "plc", "jsc", "pjsc", "ojsc", "ooo", "oao", "zao", "pao", "ao", "gmbh", "ag",
  "sa", "srl", "sro", "ou", "bv", "nv", "llp", "lp", "fzc", "fze", "fzco", "sal", "pte", "bhd", "sdn", "spa", "sarl",
  "public", "joint", "stock", "liability", "obshchestvo", "aktsionernoe", "publichnoe", "zakrytoe", "otkrytoe",
  "of", "and", "dot"]);
const ABBREVIATIONS: Record<string, string> = {
  grp: "group", mkt: "market", intl: "international", hldg: "holding", hldgs: "holdings", svc: "service",
  svcs: "services", mgmt: "management", assn: "association", natl: "national", mfg: "manufacturing", bros: "brothers",
};
// Digits written for letters inside a word: "gr1nex", "l4zarus". A leading digit ("3m") stays a digit.
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t" };

export function nameTokens(s: string): string[] {
  const folded = latinise(String(s ?? "").slice(0, 2_000)).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    // "Limited liability company" in Russian: one legal form of four words.
    .replace(/\bs\s+ogranichenn\w*\s+otvetstvennost\w*/g, " ")
    .replace(/(?<=[a-z])[013457](?=[a-z])/g, (d) => LEET[d]!);
  const words = folded.replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean)
    .map((t) => ABBREVIATIONS[t] ?? t.slice(0, 40));
  // "S.A." arrives as "s" "a": joined, it is a legal form and goes; initials stay.
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    let j = i;
    while (j < words.length && words[j]!.length === 1) j++;
    if (j - i > 1 && NOISE.has(words.slice(i, j).join(""))) { i = j - 1; continue; }
    if (!NOISE.has(words[i]!)) out.push(words[i]!);
  }
  return out;
}

/**
 * Words a caller adds to a listed name without changing which party it is ("Grinex Exchange" for GRINEX),
 * and domain endings ("suex.io"). Sanctions matching may skip one of these when it matches nothing.
 */
export const DESCRIPTORS = new Set(["exchange", "platform", "services", "service", "holdings", "holding", "group",
  "market", "marketplace", "network", "protocol", "labs", "global", "international", "trading", "technologies",
  "solutions", "systems", "ventures", "io", "com", "net", "org", "cc", "ru", "xyz", "app"]);

/** Edit distance with adjacent swaps, for deciding whether a one-word name is a near-exact spelling. */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
    }
  }
  return d[a.length]![b.length]!;
}
