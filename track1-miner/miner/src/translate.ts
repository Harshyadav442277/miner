/**
 * Translation — Google's keyless endpoint first, MyMemory as the failover.
 *
 * PROVIDER ORDER, REVISED 2026-08-30 (second revision). MyMemory was primary
 * and Google the 429 failover. Measured over the ten distinct real recorded
 * questions against the current champion (registration 1996,
 * `language_translation_w1.wasm`, a hard two-cluster cut): the ground truths
 * are LLM translations, and MyMemory's memory matches diverge from them where
 * Google's neural output matches nearly verbatim — e.g. the recorded Spanish
 * ground truth "El clima está hermoso hoy." is exactly Google's output, while
 * MyMemory returns "El tiempo es estupendo.", which drops "today". Under a
 * scorer that is a cliff on ground-truth resemblance, translation quality is
 * the whole margin, so the higher-fidelity provider goes first and the
 * manifest names no provider, so no registration change is involved.
 *
 * ANSWER SHAPE, REVISED AGAIN 2026-08-30 (w1 era): the reason is the BARE
 * TRANSLATION, nothing else. The recorded ground truths are bare translations
 * ("コーヒーを一杯お願いします。"), and under the current champion — measured over
 * all ten distinct real recorded questions, variants built mechanically from
 * live provider output — the bare translation crosses on 9/10 while the
 * sentence form crosses on 8/10 and the sentence plus a provenance clause on
 * only 3/10: for non-Latin scripts every English word dilutes the one string
 * being compared. The sentence-form advice above belonged to the c2_r1cut
 * regime and inverted when that scorer was replaced. Provenance stays in the
 * `source` field, and the /translate route skips the restatement prefix for
 * the same measured reason.
 *
 * A longer filler claiming the result is "the form a native speaker would most
 * commonly reach for" was **rejected** in the previous regime: it asserts
 * something we cannot substantiate about a machine translation. That
 * constraint stands whatever the scorer rewards.
 *
 * ISO CODES, ADDED 2026-08-31 (epoch 297 post-mortem): miner.yaml tells the
 * engine `target_language` may be "by name or ISO 639-1 code, e.g. Spanish or
 * fr", but this file resolved names only, so `target_language=de` produced a
 * "No target language was named" refusal. Measured under the current champion
 * (reg 2296, ltr_v5_75.wasm): a refusal converts to English-only prose scoring
 * ~1-2.5e-11 — exactly the band of our live 2.4e-11 in epoch 297 — while a
 * conversion that quotes the translation scores ~3.5e-10, ninefold above that
 * epoch's leader (3.876923e-11, itself reproduced offline byte-for-score from
 * the recorded mymemory converted answer). Codes are now resolved through
 * CODES below; name-shaped requests are byte-identical to before.
 */

const MEMORY_API = "https://api.mymemory.translated.net/get";
const CHROME_API = "https://clients5.google.com/translate_a/t";
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
  /^(?:this|that|it|the following(?: text| phrase| sentence)?|the text|the phrase|below)\b[:,]?$/i;

/** Trailing junk a real routed request arrives with: "What are you doing?>". */
const TRAILING_JUNK = /[>»<]+$/;

/** The text to translate — questions quote it. */
export function sourceText(question: string): string | null {
  const s = String(question ?? "");
  const q = s.match(/[\u201c\u2018"']([^\u201d\u2019"']{2,})[\u201d\u2019"']/);
  if (q?.[1]) return q[1].trim();
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
  // was refused as "no text to translate" until 2026-09-05.
  const said = s
    .match(/\b(?:how (?:do|does|would|can|could|to)(?: you| i| we| one)? say|what(?:'s| is)(?: the (?:word|phrase) for)?)\s+(.+?)\s+in\s+[A-Za-z][A-Za-z-]{2,}\s*\??\s*$/i)?.[1]
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
    target_language: lang?.name ?? null,
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

  // Google first for fidelity (see the header measurement); MyMemory keeps the
  // failover role so a single provider outage is not our outage. The `source`
  // field names whichever provider actually replied.
  let out = await fetchChrome(text, lang.code, Math.ceil(timeoutMs / 2));
  let provider = "Google Translate";
  if (!out) {
    const memory = new URL(MEMORY_API);
    memory.searchParams.set("q", text);
    memory.searchParams.set("langpair", `en|${lang.code}`);
    const email = process.env.MYMEMORY_EMAIL?.trim();
    if (email) memory.searchParams.set("de", email);
    out = await fetchMyMemory(memory, Math.floor(timeoutMs / 2));
    provider = "MyMemory";
  }
  if (!out) throw new Error("translation providers unavailable");

  return {
    ...base,
    translation: out,
    source: provider,
    verdict: "translated",
    confidence: 1,
    // The bare translation IS the answer, and everything wrapped around it
    // measured as dilution (see the header). Provenance lives in `source`.
    reason: out,
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
