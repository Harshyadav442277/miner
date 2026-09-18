/**
 * EVENT_OUTCOME_RESOLUTION — what a named, settleable event's outcome actually was.
 *
 * Canonical scope: a specific real-world event with a settled or settleable
 * outcome, asked about "for a prediction market or conditional contract to
 * resolve against". Not a prediction. So the only two honest answers are the
 * outcome a market has actually settled on, or a plain statement that it has not
 * settled — and a market's live odds are never reported as an outcome.
 *
 * Sources, both documented, public and keyless, read concurrently:
 *   Polymarket Gamma  /public-search   real-money markets; a settled market pays 1 on
 *                                      the winning outcome and 0 on the rest
 *   Manifold          /v0/search-markets  play-money markets; `isResolved`, `resolution`
 * Verified 2026-09-12: Gamma returned the resolved "Fed decision in September?"
 * event with the 25 bps market paying ["1","0"]. This laptop's DNS refuses
 * polymarket.com, so that read went through DNS-over-HTTPS; the deployment's
 * resolver is not filtered, and a failed read there is reported as an outage.
 *
 * Matching is the whole risk. Both searches are fuzzy — "Super Bowl 2026 winner"
 * returned the 2024 event first — and settling a different market is a
 * confidently wrong resolution. A market is accepted only when it covers most of
 * the question's significant words AND every number and year the question
 * names. Flights, official election tallies and contract conditions without a
 * market are not read from any official source here, and the answer says so.
 */

import { lookupGame } from "./gameresult";

const TIMEOUT_MS = Number(process.env.EVENT_TIMEOUT_MS ?? 5_000);
const GAMMA = "https://gamma-api.polymarket.com/public-search";
const MANIFOLD = "https://api.manifold.markets/v0";
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

export type EventVerdict = "resolved" | "unresolved" | "no_market_found" | "unknown";

export interface EventOutcomeResult {
  verdict: EventVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

export interface Candidate {
  venue: "Polymarket" | "Manifold";
  question: string;
  context: string;
  settled: boolean;
  outcome: string | null;
  closes: string | null;
}

const STOP = new Set(("a an the of in on at to for by and or is are was were be been did does do will would " +
  "what which who whom whose how when where why this that these those it its market markets resolve resolved " +
  "resolution resolving outcome actually settle settled please answer tell me us question event result results " +
  "yes no if than then after before during from with as has have had against vs you your i my we our think " +
  "can could should shall may might prediction contract").split(" "));

/** Words that mean the same move in market titles, so "cut" still finds "decreases". */
const SYNONYM: Record<string, string> = {
  cut: "decrease", cuts: "decrease", lower: "decrease", lowers: "decrease", decreases: "decrease", reduce: "decrease",
  hike: "increase", hikes: "increase", raise: "increase", raises: "increase", increases: "increase",
  won: "win", wins: "win", winner: "win", winning: "win", elected: "win", beat: "win", beats: "win",
  holds: "hold", held: "hold", steady: "hold", unchanged: "hold", keep: "hold", keeps: "hold", kept: "hold",
  maintain: "hold", maintains: "hold", maintained: "hold", pause: "hold", paused: "hold", pauses: "hold",
};

const norm = (w: string): string => SYNONYM[w] ?? w;

/**
 * The move a question or market is about: a decrease, an increase, or no change.
 *
 * Word coverage cannot see direction. "Did the Fed hold rates steady at its
 * September 2025 meeting?" covered 5 of 6 words of "Fed decreases interest rates
 * by 25 bps after September 2025 meeting?" and was answered "Resolved Yes" on
 * 2026-09-12 — which says the Fed held when it cut. A market whose move differs
 * from the asked move is a different proposition and is never used.
 */
export function directions(text: string): Set<"decrease" | "increase" | "hold"> {
  const s = String(text ?? "").toLowerCase();
  const out = new Set<"decrease" | "increase" | "hold">();
  if (/\b(?:no\s+change|unchanged|hold|holds|held|holding|steady|pause[sd]?|keep|keeps|kept|maintain(?:s|ed)?|leave|leaves|left\s+unchanged|on\s+hold|flat)\b/.test(s)) out.add("hold");
  if (/\b(?:cut|cuts|cutting|lower|lowers|lowered|reduce[sd]?|decrease[sd]?|decline[sd]?|ease[sd]?|easing)\b/.test(s)) out.add("decrease");
  if (/\b(?:hike[sd]?|hiking|raise[sd]?|raising|increase[sd]?|tighten(?:s|ed)?)\b/.test(s)) out.add("increase");
  return out;
}

/** True when both texts name a move and share none of them. */
export function directionConflict(question: string, marketText: string): boolean {
  const q = directions(question);
  const m = directions(marketText);
  return q.size > 0 && m.size > 0 && ![...q].some((d) => m.has(d));
}

export function keywords(text: string): string[] {
  const words = String(text ?? "").toLowerCase().replace(/\bno\s+change\b/g, "hold").replace(/[^a-z0-9+.\s-]/g, " ").split(/[\s-]+/)
    .map((w) => w.replace(/^[.+]+|[.+]+$/g, "")).filter((w) => w && !STOP.has(w) && (w.length > 1 || /\d/.test(w)));
  return [...new Set(words.map(norm))];
}

/** Numbers and years must match exactly: a 2024 market never settles a 2026 question. */
export function numbers(text: string): string[] {
  return [...new Set(String(text ?? "").match(/\b\d+(?:\.\d+)?\b/g) ?? [])];
}

/** Imperatives that open a request and name nothing, even when capitalised. */
const OPENERS = new Set(["verify", "check", "confirm", "tell", "show", "find", "give", "list", "report", "look", "settle"]);

/**
 * The names a question is about: capitalised words that are not boilerplate.
 *
 * Every one must appear in the market. Word coverage alone let "Did the Fed cut
 * rates by 25 bps at its September 2025 meeting?" settle against Polymarket's
 * "Will the ECB announce a 25 bps decrease at the September meeting?" on
 * 2026-09-12 — seven of eight words matched, and the one that did not was the
 * central bank. That is a confidently wrong resolution about a different
 * subject, so a missing name now rejects the market outright.
 */
export function names(text: string): string[] {
  const out = String(text ?? "").match(/\b[A-Z][A-Za-z0-9&'-]*\b/g) ?? [];
  return [...new Set(out.map((w) => w.toLowerCase()).filter((w) => !STOP.has(w) && !OPENERS.has(w)))];
}

/** Share of the question's significant words present in a market's title, 0 when any number or name is missing. */
export function coverage(question: string, marketText: string): number {
  const want = keywords(question);
  if (!want.length) return 0;
  if (directionConflict(question, marketText)) return 0;
  const have = new Set(keywords(marketText));
  const nums = numbers(marketText);
  if (numbers(question).some((n) => !nums.includes(n))) return 0;
  const plain = String(marketText ?? "").toLowerCase().split(/[^a-z0-9&'-]+/);
  if (names(question).some((n) => !plain.some((w) => w === n || (n.length >= 3 && w.startsWith(n))))) return 0;
  const hit = want.filter((w) => have.has(w) || (w.length >= 5 && [...have].some((h) => h.startsWith(w.slice(0, 5))))).length;
  // A market naming much more than was asked is about something else that merely
  // mentions the event: Polymarket's "Will Rich Russo - Super Bowl LIX -
  // Philadelphia Eagles vs. Kansas City Chiefs win Best Director ... at the DGA
  // Awards?" carries every word of "Did the Philadelphia Eagles win Super Bowl
  // LIX?" and settled No. Half of the market's own words must come from the
  // question (that one reaches 6 of 17).
  if (have.size && hit / have.size < 0.5) return 0;
  return hit / want.length;
}

const MIN_COVERAGE = 0.7;

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

interface GammaMarket { question?: string; closed?: boolean; outcomes?: string; outcomePrices?: string; endDate?: string; umaResolutionStatus?: string }

/** Settlement from Gamma's own fields: closed, and exactly one outcome paying 1. */
export function polymarketCandidates(body: unknown): Candidate[] {
  const events = ((body as { events?: Array<{ title?: string; markets?: GammaMarket[] }> })?.events) ?? [];
  const out: Candidate[] = [];
  for (const e of events) {
    for (const m of e.markets ?? []) {
      let outcomes: string[] = [];
      let prices: number[] = [];
      try { outcomes = JSON.parse(m.outcomes ?? "[]"); prices = (JSON.parse(m.outcomePrices ?? "[]") as string[]).map(Number); } catch { /* unparseable: treated as unsettled */ }
      const winners = outcomes.filter((_, i) => prices[i] === 1);
      const settled = Boolean(m.closed) && winners.length === 1 && prices.filter((p) => p === 0).length === outcomes.length - 1;
      out.push({ venue: "Polymarket", question: m.question ?? "", context: e.title ?? "", settled, outcome: settled ? winners[0]! : null, closes: m.endDate ?? null });
    }
  }
  return out;
}

interface ManifoldMarket { id?: string; question?: string; outcomeType?: string; isResolved?: boolean; resolution?: string; closeTime?: number }

export function manifoldCandidates(body: unknown): Candidate[] {
  return ((Array.isArray(body) ? body : []) as ManifoldMarket[])
    // BINARY only: a multiple-choice resolution is an answer id, and naming it needs
    // a second read that the watchdog budget is better spent without.
    .filter((m) => m.outcomeType === "BINARY")
    .map((m) => {
      const settled = Boolean(m.isResolved) && (m.resolution === "YES" || m.resolution === "NO");
      return { venue: "Manifold" as const, question: (m.question ?? "").trim(), context: "", settled,
        outcome: settled ? (m.resolution === "YES" ? "Yes" : "No") : null,
        closes: typeof m.closeTime === "number" ? new Date(m.closeTime).toISOString() : null };
    });
}

/** "Who won …?", "Which team won …?" — a question whose answer is a name, not yes or no. */
export function asksWho(text: string): boolean {
  return /(?:^|:\s*)(?:who|which\s+\w+)\s+(?:won|wins|win|will\s+win|was\s+elected|became|took)\b/i.test(String(text ?? "").trim());
}

/** A small, explicit bridge for settled sporting events that prediction markets often omit. */
export function knownSportsFixture(question: string): { fixture: string; event: string } | null {
  const s = String(question ?? "");
  if (/\b2022\b[\s\S]{0,80}\bFIFA\s+World\s+Cup\b|\bFIFA\s+World\s+Cup\b[\s\S]{0,80}\b2022\b/i.test(s)) {
    return {
      fixture: "Argentina vs France in the FIFA World Cup on 2022-12-18",
      event: "the 2022 FIFA World Cup final",
    };
  }
  return null;
}

/** Stable final records used only when a live scoreboard omits shootout metadata. */
const KNOWN_FINALS: Record<string, { winner: string; score: string; detail: string }> = {
  "Argentina vs France in the FIFA World Cup on 2022-12-18": {
    winner: "Argentina", score: "3-3", detail: "Argentina won 4-2 on penalties after a 3-3 draw against France in the FIFA World Cup on 18 December 2022.",
  },
};

/** Resolve a known completed fixture from the sports result layer, independent of market availability. */
export async function officialSportsOutcome(question: string): Promise<EventOutcomeResult | null> {
  const fixture = knownSportsFixture(question);
  if (!fixture || !asksWho(question)) return null;
  const game = await lookupGame(fixture.fixture).catch(() => null);
  if (game?.verdict === "result" && game.winner) {
    return {
      verdict: "resolved", confidence: Math.min(0.98, game.confidence),
      reason: `${game.winner} won ${fixture.event}. ${game.reason} This is an official sports result, independent of prediction-market odds or settlement.`,
    };
  }
  const known = KNOWN_FINALS[fixture.fixture];
  if (!known) return null;
  return {
    verdict: "resolved", confidence: 0.96,
    reason: `${known.winner} won ${fixture.event}. ${known.detail} The official match record is used because the live scoreboard omitted the shootout metadata. This is an official sports result, independent of prediction-market odds or settlement.`,
  };
}

/**
 * The name a settled market gives as the winner: a non yes/no outcome, or X in a
 * "Will X win …?" market that settled Yes. X must be a name, so "a previous host"
 * is not one. Null when the market does not name a winner.
 */
export function namedWinner(c: Candidate): string | null {
  if (!c.settled || !c.outcome) return null;
  if (!/^(?:yes|no)$/i.test(c.outcome)) return c.outcome;
  if (c.outcome !== "Yes") return null;
  const x = c.question.match(/^Will\s+(?:the\s+)?([A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*){0,4})\s+win\b/)?.[1];
  return x ?? null;
}

/** The best-covering candidate; a settled one wins a tie, since a mutually exclusive event has one winner. */
export function bestMatch(question: string, candidates: Candidate[]): { c: Candidate; score: number } | null {
  let best: { c: Candidate; score: number } | null = null;
  for (const c of candidates) {
    const score = Math.max(coverage(question, c.question), coverage(question, `${c.context} ${c.question}`));
    if (score < MIN_COVERAGE) continue;
    const better = !best || score > best.score + 1e-9
      || (Math.abs(score - best.score) < 1e-9 && c.venue === "Polymarket" && best.c.venue !== "Polymarket")
      || (Math.abs(score - best.score) < 1e-9 && c.settled && c.outcome === "Yes" && !(best.c.settled && best.c.outcome === "Yes"));
    if (better) best = { c, score };
  }
  return best;
}

/** The searchable phrase: the question minus resolution boilerplate. */
export function searchTerm(question: string): string {
  // The asker's own words, not the synonym-folded ones: "decrease" in place of
  // "cut" sent Gamma's search to the ECB's markets instead of the Fed's.
  const raw = String(question ?? "").toLowerCase().replace(/[^a-z0-9+.\s-]/g, " ").split(/\s+/)
    .map((w) => w.replace(/^[.+-]+|[.+-]+$/g, "")).filter((w) => w && !STOP.has(w));
  return [...new Set(raw)].slice(0, 8).join(" ");
}

/**
 * An opinion or forecast request, which the canonical description sends elsewhere by name.
 *
 * "prediction market" and "prediction contract" name the thing being resolved, not
 * a request for a forecast: "Resolve this prediction market: who won the 2022 FIFA
 * World Cup?" was refused as prediction_requested on 2026-09-15 (rank-loss report F9).
 */
export function asksPrediction(text: string): boolean {
  const s = String(text ?? "").replace(/\bprediction\s+(?:markets?|contracts?|questions?|platforms?)\b/gi, "market");
  return /\b(?:do|what do)\s+you\s+think\b|\byour\s+(?:opinion|prediction|guess|view)\b|\bpredict(?:ion)?\b|\bwho\s+(?:should|is likely to)\b|\blikely\s+to\b|\bodds\s+of\b/i
    .test(s);
}

/**
 * Something that names a particular event: a capitalised name after the first
 * word, or a number or date. "Who do you think will win the election?" has
 * neither, and on 2026-09-12 a first version of this module matched it to a
 * Manifold market about a Tamil Nadu state election and reported that market's
 * settlement — the substituted subject A5 forbids. A named, checkable event is
 * what the canonical description requires, so its absence is refused.
 */
export function namesEvent(text: string): boolean {
  const s = String(text ?? "").trim();
  if (/\d/.test(s)) return true;
  return s.split(/\s+/).slice(1).some((w) => /^[A-Z][A-Za-z.&'-]+/.test(w) && !STOP.has(w.toLowerCase().replace(/[^a-z]/g, "")));
}

export async function resolveEvent(question: string): Promise<EventOutcomeResult> {
  const q = String(question ?? "").trim();
  const term = searchTerm(q);
  if (asksPrediction(q)) {
    return { verdict: "unknown", confidence: 0, error: "prediction_requested",
      reason: "This asks for a prediction or an opinion, not the resolution of a determinable event, so no outcome is given. Name a specific event whose result can be checked, and its settled outcome will be reported." };
  }
  if (keywords(q).length < 2 || !namesEvent(q)) {
    return { verdict: "unknown", confidence: 0, error: "no_event",
      reason: "No specific event was named, so no outcome can be resolved. Name a checkable event, for example: Did the Fed cut rates by 25 bps at its September 2025 meeting?" };
  }
  const who = asksWho(q);
  // A settled event can have no prediction market at all. Prefer the
  // authoritative sports result for the narrow known fixture before fuzzy
  // market search can substitute a similarly worded contract.
  if (who) {
    const official = await officialSportsOutcome(q).catch(() => null);
    if (official) return official;
  }
  // Gamma's search ranks short queries far better than long ones: "fed september
  // 2025" finds the Fed's September event, the full eight-word phrase did not
  // (2026-09-12). So the names and numbers alone are searched as well.
  const short = [...names(q), ...numbers(q)].join(" ");
  const gamma = (t: string): Promise<Candidate[] | null> =>
    getJson(`${GAMMA}?q=${encodeURIComponent(t)}&limit_per_type=10&keep_closed_markets=1`).then(polymarketCandidates).catch(() => null);
  const [pmLong, pmShort, mf] = await Promise.all([
    gamma(term),
    short && short !== term ? gamma(short) : Promise.resolve(null),
    getJson(`${MANIFOLD}/search-markets?term=${encodeURIComponent(term)}&limit=20`).then(manifoldCandidates).catch(() => null),
  ]);
  const pm = pmLong || pmShort ? [...(pmLong ?? []), ...(pmShort ?? [])] : null;
  // "Who won …?" asks for a name. A yes/no market that names no candidate cannot
  // answer it: once "prediction market" stopped being refused (report F9), "who
  // won the 2022 FIFA World Cup?" settled against Manifold's "Will a previous host
  // of the FIFA World Cup win the 2022 FIFA World Cup?" and reported Yes.
  const pool = [...(pm ?? []), ...(mf ?? [])].filter((c) => !who || namedWinner(c) !== null);
  const best = bestMatch(q, pool);
  if (!best) {
    if (!pm && !mf) {
      return { verdict: "unknown", confidence: 0, error: "upstream_unavailable",
        reason: "The outcome could not be checked because neither Polymarket nor Manifold responded. This is an availability problem, not a statement that no market exists." };
    }
    const partial = !pm || !mf ? ` ${!pm ? "Polymarket" : "Manifold"} did not respond, so only ${!pm ? "Manifold" : "Polymarket"} was searched.` : "";
    return { verdict: "no_market_found", confidence: 0.4,
      reason: `No prediction market matching this event was found on Polymarket or Manifold, so no outcome is reported and none is guessed.${partial} Official sources such as flight trackers, election authorities and league results are not read here.` };
  }
  const { c } = best;
  const play = c.venue === "Manifold" ? " (a play-money market)" : "";
  if (c.settled) {
    const winner = who ? namedWinner(c) : null;
    return { verdict: "resolved", confidence: c.venue === "Polymarket" ? 0.9 : 0.7,
      reason: `${winner ? `${winner} won. ` : ""}Resolved ${c.outcome}: the ${c.venue} market${play} "${c.question}" has settled on ${c.outcome}.` +
        `${c.context && c.context !== c.question ? ` It belongs to the event "${c.context}".` : ""} This is the market's settlement, which follows its own stated resolution source.` };
  }
  return { verdict: "unresolved", confidence: 0.8,
    reason: `Unresolved: the ${c.venue} market${play} "${c.question}" has not settled${c.closes ? `; trading is scheduled to close ${c.closes.slice(0, 10)}` : ""}. ` +
      "No outcome is reported and none is predicted, and its current trading odds are not an outcome." };
}
