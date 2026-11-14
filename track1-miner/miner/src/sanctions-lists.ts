/**
 * The sanctions lists SANCTIONS_SCREENING_MATCH screens against, read live.
 *
 *   OFAC SDN    sanctionslistservice.ofac.treas.gov SDN.CSV + ALT.CSV     5.7 MB + 1.1 MB
 *   OFAC non-SDN  same service, CONS_PRIM.CSV + CONS_ALT.CSV            0.27 MB + 0.07 MB
 *   UN SC       scsanctions.un.org/resources/xml/en/consolidated.xml      2.2 MB
 *
 * The non-SDN Consolidated list (sectoral SSI, NS-MBS, NS-PLC, CAPTA and
 * similar programmes, ~480 parties) has the SDN files' layout; added 2026-11-06,
 * when the leading SANCTIONS_SCREENING_MATCH miner screened it and we did not.
 * Measured 2026-10-13. The UK Sanctions List (22 MB XML on 2026-11-08) and the EU
 * financial sanctions file (18.6 MB, 60 s from here) are too large to read inside
 * a serverless request, so they reach the miner only through the prebuilt index
 * (sanctions-index.ts), one compact file holding all five lists, built daily by
 * track1-miner/tools/build-sanctions-index.mjs. The index is read first; when it
 * cannot be read, the three lists above are read directly as before and the UK
 * and EU lists are named as not screened. OFAC is read through its
 * Sanctions List Service API: treasury.gov/ofac/downloads held this service's
 * user agent 12.9 s before the first byte, against 2.5 s here (2026-10-13). One download is shared by
 * concurrent requests and kept for six hours; a failed read is not cached.
 */
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const TTL_MS = 6 * 3_600_000;
const STALE_MS = 54 * 3_600_000;
const TIMEOUT_MS = Number(process.env.SANCTIONS_TIMEOUT_MS ?? 9_000);
const OFAC = "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports";

import { loadIndex } from "./sanctions-index";

export type ListName = "OFAC SDN" | "OFAC Consolidated (non-SDN)" | "UN Security Council Consolidated"
  | "UK Sanctions List" | "EU Financial Sanctions Consolidated List";

/** The lists every answer needs: without one of them a clearance is not given. */
export const CORE_LISTS: ListName[] = ["OFAC SDN", "OFAC Consolidated (non-SDN)", "UN Security Council Consolidated"];
/** Lists read only through the index: when absent they are named as not screened, as before 2026-11-09. */
export const OPTIONAL_LISTS: ListName[] = ["EU Financial Sanctions Consolidated List", "UK Sanctions List"];

/** Fewer parties than this, or no aliases at all, is a broken read, not a short list. */
const MIN_PARTIES: Record<ListName, number> = {
  "OFAC SDN": 1_000, "OFAC Consolidated (non-SDN)": 100, "UN Security Council Consolidated": 100,
  "UK Sanctions List": 1_000, "EU Financial Sanctions Consolidated List": 1_000,
};
export const looksComplete = (list: ListName, parties: ListedParty[]): boolean =>
  parties.length > MIN_PARTIES[list] && (list === "UN Security Council Consolidated" || parties.some((p) => p.aliases.length > 0));

export interface ListedParty {
  list: ListName;
  /** OFAC's entity number or the UN reference number. */
  id: string;
  name: string;
  aliases: string[];
  type: "individual" | "entity" | "vessel" | "aircraft";
  programs: string[];
  dob_years: number[];
  nationalities: string[];
  listed_on: string | null;
  /** Digital currency addresses OFAC lists for the party, as "ETH 0x…". */
  wallets: string[];
  url: string | null;
}

export interface Edition { list: ListName; published: string | null; entries: number }
/**
 * `unavailable`: core lists that could not be read, so no clearance is given.
 * `not_screened`: optional lists this read did not include; named in the answer, not a failure.
 */
export interface SanctionsLists { parties: ListedParty[]; editions: Edition[]; unavailable: ListName[]; not_screened: ListName[] }

/** One list as read: its parties, its edition date and the file it came from. */
export interface ListRead { list: ListName; published: string | null; parties: ListedParty[]; source: string }

/** RFC 4180 rows: quoted fields may hold commas, doubled quotes and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

/** OFAC writes "-0- " for an empty field. */
const val = (s: string | undefined): string => {
  const t = String(s ?? "").trim();
  return t === "-0-" ? "" : t;
};

export const years = (s: string): number[] => [...new Set([...s.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((m) => Number(m[1])))];

/** sdn.csv and alt.csv (or cons_prim.csv and cons_alt.csv), joined on the entity number. Pure. */
export function parseOfac(sdn: string, alt: string, list: "OFAC SDN" | "OFAC Consolidated (non-SDN)" = "OFAC SDN"): ListedParty[] {
  const aliases = new Map<string, string[]>();
  for (const r of parseCsv(alt)) {
    const id = val(r[0]);
    const name = val(r[3]);
    if (id && name) aliases.set(id, [...(aliases.get(id) ?? []), name]);
  }
  const out: ListedParty[] = [];
  for (const r of parseCsv(sdn)) {
    const id = val(r[0]);
    const name = val(r[1]);
    if (!/^\d+$/.test(id) || !name) continue;
    const kind = val(r[2]).toLowerCase();
    const remarks = val(r[11]);
    const dob = [...remarks.matchAll(/\bDOB ([^;]+)/g)].map((m) => m[1] ?? "").join(" ");
    // "Website suex.io": callers name exchanges and mixers by their domain, so the listed site is an alias.
    const sites = [...remarks.matchAll(/\bWebsite\s+([^\s;,]+)/gi)]
      .map((m) => (m[1] ?? "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/[./]+$/, ""))
      .filter((w) => w.includes("."));
    out.push({
      list, id, name,
      aliases: [...(aliases.get(id) ?? []), ...sites],
      type: kind === "individual" || kind === "vessel" || kind === "aircraft" ? kind : "entity",
      programs: val(r[3]).split(/\]\s*\[/).map((p) => p.replace(/[[\]]/g, "").trim()).filter(Boolean),
      dob_years: years(dob),
      nationalities: [...remarks.matchAll(/\b(?:nationality|citizen) ([^;.]+)/gi)].map((m) => (m[1] ?? "").trim()),
      listed_on: null,
      wallets: [...remarks.matchAll(/Digital Currency Address - ([A-Z0-9]+) ([A-Za-z0-9]+)/g)].map((m) => `${m[1]} ${m[2]}`),
      url: `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${id}`,
    });
  }
  return out;
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export const unxml = (s: string): string =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(Number(e[1] === "x" || e[1] === "X" ? `0${e.slice(1)}` : e.slice(1))) : XML_ENTITIES[e] ?? m).trim();

export const tags = (block: string, tag: string): string[] =>
  [...block.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((m) => unxml(m[1] ?? "")).filter(Boolean);

/** The UN consolidated XML. Pure. */
export function parseUn(xml: string): ListedParty[] {
  const out: ListedParty[] = [];
  for (const [kind, tag] of [["individual", "INDIVIDUAL"], ["entity", "ENTITY"]] as const) {
    for (const m of xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))) {
      const b = m[1] ?? "";
      const name = ["FIRST_NAME", "SECOND_NAME", "THIRD_NAME", "FOURTH_NAME"].map((t) => tags(b, t)[0] ?? "").filter(Boolean).join(" ");
      if (!name) continue;
      const dob = [...b.matchAll(/<INDIVIDUAL_DATE_OF_BIRTH>([\s\S]*?)<\/INDIVIDUAL_DATE_OF_BIRTH>/g)].map((d) => d[1] ?? "").join(" ");
      const nat = b.match(/<NATIONALITY>([\s\S]*?)<\/NATIONALITY>/)?.[1] ?? "";
      out.push({
        list: "UN Security Council Consolidated",
        id: tags(b, "REFERENCE_NUMBER")[0] ?? tags(b, "DATAID")[0] ?? "",
        name,
        aliases: tags(b, "ALIAS_NAME"),
        type: kind,
        programs: tags(b, "UN_LIST_TYPE"),
        dob_years: years(dob),
        nationalities: tags(nat, "VALUE"),
        listed_on: tags(b, "LISTED_ON")[0] ?? null,
        wallets: [],
        url: null,
      });
    }
  }
  return out;
}

async function read(url: string): Promise<{ text: string; finalUrl: string }> {
  const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return { text: await r.text(), finalUrl: r.url };
}

let cached: { at: number; lists: SanctionsLists } | null = null;
let pending: Promise<SanctionsLists> | null = null;

/** The files of the direct read, also downloaded by the index builder. */
export const DIRECT_FILES = {
  sdn: `${OFAC}/SDN.CSV`, alt: `${OFAC}/ALT.CSV`, cons: `${OFAC}/CONS_PRIM.CSV`, consAlt: `${OFAC}/CONS_ALT.CSV`,
  un: "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
} as const;
export type Fetched = { text: string; finalUrl: string } | null;

/** The three core lists from the direct files; a list that looks broken is named in `failed`. Pure. */
export function assemble(f: Record<keyof typeof DIRECT_FILES, Fetched>): { reads: ListRead[]; failed: ListName[] } {
  const reads: ListRead[] = [];
  const failed: ListName[] = [];
  const add = (list: ListName, parties: ListedParty[], published: string | null, source: string): void => {
    if (looksComplete(list, parties)) reads.push({ list, published, parties, source });
    else failed.push(list);
  };
  // OFAC redirects to a published file whose path carries its date.
  const dated = (x: Fetched): string | null => x?.finalUrl.match(/\/(\d{4}-\d{2}-\d{2})\//)?.[1] ?? null;
  // Without alt.csv every alias is missing, and "Rosneft" (an alias of entry
  // 17022) was answered "no match" on 2026-10-21. A name screen without the
  // aliases is not a screen of the list, so a failed alias download counts as
  // an unread list and is never cached as complete. An empty parse is a broken
  // download, not an empty list.
  add("OFAC SDN", f.sdn && f.alt ? parseOfac(f.sdn.text, f.alt.text) : [], dated(f.sdn), DIRECT_FILES.sdn);
  // ~480 parties on 2026-11-06; under 100, or no aliases at all, is a broken read.
  add("OFAC Consolidated (non-SDN)", f.cons && f.consAlt ? parseOfac(f.cons.text, f.consAlt.text, "OFAC Consolidated (non-SDN)") : [],
    dated(f.cons), DIRECT_FILES.cons);
  add("UN Security Council Consolidated", f.un ? parseUn(f.un.text) : [],
    f.un?.text.match(/dateGenerated="(\d{4}-\d{2}-\d{2})/)?.[1] ?? null, DIRECT_FILES.un);
  return { reads, failed };
}

/** Lists as the screen reads them. Pure. */
export function toLists(reads: ListRead[], failed: ListName[], notScreened: ListName[]): SanctionsLists {
  return {
    parties: reads.flatMap((r) => r.parties),
    editions: reads.map((r) => ({ list: r.list, published: r.published, entries: r.parties.length })),
    unavailable: failed.filter((l) => CORE_LISTS.includes(l)),
    not_screened: notScreened,
  };
}

async function download(): Promise<SanctionsLists> {
  // One fetch of the prebuilt index when it is usable; the direct read below, as before, when it is not.
  const indexed = await loadIndex();
  if (indexed) return indexed;
  const keys = Object.keys(DIRECT_FILES) as Array<keyof typeof DIRECT_FILES>;
  const got = await Promise.all(keys.map((k) => read(DIRECT_FILES[k]).catch(() => null)));
  const { reads, failed } = assemble(Object.fromEntries(keys.map((k, i) => [k, got[i] ?? null])) as Record<keyof typeof DIRECT_FILES, Fetched>);
  return toLists(reads, failed, OPTIONAL_LISTS);
}

/**
 * All the lists, from the index or read directly. A complete read is kept for six hours, then served for up to two
 * days more while a fresh copy downloads, and preferred over a partial fresh
 * read; its edition dates say how old it is.
 */
export async function sanctionsLists(): Promise<SanctionsLists> {
  const age = cached ? Date.now() - cached.at : Infinity;
  if (age < TTL_MS) return cached!.lists;
  if (age < STALE_MS) {
    void refresh().catch(() => undefined);
    return cached!.lists;
  }
  return refresh();
}

async function refresh(): Promise<SanctionsLists> {
  if (pending) return pending;
  pending = download();
  try {
    const lists = await pending;
    if (lists.unavailable.length === 0) cached = { at: Date.now(), lists };
    return lists.unavailable.length && cached ? cached.lists : lists;
  } finally {
    pending = null;
  }
}
