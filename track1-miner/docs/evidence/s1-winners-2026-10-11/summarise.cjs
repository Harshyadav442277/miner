const rows=require(process.argv[2]);
const pats={echo:/^\s*(Regarding\b)/i, unable:/Unable to (process|generate)/i, unavailable:/temporarily unavailable|no credit left|cannot (look up|assess)/i};
const by={}; for(const r of rows){(by[({"9002":"txlens","302":"chainsight","64173":"oathcast","4433":"livecert"})[r.routing.subnet_id]]??=[]).push(r);}
const txt=(x)=>{if(!x||typeof x!=="object")return "";const t=x.answer??x.reason??x.content??x.summary??x.signal??"";return typeof t==="string"?t:JSON.stringify(t);};
for(const [m,rs] of Object.entries(by)){
  const c=(f,n=8)=>{const o={};for(const r of rs){const k=f(r);o[k]=(o[k]||0)+1;}return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>k+":"+v).join("  ");};
  const res={n:rs.length, ok:rs.filter(r=>r.status==="success").length, distinctQ:new Set(rs.map(r=>r.question.text)).size};
  for(const [k,p] of Object.entries(pats)) res[k]=rs.filter(r=>p.test(txt(r.execution?.result))).length;
  const f=rs.map(r=>r.execution?.result&&typeof r.execution.result==="object"?Object.keys(r.execution.result).length:0).sort((a,b)=>a-b); res.fields_p50=f[f.length>>1];
  const d=rs.map(r=>r.execution?.duration_ms).filter(Number.isFinite).sort((a,b)=>a-b); res.ms_p50=d[d.length>>1]; res.ms_p90=d[Math.floor(d.length*.9)];
  console.log(`\n=== ${m} ${JSON.stringify(res)}`);
  console.log(" type:",c(r=>r.type)," | status:",c(r=>r.status));
  console.log(" intent:",c(r=>r.routing.intent,12));
  console.log(" source:",c(r=>(r.source||"").slice(0,30),6));
  console.log(" by day:",c(r=>r.created_at.slice(5,10),30));
}
