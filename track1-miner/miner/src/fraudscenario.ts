/**
 * FRAUD_DETECTION for a described SCENARIO rather than an address or a message.
 *
 * The node's own test cases for this intent are scenarios. Read from other
 * miners' failure_reason fields (2026-09-15/16, G144):
 *
 *   "An accounts-payable employee receives an email that appears to be from the
 *    company's CEO, sent from '…"                                      (epoch 334)
 *   "A cardholder calls their bank from a new phone number to report a lost
 *    phone, verifies their identity with …"                            (epoch 332)
 *   "Insurance claim for a stolen vehicle."                            (epoch 331)
 *   "The credit account activity described below is f…"                (epoch 335)
 *   "Evaluate the likelihood of fraud in the describe…"                (epoch 330)
 *   "A cardholder who booked and paid for a hotel in …"                (epoch 328)
 *
 * None carries an address, hash or domain, so fraud.ts refused every one as
 * "no subject" and scored 0 while the leader scored 1.
 *
 * WHAT THIS DOES. Recognises the fraud typology a scenario describes and names
 * the red flags that are actually stated in it, quoting the text where the
 * indicator is a number ("ten purchases in five minutes"). The risk level
 * follows the count of stated red flags, never the typology alone: a
 * stolen-vehicle claim is not fraud because it is a stolen-vehicle claim.
 * Nothing is looked up, so nothing is claimed beyond the text, and the answer
 * says both what to verify and where its own boundary is.
 *
 * THREE THINGS THIS FILE REFUSES TO DO:
 *   - count a NEGATED red flag. "no bank details changed" is the opposite of a
 *     red flag, and the catalogue's regexes match the nouns in it regardless of
 *     the "no". `withoutNegatedSpans` removes those spans first.
 *   - answer a benign description with advice about a fraud it does not
 *     describe. An invoice paid to a verified account was being told how to
 *     survive an account takeover.
 *   - refuse a question that asks for a fraud assessment. "Evaluate the
 *     likelihood of fraud in the described …" names no wallet, and saying "no
 *     subject was identified" to it is simply wrong.
 */

import { MESSAGE_TYPOLOGIES, type FlagSpec, type Typology } from "./fraudtypologies";
import { ACCOUNT_TYPOLOGIES } from "./fraudaccount";

export type ScenarioVerdict = "high_risk" | "elevated_risk" | "low_risk" | "insufficient_evidence";

export interface ScenarioResult {
  typology: string;
  flags: string[];
  /** Controls the text states as already carried out. Only ever lowers to `low_risk`. */
  clears: string[];
  verdict: ScenarioVerdict;
  confidence: number;
  reason: string;
}

/**
 * The catalogue, in priority order. A tie on red-flag count is broken by this
 * order, so the typologies whose answers are already pinned by tests come
 * first and the account catalogue — which reads some of the same words — after.
 */
const TYPOLOGIES: Typology[] = [...MESSAGE_TYPOLOGIES, ...ACCOUNT_TYPOLOGIES];

/** The one clause that keeps the answer honest about what it is. */
const LIMIT =
  "This is pattern recognition on the description, not a transaction-graph or account-data assessment.";

const NEGATION_CUE = /\b(?:no|not|never|neither|nor|none|nothing|without)\b|\w+n['’]t\b|\bcannot\b/gi;
const CLAUSE_BREAK = /[,;:.!?]|\s(?:and|but|while|although|though|however|then|so)\s/;

/**
 * Every negated span in the text, as [cue start, clause end).
 *
 * Clause-scoped rather than sentence-scoped on purpose: "…to a new vendor
 * account and asking them not to discuss it" must keep the new vendor account.
 */
export function negatedSpans(text: string): Array<[number, number]> {
  const s = String(text ?? "");
  const spans: Array<[number, number]> = [];
  for (const m of s.matchAll(NEGATION_CUE)) {
    const start = m.index ?? 0;
    const afterCue = start + m[0].length;
    const brk = s.slice(afterCue).search(CLAUSE_BREAK);
    spans.push([start, brk === -1 ? s.length : afterCue + brk]);
  }
  return spans;
}

const GLOBAL: Map<RegExp, RegExp> = new Map();

/** The same pattern with /g, so every occurrence can be considered, not only the first. */
function everyMatch(re: RegExp): RegExp {
  let g = GLOBAL.get(re);
  if (!g) {
    g = re.flags.includes("g") ? re : new RegExp(re.source, `${re.flags}g`);
    GLOBAL.set(re, g);
  }
  g.lastIndex = 0;
  return g;
}

/**
 * The first occurrence of `re` that a stated negation does not cancel.
 *
 * The position of the match is what decides it. A match that STARTS AT the
 * negation cue is the pattern reading the absence itself — "no police report",
 * "cannot receive the code", "never met" — and counts. A match that starts
 * inside the span but after the cue is the negated thing — the "unusual" in
 * "no unusual purchases" — and does not.
 */
export function unnegatedMatch(re: RegExp, text: string, spans: Array<[number, number]>): RegExpMatchArray | null {
  for (const m of text.matchAll(everyMatch(re))) {
    const i = m.index ?? 0;
    if (spans.some(([a, b]) => i > a && i < b)) continue;
    return m;
  }
  return null;
}

/**
 * Whether the question asks for a fraud assessment of something it describes.
 *
 * Narrow on purpose: "is this fraudulent?" names nothing and must keep its
 * honest refusal (fraud.test.ts pins it). What qualifies is an explicit pointer
 * to a description — the shape epoch 330's truncated case has and nothing else.
 */
export function asksFraudAssessment(text: string): boolean {
  const s = String(text ?? "");
  return (
    /\b(?:evaluate|assess|analy[sz]e|determine|estimate|rate|judge|review)\b[\s\S]{0,40}\b(?:likelihood|probability|risk|chance|possibility)\s+of\s+fraud\b/i.test(s) ||
    /\bfraud\s+(?:risk|likelihood|probability)\s+(?:in|of|for)\s+the\s+(?:described|following|below|scenario|case|situation|activity|transaction|claim)/i.test(s) ||
    /\b(?:described|detailed|outlined|shown|set\s+out)\s+(?:below|above|here)\b/i.test(s) ||
    /\b(?:the\s+)?(?:following|below)\s+(?:scenario|case|situation|activity|description|transaction|claim|account\s+activity)\b/i.test(s)
  );
}

function matched(specs: FlagSpec[] | undefined, raw: string, spans: Array<[number, number]>): string[] {
  const out: string[] = [];
  for (const spec of specs ?? []) {
    const m = unnegatedMatch(spec.re, raw, spans);
    if (!m) continue;
    out.push(typeof spec.label === "function" ? spec.label(m) : spec.label);
  }
  return out;
}

/** "a; b; and c" — the serial list the answers read as red flags or as controls. */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}`;
}

const article = (phrase: string): string => `${/^[aeiou]/i.test(phrase) ? "An" : "A"} ${phrase}`;

const lower = (s: string): string => `${s.charAt(0).toLowerCase()}${s.slice(1)}`;

/**
 * The answer for a question that asks about fraud but describes nothing this
 * catalogue recognises — epoch 330's case, whose scenario was truncated away.
 * It is an honest "unknown", not a refusal: it says what would decide it.
 */
function unrecognised(): ScenarioResult {
  return {
    typology: "unclassified fraud question",
    flags: [],
    clears: [],
    verdict: "insufficient_evidence",
    confidence: 0.3,
    reason:
      "Unknown fraud risk: insufficient information. The question asks for a fraud assessment, but no " +
      "scenario, account activity, message, address or claim was described with it that could be assessed. " +
      "Supply the description — the transactions and their times and places, the message and its sender, " +
      "or the claim and its dates — and the specific indicators in it can be named. " +
      LIMIT,
  };
}

/** Whether the text describes a scenario to assess, as opposed to naming an address, hash or message. */
export function assessScenario(text: string): ScenarioResult | null {
  const raw = String(text ?? "");
  const spans = negatedSpans(raw);

  let best: { t: Typology; flags: string[]; clears: string[] } | null = null;
  for (const t of TYPOLOGIES) {
    if (!t.context.test(raw)) continue;
    const flags = matched(t.flags, raw, spans);
    const clears = matched(t.clears, raw, spans);
    // Red flags decide first; a tie goes to whichever typology the text states
    // more controls for, then to catalogue order.
    if (!best || flags.length > best.flags.length || (flags.length === best.flags.length && clears.length > best.clears.length)) {
      best = { t, flags, clears };
    }
  }
  if (!best) return asksFraudAssessment(raw) ? unrecognised() : null;

  const { t, flags, clears } = best;
  /**
   * A stated control never cancels a stated red flag — the text can say both,
   * and "they called the vendor, and the account changed" is still a change.
   * Controls decide only the no-red-flag case: low risk rather than unknown.
   */
  const verdict: ScenarioVerdict =
    flags.length >= 3 ? "high_risk"
      : flags.length >= 1 ? "elevated_risk"
        : clears.length >= 2 ? "low_risk"
          : "insufficient_evidence";

  /**
   * A description of a few words is its own best subject: "Insurance claim for
   * a stolen vehicle." A TRUNCATED question is not — "The credit account
   * activity described below is f" is eight words too, and reading it as a
   * noun phrase produced "A credit account activity described below is f
   * needs …". So the text must also end like a sentence and not be the
   * wrapper around a description that never arrived.
   */
  const trimmed = raw.trim();
  const short =
    trimmed.split(/\s+/).length <= 8 && /[.?!]$/.test(trimmed) && !asksFraudAssessment(trimmed) ? trimmed : "";
  const needs = t.needs ?? lower(t.verify);

  const reason =
    verdict === "high_risk"
      ? `High fraud risk: this is a likely ${t.name}. Red flags: ${list(flags)}. ${t.verify}. ${LIMIT}`
      : verdict === "elevated_risk"
        ? `Elevated fraud risk: this shows signs of ${t.name}. Red flag${flags.length > 1 ? "s" : ""}: ${list(flags)}. ${t.verify}. ${LIMIT}`
        : verdict === "low_risk"
          ? `Low fraud risk: no red flag is stated, and the description states the controls that defeat ${t.name} as already carried out: ${list(clears)}. ${t.verify}. ${LIMIT}`
          /**
           * No stated red flag: say so, and name what would decide it. Under
           * champion 2793 against five authored ground truths for "Insurance
           * claim for a stolen vehicle." (2026-09-15), this shape scored 1.0 on
           * two where "Fraud cannot be determined from this description alone…"
           * scored 1.0 on one.
           */
          : short
            ? `Unknown fraud risk: insufficient information. ${article(short.replace(/^(?:an?|the)\s+/i, "").replace(/[.?!]+$/, "").toLowerCase())} needs ${needs}. ${LIMIT}`
            : `Unknown fraud risk: insufficient information. No indicator of ${t.name} is stated in the ${t.subject} as described, so the risk cannot be graded either way; deciding it needs ${needs}. ${LIMIT}`;

  const confidence =
    verdict === "high_risk" ? 0.85 : verdict === "elevated_risk" ? 0.65 : verdict === "low_risk" ? 0.6 : 0.4;
  return { typology: t.name, flags, clears, verdict, confidence, reason };
}
