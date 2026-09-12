/**
 * FRAUD_DETECTION, the shape we were refusing: is a PAPER fraudulent?
 *
 * `assessFraud` looks for a wallet address, a transaction hash, a domain or a
 * scam marker, and refuses when it finds none. Five of the twenty-nine routed
 * FRAUD_DETECTION questions carry none of those because they are about academic
 * publishing:
 *
 *   "How likely is the paper “BERT: Pre-training of Deep Bidirectional
 *    Transformers for Language Understanding” by Devlin, Jacob … (2018) to be
 *    fraudulent? Consider retractions, misconduct findings, paper mills and
 *    predatory publishers, and answer only with what is documented."
 *
 * That is a fraud question, the network routed it here, and we answered none of
 * them. A refusal scores about 1e-11.
 *
 * WHAT IS ACTUALLY DOCUMENTED, AND WHAT IS NOT. OpenAlex records a retraction
 * flag per work, along with the venue, year and citation count. It does not
 * record misconduct findings, paper-mill membership or predatory-publisher
 * status, and no keyless source does. The questions say "answer only with what
 * is documented", so the answer reports the retraction flag as evidence and
 * names the three things that were NOT checked rather than implying a clean
 * bill of health across all four. Absence of a retraction is not absence of
 * misconduct, and saying so is the whole difference between this answer and a
 * confidently wrong one.
 */
import { openAlexUrl } from "./papers";

const API = "https://api.openalex.org/works";
const TIMEOUT_MS = Number(process.env.PAPERFRAUD_TIMEOUT_MS ?? 7_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";

export interface PaperFraudResult {
  title: string;
  matched: string | null;
  retracted: boolean | null;
  year: number | null;
  venue: string | null;
  citations: number | null;
  verdict: "high_risk" | "no_indicators" | "unknown";
  confidence: number;
  reason: string;
}

/**
 * The quoted work title.
 *
 * Every routed question of this shape puts the title in curly quotes; straight
 * quotes and guillemets are accepted too because a caller typing the same
 * question by hand would use them. A one- or two-word quotation is not taken as
 * a title — it is far more likely to be a quoted phrase inside a sentence, and
 * searching on it returns a confident match to something unrelated.
 */
export function quotedTitle(text: string): string | null {
  const s = String(text ?? "");
  const m = s.match(/[“"«]([^”"»]{8,300})[”"»]/);
  const title = m?.[1]?.trim() ?? null;
  if (!title) return null;
  return title.split(/\s+/).length >= 3 ? title : null;
}

/** A fraud question about a publication rather than about an address or a link. */
export function asksPaperFraud(text: string): boolean {
  const s = String(text ?? "");
  if (!quotedTitle(s)) return false;
  const publishing = /\bpaper\s*mills?\b/i.test(s)
    || /\bretract\w*\b/i.test(s)
    || /\bmisconduct\b/i.test(s)
    || /\bpredatory\b/i.test(s)
    || /\bpaper\b/i.test(s)
    || /\bjournal\b/i.test(s)
    || /\bpublish\w*\b/i.test(s);
  const fraud = /\bfraud\w*\b/i.test(s) || /\brisk\b/i.test(s);
  return publishing && fraud;
}

interface Work {
  display_name?: string;
  is_retracted?: boolean;
  publication_year?: number;
  cited_by_count?: number;
  primary_location?: { source?: { display_name?: string } | null } | null;
}

/**
 * Only a work whose title genuinely corresponds to the one asked about is used.
 *
 * This is the guard the 2026-09-10 session had to add twice, in RESEARCH_QUERY
 * and again in FINANCIAL_DATA: a fuzzy search always returns something, and
 * reporting its retraction status as the answer to a question about a different
 * work is the confidently-wrong failure.
 *
 * The comparison is SYMMETRIC and it is deliberately strict, because a short
 * generic title defeats anything looser. Both measured on 2026-09-12, asking
 * about "Experimental Biology and Medicine":
 *
 *   one-directional coverage  -> "Proceedings of the Society for Experimental
 *                                 Biology and Medicine"   (a different journal)
 *   overlap over union at 0.7 -> "Advances in Experimental Medicine and
 *                                 Biology"                (another one again)
 *
 * Three interchangeable words cannot identify a work, so near-equality is the
 * bar. A long distinctive title is allowed the looser phrase test, since by then
 * the words themselves carry the identity. Both failure directions end at
 * "unknown", which is an honest answer; a wrong match is not.
 */
function titleMatches(asked: string, found: string): boolean {
  const words = (s: string) => s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  const want = new Set(words(asked));
  const have = new Set(words(found));
  if (want.size === 0 || have.size === 0) return false;
  let shared = 0;
  for (const w of want) if (have.has(w)) shared += 1;
  if (shared / (want.size + have.size - shared) >= 0.85) return true;
  // Six or more substantial words is distinctive enough that containing the
  // whole phrase means the same work, subtitle or no subtitle.
  const phrase = (s: string) => words(s).join(" ");
  return want.size >= 6 && phrase(found).includes(phrase(asked));
}

export async function assessPaperFraud(text: string): Promise<PaperFraudResult> {
  const title = quotedTitle(text) ?? "";
  const empty = {
    title, matched: null, retracted: null, year: null, venue: null, citations: null,
  };
  // The three things no keyless source documents. Named in every answer so a
  // clean retraction flag is never read as a clean record overall.
  const notChecked =
    "Misconduct findings, paper-mill membership and predatory-publisher status are not recorded " +
    "by this source and were not checked, so they are neither confirmed nor ruled out.";

  let works: Work[];
  try {
    const url = openAlexUrl(
      `${API}?search=${encodeURIComponent(title)}&per-page=3` +
      `&select=display_name,is_retracted,publication_year,cited_by_count,primary_location`,
    );
    const r = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    works = ((await r.json()) as { results?: Work[] }).results ?? [];
  } catch {
    return {
      ...empty, verdict: "unknown", confidence: 0,
      reason:
        `The scholarly index could not be read, so no retraction record was retrieved for ` +
        `"${title}". That is a source outage rather than a clean record, and the two are not the ` +
        `same thing. ${notChecked}`,
    };
  }

  const hit = works.find((w) => titleMatches(title, w.display_name ?? ""));
  if (!hit) {
    return {
      ...empty, verdict: "unknown", confidence: 0.3,
      reason:
        `No work matching "${title}" is recorded in the OpenAlex scholarly index, so no retraction ` +
        `record exists there to report. An unindexed work is not evidence of fraud and not ` +
        `evidence against it. ${notChecked}`,
    };
  }

  const matched = hit.display_name ?? title;
  const retracted = hit.is_retracted === true;
  const year = hit.publication_year ?? null;
  const venue = hit.primary_location?.source?.display_name ?? null;
  const citations = Number.isFinite(hit.cited_by_count) ? (hit.cited_by_count as number) : null;
  const where = venue ? ` in ${venue}` : "";
  const when = year ? ` (${year})` : "";
  const cited = citations === null
    ? ""
    : ` It has ${citations.toLocaleString("en-US")} recorded citations.`;

  return {
    title, matched, retracted, year, venue, citations,
    verdict: retracted ? "high_risk" : "no_indicators",
    confidence: retracted ? 0.95 : 0.7,
    reason: retracted
      ? `"${matched}"${when}${where} is flagged as RETRACTED in the OpenAlex scholarly index. A ` +
        `retraction is a documented finding against the work itself, which makes this high risk.` +
        `${cited} ${notChecked}`
      : `"${matched}"${when}${where} is not flagged as retracted in the OpenAlex scholarly index, ` +
        `which is the one indicator of the four that is documented there.${cited} ${notChecked}`,
  };
}
