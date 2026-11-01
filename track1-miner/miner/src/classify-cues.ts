/**
 * TEXT_CLASSIFICATION word tables: what counts as a topic word, what a label's
 * content words are, and which plain words directly signal a common label.
 *
 * Split out of classify.ts so that file stays about scoring and the answer, and
 * so the tables can be read as data. Nothing here reaches the network.
 */

const GENERIC = new Set([
  "issue", "issues", "problem", "problems", "question", "category", "request", "related",
  "general", "other", "and", "the", "of", "news", "type",
]);

/** Crude stemming, enough to meet "log"/"logging" and "account"/"accounts". */
export function stem(w: string): string {
  return w.toLowerCase().replace(/(?:ing|edly|ed|ies|es|s|ly)$/, "").replace(/(.)\1$/, "$1");
}

export function contentWords(label: string): string[] {
  const words = label.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length >= 3);
  const specific = words.filter((w) => !GENERIC.has(w));
  return specific.length ? specific : words;
}

const STOP = new Set(("the and for with that this from have has had was were are is been being not but you your our " +
  "they them their its his her she him who what which when where why how can could would should will just into onto " +
  "about than then there here very more most some any all one two new using used use hello please thanks " +
  "took take get got make made went did does done also only still like").split(" "));

/**
 * The words of the text that can carry a topic: no stop words, no numbers.
 *
 * This used to keep only the first ten, so a duplicate-charge complaint placed
 * after an unrelated opening paragraph was never scored on its evidence (rank-loss
 * report F2). Every word is scored now; only the relatedness LOOKUPS are capped,
 * in classifyText, because each one is a network round trip.
 */
export function textWords(text: string): string[] {
  return [...new Set(String(text ?? "").toLowerCase().split(/[^a-z'-]+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length >= 3 && !STOP.has(w) && !w.includes("'")))].slice(0, 80);
}

/**
 * Words that plainly signal the common label families support tickets, reviews
 * and news are sorted into. Datamuse relates "invoice" to billing AND to account
 * (an account statement), so "I was charged twice on my invoice." came back
 * ambiguous between them (report F2); a charge on an invoice is not an account
 * problem. A cue is a direct relation, weighted between an exact label word and
 * an index neighbour. Keys and cues are compared by `cueStem`.
 */
const CUES: Record<string, string> = {
  billing: "charge charged bill billed invoice refund payment pay paid subscription fee fees overcharged receipt card transaction renewal price cost money",
  payment: "charge charged invoice refund pay paid card transaction declined billing",
  // "update" was a technical cue until 2026-09-16: it made "I only need to update
  // my card" as technical as it was billing, and the two tied into "ambiguous".
  // An app that will not update is still reached through app, install and load.
  technical: "crash crashes crashed error bug broken load loading install slow freeze frozen server app website page connection sync glitch outage down working",
  account: "login log password sign username account profile locked access verify verification reset",
  shipping: "package parcel delivery deliver delivered arrive arrived shipping shipped courier tracking late delayed weeks days lost",
  delivery: "package parcel deliver delivered arrive arrived shipping shipped courier tracking late delayed weeks days lost",
  quality: "broke broken cheap defective quality flimsy durable material poor sturdy apart ripped cracked",
  price: "expensive price cost cheap afford overpriced value worth pricey",
  spam: "free win winner prize click offer urgent claim cash congratulations lottery limited selected reward",
  sport: "match game team score league goal player tournament championship coach season scored cup",
  sports: "match game team score league goal player tournament championship coach season scored cup",
  politics: "election government president minister parliament vote policy senate campaign party lawmakers",
  technology: "software computer smartphone chip startup device internet digital gadget",
  tech: "software computer smartphone chip startup device internet digital gadget",
  business: "market stock shares revenue profit company earnings investors economy bank inflation merger",
  finance: "market stock shares revenue profit earnings investors economy bank inflation interest",
  health: "doctor hospital disease patients vaccine treatment symptoms medical virus",
  entertainment: "movie film music album actor actress celebrity concert show series",
  science: "research study scientists discovery space experiment researchers",
  weather: "rain storm temperature forecast snow wind heat",
  complaint: "disappointed terrible unacceptable worst awful angry refund",
  feature: "add wish option ability support could would",
  urgent: "asap immediately urgent critical emergency",
  cancellation: "cancel cancelled cancelling cancellation terminate unsubscribe close ending quit stop",
  cancel: "cancel cancelled cancelling cancellation terminate unsubscribe close ending quit stop",
  bug: "crash crashes crashed error broken glitch freeze frozen fails failing exception",
};

export const cueStem = (w: string): string => stem(w).replace(/e$/, "");

export const CUE_SETS = new Map(
  Object.entries(CUES).map(([k, v]) => [cueStem(k), new Set(v.split(" ").map(cueStem))]),
);
