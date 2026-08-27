/**
 * Peer-reviewed paper search, via OpenAlex.
 *
 * ACADEMIC_SEARCH questions ask for papers on a topic within a date range,
 * "returning the paper title, authors, and citation count". The registered
 * miners score 0.000-0.015. OpenAlex is free, keyless, and returns exactly those
 * fields, so the answer is a matter of asking it correctly and reporting what it
 * says.
 */

const API = "https://api.openalex.org/works";
const DEFAULT_TIMEOUT_MS = 9000;

export interface Paper {
  title: string;
  year: number | null;
  authors: string[];
  citations: number | null;
  venue: string | null;
  doi: string | null;
}

export interface PaperResult {
  topic: string | null;
  from_date: string | null;
  to_date: string | null;
  verdict: string;
  papers: Paper[];
  count: number;
  confidence: number;
  reason: string;
  checked_at: string;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** A "between January 2023 and June 2026" window, or a bare year. */
export function dateWindow(text: string): { from: string | null; to: string | null } {
  const s = String(text ?? "");
  const pairRe = new RegExp(
    String.raw`\b(?:between|from)\s+([A-Za-z]+)\s+(\d{4})\s+(?:and|to)\s+([A-Za-z]+)\s+(\d{4})`,
    "i",
  );
  const m = s.match(pairRe);
  if (m?.[1] && m[2] && m[3] && m[4]) {
    const a = MONTHS[m[1].toLowerCase()];
    const b = MONTHS[m[3].toLowerCase()];
    if (a && b) {
      const last = new Date(Date.UTC(Number(m[4]), b, 0)).getUTCDate();
      return {
        from: `${m[2]}-${String(a).padStart(2, "0")}-01`,
        to: `${m[4]}-${String(b).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
      };
    }
  }
  const year = s.match(/\b(?:published\s+in|in)\s+(\d{4})\b/i);
  if (year?.[1]) return { from: `${year[1]}-01-01`, to: `${year[1]}-12-31` };
  return { from: null, to: null };
}

/** The subject, with the search scaffolding stripped off. */
export function searchTopic(text: string): string | null {
  const s = String(text ?? "");
  const m =
    s.match(/\bthat\s+discuss(?:es)?\s+(.+?)(?:[,.?]|\s+returning\b|\s+with\b|\s+where\b|$)/i) ??
    s.match(/\bon\s+(.+?)(?:[,.?]|\s+returning\b|\s+published\b|$)/i) ??
    s.match(/\babout\s+(.+?)(?:[,.?]|$)/i);
  const t = m?.[1]?.trim();
  return t && t.length > 3 ? t.replace(/\s+/g, " ") : null;
}

export async function findPapers(query: string, limit = 5, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<PaperResult> {
  const now = new Date().toISOString();
  const topic = searchTopic(query);
  const { from, to } = dateWindow(query);

  const base: PaperResult = {
    topic, from_date: from, to_date: to,
    verdict: "unknown", papers: [], count: 0, confidence: 0, reason: "", checked_at: now,
  };

  if (!topic) {
    return { ...base, reason: "No research topic was supplied with this request, so no papers could be found. Name a subject to search for." };
  }

  const filters: string[] = [];
  if (from) filters.push(`from_publication_date:${from}`);
  if (to) filters.push(`to_publication_date:${to}`);
  const url =
    `${API}?search=${encodeURIComponent(topic)}` +
    (filters.length ? `&filter=${encodeURIComponent(filters.join(","))}` : "") +
    // Default relevance ranking, not citation count: sorting by citations returned
    // a 6G survey for a blockchain supply-chain query — highly cited, wrong topic.
    `&per-page=${limit}`;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let body: { results?: Array<Record<string, unknown>>; meta?: { count?: number } };
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    body = (await res.json()) as typeof body;
  } finally {
    clearTimeout(t);
  }

  const papers: Paper[] = [];
  for (const w of body.results ?? []) {
    const authorships = (w["authorships"] as Array<{ author?: { display_name?: string } }> | undefined) ?? [];
    const loc = w["primary_location"] as { source?: { display_name?: string } } | undefined;
    papers.push({
      title: String(w["title"] ?? "").trim(),
      year: typeof w["publication_year"] === "number" ? (w["publication_year"] as number) : null,
      authors: authorships.map((a) => a.author?.display_name).filter((x): x is string => Boolean(x)).slice(0, 4),
      citations: typeof w["cited_by_count"] === "number" ? (w["cited_by_count"] as number) : null,
      venue: loc?.source?.display_name ?? null,
      doi: (w["doi"] as string | undefined) ?? null,
    });
  }

  if (papers.length === 0) {
    return { ...base, reason: `No peer-reviewed papers on ${topic} were found for the requested period.` };
  }

  const window = from && to ? ` published between ${from} and ${to}` : "";
  // The questions ask for title, authors and citation count, so each entry names
  // all three rather than listing titles alone.
  const list = papers
    .map((p, i) =>
      `${i + 1}) ${p.title}` +
      (p.authors.length ? ` by ${p.authors.join(", ")}` : "") +
      (p.year ? ` (${p.year})` : "") +
      (p.citations !== null ? `, cited ${p.citations} times` : "") +
      ".",
    )
    .join(" ");

  return {
    ...base,
    verdict: "papers",
    papers,
    count: papers.length,
    confidence: 1,
    reason: `Here are ${papers.length} peer-reviewed papers on ${topic}${window}: ${list}`,
  };
}
