/**
 * KEYWORD_EXTRACTION — the keyphrases of a text, by YAKE.
 *
 * The site's row (read 2026-10-25) names KeyBERT, YAKE and RapidAPI, sets a
 * 400 ms target, and says term frequency is mechanical while relevance ranking
 * is judgment. YAKE (Campos et al., Information Sciences 2020) is the
 * unsupervised statistical method: no model, no key, no upstream, and the same
 * text always gives the same ranking, so an app can test against it.
 *
 * Each word gets five features (casing, position, normalised frequency, context
 * relatedness, sentence spread). A phrase of one to three words scores the
 * product of its words' scores over its own frequency; LOWER IS BETTER, as in the
 * paper. Near-duplicate phrases are dropped so "token supply" and "token
 * supplies" are not both returned. English stop words only.
 */

const STOP = new Set((
  "a about above after again against all also am an and any are as at be because been before being below between both but by can " +
  "could did do does doing down during each either few for from further had has have having he her here hers herself him himself his how " +
  "however i if in into is it its itself just let may me might more most must my myself no nor not now of off on once only or other ought " +
  "our ours ourselves out over own per same shall she should so some such than that the their theirs them themselves then there these they " +
  "this those through thus to too under until up upon us very via was we were what when where which while who whom why will with within " +
  "without would yet you your yours yourself yourselves one two three many much new use used using get got also etc"
).split(" "));

export interface Keyword { keyword: string; score: number; count: number }

export interface KeywordResult {
  keywords: Keyword[] | null;
  method: string;
  words_in_text: number;
  verdict: "extracted" | "insufficient_input";
  confidence: number;
  reason: string;
  error?: string;
}

/** The text to read: the `text` parameter, else quoted text, else what follows the instruction's colon. Pure. */
export function bodyOf(textParam: string, question: string): string {
  if (textParam.trim()) return textParam.trim();
  const q = String(question ?? "").trim();
  const quoted = q.match(/["“]([^"”]{40,})["”]/)?.[1];
  if (quoted) return quoted.trim();
  const colon = q.match(/^[^:]{0,160}\b(?:keywords?|keyphrases?|key phrases?|topics?|terms?|tags?)\b[^:]{0,80}:\s*([\s\S]{20,})$/i)?.[1];
  return (colon ?? q).trim();
}

/** How many keyphrases were asked for: the parameter, "top 5", "5 keywords"; default 10, at most 30. Pure. */
export function wanted(param: string, question: string): number {
  const n = Number(param) || Number(String(question ?? "").match(/\btop\s+(\d{1,2})\b|\b(\d{1,2})\s+(?:key\s*words?|key\s*phrases?|keyphrases?|terms|tags|topics)\b/i)?.slice(1).find(Boolean));
  return Number.isInteger(n) && n > 0 ? Math.min(n, 30) : 10;
}

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

function sentences(text: string): string[][] {
  return text.split(/(?<=[.!?;])\s+|\n+/).map((s) => s.match(WORD) ?? []).filter((s) => s.length);
}

/** Punctuation ends a candidate phrase, as in YAKE: no phrase spans a comma. */
function chunks(text: string): string[][] {
  return text.split(/[.!?;,:()[\]{}"“”]+|\s[-–—]\s|\n+/).map((s) => s.match(WORD) ?? []).filter((s) => s.length);
}

/** Near-duplicates: most of the shorter phrase's words reappear, or the spelling barely differs. Pure. */
function similar(a: string, b: string): boolean {
  if (` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `)) return true;
  const wa = a.split(" ");
  const wb = new Set(b.split(" "));
  const shared = wa.filter((w) => wb.has(w)).length;
  if (shared && shared / Math.min(wa.length, wb.size) >= 0.66) return true;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return 1 - prev[b.length]! / Math.max(a.length, b.length) > 0.8;
}

/** YAKE keyphrases of `text`, best first. Pure. */
export function yake(text: string, top = 10, maxN = 3, window = 1): Keyword[] {
  const sents = sentences(text);
  type Stat = { tf: number; upper: number; acronym: number; sents: number[]; left: string[]; right: string[] };
  const stats = new Map<string, Stat>();
  sents.forEach((words, si) => {
    words.forEach((w, wi) => {
      const k = w.toLowerCase();
      const s = stats.get(k) ?? { tf: 0, upper: 0, acronym: 0, sents: [], left: [], right: [] };
      s.tf++;
      if (w.length > 1 && w === w.toUpperCase() && /\p{L}/u.test(w)) s.acronym++;
      else if (wi > 0 && /^\p{Lu}/u.test(w)) s.upper++;
      s.sents.push(si);
      for (let d = 1; d <= window; d++) {
        if (words[wi - d]) s.left.push(words[wi - d]!.toLowerCase());
        if (words[wi + d]) s.right.push(words[wi + d]!.toLowerCase());
      }
      stats.set(k, s);
    });
  });
  const content = [...stats].filter(([k]) => !STOP.has(k)).map(([, s]) => s.tf);
  if (!content.length) return [];
  const mean = content.reduce((a, b) => a + b, 0) / content.length;
  const sd = Math.sqrt(content.reduce((a, b) => a + (b - mean) ** 2, 0) / content.length);
  const maxTf = Math.max(...content);

  const termScore = new Map<string, number>();
  for (const [k, s] of stats) {
    const tCase = Math.max(s.upper, s.acronym) / (1 + Math.log(s.tf));
    const sorted = [...s.sents].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    const tPos = Math.log(Math.log(3 + median));
    const tNorm = s.tf / (mean + sd);
    const dl = s.left.length ? new Set(s.left).size / s.left.length : 0;
    const dr = s.right.length ? new Set(s.right).size / s.right.length : 0;
    const tRel = 1 + (dl + dr) * (s.tf / maxTf);
    const tSent = new Set(s.sents).size / sents.length;
    termScore.set(k, (tRel * tPos) / (tCase + tNorm / tRel + tSent / tRel));
  }

  const cands = new Map<string, { words: string[]; count: number }>();
  for (const words of chunks(text)) {
    for (let i = 0; i < words.length; i++) {
      for (let n = 1; n <= maxN && i + n <= words.length; n++) {
        const gram = words.slice(i, i + n).map((w) => w.toLowerCase());
        // No stop word anywhere and no bare number at either end. YAKE proper keeps inner stop words and
        // discounts them by co-occurrence; dropping them was cleaner on the 2026-10-26 checks ("area is close").
        if (gram.some((g) => STOP.has(g))) continue;
        const num = (g: string): boolean => /^\d[\d.,'’-]*$/.test(g);
        if (num(gram[0]!) || num(gram[n - 1]!) || gram.join(" ").length < 3) continue;
        const key = gram.join(" ");
        const c = cands.get(key) ?? { words: gram, count: 0 };
        c.count++;
        cands.set(key, c);
      }
    }
  }
  const scored = [...cands].map(([key, c]) => {
    const terms = c.words.filter((w) => !STOP.has(w)).map((w) => termScore.get(w)!);
    const prod = terms.reduce((a, b) => a * b, 1);
    const sum = terms.reduce((a, b) => a + b, 0);
    return { keyword: key, score: prod / (c.count * (1 + sum)), count: c.count };
  }).sort((a, b) => a.score - b.score || a.keyword.localeCompare(b.keyword));

  const out: Keyword[] = [];
  for (const k of scored) {
    if (out.length >= top) break;
    if (out.some((o) => similar(o.keyword, k.keyword))) continue;
    out.push({ ...k, score: Number(k.score.toPrecision(4)) });
  }
  return out;
}

const METHOD = "YAKE (Campos et al., 2020): unsupervised statistical keyphrase extraction, 1–3 word phrases, lower score is more relevant";

export function extractKeywords(question: string, textParam = "", topParam = ""): KeywordResult {
  const text = bodyOf(textParam, question).slice(0, 50_000);
  const words = sentences(text).flat().length;
  if (words < 8) {
    return { keywords: null, method: METHOD, words_in_text: words, verdict: "insufficient_input", confidence: 0, error: "no_text",
      reason: "No body text long enough to extract keywords from was supplied. Pass the text in the text parameter, or after a colon in the question." };
  }
  const keywords = yake(text, wanted(topParam, question));
  const list = keywords.slice(0, 8).map((k) => k.keyword).join(", ");
  return { keywords, method: METHOD, words_in_text: words, verdict: "extracted", confidence: 0.8,
    reason: `The top keyphrases of the ${words}-word text are: ${list}${keywords.length > 8 ? `, and ${keywords.length - 8} more` : ""}. ` +
      "Ranked by YAKE, which scores each phrase from its words' casing, position, frequency, context and spread; the same text always gives the same ranking." };
}
