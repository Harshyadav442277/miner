#!/usr/bin/env node
/**
 * Regenerates miner/src/places-data.ts: the built-in table of large cities that lets the weather
 * routes skip Nominatim for the places people actually ask about (GAPS G196).
 *
 * Source: Wikidata, CC0, so the table carries no attribution duty. Not Nominatim: its usage policy
 * forbids "searching for complete lists of postcodes, towns etc." (read 2026-10-20), so the table is
 * never checked against it in bulk.
 *
 * A bare name ("Valencia") is answered from the table only when the entry dominates every other place
 * Wikidata knows by that English name: at least 5x the population of any homonym more than 50 km away.
 * Otherwise the name needs a qualifier ("Valencia, Spain") and a bare question still goes to Nominatim.
 *
 *   node track1-miner/tools/build-places.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../miner/src/places-data.ts");
const UA = "livecert-telegraph-miner/1.0 (+https://github.com/Harshyadav442277/miner)";
const MIN_POP = 300_000;
const CAPITAL_MIN_POP = 100_000;
const DOMINANCE = 5;
const SAME_PLACE_KM = 50;

async function sparql(query, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    // Wikidata's own limit is 60 s; a request with no answer by 90 s is hung, not slow.
    const res = await fetch("https://query.wikidata.org/sparql", {
      signal: AbortSignal.timeout(90_000),
      method: "POST",
      headers: { "user-agent": UA, accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ query }),
    });
    if (res.ok) return (await res.json()).results.bindings;
    const wait = Number(res.headers.get("retry-after")) || 30;
    console.error(`wikidata ${res.status}; retrying in ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  throw new Error("wikidata did not answer");
}

const qid = (uri) => uri.split("/").pop();
const point = (wkt) => {
  const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(wkt);
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
};
function km(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Wikidata's own labels for a few states read oddly in an answer.
const COUNTRY_NAME = {
  CN: "China", NL: "Netherlands", US: "United States", GB: "United Kingdom", KR: "South Korea",
  KP: "North Korea", TW: "Taiwan", CD: "Democratic Republic of the Congo", CG: "Republic of the Congo",
  GM: "Gambia", BS: "Bahamas", PS: "Palestine", VA: "Vatican City", FM: "Micronesia",
};

const SELECT = `SELECT ?city ?cityLabel ?iso2 ?countryLabel (MAX(?p) AS ?pop) (SAMPLE(?c) AS ?coord) WHERE {`;
const TAIL = `
  ?city wdt:P625 ?c ; wdt:P17 ?country .
  ?country wdt:P297 ?iso2 .
  FILTER NOT EXISTS { ?city wdt:P576 ?dissolved }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?city ?cityLabel ?iso2 ?countryLabel`;

// Cities by class, and settlements whose class does not reach "city" (Miami is a "city in the United
// States", Valencia a "municipality of Spain"). With the label and grouping tail attached, a per-type
// query timed out on every attempt on 2026-10-21; the bare id query answers in about a second, so
// types return ids only and their details come from one VALUES lookup.
const byClass = await sparql(`${SELECT}
  ?city wdt:P1082 ?p . FILTER(?p >= ${MIN_POP})
  ?city wdt:P31/wdt:P279* wd:Q515 .${TAIL}`);
const typeIds = new Set();
for (const t of ["Q1093829", "Q2074737", "Q747074", "Q484170", "Q42744322", "Q262166", "Q1549591",
  "Q200250", "Q1637706", "Q5119", "Q748149", "Q3184121", "Q1059478"]) {
  const rows = await sparql(`SELECT DISTINCT ?city WHERE { ?city wdt:P31 wd:${t} ; wdt:P1082 ?p . FILTER(?p >= ${MIN_POP}) }`);
  for (const r of rows) typeIds.add(qid(r.city.value));
}
for (const r of byClass) typeIds.delete(qid(r.city.value));
const byType = [];
const extra = [...typeIds];
for (let i = 0; i < extra.length; i += 400) {
  byType.push(...(await sparql(`${SELECT}
  VALUES ?city { ${extra.slice(i, i + 400).map((x) => `wd:${x}`).join(" ")} }
  ?city wdt:P1082 ?p .${TAIL}`)));
}
const capitals = await sparql(`${SELECT}
  ?country wdt:P36 ?city . OPTIONAL { ?city wdt:P1082 ?p }${TAIL}`);

const capitalIds = new Set(capitals.map((r) => qid(r.city.value)));
const cities = new Map();
for (const r of [...byClass, ...byType, ...capitals]) {
  const id = qid(r.city.value);
  const at = point(r.coord?.value ?? "");
  const name = r.cityLabel.value;
  if (!at || /^Q\d+$/.test(name) || cities.has(id)) continue;
  const iso2 = r.iso2.value.toUpperCase();
  cities.set(id, { id, name, iso2, country: COUNTRY_NAME[iso2] ?? r.countryLabel.value, pop: Number(r.pop?.value ?? 0), capital: capitalIds.has(id), ...at, admin: new Set() });
}
console.error(`${cities.size} places`);

// First-level subdivision ("Tamil Nadu", "Texas"): a containing entity the country lists as its own.
const ids = [...cities.keys()];
for (let i = 0; i < ids.length; i += 800) {
  const rows = await sparql(`SELECT ?city ?admLabel WHERE {
    VALUES ?city { ${ids.slice(i, i + 800).map((x) => `wd:${x}`).join(" ")} }
    ?city wdt:P17 ?country . ?country wdt:P150 ?adm . ?city wdt:P131+ ?adm .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
  for (const r of rows) cities.get(qid(r.city.value))?.admin.add(r.admLabel.value);
}

// Every place Wikidata labels with one of these names and gives a population: the homonyms a bare
// name could also mean.
const names = [...new Set([...cities.values()].map((c) => c.name))];
const homonyms = new Map();
for (let i = 0; i < names.length; i += 400) {
  const rows = await sparql(`SELECT ?s ?l (MAX(?p) AS ?pop) (SAMPLE(?c) AS ?coord) WHERE {
    VALUES ?l { ${names.slice(i, i + 400).map((n) => JSON.stringify(n) + "@en").join(" ")} }
    ?s rdfs:label ?l ; wdt:P1082 ?p ; wdt:P625 ?c . } GROUP BY ?s ?l`);
  for (const r of rows) {
    const at = point(r.coord.value);
    if (!at) continue;
    const list = homonyms.get(r.l.value) ?? [];
    list.push({ id: qid(r.s.value), pop: Number(r.pop.value), ...at });
    homonyms.set(r.l.value, list);
  }
}

const rows = [];
for (const c of [...cities.values()].sort((a, b) => b.pop - a.pop)) {
  const rivals = (homonyms.get(c.name) ?? []).filter((h) => h.id !== c.id && km(h, c) > SAME_PLACE_KM);
  const top = Math.max(0, ...rivals.map((h) => h.pop));
  // A capital below MIN_POP (Reykjavík, ~140k) still needs 100k: smaller ones share names with words.
  const bare = c.pop >= (c.capital ? CAPITAL_MIN_POP : MIN_POP) && c.pop >= DOMINANCE * top;
  // One subdivision or none: a city filed under two is not named by either.
  const admin = c.admin.size === 1 ? [...c.admin][0] : "";
  rows.push([c.name, admin, c.country, c.iso2, Number(c.lat.toFixed(4)), Number(c.lon.toFixed(4)), bare ? 1 : 0]);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  OUT,
  `/**
 * GENERATED by track1-miner/tools/build-places.mjs on ${today}. Do not edit by hand.
 *
 * ${rows.length} cities from Wikidata (CC0): population >= ${MIN_POP.toLocaleString("en")} or a national capital.
 * [name, first-level subdivision or "", country, ISO 3166-1 alpha-2, latitude, longitude, bare]
 * bare = 1 when the name alone may be answered from this table (see the generator).
 */
export type PlaceRow = readonly [string, string, string, string, number, number, 0 | 1];

export const PLACE_ROWS: readonly PlaceRow[] = [
${rows.map((r) => "  " + JSON.stringify(r) + ",").join("\n")}
];
`,
);
console.error(`wrote ${rows.length} rows (${rows.filter((r) => r[6]).length} answerable by bare name) to ${OUT}`);
