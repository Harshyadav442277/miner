/**
 * WEB_SEARCH questions whose answer is one current FACT, not a set of reports.
 *
 * WHY THIS EXISTS (rank-loss report F5, 2026-09-15): the news path answered
 * "What is the latest stable Python release?" with an NVIDIA "CUDA Python 1.0"
 * headline at confidence 0.8, and "Who is the current Secretary-General of the
 * United Nations?" with headlines about candidates that never named the holder.
 * A headline search cannot state a version number or an office holder; a
 * structured source can.
 *
 * TWO KEYLESS SOURCES, both checked reachable 2026-09-15:
 *   endoflife.date — release cycles per product, newest first.
 *   Wikidata       — office holders (P1308), heads of state and government
 *                    (P35/P6) and chief executives (P169), with rank and dates.
 *
 * Every miss is a null and the news path runs unchanged: an uncovered product, an
 * office not named as asked, an ambiguous holder, an outage. Nothing is guessed.
 */
const HEADERS = { "user-agent": "livecert-miner/1.0 (+https://miner-wine.vercel.app)" };
const FETCH_MS = 2_500;
/** The route watchdog is 11 s and the news search still needs its share after a miss. */
const BUDGET_MS = 3_500;
const WIKIDATA = "https://www.wikidata.org/w/api.php";
const NOT_FOUND = Symbol("not_found");

async function getJson(url: string, deadline: number): Promise<unknown | typeof NOT_FOUND | null> {
  const left = deadline - Date.now();
  if (left < 150) return null;
  try {
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(Math.min(FETCH_MS, left)) });
    return r.status === 404 ? NOT_FOUND : r.ok ? await r.json() : null;
  } catch { return null; }
}

const fmtDay = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const clean = (s: string): string => s.replace(/[?.!]+\s*$/, "").replace(/\s+/g, " ").trim();

/* ---------- A. latest release of a software product (endoflife.date) ---------- */
const PRODUCT_ALIASES: Record<string, string> = {
  node: "nodejs", "node.js": "nodejs", nodejs: "nodejs", "node js": "nodejs",
  postgres: "postgresql", postgresql: "postgresql", k8s: "kubernetes", kubernetes: "kubernetes",
  go: "go", golang: "go", ".net": "dotnet", dotnet: "dotnet", react: "react", "react.js": "react",
  reactjs: "react", ubuntu: "ubuntu", "vue.js": "vue", vuejs: "vue", "ruby on rails": "rails",
};
/** Names endoflife.date files under a slug whose "latest" is not the thing asked about. */
const PRODUCT_SKIP = new Set(["java", "jdk", "windows", "iphone", "ipad", "pixel", "surface", "news"]);

const PRODUCT = "([\\p{L}\\d.+#-]+(?:\\s+[\\p{L}\\d.+#-]+){0,2}?)";
const RELEASE_PATTERNS = [
  new RegExp(`\\b(?:latest|newest|most\\s+recent|current)\\s+(?:stable\\s+)?(?:version|release)\\s+(?:of|for)\\s+${PRODUCT}(?:\\s+(?:is|was|released|available|out|now|today)\\b.*)?$`, "iu"),
  new RegExp(`\\bwhat\\s+version\\s+of\\s+${PRODUCT}\\s+is\\s+(?:the\\s+)?(?:current|latest|newest)\\b`, "iu"),
  new RegExp(`\\b(?:latest|newest|most\\s+recent|current)\\s+(?:stable\\s+)?${PRODUCT}\\s+(?:stable\\s+)?(?:version|release)\\b`, "iu"),
];

/** The product a "latest version/release of X" question names, or null. */
export function releaseProduct(question: string): string | null {
  const q = clean(String(question ?? ""));
  for (const re of RELEASE_PATTERNS) {
    const name = re.exec(q)?.[1]?.replace(/^the\s+/i, "").trim();
    if (!name || PRODUCT_SKIP.has(name.toLowerCase())) continue;
    // "the latest on the release of..." captures filler, not a product.
    if (!PRODUCT_ALIASES[name.toLowerCase()] && /\b(?:on|of|about|the|a|an|for|to|in|new|news)\b/i.test(name)) continue;
    return name;
  }
  return null;
}

export function productSlugs(name: string): string[] {
  const n = name.toLowerCase().trim();
  const slugs = [PRODUCT_ALIASES[n], n.replace(/\s+/g, "-"), n.replace(/[\s.]+/g, "")];
  return [...new Set(slugs.filter((s): s is string => !!s && /^[a-z0-9][a-z0-9.+-]*$/.test(s)))];
}

interface Cycle { cycle?: unknown; releaseDate?: unknown; latest?: unknown; latestReleaseDate?: unknown }
async function latestRelease(question: string, deadline: number): Promise<string | null> {
  const name = releaseProduct(question);
  if (!name) return null;
  const slugs = productSlugs(name);
  const bodies = await Promise.all(slugs.map((s) => getJson(`https://endoflife.date/api/${s}.json`, deadline)));
  // The first candidate that is not a 404 decides; an outage on it is not a licence to try a looser slug.
  const body = bodies.find((b) => b !== NOT_FOUND);
  if (!Array.isArray(body)) return null;
  const released = (body as Cycle[])
    .filter((c) => typeof c.releaseDate === "string" && Date.parse(c.releaseDate) <= Date.now())
    .sort((a, b) => Date.parse(String(b.releaseDate)) - Date.parse(String(a.releaseDate)));
  const top = released[0];
  if (!top || (typeof top.latest !== "string" && typeof top.latest !== "number")) return null;
  const latest = String(top.latest);
  const shown = /^[a-z]/.test(name) ? name[0]!.toUpperCase() + name.slice(1) : name;
  const when = typeof top.latestReleaseDate === "string" && !Number.isNaN(Date.parse(top.latestReleaseDate))
    ? `, released on ${fmtDay(Date.parse(top.latestReleaseDate))}` : "";
  const cycle = top.cycle !== undefined && String(top.cycle) !== latest ? ` (the ${String(top.cycle)} release cycle)` : "";
  return `The latest stable ${shown} release is ${latest}${when}${cycle}. Source: endoflife.date.`;
}

/* ---------- B. current holder of an office (Wikidata) ---------- */
const TITLE = "(?:vice[- ]president|president|(?:deputy\\s+)?prime\\s+minister|premier|chancellor|secretary[- ]general|director[- ]general|secretary\\s+of\\s+state|minister|ceo|chief\\s+executive(?:\\s+officer)?|chair(?:man|woman|person)?|governor|mayor|king|queen|monarch|pope|chief\\s+justice|speaker|head\\s+of\\s+(?:state|government)|attorney\\s+general)";
const OFFICE_SHAPE = new RegExp(`^(?:[\\p{L}\\d.'&-]+\\s+){0,3}${TITLE}(?:\\s+of\\s+[\\p{L}\\d.'&-]+(?:\\s+[\\p{L}\\d.'&-]+){0,5})?$`, "iu");
const OFFICE_PATTERNS = [
  /^(?:who\s+is|who's)\s+(?:currently\s+)?(?:the\s+)?(?:current\s+|present\s+|sitting\s+|incumbent\s+)?(.+?)(?:\s+(?:now|currently|today|right\s+now|at\s+present|at\s+the\s+moment))?$/iu,
  /\bcurrent\s+(.+)$/iu,
];

/** The office a "who is the current X" question names, or null. */
export function officePhrase(question: string): string | null {
  const q = clean(String(question ?? ""));
  for (const re of OFFICE_PATTERNS) {
    const phrase = re.exec(q)?.[1]?.trim();
    if (phrase && OFFICE_SHAPE.test(phrase) && !/\b(?:former|next|previous|last|first|founding|elect)\b/i.test(phrase)) return phrase;
  }
  return null;
}

const STOP = new Set(["of", "the", "a", "an", "and", "for", "in"]);
const CORPORATE = new Set(["inc", "corp", "corporation", "ltd", "plc", "llc", "co", "company", "group", "holdings", "sa", "ag", "se", "nv"]);
const words = (s: string, drop: Set<string> = STOP): string =>
  [...new Set(s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w) && !drop.has(w)))].sort().join(" ");

interface Hit { id: string; label: string }
/** Search results whose label or matched alias names exactly what was asked, in search order. */
async function search(text: string, deadline: number, drop?: Set<string>): Promise<Hit[] | null> {
  const body = await getJson(`${WIKIDATA}?${new URLSearchParams({ action: "wbsearchentities", search: text, language: "en", format: "json", limit: "3" })}`, deadline) as { search?: Array<{ id?: string; label?: string; match?: { text?: string } }> } | null;
  if (!body || typeof body !== "object" || !Array.isArray(body.search)) return null;
  const want = words(text, drop);
  return body.search
    .filter((h) => typeof h.id === "string" && [h.label, h.match?.text].some((t) => typeof t === "string" && words(t, drop) === want))
    .map((h) => ({ id: String(h.id), label: String(h.label ?? text) }));
}

interface WdTime { ms: number; end: number; precision: number; year: number }
function wdTime(snaks: unknown): WdTime | null {
  const v = (snaks as Array<{ datavalue?: { value?: { time?: string; precision?: number } } }> | undefined)?.[0]?.datavalue?.value;
  const m = /^\+(\d{4})-(\d\d)-(\d\d)/.exec(v?.time ?? "");
  if (!m) return null;
  const [y, mo, d, p] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(v?.precision ?? 11)];
  const ms = Date.UTC(y, Math.max(mo, 1) - 1, Math.max(d, 1));
  const end = p >= 11 ? ms + 86_400_000 : p === 10 ? Date.UTC(y, Math.max(mo, 1), 1) : Date.UTC(y + 1, 0, 1);
  return { ms, end, precision: p, year: y };
}

interface Holder { id: string; start: WdTime | null; end: WdTime | null }
/**
 * The preferred-rank claim in force today; without one, the single latest-started
 * claim in force. Two claims in force with no preferred rank and no strictly later
 * start is ambiguous, and ambiguity is a null, not a pick.
 */
export function currentHolder(claims: unknown, now = Date.now()): Holder | null {
  if (!Array.isArray(claims)) return null;
  const live = claims.flatMap((c: { rank?: string; mainsnak?: { datavalue?: { value?: { id?: string } } }; qualifiers?: Record<string, unknown> }) => {
    const id = c?.mainsnak?.datavalue?.value?.id;
    const start = wdTime(c?.qualifiers?.P580);
    const end = wdTime(c?.qualifiers?.P582);
    if (!id || c.rank === "deprecated" || (start && start.ms > now) || (end && end.end <= now)) return [];
    return [{ id, start, end, preferred: c.rank === "preferred" }];
  });
  const pool = live.some((h) => h.preferred) ? live.filter((h) => h.preferred) : live;
  pool.sort((a, b) => (b.start?.ms ?? -Infinity) - (a.start?.ms ?? -Infinity));
  const [top, next] = pool;
  if (!top || (next && !top.preferred && (!top.start || !next.start || next.start.ms >= top.start.ms))) return null;
  return { id: top.id, start: top.start, end: top.end };
}

async function claims(entity: string, property: string, deadline: number): Promise<unknown[] | null> {
  const body = await getJson(`${WIKIDATA}?${new URLSearchParams({ action: "wbgetclaims", entity, property, format: "json" })}`, deadline) as { claims?: Record<string, unknown[]> } | null;
  if (!body || typeof body !== "object" || !body.claims || typeof body.claims !== "object") return null;
  return body.claims[property] ?? [];
}

/** The first hit, in search order, with a current holder. An outage on an earlier hit stops the walk. */
async function holderOf(hits: Hit[], property: string, deadline: number): Promise<{ hit: Hit; holder: Holder } | null> {
  const all = await Promise.all(hits.map((h) => claims(h.id, property, deadline)));
  for (const [i, list] of all.entries()) {
    if (list === null) return null;
    const holder = currentHolder(list);
    if (holder) return { hit: hits[i] as Hit, holder };
  }
  return null;
}

const fmtTime = (t: WdTime): string => t.precision >= 11 ? fmtDay(t.ms)
  : t.precision === 10 ? new Date(t.ms).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) : String(t.year);

/**
 * English label, else the "mul" (all-languages) label Wikidata now files many
 * personal names under: checked 2026-09-15, Emmanuel Macron's item has no "en"
 * label at all, and asking for "en" alone turned a known holder into a null.
 */
async function label(id: string, deadline: number): Promise<string | null> {
  const body = await getJson(`${WIKIDATA}?${new URLSearchParams({ action: "wbgetentities", ids: id, props: "labels", languages: "en|mul", format: "json" })}`, deadline) as { entities?: Record<string, { labels?: Record<string, { value?: string }> }> } | null;
  const labels = body?.entities?.[id]?.labels;
  return labels?.en?.value ?? labels?.mul?.value ?? null;
}

/** The holder's name, refusing anyone Wikidata records as dead. */
async function describe(office: string, holder: Holder, deadline: number): Promise<string | null> {
  const [name, death] = await Promise.all([label(holder.id, deadline), claims(holder.id, "P570", deadline)]);
  if (!name || death === null || death.length) return null;
  const since = holder.start ? holder.start.year : null;
  const until = holder.end ? fmtTime(holder.end) : null;
  const term = since && until ? `, whose term began in ${since} and runs to ${until}`
    : since ? `, in office since ${since}` : until ? `, whose term runs to ${until}` : "";
  return `The current ${office} is ${name}${term}. Source: Wikidata.`;
}

async function officeHolder(question: string, deadline: number): Promise<string | null> {
  const phrase = officePhrase(question);
  if (!phrase) return null;
  const ceo = /^(?:ceo|chief\s+executive(?:\s+officer)?)\s+of\s+(?:the\s+)?(.+)$/i.exec(phrase)?.[1]
    ?? /^(.+?)\s+(?:ceo|chief\s+executive(?:\s+officer)?)$/i.exec(phrase)?.[1];
  if (ceo) {
    const hits = await search(ceo, deadline, CORPORATE);
    const found = hits?.length ? await holderOf(hits, "P169", deadline) : null;
    return found ? describe(`CEO of ${found.hit.label}`, found.holder, deadline) : null;
  }
  const hits = await search(phrase, deadline);
  if (hits === null) return null;
  const found = hits.length ? await holderOf(hits, "P1308", deadline) : null;
  /**
   * Matched through an alias, the office is named by its own label: "Prime
   * Minister of Germany" is an alias of Federal Chancellor of Germany, and the
   * answer must say which office the holder actually holds.
   */
  if (found) return describe(words(found.hit.label) === words(phrase) ? phrase : found.hit.label, found.holder, deadline);
  // Head of state or government read off the country, only when the country's own
  // office for that role carries the title asked for.
  const shape = /^(president|prime\s+minister|head\s+of\s+state|head\s+of\s+government)\s+of\s+(?:the\s+)?(.+)$/i.exec(phrase);
  if (!shape) return null;
  const title = shape[1]!.toLowerCase().replace(/\s+/g, " ");
  const state = title === "president" || title === "head of state";
  const places = await search(shape[2]!, deadline);
  const place = places?.[0];
  if (!place) return null;
  const [list, offices] = await Promise.all([
    claims(place.id, state ? "P35" : "P6", deadline),
    claims(place.id, state ? "P1906" : "P1313", deadline),
  ]);
  const holder = currentHolder(list);
  const officeId = (offices?.[0] as { mainsnak?: { datavalue?: { value?: { id?: string } } } } | undefined)?.mainsnak?.datavalue?.value?.id;
  if (!holder || !officeId) return null;
  const office = await label(officeId, deadline);
  const have = new Set(words(office ?? "").split(" "));
  if (!office || (!title.startsWith("head") && !words(title).split(" ").every((w) => have.has(w)))) return null;
  return describe(office, holder, deadline);
}

/** One sentence stating the current fact asked for, or null when this module should not answer. */
export async function currentFact(question: string): Promise<string | null> {
  const deadline = Date.now() + BUDGET_MS;
  try {
    return releaseProduct(question) ? await latestRelease(question, deadline) : await officeHolder(question, deadline);
  } catch {
    return null;
  }
}
