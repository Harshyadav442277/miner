/**
 * The word list behind SENTIMENT_ANALYSIS.
 *
 * PROVENANCE. These valences were written for this repository, word by word, on
 * 2026-09-12. They are not copied from VADER, AFINN, SentiWordNet or any other
 * published lexicon, so no third-party licence attaches to this file. What IS
 * borrowed is the published METHOD — a signed valence per word on a -4..+4 scale,
 * negation flipping and damping a word within three tokens, boosters and
 * dampeners, the contrastive "but", capitals and exclamation marks as emphasis,
 * and the normalised compound — from Hutto & Gilbert, "VADER: A Parsimonious
 * Rule-based Model for Sentiment Analysis of Social Media Text", ICWSM 2014. A
 * method is not a copyrightable work; the paper is cited because it is where the
 * constants in sentiment.ts come from.
 *
 * WHY NOT VADER'S OWN LIST. It is MIT-licensed and would be allowed, but it is
 * 7,500 entries, and fetching it into the repo is a file download this lane was
 * not cleared to make. The honest cost of the smaller list is coverage: a text
 * whose only opinion words are absent here reads as neutral. The answer names the
 * words it counted, so a reader can see when that has happened. Recorded as a gap.
 *
 * Scale: +4 extremely positive ... -4 extremely negative. Keys are lowercase.
 */
const ROWS: Array<[number, string]> = [
  [4, "outstanding superb magnificent phenomenal exceptional flawless perfect perfection masterpiece"],
  [3.5, "excellent amazing awesome wonderful fantastic brilliant incredible marvellous marvelous love loved loves adore adored delightful thrilled ecstatic best"],
  [3, "great terrific lovely beautiful gorgeous impressive exceptionally joy joyful happiest overjoyed excited exciting grateful thankful blessed stunning favourite favorite"],
  [2.5, "happy glad pleased enjoy enjoyed enjoying enjoyable recommend recommended satisfied pleasant fabulous thanks thank reliable sturdy delicious charming elegant kind generous proud promoted win won winning success successful"],
  [2, "good nice like liked likes fine helpful useful friendly fast quick smooth comfortable easy clean fresh fun funny cool solid worth worthwhile valuable affordable improved improvement better calm hope hopeful safe secure praise"],
  // "support" is deliberately absent. In a review it is nearly always the noun,
  // "customer support", and scoring it +1.5 labelled "The battery died after a
  // week and support never replied" POSITIVE, carried by that one word (found on
  // the Vercel preview, 2026-09-13). "supportive" keeps its valence.
  [1.5, "decent okay ok fair works worked working convenient efficient accurate polite responsive tidy interesting positive benefit benefits supportive gain gains progress relief relieved"],
  [1, "adequate acceptable reasonable sufficient stable steady fixed resolved agree agreed"],
  [-1, "slow late delayed pricey expensive confusing confused odd meh mediocre lacking lacks bland dull boring noisy crowded unclear tired minor issue issues complaints regret regrets"],
  [-1.5, "problem problems difficult hard complicated inconvenient uncomfortable disappointing disappointed unhappy concern concerned worried worry doubt unsure wrong missing lost negative sad sorry weak cheap loud dirty cold rude unanswered"],
  // "died" and "dies" are how a review says a device stopped working, and were
  // absent, so the complaint in "the battery died after a week" scored nothing.
  [-2, "bad poor broken broke break breaks fail failed fails failure faulty defective damaged crushed leak leaking crash crashed crashes error errors bug buggy glitch stuck useless unreliable overpriced frustrating frustrated annoyed annoying upset angry mad unfair ignored refund complaint complain complained scam died dies unusable unresponsive"],
  [-2.5, "awful horrible terrible dreadful nasty ugly hate hated hates furious disgusted disgusting unacceptable ridiculous pathetic worthless incompetent nightmare waste wasted misleading liar lied fraud stolen"],
  [-3, "worst abysmal appalling atrocious horrendous horrific disaster disastrous miserable devastated heartbroken outraged rage despise"],
  [-3.5, "catastrophic unbearable hopeless"],
];

export const LEXICON: ReadonlyMap<string, number> = new Map(
  ROWS.flatMap(([v, words]) => words.split(" ").map((w): [string, number] => [w, v])),
);

/** Words that intensify the next opinion word (+) or soften it (-). */
export const BOOSTERS: ReadonlyMap<string, number> = new Map([
  ...["very", "really", "extremely", "so", "totally", "absolutely", "incredibly", "completely", "utterly", "highly", "super", "truly", "most", "especially", "remarkably"]
    .map((w): [string, number] => [w, 0.293]),
  ...["slightly", "somewhat", "barely", "hardly", "kinda", "sort", "marginally", "occasionally", "partly", "little"]
    .map((w): [string, number] => [w, -0.293]),
]);

/**
 * Actions a customer expects to happen, which carry no opinion on their own.
 *
 * Negation flips an opinion word, so a negated NEUTRAL verb scored nothing at all:
 * "support never replied" and "the parcel never arrived" read as neutral. Said of
 * a service, that an expected action did not happen IS the complaint, so these
 * score negative when, and only when, a negator is in scope. Un-negated they stay
 * at zero — "the parcel arrived" is a fact, not praise.
 */
export const EXPECTED_ACTIONS: ReadonlySet<string> = new Set([
  "replied", "reply", "responded", "respond", "answered", "answer", "arrived", "arrive", "delivered",
  "deliver", "shipped", "ship", "refunded", "returned", "showed", "called", "emailed", "contacted",
]);

/** A negator within three tokens before an opinion word flips and damps it. */
export const NEGATIONS: ReadonlySet<string> = new Set([
  "not", "no", "never", "none", "nobody", "nothing", "neither", "nor", "without", "cannot", "cant", "can't",
  "don't", "dont", "doesn't", "doesnt", "didn't", "didnt", "isn't", "isnt", "wasn't", "wasnt", "aren't",
  "arent", "weren't", "won't", "wont", "wouldn't", "shouldn't", "couldn't", "hasn't", "haven't", "hadn't",
]);

/**
 * Emotional tone, named only from a word that states it. A tone is never inferred
 * from the valence alone: negative text is not automatically angry.
 */
export const TONES: ReadonlyArray<[string, ReadonlySet<string>]> = [
  ["frustrated", new Set(["frustrated", "frustrating", "annoyed", "annoying", "fed", "ridiculous", "unacceptable", "again", "still", "ignored", "waiting"])],
  ["angry", new Set(["angry", "furious", "outraged", "rage", "mad", "hate", "hated", "disgusted", "disgusting"])],
  ["disappointed", new Set(["disappointed", "disappointing", "letdown", "unfortunately", "sadly"])],
  ["sad", new Set(["sad", "heartbroken", "devastated", "miserable", "unhappy", "sorry", "lonely", "cry", "crying"])],
  ["worried", new Set(["worried", "worry", "afraid", "scared", "anxious", "nervous", "concerned", "fear"])],
  ["joyful", new Set(["happy", "joy", "joyful", "thrilled", "ecstatic", "overjoyed", "delighted", "excited", "exciting", "yay"])],
  ["grateful", new Set(["grateful", "thankful", "thanks", "thank", "appreciate", "appreciated", "blessed"])],
];

/** Emoticons and a few emoji, scored like words. */
export const SYMBOLS: ReadonlyMap<string, number> = new Map([
  [":)", 2], [":-)", 2], [":D", 3], ["<3", 3], [":(", -2], [":-(", -2], [":'(", -2.5],
  ["\u{1F600}", 2.5], ["\u{1F60A}", 2.5], ["\u{1F60D}", 3], ["\u{1F44D}", 2], ["❤️", 3],
  ["\u{1F620}", -2.5], ["\u{1F621}", -3], ["\u{1F622}", -2], ["\u{1F44E}", -2],
]);
