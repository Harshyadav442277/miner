/**
 * The prebuilt sanctions index: all five lists in one compact JSON file, so a cold instance makes one fetch
 * instead of downloading and parsing ~9 MB of OFAC and UN files, and can screen the UK and EU lists, which are
 * too large to read inside a request (sanctions-uk-eu.ts).
 *
 * track1-miner/tools/build-sanctions-index.mjs builds it daily (.github/workflows/sanctions-index.yml) and
 * force-pushes it to the `sanctions-data` branch. SANCTIONS_INDEX_URL overrides where it is read from ("off"
 * skips it). An index that cannot be read, is older than MAX_AGE_MS, or lacks a core list is not used, and
 * sanctions-lists.ts reads the OFAC and UN files directly instead.
 *
 * Format, version 1. `s` is a string table for programmes and nationalities; each row of `p` is
 *   [list, id, name, aliases, type, programmes, birth years, nationalities, listed_on, wallets]
 * where list indexes `lists`, programmes and nationalities index `s`, type is i/e/v/a, an empty field is 0,
 * and trailing empty fields are dropped. A party's source URL is its list's `u` with {id} filled in.
 */
import { CORE_LISTS, OPTIONAL_LISTS, looksComplete, type ListName, type ListRead, type ListedParty, type SanctionsLists } from "./sanctions-lists";
import { EU_URL, UK_URL, distinct } from "./sanctions-uk-eu";

export const INDEX_FILE = "sanctions-index.json";
const DEFAULT_URL = `https://raw.githubusercontent.com/Harshyadav442277/miner/sanctions-data/${INDEX_FILE}`;
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
/** The index is rebuilt daily; three days without a build means the workflow is broken, not that lists are quiet. */
const MAX_AGE_MS = 72 * 3_600_000;

type Row = [number, string, string, (string[] | 0)?, string?, (number[] | 0)?, (number[] | 0)?, (number[] | 0)?, (string | 0)?, (string[] | 0)?];
export interface IndexList { n: ListName; pub: string | null; count: number; src: string; u: string | null }
export interface SanctionsIndex { v: 1; built_at: string; lists: IndexList[]; failed: Array<{ n: ListName; error: string }>; s: string[]; p: Row[] }

/**
 * Where each list's parties are looked up by a reader. sanctions-lists imports this module, and sanctions-uk-eu
 * imports sanctions-lists, so nothing from either is read at load time here: only inside functions.
 */
function urlTemplate(list: ListName): string | null {
  if (list === "UK Sanctions List") return UK_URL;
  if (list === "EU Financial Sanctions Consolidated List") return EU_URL;
  if (list.startsWith("OFAC")) return "https://sanctionssearch.ofac.treas.gov/Details.aspx?id={id}";
  return null;
}

const TYPE: Record<ListedParty["type"], string> = { individual: "i", entity: "e", vessel: "v", aircraft: "a" };
const KIND: Record<string, ListedParty["type"]> = { i: "individual", e: "entity", v: "vessel", a: "aircraft" };

/** The index for these reads. Aliases are de-duplicated; nothing else is changed. Pure. */
export function encodeIndex(reads: ListRead[], failed: Array<{ n: ListName; error: string }>, builtAt: string): SanctionsIndex {
  const s: string[] = [];
  const at = new Map<string, number>();
  const ref = (x: string): number => {
    let i = at.get(x);
    if (i === undefined) { i = s.length; s.push(x); at.set(x, i); }
    return i;
  };
  const or0 = <T>(a: T[]): T[] | 0 => (a.length ? a : 0);
  const p: Row[] = [];
  reads.forEach((r, li) => {
    for (const x of r.parties) {
      const row: Row = [li, x.id, x.name, or0(distinct(x.name, x.aliases)), TYPE[x.type], or0(x.programs.map(ref)),
        or0(x.dob_years), or0(x.nationalities.map(ref)), x.listed_on ?? 0, or0(x.wallets)];
      while (row.length > 3 && !row[row.length - 1]) row.pop();
      p.push(row);
    }
  });
  const lists = reads.map((r) => ({ n: r.list, pub: r.published, count: r.parties.length, src: r.source, u: urlTemplate(r.list) }));
  return { v: 1, built_at: builtAt, lists, failed, s, p };
}

const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? x as T[] : []);

/**
 * The lists in an index, or null when it should not be used: not version 1, built more than MAX_AGE_MS
 * before `now`, missing a core list, or holding a list that looks broken. Pure.
 */
export function decodeIndex(ix: unknown, now: number): SanctionsLists | null {
  const x = ix as Partial<SanctionsIndex> | null;
  if (!x || x.v !== 1 || !Array.isArray(x.lists) || !Array.isArray(x.p) || !Array.isArray(x.s)) return null;
  const built = Date.parse(String(x.built_at));
  if (!Number.isFinite(built) || now - built > MAX_AGE_MS) return null;
  const s = x.s;
  const byList: ListedParty[][] = x.lists.map(() => []);
  for (const r of x.p) {
    const meta = Array.isArray(r) ? x.lists[r[0]] : undefined;
    if (!meta) return null;
    const id = String(r[1]);
    byList[r[0]]!.push({
      list: meta.n, id, name: String(r[2]), aliases: arr<string>(r[3]), type: KIND[String(r[4] ?? "e")] ?? "entity",
      programs: arr<number>(r[5]).map((i) => s[i] ?? ""), dob_years: arr<number>(r[6]),
      nationalities: arr<number>(r[7]).map((i) => s[i] ?? ""), listed_on: r[8] ? String(r[8]) : null,
      wallets: arr<string>(r[9]), url: meta.u ? meta.u.replace("{id}", id) : null,
    });
  }
  const reads: ListRead[] = [];
  // Built here, not at load: sanctions-lists imports this module, so its constants exist only once it has run.
  const known = new Set<string>([...CORE_LISTS, ...OPTIONAL_LISTS]);
  for (const [i, meta] of x.lists.entries()) {
    if (!known.has(meta.n) || reads.some((r) => r.list === meta.n)) return null;
    if (byList[i]!.length !== meta.count || !looksComplete(meta.n, byList[i]!)) return null;
    reads.push({ list: meta.n, published: meta.pub ?? null, parties: byList[i]!, source: meta.src });
  }
  if (CORE_LISTS.some((l) => !reads.some((r) => r.list === l))) return null;
  return {
    parties: reads.flatMap((r) => r.parties),
    editions: reads.map((r) => ({ list: r.list, published: r.published, entries: r.parties.length })),
    unavailable: [],
    not_screened: OPTIONAL_LISTS.filter((l) => !reads.some((r) => r.list === l)),
  };
}

/** The index's lists, or null when it cannot be read or should not be used. One fetch, a few seconds at most. */
export async function loadIndex(): Promise<SanctionsLists | null> {
  const url = process.env.SANCTIONS_INDEX_URL || DEFAULT_URL;
  if (url === "off") return null;
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(Number(process.env.SANCTIONS_INDEX_TIMEOUT_MS ?? 4_000)),
    });
    if (!r.ok) return null;
    return decodeIndex(await r.json(), Date.now());
  } catch {
    return null;
  }
}
