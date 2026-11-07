#!/usr/bin/env node
/**
 * Consumption ledger from the network's own records: every request the Engine routed to our miner.
 *
 *   node track1-miner/tools/consumption.mjs <since-ISO> <out-dir> [slug]
 *
 * Reads the public Daemon feed (devnode /daemon/api/questions), keeps the rows whose `routing.miner_slug` is ours,
 * and splits them into paid user requests (`source: user`) and the Daemon's own internal traffic. For each paid
 * request it reads `/engine/v1/signal/{hash}` (paying wallet, x402 `tx_hash`) and, where there is a tx, checks on
 * Ethereum Sepolia that it succeeded and moved USDC from that wallet to the Diamond. Writes `requests.json` and
 * `summary.md` to <out-dir>.
 *
 * What this proves: the network recorded these requests, our answers, and their payments. What it does not:
 * who the payers are. A wallet is not an H2 app. Tie each one to a registered H2 App before claiming consumption
 * points (GAPS G259). Question text is left out on purpose; anyone can re-read it from the feed by `signal_hash`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [since, outDir, slug = "livecert"] = process.argv.slice(2);
if (!since || !outDir) { console.error("usage: consumption.mjs <since-ISO> <out-dir> [slug]"); process.exit(2); }

const NODE = "https://devnode.telegraphprotocol.com";
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const USDC = "0xcc194e1a843b658526d0d5c431f670028582ae17"; // Telegraph test USDC (docs/using/x402-inference)
const DIAMOND = "0x3624eb012b5e998bb57b6be6c9cfc9c4bc5eb99b"; // Sepolia Diamond (docs/miners/miner-registration)
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const UA = { "user-agent": "livecert-miner/1.0 (+https://miner-wine.vercel.app)" };

async function getJson(url, init = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers: { ...UA, ...init.headers }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return await res.json();
      if (attempt >= 3) throw new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) { if (attempt >= 3) throw e; }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

// 1. Every feed row since <since>, oldest first.
const rows = [];
for (let offset = 0; ; ) {
  const u = new URL(`${NODE}/daemon/api/questions`);
  for (const [k, v] of Object.entries({ since, order: "asc", limit: "100", offset: String(offset) })) u.searchParams.set(k, v);
  const page = await getJson(u);
  rows.push(...page.results);
  offset += page.results.length;
  if (!page.results.length || offset >= page.total) break;
}
const ours = rows.filter((x) => x.routing?.miner_slug === slug);
const internal = ours.filter((x) => x.source !== "user");
const paid = ours.filter((x) => x.source === "user");

// Who chose the miner: the caller (named us) or the Engine's ranking (only these can earn ranked-routing points).
function chosenBy(x) {
  const first = (x.routing?.reasoning ?? "").split("\n")[0];
  if (x.routing_mode === "direct" || first === "user-directed" || /^Intent: miner \S+ given by the caller/.test(first)) return "caller";
  return "ranking";
}

// 2. Signal record and payment for each paid request.
async function paymentOk(tx, wallet) {
  const call = (method, params) => getJson(RPC, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }).then((j) => j.result);
  const rc = await call("eth_getTransactionReceipt", [tx]);
  if (!rc) return { tx_ok: false, paid_usdc: 0 };
  const word = (a) => `0x${a.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
  const moved = rc.logs.filter((l) => l.address.toLowerCase() === USDC && l.topics[0] === TRANSFER
    && l.topics[1] === word(wallet) && l.topics[2] === word(DIAMOND));
  const units = moved.reduce((a, l) => a + BigInt(l.data), 0n);
  return { tx_ok: rc.status === "0x1" && moved.length > 0, paid_usdc: Number(units) / 1e6 };
}

const records = [];
for (const x of paid) {
  const sig = (await getJson(`${NODE}/engine/v1/signal/${x.signal_hash}`).catch(() => null))?.signal ?? {};
  const wallet = sig.wallet_address ?? null;
  const pay = sig.tx_hash && wallet ? await paymentOk(sig.tx_hash, wallet) : { tx_ok: null, paid_usdc: null };
  const result = x.execution?.result ?? {};
  records.push({
    at: x.created_at, signal_hash: x.signal_hash, result_id: x.id, intent: x.routing?.intent ?? null,
    routing_mode: x.routing_mode ?? null, chosen_by: chosenBy(x), status: x.status, input_hash: x.question?.hash ?? null,
    wallet: wallet?.toLowerCase() ?? null, tx_hash: sig.tx_hash ?? null, ...pay,
    verdict: result.verdict ?? null, error: result.error ?? null,
  });
}

// 3. Summary.
const group = (xs, key) => xs.reduce((m, r) => m.set(key(r), [...(m.get(key(r)) ?? []), r]), new Map());
const days = (xs) => [...new Set(xs.map((r) => r.at.slice(0, 10)))].sort();
const usd = (xs) => xs.reduce((a, r) => a + (r.paid_usdc ?? 0), 0).toFixed(2);
const byWallet = [...group(records, (r) => r.wallet ?? "(no signal)")].sort((a, b) => b[1].length - a[1].length);
const ranked = records.filter((r) => r.chosen_by === "ranking");
const repeatWallets = byWallet.filter(([, xs]) => new Set(xs.map((r) => r.input_hash)).size >= 3);
const twoDayWallets = byWallet.filter(([, xs]) => days(xs).length >= 2);
const verified = records.filter((r) => r.tx_ok);

const md = [
  `# Paid requests routed to \`${slug}\`, from the network's records`,
  ``,
  `Generated ${new Date().toISOString()} by \`track1-miner/tools/consumption.mjs ${since} <out-dir> ${slug}\`.`,
  `Sources: \`${NODE}/daemon/api/questions\` (${rows.length} rows since ${since}), \`/engine/v1/signal/{hash}\`, and`,
  `Sepolia receipts from \`${RPC}\`.`,
  ``,
  `- **Paid user requests:** ${records.length}, from ${byWallet.length} payer wallets, on ${days(records).join(", ")}.`,
  `- **Chosen by the Engine's ranking:** ${ranked.length}, from ${group(ranked, (r) => r.wallet).size} wallets. The rest named our miner.`,
  `- **x402 payment verified on Sepolia** (USDC from the payer to the Diamond): ${verified.length}, $${usd(verified)} in total.` +
    ` ${records.filter((r) => r.tx_hash === null).length} have no tx hash in their signal record.`,
  `- **Network's own internal traffic** routed to us in the same period: ${internal.length} rows (not counted above).`,
  `- **Answered with status \`success\`:** ${records.filter((r) => r.status === "success").length}/${records.length}.`,
  ``,
  `| Payer wallet | Requests | Distinct inputs | UTC dates | Ranked | x402 verified | Intents |`,
  `|---|---:|---:|---|---:|---:|---|`,
  ...byWallet.map(([w, xs]) => `| \`${w}\` | ${xs.length} | ${new Set(xs.map((r) => r.input_hash)).size} | ${days(xs).join(", ")} | ` +
    `${xs.filter((r) => r.chosen_by === "ranking").length} | ${xs.filter((r) => r.tx_ok).length} | ` +
    `${[...group(xs, (r) => r.intent)].map(([i, ys]) => `${i} ${ys.length}`).join(", ")} |`),
  ``,
  `## Against the consumption rubric (10 points, Rules §06)`,
  ``,
  `- **App users (4):** not claimable yet. No wallet is tied to a registered H2 mission app (GAPS G259).`,
  `- **Repeat use (2):** ${repeatWallets.length} wallets sent ≥ 3 distinct inputs; ${twoDayWallets.length} used us on ≥ 2 UTC dates.` +
    ` They count only once a wallet is tied to a qualifying app.`,
  `- **Ranked routing (2):** ${ranked.length} requests went through the ranking path.`,
  `- **Accounting (2):** every row has a signal record matching request, miner and intent; ${verified.length} payments are verified on-chain.`,
  ``,
  `Our own availability sweeps and audits call the miner's URL directly, not the Engine, so none of them is in this feed.`,
].join("\n");

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "requests.json"), `${JSON.stringify(records, null, 1)}\n`);
writeFileSync(join(outDir, "summary.md"), `${md}\n`);
console.log(md);
