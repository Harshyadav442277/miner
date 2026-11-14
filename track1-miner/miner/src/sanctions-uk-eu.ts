/**
 * The UK Sanctions List and the EU financial sanctions list, parsed for the prebuilt index.
 *
 *   UK  FCDO, sanctionslist.fcdo.gov.uk UK-Sanctions-List.xml   22 MB, 6,420 designations (generated 2026-11-03)
 *       Linked from https://www.gov.uk/government/publications/the-uk-sanctions-list, the only UK list since
 *       OFSI's Consolidated List closed on 2026-01-28 (that page, read 2026-11-08). Open Government Licence v3.0.
 *   EU  European Commission FSF, webgate.ec.europa.eu xmlFullSanctionsList_1_1 (public token URL, listed on
 *       data.europa.eu under the Commission reuse notice). Every file on that host answered HTTP 500 on
 *       2026-11-08 20:11 and 23:44 UTC, so parseEu follows the published v1.1 layout (sanctionEntity, nameAlias,
 *       citizenship, birthdate) without a live file to check it against (GAPS).
 *
 * Neither list is read by the miner directly: they are too large for a serverless request. The builder
 * (track1-miner/tools/build-sanctions-index.mjs) parses them here and writes them into the index.
 */
import { tags, unxml, years, type ListedParty } from "./sanctions-lists";

export const UK_URL = "https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.xml";
export const EU_URL = "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw";

/** "27/08/1953" as "1953-08-27"; anything else as null. */
const ukDate = (s: string | undefined): string | null => {
  const m = String(s ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

/** Names without repeats, compared case-blind, and never the primary name again. */
export function distinct(primary: string, names: string[]): string[] {
  const seen = new Set([primary.toLowerCase()]);
  return names.filter((n) => {
    const k = n.toLowerCase();
    if (!n || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const CYRILLIC = /\p{Script=Cyrillic}/u;

/** UK-Sanctions-List.xml. Pure. */
export function parseUk(xml: string): ListedParty[] {
  const out: ListedParty[] = [];
  for (const m of xml.matchAll(/<Designation>([\s\S]*?)<\/Designation>/g)) {
    const b = m[1] ?? "";
    const names = [...(b.match(/<Names>([\s\S]*?)<\/Names>/)?.[1] ?? "").matchAll(/<Name>([\s\S]*?)<\/Name>/g)].map((n) => {
      const x = n[1] ?? "";
      // Name1 to Name5 are given names, Name6 the surname or the whole name of an entity or ship.
      const full = ["Name1", "Name2", "Name3", "Name4", "Name5", "Name6"].map((t) => tags(x, t)[0] ?? "").filter(Boolean).join(" ");
      return { full, primary: /^primary name$/i.test(tags(x, "NameType")[0] ?? "") };
    }).filter((n) => n.full);
    const first = names.find((n) => n.primary) ?? names[0];
    if (!first) continue;
    // Cyrillic spellings are kept, since callers write "Сбербанк"; other scripts are not read by the screen.
    const nonLatin = tags(b, "NameNonLatinScript").filter((n) => CYRILLIC.test(n));
    const kind = (tags(b, "IndividualEntityShip")[0] ?? "").toLowerCase();
    out.push({
      list: "UK Sanctions List",
      id: tags(b, "UniqueID")[0] ?? "",
      name: first.full,
      aliases: distinct(first.full, [...names.filter((n) => n !== first).map((n) => n.full), ...nonLatin]),
      type: kind === "individual" ? "individual" : kind === "ship" ? "vessel" : "entity",
      programs: tags(b, "RegimeName"),
      dob_years: years(tags(b, "DOB").join(" ")),
      nationalities: [...new Set(tags(b, "Nationality"))],
      listed_on: ukDate(tags(b, "DateDesignated")[0]),
      wallets: [],
      url: UK_URL,
    });
  }
  return out;
}

/** The UK file's generation date, as YYYY-MM-DD. */
export const ukPublished = (xml: string): string | null => ukDate(xml.match(/<DateGenerated>([^<]+)<\/DateGenerated>/)?.[1]?.trim());

/** Attribute values of an XML start tag's attribute text. */
function attrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) out[m[1]!] = unxml(m[2] ?? "");
  return out;
}

/** Every start tag `tag` (with or without a namespace prefix) in `block`, as its attributes. */
const starts = (block: string, tag: string): Array<Record<string, string>> =>
  [...block.matchAll(new RegExp(`<(?:\\w+:)?${tag}\\b([^>]*?)/?>`, "g"))].map((m) => attrs(m[1] ?? ""));

/** xmlFullSanctionsList_1_1. Pure. */
export function parseEu(xml: string): ListedParty[] {
  const out: ListedParty[] = [];
  for (const m of xml.matchAll(/<(?:\w+:)?sanctionEntity\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?sanctionEntity>/g)) {
    const head = attrs(m[1] ?? "");
    const b = m[2] ?? "";
    const names = starts(b, "nameAlias").map((a) =>
      (a.wholeName || [a.firstName, a.middleName, a.lastName].filter(Boolean).join(" ")).trim()).filter(Boolean);
    const name = names[0];
    if (!name) continue;
    const kind = (starts(b, "subjectType")[0]?.code ?? "").toLowerCase();
    const births = starts(b, "birthdate").map((d) => `${d.year ?? ""} ${d.birthdate ?? ""}`).join(" ");
    out.push({
      list: "EU Financial Sanctions Consolidated List",
      id: head.euReferenceNumber || head.logicalId || "",
      name,
      aliases: distinct(name, names.slice(1)),
      type: kind === "person" ? "individual" : "entity",
      programs: [...new Set(starts(b, "regulation").map((r) => r.programme ?? "").filter(Boolean))],
      dob_years: years(births),
      nationalities: [...new Set(starts(b, "citizenship").map((c) => c.countryDescription ?? "").filter((c) => c && c !== "UNKNOWN"))],
      listed_on: head.designationDate?.slice(0, 10) || null,
      wallets: [],
      url: EU_URL,
    });
  }
  return out;
}

/** The EU file's generation date, as YYYY-MM-DD. */
export const euPublished = (xml: string): string | null => xml.match(/<(?:\w+:)?export\b[^>]*\bgenerationDate="(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
