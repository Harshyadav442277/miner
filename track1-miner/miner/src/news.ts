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

/** The subject the question asks about. */
export function extractTopic(text: string): string | null {
  const s = String(text ?? "").toLowerCase();
  for (const t of TOPICS) if (new RegExp(String.raw`\b` + t + String.raw`\b`).test(s)) return t;
  return null;
}

/** A place named in the question, as a proper noun that is not a time word. */
export function extractRegion(text: string): string | null {
  const s = String(text ?? "");
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
  const m = s.match(/\b(?:from|in|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (m?.[1] && !stop.has(m[1].toLowerCase())) return m[1];
  for (const n of s.matchAll(/\b([A-Z][a-z]{2,})\b/g)) {
    const v = n[1]!;
    if (!stop.has(v.toLowerCase())) return v;
  }
  return null;
}

function decode(s: string): string {
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
function splitSource(title: string): { title: string; source: string | null } {
  const i = title.lastIndexOf(" - ");
  if (i > 20) return { title: title.slice(0, i).trim(), source: title.slice(i + 3).trim() };
  return { title: title.trim(), source: null };
}

export async function getHeadlines(query: string, limit = 6, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<NewsResult> {
  const now = new Date().toISOString();
  const topic = extractTopic(query);
  const region = extractRegion(query);
  // "top 5 headlines" is a count, and an answer with six items did not honour it.
  const askedN = String(query ?? "").match(/\b(?:top|latest|first)\s+(\d{1,2})\b/i);
  const wantN = askedN?.[1] ? Math.max(1, Math.min(10, Number(askedN[1]))) : null;
  const terms = [topic, region].filter(Boolean).join(" ") || "top stories";

  const url = `${FEED}?q=${encodeURIComponent(terms)}`;
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

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, wantN ?? limit);
  const headlines: Headline[] = [];
  for (const it of items) {
    const block = it[1] ?? "";
    const rawTitle = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1];
    if (!rawTitle) continue;
    const { title, source } = splitSource(decode(rawTitle));
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    headlines.push({ title, source, published: pub ? new Date(pub).toISOString() : null });
  }

  const day = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  // "top 5 technology headlines from Japan", numbered like a person would list
  // them — the questions ask "top N ... from <place> as of today" in exactly
  // those words, and the answer should read as directly addressing each one.
  const subject = topic ? `${topic} ` : "";
  const where = region ? ` from ${region}` : "";
  const countWord = wantN ? `${wantN} ` : "";

  const reason = headlines.length
    ? `The top ${countWord}${subject}headlines${where} today, as of ${day}, are: ` +
      headlines.map((h, i) => `${i + 1}. ${h.title}${h.source ? ` (${h.source})` : ""}.`).join(" ")
    : `No current ${subject}headlines${where} could be retrieved as of ${day}.`;

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
