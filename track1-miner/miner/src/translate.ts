/**
 * LANGUAGE_TRANSLATION — machine translation by Groq's open-weight models (llm.ts).
 *
 * PROVIDERS, REPLACED 2026-10-18 (GAPS G189). The primary was `clients5.google.com`, an
 * undocumented Google endpoint with no licence for this use, and the failover was MyMemory, whose
 * terms forbid reselling its service. Answers sold through Telegraph are commercial, so both are
 * gone. No free translation API both permits commercial use and needs no account, so there is no
 * keyless fallback: when Groq does not answer, the route reports an outage rather than serving a
 * translation it is not allowed to serve, or one it made up.
 *
 * ANSWER SHAPE. The reason is the bare translation, nothing else: the requested text in the
 * requested language is the whole answer, and provenance lives in the `source` field.
 *
 * ISO CODES. miner.yaml invites `target_language` "by name or ISO 639-1 code, e.g. Spanish or
 * fr", so codes resolve through CODES below; a name found anywhere in the question wins.
 */

import { phrase } from "./llm";

const DEFAULT_TIMEOUT_MS = 8000;

export interface TranslationResult {
  source_text: string | null;
  target_language: string | null;
  target_code: string | null;
  translation: string | null;
  source: string | null;
  verdict: string;
  confidence: number;
  reason: string;
  checked_at: string;
}

/** Language names as questions write them, mapped to ISO 639-1 codes (zh-CN for Chinese). */
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

/**
 * ISO 639-1 codes, as the manifest invites ("Spanish or fr"), lowercased and
 * mapped back to the name/code pair. Built from LANGS so the two can never
 * disagree; "zh" is added by hand because our Chinese value is "zh-CN".
 */
const CODES: Record<string, { name: string; code: string }> = {};
for (const [name, code] of Object.entries(LANGS)) {
  const key = code.toLowerCase();
  if (!CODES[key]) CODES[key] = { name, code };
}
CODES["zh"] = { name: "chinese", code: "zh-CN" };

/**
 * Words that stand in for the text rather than being it. "Translate this to
 * finnish\n\nHi, I am Wick" matched the `translate … to <lang>` pattern and
 * returned the literal word "this", so the answer was Finnish for "this" — a
 * confidently wrong answer, which is worse here than a refusal.
 */
const PLACEHOLDER =
  /^(?:this|that|it|the following(?: [a-z]+)?(?: text| phrase| sentence| passage| paragraph| words?)?|the text|the phrase|below)\b[:,]?$/i;

/** Trailing junk a real routed request arrives with: "What are you doing?>". */
const TRAILING_JUNK = /[>»<]+$/;

/** The text to translate — questions quote it. */
export function sourceText(question: string): string | null {
  const s = String(question ?? "");
  // Double quotes first: an apostrophe inside a double-quoted passage ("\u2026include NASA's efforts\u2026")
  // used to close it, and the answer translated "Recent developments include NASA" (routed 2026-10).
  const dq = s.match(/[\u201c"]([^\u201d"]{2,})[\u201d"]/);
  if (dq?.[1]) return dq[1].trim();
  // A single quote counts only as a quote: opened after a space or bracket, closed before a space or
  // punctuation, so an apostrophe inside a word cannot end the text.
  const sq = s.match(/(?:^|[\s(:])[\u2018']([^\u2019']{2,})[\u2019'](?=[\s.,;:!?)]|$)/);
  if (sq?.[1]) return sq[1].trim();
  // A quote opened after a colon and never closed: the payload runs to the end. Routed
  // 2026-10: "Translate the following English passage into natural Hebrew \u2026 : \u201cArtificial
  // intelligence systems are \u2026 threats." \u2014 read as the phrase "the following English passage".
  // Also after a dash: "Japanese translation -  \"No wallet, no key, \u2026" was never closed either.
  const open = s.match(/(?:[:\u2013\u2014-]|\s)\s*[\u201c"]([^\u201c\u201d"]{2,})$/)?.[1]?.trim();
  if (open) return open.replace(TRAILING_JUNK, "").trim() || null;
  // A line break separates the instruction from its payload: "Translate in
  // swedish\n\nHi, I am Wick and you are very nice". This also rescues the
  // misspellings — "Transalte this from swedish to English\n\nHej, jag ar Wick"
  // — because it never has to recognise the verb.
  const nl = s.indexOf("\n");
  if (nl !== -1) {
    const body = s.slice(nl + 1).trim().replace(TRAILING_JUNK, "").trim();
    if (body.length >= 2) return body;
  }

  const after = s.match(/\btranslate\s+(.+?)\s+(?:in)?to\s+[A-Za-z]/i)?.[1]?.trim();
  if (after && !PLACEHOLDER.test(after)) return after.replace(TRAILING_JUNK, "").trim() || null;

  // "How do you say thank you in Japanese?" / "What is good morning in Spanish?"
  // — the text sits between the asking phrase and the language, unquoted. This
  // was refused as "no text to translate" until 2026-09-05. The imperative
  // "Say hello in Spanish." was routed on 2026-10-10 and refused the same way.
  const said = s
    .match(/(?:\b(?:how (?:do|does|would|can|could|to)(?: you| i| we| one)? say|what(?:'s| is)(?: the (?:word|phrase) for)?)|^\s*(?:please\s+)?say)\s+(.+?)\s+in\s+[A-Za-z][A-Za-z-]{2,}\s*[?.!]?\s*$/i)?.[1]
    ?.trim();
  if (said && said.length >= 2 && !PLACEHOLDER.test(said)) return said.replace(TRAILING_JUNK, "").trim() || null;

  // "Translate in arabic, What are you doing?" — the language first, the text
  // after it. Anchored on a language-shaped word so an ordinary comma in a
  // sentence cannot split it.
  const flipped = s
    .match(/\btrans[a-z]*\s+(?:in|into|to)\s+[a-z][a-z -]{2,24}?\s*[,:]\s*(.+)$/is)?.[1]
    ?.trim();
  if (flipped && flipped.length >= 2) return flipped.replace(TRAILING_JUNK, "").trim() || null;

  return null;
}

/** The language asked for, as a name or an ISO 639-1 code. */
export function targetLanguage(question: string): { name: string; code: string } | null {
  const s = String(question ?? "").toLowerCase();
  // `[a-z ]`, not `[a-z\s]`: a newline must not be swallowed. "Transalte this
  // from swedish to English\n\nHej, jag ar Wick" captured "english\n\nhej" as
  // the language name, which resolved to the right code by its first word but
  // put the payload's first word into the answer's `target_language`.
  const m = s.match(/\b(?:in)?to\s+([a-z][a-z ]{2,24}?)(?:[.,?!]|$)/);
  const raw = m?.[1]?.trim();
  if (raw) {
    if (LANGS[raw]) return { name: raw, code: LANGS[raw]! };
    // "mandarin chinese" -> try the last word, then the first
    const words = raw.split(/\s+/);
    for (const w of [words[words.length - 1], words[0]]) {
      if (w && LANGS[w]) return { name: raw, code: LANGS[w]! };
    }
  }
  // The language the text goes INTO, allowing one adjective ("into natural Hebrew"), before any
  // language merely mentioned: "Translate the following English passage into natural Hebrew"
  // resolved to English, the source, because the scan below meets "english" first.
  for (const pattern of [/\b(?:into|to)\s+(?:[a-z]+\s+)?([a-z]+)\b/g, /\bin\s+(?:[a-z]+\s+)?([a-z]+)\b/g]) {
    for (const c of s.matchAll(pattern)) {
      const w = c[1]!;
      if (LANGS[w]) return { name: w, code: LANGS[w]! };
    }
  }
  for (const [name, code] of Object.entries(LANGS)) {
    if (new RegExp(String.raw`\b` + name + String.raw`\b`).test(s)) return { name, code };
  }
  // Codes are tried only after every name resolution has failed, so every
  // question that resolved before still resolves to the byte-identical answer,
  // and the only behaviour change is that requests we previously REFUSED —
  // `target_language=de` composed into `into de.` — now translate. Two-letter
  // 639-1 codes double as English words ("it", "no"), which is why this pass
  // never outranks a name found anywhere in the question.
  for (const c of s.matchAll(/\b(?:in)?to\s+([a-z]{2}(?:-[a-z]{2})?)(?=[.,?!\s]|$)/g)) {
    const hit = CODES[c[1]!];
    if (hit) return hit;
  }
  return null;
}

export async function translate(question: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<TranslationResult> {
  const now = new Date().toISOString();
  const text = sourceText(question);
  const lang = targetLanguage(question);

  const base: TranslationResult = {
    source_text: text,
    target_language: lang ? lang.name.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : null,
    target_code: lang?.code ?? null,
    translation: null,
    source: null,
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

  const out = await phrase({
    system:
      `Translate the user's text into ${base.target_language} (${lang.code}). Reply with the translation ` +
      `only: no quotation marks, notes, alternatives, transliteration or explanation.`,
    user: text,
    // gpt-oss counts its reasoning against this, so leave room beyond the text itself.
    maxTokens: 300 + Math.ceil(text.length / 2),
    deadlineMs: timeoutMs,
    clean: (raw) => cleanTranslation(raw, text),
  });
  if (!out) throw new Error("translation providers unavailable");

  return {
    ...base,
    translation: out,
    source: "Groq (open-weight model, machine translation)",
    verdict: "translated",
    // A model's translation, so not 1.0, which is kept for a direct read of an authoritative record.
    // 0.9 rather than lower: the four audited translations all passed (calibration-2026-10-26).
    confidence: 0.9,
    reason: out,
  };
}

/**
 * A model reply as a translation, or null when it is not one.
 *
 * Models wrap translations in labels and quotes, and occasionally refuse or explain. A label is
 * removed; anything that still is not a plausible translation of `source` is rejected, because a
 * commentary served as a translation is a confidently wrong answer.
 */
export function cleanTranslation(raw: string, source: string): string | null {
  let t = String(raw ?? "").replace(/```[\s\S]*?```/g, " ").trim();
  t = t.replace(/^(?:here(?:'s| is) (?:the|your) translation[^:\n]*:|translation\s*:|translated text\s*:)\s*/i, "");
  // Quotes the source did not have are the model's, not the translation's.
  if (!/^["'“‘«「]/.test(source.trim())) t = t.replace(/^["“‘«「]+|["”’»」]+$/g, "").trim();
  if (!/\n/.test(source)) t = t.replace(/\s+/g, " ");
  if (!t) return null;
  if (/\b(?:i cannot|i can't|i am unable|i'm unable|as an ai|i'm sorry|sorry, but)\b/i.test(t)) return null;
  // Far longer than the source means commentary came along with the translation.
  if (t.length > source.length * 4 + 40) return null;
  // The source handed back unchanged is not a translation. Measured 2026-10-18: two routed
  // "into Ukrainian" requests came back as the English text itself. A one- or two-word source
  // may legitimately survive unchanged (a name, "OK"), so only longer ones are rejected.
  const norm = (x: string): string => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (norm(t) === norm(source) && norm(source).split(" ").length > 2) return null;
  return t;
}
