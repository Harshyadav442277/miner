import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const evidence = path.dirname(dir);
const current = JSON.parse(await readFile(path.join(dir, 'current/rank-audit.json'), 'utf8'));
const intents = new Set(current.rows.map(r => r.intent));
const points = new Map();
const discrepancies = [];
function add(row, source) {
  if (!intents.has(row.intent) || row.epoch > current.epoch) return;
  const key = `${row.intent}:${row.epoch}`;
  const old = points.get(key);
  if (old && (old.score !== row.score || old.rank !== row.rank)) discrepancies.push({ old, row, source });
  points.set(key, { ...old, ...row, sources: [...(old?.sources ?? []), source] });
}
async function visit(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'historical-recovery-2026-09-16') await visit(file); continue; }
    if (!/^(?:history-)?[A-Z_]+\.json$/.test(e.name) && e.name !== 'rank-audit.json') continue;
    const data = JSON.parse(await readFile(file, 'utf8'));
    const source = path.relative(evidence, file).replaceAll('\\', '/');
    if (data.rows && data.epoch) for (const r of data.rows) if (r.rank != null) add({ intent: r.intent, epoch: r.epoch ?? data.epoch, rank: r.rank, score: r.score, leader: r.leader, top: r.top, field: r.competitors, snapshot: data.at }, source);
    const scores = Array.isArray(data.scores) ? data.scores : data.scores?.scores;
    if (!scores) continue;
    for (const r of scores.filter(r => r.miner_slug === 'livecert')) {
      const lead = scores.find(s => s.epoch_id === r.epoch_id && s.rank === 1);
      add({ intent: r.intent_id, epoch: r.epoch_id, rank: r.rank, score: r.score,
        ...(lead ? { leader: lead.miner_slug, top: lead.score } : {}),
        failure: r.failure_reason, scoredAt: r.scored_at }, source);
    }
  }
}
const nightly = path.resolve(evidence, '../score-history.jsonl');
for (const line of (await readFile(nightly, 'utf8')).split('\n').filter(l => l.trim())) {
  const p = JSON.parse(line);
  for (const [intent,r] of Object.entries(p.ours ?? {})) add({ intent, epoch:p.epoch, rank:r.rank, score:r.score,
    ...(p.leaders?.[intent] ? { leader:p.leaders[intent].slug, top:p.leaders[intent].score } : {}) }, '../score-history.jsonl');
}
await visit(evidence);
for (const r of current.rows) add({ intent:r.intent,epoch:r.epoch,rank:r.rank,score:r.score,leader:r.leader,top:r.top,field:r.competitors }, 'historical-recovery-2026-09-16/current/rank-audit.json');
const rows = [];
for (const r of current.rows) {
  const history = [...points.values()].filter(p => p.intent === r.intent).sort((a,b) => a.epoch-b.epoch);
  const best = [...history].sort((a,b) => b.score-a.score || a.rank-b.rank || b.epoch-a.epoch)[0];
  const wins = history.filter(p => p.rank === 1);
  const lastWin = wins.at(-1) ?? null;
  const bestRank = Math.min(...history.map(p => p.rank));
  const baseline = JSON.parse(await readFile(path.join(evidence, 'rank-below3-2026-09-13/baseline', r.intent+'.json'), 'utf8'));
  const now = JSON.parse(await readFile(path.join(dir, 'current', r.intent+'.json'), 'utf8'));
  rows.push({ ...r, history, sampledEpochs:history.length, best, bestRank, firstPlaces:wins.length,
    positiveFirstPlaces:wins.filter(p=>p.score>0).length, lastWin,
    championThen:baseline.champion?.registration_id ?? null, championNow:now.champion?.registration_id ?? null,
    championUnchanged:baseline.champion?.wasm_url===now.champion?.wasm_url && baseline.champion?.wasm_hash===now.champion?.wasm_hash });
}
const output={at:new Date().toISOString(),epoch:current.epoch,discrepancies,rows};
await writeFile(path.join(dir,'historical-summary.json'),JSON.stringify(output,null,2)+'\n');
const header='| Intent | Current rank / score | Best observed score (epoch; rank) | Last rank 1 (score) | Wins / sampled epochs |\n|---|---|---|---|---|\n';
const table=header+rows.map(r=>`| ${r.intent} | ${r.rank} / ${r.score} | ${r.best.score} (e${r.best.epoch}; r${r.best.rank}) | ${r.lastWin ? 'e'+r.lastWin.epoch+' ('+r.lastWin.score+')' : 'None in sample'} | ${r.firstPlaces}/${r.sampledEpochs} |`).join('\n')+'\n';
await writeFile(path.join(dir,'historical-table.md'),table);
console.log(table);
console.log(JSON.stringify({conflicts:discrepancies.length,championChanges:rows.filter(r=>!r.championUnchanged).map(r=>({intent:r.intent,old:r.championThen,now:r.championNow}))}));
