/**
 * Reading a TEXT_CLASSIFICATION request: the label set, the passage once the
 * instruction is taken off it, whether one label is wanted or several, and which
 * of the text's words sit inside a negated clause.
 *
 * Every one of these is a parsing job with no network and no model, split out of
 * classify.ts so scoring and the answer stay in one file and this stays readable.
 *
 * WHY IT MATTERS. Production answered `error: no_labels` to "Classify this
 * customer message into one of: billing, technical, cancellation, account.
 * Message: Do not cancel my subscription; I only need to update my card."
 * (2026-09-16). "one of:" with no space before the colon matched none of the old
 * patterns, so a well-formed request was refused. A refusal scores zero exactly
 * like a wrong answer, and the question set is hidden (G24), so the parser has to
 * take every ordinary phrasing rather than the ones we happened to write down.
 */
import { suppliedText } from "./sentiment";

/** What a request calls the passage when it labels it: "Text:", "Message:", "Ticket:". */
const PASSAGE_NOUN = "customer message|support ticket|text|message|ticket|review|article|email|comment|post|" +
  "passage|content|document|input|sentence|headline|tweet|snippet|excerpt|paragraph|body|item";

/** What a request calls the label set: "categories:", "labels:", "Options:". */
const LABEL_NOUN = "categor(?:y|ies)|labels?|classes|class|options?|topics?|types?|tags?|buckets?|choices?|groups?";

/**
 * Where a label list ends: a sentence mark, a colon, the opening quote of the
 * passage, a line break, or a "Message:" style separator. A quote only ends the
 * list when a space comes first, so an apostrophe inside a label is not a border.
 */
const END = `(?=\\s*(?:[.?!]|:|\\n|$)|\\s+["“'‘]|\\s+(?:${PASSAGE_NOUN})\\s*[:=])`;

const rx = (body: string): RegExp => new RegExp(body + END, "gi");

/**
 * The phrasings a label set arrives in, most explicit first. The first pattern
 * that yields two or more labels wins; a pattern that matches but splits into
 * fewer than two is not a label set, and the next one is tried.
 */
const PATTERNS: RegExp[] = [
  // "categories: a, b, c"  ·  "labels: [a, b, c]"  ·  "Options: a; b; c"
  // ·  "What type of issue is this: a, b or c" — up to forty characters may sit
  //    between the noun and its colon, which is where "does this belong to" goes.
  rx(`\\b(?:${LABEL_NOUN})\\b[^:\\n]{0,40}?[:=]\\s*\\[?\\s*([^\\n]+?)\\]?`),
  // "topics are a / b / c" — the same list, written without a colon.
  rx(`\\b(?:${LABEL_NOUN})\\b\\s*(?:are|is|include|being)\\s+\\[?\\s*([^\\n]+?)\\]?`),
  // "into one of: a, b, c."  ·  "one of these categories: …"  ·  "one or more of the following: …"
  rx(`\\b(?:one(?:\\s+or\\s+more)?|any|either|each|all)\\s+of\\b\\s*(?:these|the following|the|those)?\\s*(?:${LABEL_NOUN})?\\s*[:=]?\\s*\\[?\\s*([^\\n]+?)\\]?`),
  // "which category does this belong to: a, b or c"  ·  "falls under a, b or c"
  rx("\\b(?:belongs?|fall|falls|fit|fits|goes)\\s+(?:to|in|into|under|within)\\b\\s*[:=]?\\s*([^\\n]+?)"),
  // "assign this ticket to a, b or c"  — a classification verb, then "to", then the list.
  rx("\\b(?:classif(?:y|ied)|categori[sz]e|assign|sort|label|place|file|tag)\\b[^:\\n]{0,40}?\\bto\\s+(?:either\\s+)?(?:an?\\s+)?([^\\n]+?)"),
  // "as a, b, or c:"  ·  "into a, b or c"  ·  "among a, b, c"
  rx("\\b(?:as|into|under|among|amongst|between)\\s+(?:either\\s+)?(?:an?\\s+)?([^\\n]+?)"),
  // "(a, b, c)" and "[a, b, c]" on their own.
  /\[\s*([^\]\n]{3,200}?)\s*\]/g,
  /\(\s*([^)\n]{3,200}?)\s*\)/g,
];

export interface LabelSet {
  labels: string[];
  /** The question after the label list, with the instruction taken off. "" when none. */
  rest: string;
}

/** A single label, cleaned of its bullet, article, brackets, quotes and trailing punctuation. */
function cleanLabel(l: string): string {
  return String(l ?? "")
    .replace(/^\s*(?:[-*•–—]|\d+[.)]|[a-z][.)])\s*/i, "")
    .replace(/^(?:an?|the|either|and|or)\s+/i, "")
    .replace(/^["'“‘[(]+|["'”’\])]+$/g, "")
    .replace(/[.,;:]+$/, "")
    .trim();
}

/**
 * A label list on its own — the declared `labels` parameter, or the segment a
 * pattern found. Labels are split on commas, "or", slashes, semicolons and line
 * breaks but NOT on "and", because "business and finance" is one label; ", and"
 * before the last label is still a separator.
 */
export function splitLabels(seg: string): string[] {
  const s = String(seg ?? "").trim().replace(/^[[(]\s*/, "").replace(/\s*[\])]$/, "");
  if (!/,|\bor\b|\/|;|\n/.test(s)) return [];
  const labels = s
    .split(/\s*\n\s*|\s*,\s*(?:or\s+|and\s+)?|\s+or\s+|\s*\/\s*|\s*;\s*/i)
    .map(cleanLabel)
    .filter((l) => l.length > 0 && l.length <= 40);
  const unique = [...new Set(labels)];
  return unique.length >= 2 && labels.length <= 12 ? unique : [];
}

/** What follows the label list: the passage, minus its "Text:" prefix and its quotes. */
function afterList(after: string): string {
  return String(after ?? "")
    .replace(/^[\s.,;:?!)\]}]+/, "")
    .replace(new RegExp(`^(?:the\\s+)?(?:${PASSAGE_NOUN})(?:\\s+to\\s+classify)?\\s*[:=]\\s*`, "i"), "")
    .trim()
    .replace(/^["“'‘]+/, "")
    .replace(/["”'’]+$/, "")
    .trim();
}

/**
 * A list written down the page rather than across it:
 *
 *   Categories:
 *   - Billing
 *   - Technical
 *   Ticket: I was charged twice.
 *
 * Collection stops at the first line that is not a short item — a line carrying a
 * colon, more than four words or more than forty characters is prose, not a label.
 */
function newlineLabels(s: string): LabelSet {
  const head = new RegExp(`\\b(?:${LABEL_NOUN}|following)\\b[^\\n:]{0,30}[:=][ \\t]*\\n`, "i").exec(s);
  if (!head) return { labels: [], rest: "" };
  const start = head.index + head[0].length;
  const labels: string[] = [];
  let used = 0;
  for (const line of s.slice(start).split("\n")) {
    const bare = cleanLabel(line.trim());
    if (!bare) {
      if (labels.length) break;
      used += line.length + 1;
      continue;
    }
    if (bare.length > 40 || bare.includes(":") || bare.split(/\s+/).length > 4) break;
    // A bulleted item is capitalised by convention, and the answer speaks the
    // label inside a sentence: "a Billing issue" reads as a typo. An acronym or a
    // proper noun keeps its case — only a plain leading capital is lowered.
    labels.push(/^[A-Z][a-z]/.test(bare) && !/[A-Z]/.test(bare.slice(1)) ? bare.charAt(0).toLowerCase() + bare.slice(1) : bare);
    used += line.length + 1;
    if (labels.length >= 12) break;
  }
  const unique = [...new Set(labels)];
  return unique.length >= 2 ? { labels: unique, rest: afterList(s.slice(start + used)) } : { labels: [], rest: "" };
}

/**
 * A list that sits behind "Text:" or "Message:" is the passage, not a label set:
 * "Assign a category. Text: I was charged twice, the app crashes." must not be
 * read as two labels.
 */
const PASSAGE_PREFIX = new RegExp(`\\b(?:${PASSAGE_NOUN})\\s*[:=]\\s*["“'‘]?\\s*\\[?\\s*$`, "i");

/** The label set a question supplies, and what is left of the question after it. */
export function labelSet(question: string): LabelSet {
  const s = String(question ?? "");
  const down = newlineLabels(s);
  if (down.labels.length) return down;
  for (const pattern of PATTERNS) {
    for (const m of s.matchAll(pattern)) {
      if (m.index === undefined || !m[1]) continue;
      const at = m.index + m[0].lastIndexOf(m[1]);
      if (PASSAGE_PREFIX.test(s.slice(Math.max(0, at - 40), at))) continue;
      const labels = splitLabels(m[1]);
      if (labels.length >= 2) return { labels, rest: afterList(s.slice(m.index + m[0].length)) };
    }
  }
  return { labels: [], rest: "" };
}

/** The label set, read from the question. */
export function parseLabels(question: string): string[] {
  return labelSet(question).labels;
}

/**
 * The passage to classify: the declared parameter, else what the question quotes
 * or labels, else what follows the label list.
 *
 * `suppliedText` falls back to everything after the first colon, which on
 * "…into one of: billing, technical, cancellation, account. Message: Do not
 * cancel…" is the label list plus the message. When that happens the instruction
 * is a prefix of it and the remainder after the list is the passage.
 */
export function classifiedText(question: string, textParam = ""): string {
  const declared = String(textParam ?? "").trim();
  if (declared) return declared;
  const q = String(question ?? "");
  const quoted = suppliedText(q);
  const { rest } = labelSet(q);
  if (!rest) return quoted;
  if (!quoted) return rest;
  return quoted.length > rest.length && quoted.toLowerCase().endsWith(rest.toLowerCase()) ? rest : quoted;
}

/**
 * Whether the request asks for every label that applies rather than the single
 * best one. "one of the following" is not this; "one or more" is.
 */
export function wantsMultiLabel(question: string): boolean {
  const s = String(question ?? "");
  return /\b(?:all\s+(?:the\s+)?(?:applicable|relevant|appropriate)\b|(?:every|each|any)\s+(?:applicable\s+)?(?:label|categor(?:y|ies)|tag|class)\s+that\s+(?:applies|apply)|all\s+(?:the\s+)?(?:labels?|categor(?:y|ies)|tags?|classes)\s+that\s+(?:apply|applies|are\s+relevant)|one\s+or\s+more\b|multi[-\s]?label\b|multiple\s+(?:labels?|categor(?:y|ies)|tags?|classes)|(?:select|list|name|give|return|choose)\s+all\s+(?:that\s+)?appl(?:y|ies)|as\s+many\s+(?:labels?|categor(?:y|ies))\s+as\s+appl(?:y|ies))\b/i.test(s);
}

/**
 * A word that puts what follows it out of play: "not", "never", "don't".
 *
 * An ability modal is deliberately NOT one of them. "I can't log into my account"
 * and "I cannot reset my password" ARE the complaint, and negating their own
 * words threw away the only evidence the account label had. The same goes for
 * "won't": "the page won't load" is a technical report, not a denial that it
 * loads. What this list catches is a writer ruling a topic out.
 */
const NEG_WORD = /^(?:not|never|neither|nor)$|^(?:do|does|did|is|are|was|were|has|have|had|ain)n't$/i;

/** A phrase that does the same, and needs its second word to be recognised. */
const NEG_PHRASE: Record<string, string[]> = {
  rather: ["than"], instead: ["of"], other: ["than"], opposed: ["to"], aside: ["from"],
  apart: ["from"], no: ["longer", "need"], nothing: ["to"],
};

/**
 * A word that starts a new clause, so the negation before it has run out. Without
 * this, "The package never arrived and I want a refund" would negate the refund.
 */
const CLAUSE_BREAK = /^(?:and|but|or|so|because|since|although|though|however|while|when|where|why|that|which|who|then|yet|also|plus|besides|just)$/i;

/** How many words a single negation reaches, at most. */
const NEG_SPAN = 8;

/**
 * The words of the text that appear only inside a negated clause.
 *
 * "Do not cancel my subscription; I only need to update my card." negates cancel
 * and subscription, which is the whole difference between answering "update
 * payment method" and calling the text ambiguous between that and cancelling.
 * The span runs from the negation to the end of its clause, or to the next
 * clause-starting word, whichever comes first.
 */
export function negatedTerms(text: string): Set<string> {
  const out = new Set<string>();
  const tokens = String(text ?? "").replace(/[’‘]/g, "'").split(/\s+/).filter(Boolean);
  let span = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    const word = token.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "").toLowerCase().replace(/^'+|'+$/g, "");
    const closes = /[,;:.!?]["”'’)]*$/.test(token);
    if (span > 0 && CLAUSE_BREAK.test(word)) span = 0;
    if (span > 0) {
      if (word.length >= 3) out.add(word);
      span--;
    }
    const next = (tokens[i + 1] ?? "").replace(/[^A-Za-z']/g, "").toLowerCase();
    if (NEG_WORD.test(word) || NEG_PHRASE[word]?.includes(next)) span = NEG_SPAN;
    if (closes) span = 0;
  }
  return out;
}
