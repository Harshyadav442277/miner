/**
 * A sports game's result from ESPN's public scoreboards, for EVENT_OUTCOME questions about a match.
 *
 * WHY. EVENT_OUTCOME scored 0 in 9 of epochs 56–67 while the leaders were pure scoreboard miners
 * (event-espn-mlb-scoreboard, -nba-, -nfl-, takar-outcome at 0.9994–0.9998). Routed questions were matches: "Will Club
 * Atlético de Madrid win on 2026-02-21?" (we answered "No prediction market matching this event was found") and
 * "What was the final score of Bears vs Lions" (Daemon feed, 2026-11-27). ESPN's scoreboard for 2026-02-21 has
 * Atlético Madrid 4, Espanyol 2, final.
 *
 * SOURCE. site.api.espn.com is ESPN's public scoreboard JSON, read without a key and named in every answer. Its terms
 * were not read (sources.ts: "unread"); the owner turned the licence gate off on 2026-11-07.
 *
 * MATCHING, CONSERVATIVELY. A team counts as named when every significant word of its full name is in the question
 * (accents and one-letter typos forgiven: "Atltico" is Atlético). A one-word name ("Bears", "Heat") counts only when
 * both teams of the game are named, so "Will heat waves…" never matches the Miami Heat. Two different games matching
 * equally is no answer.
 */

const TIMEOUT_MS = Number(process.env.SCOREBOARD_TIMEOUT_MS ?? 2_500);
const BASE = "https://site.api.espn.com/apis/site/v2/sports";

/** The leagues read. Each answered a scoreboard on 2026-11-27. */
export const LEAGUES = [
  "football/nfl", "football/college-football", "basketball/nba", "basketball/wnba", "basketball/mens-college-basketball",
  "baseball/mlb", "hockey/nhl", "soccer/eng.1", "soccer/esp.1", "soccer/ita.1", "soccer/ger.1", "soccer/fra.1",
  "soccer/uefa.champions", "soccer/uefa.europa", "soccer/usa.1",
];

export interface Team { name: string; short: string; abbreviation: string; score: number | null; winner: boolean }
export interface Game { league: string; id: string; date: string; status: string; completed: boolean; teams: Team[] }

// Not "real": "Real Madrid" must need both words, or a question about Atlético Madrid would match it on "madrid".
const STOP = new Set(["fc", "cf", "club", "de", "the", "afc", "sc", "ac", "cd", "ud", "rc"]);
const fold = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s: string): string[] => fold(s).split(/[^a-z0-9]+/).filter(Boolean);

/** One edit apart, for words of five letters or more. Pure. */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Whether every significant word of `name` is in the question's words. "Real" only counts beside another word. Pure. */
export function names(questionWords: string[], name: string): boolean {
  const need = words(name).filter((w) => !STOP.has(w) || words(name).length === 1);
  return need.length > 0 && need.every((w) => questionWords.some((q) => near(q, w)));
}

/** How the question names a team: "full" (its whole name), "short" (a one-word nickname), or null. Pure. */
export function named(question: string, t: Team): "full" | "short" | null {
  const q = words(question);
  if (words(t.name).length > 1 && names(q, t.name)) return "full";
  if (t.short && names(q, t.short)) return words(t.short).length > 1 ? "full" : "short";
  return null;
}

/** The game the question is about, or null when none or more than one fits equally. Pure. */
export function pickGame(question: string, games: Game[], target: string | null): Game | null {
  const scored = games.flatMap((g) => {
    const how = g.teams.map((t) => named(question, t));
    const both = how.every(Boolean);
    const full = how.some((h) => h === "full");
    if (!both && !full) return [];
    const days = target ? Math.abs(Date.parse(g.date.slice(0, 10)) - Date.parse(target)) / 86_400_000 : 0;
    return [{ g, rank: (both ? 2 : 1) * 10 - days }];
  }).sort((a, b) => b.rank - a.rank);
  if (!scored.length) return null;
  if (scored[1] && scored[1].rank === scored[0]!.rank && scored[1].g.id !== scored[0]!.g.id) return null;
  return scored[0]!.g;
}

/** The ESPN date (YYYYMMDD) the question names: ISO, "February 21, 2026" or "21 February 2026". Pure. */
export function askedDate(question: string): string | null {
  const iso = question.match(/\b(20\d\d)-(\d\d)-(\d\d)\b/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  const M = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const a = fold(question).match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d\d)\b/);
  const b = fold(question).match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(20\d\d)\b/);
  const [mon, day, year] = a ? [a[1]!, a[2]!, a[3]!] : b ? [b[2]!, b[1]!, b[3]!] : [null, null, null];
  if (!mon) return null;
  return `${year}${String(M.indexOf(mon) + 1).padStart(2, "0")}${day!.padStart(2, "0")}`;
}

/** ESPN events as games. Pure. */
export function gamesFrom(league: string, body: unknown): Game[] {
  const events = (body as { events?: unknown[] })?.events ?? [];
  return events.flatMap((e) => {
    const ev = e as { id?: string; date?: string; status?: { type?: { name?: string; completed?: boolean } };
      competitions?: Array<{ competitors?: Array<{ score?: string; winner?: boolean; team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string } }> }> };
    const cs = ev.competitions?.[0]?.competitors ?? [];
    if (!ev.id || !ev.date || cs.length !== 2) return [];
    const teams = cs.map((c) => ({ name: c.team?.displayName ?? "", short: c.team?.shortDisplayName ?? "", abbreviation: c.team?.abbreviation ?? "",
      score: c.score !== undefined && c.score !== "" && Number.isFinite(Number(c.score)) ? Number(c.score) : null, winner: c.winner === true }));
    return [{ league, id: ev.id, date: ev.date, status: ev.status?.type?.name ?? "", completed: ev.status?.type?.completed === true, teams }];
  });
}

const ymd = (d: Date): string => d.toISOString().slice(0, 10).replace(/-/g, "");

async function scoreboard(league: string, date: string | null): Promise<Game[]> {
  try {
    const r = await fetch(`${BASE}/${league}/scoreboard${date ? `?dates=${date}` : ""}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return r.ok ? gamesFrom(league, await r.json()) : [];
  } catch {
    return [];
  }
}

/** The game the question names, from the named day's scoreboards, or the current and previous day's. */
export async function findGame(question: string, now = new Date()): Promise<Game | null> {
  const asked = askedDate(question);
  const days = asked ? [asked] : [null, ymd(new Date(now.getTime() - 86_400_000))];
  const all = (await Promise.all(LEAGUES.flatMap((l) => days.map((d) => scoreboard(l, d))))).flat();
  const seen = new Set<string>();
  const unique = all.filter((g) => !seen.has(g.id) && seen.add(g.id));
  const target = asked ? `${asked.slice(0, 4)}-${asked.slice(4, 6)}-${asked.slice(6, 8)}` : now.toISOString().slice(0, 10);
  return pickGame(question, unique, target);
}

/** The team the question is about: the first one it names. Pure. */
export function subject(question: string, g: Game): Team | null {
  const at = g.teams.map((t) => {
    const w = words(t.name).filter((x) => !STOP.has(x));
    const q = words(question);
    const i = q.findIndex((x) => w.some((y) => near(x, y)) || words(t.short).some((y) => near(x, y)));
    return { t, i };
  }).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
  return at[0]?.t ?? null;
}

/** The ESPN record the answer was read from. */
export const gameUrl = (g: Game): string => `${BASE}/${g.league}/summary?event=${g.id}`;
