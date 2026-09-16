/** A bounded general-reference path for explicitly technical questions. */
import type { ResearchResult } from "./research";

export function isTechnicalQuestion(q:string): boolean {
  return /\b(?:algorithm|distributed systems?|computer science|programming|blockchain|cryptograph\w*|consensus|database|software|proof of (?:work|stake))\b/i.test(q)
    && !/\b(?:clinical|patients?|drug|disease|therapy|treatment|trial|diagnos\w*)\b/i.test(q);
}
const STOP = new Set("explain how why what which does achieve achieves work works the this that with sources source citations cite research latest recent findings about current main differences between and for into from are can evidence supported please".split(" "));
const tokens = (s:string):string[] => [...new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter(w=>!STOP.has(w));

export async function technicalResearch(question:string, subject:string):Promise<ResearchResult> {
  const empty = {subject,trials:[],citations:[]};
  const terms = tokens(question);
  const ac = new AbortController();
  const timer = setTimeout(()=>ac.abort(),5500);
  const get = async (url:string):Promise<unknown> => {
    const r = await fetch(url,{signal:ac.signal,headers:{accept:"application/json","user-agent":"livecert-miner/1.0 (+https://miner-wine.vercel.app)"}});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  try {
    const search = await get(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(terms.join(" "))}&limit=5`) as {pages?:Array<{key?:string;title?:string}>};
    // Require a title that actually names a requested topic before fetching summaries.
    const candidates = (search.pages ?? []).filter(p=>p.key && tokens(p.title ?? "").some(t=>terms.includes(t))).slice(0,3);
    let sourceFailed = false;
    const pages = await Promise.all(candidates.map(async p=> {
      try {
        const d = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.key!)}`) as {title?:string;extract?:string;type?:string};
        if (!d.extract || d.type === "disambiguation") return null;
        const words = tokens(d.extract);
        const overlap = terms.filter(t=>words.includes(t)).length;
        if (overlap < Math.min(3,terms.length) || !isTechnicalQuestion(d.extract)) return null;
        return {title:d.title ?? p.title ?? p.key!, extract:d.extract.replace(/\s+/g," ").trim(), key:p.key!, overlap};
      } catch {sourceFailed = true; return null;}
    }));
    const best = pages.filter(p=>p !== null).sort((a,b)=>b.overlap-a.overlap)[0];
    if (!best) return {...empty, verdict:sourceFailed ? "unavailable":"no_evidence",confidence:0,
      reason:sourceFailed ? "The technical reference source was unavailable; no clinical acronym match was substituted." : "No sufficiently relevant technical reference was found for this question. This does not establish that no research exists."};
    // Extract, do not invent an explanation beyond what the retrieved source says.
    const excerpt = best.extract.split(/(?<=[.!?])\s+/).slice(0,3).join(" ");
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(best.key)}`;
    return {...empty, verdict:"evidence",confidence:0.7,
      citations:[{title:best.title,authors:null,year:null,source:url}],
      reason:`${excerpt} Source: Wikipedia, "${best.title}" (${url}). This is a general reference excerpt, not a survey of recent research.`};
  } catch {
    return {...empty,verdict:"unavailable",confidence:0,error:"upstream_unavailable",reason:"The technical reference source was unavailable; no clinical acronym match was substituted."};
  } finally {clearTimeout(timer);}
}
