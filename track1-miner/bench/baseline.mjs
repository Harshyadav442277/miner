/**
 * Score PRODUCTION's current answers against the frozen bench and the champion
 * scorer, for both intents at once.
 *
 * This is also the champion-currency check. The 2026-08-30 audit recorded
 * LiveCert clip32 means of 0.013329 (ACADEMIC, scorer 688) and 0.092220
 * (SSL, scorer 631). The SSL expectation was RAISED to 0.665020 on 2026-08-31
 * when the unreachable answer was reordered to lead with the verification
 * method; 0.09222 is what the old shape scored. If those reproduce, the scorer we hold locally is still
 * behaving as the live one did — which is the closest thing available to
 * confirming the champion has not been replaced, since the node exposes no
 * scorer endpoint. A large divergence means STOP: measure nothing further until
 * the active scorer is re-identified. That is the mistake the CVE re-measurement
 * caught, where a stale champion made a 0.24 figure meaningless.
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { loadScorer } = await import(pathToFileURL(
  "C:/Users/hyada/OneDrive/Documents/Work-Related/Hackathons/Telegraph/track2/harness/wasm-abi.mjs").href);

const DIR = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PROD = "https://miner-wine.vercel.app";
const clip32 = (s) => s.split(/\s+/).slice(0, 32).join(" ");

const INTENTS = [
  { name: "ACADEMIC_SEARCH", wasm: "champ_acad_688.wasm", bench: "acad_bench.json", path: "/papers", audit: 0.013329 },
  { name: "SSL_VERIFICATION", wasm: "champ_ssl_631.wasm", bench: "ssl_bench.json", path: "/ssl-check", audit: 0.665020 },
];

for (const it of INTENTS) {
  const scorer = await loadScorer(`${DIR}${it.wasm}`);
  const bench = JSON.parse(await readFile(`${DIR}${it.bench}`, "utf8"));
  let raw = 0, clip = 0, n = 0;
  const rows = [];
  for (const { q, gt } of bench) {
    let ans = "";
    try {
      const r = await fetch(`${PROD}${it.path}?query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(30000) });
      ans = (await r.json()).reason ?? "";
    } catch { /* leave empty; counted as a miss below */ }
    if (!ans) { console.log(`  (empty answer) ${q.slice(0, 60)}`); continue; }
    const a = scorer.score(q, gt, ans);
    const c = scorer.score(q, gt, clip32(ans));
    raw += a; clip += c; n++;
    rows.push({ q, gt, ans, a, c });
  }
  const meanRaw = raw / n, meanClip = clip / n;
  const drift = Math.abs(meanClip - it.audit) / it.audit;
  console.log(`\n=== ${it.name}  (${n} rows, scorer ${it.wasm})`);
  console.log(`  raw mean    ${meanRaw.toFixed(6)}`);
  console.log(`  clip32 mean ${meanClip.toFixed(6)}   audit recorded ${it.audit}   drift ${(drift * 100).toFixed(1)}%`);
  console.log(drift < 0.35
    ? "  -> consistent with the audit; treating scorer 631/688 as still active."
    : "  -> DIVERGENT. Do not tune against this scorer until the active one is re-identified.");
  // The rows that are already at the cliff top have no headroom; the ones near
  // zero are where any gain has to come from.
  const sorted = [...rows].sort((x, y) => x.c - y.c);
  console.log("  weakest rows by clip32:");
  for (const r of sorted.slice(0, 5)) console.log(`    ${r.c.toFixed(6)}  ${r.q.slice(0, 72)}`);
  console.log(`  crossing (clip32 > 0.5): ${rows.filter((r) => r.c > 0.5).length}/${n}`);
}
