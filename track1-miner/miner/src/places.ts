/**
 * Large cities answered from a built-in table, so the weather routes do not ask Nominatim for the
 * places people ask about most (GAPS G196). Nominatim allows one request per second per
 * application, and serverless instances cannot share that spacing.
 *
 * The table (places-data.ts) is generated from Wikidata, CC0, by tools/build-places.mjs. It is only
 * ever a shortcut: anything it cannot name with confidence returns null and goes to Nominatim.
 *
 * - "Name" alone is answered only for an entry the generator marked bare: it outweighs every other
 *   place of that name at least fivefold. "Valencia" is not; "Valencia, Spain" is.
 * - "Name, Qualifier" is answered only when every qualifier part names the entry's country,
 *   subdivision or a common short form of either ("Miami, FL", "London, UK"). "Paris, Texas" names
 *   no entry, so it returns null rather than Paris, France.
 */
import { PLACE_ROWS } from "./places-data";
import type { GeocodeHit } from "./weather-upstream";

/** Lowercase, accents and punctuation removed: "Reykjavík" and "reykjavik" are one key. */
export function foldPlace(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9,]+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .trim();
}

const US_STATES: Record<string, string> = {
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california", co: "colorado",
  ct: "connecticut", de: "delaware", dc: "district of columbia", fl: "florida", ga: "georgia",
  hi: "hawaii", id: "idaho", il: "illinois", in: "indiana", ia: "iowa", ks: "kansas", ky: "kentucky",
  la: "louisiana", me: "maine", md: "maryland", ma: "massachusetts", mi: "michigan", mn: "minnesota",
  ms: "mississippi", mo: "missouri", mt: "montana", ne: "nebraska", nv: "nevada", nh: "new hampshire",
  nj: "new jersey", nm: "new mexico", ny: "new york", nc: "north carolina", nd: "north dakota",
  oh: "ohio", ok: "oklahoma", or: "oregon", pa: "pennsylvania", ri: "rhode island",
  sc: "south carolina", sd: "south dakota", tn: "tennessee", tx: "texas", ut: "utah", vt: "vermont",
  va: "virginia", wa: "washington", wv: "west virginia", wi: "wisconsin", wy: "wyoming",
};

/** Other names people use for a country, by ISO code. The code itself is always accepted. */
const COUNTRY_ALIASES: Record<string, string[]> = {
  US: ["usa", "united states of america", "america", "the us", "the usa"],
  GB: ["uk", "britain", "great britain", "the uk"],
  AE: ["uae"],
  CN: ["prc", "peoples republic of china"],
  KR: ["korea", "republic of korea"],
  RU: ["russian federation"],
  CZ: ["czech republic"],
  TR: ["turkiye"],
  CI: ["ivory coast"],
  MM: ["burma"],
};

/** "Lagos State" also answers to "Lagos"; "Osaka Prefecture" to "Osaka". */
const SUBDIVISION_SUFFIX = / (state|province|region|prefecture|governorate|district|territory|oblast|department)$/;

interface Place {
  hit: GeocodeHit;
  bare: boolean;
  qualifiers: Set<string>;
}

let index: Map<string, Place[]> | null = null;

function build(): Map<string, Place[]> {
  const out = new Map<string, Place[]>();
  for (const [name, admin, country, iso2, latitude, longitude, bare] of PLACE_ROWS) {
    const qualifiers = new Set([foldPlace(country), iso2.toLowerCase(), ...(COUNTRY_ALIASES[iso2] ?? [])]);
    if (admin) {
      const a = foldPlace(admin);
      qualifiers.add(a);
      qualifiers.add(a.replace(SUBDIVISION_SUFFIX, ""));
      if (iso2 === "US") for (const [abbr, state] of Object.entries(US_STATES)) if (state === a) qualifiers.add(abbr);
    }
    // "Tokyo, Tokyo, Japan" and "Singapore, Singapore" say each name once.
    const shown = [...new Set([name, admin, country].filter(Boolean))].join(", ");
    const place: Place = { hit: { name: shown, latitude, longitude }, bare: bare === 1, qualifiers };
    const key = foldPlace(name);
    out.set(key, [...(out.get(key) ?? []), place]);
  }
  return out;
}

/** The table's answer for a place name, or null when the table cannot say with confidence. */
export function lookupPlace(query: string): GeocodeHit | null {
  index ??= build();
  const [head, ...rest] = foldPlace(query).split(",");
  const entries = index.get(head ?? "");
  if (!entries) return null;
  const parts = rest.map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return entries.find((e) => e.bare)?.hit ?? null;
  const matches = entries.filter((e) => parts.every((p) => e.qualifiers.has(p)));
  // Wikidata files Tokyo twice (the metropolis and its wards): rows a few km apart are one place,
  // and the table is ordered by population, so the first is the one to name.
  const first = matches[0];
  if (!first || !matches.every((m) => near(m.hit, first.hit))) return null;
  return first.hit;
}

/** Within roughly 50 km. */
function near(a: GeocodeHit, b: GeocodeHit): boolean {
  const dLat = a.latitude - b.latitude;
  const dLon = (a.longitude - b.longitude) * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLon) * 111 <= 50;
}
