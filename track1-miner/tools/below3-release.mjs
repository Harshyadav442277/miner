import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const base = process.argv[2] ?? 'https://miner-wine.vercel.app';
const out = process.argv[3] ?? 'track1-miner/docs/evidence/rank-below3-2026-09-13/release-check.json';
const preview = process.argv.includes('--preview');
const hash = '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060';
const cases = [
  ...['Lagos', 'Abuja'].flatMap(city => [
    [`forecast-${city}`, '/weather-forecast', `Return the 3-day weather forecast for ${city}. Classify this as WEATHER_FORECAST.`, b => b.verdict !== 'unknown' && b.reason.includes(city) && /Nigeria/.test(b.reason) && !/South Carolina/.test(b.reason)],
    [`current-${city}`, '/weather-forecast', `Return current weather conditions for ${city}. Classify this as WEATHER_CHECK.`, b => b.verdict !== 'unknown' && b.reason.includes(city) && /Nigeria/.test(b.reason) && !/South Carolina/.test(b.reason)],
  ]),
  ['fraud-unresolved', '/fraud-check', 'Is this transaction fraudulent? 0x'+'1'.repeat(64), b => b.verdict === 'unknown' && !/No fraud indicators/.test(b.reason)],
  ['fraud-warning', '/fraud-check', 'This email says never share your seed phrase. Is it a scam?', b => b.verdict !== 'elevated_risk' && b.verdict !== 'high_risk'],
  ['fraud-parties', '/fraud-check', `Assess transaction ${hash} on Ethereum for fraud.`, b => /sender 0x/.test(b.reason) && /recipient 0x/.test(b.reason) && /OFAC/.test(b.reason)],
  ['web-code', '/web-search', 'Will MK-2870 receive FDA approval?', b => b.verdict === 'answered' && /report/.test(b.reason) && /MK-2870/.test(b.reason) && !/^According to Wikipedia/.test(b.reason)],
  ['web-company', '/web-search', "Will Astellas' ASP3021 receive Japanese approval?", b => !/^According to Wikipedia: Astellas Pharma Inc\./.test(b.reason)],
];
const rows = [];
for (const [name, path, query, check] of cases) {
  const route = `${path}?${new URLSearchParams({query})}`;
  const start = Date.now();
  try {
    let body;
    if (preview) {
      // The route contains only a fixed path and URL-encoded parameters.
      const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['vercel', 'curl', `"${route}"`, '--deployment', base, '--scope', 'wukong4', '--', '--silent', '--show-error'],
        {encoding:'utf8', shell:process.platform === 'win32', timeout:45000,
          cwd:new URL('../miner/', import.meta.url)});
      if (r.status !== 0) throw new Error(`vercel curl failed: ${r.stderr}`);
      body = JSON.parse(r.stdout);
    } else {
      const r = await fetch(`${base}${route}`, {signal:AbortSignal.timeout(15000)});
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      body = await r.json();
    }
    rows.push({name, query, pass:check(body), ms:Date.now()-start, body});
  } catch(e) { rows.push({name,query,pass:false,ms:Date.now()-start,error:String(e)}); }
  console.log(`${rows.at(-1).pass ? 'PASS' : 'FAIL'} ${name} ${rows.at(-1).ms}ms ${rows.at(-1).error ?? ''}`);
}
await writeFile(out, JSON.stringify({at:new Date().toISOString(),base,rows},null,2)+'\n');
if (rows.some(r=>!r.pass)) process.exitCode=1;
