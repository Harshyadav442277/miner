/**
 * REGULATORY_FILING_MONITOR for an entity that is not an SEC registrant (a product, drug, device or concern):
 * the Federal Register documents that name it, counted over the window asked. Kept apart from filings.ts so the
 * EDGAR path, which scored 0.9975-level results for registrants, is untouched.
 */
import { searchFederalRegister, type FrDocument, type FrSearch } from "./fedreg";
import type { FilingAsk, FilingResult } from "./filings";

const LISTED = 100;

/** "Notice, Food and Drug Administration, published 2026-04-30: <title>". Pure. */
export function frTitle(d: FrDocument): string {
  return `${d.type || "Document"}${d.agencies.length ? `, ${d.agencies.at(-1)}` : ""}, published ${d.published}: ${d.title}`;
}

/** The window of an ask in Federal Register publication dates: a fiscal year is read as its calendar year. Pure. */
export function frWindow(ask: FilingAsk): { since: string | null; until: string | null } {
  if (ask.since) return { since: ask.since, until: ask.until ?? null };
  if (ask.fiscal_year) return { since: `${ask.fiscal_year}-01-01`, until: `${ask.fiscal_year}-12-31` };
  return { since: null, until: null };
}

export type FrFields = Pick<FilingResult, "verdict" | "confidence" | "reason"> & Partial<FilingResult>;

/** The intent's fields from one Federal Register search. Pure. */
export function frResult(ask: FilingAsk, fr: FrSearch, other?: string): FrFields {
  const { since, until } = frWindow(ask);
  const windowed = since !== null;
  const span = until ? `between ${since} and ${until}` : since ? `since ${since}` : "";
  const latest = fr.documents[0];
  const notCovered = other ? ` Only SEC EDGAR and the US Federal Register are read; ${other} disclosures are not covered.` : "";
  const what = `${ask.company} is not an SEC registrant, so it has no EDGAR filings; the count is of US Federal Register documents that name it.`;
  const head = windowed
    ? `${fr.count} US Federal Register document${fr.count === 1 ? "" : "s"} name${fr.count === 1 ? "s" : ""} ${ask.company} ${span}`
    : `The latest US Federal Register document naming ${ask.company}`;
  const lead = !latest
    ? `${windowed ? head : `No US Federal Register document names ${ask.company}`}.`
    : windowed
      ? `${head}; the latest, ${frTitle(latest)}, is at ${latest.url}.`
      : `${head} is ${frTitle(latest)}, at ${latest.url}.`;
  return {
    verdict: windowed ? (fr.count > 0 ? "filed" : "not_filed") : latest ? "filed" : "not_filed",
    confidence: 0.9,
    register: "Federal Register",
    entity: ask.company,
    // No window, no count: a count of every document ever published answers no question that was asked.
    filing_count: windowed ? fr.count : null,
    filings: fr.documents.slice(0, LISTED).map(frTitle),
    urls: fr.documents.slice(0, LISTED).map((d) => d.url),
    counted_since: since,
    ...(until ? { counted_until: until } : {}),
    source_url: fr.search_url,
    reason: `${lead} ${what}${notCovered}`,
  };
}

/** `undefined` when the Federal Register did not answer, so the caller keeps its not-found answer. */
export async function federalRegisterFilings(ask: FilingAsk, other?: string): Promise<FrFields | undefined> {
  const { since, until } = frWindow(ask);
  const fr = await searchFederalRegister(ask.company, since, until);
  return fr ? frResult(ask, fr, other) : undefined;
}
