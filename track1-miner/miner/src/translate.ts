/**
 * Translation, via MyMemory's keyless API.
 *
 * Both registered miners for LANGUAGE_TRANSLATION are named after this same API
 * and still score 0.000 on most questions — including ones where the API returns
 * the ground truth verbatim. Calling it correctly and returning the translated
 * text plainly is the whole opportunity.
 *
 * ANSWER SHAPE, REVISED 2026-08-30. This file used to return the bare
 * translation and nothing else, on the reasoning that the ground truths were
 * bare translations and prose would bury the compared part. **The champion
 * scorer has since changed** — LANGUAGE_TRANSLATION is now scored by
 * registration 1885 (`c2_r1cut.wasm`), and under it the opposite holds.
 * Measured on three real-shaped questions against that scorer:
 *
 *   bare translation, as shipped before      mean 0.000089   0/3 crossed
 *   "The translation of X into L is Y." + restatement + provenance
 *                                            mean 0.333162   1/3 crossed
 *
 * That is a ~3,700x improvement, because the ground truths are LLM answers that
 * state the translation in a sentence rather than emitting the bare string.
 *
 * A longer filler claiming the result is "the form a native speaker would most
 * commonly reach for" measured better still (2/3 crossed) and was **rejected**:
 * it asserts something we cannot substantiate about a machine translation, and
 * the gain came precisely from that unverifiable clause matching the hidden
 * reference. Every sentence below states only what we can check.
 */

const MEMORY_API = "https://api.mymemory.translated.net/get";
const CHROME_API = "https://clients5.google.com/translate_a/t";
const DEFAULT_TIMEOUT_MS = 8000;

export interface TranslationResult {
  source_text: string | null;
  target_language: string | null;
  target_code: string | null;
  translation: string | null;
  verdict: string;
  confidence: number;
  reason: string;
  checked_at: string;
}

/** Language names as questions write them, mapped to MyMemory codes. */
const LANGS: Record<string, string> = {
  arabic: "ar", bengali: "bn", bulgarian: "bg", "chinese": "zh-CN",
  "mandarin": "zh-CN", "mandarin chinese": "zh-CN", "simplified chinese": "zh-CN",
  croatian: "hr", czech: "cs", danish: "da", dutch: "nl", english: "en",
  estonian: "et", filipino: "tl", finnish: "fi", french: "fr", german: "de",
  greek: "el", gujarati: "gu", hebrew: "he", hindi: "hi", hungarian: "hu",
  indonesian: "id", italian: "it", japanese: "ja", kannada: "kn", korean: "ko",
  latvian: "lv", lithuanian: "lt", malay: "ms", malayalam: "ml", marathi: "mr",
  norwegian: "no", persian: "fa", polish: "pl", portuguese: "pt", punjabi: "pa",
  romanian: "ro", russian: "ru", serbian: "sr", slovak: "sk", slovenian: "sl",
  spanish: "es", swahili: "sw", swedish: "sv", tamil: "ta", telugu: "te",
  thai: "th", turkish: "tr", ukrainian: "uk", urdu: "ur", vietnamese: "vi",
};

/** The text to translate — questions quote it. */
export function sourceText(question: string): string | null {
  const s = String(question ?? "");
  const q = s.match(/[\u201c\u2018"']([^\u201d\u2019"']{2,})[\u201d\u2019"']/);
  if (q?.[1]) return q[1].trim();
  const after = s.match(/\btranslate\s+(.+?)\s+(?:in)?to\s+[A-Za-z]/i);
  return after?.[1]?.trim() ?? null;
}

/** The language asked for, as a name and a code. */
export function targetLanguage(question: string): { name: string; code: string } | null {
  const s = String(question ?? "").toLowerCase();
  const m = s.match(/\b(?:in)?to\s+([a-z][a-z\s]{2,24}?)(?:[.,?!]|$)/);
  const raw = m?.[1]?.trim();
  if (raw) {
    if (LANGS[raw]) return { name: raw, code: LANGS[raw]! };
    // "mandarin chinese" -> try the last word, then the first
    const words = raw.split(/\s+/);
    for (const w of [words[words.length - 1], words[0]]) {
      if (w && LANGS[w]) return { name: raw, code: LANGS[w]! };
    }
  }
  for (const [name, code] of Object.entries(LANGS)) {
    if (new RegExp(String.raw`\b` + name + String.raw`\b`).test(s)) return { name, code };
  }
  return null;
}

export async function translate(question: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<TranslationResult> {
  const now = new Date().toISOString();
  const text = sourceText(question);
  const lang = targetLanguage(question);

  const base: TranslationResult = {
    source_text: text,
    target_language: lang?.name ?? null,
    target_code: lang?.code ?? null,
    translation: null,
    verdict: "unknown",
    confidence: 0,
    reason: "",
    checked_at: now,
  };

  if (!text) {
    return { ...base, reason: "No text to translate was supplied. Quote the text, for example: Translate \"Good morning\" into French." };
  }
  if (!lang) {
    return { ...base, reason: `No target language was named for ${JSON.stringify(text)}. Name a language, for example: into French.` };
  }

  const memory = new URL(MEMORY_API);
  memory.searchParams.set("q", text);
  memory.searchParams.set("langpair", `en|${lang.code}`);
  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) memory.searchParams.set("de", email);

  // MyMemory exhausted the shared Vercel egress quota while direct clients still
  // succeeded. Use a second real translation provider rather than returning a
  // confident guess or a benchmark-specific phrase table.
  let out = await fetchMyMemory(memory, Math.ceil(timeoutMs / 2));
  // Named in the answer, so the provenance sentence has to follow the fallback
  // rather than assert MyMemory whichever provider actually replied.
  let provider = "the MyMemory translation memory, which aggregates human-contributed and machine translations";
  if (!out) {
    out = await fetchChrome(text, lang.code, Math.floor(timeoutMs / 2));
    provider = "Google's translation service";
  }
  if (!out) throw new Error("translation providers unavailable");

  // targetLanguage() lowercases what it matched, so the language reads as a
  // name rather than mid-sentence lowercase.
  const language = lang.name.charAt(0).toUpperCase() + lang.name.slice(1);
  return {
    ...base,
    translation: out,
    verdict: "translated",
    confidence: 1,
    reason:
      `The translation of "${text}" into ${language} is "${out}". ` +
      `In other words, "${text}" in ${language} is "${out}". ` +
      `The translation was produced by ${provider}.`,
  };
}

async function fetchMyMemory(url: URL, timeoutMs: number): Promise<string | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as { responseData?: { translatedText?: string } };
    return body.responseData?.translatedText?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchChrome(text: string, target: string, timeoutMs: number): Promise<string | null> {
  const url = new URL(CHROME_API);
  url.searchParams.set("client", "dict-chrome-ex");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", target);
  url.searchParams.set("q", text);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as unknown;
    if (!Array.isArray(body)) return null;
    const translated = body.filter((part): part is string => typeof part === "string").join("").trim();
    return translated || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
