/**
 * Current headlines, from Google News RSS.
 *
 * NEWS_HEADLINES questions ask for real, current, topical headlines — "the
 * current top technology news headlines from Japan as of today". The one
 * registered miner scores between 0.000 and 0.003 on them, so the bar is a
 * source that actually returns today's articles.
 *
 * Google News RSS needs no key and no account, and the host is fixed, so there
 * is no SSRF surface: only the query string varies.
 */

import { headlineCount, headlineWindow } from "./news-constraints";

const FEED = "https://news.google.com/rss/search";
const DEFAULT_TIMEOUT_MS = 8000;

// The locale parameters (hl/gl/ceid) make this feed return an empty channel —
// 1126 bytes and zero items — while the same query without them returns 100.
// The user-agent turned out not to matter; an earlier guess that it did was wrong.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface Headline {
  title: string;
  source: string | null;
  published: string | null;
}

export interface NewsResult {
  topic: string | null;
  region: string | null;
  verdict: string;
  headlines: Headline[];
  count: number;
  confidence: number;
  reason: string;
  checked_at: string;
}

const TOPICS = [
  "technology", "business", "finance", "science", "health", "sports",
  "politics", "entertainment", "world", "crypto", "energy", "climate", "ai",
];

/** Words a caller uses to mean "any news", which are not a subject to search for. */
const GENERIC_TOPIC = new Set([
  "news", "headlines", "headline", "top stories", "stories", "top news", "general", "latest",
  "latest news", "top headlines", "current events", "breaking news", "any", "all",
  // "headlines about happening in India today" (routed 2026-10-10): once the
  // locative tail is gone the phrase is a verb, and the feed was searched for it.
  "happening", "what's happening", "whats happening", "what is happening", "going on",
  "current affairs",
]);

/** Time words and locative tails that trail a subject phrase but are not part of it. */
const SUBJECT_TAIL =
  /[\s,]*\b(?:today|tonight|yesterday|this (?:week|month|morning|year)|right now|now|currently|as of\b.*|from\b.*|in\b.*|for\b.*|published\b.*|dated\b.*)$/i;

/**
 * The subject the question asks about.
 *
 * The fixed topic list matches first, so every recorded question shape ("top 5
 * technology headlines from Japan as of today") is answered exactly as before.
 * Anything else used to be dropped and the feed queried for "top stories", so a
 * question about semiconductors got MLB scores and a hospital shooting (GAPS
 * G68). The declared `topic` parameter — which the engine fills from the
 * question — is now honoured verbatim, and failing that the noun phrase after
 * about/on/regarding is the subject.
 */
export function extractTopic(text: string, declared = ""): string | null {
  const s = String(text ?? "").toLowerCase();
  for (const t of TOPICS) if (new RegExp(String.raw`\b` + t + String.raw`\b`).test(s)) return t;
  const clean = (phrase: string): string | null => {
    const p = phrase.replace(SUBJECT_TAIL, "").replace(/[\s,;:.?!]+$/, "").trim();
    if (!p || p.length > 60 || GENERIC_TOPIC.has(p.toLowerCase())) return null;
    return p;
  };
  const d = clean(String(declared ?? ""));
  if (d) return d;
  const m = String(text ?? "").match(/\b(?:about|on|regarding|concerning|related to|covering)\s+([^?.!:;]{2,80})/i);
  if (m?.[1]) return clean(m[1]);
  // "Give three spaceflight news headlines…", "top 5 semiconductor headlines": the
  // subject is the phrase in front of the news noun, once the count and the
  // request words in front of it are gone. Without this, that question class
  // was answered with generic top stories (the engine does not always pass `topic`).
  const before = String(text ?? "").match(/(?:^|\b)((?:[A-Za-z0-9][A-Za-z0-9&'’-]*\s+){1,5})(?:news\s+)?(?:headlines?|stories|news)\b/i);
  if (!before?.[1]) return null;
  const words = before[1].trim().split(/\s+/);
  while (words.length && LEAD_WORDS.has(words[0]!.toLowerCase())) words.shift();
  if (words.length && /^news$/i.test(words[words.length - 1]!)) words.pop();
  return words.length ? clean(words.join(" ")) : null;
}

/** Request words that precede a subject phrase and are not part of it. */
const LEAD_WORDS = new Set([
  "give", "show", "tell", "list", "find", "get", "fetch", "provide", "share", "me", "us", "the",
  "a", "an", "some", "any", "top", "latest", "current", "breaking", "recent", "first", "major",
  "biggest", "main", "key", "important", "today's", "todays", "please", "what", "are", "is",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
]);

/** Multi-word world regions, matched whatever their case. "Southeast Asia" precedes "East Asia". */
const WORLD_REGIONS = [
  "Southeast Asia", "South Asia", "East Asia", "Central Asia", "Asia Pacific", "Middle East",
  "North Africa", "West Africa", "East Africa", "Sub-Saharan Africa", "Latin America",
  "South America", "North America", "Central America", "Eastern Europe", "Western Europe",
];

/**
 * A place named in the question, as a proper noun that is not a time word.
 * A proper noun that is part of the subject ("Shopify") is not a region.
 */
export function extractRegion(text: string, topic: string | null = null): string | null {
  const s = String(text ?? "");
  const inTopic = (name: string): boolean =>
    !!topic && !TOPICS.includes(topic) && topic.toLowerCase().includes(name.toLowerCase());
  // Question words and verbs capitalised only because they open the sentence.
  // "What are the top news headlines today?" used to make the region "What",
  // and the answer read "The top headlines from What today".
  const stop = new Set([
    "give", "me", "the", "current", "top", "latest", "news", "headlines", "as", "of", "today",
    "what", "which", "who", "where", "when", "how", "why", "are", "is", "can", "could", "would",
    "please", "show", "tell", "list", "find", "get", "fetch", "provide", "share", "summarize",
    "summarise", "any", "some", "this", "that", "there", "right", "now", "recent", "major",
    "breaking", "stories", "story", "update", "updates", "about", "regarding", "world", "global",
    "international", "local", "important", "biggest", "main", "key",
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december",
  ]);
  // Callers do not capitalise world regions: "happening in Southeast asia today"
  // answered "headlines from Southeast" (2026-10-10).
  for (const r of WORLD_REGIONS) {
    if (new RegExp(String.raw`\b` + r.replace(/[ -]/g, "[\\s-]+") + String.raw`\b`, "i").test(s) && !inTopic(r)) return r;
  }
  // "from the Middle East" used to fall through to the single-word scan below and
  // answer "headlines from Middle"; the article is not part of the place.
  const m = s.match(/\b(?:from|in|for)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (m?.[1] && !stop.has(m[1].toLowerCase()) && !inTopic(m[1])) return m[1];
  for (const n of s.matchAll(/\b([A-Z][a-z]{2,})\b/g)) {
    const v = n[1]!;
    if (!stop.has(v.toLowerCase()) && !inTopic(v)) return v;
  }
  return null;
}

export function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Titles arrive as "Headline text - Publisher". */
export function splitSource(title: string): { title: string; source: string | null } {
  const i = title.lastIndexOf(" - ");
  if (i > 20) return { title: title.slice(0, i).trim(), source: title.slice(i + 3).trim() };
  return { title: title.trim(), source: null };
}

export async function getHeadlines(
  query: string,
  limit = 6,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  declaredTopic = "",
): Promise<NewsResult> {
  const now = new Date().toISOString();
  const topic = extractTopic(query, declaredTopic);
  const region = extractRegion(query, topic);
  // "top 5 headlines" is a count, and an answer with six items did not honour it.
  const wantN = headlineCount(String(query ?? ""));
  const window = headlineWindow(query, Date.parse(now));
  const terms = [topic, region].filter(Boolean).join(" ") || "top stories";
  // The feed ranks by relevance, so the hundred items for "sports Middle East"
  // held none from the last day and "today" was answered with nothing
  // (2026-10-10). A window ending now is asked of the feed itself; the filter
  // below still enforces it.
  const recent = window && window.end >= Date.parse(now) - 300000
    ? ` when:${Math.max(1, Math.ceil((window.end - window.start) / 86400000))}d`
    : "";

  const url = `${FEED}?q=${encodeURIComponent(terms + recent)}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  let xml = "";
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { "user-agent": UA, accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    xml = await res.text();
  } finally {
    clearTimeout(t);
  }

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  const headlines: Headline[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const block = it[1] ?? "";
    const rawTitle = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1];
    if (!rawTitle) continue;
    const { title, source } = splitSource(decode(rawTitle));
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    const at = pub ? Date.parse(pub) : NaN;
    if (Number.isFinite(at) && at > Date.parse(now)+300000) continue;
    if (window && (!Number.isFinite(at) || at < window.start || at > window.end)) continue;
    const key = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    headlines.push({ title, source, published: Number.isFinite(at) ? new Date(at).toISOString() : null });
  }
  headlines.sort((a,b) => Date.parse(b.published ?? "")-Date.parse(a.published ?? ""));
  headlines.splice(wantN ?? limit);

  const day = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  // "top 5 technology headlines from Japan", numbered like a person would list
  // them — the questions ask "top N ... from <place> as of today" in exactly
  // those words, and the answer should read as directly addressing each one.
  const subject = topic ? `${topic} ` : "";
  const where = region ? ` from ${region}` : "";
  const countWord = wantN ? `${headlines.length} ` : "";
  // An undated question gets no period word: "headlines from Japan available" is not English.
  const period = window ? ` ${window.label}` : "";

  const reason = headlines.length
    ? `The top ${countWord}${subject}headlines${where}${period}, as of ${day}, are: ` +
      headlines.map((h, i) => `${i + 1}. ${h.title}${h.source ? ` (${h.source}${h.published ? `, ${h.published.slice(0,10)}` : ""})` : ""}.`).join(" ") +
      (wantN && headlines.length < wantN ? ` Only ${headlines.length} matching headlines were found out of ${wantN} requested.` : "")
    : `No ${subject}headlines${where}${period} could be retrieved as of ${day}.`;

  return {
    topic,
    region,
    verdict: headlines.length ? "headlines" : "unknown",
    headlines,
    count: headlines.length,
    confidence: headlines.length ? 1 : 0,
    reason,
    checked_at: now,
  };
}
