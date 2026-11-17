/**
 * The US Federal Register, keyless: rules, proposed rules and notices that name a product, drug, device or
 * concern. REGULATORY_FILING_MONITOR's entity is "Company, product or concern"; SEC EDGAR only knows
 * registrants, so a product such as Ozempic had no count at all (filing_count null, 2026-11-16).
 *
 *   www.federalregister.gov/api/v1/documents.json   "No API keys are needed" (developer page, read 2026-11-16)
 *
 * Federal Register documents are US government works (17 U.S.C. 105).
 */
const API = "https://www.federalregister.gov/api/v1/documents.json";
const TIMEOUT_MS = Number(process.env.FEDREG_TIMEOUT_MS ?? 5_000);

export interface FrDocument {
  title: string;
  type: string;
  published: string;
  agencies: string[];
  document_number: string;
  url: string;
}

export interface FrSearch {
  count: number;
  documents: FrDocument[];
  search_url: string;
}

/** The search conditions for a term (as a phrase) in a window. Pure. */
export function frConditions(term: string, since: string | null, until: string | null): URLSearchParams {
  const q = new URLSearchParams({ "conditions[term]": `"${term.replace(/"/g, "")}"` });
  if (since) q.set("conditions[publication_date][gte]", since);
  if (until) q.set("conditions[publication_date][lte]", until);
  return q;
}

/** The API query string: the conditions, newest first, with only the fields read. Pure. */
export function frQuery(term: string, since: string | null, until: string | null, perPage = 5): string {
  const q = frConditions(term, since, until);
  q.set("order", "newest");
  q.set("per_page", String(perPage));
  for (const f of ["title", "type", "publication_date", "agencies", "document_number", "html_url"]) q.append("fields[]", f);
  return q.toString();
}

/** One API body to the documents it lists. Pure. `null` when the body is not the API's shape. */
export function frParse(body: unknown): { count: number; documents: FrDocument[] } | null {
  const b = body as { count?: unknown; results?: unknown };
  if (typeof b?.count !== "number" || !Number.isInteger(b.count) || b.count < 0) return null;
  const rows = Array.isArray(b.results) ? b.results as Array<Record<string, unknown>> : [];
  return {
    count: b.count,
    documents: rows.map((r) => ({
      title: String(r.title ?? ""),
      type: String(r.type ?? ""),
      published: String(r.publication_date ?? ""),
      agencies: Array.isArray(r.agencies) ? (r.agencies as Array<{ name?: string }>).map((a) => String(a?.name ?? "")).filter(Boolean) : [],
      document_number: String(r.document_number ?? ""),
      url: String(r.html_url ?? ""),
    })),
  };
}

/** Documents naming `term` (as a phrase) published in the window. `undefined` is an outage. */
export async function searchFederalRegister(term: string, since: string | null, until: string | null): Promise<FrSearch | undefined> {
  try {
    const r = await fetch(`${API}?${frQuery(term, since, until)}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) return undefined;
    const parsed = frParse(await r.json());
    return parsed ? { ...parsed, search_url: `https://www.federalregister.gov/documents/search?${frConditions(term, since, until)}` } : undefined;
  } catch {
    return undefined;
  }
}
