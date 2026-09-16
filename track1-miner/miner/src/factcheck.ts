/**
 * FACT_CHECK — a specific claim, checked against a citable source.
 *
 * The canonical intent: "Query supplies a specific claim or statement and asks
 * whether it is true, with supporting evidence."
 *
 * **The honesty constraint, which shapes everything here.** We have no oracle.
 * What we can do is look the claim up in a reputable, citable corpus and report
 * what it says, naming the source and the limits of the check. What we must not
 * do is assert true/false on a claim the source does not actually address — the
 * confidently-wrong failure mode that got SPORTS_SCORE and IMAGE_VERIFICATION
 * refused. So the verdict vocabulary includes `unverified`, and it is used
 * whenever the evidence does not decide the claim.
 *
 * **Two retrieval paths, and only one of them may say "supported".** First the
 * claim's SUBJECT is resolved to its canonical article and that article is read
 * for the asserted relation (`factsubject.ts`); a sentence there that states the
 * relation is evidence, and can support as well as contradict. If it settles
 * nothing, the original full-text search runs unchanged — and that path still
 * cannot produce "supported", because an article merely retrieved for a claim
 * shares its vocabulary whether it endorses it or refutes it.
 *
 * **Why the field is open.** Both incumbents are structurally broken rather than
 * merely losing: `tavily` declares `https://api.tavily.com` as its base_url, an
 * API that requires a key it cannot supply, and `assay-miner` points at a
 * `raw.githubusercontent.com` path, which is a static file host and not an API.
 * `tavily` scored 0.0000 in five of the last six epochs. Judging normalises by
 * the best score in the intent, so a well-formed answer that scores anything at
 * all takes rank 1 — the same arithmetic that justified CONTENT_EXTRACTION.
 *
 * **What is NOT claimed.** This is not a general-purpose fact checker and does
 * not pretend to settle contested claims. Wikipedia is keyless, cites its own
 * sources, and is a defensible reference for the encyclopaedic claims this
 * intent asks about; it is named explicitly in every answer so a reader can
 * weigh it.
 */

import { findSubjectEvidence } from "./factarticle";
import { chooseArticle, searchTerms } from "./factsearch";

const WIKI_SEARCH = "https://en.wikipedia.org/w/api.php";
const DEFAULT_TIMEOUT_MS = 7000;
/**
 * The whole check, across every Wikimedia request it makes, inside the handler's
 * 11s watchdog. Resolving the subject added requests, so the budget is now shared
 * rather than granted per request: each call gets whatever is left, and the
 * fallback search is skipped outright when there is no time to spend on it.
 */
const TOTAL_BUDGET_MS = 9500;

export interface FactCheckResult {
  claim: string | null;
  /**
   * "supported" is reachable ONLY from the subject's own article, via
   * factsubject.ts, which requires a sentence that asserts the relation. The
   * fallback search path below still cannot produce it — see judge().
   */
  verdict: "supported" | "contradicted" | "unverified" | "unknown";
  confidence: number;
  source: string | null;
  source_url: string | null;
  evidence: string | null;
  reason: string;
  checked_at: string;
  error?: string;
}

/**
 * The claim itself, separated from the instruction wrapped around it.
 * "Is it true that X?" and "Fact-check the following claim: X" both carry X.
 */
export function extractClaim(raw: string): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  const quoted = s.match(/["“']([^"”']{12,})["”']/);
  if (quoted?.[1]) return quoted[1].trim();
  s = s.replace(/^\s*(?:please\s+)?(?:can you\s+)?(?:fact[- ]?check|verify|check|confirm|is it true)\b[:,]?\s*/i, "");
  s = s.replace(/^\s*(?:that|whether|if|the claim)\b[:,]?\s*/i, "");
  s = s.replace(/^\s*(?:the following (?:claim|statement)|this (?:claim|statement))\b[:,]?\s*/i, "");
  s = s.replace(/\s*[—-]\s*(?:true or false|is this true|correct\?)\s*$/i, "");
  return s.replace(/\s+/g, " ").replace(/[?]+$/, "").trim();
}


async function getJson(url: string, timeoutMs: number): Promise<Record<string, unknown> | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      // Wikimedia's API policy wants a contact in the user-agent. Measured
      // 2026-09-15: "livecert-miner/1.0 (Telegraph miner)" drew HTTP 429 "You are
      // making too many requests" where the same request with the miner's URL
      // drew 200 — which is why FACT_CHECK alternated between 1.0 and ~3e-9 by epoch.
      headers: { accept: "application/json", "user-agent": "livecert-miner/1.0 (+https://miner-wine.vercel.app)" },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Whether the retrieved text supports or contradicts the claim, or neither.
 *
 * Deliberately conservative. A negation in one and not the other is treated as
 * contradiction; strong term overlap is treated as support; anything else is
 * `unverified`, which is an honest answer rather than a hedge.
 */
function judge(claim: string, evidence: string): { verdict: FactCheckResult["verdict"]; overlap: number } {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const c = new Set(norm(claim));
  const e = new Set(norm(evidence));
  if (!c.size || !e.size) return { verdict: "unverified", overlap: 0 };
  let hit = 0;
  for (const w of c) if (e.has(w)) hit++;
  const overlap = hit / c.size;

  // A refutation marker in the SOURCE is the one signal strong enough to act
  // on: an encyclopaedia calling something a myth, a hoax or debunked is making
  // an explicit claim, not merely failing to mention it.
  const REFUTES = /\b(myth|misconception|debunked|hoax|pseudoscience|falsely|incorrectly|is not|are not|cannot be seen|no evidence)\b/i;
  if (overlap >= 0.35 && REFUTES.test(evidence)) return { verdict: "contradicted", overlap };

  // THIS PATH HAS NO "supported" VERDICT, and that is deliberate.
  //
  // Support is reachable only from the subject's own article, where a named
  // sentence asserts the relation (factsubject.ts). Here, where the article was
  // chosen by full-text relevance, it is not, for the reason below.
  //
  // Word overlap cannot distinguish an article ABOUT a claim from an article
  // that SUPPORTS it — the two share nearly all their content words. Raising
  // the threshold does not fix it, it only changes which claims slip through:
  // at 0.75 this rated "the Great Wall of China is visible from space" as
  // supported, and after retrieval improved it rated **"vaccines cause autism"**
  // as supported, because the article `Vaccines_and_autism` naturally contains
  // every word of the claim it exists to refute.
  //
  // A miner that asserts medical misinformation is not worth any score, and no
  // threshold on this signal is safe. Retrieval is the honest capability we
  // have: name the claim, quote the reference, and say plainly that this is a
  // lookup rather than an adjudication. `contradicted` survives only because an
  // encyclopaedia writing "myth", "debunked" or "no evidence" is an explicit
  // statement in the source rather than an inference of ours.
  return { verdict: "unverified", overlap };
}

export async function checkFact(question: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<FactCheckResult> {
  const now = new Date().toISOString();
  const claim = extractClaim(question);
  const base: FactCheckResult = {
    claim: claim || null, verdict: "unknown", confidence: 0,
    source: null, source_url: null, evidence: null, reason: "", checked_at: now,
  };

  if (!claim || claim.split(/\s+/).length < 3) {
    return {
      ...base,
      reason:
        "No specific claim was supplied with this request, so nothing could be fact-checked. " +
        "State a checkable claim, for example: Is it true that the Great Wall of China is " +
        "visible from space?",
      error: "invalid_input",
    };
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const budget = () => Math.max(0, Math.min(timeoutMs, deadline - Date.now()));

  // STEP ONE: the claim's subject, and the article that IS the subject.
  //
  // Full-text search ranks on term frequency, so it answered "Bats are the only
  // mammals capable of sustained flight" out of the article **Flight** and called
  // it unverified, while the Bat article's first sentence states the claim. The
  // subject decides which article to read; the predicate is then looked for
  // inside it. A miss here is not a verdict — it falls through to the search
  // below, which is what every earlier case is pinned on.
  const subject = await findSubjectEvidence(claim, getJson, budget()).catch(() => null);
  if (subject) {
    const opening =
      subject.verdict === "supported"
        ? `is supported by the reference source consulted`
        : `is contradicted by the reference source consulted`;
    return {
      ...base,
      verdict: subject.verdict,
      confidence: 0.7,
      source: "Wikipedia",
      source_url: subject.url,
      evidence: subject.evidence,
      reason:
        `The claim "${claim}" ${opening}. According to Wikipedia's article "${subject.title}": ` +
        `${subject.evidence.slice(0, 260)} This check consulted one encyclopaedic source and is ` +
        `not a full adjudication of the claim.`,
    };
  }

  const terms = searchTerms(claim);
  // Ask for several candidates and pick the closest, rather than trusting the
  // first. Wikipedia's top hit for "humans only use 10% of their brains" was
  // **Flight of the Navigator** — a film that quotes the myth — where the
  // article that actually addresses it ranks lower. On 2026-09-15 it ranked
  // seventh or eighth ("Ten-percent-of-the-brain myth"), outside the five this
  // used to read, so the film was cited; ten candidates keep it in reach.
  const search = budget() < 800 ? null : await getJson(
    `${WIKI_SEARCH}?action=query&list=search&srsearch=${encodeURIComponent(terms)}` +
    `&srlimit=10&format=json&origin=*`,
    budget(),
  );
  // A search that did not answer is an outage, not an absence (ARCHITECTURE A5):
  // it used to be reported as "no matching reference article was found".
  if (search === null) {
    return {
      ...base, verdict: "unknown", confidence: 0, source: "Wikipedia", error: "upstream_unavailable",
      reason:
        `The claim "${claim}" could not be checked because the reference source (Wikipedia) did not ` +
        `answer. This is an availability problem, not a finding about the claim.`,
    };
  }
  const hits = ((search["query"] as Record<string, unknown> | undefined)?.["search"] ?? []) as Array<Record<string, unknown>>;
  const title = chooseArticle(claim, hits);

  if (!title) {
    return {
      ...base,
      verdict: "unverified",
      confidence: 0.2,
      source: "Wikipedia",
      reason:
        `The claim "${claim}" could not be verified because no matching reference article was ` +
        `found in the source consulted (Wikipedia). This is an absence of evidence rather than ` +
        `evidence against the claim.`,
    };
  }

  const extract = await getJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    budget(),
  );
  const evidence = typeof extract?.["extract"] === "string" ? (extract["extract"] as string) : "";
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;

  if (!evidence) {
    return {
      ...base,
      verdict: "unverified",
      confidence: 0.2,
      source: "Wikipedia",
      source_url: url,
      reason:
        `The claim "${claim}" could not be verified: the reference article "${title}" was found ` +
        `but its summary could not be retrieved. This is a data availability problem, not a ` +
        `judgement on the claim.`,
    };
  }

  const { verdict, overlap } = judge(claim, evidence);
  // Confidence is capped well below certainty on purpose: this is one source's
  // summary, not adjudication, and the verdict vocabulary already says so.
  const confidence = verdict === "unverified" ? 0.3 : Math.min(0.75, 0.4 + overlap * 0.4);
  const lead =
    verdict === "contradicted"
      ? `is contradicted by the reference source consulted`
      : `was checked against the reference source consulted, which does not settle it either way`;

  return {
    ...base,
    verdict,
    confidence: Number(confidence.toFixed(2)),
    source: "Wikipedia",
    source_url: url,
    evidence: evidence.slice(0, 400),
    reason:
      `The claim "${claim}" ${lead}. According to Wikipedia's article "${title}": ` +
      `${evidence.slice(0, 260)} This check consulted one encyclopaedic source and is not a ` +
      `full adjudication of the claim.`,
  };
}
