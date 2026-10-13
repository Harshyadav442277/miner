/**
 * SANCTIONS_SCREENING_MATCH: is this person, company or wallet on a sanctions
 * list, including near-matches on spelling or transliteration?
 *
 * Every name and alias on the OFAC SDN and UN Security Council lists
 * (sanctions-lists.ts) is scored against the subject with Jaro-Winkler per
 * word, so word order, a missing middle name and a transliterated spelling
 * ("Petrof" for "Petrov") still score high. A birth year in the question is
 * checked against the listed ones. The answer names every list screened and
 * its edition, and the lists that were not.
 */
import { sanctionsLists, type Edition, type ListedParty, type SanctionsLists } from "./sanctions-lists";

const MATCH = 0.95;
// "Ivan Petrov" reached 0.887 against "IVANOV, Victor Petrovich" through the
// prefix bonus; 0.90 keeps it out and keeps "Viktor But" for Bout (0.914).
const POSSIBLE = 0.9;
const NOT_SCREENED = ["EU consolidated financial sanctions list", "UK HMT consolidated list"];

/** Legal forms and honorifics: they say what a party is, not which one. */
const NOISE = new Set(["mr", "mrs", "ms", "dr", "the", "ltd", "llc", "inc", "co", "corp", "company", "limited", "plc",
  "jsc", "pjsc", "ojsc", "ooo", "oao", "zao", "gmbh", "ag", "sa", "srl", "bv", "llp", "lp", "fzc", "fze", "of", "and"]);

export function nameTokens(s: string): string[] {
  const words = String(s ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean).map((t) => t.slice(0, 40));
  // "S.A." arrives as "s" "a": joined, it is a legal form and goes; initials stay.
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    let j = i;
    while (j < words.length && words[j]!.length === 1) j++;
    if (j - i > 1 && NOISE.has(words.slice(i, j).join(""))) { i = j - 1; continue; }
    if (!NOISE.has(words[i]!)) out.push(words[i]!);
  }
  return out;
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array<boolean>(a.length).fill(false);
  const bm = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (bm[j] || a[i] !== b[j]) continue;
      am[i] = bm[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  for (let i = 0, k = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * How closely a listed name matches the subject, 0–1. Every subject word must
 * find a close listed word; a listed name with extra words (a patronymic, a
 * middle name) scores a little lower, and a one-word subject cannot reach a
 * possible match against a longer name on its own.
 */
export function nameScore(subject: string[], listed: string[]): number {
  if (!subject.length || !listed.length) return 0;
  let sum = 0;
  for (const s of subject) {
    let best = 0;
    for (const l of listed) {
      const v = s.length === 1 ? (l.startsWith(s) ? 0.9 : 0) : jaroWinkler(s, l);
      if (v > best) best = v;
    }
    if (best < 0.85) return 0;
    sum += best;
  }
  const score = (sum / subject.length) * (0.85 + 0.15 * Math.min(1, subject.length / listed.length));
  return subject.length === 1 && listed.length > 1 ? Math.min(score, 0.85) : score;
}

export interface Subject { name: string; dob_year: number | null; kind: "individual" | "entity" | null; wallet: string | null }

const WALLET = /\b(0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[a-km-zA-HJ-NP-Z1-9]{33})\b/;

/** What to screen, read from the declared name and the question. */
export function screeningSubject(question: string, nameParam = ""): Subject {
  // Bounded before any pattern runs: the extraction regexes backtrack.
  const q = String(question ?? "").slice(0, 500);
  nameParam = String(nameParam ?? "").slice(0, 200);
  const wallet = (nameParam.match(WALLET) ?? q.match(WALLET))?.[1] ?? null;
  const quoted = q.match(/['"‘“]([^'"’”]{3,120})['"’”]/)?.[1] ?? "";
  let name = nameParam.trim() || quoted.split(",")[0]!.trim();
  if (!name) {
    const m =
      q.match(/\b(?:screen|check|search|look\s+up|run)\s+(?:the\s+)?(?:name\s+|person\s+|company\s+|entity\s+|individual\s+)?(.+?)\s+(?:against|on|in|through|for)\b/i) ??
      q.match(/\b(?:is|are|was|does)\s+(.+?)\s+(?:on|in|listed|sanctioned|subject\s+to|designated|appear)\b/i) ??
      q.match(/\bwhether\s+(.+?)\s+(?:is|appears|has\s+been)\b/i) ??
      q.match(/\bscreen\s+(?:the\s+)?(?:name\s+|person\s+|company\s+|entity\s+)?(.+?)\s*(?:[?.!]|$)/i);
    name = (m?.[1] ?? "").replace(/^(?:the|a|an)\s+/i, "").replace(/,.*$/, "").trim();
  }
  if (wallet && name.includes(wallet)) name = "";
  const dob = (q.match(/\b(?:DOB|born|date\s+of\s+birth)\D{0,15}?((?:19|20)\d{2})\b/i) ?? quoted.match(/\b((?:19|20)\d{2})\b/))?.[1];
  const kind = /\b(?:person|individual|man|woman|mr|mrs|ms|national|citizen)\b/i.test(q) ? "individual"
    : /\b(?:company|entity|corporation|firm|bank|organi[sz]ation|ltd|llc|inc|vessel)\b/i.test(q) ? "entity" : null;
  return { name, dob_year: dob ? Number(dob) : null, kind, wallet };
}

export interface Match {
  list: string; id: string; name: string; matched_name: string; type: string; programs: string[];
  score: number; dob_years: number[]; dob_check: "agrees" | "differs" | "not_given" | "not_listed";
  nationalities: string[]; listed_on: string | null; url: string | null;
}

export interface SanctionsResult {
  subject: string | null;
  subject_type: string | null;
  dob_year: number | null;
  verdict: "match" | "possible_match" | "no_match" | "unknown";
  confidence: number;
  reason: string;
  error?: string;
  matches: Match[];
  closest: Match | null;
  lists_checked: Edition[];
  lists_not_checked: string[];
}

let index: { lists: SanctionsLists; tokens: string[][][] } | null = null;

/** The scored candidates, best first. Pure given the lists. */
export function screenParties(subject: Subject, lists: SanctionsLists): Match[] {
  if (index?.lists !== lists) index = { lists, tokens: lists.parties.map((p) => [p.name, ...p.aliases].map(nameTokens)) };
  // Eight words, forty characters each: a name, never a paragraph.
  const want = nameTokens(subject.name.slice(0, 120)).slice(0, 8);
  const out: Match[] = [];
  lists.parties.forEach((p: ListedParty, i) => {
    if (subject.kind === "individual" && p.type !== "individual") return;
    if (subject.kind === "entity" && p.type === "individual") return;
    let score = 0;
    let matched = p.name;
    index!.tokens[i]!.forEach((t, k) => {
      const v = nameScore(want, t);
      if (v > score) { score = v; matched = k === 0 ? p.name : p.aliases[k - 1]!; }
    });
    if (score < 0.8) return;
    const dob_check = subject.dob_year === null ? "not_given" : p.dob_years.length === 0 ? "not_listed"
      : p.dob_years.some((y) => Math.abs(y - subject.dob_year!) <= 1) ? "agrees" : "differs";
    out.push({
      list: p.list, id: p.id, name: p.name, matched_name: matched, type: p.type, programs: p.programs,
      score: Number(score.toFixed(3)), dob_years: p.dob_years, dob_check, nationalities: p.nationalities,
      listed_on: p.listed_on, url: p.url,
    });
  });
  return out.sort((a, b) => b.score - a.score || (a.dob_check === "differs" ? 1 : 0) - (b.dob_check === "differs" ? 1 : 0));
}

const describe = (m: Match): string =>
  `${m.name} on the ${m.list} list (${m.programs.join(", ") || "no programme stated"}, ${m.type}` +
  `${m.dob_years.length ? `, born ${m.dob_years.join(" or ")}` : ""}` +
  `${m.nationalities.length ? `, ${m.nationalities.slice(0, 2).join(" / ")}` : ""}, reference ${m.id})`;

const editionText = (e: Edition[]): string =>
  e.map((x) => `${x.list} (${x.published ? `${x.list.startsWith("OFAC") ? "published" : "generated"} ${x.published}, ` : ""}${x.entries.toLocaleString("en-US")} entries)`).join(" and ");

export async function screenSanctions(question: string, nameParam = ""): Promise<SanctionsResult> {
  const subject = screeningSubject(question, nameParam);
  const base = {
    subject: subject.wallet ?? (subject.name || null), subject_type: subject.wallet ? "wallet" : subject.kind,
    dob_year: subject.dob_year, matches: [] as Match[], closest: null, lists_checked: [] as Edition[],
    lists_not_checked: NOT_SCREENED,
  };
  if (!subject.wallet && nameTokens(subject.name).length === 0) {
    return { ...base, verdict: "unknown", confidence: 0, error: "no_subject",
      reason: "No person, company or wallet was named, so nothing was screened. Name the party, for example: Screen 'Ivan Petrov, DOB 1974' against the OFAC SDN list." };
  }
  const lists = await sanctionsLists();
  const checked = { ...base, lists_checked: lists.editions, lists_not_checked: [...lists.unavailable, ...NOT_SCREENED] };
  if (lists.parties.length === 0) {
    return { ...checked, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `${base.subject} could not be screened because neither the OFAC SDN list nor the UN Security Council list could be read. This is an availability problem, not a finding that the party is unlisted.` };
  }
  const partial = lists.unavailable.length ? ` The ${lists.unavailable.join(" and ")} list could not be read, so it was not screened.` : "";
  const screened = ` Screened against ${editionText(lists.editions)}, names and aliases; the EU and UK lists were not screened.${partial}`;

  if (subject.wallet) {
    const w = subject.wallet.toLowerCase();
    const hit = lists.parties.find((p) => p.wallets.some((x) => x.split(" ")[1]!.toLowerCase() === w));
    if (hit) {
      const m: Match = { list: hit.list, id: hit.id, name: hit.name, matched_name: subject.wallet, type: hit.type, programs: hit.programs,
        score: 1, dob_years: hit.dob_years, dob_check: "not_given", nationalities: hit.nationalities, listed_on: hit.listed_on, url: hit.url };
      return { ...checked, verdict: "match", confidence: 0.99, matches: [m], closest: m,
        reason: `Match: wallet ${subject.wallet} is listed by OFAC as a digital currency address of ${describe(m)}.${screened}` };
    }
    if (lists.unavailable.includes("OFAC SDN")) {
      return { ...checked, verdict: "unknown", confidence: 0, error: "list_unavailable",
        reason: `Not cleared: wallet ${subject.wallet} could not be screened, because the OFAC SDN list, the only one here that publishes wallet addresses, could not be read.${screened}` };
    }
    return { ...checked, verdict: "no_match", confidence: 0.85,
      reason: `No match: wallet ${subject.wallet} is not among the digital currency addresses on the OFAC SDN list. The UN list publishes no wallet addresses, and an unlisted wallet can still belong to a sanctioned party.${screened}` };
  }

  const all = screenParties(subject, lists);
  const matches = all.filter((m) => m.score >= POSSIBLE).slice(0, 5);
  const best = matches[0];
  const conf = (c: number): number => Number((lists.unavailable.length ? c * 0.6 : c).toFixed(2));
  if (best && best.score >= MATCH && best.dob_check !== "differs") {
    const dob = best.dob_check === "agrees" ? ` The birth year ${subject.dob_year} agrees with the listing.` : "";
    return { ...checked, verdict: "match", confidence: conf(Math.min(0.97, best.score)), matches, closest: best,
      reason: `Potential match: "${subject.name}" matches ${describe(best)}, score ${best.score}.${dob} A name match alone does not establish identity, so confirm it on further identifiers before acting.${screened}` };
  }
  if (best) {
    const why = best.dob_check === "differs" ? `, but its listed birth year ${best.dob_years.join(" or ")} differs from ${subject.dob_year}` : "";
    return { ...checked, verdict: "possible_match", confidence: conf(0.6), matches, closest: best,
      reason: `Possible match: "${subject.name}" is close to ${describe(best)}, score ${best.score}${why}. Review it before treating it as either a match or a clearance.${screened}` };
  }
  const near = all[0] ?? null;
  // Kim Jong Un is on the OFAC list and not the UN one: with OFAC unread, "no
  // match" on the UN list alone would have cleared him (measured 2026-10-13).
  if (lists.unavailable.length) {
    return { ...checked, verdict: "unknown", confidence: 0, error: "list_unavailable", matches: [], closest: near,
      reason: `Not cleared: "${subject.name}" does not closely match any entry on the ${lists.editions.map((e) => e.list).join(" or ")} list, but the ${lists.unavailable.join(" and ")} list could not be read, so this is not a clearance.${screened}` };
  }
  return { ...checked, verdict: "no_match", confidence: 0.85, matches: [], closest: near,
    reason: `No match: "${subject.name}" does not closely match any name or alias on these lists${near ? `; the closest was ${near.matched_name} (score ${near.score}), below the ${POSSIBLE} threshold for a possible match` : ""}.${screened}` };
}
