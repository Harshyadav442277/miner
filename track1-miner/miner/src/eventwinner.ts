/**
 * The recorded winner of a finished event, from Wikidata (CC0).
 *
 * EVENT_OUTCOME answered only from prediction markets, so a settled event with no
 * market came back "no market found": "Who won Super Bowl LX?" on 2026-11-06. The
 * intent asks for the settled result, and Wikidata records it on the event's own item
 * as "winner" (P1346) or, for an election, "successful candidate" (P991). The leaders
 * in this intent read official results feeds; this is the general-purpose equivalent.
 *
 * Only a finished event is answered: its end (P582) or date (P585) must be in the past.
 */

const API = "https://www.wikidata.org/w/api.php";
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const TIMEOUT_MS = Number(process.env.EVENT_TIMEOUT_MS ?? 5_000);

interface Snak { datavalue?: { value?: { id?: string; time?: string } } }
interface Claim { mainsnak: Snak; rank?: string; qualifiers?: Record<string, Snak[]> }
interface Entity { id: string; labels?: { en?: { value: string }; mul?: { value: string } }; claims?: Record<string, Claim[]> }

/** English label, else the multilingual one: many people's items now carry only "mul" (Donald Trump, Q22686, 2026-11-06). */
const label = (e: Entity | undefined): string | null => e?.labels?.en?.value ?? e?.labels?.mul?.value ?? null;

export interface EventWinner {
  event: string;
  event_id: string;
  winners: string[];
  /** When the event ended, as Wikidata records it (YYYY-MM-DD, or YYYY when only the year is known). */
  ended: string | null;
  source_url: string;
}

async function api(params: Record<string, string>): Promise<unknown> {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** "Who won Super Bowl LX?" → "Super Bowl LX". Null when the question is not a who-won question. */
export function eventName(question: string): string | null {
  const m = String(question ?? "").trim()
    .match(/^(?:.*?:\s*)?(?:who|which\s+\w+(?:\s+\w+)?)\s+(?:won|wins|was\s+elected(?:\s+in)?|became\s+champion\s+(?:of|in)|took)\s+(?:the\s+)?(.+?)\??$/i);
  const name = m?.[1]?.replace(/\s+(?:title|trophy|championship title)$/i, "").trim();
  return name && name.length >= 4 ? name : null;
}

const STOP = new Set(["the", "of", "a", "an", "in", "and", "for", "to", "at", "on", "winner", "title", "last", "year"]);
const fold = (s: string) => s.toLowerCase()
  .replace(/\bu\.?s\.?a?\b/g, "united states").replace(/\bu\.?k\.?\b/g, "united kingdom").replace(/\bf1\b/g, "formula one");
const words = (s: string) => fold(s).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));

/**
 * How well an item's label fits the asked name: null unless every asked word is in
 * the label, else the count of label words the question did not say (lower is
 * closer). "World Cup in 2022" fits "2022 FIFA World Cup" with one extra word; "Super
 * Bowl LX" fits "Super Bowl LX" with none and "Super Bowl LX halftime show" with two.
 */
export function labelFit(asked: string, label: string): number | null {
  const a = words(asked);
  const l = new Set(words(label));
  if (!a.length || !a.every((w) => l.has(w))) return null;
  const extra = [...l].filter((w) => !a.includes(w)).length;
  return extra <= 2 ? extra : null;
}

function when(e: Entity): string | null {
  const t = e.claims?.["P582"]?.[0]?.mainsnak.datavalue?.value?.time ?? e.claims?.["P585"]?.[0]?.mainsnak.datavalue?.value?.time;
  if (!t) return null;
  const m = t.match(/^\+?(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return m[2] === "00" ? m[1]! : `${m[1]}-${m[2]}-${m[3] === "00" ? "01" : m[3]}`;
}

function finished(ended: string | null, now: Date): boolean {
  if (!ended) return false;
  // A year-only date is finished only once that year is over.
  const end = ended.length === 4 ? Date.UTC(Number(ended) + 1, 0, 1) : Date.parse(`${ended}T23:59:59Z`);
  return end < now.getTime();
}

/** Winner item ids, each with the class it was won in when the record splits them (F1 drivers and constructors). */
function winnerClaims(e: Entity): Array<{ id: string; klass: string | null }> {
  const claims = [...(e.claims?.["P1346"] ?? []), ...(e.claims?.["P991"] ?? [])].filter((c) => c.rank !== "deprecated");
  const preferred = claims.some((c) => c.rank === "preferred") ? claims.filter((c) => c.rank === "preferred") : claims;
  const seen = new Set<string>();
  const out: Array<{ id: string; klass: string | null }> = [];
  for (const c of preferred) {
    const id = c.mainsnak.datavalue?.value?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, klass: c.qualifiers?.["P2094"]?.[0]?.datavalue?.value?.id ?? null });
  }
  return out;
}

export async function findEventWinner(question: string, now = new Date()): Promise<EventWinner | null> {
  const asked = eventName(question);
  if (!asked) return null;
  // Labels put the year first ("2022 FIFA World Cup"), and the search matches label
  // prefixes, so "World Cup in 2022" is also searched as "2022 World Cup".
  const year = asked.match(/\b(1[89]|20)\d{2}\b/)?.[0];
  const yearFirst = year && !asked.startsWith(year) ? `${year} ${asked.replace(new RegExp(`\\s*\\b(?:in\\s+)?${year}\\b`), "")}`.trim() : null;
  const folded = fold(asked) !== asked.toLowerCase() ? fold(asked) : null;
  const searches = await Promise.all([asked, ...(yearFirst ? [yearFirst] : []), ...(folded ? [folded] : [])].map((s) =>
    api({ action: "wbsearchentities", language: "en", type: "item", limit: "7", search: s }) as Promise<{ search?: Array<{ id: string; label?: string }> }>));
  const seen = new Set<string>();
  const found = { search: searches.flatMap((r) => r.search ?? []).filter((s) => !seen.has(s.id) && seen.add(s.id)) };
  // Closest label first; the search's own order breaks a tie.
  const ids = (found.search ?? [])
    .map((s, i) => ({ id: s.id, fit: s.label ? labelFit(asked, s.label) : null, i }))
    .filter((s): s is { id: string; fit: number; i: number } => s.fit !== null)
    .sort((x, y) => x.fit - y.fit || x.i - y.i)
    .map((s) => s.id);
  if (!ids.length) return null;
  const got = (await api({ action: "wbgetentities", props: "claims|labels", languages: "en|mul", ids: ids.join("|") })) as { entities?: Record<string, Entity> };
  const event = ids.map((id) => got.entities?.[id]).find((e) => e && winnerClaims(e).length > 0);
  if (!event) return null;
  const ended = when(event);
  if (!finished(ended, now)) return null;
  const claims = winnerClaims(event).slice(0, 4);
  // Several winners with no class to tell them apart (a stage race's jerseys, an
  // award's categories) do not answer "who won": reported as not found rather than
  // listing a combativity prize beside the overall winner.
  if (claims.length > 1 && claims.some((c) => !c.klass)) return null;
  const labelIds = [...new Set(claims.flatMap((c) => (c.klass ? [c.id, c.klass] : [c.id])))];
  const labels = (await api({ action: "wbgetentities", props: "labels", languages: "en|mul", ids: labelIds.join("|") })) as { entities?: Record<string, Entity> };
  const name = (id: string) => label(labels.entities?.[id]) ?? null;
  const winners = claims
    .map((c) => {
      const who = name(c.id);
      const klass = c.klass ? name(c.klass) : null;
      return who ? (klass && claims.length > 1 ? `${who} (${klass})` : who) : null;
    })
    .filter((w): w is string => w !== null);
  if (!winners.length) return null;
  return {
    event: label(event) ?? asked,
    event_id: event.id,
    winners,
    ended,
    source_url: `https://www.wikidata.org/wiki/${event.id}`,
  };
}

/** "A and B" for two, "A, B and C" for more. */
export function andList(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}
