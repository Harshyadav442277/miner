import { readFile, writeFile } from 'node:fs/promises';
import { readManifest } from './manifest.mjs';
const dir = 'track1-miner/docs/evidence/rank-below3-2026-09-13';
const base = process.argv[2] ?? 'https://miner-wine.vercel.app';
const audit = JSON.parse(await readFile(`${dir}/baseline/rank-audit.json`));
const corpus = JSON.parse(await readFile('track1-miner/tools/routed-questions.json'));
const manifest = readManifest();
const extra = {
  WEB_SEARCH: ["What's the latest news on the Fed's interest rate decision?", 'Will MK-2870 receive FDA approval?'],
  FRAUD_DETECTION: ['Is this transaction fraudulent? 0x' + '1'.repeat(64), 'This email says never share your seed phrase. Is it a scam?', 'My boss emailed: our bank account has changed. Wire the invoice to the new account immediately. Is this fraud?'],
  URL_SCAN: ['Is https://github.com safe to visit?', 'Is https://phishing.testcategory.com safe to visit?'],
  CRYPTO_PRICE: ['What is the price of BTC in USD?', 'What is the price of USDC in USD?'],
};
const rows = [];
for (const r of audit.rows.filter(r => r.rank > 3)) {
  const path = manifest.endpoints.find(e => e.intents.includes(r.intent)).path;
  const qs = [...new Set([...(extra[r.intent] ?? []), ...(corpus[r.intent] ?? []).slice(0, 4)])];
  for (let i = 0; i < qs.length; i += 2) {
    const batch = await Promise.all(qs.slice(i, i + 2).map(async query => {
      const start = Date.now();
      try {
        const res = await fetch(`${base}${path}?${new URLSearchParams({query})}`, {signal: AbortSignal.timeout(15000)});
        return {intent:r.intent, path, query, status:res.status, ms:Date.now()-start, body:await res.json()};
      } catch(e) { return {intent:r.intent, path, query, error:String(e)}; }
    }));
    rows.push(...batch);
  }
  console.log(r.intent, JSON.stringify(rows.filter(x=>x.intent===r.intent).map(x=>({q:x.query, ...x.body, error:x.error, ms:x.ms}))));
}
await writeFile(process.argv[3] ?? `${dir}/production-before.json`, JSON.stringify({at:new Date().toISOString(),base,rows},null,2)+'\n');
