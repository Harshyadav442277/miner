/**
 * The two literature indexes RESEARCH_SYNTHESIS reads abstracts from.
 *
 *   Europe PMC REST (EBI)       search?resultType=core returns the abstract inline.
 *   PubMed E-utilities (NCBI)   esearch for ids, then efetch for the abstracts.
 *
 * Both keyless and documented, both verified live 2026-09-12 (Europe PMC 200 in
 * 1.0 s; esearch 200 in 1.9 s, efetch 200 in 1.3 s). They are different
 * organisations on different infrastructure, which is the point: one being down
 * leaves the other. PubMed allows three requests a second without a key, and this
 * route makes two, sequentially.
 *
 * Measured 2026-09-12: Europe PMC's relevance ranking for "coffee longevity"
 * led with a dental-staining paper whose abstract says "aesthetic longevity", and
 * a plain query led with the American Heart Association's statistics report. So
 * both queries are restricted to title and abstract, and synthesis.ts still
 * refuses a source whose TITLE does not name the topic.
 */
const TIMEOUT_MS = Number(process.env.SYNTHESIS_TIMEOUT_MS ?? 3_800);
const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";
const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export interface Study {
  id: string;
  title: string;
  firstAuthor: string | null;
  year: number | null;
  abstract: string;
  index: "Europe PMC" | "PubMed";
}

async function get(url: string, accept: string): Promise<string> {
  const r = await fetch(url, { headers: { accept, "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

/** Tags and the handful of entities these indexes emit, removed from prose. */
export function plain(s: string): string {
  return String(s ?? "")
    .replace(/<h4>[^<]*<\/h4>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Ungvari Z, Kunutsor SK." -> "Ungvari" */
export function surname(authorString: string | undefined): string | null {
  const first = String(authorString ?? "").split(",")[0]?.trim() ?? "";
  const m = first.match(/^([\p{L}'-]+(?:\s+[\p{L}'-]+)*?)\s+[A-Z]{1,3}\.?$/u);
  return m?.[1] ?? (first || null);
}

export async function europePmc(words: string[], fromYear: number | null): Promise<Study[] | "unavailable"> {
  const clause = words.map((w) => `TITLE_ABS:"${w.replace(/"/g, "")}"`).join(" AND ");
  const years = fromYear ? ` AND PUB_YEAR:[${fromYear} TO 3000]` : "";
  try {
    const body = JSON.parse(await get(
      `${EPMC}?query=${encodeURIComponent(`${clause} AND HAS_ABSTRACT:y${years}`)}&format=json&pageSize=8&resultType=core`,
      "application/json",
    )) as { resultList?: { result?: Array<Record<string, unknown>> } };
    return (body.resultList?.result ?? []).flatMap((r) => {
      const title = plain(String(r.title ?? "")).replace(/\.$/, "");
      const abstract = plain(String(r.abstractText ?? ""));
      if (!title || !abstract) return [];
      const year = Number(r.pubYear);
      return [{
        id: r.pmid ? `PMID ${r.pmid}` : r.doi ? `doi ${r.doi}` : String(r.id ?? ""),
        title, abstract, index: "Europe PMC" as const,
        firstAuthor: surname(r.authorString as string | undefined),
        year: Number.isFinite(year) && year > 0 ? year : null,
      }];
    });
  } catch {
    return "unavailable";
  }
}

/** One <PubmedArticle> block into a Study, or null when it carries no abstract. */
export function parsePubmedArticle(xml: string): Study | null {
  const pmid = xml.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
  const title = plain(xml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/)?.[1] ?? "").replace(/\.$/, "");
  const parts = [...xml.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((m) => plain(m[2] ?? ""));
  const abstract = parts.join(" ").trim();
  if (!pmid || !title || !abstract) return null;
  const last = xml.match(/<Author[^>]*>\s*<LastName>([^<]+)<\/LastName>/)?.[1] ?? null;
  const year = Number(xml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/)?.[1]);
  return { id: `PMID ${pmid}`, title, abstract, firstAuthor: last ? plain(last) : null, year: Number.isFinite(year) ? year : null, index: "PubMed" };
}

/**
 * Ten ids, not six: since 2026-09-13 a sentence must state a result to be quoted,
 * so fewer abstracts yield a finding and the pool is widened to compensate.
 */
export async function pubmed(words: string[], fromYear: number | null): Promise<Study[] | "unavailable"> {
  const term = words.map((w) => `${w}[tiab]`).join(" AND ") + (fromYear ? ` AND ${fromYear}:3000[dp]` : "");
  try {
    const search = JSON.parse(await get(
      `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=10&sort=relevance&term=${encodeURIComponent(term)}`,
      "application/json",
    )) as { esearchresult?: { idlist?: string[] } };
    const ids = search.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];
    const xml = await get(`${EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(",")}`, "application/xml");
    return xml.split(/<\/PubmedArticle>/).map(parsePubmedArticle).filter((s): s is Study => s !== null);
  } catch {
    return "unavailable";
  }
}
