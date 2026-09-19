#!/usr/bin/env node
/**
 * Same request, production and the protected preview, side by side.
 *
 * Each probe is a request shape that production refused or answered wrongly on
 * 2026-09-19 (see the lane folders beside this file). The preview is behind
 * Vercel Authentication, so it is read through `vercel curl`.
 *
 *   node preview-probes.mjs https://miner-<id>-wukong4.vercel.app > preview-probes.txt
 */
import { execFileSync } from "node:child_process";

const PREVIEW = process.argv[2];
if (!PREVIEW) throw new Error("usage: preview-probes.mjs <preview-url>");
const PROD = "https://miner-wine.vercel.app";
const MINER_DIR = new URL("../../../miner/", import.meta.url);
const HASH = "0xb376975e90801e36a34432c960825a0c12a56d589a77a95aa552a7a3618678ee";

const PROBES = [
  ["onchain chain=eth", `/tx-lookup?hash=${HASH}&chain=eth`, /succeeded in block 25700000/],
  ["onchain txHash=", `/tx-lookup?txHash=${HASH}`, /succeeded in block 25700000/],
  ["onchain chain=solana (must refuse)", `/tx-lookup?hash=${HASH}&chain=solana`, /solana/i],
  ["ip one sentence", `/ip-geolocate?ip=8.8.8.8`, /^The IP address 8\.8\.8\.8 [^.]*Google[^.]*\.$/],
  ["extract contact line", `/extract?text=${encodeURIComponent("Reach us at support@example.com or call 555-0192.")}&query=${encodeURIComponent("Extract the named entities from the text.")}`, /support@example\.com/],
  ["convert base+symbols", `/convert?base=USD&symbols=JPY&amount=100`, /JPY|yen/i],
  ["convert names", `/convert?from=Dollar&to=Yen&amount=100`, /JPY|yen/i],
  ["game one team", `/game-result?team=Yankees`, /Yankees/],
  ["tvl node template", `/tvl?query=${encodeURIComponent("What is the current total value locked (TVL) in USD for Aave V3?")}`, /Aave/i],
  ["url-scan website=", `/url-scan?website=https://example.com`, /example\.com/],
];

function read(base, path, protectedPreview) {
  try {
    const out = protectedPreview
      // npx is a .cmd on Windows, which needs a shell, and an unquoted `&` in the
      // URL would end the command there.
      ? execFileSync(`npx vercel curl "${base}${path}" --scope wukong4`,
          { cwd: MINER_DIR, encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 })
      : execFileSync("curl", ["-4", "-s", "-m", "40", "-A", "Mozilla/5.0", `${base}${path}`], { encoding: "utf8" });
    const start = out.indexOf("{");
    const body = JSON.parse(out.slice(start));
    return String(body.reason ?? body.message ?? JSON.stringify(body)).slice(0, 260);
  } catch (e) {
    return `ERROR ${String(e.message).slice(0, 120)}`;
  }
}

let pass = 0;
console.log(`preview ${PREVIEW}\nat ${new Date().toISOString()}\n`);
for (const [label, path, expect] of PROBES) {
  const before = read(PROD, path, false);
  const after = read(PREVIEW, path, true);
  const ok = !after.startsWith("ERROR") && expect.test(after);
  if (ok) pass++;
  console.log(`## ${label}  ${ok ? "PASS" : "FAIL"}\n   ${path.slice(0, 120)}\n   production: ${before}\n   preview:    ${after}\n`);
}
console.log(`${pass}/${PROBES.length} preview probes matched their expectation`);
