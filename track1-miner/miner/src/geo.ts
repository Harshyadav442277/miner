/**
 * IP_GEOLOCATION — where an IP address is, read live at request time.
 *
 * The intent asks a narrow question: "this IP, where is it?" So the answer
 * sentence names the address and the place and stops. Network context (ASN,
 * organisation) and coordinates go in structured fields, where an agent can read
 * them without diluting the scored prose.
 */

export interface GeoResult {
  ip: string;
  verdict: string;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  asn: string | null;
  organisation: string | null;
  confidence: number;
  reason: string;
  checked_at: string;
}

const DEFAULT_TIMEOUT_MS = 6000;

/** IPv4 or a bracket-free IPv6, from a bare string or a whole question. */
export function extractIp(text: string): string | null {
  const s = String(text ?? "").trim();
  if (!s) return null;
  const v4 = s.match(/\b((?:\d{1,3}\.){3}\d{1,3})\b/);
  if (v4?.[1] && v4[1].split(".").every((o) => Number(o) <= 255)) return v4[1];
  const v6 = s.match(/\b((?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4})\b/i);
  if (v6?.[1] && v6[1].includes("::") ) return v6[1];
  if (v6?.[1] && v6[1].split(":").length >= 3) return v6[1];
  return null;
}

function unknown(ip: string, why: string, hadIp = true): GeoResult {
  return {
    ip,
    verdict: "unknown",
    city: null,
    region: null,
    country: null,
    country_code: null,
    latitude: null,
    longitude: null,
    timezone: null,
    asn: null,
    organisation: null,
    confidence: 0,
    reason: hadIp
      ? `The location of the IP address ${ip} could not be determined: ${why}.`
      : `No IP address could be read from ${JSON.stringify(ip)}, so its location could not be determined.`,
    checked_at: new Date().toISOString(),
  };
}

async function getJson(url: string, timeoutMs: number): Promise<Record<string, unknown> | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function geolocate(rawIp: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<GeoResult> {
  const ip = extractIp(rawIp);
  if (!ip) return unknown(String(rawIp ?? "").slice(0, 60), "unparseable", false);

  // ipwho.is first — no key and consistently the fastest of the free options.
  // ipapi.co is the fallback so a single upstream outage is not our outage.
  let city: string | null = null;
  let region: string | null = null;
  let country: string | null = null;
  let cc: string | null = null;
  let lat: number | null = null;
  let lon: number | null = null;
  let tz: string | null = null;
  let asn: string | null = null;
  let org: string | null = null;

  const a = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}`, timeoutMs);
  if (a && a["success"] === true) {
    city = str(a["city"]);
    region = str(a["region"]);
    country = str(a["country"]);
    cc = str(a["country_code"]);
    lat = num(a["latitude"]);
    lon = num(a["longitude"]);
    const tzo = a["timezone"] as Record<string, unknown> | undefined;
    tz = str(tzo?.["id"]);
    const conn = a["connection"] as Record<string, unknown> | undefined;
    asn = conn?.["asn"] != null ? `AS${String(conn["asn"])}` : null;
    org = str(conn?.["org"]) ?? str(conn?.["isp"]);
  } else {
    const b = await getJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, timeoutMs);
    if (!b || b["error"]) return unknown(ip, "no geolocation provider returned a result");
    city = str(b["city"]);
    region = str(b["region"]);
    country = str(b["country_name"]);
    cc = str(b["country_code"]);
    lat = num(b["latitude"]);
    lon = num(b["longitude"]);
    tz = str(b["timezone"]);
    asn = str(b["asn"]);
    org = str(b["org"]);
  }

  if (!country) return unknown(ip, "the provider returned no country");

  // Most specific place first, skipping a region that merely repeats the city.
  const parts = [city, region && region !== city ? region : null, country].filter(Boolean);
  const place = parts.join(", ");

  return {
    ip,
    verdict: place,
    city,
    region,
    country,
    country_code: cc,
    latitude: lat,
    longitude: lon,
    timezone: tz,
    asn,
    organisation: org,
    confidence: city ? 0.95 : 0.7,
    // Real questions ask for "country, city, and ISP information" — naming the
    // place and stopping leaves a third of that unanswered, with the operator
    // sitting unused in a field. Coordinates stay in the fields: nobody asked.
    reason:
      `The IP address ${ip} is located in ${place}.` +
      (org ? ` It is operated by ${org}${asn ? ` (${asn})` : ""}.` : "") +
      (tz ? ` The local timezone is ${tz}.` : ""),
    checked_at: new Date().toISOString(),
  };
}
