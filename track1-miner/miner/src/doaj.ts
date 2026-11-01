/** Independent, keyless open-access article source. No citation counts are inferred. */
import type { Paper } from "./papers";

export interface DoajPaper extends Paper { abstract: string; url: string | null }
type RecordRow = { bibjson?: {
  title?: string; abstract?: string; year?: string; month?: string;
  author?: Array<{ name?: string }>; journal?: { title?: string };
  identifier?: Array<{ type?: string; id?: string }>;
  link?: Array<{ type?: string; url?: string }>;
} };
const clean = (s: unknown): string => String(s ?? "").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const STOP = new Set(["the","and","for","with","from","into","about","their","that","this","using","based","impact","effect","effects","role","recent","access","open"]);

export async function doajPapers(topic: string, from: string | null, to: string | null, limit: number,
  timeoutMs = 4000, latest = false): Promise<DoajPaper[] | null> {
  const terms = [...new Set(topic.toLowerCase().match(/[a-z0-9-]{3,}/g) ?? [])].filter(w=>!STOP.has(w));
  if (!terms.length) return [];
  // Quote literal tokens; user text cannot inject a field/range/boolean expression.
  let query = terms.length === 2 ? `"${terms.join(" ")}"` : terms.map(w=>`"${w}"`).join(" AND ");
  if (from || to) query += ` AND bibjson.year:[${from?.slice(0,4) ?? "*"} TO ${to?.slice(0,4) ?? "*"}]`;
  const u = new URL(`https://doaj.org/api/search/articles/${encodeURIComponent(query)}`);
  u.searchParams.set("pageSize",String(Math.min(100,Math.max(20,limit*4))));
  if (latest) u.searchParams.set("sort","bibjson.year:desc");
  try {
    const r = await fetch(u.toString(), { headers:{accept:"application/json","user-agent":"livecert-miner/1.0 (+https://miner-wine.vercel.app)"}, signal:AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return null;
    const d = await r.json() as {results?: RecordRow[]};
    if (!Array.isArray(d.results)) return null;
    const seen = new Set<string>();
    const rows = d.results.flatMap(({bibjson:b}) => {
      if (!b?.title) return [];
      const title = clean(b.title), abstract = clean(b.abstract);
      const words = `${title} ${abstract}`.toLowerCase().match(/[a-z0-9-]+/g) ?? [];
      if (!terms.every(t=>words.some(w=>w === t || w === `${t}s` || `${w}s` === t))) return [];
      // Two scattered words do not establish a compound topic: a clinical
      // consensus with geographically distributed authors is not distributed consensus.
      if (terms.length === 2 && !words.join(" ").includes(terms.join(" "))) return [];
      if (terms.length > 2 && terms.filter(t=>title.toLowerCase().includes(t)).length < Math.ceil(terms.length/2)) return [];
      const y = Number(b.year), m = Number(b.month);
      const year = Number.isInteger(y) && y >= 1000 && y <= new Date().getUTCFullYear() ? y : null;
      const month = Number.isInteger(m) && m>=1 && m<=12 ? m : null;
      if (from || to) {
        if (!year) return [];
        // DOAJ gives year/month, not day: accept only if the entire possible interval fits.
        const start = `${year}-${String(month ?? 1).padStart(2,"0")}-01`;
        const endMonth = month ?? 12;
        const end = `${year}-${String(endMonth).padStart(2,"0")}-${new Date(Date.UTC(year,endMonth,0)).getUTCDate()}`;
        if ((from && start < from) || (to && end > to)) return [];
      }
      const doi = b.identifier?.find(x=>x.type === "doi")?.id ?? null;
      const key = (doi ?? title).toLowerCase();
      if (seen.has(key)) return []; seen.add(key);
      const rawUrl = b.link?.find(x=>x.type === "fulltext")?.url;
      const url = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
      return [{title,abstract,year,month,citations:null,authors:(b.author ?? []).map(a=>clean(a.name)).filter(Boolean).slice(0,4),venue:clean(b.journal?.title)||null,doi,url}];
    });
    if (latest) rows.sort((a,b)=>(b.year??0)-(a.year??0)||(b.month??0)-(a.month??0));
    else rows.sort((a,b)=>Number(b.title.toLowerCase().includes(topic.toLowerCase()))-Number(a.title.toLowerCase().includes(topic.toLowerCase())));
    return rows.slice(0,limit).map(({month:_m,...p})=>p);
  } catch { return null; }
}
