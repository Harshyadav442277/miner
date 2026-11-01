import { test } from "node:test";
import assert from "node:assert/strict";
import { findPapers } from "../src/papers";
import { analyseSentiment } from "../src/sentiment";
import { answerResearch } from "../src/research";
import { doajPapers } from "../src/doaj";

test("academic search can answer an explicit DOAJ request without OpenAlex", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input); urls.push(url);
    if (!url.includes("doaj.org")) return new Response("budget exhausted", { status:429 });
    return Response.json({ results:[
      { bibjson:{title:"Quantum computing for secure communication",year:"2025",month:"6",author:[{name:"A. Scholar"}],journal:{title:"Research Journal"},identifier:[{type:"doi",id:"10.1234/example"}]} },
      { bibjson:{title:"Quantum computing outside the window",year:"2020",month:"1"} },
    ] });
  }) as typeof fetch;
  try {
    const r = await findPapers("Search DOAJ for two open-access articles on quantum computing published in 2025");
    assert.equal(r.verdict,"papers"); assert.equal(r.count,1);
    assert.equal(r.papers[0]?.citations,null);
    assert.match(r.reason,/DOAJ/); assert.match(r.reason,/A\. Scholar/);
    assert.doesNotMatch(r.reason,/cited 0 times|outside the window/);
    assert.ok(urls.every(u=>u.includes("doaj.org")));
  } finally { globalThis.fetch = original; }
});

test("DOAJ excludes unverifiable precise dates, unrelated rows and duplicate DOIs", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({results:[
    {bibjson:{title:"Quantum computing one",year:"2025",month:"6",identifier:[{type:"doi",id:"same"}]}},
    {bibjson:{title:"Quantum computing duplicate",year:"2025",month:"6",identifier:[{type:"doi",id:"same"}]}},
    {bibjson:{title:"Quantum computing partial month",year:"2025",month:"5"}},
    {bibjson:{title:"Quantum computing unknown month",year:"2025"}},
    {bibjson:{title:"Quantum psychology",year:"2025",month:"6"}},
  ]})) as typeof fetch;
  try {
    const r = await doajPapers("quantum computing","2025-05-15","2025-06-30",5);
    assert.equal(r?.length,1); assert.equal(r?.[0]?.title,"Quantum computing one");
  } finally {globalThis.fetch = original;}
});

test("a technical question must not use an unrelated clinical acronym match", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input:unknown) => {
    const u = String(input); urls.push(u);
    if (u.includes("search/page")) return Response.json({pages:[{key:"Raft_(algorithm)",title:"Raft (algorithm)"}]});
    if (u.includes("page/summary")) return Response.json({title:"Raft (algorithm)",extract:"Raft is a consensus algorithm for replicated logs in distributed systems. Servers elect a leader to replicate log entries.",content_urls:{desktop:{page:"https://en.wikipedia.org/wiki/Raft_(algorithm)"}}});
    if (u.includes("clinicaltrials")) return Response.json({studies:[{protocolSection:{identificationModule:{nctId:"NCT00000000",briefTitle:"RAFT eye trial"},statusModule:{overallStatus:"RECRUITING"}}}]});
    return Response.json({resultList:{result:[]}});
  }) as typeof fetch;
  try {
    const r = await answerResearch("Explain how Raft achieves consensus in distributed systems, with sources.");
    assert.equal(r.verdict,"evidence"); assert.match(r.reason,/replicated logs/);
    assert.doesNotMatch(r.reason,/eye trial/);
    assert.ok(urls.every(u=>!u.includes("clinicaltrials")&&!u.includes("europepmc")));
  } finally {globalThis.fetch = original;}
});

test("praise of a directly stated adverse experience is read as a complaint", () => {
  for (const text of ["I just love being charged twice and ignored by support.", "I love being ignored.", "I really enjoy being ignored by customer service."]) {
    assert.equal(analyseSentiment("",text).verdict,"negative",text);
  }
  for (const text of ["I love being helped by support.", "I enjoy being challenged at work.", "I love this product. Support ignored me once, but the product is excellent."]) {
    assert.equal(analyseSentiment("",text).verdict,"positive",text);
  }
});

test("OpenAlex outage falls back to relevant DOAJ articles without inventing citation order", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input:unknown) => {
    if (String(input).includes("openalex.org")) return new Response("down",{status:502});
    return Response.json({results:[
      {bibjson:{title:"A global clinical consensus",abstract:"Authors were distributed across countries.",year:"2025",month:"6"}},
      {bibjson:{title:"Distributed consensus protocols",year:"2025",month:"6"}},
    ]});
  }) as typeof fetch;
  try {
    const r = await findPapers("Find papers on distributed consensus published in 2025 sorted by citation count");
    assert.equal(r.count,1); assert.equal(r.papers[0]?.title,"Distributed consensus protocols");
    assert.match(r.reason,/OpenAlex was unavailable/); assert.match(r.reason,/Citation-count ordering could not be applied/);
  } finally {globalThis.fetch = original;}
});

test("an open-access request retains OpenAlex and applies its access filter", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input:unknown) => {
    const u = new URL(String(input));
    assert.equal(u.hostname,"api.openalex.org"); assert.match(u.searchParams.get("filter")??"",/is_oa:true/);
    return Response.json({results:[{title:"An indexed paper",publication_year:2025,cited_by_count:17}]});
  }) as typeof fetch;
  try {
    const r = await findPapers("Find open-access papers on quantum computing published in 2025");
    assert.equal(r.papers[0]?.citations,17); assert.doesNotMatch(r.reason,/DOAJ/);
  } finally {globalThis.fetch = original;}
});

test("technical source outage cannot fall back to a clinical acronym match", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input:unknown) => {
    assert.ok(!String(input).includes("clinicaltrials"));
    return new Response("unavailable",{status:503});
  }) as typeof fetch;
  try {
    const r = await answerResearch("Explain the Raft consensus algorithm");
    assert.equal(r.verdict,"unavailable"); assert.equal(r.trials.length,0);
  } finally {globalThis.fetch = original;}
});
