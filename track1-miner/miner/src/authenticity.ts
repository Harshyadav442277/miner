/**
 * TEXT_AUTHENTICITY_CHECK — is this text original, or was it copied?
 *
 * The canonical description draws the line against the intent next door: "asks
 * whether it is genuine, original, or machine-generated. Where the user
 * explicitly asks about AI authorship, prefer AI_TEXT_DETECTION." Its worked
 * example is "Is this original writing or was it copied/plagiarized from
 * somewhere else?"
 *
 * So the question is provenance, not style, and the only honest way to answer it
 * is to go and look for the source. That is what this does: it lifts verbatim
 * word runs out of the supplied passage and asks a full-text index whether it
 * has seen them.
 *
 * WHAT IT CAN AND CANNOT ESTABLISH, stated once here so no sentence below
 * overclaims. A verbatim hit is proof of copying and names the source. A miss is
 * NOT proof of originality — it is an absence in the indexes actually searched,
 * which is a far smaller claim, and every miss-branch sentence says which
 * indexes those were. A5 forbids reporting the second as if it were the first.
 *
 * THIS INTENT HAS NO MINERS AND NO SCORED HISTORY. Its champion scorer,
 * registration 1882, was authored by this project's own Track 2 entry. That is
 * disclosed in the README and in GAPS rather than being left for someone to
 * find. No answer here is shaped to that scorer's internals; the module was
 * written from the canonical description, like every other one.
 */
import { detectAiText, extractPassage } from "./aidetect";

const TIMEOUT_MS = Number(process.env.AUTHENTICITY_TIMEOUT_MS ?? 6_000);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const WIKI_API = "https://en.wikipedia.org/w/api.php";

export type AuthenticityVerdict = "copied" | "no_source_found" | "unavailable" | "unknown";

export interface Match {
  phrase: string;
  source: string;
  url: string;
}

export interface AuthenticityResult {
  words: number;
  phrases_checked: number;
  match: Match | null;
  machine_signal: string | null;
  verdict: AuthenticityVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/**
 * Word runs long enough that a coincidental match is implausible.
 *
 * Eight words is the floor used by academic plagiarism tools, and it is the
 * floor here for the same reason: shorter runs match idiom rather than
 * authorship. Runs are taken from spread-out positions so a passage that opens
 * with a stock sentence is not judged entirely on its opening.
 */
export function shingles(passage: string, size = 9, count = 3): string[] {
  const words = String(passage ?? "").split(/\s+/).filter(Boolean);
  if (words.length < size) return [];
  const spots = Math.max(1, Math.min(count, Math.floor(words.length / size)));
  const out: string[] = [];
  for (let i = 0; i < spots; i += 1) {
    const start = Math.floor((i * (words.length - size)) / Math.max(1, spots - 1 || 1));
    const run = words
      .slice(start, start + size)
      .join(" ")
      .replace(/["“”]/g, "")
      .trim();
    if (run && !out.includes(run)) out.push(run);
  }
  return out;
}

interface WikiHit { title?: string }

/**
 * Ask Wikipedia's full-text index for an EXACT run of words.
 *
 * `insource:"..."` is a verbatim search rather than a relevance one, which is
 * the whole point — a relevance search returns the topic and would call every
 * passage about Napoleon a copy of the Napoleon article.
 */
export async function findVerbatim(phrase: string): Promise<Match | null | "unavailable"> {
  const url =
    `${WIKI_API}?action=query&list=search&format=json&srlimit=5&origin=*` +
    `&srsearch=${encodeURIComponent(`insource:"${phrase}"`)}`;
  try {
    const r = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = (await r.json()) as { query?: { search?: WikiHit[] } };
    const hits = (d.query?.search ?? []).filter((h): h is { title: string } => Boolean(h.title));
    /**
     * A disambiguation page carries the phrase only because it links to the
     * article that does. Citing it names the wrong source, which is the same
     * family of error as G77's sixty-foot Eiffel Tower in Paris, Tennessee.
     */
    const hit = hits.find((h) => !/\(disambiguation\)$/i.test(h.title)) ?? hits[0];
    if (!hit?.title) return null;
    return {
      phrase,
      source: hit.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/\s+/g, "_"))}`,
    };
  } catch {
    return "unavailable";
  }
}

/**
 * The machine-generation half, which the description also asks about.
 *
 * Carried as one clause and never as the verdict. The statistics in aidetect
 * measure style, and style is evidence about a writer rather than about a
 * source, so it cannot settle whether a passage was copied.
 */
function machineSignal(passage: string): string | null {
  const d = detectAiText(passage);
  if (d.verdict === "likely_ai") return "its sentence rhythm and formulaic phrasing are consistent with machine generation";
  if (d.verdict === "likely_human") return "its sentence-length variation is consistent with human writing";
  return null;
}

export async function checkAuthenticity(raw: string): Promise<AuthenticityResult> {
  const passage = extractPassage(raw);
  const words = passage ? passage.split(/\s+/).filter(Boolean).length : 0;
  const empty = { words, phrases_checked: 0, match: null, machine_signal: null };

  if (!passage) {
    return {
      ...empty, verdict: "unknown", confidence: 0,
      reason:
        `No passage was supplied to check. Provide the text itself, for example "Is this original ` +
        `writing or was it copied? '<passage>'", and its distinctive phrases can be searched for a ` +
        `verbatim source. Nothing was assessed, because there was nothing to assess.`,
      error: "no_text",
    };
  }

  const phrases = shingles(passage);
  if (phrases.length === 0) {
    return {
      ...empty, verdict: "unknown", confidence: 0.3,
      reason:
        `The supplied passage is ${words} words, which is too short to check for copying. A verbatim ` +
        `search needs a run of at least nine consecutive words to be meaningful; below that a match ` +
        `is idiom rather than evidence of a source.`,
      error: "text_too_short",
    };
  }

  const results = await Promise.all(phrases.map(findVerbatim));
  const found = results.filter((r): r is Match => r !== null && r !== "unavailable");
  /**
   * Prefer a real article over a disambiguation page ACROSS PHRASES, not only
   * within one.
   *
   * `insource:` searches wikitext, so a phrase that opens an article is often
   * broken there by bold markup and links while a page that merely quotes it is
   * matched cleanly. Measured: the opening of the Eiffel Tower article matches
   * "Tour Eiffel (disambiguation)" and not the article itself, while a phrase
   * from the middle of the same passage matches the article. Taking the first
   * hit therefore cites the weakest source available.
   */
  const match = found.find((m) => !/\(disambiguation\)$/i.test(m.source)) ?? found[0] ?? null;
  const allDown = results.every((r) => r === "unavailable");
  const signal = machineSignal(passage);

  if (match) {
    return {
      words, phrases_checked: phrases.length, match, machine_signal: signal,
      verdict: "copied", confidence: 0.9,
      reason:
        `This text is not original. The phrase "${match.phrase}" appears verbatim in the Wikipedia ` +
        `article "${match.source}", so at least that part of the passage was reproduced from an ` +
        `existing source rather than written fresh.`,
    };
  }

  if (allDown) {
    return {
      ...empty, phrases_checked: phrases.length, machine_signal: signal,
      verdict: "unavailable", confidence: 0,
      reason:
        `The full-text index did not answer, so this passage was not checked for copying and nothing ` +
        `is claimed about it. That is a search outage rather than a finding of originality, and the ` +
        `two are not the same thing.`,
      error: "upstream_unavailable",
    };
  }

  const tail = signal ? ` On style alone, ${signal}.` : "";
  return {
    words, phrases_checked: phrases.length, match: null, machine_signal: signal,
    verdict: "no_source_found", confidence: 0.7,
    reason:
      `No verbatim source was found for this ${words}-word passage: ${phrases.length} distinctive ` +
      `nine-word phrases from it were searched against Wikipedia's full-text index and none appears ` +
      `there. That is an absence in the index searched, not proof the text is original.${tail}`,
  };
}
