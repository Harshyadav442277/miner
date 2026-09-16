// Direct diagnostic requests, outside Telegraph's routed engine. No paid calls.
import { writeFile } from 'node:fs/promises';
const base = 'https://miner-wine.vercel.app';
const tests = [
  ['ip-google', '/ip-geolocate', { query: 'Where is 8.8.8.8 located and who operates it?' }],
  ['ip-loopback-v6', '/ip-geolocate', { query: 'Where is ::1 located?' }],
  ['ip-cloudflare-v6', '/ip-geolocate', { ip: '2606:4700:4700::1111' }],
  ['classify-billing', '/classify', { text: 'I was charged twice on my invoice.', labels: 'billing, technical, account issue' }],
  ['classify-intent', '/classify', { text: 'Do not cancel my subscription; I only need to update my card.', labels: 'cancel subscription, update payment method, report bug' }],
  ['classify-multilabel', '/classify', { query: 'Assign all applicable labels: billing, technical, account. Text: I was charged twice and the app crashes whenever I open it.' }],
  ['sentiment-irony', '/sentiment', { text: 'I just love being charged twice and ignored by support.' }],
  ['sentiment-control', '/sentiment', { text: 'The product broke after one day, terrible quality.' }],
  ['event-known', '/event-outcome', { query: 'Resolve this prediction market: who won the 2022 FIFA World Cup?' }],
  ['research-general', '/research', { query: 'Explain how Raft achieves consensus in a distributed system. Cite sources.' }],
  ['research-comparison', '/research', { query: 'What are the main differences between proof of work and proof of stake? Cite sources.' }],
  ['synthesis-general', '/research-synthesis', { query: 'Synthesize findings from multiple sources on the tradeoffs between proof of work and proof of stake.' }],
  ['web-official', '/web-search', { query: 'Find the official Python documentation for asyncio TaskGroup and explain how it handles task failures.' }],
  ['web-currentfacts', '/web-search', { query: 'What is the latest stable Python release?' }],
  ['financial-annual', '/financial', { query: "What was Apple's revenue in fiscal year 2024?" }],
  ['financial-quarter', '/financial', { query: "What was Apple's revenue in Q2 2024 and its year-over-year revenue growth for that quarter?" }],
  ['stock-historical', '/stock-price', { query: 'What was the closing price of AAPL on 2024-01-02?' }],
  ['telegraph-process', '/telegraph', { query: 'How does Telegraph convert a miner JSON response into an answer and score it using a champion WASM?' }],
  ['telegraph-leader', '/telegraph', { query: 'Who leads the WEB_SEARCH leaderboard in the latest epoch?' }],
  ['fraud-benign-negation', '/fraud-check', { query: 'Assess this payment scenario: the invoice uses our verified vendor bank account, no bank details changed, and our finance team confirmed the payment by phone.' }],
  ['fraud-card', '/fraud-check', { query: 'Assess this credit account activity: ten purchases in five minutes from two countries, followed by a request to increase the credit limit.' }],
  ['papers-count', '/papers', { query: 'Find three peer-reviewed papers about transformer language models.' }],
  ['tvl-chain', '/tvl', { query: "What is Aave's TVL on Base?", protocol: 'Aave', chain: 'base' }],
  ['currency-historical', '/convert', { query: 'Convert 100 GBP to EUR using the reference rate on 2024-01-02.' }],
  ['headlines-topic', '/headlines', { query: 'Give three spaceflight news headlines published in the last 24 hours.', topic: 'spaceflight' }],
  ['url-control', '/url-scan', { query: 'Scan https://example.com for phishing and malware indicators.' }],
  ['fact-bats', '/fact-check', { query: 'Fact check: bats are blind.' }],
  ['fact-sharks', '/fact-check', { query: 'Fact check: sharks are mammals.' }],
  ['game-known', '/game-result', { query: 'Who won Argentina vs France in the 2022 FIFA World Cup final on 2022-12-18?' }],
  ['sports-known', '/sports-score', { query: 'What was the Argentina vs France score in the 2022 FIFA World Cup final on 2022-12-18?' }],
  ['crosschain-scope', '/cross-chain', { query: 'Verify an Ethereum Merkle-Patricia state proof against a finalized Base block header.' }],
  ['extraction-control', '/extract', { text: 'From: John Smith, Subject: Quarterly Budget Review Meeting.' }],
];
const rows = [];
for (let i = 0; i < tests.length; i += 3) {
  const batch = await Promise.all(tests.slice(i, i + 3).map(async ([id, path, params]) => {
    const start = Date.now();
    try {
      const r = await fetch(`${base}${path}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(18000) });
      const body = await r.json();
      return { id, path, params, at: new Date(start).toISOString(), ms: Date.now() - start, status: r.status, body };
    } catch (e) { return { id, path, params, at: new Date(start).toISOString(), ms: Date.now() - start, error: String(e) }; }
  }));
  rows.push(...batch);
  for (const r of batch) console.log(`${r.id}: ${r.status ?? 'ERR'} ${r.ms}ms ${JSON.stringify(r.body ?? r.error)}`);
}
await writeFile(new URL('probes.json', import.meta.url), JSON.stringify({ base, at: new Date().toISOString(), kind: 'authored diagnostic probes; not hidden validator tests', rows }, null, 2) + '\n');
