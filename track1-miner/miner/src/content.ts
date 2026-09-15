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
  // A lone "From:" or "Below:" is a field label of the payload itself
  // ("From: John Smith, Subject: …"), not an instruction.
  const isInstruction = pre.length > 0 && pre.length <= 90 && !/[.!?]\s/.test(pre) && INSTRUCTION.test(pre) &&
    !/^(?:from|following|below)$/i.test(pre);
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
  "cups?|teaspoons?|tablespoons?|tsp|tbsp|grams?|kilograms?|kg|g|mg|ounces?|oz|pounds?|lbs?|" +
  "litres?|liters?|millilitres?|milliliters?|ml|l|metres?|meters?|m|cm|mm|kilometres?|kilometers?|km/h|km|" +
  "miles?|feet|foot|inches|inch|hours?|minutes?|seconds?|days?|weeks?|months?|years?|degrees?|" +
  "gb|mb|tb|mph|kph";

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
  //
  // The number may be a fraction ("1/2 cup", "1 1/2 cups") and the unit may be
  // attached ("250ml", "2.5kg") or hyphenated ("16-inch"). Each used to be lost
  // or misread: "Add 1/2 cup milk, 250ml water and 2.5kg flour" extracted only
  // "2 cup" (rank-loss report F1). The lookbehind keeps "2 cup" from being read
  // out of "1/2 cup", and the unit's trailing boundary keeps "5 minutes" from
  // matching "5 m". The surface form is kept, so "250ml" stays "250ml".
  const re = new RegExp(
    String.raw`(?<![\d/.,])(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\/\d+)?)(\s+|-)?(` + UNITS + String.raw`)(?![a-z])(?:\s+of\s+([a-z][a-z\s-]{0,24}?)(?=[,.;]|\s+and\b|$))?`,
    "gi",
  );
  for (const m of s.matchAll(re)) {
    const sep = m[2] === undefined ? "" : m[2].trim() === "-" ? "-" : " ";
    const q = `${m[1]}${sep}${m[3]}`;
    out.push(m[4] ? `${q} of ${m[4].trim()}` : q);
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
  return properNounSpans(s).map((x) => x.text).filter((v) => !stop.has(v.toLowerCase()))
    .filter((v, i, a) => a.indexOf(v) === i);
}

/**
 * Capitalised runs with the word before each. A token may carry inner capitals
 * or digits ("OpenAI", "iPhone" excepted), and a run followed directly by a colon
 * is a field label ("Date:", "Total:"), not a name — the receipt "Acme Store.
 * Date: 2026-09-14. Total: $42.50." listed Date and Total as places (report F1).
 */
function properNounSpans(s: string): Array<{ text: string; before: string; start: boolean }> {
  const out: Array<{ text: string; before: string; start: boolean }> = [];
  const re = /\b([A-Z][A-Za-z0-9&'-]*[A-Za-z0-9]|[A-Z])(?:\s+(?:[A-Z][A-Za-z0-9&'-]*[A-Za-z0-9]))*\b(?!\s*:)/g;
  for (const m of s.matchAll(re)) {
    const text = m[0];
    if (text.length < 2) continue;
    const head = s.slice(0, m.index);
    const before = head.match(/([A-Za-z]+)\s*$/)?.[1]?.toLowerCase() ?? "";
    const start = /(?:^|[.!?:"“]\s*)$/.test(head);
    out.push({ text, before, start });
  }
  return out;
}

const ORG_HINT = /\b(?:inc|corp|corporation|ltd|llc|plc|company|co|group|bank|university|institute|foundation|labs?|technologies|systems|store|shop|market|restaurant|cafe|hotel|airlines?|apple|google|microsoft|amazon|meta|tesla|nvidia|openai|ibm|netflix|samsung|intel)\b/i;
const PLACE_HINT = /\b(?:city|county|state|province|street|avenue|road|river|lake|mountains?|island|valley|bay|park|airport|square)\b/i;
/** Common places a capitalisation rule cannot tell from a person's name. */
const PLACES = new Set(("new york|london|paris|berlin|tokyo|beijing|shanghai|delhi|new delhi|mumbai|bangalore|singapore|sydney|" +
  "toronto|chicago|boston|seattle|austin|san francisco|los angeles|washington|cupertino|palo alto|mountain view|" +
  "silicon valley|hong kong|dubai|moscow|madrid|rome|amsterdam|dublin|zurich|geneva|seoul|lagos|nairobi|cairo|" +
  "california|texas|florida|india|china|japan|germany|france|italy|spain|canada|brazil|mexico|australia|" +
  "united states|united kingdom|uk|usa|us|europe|asia|africa").split("|"));
const PLACE_PREP = new Set(["in", "near", "from", "across", "to", "into", "outside", "around", "throughout", "visited"]);
const ORG_PREP = new Set(["for", "joined", "by", "with", "founded", "acquired", "partnered"]);

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

  // A multiword name used to be a person unconditionally, so "Alice Johnson works
  // for OpenAI in New York" listed New York as a person and missed OpenAI, whose
  // inner capital the old token pattern could not read (report F1). The word
  // before a name and a short gazetteer now decide first.
  const named = new Set(properNouns(s));
  for (const { text: n, before, start } of properNounSpans(s)) {
    if (!named.has(n) || people.includes(n) || orgs.includes(n) || places.includes(n)) continue;
    const lower = n.toLowerCase();
    if (PLACES.has(lower) || PLACE_HINT.test(n)) { places.push(n); continue; }
    if (ORG_HINT.test(n) || /^[A-Z][a-z]+[A-Z]/.test(n) || /^[A-Z]{2,5}$/.test(n) || ORG_PREP.has(before)) { orgs.push(n); continue; }
    if (PLACE_PREP.has(before) || before === "at" && !/\s/.test(n)) { places.push(n); continue; }
    if (/\s/.test(n) || /^(?:mr|mrs|ms|dr|prof|sir)$/.test(before)) { people.push(n); continue; }
    // A lone capitalised word opening a sentence is its first word, not a place.
    if (start) { people.push(n); continue; }
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

/**
 * "Label: value" pairs, and whatever precedes the first label.
 *
 * "From: John Smith, Subject: Quarterly Budget Review Meeting." extracted nothing
 * at all, and a receipt's "Total: $42.50" was never read (report F1). A label is
 * one to three words starting with a capital, at the start of the text or after
 * punctuation, so "https://" and "10:30" are not labels.
 */
export function labeledPairs(s: string): { lead: string; pairs: Array<[string, string]> } {
  const marks = [...s.matchAll(/(^|[.,;!?\n]\s*)([A-Z][A-Za-z]*(?:[ -][A-Za-z#]+){0,2}):\s*(?!\/\/)/g)]
    .map((m) => ({ label: m[2]!, start: m.index! + m[1]!.length, end: m.index! + m[0].length }));
  const pairs: Array<[string, string]> = [];
  marks.forEach((m, i) => {
    const value = s.slice(m.end, marks[i + 1]?.start ?? s.length).replace(/[\s,.;]+$/, "").trim();
    if (value) pairs.push([m.label, value]);
  });
  const lead = marks.length ? s.slice(0, marks[0]!.start).replace(/[\s,.;:]+$/, "").trim() : "";
  return { lead, pairs };
}

const GENERIC_FIELD = /^(?:[\w-]+\s+){0,2}(?:details?|info(?:rmation)?|data|fields?|values?|items?|entities|everything|content|text|specifications?|specs|attributes|features|key\s+points)$/i;
const KIND_WORDS = /\bquantit|\bunits?\b|\bmeasure|\bcontact|\bemail|\bphone|\btelephone|\bentit|\bpeople\b|\bplaces?\b|\borganizations?\b|\baction items?\b|\btasks?\b|\btodo|\bto-do|\bnumeric|\bnumbers?\b|\bfigures?\b|\bmetrics?\b|\bvalues?\b|\bdates?\b|\bevents?\b/i;

/**
 * The fields an instruction names when they are not one of the categories above:
 * "Extract merchant name, date and total amount from this receipt" asks for a
 * merchant and a total, and used to be answered with the date alone (report F1).
 * Empty when every named field is a category, or nothing specific is named.
 */
export function requestedFields(instruction: string): string[] {
  const m = String(instruction ?? "").match(/\b(?:extract|pull(?:\s+out)?|get|find|identify|list|give(?:\s+me)?|return|parse|what\s+(?:is|are))\s+(?:out\s+)?(.+?)\s+(?:from|in|out\s+of|contained\s+in)\b/i);
  if (!m?.[1]) return [];
  const names = m[1].replace(/\([^)]*\)/g, " ")
    .split(/\s*,\s*(?:and\s+)?|\s+and\s+|\s*;\s*|\s*&\s*/i)
    .map((n) => n.trim().replace(/^(?:the|its|their|a|an)\s+/i, "").trim())
    .filter((n) => n && n.split(/\s+/).length <= 4 && !GENERIC_FIELD.test(n));
  return names.some((n) => !KIND_WORDS.test(n)) ? names : [];
}

const FIELD_SYNONYMS: Array<[RegExp, RegExp]> = [
  [/\bsender\b|\bauthor\b/i, /\bfrom\b|\bsender\b|\bauthor\b/i],
  [/\brecipient\b/i, /\bto\b|\brecipient\b/i],
  [/\btotal\b|\bamount\b|\bbalance\b|\bsum\b/i, /\btotal\b|\bamount\b|\bbalance\b|\bsum\b|\bdue\b/i],
  [/\bprice\b|\bcost\b/i, /\bprice\b|\bcost\b/i],
  [/\bdate\b/i, /\bdate\b|\bdated\b|\bissued\b/i],
  [/\bsubject\b|\btitle\b/i, /\bsubject\b|\btitle\b|\bre\b/i],
];

function fieldValue(name: string, source: string, pairs: Array<[string, string]>, lead: string): { label: string; value: string } | null {
  const words = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !/^(?:name|number)$/.test(w));
  const syn = FIELD_SYNONYMS.find(([asked]) => asked.test(name))?.[1];
  const pair = pairs.find(([l]) => (syn && syn.test(l)) || words.some((w) => l.toLowerCase().includes(w.slice(0, 4))));
  if (pair) return { label: pair[0], value: pair[1] };
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  if (/\bdate\b/i.test(name)) { const d = dates(source)[0]; return d ? { label, value: d } : null; }
  if (/\btotal\b|\bamount\b|\bprice\b|\bcost\b|\bbalance\b/i.test(name)) {
    const money = numerics(source).filter((v) => /[$£€]/.test(v));
    const v = /\btotal\b|\bbalance\b/i.test(name) ? money[money.length - 1] : money[0];
    return v ? { label, value: v } : null;
  }
  if (/\bemail\b/i.test(name)) { const v = emails(source)[0]; return v ? { label, value: v } : null; }
  if (/\bphone\b/i.test(name)) { const v = phones(source)[0]; return v ? { label, value: v } : null; }
  if (/\bmerchant\b|\bvendor\b|\bstore\b|\bseller\b|\bcompany\b|\bbusiness\b|\bshop\b/i.test(name)) {
    if (lead && lead.split(/\s+/).length <= 6) return { label, value: lead };
    const org = entities(source).orgs[0];
    return org ? { label, value: org } : null;
  }
  if (/\bsize\b|\bweight\b|\blength\b|\bduration\b|\bdisplay\b|\bscreen\b|\bstorage\b|\bmemory\b/i.test(name)) {
    const v = quantities(source)[0];
    return v ? { label, value: v } : null;
  }
  if (/\bname\b|\bperson\b|\bcustomer\b|\bcontact\b/i.test(name)) { const v = entities(source).people[0]; return v ? { label, value: v } : null; }
  return null;
}

/** Null when not one named field can be found, so the category sweep answers instead. */
function extractFields(names: string[], source: string): Extraction | null {
  const { lead, pairs } = labeledPairs(source);
  const hits = names.map((name) => fieldValue(name, source, pairs, lead));
  if (hits.every((h) => h === null)) return null;
  const fields: Record<string, string[]> = {};
  const bits: string[] = [];
  for (const [i, name] of names.entries()) {
    const hit = hits[i];
    fields[name.toLowerCase().replace(/\s+/g, "_")] = hit ? [hit.value] : [];
    bits.push(hit ? `${hit.label}: ${hit.value}.` : `${name.charAt(0).toUpperCase() + name.slice(1)}: not found in the supplied text.`);
  }
  return { want: "multiple", source, fields, summary: bits.join(" ") };
}

/** Imperative text is a list of action items even when no instruction says so. */
const IMPERATIVE = /^(?:please\s+)?(?:submit|schedule|send|call|email|review|prepare|book|update|finish|complete|remember\s+to|make\s+sure|don't\s+forget|do\s+not\s+forget|follow\s+up|set\s+up|arrange|confirm|share|upload|sign|pay|order|buy|fix|draft|write|organi[sz]e|plan|notify|remind|reply|respond|finali[sz]e|file|renew|cancel)\b/i;

export function extractContent(question: string, suppliedText?: string): Extraction {
  const source = suppliedText !== undefined ? suppliedText.trim().replace(/\s+/g, " ") : quotedPayload(question);
  // Only the instruction chooses extraction categories. The payload may itself
  // contain "email", "date", or "units" without requesting those fields.
  const instruction = suppliedText !== undefined ? question : question === source ? question
    : question.split(/\bfrom\b|:/i)[0] ?? question;
  // Named fields need the whole instruction ("... total amount from this receipt"),
  // and never the payload itself, which may read "Find the files in the drawer".
  const hasInstruction = suppliedText !== undefined ? Boolean(question.trim()) : question.trim() !== source;
  const named = hasInstruction ? requestedFields(question.split(/[:"“]/)[0] ?? "") : [];
  const byName = named.length ? extractFields(named, source) : null;
  if (byName) return byName;
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
    //
    // With no instruction the payload's own shape decides the answer's shape
    // (report F1, epochs 330-333): "From: John Smith, Subject: …" is answered
    // as its labelled fields, contact details under their labels as the recorded
    // ground truth words them, and imperative text as numbered action items —
    // "Please submit the report by Friday and schedule a follow-up call." sent as
    // bare text used to extract nothing and score 0.
    const { pairs } = labeledPairs(source);
    const e = emails(source), p = phones(source), u = urls(source);
    const bits: string[] = [];
    const taken: string[] = [];
    for (const [label, value] of pairs) { bits.push(`${label}: ${value}.`); taken.push(value); }
    const fresh = (v: string): boolean => !taken.some((t) => t.includes(v));
    if (e.filter(fresh).length) bits.push(`Email: ${e.filter(fresh).join(", ")}.`);
    if (p.filter(fresh).length) bits.push(`Phone number: ${p.filter(fresh).join(", ")}.`);
    if (u.filter(fresh).length) bits.push(`URL: ${u.filter(fresh).join(", ")}.`);
    const acts = !bits.length && IMPERATIVE.test(source) ? actions(source) : [];
    if (acts.length) bits.push(acts.map((x, i) => `${i + 1}) ${x.replace(/\.$/, "")}.`).join(" "));
    const rest = [...quantities(source), ...numerics(source), ...dates(source)]
      .filter((v, i, a) => a.indexOf(v) === i && fresh(v) && !acts.some((x) => x.includes(v)));
    const all = [...e, ...p, ...u, ...rest, ...pairs.map(([l, v]) => `${l}: ${v}`), ...acts];
    fields["values"] = all;
    if (rest.length) bits.push(bits.length ? `Also: ${rest.join(", ")}.` : `Extracted from the supplied text: ${rest.join(", ")}.`);
    summary = bits.length ? bits.join(" ") : "No structured values could be extracted from the supplied text.";
  }

  return { want, source, fields, summary };
}
