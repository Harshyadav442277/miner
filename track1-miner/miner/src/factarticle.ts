/**
 * FACT_CHECK, step one continued: fetching the subject's article from Wikipedia.
 *
 * The language half — which noun phrase is the subject, and whether a sentence
 * settles the claim — is in `factsubject.ts`. This file is only the retrieval:
 * two Wikimedia requests, made through the caller's own JSON client so the
 * contact user-agent of G150 is the one that goes out, and no request budget of
 * its own beyond the timeout it is handed.
 */

import { contentTokens, extractSubject, sentencesOf, settle } from "./factsubject";

export interface SubjectFinding {
  title: string;
  url: string;
  verdict: "supported" | "contradicted";
  evidence: string;
}

type Fetcher = (url: string, timeoutMs: number) => Promise<Record<string, unknown> | null>;

const API = "https://en.wikipedia.org/w/api.php";

/**
 * Article-choice score, the G77 preference applied to the SUBJECT rather than to
 * the whole claim: a disambiguated title ("Sharks (rugby union)") is only right
 * when the claim names EVERY word inside the parentheses, and a title word the
 * claim never uses counts against the article.
 */
export function scoreTitle(title: string, subjectTokens: Set<string>, claimTokens: Set<string>): number {
  const base = title.replace(/\s*\([^)]*\)\s*/g, " ");
  const baseTokens = contentTokens(base);
  const hit = baseTokens.filter((w) => subjectTokens.has(w)).length;
  const extra = baseTokens.filter((w) => !subjectTokens.has(w) && !claimTokens.has(w)).length;
  const paren = title.match(/\(([^)]*)\)/);
  let disambiguation = 0;
  if (paren) {
    const inside = contentTokens(paren[1] ?? "");
    if (inside.length > 0 && !inside.every((w) => claimTokens.has(w))) disambiguation = 3;
  }
  return hit * 2 - disambiguation - extra * 0.75;
}

/**
 * Resolve the subject to its canonical article and read it.
 *
 * A TITLE search (`opensearch`, which matches titles rather than body text —
 * full-text search is what sent "bats are blind" to *The Blind Watchmaker*),
 * then one plain-text extract of the winning title. The extract opens with the
 * lead section and sentences are scanned in document order, so a lead sentence
 * takes any tie against the body.
 *
 * Returns null whenever the article does not settle the claim, which is the
 * common case: the caller then runs its own search path unchanged.
 */
export async function findSubjectEvidence(
  claim: string,
  getJson: Fetcher,
  timeoutMs: number,
): Promise<SubjectFinding | null> {
  const subject = extractSubject(claim);
  if (!subject || subject.length < 2) return null;

  const found = await getJson(
    `${API}?action=opensearch&search=${encodeURIComponent(subject)}&limit=8&namespace=0&format=json`,
    timeoutMs,
  );
  // opensearch answers with an ARRAY, which our JSON client types as a record.
  const titles = (Array.isArray(found) ? found[1] : undefined) as unknown;
  if (!Array.isArray(titles) || titles.length === 0) return null;

  const subjectTokens = new Set(contentTokens(subject));
  const claimTokens = new Set(contentTokens(claim));
  let title: string | null = null;
  let bestScore = 0;
  for (const t of titles) {
    if (typeof t !== "string" || !t) continue;
    const score = scoreTitle(t, subjectTokens, claimTokens);
    if (score > bestScore) { bestScore = score; title = t; }
  }
  if (!title) return null;

  const page = await getJson(
    `${API}?action=query&prop=extracts&explaintext=1&redirects=1&format=json&origin=*` +
    `&titles=${encodeURIComponent(title)}`,
    timeoutMs,
  );
  const pages = (page?.["query"] as Record<string, unknown> | undefined)?.["pages"];
  const first = pages && typeof pages === "object" ? Object.values(pages as Record<string, unknown>)[0] : undefined;
  const record = first as Record<string, unknown> | undefined;
  const text = typeof record?.["extract"] === "string" ? (record["extract"] as string) : "";
  if (!text) return null;
  const resolved = typeof record?.["title"] === "string" ? (record["title"] as string) : title;

  const sentences = sentencesOf(text);
  const settled = settle(claim, subject, sentences);
  if (!settled) return null;

  // Quote a second sentence when the settling one is terse, so the answer carries
  // a readable passage rather than a fragment.
  let evidence = settled.evidence;
  const next = sentences[settled.at + 1];
  if (evidence.length < 80 && next) evidence = `${evidence} ${next}`;

  return {
    title: resolved,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(resolved.replace(/\s+/g, "_"))}`,
    verdict: settled.verdict,
    evidence: evidence.slice(0, 400),
  };
}
