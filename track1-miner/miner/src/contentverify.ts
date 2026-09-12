/**
 * CONTENT_VERIFICATION — is this supplied content genuine and unaltered?
 *
 * The canonical description: a specific piece of supplied content — "the text of
 * a press release", "a copy of a contract clause" — and whether it is "the
 * genuine, unaltered version", covering provenance and integrity rather than
 * media forensics (DEEPFAKE_DETECTION).
 *
 * INTEGRITY IS ONLY PROVABLE AGAINST A REFERENCE. Text carries no signature of
 * its own, so this module answers from the references a question can supply or a
 * public index can hold, strongest first, and says which one it used:
 *   1. A digest supplied with the text (SHA-256, SHA-1, MD5): recomputed over
 *      the exact quoted text. A match proves it is unaltered relative to that
 *      digest; a mismatch proves it differs.
 *   2. Two versions supplied together: a word-level comparison names what
 *      changed.
 *   3. Neither: distinctive nine-word runs find a candidate published text in
 *      Wikisource or Wikipedia, and the WHOLE passage is then compared with that
 *      text in overlapping six-word windows. No candidate is an absence in those
 *      indexes and NEVER a finding of tampering.
 *
 * THIS INTENT'S ONLY MINER SCORES 0.0 EVERY EPOCH: faceplus answers HTTP 400
 * (failure_reason, /scores, epochs 319-326). No routed question was found in
 * 1,950 feed rows read on 2026-09-12, so this is built to the description alone.
 */
import { createHash } from "node:crypto";
import { shingles } from "./authenticity";
import { normWords, plainWords, quotedSpans, unmatchedWindows, wordDiff } from "./contentverify-text";

const TIMEOUT_MS = Number(process.env.CONTENT_VERIFY_TIMEOUT_MS ?? 4_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const WIKIS: Record<string, string> = {
  Wikisource: "https://en.wikisource.org",
  Wikipedia: "https://en.wikipedia.org",
};

export type ContentVerdict =
  | "unaltered" | "altered" | "matches_published_source" | "differs_from_published_source"
  | "unverified" | "out_of_scope" | "unknown";

export interface ContentVerifyResult {
  verdict: ContentVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

const MEDIA = /\b(?:image|photo|picture|video|audio|deepfake|jpe?g|png|mp4|mov)\b/i;

/** A digest the question supplies, with its algorithm. */
export function suppliedDigest(text: string): { algo: "sha256" | "sha1" | "md5"; hex: string } | null {
  const s = String(text ?? "");
  const pick = (algo: "sha256" | "sha1" | "md5", re: RegExp, name: RegExp) => {
    if (!name.test(s)) return null;
    const hex = s.match(re)?.[0];
    return hex ? { algo, hex: hex.toLowerCase() } : null;
  };
  return pick("sha256", /\b[a-fA-F0-9]{64}\b/, /\bsha-?256\b/i)
    ?? pick("sha1", /\b[a-fA-F0-9]{40}\b/, /\bsha-?1\b/i)
    ?? pick("md5", /\b[a-fA-F0-9]{32}\b/, /\bmd5\b/i);
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Titles in one wiki that contain this exact run of words. "unavailable" is an outage. */
async function verbatimTitles(wiki: string, phrase: string): Promise<string[] | "unavailable"> {
  try {
    const d = (await getJson(
      `${WIKIS[wiki]}/w/api.php?action=query&list=search&format=json&srlimit=5&origin=*&srsearch=${encodeURIComponent(`insource:"${phrase}"`)}`,
    )) as { query?: { search?: { title?: string }[] } };
    return (d.query?.search ?? []).map((h) => h.title ?? "").filter((t) => t && !/\(disambiguation\)$/i.test(t));
  } catch {
    return "unavailable";
  }
}

/** The current wikitext of one page, or null. */
async function wikitext(wiki: string, title: string): Promise<string | null> {
  try {
    const d = (await getJson(
      `${WIKIS[wiki]}/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(title)}`,
    )) as { query?: { pages?: { revisions?: { slots?: { main?: { content?: string } } }[] }[] } };
    return d.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? null;
  } catch {
    return null;
  }
}

/** Structured parameters, used as given. */
export interface Supplied { content?: string; original?: string; digest?: string }

/** A digest parameter, its algorithm read from its length. */
export function digestParam(d: string): { algo: "sha256" | "sha1" | "md5"; hex: string } | null {
  const hex = String(d ?? "").trim();
  if (!/^[a-fA-F0-9]+$/.test(hex)) return null;
  const algo = hex.length === 64 ? "sha256" : hex.length === 40 ? "sha1" : hex.length === 32 ? "md5" : null;
  return algo ? { algo, hex: hex.toLowerCase() } : null;
}

export interface Found { wiki: string; phrase: string; titles: string[] }

/** The candidate published text holding the most runs. Pure over the search results. */
export function bestSource(found: Found[]): { wiki: string; title: string; hits: number } | null {
  const tally = new Map<string, { wiki: string; title: string; hits: number }>();
  for (const f of found) {
    for (const t of f.titles) {
      const k = `${f.wiki}|${t}`;
      const e = tally.get(k) ?? { wiki: f.wiki, title: t, hits: 0 };
      e.hits += 1;
      tally.set(k, e);
    }
  }
  // Wikisource first on a tie: it holds primary documents; Wikipedia often only quotes them.
  const ranked = [...tally.values()].sort((a, b) => b.hits - a.hits || (a.wiki === "Wikisource" ? -1 : 1));
  return ranked[0] ?? null;
}

/**
 * Structured parameters are used AS GIVEN and never re-quoted into the question.
 * Measured 2026-09-13 (verifier): wrapping `content` in double quotes and
 * re-reading it cut a clause at its first defined term ("Supplier"), so genuine
 * text with its correct SHA-256 was declared altered at 0.99.
 */
export async function verifyContent(question: string, supplied: Supplied = {}): Promise<ContentVerifyResult> {
  const q = String(question ?? "").trim();
  const content = supplied.content && supplied.content.trim().length >= 20 ? supplied.content : "";
  const original = supplied.original && supplied.original.trim().length >= 20 ? supplied.original.trim() : "";
  const quoted = quotedSpans(q);
  // An `original` goes first so a comparison reads "original word became supplied word".
  const spans = content
    ? (original ? [original, content.trim()] : [content])
    : (original && quoted[0] ? [original, quoted[0]] : quoted);
  const passage = spans[0] ?? "";

  if (MEDIA.test(q) && !passage) {
    return {
      verdict: "out_of_scope", confidence: 0.6, error: "media_not_text",
      reason: "This asks about an image, audio or video file, which is media forensics (DEEPFAKE_DETECTION or MEDIA_AUTHENTICITY_CHECK), not verification of supplied text, so no verdict was given.",
    };
  }
  if (!passage) {
    return {
      verdict: "unknown", confidence: 0, error: "no_content",
      reason: "No content was supplied to verify. Quote the text itself, for example: Here is a contract clause: '...'. Is this the original wording? Nothing was assessed, because there was nothing to assess.",
    };
  }

  const digest = (supplied.digest ? digestParam(supplied.digest) : null) ?? suppliedDigest(q);
  if (digest) {
    const target = content || passage;
    const actual = createHash(digest.algo).update(target, "utf8").digest("hex");
    const name = digest.algo.toUpperCase().replace(/^SHA/, "SHA-");
    const over = content ? "the exact supplied text" : "the exact quoted text";
    return actual === digest.hex
      ? { verdict: "unaltered", confidence: 0.99, reason: `Yes, the supplied text is unaltered relative to the ${name} digest given: recomputed over ${over} in UTF-8 it is ${actual}, which matches. That proves integrity against the digest, not who issued it.` }
      : { verdict: "altered", confidence: 0.99, reason: `No, the supplied text does not match the ${name} digest given: recomputed over ${over} in UTF-8 it is ${actual}, not ${digest.hex}. Even one changed character or space changes the digest.` };
  }

  if (spans.length >= 2) {
    const d = wordDiff(spans[0] ?? "", spans[1] ?? "");
    const tail = " That compares the versions given; it does not establish which one the issuer published.";
    return d.length === 0
      ? { verdict: "unaltered", confidence: 0.95, reason: `Yes, the two supplied versions are word-for-word identical, so the second is unaltered relative to the first.${tail}` }
      : { verdict: "altered", confidence: 0.95, reason: `No, the two supplied versions differ in ${d.length} place${d.length === 1 ? "" : "s"}: ${d.slice(0, 3).join("; ")}.${tail}` };
  }

  const phrases = shingles(passage);
  if (phrases.length === 0) {
    return {
      verdict: "unverified", confidence: 0.3, error: "text_too_short",
      reason: "The supplied text is too short to check against published sources: a verbatim search needs at least nine consecutive words. Its integrity cannot be established without the original or a digest to compare against.",
    };
  }

  const searches = await Promise.all(Object.keys(WIKIS).flatMap((wiki) =>
    phrases.map(async (phrase) => ({ wiki, phrase, titles: await verbatimTitles(wiki, phrase) }))));
  if (searches.every((s) => s.titles === "unavailable")) {
    return {
      verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: "The published-text indexes did not answer, so the supplied text was not compared with any source. That is a search outage, not a finding that the text is genuine or altered.",
    };
  }
  const best = bestSource(searches.filter((s): s is Found => s.titles !== "unavailable"));
  /**
   * An absence is only claimed over searches that ran. Measured 2026-09-13
   * (verifier): with Wikisource down and Wikipedia empty, the answer said no run
   * "appears verbatim in Wikisource or Wikipedia", though Wikisource was never read.
   */
  const down = [...new Set(searches.filter((s) => s.titles === "unavailable").map((s) => s.wiki))];
  if (!best && down.length) {
    return {
      verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: `The supplied text could not be fully checked: ${down.join(" and ")} did not answer every search, and no published copy was found in what did answer. That is a search outage, not a finding that the text is genuine or altered.`,
    };
  }
  if (!best) {
    return {
      verdict: "unverified", confidence: 0.5,
      reason: `Its authenticity cannot be confirmed: none of ${phrases.length} distinctive nine-word runs from the supplied text appears verbatim in Wikisource or Wikipedia. That is not evidence of tampering; check it against the issuer's own published copy or a digest.`,
    };
  }

  const source = await wikitext(best.wiki, best.title);
  if (!source) {
    return {
      verdict: "unverified", confidence: 0.3, error: "source_unavailable",
      reason: `Not confirmed: parts of the supplied text appear verbatim in the ${best.wiki} text "${best.title}", but that text could not be read for a full comparison, so a change elsewhere in the passage cannot be ruled out.`,
    };
  }
  const words = normWords(passage);
  const missing = unmatchedWindows(words, plainWords(source));
  if (missing.length === 0) {
    return {
      verdict: "matches_published_source", confidence: 0.85,
      reason: `Yes, the supplied ${words.length}-word text matches published wording: every six-word window of it appears verbatim in the ${best.wiki} text "${best.title}". That source is a published copy, not necessarily the issuer's own.`,
    };
  }
  /**
   * A located edit is a minority of windows. When most windows are missing, the
   * source only quotes part of the passage, or formats it differently, and that
   * is not evidence of alteration — so it is reported as unconfirmed instead.
   */
  const windows = Math.max(1, Math.ceil((words.length - 6) / 3) + 1);
  if (missing.length * 2 > windows) {
    return {
      verdict: "unverified", confidence: 0.4,
      reason: `Not confirmed: the ${best.wiki} text "${best.title}" contains parts of the supplied text but not most of it (${missing.length} of ${windows} six-word windows are absent), so it is a partial quotation rather than a full copy to compare against.`,
    };
  }
  return {
    verdict: "differs_from_published_source", confidence: 0.7,
    reason: `No, the supplied text differs from the published ${best.wiki} text "${best.title}": the wording "${missing[0]}" does not appear there${missing.length > 1 ? `, nor do ${missing.length - 1} other six-word windows` : ""}, while the rest of the passage does.`,
  };
}
