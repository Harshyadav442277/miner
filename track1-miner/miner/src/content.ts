/**
 * Structured extraction from text supplied inline in the question.
 *
 * CONTENT_EXTRACTION questions carry their payload in the question itself, e.g.
 * "Extract the contact details from: ...". The one registered miner for this
 * intent is a URL extractor and scores 0.000 on every one of them, because there
 * is no URL to fetch. These are deterministic pattern extractions — no model
 * needed, and a wrong answer is checkable.
 */

export type Want =
  | "quantities"
  | "contact"
  | "entities"
  | "actions"
  | "date_event"
  | "numeric"
  | "generic";

export interface Extraction {
  want: Want;
  source: string;
  fields: Record<string, string[]>;
  summary: string;
}

/** The payload, which questions put in quotes after a colon. */
export function quotedPayload(text: string): string {
  const s = String(text ?? "");
  const curly = s.match(/[\u201c\u2018"']([^\u201d\u2019"']{8,})[\u201d\u2019"']/);
  if (curly?.[1]) return curly[1].trim().replace(/\s+/g, " ");
  const colon = s.match(/:\s*(.+)$/s);
  return (colon?.[1] ?? s).trim().replace(/\s+/g, " ");
}

/** What the instruction asks for. */
export function wantedFrom(text: string): Want {
  const s = String(text ?? "").toLowerCase();
  if (/\bquantit|\bunits?\b|\bmeasure/.test(s)) return "quantities";
  if (/\bcontact|\bemail|\bphone|\btelephone/.test(s)) return "contact";
  if (/\bentit|\bpeople\b|\bplaces?\b|\borganizations?\b/.test(s)) return "entities";
  if (/\baction items?\b|\btasks?\b|\btodo|\bto-do/.test(s)) return "actions";
  if (/\bdate\b|\bevent\b/.test(s)) return "date_event";
  if (/\bnumeric|\bnumbers?\b|\bfigures?\b|\bmetrics?\b|\bvalues?\b/.test(s)) return "numeric";
  return "generic";
}

const UNITS =
  "cups?|teaspoons?|tablespoons?|tsp|tbsp|grams?|kilograms?|kg|g|ounces?|oz|pounds?|lbs?|" +
  "litres?|liters?|millilitres?|milliliters?|ml|l|metres?|meters?|m|kilometres?|kilometers?|km|" +
  "miles?|feet|foot|inches|inch|hours?|minutes?|seconds?|days?|weeks?|months?|years?|degrees?";

function quantities(s: string): string[] {
  const out: string[] = [];
  // String.raw, not a plain string: in "\b(\d+" the escapes are a backspace
  // character and a literal "d". This file has been bitten by that twice.
  const re = new RegExp(
    String.raw`\b(\d+(?:[.,]\d+)?)\s+(` + UNITS + String.raw`)\b(?:\s+of\s+([a-z][a-z\s-]{0,24}?))?(?=[,.;]|\s+and\b|$)`,
    "gi",
  );
  for (const m of s.matchAll(re)) {
    out.push(m[3] ? `${m[1]} ${m[2]} of ${m[3].trim()}` : `${m[1]} ${m[2]}`);
  }
  return out;
}

function emails(s: string): string[] {
  return [...s.matchAll(/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g)].map((m) => m[0]);
}

function phones(s: string): string[] {
  return [...s.matchAll(/(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3}[\s-]\d{4}\b/g)]
    .map((m) => m[0].trim())
    .filter((x) => x.replace(/\D/g, "").length >= 7);
}

function urls(s: string): string[] {
  return [...s.matchAll(/\bhttps?:\/\/[^\s"'<>]+/gi)].map((m) => m[0]);
}

/** Capitalised runs, minus common sentence openers. */
function properNouns(s: string): string[] {
  // Month and weekday names are time expressions, not places — "held in March,
  // Berlin" listed March as a location.
  const stop = new Set([
    "the", "a", "an", "please", "reach", "revenue", "extract", "we", "our", "this", "that", "in",
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  ]);
  const out: string[] = [];
  for (const m of s.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g)) {
    const v = m[1]!;
    if (!stop.has(v.toLowerCase())) out.push(v);
  }
  return [...new Set(out)];
}

const ORG_HINT = /\b(?:inc|corp|ltd|llc|plc|company|apple|google|microsoft|amazon|meta|tesla)\b/i;

function entities(s: string): { people: string[]; orgs: string[]; places: string[] } {
  const people: string[] = [];
  const orgs: string[] = [];
  const places: string[] = [];

  // "Tim Cook, CEO of Apple" — one pass over the sentence, no per-name regex
  // construction. Building a RegExp from a string needs escaped backslashes and
  // that has broken this file twice; regex literals do not.
  const roleRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,\s*[^,]{0,40}\b(?:CEO|CTO|CFO|COO|President|Director|Founder|Chair|Head)\b[^,]{0,20}\s+of\s+([A-Z][A-Za-z]+)/gi;
  for (const m of s.matchAll(roleRe)) {
    if (m[1]) people.push(m[1]);
    if (m[2]) orgs.push(m[2]);
  }

  for (const n of properNouns(s)) {
    if (people.includes(n) || orgs.includes(n)) continue;
    if (ORG_HINT.test(n)) { orgs.push(n); continue; }
    if (/\s/.test(n)) { people.push(n); continue; }
    places.push(n);
  }

  const uniq = (a: string[]): string[] => [...new Set(a)];
  const p = uniq(people);
  const o = uniq(orgs).filter((x) => !p.includes(x));
  return { people: p, orgs: o, places: uniq(places).filter((x) => !p.includes(x) && !o.includes(x)) };
}

function actions(s: string): string[] {
  return s
    .split(/\band\b|[;.]/i)
    .map((c) => c.trim().replace(/^please\s+/i, ""))
    .filter((c) => c.length > 3 && /^[a-z]+\b/i.test(c))
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .slice(0, 6);
}

const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december";

function dates(s: string): string[] {
  const out: string[] = [];
  const re = new RegExp(String.raw`\b(` + MONTHS + String.raw`)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?`, "gi");
  for (const m of s.matchAll(re)) {
    const month = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1).toLowerCase();
    out.push(m[3] ? `${month} ${m[2]}, ${m[3]}` : `${month} ${m[2]}`);
  }
  for (const m of s.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) out.push(m[1]!);
  return [...new Set(out)];
}

function numerics(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/\b\d+(?:\.\d+)?%/g)) out.push(m[0]);
  for (const m of s.matchAll(/[$\u00a3\u20ac]\s?\d+(?:[.,]\d+)?(?:\s*(?:million|billion|thousand))?/gi)) out.push(m[0].trim());
  for (const m of s.matchAll(/\bQ[1-4]\b/g)) out.push(m[0]);
  return [...new Set(out)];
}

export function extractContent(question: string): Extraction {
  const want = wantedFrom(question);
  const source = quotedPayload(question);
  const fields: Record<string, string[]> = {};
  let summary = "";

  if (want === "quantities") {
    const q = quantities(source);
    fields["quantities"] = q;
    summary = q.length ? `${q.join(", ")}.` : "No quantities or units were found in the supplied text.";
  } else if (want === "contact") {
    const e = emails(source), p = phones(source), u = urls(source);
    fields["emails"] = e; fields["phones"] = p; fields["urls"] = u;
    const bits: string[] = [];
    if (e.length) bits.push(`Email: ${e.join(", ")}.`);
    if (p.length) bits.push(`Phone number: ${p.join(", ")}.`);
    if (u.length) bits.push(`URL: ${u.join(", ")}.`);
    summary = bits.length ? bits.join(" ") : "No contact details were found in the supplied text.";
  } else if (want === "entities") {
    const { people, orgs, places } = entities(source);
    fields["people"] = people; fields["organizations"] = orgs; fields["places"] = places;
    const bits: string[] = [];
    if (people.length) bits.push(`Person: ${people.join(", ")}.`);
    if (orgs.length) bits.push(`Organization: ${orgs.join(", ")}.`);
    if (places.length) bits.push(`Place: ${places.join(", ")}.`);
    summary = bits.length ? bits.join(" ") : "No named entities were found in the supplied text.";
  } else if (want === "actions") {
    const a = actions(source);
    fields["actions"] = a;
    summary = a.length
      ? a.map((x, i) => `${i + 1}) ${x.replace(/\.$/, "")}.`).join(" ")
      : "No action items were found in the supplied text.";
  } else if (want === "date_event") {
    const d = dates(source);
    const { places } = entities(source);
    const ev = source.match(/\b(conference|meeting|summit|workshop|webinar|launch|event|call)\b/i)?.[1];
    fields["dates"] = d; fields["events"] = ev ? [ev] : []; fields["places"] = places;
    const bits: string[] = [];
    if (d.length) bits.push(`Date: ${d.join(", ")}.`);
    if (ev) bits.push(`Event: a ${ev.toLowerCase()}${places.length ? ` held in ${places.join(", ")}` : ""}.`);
    summary = bits.length ? bits.join(" ") : "No date or event was found in the supplied text.";
  } else if (want === "numeric") {
    const n = numerics(source);
    fields["values"] = n;
    summary = n.length ? `${n.join(", ")}.` : "No numeric values were found in the supplied text.";
  } else {
    const all = [...emails(source), ...phones(source), ...numerics(source), ...dates(source)];
    fields["values"] = all;
    summary = all.length
      ? `Extracted from the supplied text: ${all.join(", ")}.`
      : "No structured values could be extracted from the supplied text.";
  }

  return { want, source, fields, summary };
}
