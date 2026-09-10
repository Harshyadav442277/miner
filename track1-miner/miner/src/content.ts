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
  | "multiple"
  | "generic";

export interface Extraction {
  want: Want;
  source: string;
  fields: Record<string, string[]>;
  summary: string;
}

/**
 * The payload, which questions put in quotes after a colon.
 *
 * Without quotes, the text after a colon is the payload ONLY when what precedes
 * the colon reads as an instruction ("Extract the contact details from:"). A
 * bare payload can carry its own colons \u2014 "Contact sales@acme.com or call
 * 415-555-0100. Docs: https://acme.com/pricing" \u2014 and taking everything after
 * the first one used to throw the email and the phone number away and report
 * them as not found (GAPS G69).
 */
const INSTRUCTION = /\b(?:extract|pull|find|identify|list|parse|get|give|return|summari[sz]e|from|following|below)\b/i;

export function quotedPayload(text: string): string {
  const s = String(text ?? "");
  const colon = s.match(/^([^:]*):\s*(.+)$/s);
  // An instruction clause is short and unbroken: "Extract the contact details
  // from:" qualifies, while "Extract … from the text. Contact … Docs:" does not,
  // because its first colon sits after a full sentence of payload.
  const pre = colon?.[1]?.trim() ?? "";
  const isInstruction = pre.length > 0 && pre.length <= 90 && !/[.!?]\s/.test(pre) && INSTRUCTION.test(pre);
  if (isInstruction && colon?.[2]) return unwrap(colon[2]);
  // Match a payload after an instruction, not a quoted field name inside it.
  const quoted = s.match(/\bfrom\s+(["'\u201c\u2018][\s\S]+)$/i);
  if (quoted?.[1]) return unwrap(quoted[1]);
  return s.trim().replace(/\s+/g, " ");
}

function unwrap(text: string): string {
  const s = text.trim();
  const pairs: Record<string, string> = { '"': '"', "'": "'", "\u201c": "\u201d", "\u2018": "\u2019" };
  const close = pairs[s[0] ?? ""];
  const last = close ? s.lastIndexOf(close) : -1;
  // Apostrophes inside the payload are data, not the closing quote.
  const payload = last > 0 && /^[.!?\s]*$/.test(s.slice(last + 1)) ? s.slice(1, last) : s;
  return payload.replace(/\s+/g, " ").trim();
}

function requestedKinds(instruction: string): Want[] {
  const matches: Array<[Want, RegExp]> = [
    ["quantities", /\bquantit|\bunits?\b|\bmeasure/i],
    ["contact", /\bcontact|\bemail|\bphone|\btelephone/i],
    ["entities", /\bentit|\bpeople\b|\bplaces?\b|\borganizations?\b/i],
    ["actions", /\baction items?\b|\btasks?\b|\btodo|\bto-do/i],
    ["date_event", /\bdates?\b|\bevents?\b/i],
    ["numeric", /\bnumeric|\bnumbers?\b|\bfigures?\b|\bmetrics?\b|\bvalues?\b/i],
  ];
  const kinds = matches.filter(([, re]) => re.test(instruction)).map(([kind]) => kind);
  // "Phone numbers" requests contact fields, not all numeric values as well.
  if (/\b(?:phone|telephone)\s+numbers?\b/i.test(instruction) && !/\bnumeric|\bfigures?|\bmetrics?|\bvalues?/i.test(instruction)) {
    return kinds.filter(k => k !== "numeric");
  }
  return kinds.length ? kinds : ["generic"];
}

/** What the instruction asks for. */
export function wantedFrom(text: string): Want {
  const s = String(text ?? "").toLowerCase();
  if (/\bquantit|\bunits?\b|\bmeasure/.test(s)) return "quantities";
  if (/\bcontact|\bemail|\bphone|\btelephone/.test(s)) return "contact";
  if (/\bentit|\bpeople\b|\bplaces?\b|\borganizations?\b/.test(s)) return "entities";
  if (/\baction items?\b|\btasks?\b|\btodo|\bto-do/.test(s)) return "actions";
  if (/\bdates?\b|\bevents?\b/.test(s)) return "date_event";
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
  // The terminator lookahead belongs to the "of <substance>" branch ALONE. It
  // used to sit after the whole pattern, where it also gated the plain
  // "<number> <unit>" case and silently dropped every quantity followed by a
  // descriptive word: "2.3 meters long", "5 km away", "3 hours later" all
  // failed, while "45 kilograms and ..." passed. Inside the optional group it
  // still stops "5 litres of water and oil" over-capturing, without rejecting
  // the base case.
  const re = new RegExp(
    String.raw`\b(\d+(?:[.,]\d+)?)\s+(` + UNITS + String.raw`)\b(?:\s+of\s+([a-z][a-z\s-]{0,24}?)(?=[,.;]|\s+and\b|$))?`,
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
  // The area code may be bare as well as parenthesised: "415-555-0100" used to
  // be reported as "555-0100" (found 2026-09-08 while fixing G69). The
  // lookbehind keeps a longer digit run from being read from its middle.
  return [...s.matchAll(/(?<![\d-])(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?|\d{3}[\s-])?\d{3}[\s-]\d{4}\b/g)]
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
  const cap = (m: string): string => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
  // "12 March 2026" first. The month-day pattern below used to read it as
  // "March 20" — its day slot swallowed the first two digits of the year — so an
  // invoice "dated 12 March 2026 … due 30 April 2026" was reported as "March 20,
  // April 20" (GAPS G69). Day-month-year is answered in the same "Month D, YYYY"
  // form as the recorded ground truths, and its span is masked so the
  // month-day pattern cannot re-read it.
  const dmy = new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(` + MONTHS + String.raw`)(?:,?\s+(\d{4}))?\b`, "gi");
  const masked = s.replace(dmy, (whole, d: string, mon: string, y?: string) => {
    out.push(y ? `${cap(mon)} ${d}, ${y}` : `${cap(mon)} ${d}`);
    return " ".repeat(whole.length);
  });
  const re = new RegExp(String.raw`\b(` + MONTHS + String.raw`)\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,\s*(\d{4}))?`, "gi");
  for (const m of masked.matchAll(re)) {
    out.push(m[3] ? `${cap(m[1]!)} ${m[2]}, ${m[3]}` : `${cap(m[1]!)} ${m[2]}`);
  }
  for (const m of masked.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) out.push(m[1]!);
  return [...new Set(out)];
}

function numerics(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/\b\d+(?:\.\d+)?%/g)) out.push(m[0]);
  for (const m of s.matchAll(/[$\u00a3\u20ac]\s?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:\s*(?:million|billion|thousand))?/gi)) out.push(m[0].trim());
  for (const m of s.matchAll(/\bQ[1-4]\b/g)) out.push(m[0]);
  return [...new Set(out)];
}

export function extractContent(question: string, suppliedText?: string): Extraction {
  const source = suppliedText !== undefined ? suppliedText.trim().replace(/\s+/g, " ") : quotedPayload(question);
  // Only the instruction chooses extraction categories. The payload may itself
  // contain "email", "date", or "units" without requesting those fields.
  const instruction = suppliedText !== undefined ? question : question === source ? question
    : question.split(/\bfrom\b|:/i)[0] ?? question;
  const kinds = requestedKinds(instruction);
  const results = kinds.map(want => extractForKind(want, source));
  if (results.length === 1) return results[0]!;
  const fields: Record<string, string[]> = {};
  for (const result of results) {
    for (const [key, values] of Object.entries(result.fields)) fields[key] = [...new Set([...(fields[key] ?? []), ...values])];
  }
  return { want: "multiple", source, fields, summary: results.map(r => r.summary).join(" ") };
}

function extractForKind(want: Want, source: string): Extraction {
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
    // Quantities belong in the generic sweep too. `text` is the REQUIRED
    // parameter and `query` only optional, so the engine can legitimately send
    // the payload with no instruction naming what to pull out — and this branch
    // is what answers then. Without quantities here, "The shipment weighs 45
    // kilograms and is 2.3 meters long" extracted nothing at all and scored 0,
    // because `numerics` deliberately reads only percentages, currency and
    // quarters, treating bare numbers as noise.
    const all = [
      ...emails(source), ...phones(source), ...quantities(source),
      ...numerics(source), ...dates(source),
    ];
    fields["values"] = all;
    summary = all.length
      ? `Extracted from the supplied text: ${all.join(", ")}.`
      : "No structured values could be extracted from the supplied text.";
  }

  return { want, source, fields, summary };
}
