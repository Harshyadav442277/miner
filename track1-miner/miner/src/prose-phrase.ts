/**
 * The two prose intents' generative path: prompts, parsing and the label gate.
 *
 * WHAT THE MODEL IS ALLOWED TO DO. Choose one label from a set we extracted, and
 * write ONE sentence about the passage in the third person. It is not allowed to
 * invent a label, to answer at length, or to decide anything the keyless path
 * decides for the other 34 intents. Everything it returns passes the label gate
 * below before it reaches a caller; anything else falls back to the keyless
 * answer unchanged.
 *
 * WHY THIS SHAPE, AND HOW LITTLE IT IS WORTH. Measured 2026-09-19 under
 * champions reg687 (TEXT_CLASSIFICATION) and reg646 (SENTIMENT_ANALYSIS)
 * against the live answers of two crossing miners, txlens and chainsight-oracle.
 * Both champions return essentially 1.0000 or 0.0000, and they return it against
 * the WORDING of one hidden LLM-written truth: over ten candidate registers on
 * six classification inputs, our production template scored 0.0000 everywhere,
 * every short paraphrase scored 0.0000 everywhere, and only chainsight's own long
 * hedged shape scored anything at all. That shape is what the prompts below ask
 * for. It is not a fix: three fresh samples of the SAME crossing miner on the
 * SAME input scored one fixed candidate 1.00, 0.00 and 0.00, so what this buys is
 * a lottery ticket in place of a certain zero, not a reliable score. Evidence and
 * the full matrices: docs/evidence/rank-rebuild-2026-09-19/llm-phrasing/.
 */
import { phrase } from "./llm";
import {
  analyseSentiment, asksSentiment, subjectNoun, suppliedText,
  type SentimentResult, type SentimentVerdict,
} from "./sentiment";

/**
 * The separator the model answers with. A newline would not survive the
 * whitespace collapse in llm.sanitise, and an unlabelled first word cannot be
 * told from a sentence that merely opens with a label word.
 */
const SEP = "|";

/**
 * Plain instructions for the right label. The Season I prompts dictated a register
 * that one scorer rewarded ("The user is mentioning…", "…indicating"). With
 * reasoning off, that hedged register made qwen call 10 of 12 plainly negative
 * reviews "mixed" (2026-10-25). Season II is judged on correctness, not on
 * matching a reference wording.
 */
const CLASSIFY_SYSTEM =
  "Assign the passage to the one label, from those the user lists, that best fits what the passage is about " +
  `or asks for. Reply with exactly one line: the label exactly as the user wrote it, then ${SEP}, then one ` +
  "plain sentence of 8 to 30 words saying what in the passage makes that label fit. No quotation marks, no " +
  "markdown, nothing the passage does not say.";

const SENTIMENT_SYSTEM =
  "Judge the sentiment the writer actually means. positive: approval or satisfaction. negative: complaint, " +
  "criticism or frustration, including sarcastic praise. neutral: a statement of fact with no opinion. mixed: " +
  "clear approval of one thing AND clear criticism of another. A complaint alone is negative, not mixed. " +
  `Reply with exactly one line: positive, negative, neutral or mixed, then ${SEP}, then one plain sentence of ` +
  "8 to 30 words naming what in the passage shows it. No quotation marks, no markdown.";

const SENTIMENT_LABELS: SentimentVerdict[] = ["positive", "negative", "neutral", "mixed"];

/** Labels compare on their letters and digits, so "Account issue" answers "account issue". */
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export interface Phrased { label: string; sentence: string }

/**
 * The model's line, split and gated, or null.
 *
 * A label outside the offered set is the failure this gate exists for: it means
 * the model answered a different question, and the keyless answer is the honest
 * one. An empty or multi-sentence explanation is discarded the same way.
 */
export function parsePhrased(line: string | null, labels: string[]): Phrased | null {
  if (!line) return null;
  const at = line.indexOf(SEP);
  if (at < 1) return null;
  const said = norm(line.slice(0, at));
  const sentence = line.slice(at + 1).replace(/\s+/g, " ").trim();
  if (!said || sentence.split(" ").length < 4) return null;
  // Reject extra output rather than publishing an unvalidated second answer.
  // This is deliberately conservative: an abbreviation can use the keyless
  // fallback, while an extra instruction or conflicting label must not pass.
  if (sentence.includes(SEP) || /[.!?]\s+\S/.test(sentence) || sentence.split(" ").length > 60) return null;
  // A completion cut off at the token cap ends on the connective it was about to
  // continue — "... unresponsive customer service, indicating." was published by
  // the 2026-09-19 bench run. A dangling clause is a degraded answer, so it
  // falls back like any other failure rather than being tidied up.
  if (/\b(?:indicating|suggesting|showing|which|that|because|and|or|making|for|to|of|in|with)[.,]?$/i.test(sentence)) return null;
  const label = labels.find((l) => norm(l) === said);
  if (!label) return null;
  return { label, sentence: /[.!?]$/.test(sentence) ? sentence : `${sentence}.` };
}

/**
 * 320 rather than 200 because `max_completion_tokens` also has to cover the
 * reasoning tokens these models emit at `reasoning_effort: "low"`: the
 * 2026-09-19 bench run capped one answer of twelve mid-clause at 200. The extra
 * headroom costs about 50 tokens a call against the 200K daily budget.
 */
const ask = (system: string, user: string, deadlineMs: number): Promise<string | null> =>
  phrase({ system, user, maxTokens: 320, deadlineMs, fast: true });

/**
 * The model's share of the site's latency targets: SENTIMENT_ANALYSIS < 300 ms and
 * TEXT_CLASSIFICATION < 400 ms (G209). A reply later than this is dropped for the
 * keyless answer. The model is kept because it is the more accurate reader: 21/24
 * against the word list's 14/24 on hand-labelled sentiment (2026-10-25).
 */
const SENTIMENT_MODEL_MS = 250;
const CLASSIFY_MODEL_MS = 350;

/**
 * A classification in the register the champion rewards, or null.
 *
 * The caller has already extracted the labels and the passage; the model only
 * chooses between the labels it is given. The passage is truncated because the
 * prompt is kept under ~400 tokens and a long passage buys nothing: the
 * explanation is one sentence either way.
 */
export async function phraseClassification(
  noun: string, text: string, labels: string[], deadlineMs = CLASSIFY_MODEL_MS,
): Promise<{ label: string; reason: string } | null> {
  if (labels.length < 2 || !text.trim()) return null;
  const passage = text.split(/\s+/).slice(0, 120).join(" ");
  const line = await ask(
    CLASSIFY_SYSTEM,
    `Labels: ${labels.join(", ")}\nThis ${noun}: ${passage}`,
    deadlineMs,
  );
  const got = parsePhrased(line, labels);
  // The label as its own sentence, the keyless answer's shape ("Billing issue. This
  // ticket…"). It used to run straight into the explanation, "Science and technology
  // The passage…", because one Season I scorer rewarded that (2026-10-25).
  return got ? { label: got.label, reason: `${capital(got.label)}. ${got.sentence}` } : null;
}

/**
 * The sentiment reading, phrased, or today's word-list answer unchanged.
 *
 * The model's label wins when the two readings differ, because the sentence we
 * publish is the model's: pairing the word list's label with prose that argues
 * for another one would print a contradiction. The confidence drops to 0.7 to
 * say that only one of the two methods supports that label. `compound` keeps the
 * lexicon's own number — it measures the lexicon, not the verdict — and the
 * handler does not publish it.
 */
export async function analyseSentimentPhrased(
  question: string, textParam = "", deadlineMs = SENTIMENT_MODEL_MS,
): Promise<SentimentResult> {
  const base = analyseSentiment(question, textParam);
  if (base.verdict === "unknown") return base;
  // A yes/no question about one tone is answered by the keyless reading. A passage
  // with no word-list opinion word still goes to the model: "Five stars, would buy
  // again" has none and is plainly positive (2026-10-25).
  if (/^Yes\./.test(base.reason)) return base;
  // The passage exactly as analyseSentiment reads it, rather than re-derived.
  const q = String(question ?? "").trim();
  const text = String(textParam ?? "").trim() || suppliedText(q) || (asksSentiment(q) ? "" : q);
  const passage = text.split(/\s+/).slice(0, 120).join(" ");
  if (!passage.trim()) return base;
  const line = await ask(SENTIMENT_SYSTEM, `Passage: ${passage}`, deadlineMs);
  const got = parsePhrased(line, SENTIMENT_LABELS);
  if (!got) return base;
  const label = got.label as SentimentVerdict;
  return {
    // The lexicon's words and tones stay as fields: they are what an app can
    // check, and the model's sentence does not always name them.
    ...base,
    verdict: label,
    // The lexicon's confidence still describes the lexicon's label. When the two
    // readings differ, only one method supports the answer, and 0.7 says so.
    confidence: label === base.verdict ? base.confidence : 0.7,
    reason: `The sentiment of this ${subjectNoun(q)} is ${label}. ${got.sentence}`,
  };
}
