// Read-only public API capture supporting the dated Markdown report.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = new URL('./', import.meta.url);
const audit = JSON.parse(await readFile(new URL('rank-audit.json', dir), 'utf8'));
const save = (name, value) => writeFile(new URL(name, dir), JSON.stringify(value, null, 2) + '\n');
async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`${r.status}: ${url}`);
  return r.json();
}
const urls = {
  catalog: 'https://devnode.telegraphprotocol.com/api/miners',
  epoch: 'https://explorer.telegraphprotocol.com/api/epoch',
  canonical: 'https://devnode.telegraphprotocol.com/engine/v1/intents',
  leaderboard: `https://explorer.telegraphprotocol.com/api/leaderboard/miners/epoch/${audit.epoch}?limit=1000`,
};
const sources = {};
for (const [name, url] of Object.entries(urls)) {
  try { const data = await get(url); await save(`${name}.json`, data); sources[name] = { url, at: new Date().toISOString() }; }
  catch (e) { sources[name] = { url, error: String(e) }; }
}
const response = await fetch(audit.yamlUrl, { signal: AbortSignal.timeout(25000) });
if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
const remote = await response.text();
const local = await readFile(new URL('../../../miner.yaml', dir), 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
await writeFile(new URL('registered-manifest.yaml', dir), remote);
await save('identity.json', { at: new Date().toISOString(), registrationId: audit.registrationId, owner: audit.owner,
  url: audit.yamlUrl, registeredHash: audit.yamlHash, fetchedHash: hash(remote), localRawHash: hash(local),
  localLFHash: hash(local.replace(/\r\n/g, '\n')), hashMatches: hash(remote) === audit.yamlHash,
  localContentMatches: local.replace(/\r\n/g, '\n') === remote.replace(/\r\n/g, '\n'), sources });
const summaries = [];
const failures = [];
for (let i = 0; i < audit.rows.length; i += 4) {
  await Promise.all(audit.rows.slice(i, i + 4).map(async row => {
    try {
      const history = await get(`https://devnode.telegraphprotocol.com/scores?intent=${row.intent}&limit=400`);
      await save(`history-${row.intent}.json`, history);
      const champion = JSON.parse(await readFile(new URL(`${row.intent}.json`, dir), 'utf8')).champion;
      const ours = history.scores.filter(s => s.miner_slug === 'livecert' && s.epoch_id >= 329);
      const current = history.scores.filter(s => s.epoch_id === audit.epoch);
      const lead = current.find(s => s.rank === 1);
      const mine = current.find(s => s.miner_slug === 'livecert');
      summaries.push({ ...row, championId: champion?.registration_id ?? null,
        scoredAt: mine?.scored_at, failureReason: mine?.failure_reason,
        catalogAgrees: mine?.rank === row.rank && mine?.score === row.score && lead?.miner_slug === row.leader && lead?.score === row.top,
        traceFields: mine ? Object.keys(mine) : [], history: ours,
        recentFailures: history.scores.filter(s => s.epoch_id >= 334 && s.failure_reason) });
    } catch (e) { failures.push({ intent: row.intent, error: String(e) }); }
  }));
}
summaries.sort((a,b) => a.intent.localeCompare(b.intent));
await save('summary.json', { at: new Date().toISOString(), epoch: audit.epoch, failures, rows: summaries });
console.log(JSON.stringify({ identityVerified: hash(remote) === audit.yamlHash, rows: summaries.length,
  allCatalogRowsAgree: summaries.every(r => r.catalogAgrees), failures,
  oursFailures: summaries.filter(r => r.failureReason).map(r => ({ intent: r.intent, failure: r.failureReason })),
  scoreWindow: summaries.map(r => r.scoredAt).sort().filter(Boolean).filter((x,i,a) => i === 0 || i === a.length - 1)
}, null, 2));
