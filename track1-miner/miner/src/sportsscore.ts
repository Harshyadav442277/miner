/**
 * SPORTS_SCORE — the current or most recent score of a named fixture.
 *
 * The canonical description draws the line for us: "asks for the current or most
 * recent score. Distinct from asking who ultimately won a finished event, which
 * is GAME_RESULT." So the two intents share every provider and differ in exactly
 * two places, both of which are here rather than duplicated:
 *
 *   1. WHICH FIXTURE. `lookupGame` is asked for `prefer: "live"`, so a game in
 *      play wins over a finished one in the same window. GAME_RESULT wants the
 *      opposite and keeps its own default.
 *   2. WHAT THE SENTENCE LEADS WITH. A score answer leads with the numbers. A
 *      result answer leads with the winner. Roughly 32 words are scored, so the
 *      first clause is most of the answer.
 *
 * The August 2026 precedent this module exists to not repeat: a free source was
 * asked for a fixture and answered with a friendly against AC Milan. Nothing
 * here substitutes a different fixture for the one asked about — where the
 * shared layer reports `not_found`, this reports not found.
 */
import { type FixturePreference, type GameResult, lookupGame } from "./gameresult";

export type ScoreVerdict = "live_score" | "final_score" | "not_played" | "not_found" | "unknown";

export interface ScoreResult {
  home: string | null;
  away: string | null;
  home_score: number | null;
  away_score: number | null;
  competition: string | null;
  played_at: string | null;
  in_progress: boolean;
  verdict: ScoreVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/** The status detail ESPN gives a live game, e.g. "4:21 - 4th Quarter". */
function liveDetail(g: GameResult): string {
  return g.reason.match(/still in progress \(([^)]+)\)/)?.[1] ?? "in progress";
}

function whenOf(g: GameResult): string {
  if (!g.played_at) return "";
  const d = new Date(g.played_at);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * The same facts the result layer found, phrased as a score.
 *
 * Every branch is derived from the STRUCTURED fields rather than from the result
 * layer's sentence, because that sentence is written for a different question.
 * Re-using it would answer "what is the score" with "who won", which is the one
 * confusion the canonical description calls out by name.
 */
export function phraseScore(g: GameResult): ScoreResult {
  const base = {
    home: g.home, away: g.away, home_score: g.home_score, away_score: g.away_score,
    competition: g.competition, played_at: g.played_at,
  };
  const league = g.competition ? ` in the ${g.competition}` : "";
  const hasScores = g.home_score !== null && g.away_score !== null;

  if (g.verdict === "in_progress" && hasScores && g.home && g.away) {
    return {
      ...base, in_progress: true, verdict: "live_score", confidence: 0.95,
      reason:
        `${g.home} ${g.home_score}, ${g.away} ${g.away_score}${league}, with the game still in ` +
        `progress (${liveDetail(g)}). That is the score as it stands right now, not a final result.`,
    };
  }

  if (g.verdict === "result" && hasScores && g.home && g.away) {
    const when = whenOf(g);
    return {
      ...base, in_progress: false, verdict: "final_score", confidence: 0.9,
      reason:
        `${g.home} ${g.home_score}, ${g.away} ${g.away_score}${league}` +
        `${when ? ` on ${when}` : ""}. No fixture between them is in progress, so that is the most ` +
        `recent score rather than a live one.`,
    };
  }

  if (g.verdict === "not_played" && g.home && g.away) {
    const when = whenOf(g);
    return {
      ...base, in_progress: false, verdict: "not_played", confidence: 0.9,
      reason:
        `${g.home} versus ${g.away}${league} has no score yet. It is scheduled for ` +
        `${when || "a later date"} and has not started, so no score has been reported for it and ` +
        `none has been invented.`,
    };
  }

  if (g.verdict === "unknown") {
    return {
      ...base, in_progress: false, verdict: "unknown", confidence: 0,
      reason:
        `No fixture could be identified in this request. Name both sides, for example "What is the ` +
        `score in the Lakers vs Celtics game?", and the current score, the competition and the ` +
        `status can be returned. Guessing which two teams were meant is how the wrong game gets ` +
        `reported, so no guess was made.`,
      error: g.error ?? "no_fixture",
    };
  }

  /**
   * Found nothing, or found a record too incomplete to read a score from. Both
   * are honestly "no score", and neither is an assertion that no such fixture
   * exists — the scoreboard is read over a window and the directory is keyed by
   * name, so an absence here is an absence in those two places only.
   */
  const sides = g.home && g.away ? `${g.home} versus ${g.away}` : "the requested fixture";
  return {
    ...base, in_progress: false, verdict: "not_found", confidence: 0.5,
    reason:
      `No score could be found for ${sides}. Neither the recent scoreboard nor the fixture ` +
      `directory holds a readable score for it, and no other fixture has been substituted for it.`,
  };
}

export async function lookupScore(question: string, now = new Date(), requested?: {
  teams?: { a: string; b: string }; date?: string;
}): Promise<ScoreResult> {
  const prefer: FixturePreference = "live";
  return phraseScore(await lookupGame(question, now, { ...requested, prefer }));
}
