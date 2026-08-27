/**
 * Translation, via MyMemory's keyless API.
 *
 * Both registered miners for LANGUAGE_TRANSLATION are named after this same API
 * and still score 0.000 on most questions — including ones where the API returns
 * the ground truth verbatim. Calling it correctly and returning the translated
 * text plainly is the whole opportunity.
 *
 * The ground truths are the bare translation ("Увидимся завтра утром."), so the
 * answer is the translation and nothing else. Wrapping it in explanatory prose
 * would bury the only part being compared.
 */

const API = "https://api.mymemory.translated.net/get";
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

  const url = `${API}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`en|${lang.code}`)}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let body: { responseData?: { translatedText?: string } };
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    body = (await res.json()) as typeof body;
  } finally {
    clearTimeout(t);
  }

  const out = (body.responseData?.translatedText ?? "").trim();
  if (!out) {
    return { ...base, reason: `No translation into ${lang.name} could be retrieved for ${JSON.stringify(text)}.` };
  }

  return {
    ...base,
    translation: out,
    verdict: "translated",
    confidence: 1,
    // The ground truth is the bare translation, so that is the answer. Anything
    // wrapped around it dilutes the only text being compared.
    reason: out,
  };
}
