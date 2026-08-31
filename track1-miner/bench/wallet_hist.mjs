/**
 * Re-testing the historical-date branch, because the Preflight audit contradicts
 * my earlier conclusion and its evidence is better powered than mine.
 *
 * I measured four wordings over the 13-row frozen bench and got 0.001–0.005 on
 * every historical row, and concluded the class was unwinnable because the
 * ground truths contradict each other — some refuse, some assert "2.47 ETH".
 *
 * The audit reports Preflight's own replay moving 0.2488 -> 0.4966 with cliff
 * crossings 4/16 -> 8/16 on this branch. The wording it describes is more
 * specific than anything I tried: the exact past balance "requires the
 * corresponding historical block / archive node". None of my variants said
 * "archive node" or "historical block" at all, so I tested the concept and not
 * their sentence. This tests the sentence.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scorer = await loadScorer(
  // Champion rotated 2026-08-31T05:58Z: reg 2575 = reg 1066 with score² (GAPS G52).
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/champions/wallet_reg2575.wasm");
const raw = JSON.parse(await readFile(`${DIR}bench_WALLET_BALANCE_CHECK.json`, "utf8"));
const rows = Array.isArray(raw) ? raw : Object.values(raw)[0];
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");

const DATE = /\bas of\s+([A-Z][a-z]+ \d{1,2},? \d{4})|\bon\s+([A-Z][a-z]+ \d{1,2},? \d{4})/;
const isHistorical = (q) => DATE.test(q);

const VARIANTS = {
  // What production sends today: the current balance, no acknowledgement.
  deployed: ({ addr, chain, amt }) =>
    `The address ${addr} currently has a native-coin balance of ${amt} ETH on ${chain}. ` +
    `This was determined by querying the eth_getBalance RPC method against the ${chain} network, ` +
    `which returns the account's balance in wei at the latest block.`,

  // What I tested before and dismissed the class on.
  mineBefore: ({ addr, chain, amt }) =>
    `The address ${addr} currently has a native-coin balance read at the latest block on ${chain}. ` +
    `A historical balance at a past date cannot be returned by the eth_getBalance RPC method ` +
    `against the latest block, which reports only the current balance.`,

  // The audit's sentence: name the archive node and the historical block.
  archive: ({ addr, chain, amt, date }) =>
    `The balance of ${addr} on ${chain} as of ${date} cannot be determined from a latest-block ` +
    `query. Retrieving a historical balance requires querying the corresponding historical block ` +
    `through an archive node. The current balance is ${amt} ETH.`,

  // Same, but leading with the current figure the question literally asked for
  // ("what is the CURRENT balance ... as of <date>" is self-contradictory).
  currentThenArchive: ({ addr, chain, amt, date }) =>
    `The address ${addr} currently has a native-coin balance of ${amt} ETH on ${chain}. ` +
    `The balance as of ${date} cannot be returned by eth_getBalance at the latest block; a ` +
    `historical balance requires the corresponding block number and an archive node.`,

  // Archive wording without restating the address first.
  archiveTerse: ({ chain, amt, date }) =>
    `A historical balance as of ${date} requires querying the corresponding historical block via ` +
    `an archive node, which a latest-block eth_getBalance call cannot provide. The current ` +
    `native-coin balance on ${chain} is ${amt} ETH.`,
};

const tot = {}, cross = {}, wins = {};
for (const k of Object.keys(VARIANTS)) { tot[k] = 0; cross[k] = 0; wins[k] = 0; }
let n = 0;

for (const r of rows) {
  const q = r.q ?? r.question, gt = r.gt ?? r.ground_truth;
  if (!isHistorical(q)) continue;
  const m = q.match(DATE);
  const date = (m?.[1] ?? m?.[2] ?? "that date").replace(/,/g, ",");
  const addr = (q.match(/0x[a-fA-F0-9]+/) ?? ["the address"])[0];
  const chain = /arbitrum/i.test(q) ? "Arbitrum" : /base/i.test(q) ? "Base" : "Ethereum";
  const ctx = { addr, chain, amt: "2.47", date };
  n++;
  const sc = {};
  for (const [name, render] of Object.entries(VARIANTS)) {
    const c = scorer.score(q, gt, clip32(render(ctx)));
    tot[name] += c; sc[name] = c;
    if (c > 0.5) cross[name]++;
  }
  wins[Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0]]++;
  console.log(`  ${date.padEnd(20)} ${Object.entries(sc).map(([k, v]) => `${k}:${v.toFixed(4)}`).join("  ")}`);
}

console.log(`\nWALLET historical-date rows — ${n} rows, champion 2575, clip32\n`);
console.log("  variant              mean        best-on   crossings");
for (const k of Object.keys(VARIANTS)) {
  console.log(`  ${k.padEnd(19)}  ${(tot[k] / n).toFixed(6)}    ${String(wins[k]).padStart(3)}       ${cross[k]}/${n}`);
}
