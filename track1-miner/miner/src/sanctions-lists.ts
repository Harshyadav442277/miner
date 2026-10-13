/**
 * The sanctions lists SANCTIONS_SCREENING_MATCH screens against, read live.
 *
 *   OFAC SDN    sanctionslistservice.ofac.treas.gov SDN.CSV + ALT.CSV     5.7 MB + 1.1 MB
 *   UN SC       scsanctions.un.org/resources/xml/en/consolidated.xml      2.2 MB
 *
 * Measured 2026-10-13. The UK consolidated list (16.6 MB) and the EU financial
 * sanctions file (18.6 MB, 60 s from here) are too large to read inside a
 * serverless request, so they are not screened, and answers say which lists
 * were. Both lists are public-sector publications. OFAC is read through its
 * Sanctions List Service API: treasury.gov/ofac/downloads held this service's
 * user agent 12.9 s before the first byte, against 2.5 s here (2026-10-13). One download is shared by
 * concurrent requests and kept for six hours; a failed read is not cached.
 */
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const TTL_MS = 6 * 3_600_000;
const STALE_MS = 54 * 3_600_000;
const TIMEOUT_MS = Number(process.env.SANCTIONS_TIMEOUT_MS ?? 9_000);
const OFAC = "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports";

export type ListName = "OFAC SDN" | "UN Security Council Consolidated";

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
export interface SanctionsLists { parties: ListedParty[]; editions: Edition[]; unavailable: ListName[] }

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

const years = (s: string): number[] => [...new Set([...s.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((m) => Number(m[1])))];

/** sdn.csv and alt.csv, joined on the entity number. Pure. */
export function parseOfac(sdn: string, alt: string): ListedParty[] {
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
    out.push({
      list: "OFAC SDN", id, name,
      aliases: aliases.get(id) ?? [],
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
const unxml = (s: string): string =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(Number(e[1] === "x" || e[1] === "X" ? `0${e.slice(1)}` : e.slice(1))) : XML_ENTITIES[e] ?? m).trim();

const tags = (block: string, tag: string): string[] =>
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

async function download(): Promise<SanctionsLists> {
  const [sdn, alt, un] = await Promise.all([
    read(`${OFAC}/SDN.CSV`).catch(() => null),
    read(`${OFAC}/ALT.CSV`).catch(() => null),
    read("https://scsanctions.un.org/resources/xml/en/consolidated.xml").catch(() => null),
  ]);
  const parties: ListedParty[] = [];
  const editions: Edition[] = [];
  const unavailable: ListName[] = [];
  const ofac = sdn ? parseOfac(sdn.text, alt?.text ?? "") : [];
  // An empty parse is a broken download, not an empty list.
  if (ofac.length > 1_000) {
    parties.push(...ofac);
    // OFAC redirects to a published file whose path carries its date.
    editions.push({ list: "OFAC SDN", published: sdn!.finalUrl.match(/\/(\d{4}-\d{2}-\d{2})\//)?.[1] ?? null, entries: ofac.length });
  } else unavailable.push("OFAC SDN");
  const unParties = un ? parseUn(un.text) : [];
  if (unParties.length > 100) {
    parties.push(...unParties);
    editions.push({
      list: "UN Security Council Consolidated",
      published: un!.text.match(/dateGenerated="(\d{4}-\d{2}-\d{2})/)?.[1] ?? null,
      entries: unParties.length,
    });
  } else unavailable.push("UN Security Council Consolidated");
  return { parties, editions, unavailable };
}

/**
 * Both lists. A complete read is kept for six hours, then served for up to two
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
