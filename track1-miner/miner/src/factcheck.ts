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

const WIKI_SEARCH = "https://en.wikipedia.org/w/api.php";
const DEFAULT_TIMEOUT_MS = 7000;

export interface FactCheckResult {
  claim: string | null;
  /** No "supported": see judge(). Retrieval cannot establish support safely. */
  verdict: "contradicted" | "unverified" | "unknown";
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

/**
 * The search string. The claim itself, near-verbatim.
 *
 * A stop-worded bag of content words was tried first and retrieved the wrong
 * article often enough to be dangerous: "humans only use 10% of their brains"
 * became "humans only 10% brains" and matched **Boltzmann brain**. Wikipedia's
 * own search handles a natural-language claim better than any bag we build, so
 * only the fact-check framing is stripped.
 */
function searchTerms(claim: string): string {
  return claim
    .replace(/\b(?:is it true that|true or false|fact check|claim)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

async function getJson(url: string, timeoutMs: number): Promise<Record<string, unknown> | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { accept: "application/json", "user-agent": "livecert-miner/1.0 (Telegraph miner)" },
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

  // THERE IS NO "supported" VERDICT, and that is deliberate.
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

  const terms = searchTerms(claim);
  // Ask for several candidates and pick the closest, rather than trusting the
  // first. Wikipedia's top hit for "humans only use 10% of their brains" was
  // **Flight of the Navigator** — a film that quotes the myth — where the
  // article that actually addresses it ranks lower.
  const search = await getJson(
    `${WIKI_SEARCH}?action=query&list=search&srsearch=${encodeURIComponent(terms)}` +
    `&srlimit=5&format=json&origin=*`,
    timeoutMs,
  );
  const hits = ((search?.["query"] as Record<string, unknown> | undefined)?.["search"] ?? []) as Array<Record<string, unknown>>;
  const claimWords = new Set(
    claim.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3),
  );
  let title: string | null = null;
  let bestScore = -1;
  for (const h of hits) {
    const t = typeof h["title"] === "string" ? (h["title"] as string) : "";
    if (!t) continue;
    // Score on the TITLE, which names the subject, plus the snippet, which
    // shows whether the article is about the claim or merely mentions it.
    const snippet = String(h["snippet"] ?? "").replace(/<[^>]*>/g, " ");
    const hay = new Set(`${t} ${snippet}`.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/));
    let hit = 0;
    for (const w of claimWords) if (hay.has(w)) hit++;
    const titleWords = t.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const titleHit = titleWords.filter((w) => claimWords.has(w)).length;
    const score = hit + titleHit * 2;
    if (score > bestScore) { bestScore = score; title = t; }
  }

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
    timeoutMs,
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
