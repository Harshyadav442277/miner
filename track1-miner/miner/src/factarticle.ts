/**
 * FACT_CHECK, step one continued: fetching the subject's article from Wikipedia.
 *
 * The language half — which noun phrase is the subject, and whether a sentence
 * settles the claim — is in `factsubject.ts`. This file is only the retrieval:
 * two Wikimedia requests, made through the caller's own JSON client so the
 * contact user-agent of G150 is the one that goes out, and no request budget of
 * its own beyond the timeout it is handed.
 */

import { extractSubject, sentencesOf, settle } from "./factsubject";
import { contentTokens } from "./factwords";

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

/** A disambiguation page's lead: "Stripe or stripes may refer to:". */
const DISAMBIGUATION = /\bmay (?:also )?refer to\b/i;

/** One plain-text extract, redirects followed, or null when it cannot be read. */
async function readArticle(title: string, getJson: Fetcher, timeoutMs: number): Promise<{ title: string; text: string } | null> {
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
  return { title: typeof record?.["title"] === "string" ? (record["title"] as string) : title, text };
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
  // Best score first; a tie keeps opensearch's order, as the single pick always did.
  const ranked = titles
    .map((t, i) => ({ t, i, score: typeof t === "string" && t ? scoreTitle(t, subjectTokens, claimTokens) : 0 }))
    .filter((c): c is { t: string; i: number; score: number } => c.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i);
  if (ranked.length === 0) return null;

  // The top title can be a disambiguation page: "Stripe" lists stripes, hyenas and
  // Stripe, Inc., so "Stripe was founded in 2010" was never read against the
  // company (G241). Only then are the next candidates read, and from them only
  // SUPPORT is taken: an article about a different thing of the same name may
  // well rule the claim out, which says nothing about the thing the asker meant.
  let resolved = "";
  let sentences: string[] = [];
  let settled: ReturnType<typeof settle> = null;
  for (const [k, cand] of ranked.slice(0, 4).entries()) {
    const article = await readArticle(cand.t, getJson, timeoutMs);
    if (!article) return null;
    if (DISAMBIGUATION.test(article.text.slice(0, 300))) continue;
    resolved = article.title;
    sentences = sentencesOf(article.text);
    settled = settle(claim, subject, sentences);
    if (k > 0 && settled?.verdict !== "supported") settled = null;
    if (settled || k === 0) break;
  }
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
