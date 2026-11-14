/**
 * CORPORATE_REGISTRY_LOOKUP: a company's official register record.
 *
 * GLEIF's LEI register (api.gleif.org, keyless, CC0) gives the legal name,
 * whether the entity is active, the company number it is registered under and
 * with which register (Companies House, a US state, …), its legal form,
 * registered and headquarters addresses, incorporation date and its direct and
 * ultimate accounting parents. For a US filer, SEC EDGAR adds the state of
 * incorporation, industry code and former names. Neither source lists directors
 * or beneficial owners, and the answer says so rather than leaving it unsaid.
 */
import { resolveCik, submissions, type EdgarCompany } from "./edgar";
import { nameScore, nameTokens } from "./sanctions";

const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const GLEIF = "https://api.gleif.org/api/v1";
const TIMEOUT_MS = Number(process.env.GLEIF_TIMEOUT_MS ?? 5_000);

const COUNTRY: Array<[RegExp, string]> = [
  [/\b(?:uk|u\.k\.|united kingdom|britain|british|england|scotland|wales)\b/i, "GB"],
  [/\bdelaware\b/i, "US-DE"], [/\b(?:us|u\.s\.|usa|united states|american)\b/i, "US"],
  [/\b(?:germany|german)\b/i, "DE"], [/\b(?:france|french)\b/i, "FR"], [/\b(?:india|indian)\b/i, "IN"],
  [/\bsingapore\b/i, "SG"], [/\b(?:japan|japanese)\b/i, "JP"], [/\b(?:ireland|irish)\b/i, "IE"],
  [/\b(?:netherlands|dutch)\b/i, "NL"], [/\bluxembourg\b/i, "LU"], [/\bcayman\b/i, "KY"],
  [/\b(?:switzerland|swiss)\b/i, "CH"], [/\b(?:canada|canadian)\b/i, "CA"], [/\b(?:australia|australian)\b/i, "AU"],
  [/\bhong kong\b/i, "HK"],
];

export interface RegistrySubject { name: string; lei: string | null; number: string | null; country: string | null }

export function registrySubject(question: string, companyParam = "", numberParam = ""): RegistrySubject {
  const q = String(question ?? "").slice(0, 600);
  const lei = (companyParam.match(/\b[A-Z0-9]{18}\d{2}\b/) ?? q.match(/\b[A-Z0-9]{18}\d{2}\b/))?.[0] ?? null;
  const number = numberParam.trim() ||
    (q.match(/\b(?:company|registration|registered|corporate|firm|incorporation)\s+(?:number|no\.?|#)\s*:?\s*([A-Z]{0,2}\d{5,10})\b/i)?.[1] ?? null);
  const country = COUNTRY.find(([re]) => re.test(q))?.[1] ?? null;
  const quoted = q.match(/['"‘“]([^'"’”]{2,100})['"’”]/)?.[1] ?? "";
  let name = companyParam.trim() || quoted;
  if (!name && !lei && !number) {
    const m =
      q.match(/\b(?:register(?:ed)?\s+record|registry\s+(?:record|details|entry)|incorporation\s+(?:status|details|record)|registered\s+(?:agent|address|office)|directors|beneficial\s+owners?|company\s+number|legal\s+entity\s+identifier|LEI)\s+(?:for|of)\s+(.+?)(?:[?,]|\s+(?:in|on|and|with)\s+|$)/i) ??
      // "an"/"a"/"still" before the status: "Is Nvidia Corporation an active registered
      // company?" was searched as "Nvidia Corporation an" and not found (G210, 2026-10-25).
      q.match(/\b(?:is|was)\s+(.+?)\s+(?:(?:still|an?|currently)\s+){0,2}(?:registered|incorporated|active|dissolved|in\s+good\s+standing)\b/i) ??
      q.match(/\b(?:look\s+up|find|check)\s+(.+?)\s+(?:in|on)\s+(?:the\s+)?(?:company|corporate|business)\s+regist/i);
    name = (m?.[1] ?? "").replace(/^(?:the|a)\s+/i, "").trim();
  }
  // "What is Tesla Inc's registered address" read "Tesla Inc's" and found no
  // record (2026-10-21): the possessive is never part of a legal name.
  return { name: name.replace(/[?!]+$/, "").trim().replace(/(?:'s|’s)$/i, ""), lei, number, country };
}

interface LeiRecord {
  id: string;
  attributes: {
    lei: string;
    entity: {
      legalName: { name: string }; otherNames?: Array<{ name: string }>;
      legalAddress: Address; headquartersAddress?: Address;
      registeredAt?: { id: string | null }; registeredAs?: string | null;
      jurisdiction?: string | null; category?: string | null;
      legalForm?: { id: string | null; other?: string | null };
      status: string; creationDate?: string | null;
    };
    registration: { status: string; lastUpdateDate?: string; nextRenewalDate?: string };
  };
}
interface Address { addressLines?: string[]; city?: string; region?: string | null; country?: string; postalCode?: string | null }

async function gleif(path: string): Promise<unknown | null> {
  const r = await fetch(`${GLEIF}/${path}`, { headers: { accept: "application/vnd.api+json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const names = new Map<string, string | null>();
/** A legal-form or registration-authority code's name, cached; null when unknown. */
async function codeName(kind: "entity-legal-forms" | "registration-authorities", code: string | null | undefined): Promise<string | null> {
  if (!code || code === "8888" || code === "RA999999") return null;
  const key = `${kind}/${code}`;
  if (!names.has(key)) {
    const j = (await gleif(key).catch(() => null)) as { data?: { attributes?: Record<string, unknown> } } | null;
    const a = j?.data?.attributes;
    const name = kind === "entity-legal-forms"
      ? ((a?.names as Array<{ localName?: string; transliteratedName?: string }> | undefined)?.[0]?.transliteratedName ?? null)
      : ((a?.internationalOrganizationName as string | undefined) ?? (a?.internationalName as string | undefined) ?? null);
    if (j) names.set(key, name);
    return name;
  }
  return names.get(key) ?? null;
}

const addressText = (a: Address | undefined): string | null =>
  a ? [...(a.addressLines ?? []), a.city, a.region, a.postalCode, a.country].filter(Boolean).join(", ") || null : null;

/** GLEIF's ranking of a name search, re-ranked: closest name, then live general companies over funds and branches. */
export function rankRecords(want: string, records: LeiRecord[]): LeiRecord[] {
  const w = nameTokens(want);
  // The name must match on its own; status only orders the names that do.
  const bonus = (r: LeiRecord): number => {
    const e = r.attributes.entity;
    return (e.status === "ACTIVE" ? 0.03 : 0) + (r.attributes.registration.status === "ISSUED" ? 0.02 : 0)
      + (e.category === "GENERAL" ? 0.03 : e.category === "FUND" || e.category === "BRANCH" ? -0.1 : 0);
  };
  return records.map((r) => ({ r, n: nameScore(w, nameTokens(r.attributes.entity.legalName.name)) }))
    .filter((x) => x.n >= 0.9).map((x) => ({ r: x.r, s: x.n + bonus(x.r) })).sort((a, b) => b.s - a.s).map((x) => x.r);
}

/** The long forms a register spells out for a legal-form abbreviation at the end of a name. */
const LONG_FORMS: Record<string, string[]> = {
  ag: ["Aktiengesellschaft"], gmbh: ["Gesellschaft mit beschränkter Haftung"], se: ["Societas Europaea"],
  sa: ["Société Anonyme", "Sociedad Anónima"], nv: ["Naamloze Vennootschap"], bv: ["Besloten Vennootschap"],
  plc: ["Public Limited Company"], ltd: ["Limited"], inc: ["Incorporated"], llc: ["Limited Liability Company"],
  spa: ["Società per Azioni"], kk: ["Kabushiki Kaisha"],
};

/** "Siemens AG" as "Siemens Aktiengesellschaft": each long form of a trailing legal-form abbreviation. Pure. */
export function longForms(name: string): string[] {
  const m = String(name ?? "").trim().match(/^(.+?)[\s,]+((?:[A-Za-z]\.?){2,4}|GmbH|plc|Ltd|Inc|SpA)\.?$/);
  const key = m?.[2]?.replace(/\./g, "").toLowerCase();
  return m && key && LONG_FORMS[key] ? LONG_FORMS[key]!.map((l) => `${m[1]!.trim()} ${l}`) : [];
}

export interface Party { name: string; lei: string }

export interface RegistryResult {
  subject: string | null;
  verdict: "found" | "not_found" | "unknown";
  confidence: number;
  reason: string;
  error?: string;
  legal_name?: string;
  lei?: string;
  entity_status?: string;
  lei_registration_status?: string;
  jurisdiction?: string | null;
  legal_form?: string | null;
  company_number?: string | null;
  register?: string | null;
  registered_address?: string | null;
  registered_agent?: string | null;
  headquarters_address?: string | null;
  incorporated?: string | null;
  other_names?: string[];
  direct_parent?: Party | null;
  ultimate_parent?: Party | null;
  us_filer?: Omit<EdgarCompany, "filings"> | null;
  other_candidates?: Array<Party & { jurisdiction: string | null; status: string }>;
  not_in_sources: string[];
  sources: string[];
}

const NOT_IN_SOURCES = ["directors and officers", "beneficial owners (GLEIF records accounting-consolidation parents only)"];

async function parent(lei: string, which: "direct-parent" | "ultimate-parent"): Promise<Party | null> {
  const j = (await gleif(`lei-records/${lei}/${which}`).catch(() => null)) as { data?: LeiRecord } | null;
  return j?.data ? { name: j.data.attributes.entity.legalName.name, lei: j.data.id } : null;
}

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "the District of Columbia",
};

/** The sentence answering the specific fields a question asks for, or "" when it asks for none of them. */
export function askedSentence(
  question: string, name: string, address: string | null, agent: string | null,
  jurisdiction: string | null, edgarState: string | null,
): string {
  const parts: string[] = [];
  if (/\baddress\b|\bregistered office\b/i.test(question) && !/\bheadquarter/i.test(question) && address) {
    parts.push(`its registered address is ${address}`);
  }
  if (/\bregistered agent\b/i.test(question) && agent) parts.push(`its registered agent is ${agent.replace(/^c\/o\s+/i, "")}`);
  if (/\b(state|jurisdiction|country|place) of (incorporation|registration|formation)|\bincorporated (in|where)|\bwhere\b.*\bincorporated\b/i.test(question)) {
    const code = edgarState ?? (jurisdiction?.startsWith("US-") ? jurisdiction.slice(3) : null);
    const place = code && US_STATES[code] ? `${US_STATES[code]} (${code})` : jurisdiction;
    if (place) parts.push(`it is incorporated in ${place}`);
  }
  if (!parts.length) return "";
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return `For ${name}, ${joined}. `;
}

export async function lookupRegistry(question: string, companyParam = "", numberParam = ""): Promise<RegistryResult> {
  const s = registrySubject(question, companyParam, numberParam);
  const subject = s.lei ?? s.number ?? (s.name || null);
  const base = { subject, not_in_sources: NOT_IN_SOURCES, sources: [] as string[] };
  if (!subject) {
    return { ...base, verdict: "unknown", confidence: 0, error: "no_subject",
      reason: "No company, company number or LEI was named, so no register record was looked up. Name the company, for example: What is the incorporation status of Tesla, Inc.?" };
  }
  const country = s.country && s.country.length === 2 ? `&filter%5Bentity.legalAddress.country%5D=${s.country}` : "";
  const path = s.lei ? `lei-records/${s.lei}`
    : s.number ? `lei-records?filter%5Bentity.registeredAs%5D=${encodeURIComponent(s.number)}${country}&page%5Bsize%5D=10`
    : `lei-records?filter%5Bentity.legalName%5D=${encodeURIComponent(s.name.slice(0, 120))}${country}&page%5Bsize%5D=15`;
  const usFiler = !s.lei && !s.number && s.name && (!s.country || s.country.startsWith("US"));
  const [found, cik] = await Promise.all([
    gleif(path).then((j) => j as { data?: LeiRecord | LeiRecord[] } | null).catch(() => undefined),
    usFiler ? resolveCik(s.name).catch(() => undefined) : Promise.resolve(null),
  ]);
  const edgar = cik ? await submissions(cik.cik).catch(() => undefined) : null;
  const us = edgar ? (({ filings: _f, ...rest }) => rest)(edgar) : null;
  if (found === undefined && !us) {
    return { ...base, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `The register record for ${subject} could not be read because the GLEIF register did not answer. This is an availability problem, not a finding that the company does not exist.` };
  }
  const records = !found?.data ? [] : Array.isArray(found.data) ? found.data : [found.data];
  // An EDGAR filer that names its own LEI settles which record it is.
  let ranked = s.lei || s.number ? records : rankRecords(s.name, records);
  const exact = (want: string, r: LeiRecord | undefined): boolean =>
    !!r && nameScore(nameTokens(want), nameTokens(r.attributes.entity.legalName.name)) >= 1;
  if (!s.lei && !s.number && !exact(s.name, ranked[0]) && !(us?.lei && records.some((r) => r.id === us.lei))) {
    // "Siemens AG" found Siemens Energy AG and its siblings, none of them the company; the register names it
    // "Siemens Aktiengesellschaft" (2026-11-08). "Robert Bosch GmbH" found Robert Bosch Krankenhaus GmbH. The
    // long forms are searched when the short one finds no record of exactly that name, and an exact one wins.
    const longs = await Promise.all(longForms(s.name).map((n) =>
      gleif(`lei-records?filter%5Bentity.legalName%5D=${encodeURIComponent(n.slice(0, 120))}${country}&page%5Bsize%5D=15`)
        .then((j) => ({ n, list: rankRecords(n, ((j as { data?: LeiRecord[] } | null)?.data ?? [])) }))
        .catch(() => ({ n, list: [] as LeiRecord[] }))));
    const hit = longs.find((l) => exact(l.n, l.list[0])) ?? (ranked.length ? undefined : longs.find((l) => l.list.length));
    if (hit) ranked = [...hit.list, ...ranked.filter((r) => !hit.list.includes(r))];
  }
  const best = (us?.lei && records.find((r) => r.id === us.lei)) || ranked[0];
  if (!best) {
    if (us) {
      return { ...base, verdict: "found", confidence: 0.75, legal_name: us.name, us_filer: us, sources: [us.source_url],
        reason: `${us.name} is an SEC registrant incorporated in ${us.state_of_incorporation ?? "a state not stated"}, CIK ${us.cik}, ` +
          `business address ${us.business_address ?? "not stated"}. No LEI record was found for it in the GLEIF register, so its company number and register status were not read. Directors and beneficial owners are not in these sources.` };
    }
    return { ...base, verdict: "not_found", confidence: 0.6,
      reason: `No register record matching ${subject} was found in the GLEIF LEI register${s.country ? ` for ${s.country}` : ""}. Only legal entities that hold an LEI are covered, so this is not proof that no such company exists.` };
  }
  const e = best.attributes.entity;
  const [form, register, direct, ultimate] = await Promise.all([
    e.legalForm?.id === "8888" ? Promise.resolve(e.legalForm.other ?? null) : codeName("entity-legal-forms", e.legalForm?.id),
    codeName("registration-authorities", e.registeredAt?.id),
    parent(best.id, "direct-parent"),
    parent(best.id, "ultimate-parent"),
  ]);
  const registered = addressText(e.legalAddress);
  const agent = (e.legalAddress.addressLines ?? []).find((l) => /\bc\/o\b|registered agent|corporation service|ct corporation/i.test(l)) ?? null;
  const incorporated = e.creationDate?.slice(0, 10) ?? null;
  const status = e.status === "ACTIVE" ? "active" : "inactive";
  const lead = `${e.legalName.name} is ${status}` +
    `${e.registeredAs ? `, registered${register ? ` with ${register}` : ""} under company number ${e.registeredAs}` : ""}` +
    `${e.jurisdiction ? ` in ${e.jurisdiction}` : ""}${incorporated ? `, incorporated ${incorporated}` : ""}.`;
  const parents = direct || ultimate
    ? ` Its ${direct ? `direct parent is ${direct.name}` : ""}${direct && ultimate && ultimate.lei !== direct.lei ? ` and its ultimate parent is ${ultimate.name}` : !direct && ultimate ? `ultimate parent is ${ultimate.name}` : ""}.`
    : " GLEIF records no parent for it.";
  const usLine = us ? ` SEC EDGAR lists it as incorporated in ${us.state_of_incorporation ?? "a state not stated"}, industry ${us.sic_description ?? "not stated"}` +
    `${us.former_names[0] ? `, formerly ${us.former_names[0].name}` : ""}.` : "";
  // A question that asks for the address, agent or state of incorporation gets that
  // first; the status sentence used to come first and the address only third
  // (audit replay 2026-11-04 row 149, Tesla).
  const asked = askedSentence(question, e.legalName.name, registered, agent, e.jurisdiction ?? null, us?.state_of_incorporation ?? null);
  return {
    ...base, verdict: "found", confidence: 0.92,
    legal_name: e.legalName.name, lei: best.id, entity_status: e.status, lei_registration_status: best.attributes.registration.status,
    jurisdiction: e.jurisdiction ?? null, legal_form: form, company_number: e.registeredAs ?? null, register,
    registered_address: registered, registered_agent: agent, headquarters_address: addressText(e.headquartersAddress), incorporated,
    other_names: (e.otherNames ?? []).map((o) => o.name), direct_parent: direct, ultimate_parent: ultimate, us_filer: us,
    other_candidates: ranked.filter((r) => r !== best).slice(0, 3).map((r) => ({
      name: r.attributes.entity.legalName.name, lei: r.id, jurisdiction: r.attributes.entity.jurisdiction ?? null, status: r.attributes.entity.status,
    })),
    sources: [`https://search.gleif.org/#/record/${best.id}`, ...(us ? [us.source_url] : [])],
    reason: `${asked}${lead} Registered address: ${registered ?? "not stated"}${form ? `; legal form ${form}` : ""}; LEI ${best.id} (${best.attributes.registration.status.toLowerCase()}).` +
      `${parents}${usLine} Directors and beneficial owners are not in these sources.`,
  };
}
