/**
 * WEB_SEARCH — a question that needs current, externally sourced information.
 *
 * The canonical description: "needs current, live, or externally-sourced
 * information not reliably answerable from static knowledge", with "What's the
 * latest news on the Fed's interest rate decision?" as its example.
 *
 * NO MODEL, SO NO SYNTHESIS. The answer is extractive: it quotes the most
 * relevant current reports verbatim, with publisher and date, so every clause can
 * be checked, and adds one encyclopedia sentence for background when the subject
 * has an article. Nothing is paraphrased and nothing is predicted.
 *
 * TWO DOCUMENTED ANONYMOUS SOURCES, queried together:
 *   Google News RSS — through newssearch.ts, which already carries the relevance
 *                     filter that stops a nearby-but-wrong article being cited.
 *   Wikipedia REST  — through research.ts, accepted only when the article title
 *                     contains the entity asked about.
 * No HTML result page of any commercial search engine is fetched.
 *
 * WHAT THE ROUTED QUESTIONS ARE, read from the explorer feed 2026-09-12: 70, and
 * 64 of them are forward-looking ("Will MK-2870 receive FDA approval?", "Will
 * Sony lose digital game ownership lawsuit?"). Nobody can answer those with a
 * fact, so the answer reports what the latest coverage says and states that it
 * is coverage, not a prediction. Three are misroutes (a TLS certificate check, two
 * scholarly-literature searches) and are refused by name.
 *
 * MEASURED BEFORE BUILDING (EXPANSION_MATRIX.md): champion 2789 scored prose
 * 0.833, a headline list 0.167 and static knowledge ~1e-11 against authored
 * ground truths. Those are authored, not real, so they chose nothing here.
 */
import { searchNews, type Article } from "./newssearch";
import { findEncyclopedia, namedEntity } from "./research";

/**
 * 4.5 s, not newssearch's own 8 s: a "latest" question can take a second,
 * widened pass after an empty first one, and two 8 s passes would outrun the
 * route's 11 s watchdog before either failed.
 */
const NEWS_TIMEOUT_MS = Number(process.env.WEBSEARCH_NEWS_TIMEOUT_MS ?? 4_500);

export type WebSearchVerdict = "answered" | "no_results" | "out_of_scope" | "unknown";

export interface WebSearchResult {
  articles: Article[];
  background: string | null;
  verdict: WebSearchVerdict;
  confidence: number;
  reason: string;
  error?: string;
}

/** Questions another intent exists to answer, named so the refusal says where they belong. */
const MISROUTES: Array<[RegExp, string]> = [
  [/\b(?:ssl|tls)\b[\s\S]{0,40}\bcertificate\b|\bcertificate\b[\s\S]{0,40}\b(?:ssl|tls)\b/i, "a TLS certificate check of a named host, which is SSL_VERIFICATION"],
  [/\b(?:scholarly|peer-?reviewed|academic)\s+(?:literature|papers?|articles?|journals?)\b/i, "a search of scholarly literature, which is ACADEMIC_SEARCH"],
  [/\bCVE-\d{4}-\d{4,7}\b/i, "a lookup of one CVE record, which is CVE_LOOKUP"],
  [/\b0x[a-fA-F0-9]{64}\b/, "a transaction lookup, which is ONCHAIN_TX_LOOKUP"],
];

/** Words that make a definition-shaped question need current information after all. */
const CURRENT = /\b(?:latest|current(?:ly)?|today|now|recent(?:ly)?|news|this\s+(?:week|month|year)|20\d\d|yesterday|tomorrow|live|price|rate\s+decision)\b/i;

export function misroute(text: string): string | null {
  const s = String(text ?? "");
  const hit = MISROUTES.find(([re]) => re.test(s))?.[1];
  if (hit) return hit;
  // The canonical "Not" example: "Explain what an interest rate is." is static
  // knowledge, which is CHAT_COMPLETION.
  if (/^\s*(?:explain|define|what\s+(?:is|are)\s+(?:an?\s|the\s+(?:meaning|definition)\s+of\s))/i.test(s) && !CURRENT.test(s)) {
    return "a request to explain a concept from static knowledge, which is CHAT_COMPLETION";
  }
  return null;
}

/** "Will X…?", "Is X going to…?" — an outcome no source can state as fact yet. */
export function isForwardLooking(text: string): boolean {
  return /^\s*(?:will|would|is\s+[\w' ]{1,40}\s+going\s+to|are\s+[\w' ]{1,40}\s+going\s+to)\b/i.test(String(text ?? ""));
}

const fmtDate = (iso: string | null): string => {
  if (!iso) return "date not stated";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "date not stated"
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/** A headline, cut at a word boundary so one long title cannot fill the scored window alone. */
export function clipTitle(title: string, words = 18): string {
  const w = String(title ?? "").trim().split(/\s+/);
  return w.length <= words ? w.join(" ") : `${w.slice(0, words).join(" ").replace(/[,;:.—-]+$/, "")}…`;
}

export const cite = (a: Article): string => `"${clipTitle(a.title)}" (${a.source ?? "publisher not stated"}, ${fmtDate(a.published)})`;

/**
 * An encyclopedia sentence only when its article is ABOUT the entity. Asked
 * "Who is the current Secretary-General of the United Nations?", the entity
 * resolved to Wikipedia's "Secretary (title)", which is the wrong subject; the
 * title-contains-entity test drops it.
 */
export function acceptBackground(entity: string | null, title: string, source: string): string | null {
  if (!entity || !title.toLowerCase().includes(entity.toLowerCase())) return null;
  const sentence = source.replace(/^Wikipedia:\s*/, "").trim();
  /**
   * The entity must appear with its OWN capitalisation. Asked "Will Apple release
   * Neural Engine details?", the article titled "Apple" opens "An apple is the
   * round, edible fruit of an apple tree": a common noun is written lower-case,
   * the company would not be, and that is the whole difference between the two.
   */
  if (!sentence.includes(entity)) return null;
  return sentence.length >= 20 ? sentence : null;
}

/**
 * Product and trial codes — MK-2870, ABBV-706, SAR441566. A question that names
 * one is about that exact asset, and a headline about the same company's other
 * drug is not evidence about it: measured 2026-09-12, "Will AbbVie's ABBV-706
 * succeed in Phase 3?" was answered with AbbVie's etentamig myeloma results.
 */
export function codeTokens(text: string): string[] {
  return (String(text ?? "").match(/\b[A-Za-z]{1,6}-?\d{2,}(?:-\d+)*[A-Za-z]?\b/g) ?? [])
    .filter((t) => /[A-Za-z]/.test(t) && /\d/.test(t) && t.length >= 4);
}

const squash = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function namesCode(title: string, codes: string[]): boolean {
  return codes.length === 0 || codes.some((c) => squash(title).includes(squash(c)));
}

export async function webSearch(question: string): Promise<WebSearchResult> {
  const q = String(question ?? "").trim();
  const empty = { articles: [] as Article[], background: null };
  if (!q) {
    return {
      ...empty, verdict: "unknown", confidence: 0, error: "no_query",
      reason: "No question was supplied with this request, so nothing was searched. Ask something that needs current information, for example: What's the latest news on the Fed's interest rate decision?",
    };
  }
  const elsewhere = misroute(q);
  if (elsewhere) {
    return {
      ...empty, verdict: "out_of_scope", confidence: 0.6, error: "out_of_scope",
      reason: `This request is ${elsewhere}, not a web search, so no search was run and no answer was substituted for it.`,
    };
  }

  const entity = namedEntity(q);
  const [news, wiki] = await Promise.all([
    searchNews(q, "", null, 3, NEWS_TIMEOUT_MS).catch(() => null),
    entity ? findEncyclopedia(entity).catch(() => "unavailable" as const) : Promise.resolve(null),
  ]);
  const codes = codeTokens(q);
  const articles = news?.verdict === "articles" ? news.articles.filter((a) => namesCode(a.title, codes)).slice(0, 2) : [];
  const background = wiki && wiki !== "unavailable" ? acceptBackground(entity, wiki.title, wiki.source) : null;
  const newsDown = !news || news.error === "provider_unavailable";
  const wikiDown = wiki === "unavailable";
  const future = isForwardLooking(q);
  const caveat = future ? " Whether it will happen is not settled by these sources; this reports coverage, not a prediction." : "";

  if (articles.length) {
    const lead = articles.length === 1
      ? `The most relevant current report is ${cite(articles[0] as Article)}.`
      : `The most relevant current reports are ${cite(articles[0] as Article)} and ${cite(articles[1] as Article)}.`;
    return {
      articles, background, verdict: "answered", confidence: 0.8,
      // No encyclopedia clause beside current reports: it would spend the
      // ~32 scored words on static background the intent is defined against.
      reason: `${lead}${caveat} Source: Google News search.`,
    };
  }

  if (background) {
    const note = newsDown ? " The news index did not answer, so no current reporting is included." : " No current news report on this subject was found.";
    return {
      articles, background, verdict: "answered", confidence: 0.5,
      reason: `According to Wikipedia: ${background}${note}${caveat}`,
    };
  }

  /**
   * An absence is only reported over sources that were read. Measured 2026-09-13
   * (verifier): with Google News down and Wikipedia's article rejected as off
   * subject, the answer said nothing was found "in Google News or Wikipedia",
   * though Google News was never read. News is the primary source for this
   * intent, so its outage is an outage whatever Wikipedia said.
   */
  if (newsDown) {
    return {
      ...empty, verdict: "unknown", confidence: 0, error: "upstream_unavailable",
      reason: "Google News, the current-reporting source, did not answer, so no current information was retrieved for this question. That is a data outage, not a finding that no information exists.",
    };
  }

  const about = entity ? ` about ${entity}` : codes[0] ? ` about ${codes[0]}` : "";
  const read = entity && !wikiDown ? "Google News or Wikipedia" : "Google News";
  const wikiGap = entity && wikiDown ? " Wikipedia did not answer, so it was not checked." : "";
  return {
    ...empty, verdict: "no_results", confidence: 0.4,
    reason: `No current report${entity && !wikiDown ? " or encyclopedia article" : ""}${about} matching this question was found in ${read}, so no answer is given rather than an unrelated one. That is an absence in ${read === "Google News" ? "that source" : "those two sources"}, not proof that nothing has been published.${wikiGap}`,
  };
}
