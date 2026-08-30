/**
 * AI_TEXT_DETECTION / TEXT_AUTHENTICITY_CHECK — measurable signals, hedged verdict.
 *
 * Canonical intent: "Query provides a specific block of text and asks whether it
 * was written by an AI or a human."
 *
 * **The honesty constraint that shapes this file.** Statistical AI-text
 * detection is not reliable, and every published detector has a false-positive
 * rate high enough to defame real authors. So this endpoint reports what it
 * actually measured — burstiness, lexical diversity, repetition, punctuation
 * variety, and formulaic connectives — states what those weakly indicate, and
 * returns a confidence that is *usually low*. It never asserts authorship
 * outright. A confidently wrong answer is worse than no answer, which is why
 * SPORTS_SCORE was dropped from this miner.
 *
 * The incumbent `veritarach-ai-text-detector` returns
 * `{"confidence":0.99987,"label":"human_written"}` — a bare classification with
 * no prose. Telegraph scores a natural-language conversion of the answer, so a
 * label alone converts to nothing and scores ~1e-10. Measured against the live
 * champion scorer (`aidet_s2.wasm`, reg 1286), that exact shape returns 0.0 and
 * prose returns up to 1.0. Answering in prose is both the honest thing and the
 * scoring thing.
 */

export interface AiDetectResult {
  verdict: "likely_human" | "likely_ai" | "inconclusive" | "unknown";
  confidence: number;
  words: number;
  sentences: number;
  mean_sentence_words: number | null;
  sentence_length_stdev: number | null;
  type_token_ratio: number | null;
  repeated_bigrams: number;
  formulaic_markers: string[];
  reason: string;
  error?: string;
}

/**
 * Connectives that appear far more often in assistant prose than in human
 * writing. Weak evidence individually; only counted, never decisive.
 */
const FORMULAIC = [
  "it is important to note", "it's important to note", "in conclusion", "overall,",
  "furthermore", "moreover", "additionally,", "in summary", "delve into", "it is worth noting",
  "a testament to", "plays a crucial role", "plays a vital role", "navigate the complexities",
  "in today's world", "when it comes to", "on the other hand", "as an ai", "i cannot provide",
];

function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
}
function wordsOf(text: string): string[] {
  return text.toLowerCase().replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * The passage to analyse, separated from the instruction wrapped around it.
 * Measuring the question along with the passage would skew every statistic.
 */
export function extractPassage(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const quoted = s.match(/["“]([\s\S]{40,})["”]/);
  if (quoted?.[1]) return quoted[1].trim();
  const colon = s.match(/(?:text|passage|content|following|excerpt|paragraph)\s*:\s*([\s\S]{40,})$/i);
  if (colon?.[1]) return colon[1].trim();
  // A bare question with no passage is not something to analyse. 40 words is
  // the floor below which none of these statistics mean anything at all.
  return wordsOf(s).length >= 40 ? s : "";
}

export function detectAiText(raw: string): AiDetectResult {
  const passage = extractPassage(raw);
  const base: AiDetectResult = {
    verdict: "unknown", confidence: 0, words: 0, sentences: 0,
    mean_sentence_words: null, sentence_length_stdev: null, type_token_ratio: null,
    repeated_bigrams: 0, formulaic_markers: [], reason: "",
  };

  if (!passage) {
    return {
      ...base,
      reason:
        "No text long enough to analyse was supplied with this request, so no authorship " +
        "determination can be made. Statistical authorship detection needs at least about 40 " +
        "words of continuous prose to produce any meaningful signal. Supply the passage and its " +
        "burstiness, lexical " +
        "diversity, repetition and punctuation variety can be measured and reported.",
      error: "invalid_input",
    };
  }

  const sents = sentencesOf(passage);
  const words = wordsOf(passage);
  const lens = sents.map((s) => wordsOf(s).length).filter((n) => n > 0);
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const variance = lens.length > 1 ? lens.reduce((a, b) => a + (b - mean) ** 2, 0) / (lens.length - 1) : 0;
  const stdev = Math.sqrt(variance);
  const ttr = words.length ? new Set(words).size / words.length : 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i + 1 < words.length; i++) {
    const k = `${words[i]} ${words[i + 1]}`;
    bigrams.set(k, (bigrams.get(k) ?? 0) + 1);
  }
  const repeated = [...bigrams.values()].filter((n) => n > 1).length;

  const low = passage.toLowerCase();
  const markers = FORMULAIC.filter((m) => low.includes(m));

  // Three weak indicators, each worth one vote. Low burstiness, high formulaic
  // density and unusually even sentence lengths lean machine; the opposite leans
  // human. Two agreeing votes is the most this method can honestly claim.
  let aiVotes = 0;
  let humanVotes = 0;
  if (lens.length >= 3) {
    if (stdev < 4) aiVotes++;
    else if (stdev > 8) humanVotes++;
  }
  if (markers.length >= 2) aiVotes++;
  else if (markers.length === 0) humanVotes++;
  if (ttr < 0.45) aiVotes++;
  else if (ttr > 0.62) humanVotes++;

  const verdict: AiDetectResult["verdict"] =
    aiVotes >= 2 && aiVotes > humanVotes ? "likely_ai"
    : humanVotes >= 2 && humanVotes > aiVotes ? "likely_human"
    : "inconclusive";
  // Capped at 0.6. This method does not support more than that, and every
  // detector that reports 0.99 is overclaiming.
  const agreement = Math.max(aiVotes, humanVotes);
  const confidence = verdict === "inconclusive" ? 0.25 : Math.min(0.6, 0.3 + agreement * 0.1);

  const r1 = (n: number) => Math.round(n * 100) / 100;
  const verdictWords =
    verdict === "likely_ai" ? "leans towards machine generation"
    : verdict === "likely_human" ? "leans towards human authorship"
    : "does not favour either machine generation or human authorship";

  return {
    ...base,
    verdict,
    confidence: r1(confidence),
    words: words.length,
    sentences: sents.length,
    mean_sentence_words: r1(mean),
    sentence_length_stdev: r1(stdev),
    type_token_ratio: r1(ttr),
    repeated_bigrams: repeated,
    formulaic_markers: markers.slice(0, 5),
    reason:
      `The supplied text ${verdictWords}, at a confidence of ${r1(confidence)}. ` +
      `Across ${words.length} words in ${sents.length} sentences the analysis measured a mean ` +
      `sentence length of ${r1(mean)} words with a standard deviation of ${r1(stdev)}, a ` +
      `type-token ratio of ${r1(ttr)}, ${repeated} repeated word pairs, and ` +
      `${markers.length} formulaic connective${markers.length === 1 ? "" : "s"}` +
      (markers.length ? ` (${markers.slice(0, 3).join("; ")})` : "") +
      `. These are statistical indicators only. Authorship detection is not reliable enough to ` +
      `treat as proof, and this result should not be used on its own to accuse anyone of ` +
      `passing off machine-generated work.`,
  };
}
