// node live-check-all.mjs
// For each registered family: (1) the registered file at its pinned URL hashes to the local dist/ bytes,
// (2) the runnable's GET reports the sha256 of those bytes, (3) the runnable's POST scores equal the
// local module's on the same 600-question grid as ../../runnable/live-check.js.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const BASE = "https://livecert-comparator.vercel.app";
const PINNED = "https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const get = async (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(30000) });

async function localScores(bytes, qs) {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const { imw_alloc, imw_score_deterministic, memory } = instance.exports;
  return qs.map(([t, m, c, tol]) => {
    const p = imw_alloc(16), v = new DataView(memory.buffer);
    v.setBigInt64(p, c, true); v.setBigInt64(p + 8, tol, true);
    return Number(imw_score_deterministic(t, m, p));
  });
}

const qs = [];
const truths = [1n, 1000n, 77458000000n, 10n ** 18n, -(10n ** 18n), 9223372036854775807n];
for (const code of [0n, 1n, 2n, 3n, 7n]) for (const tol of [0n, 50n, 100n, 10n ** 9n]) for (const t of truths)
  for (const d of [0n, 1n, -tol, 2n * tol, t / 200n]) qs.push([t, BigInt.asIntN(64, t + d), code, tol]);

for (const fam of ["FX_NOW", "CRYPTO_PRICE", "WEATHER_CHECK"]) {
  const local = readFileSync(join(dist, `${fam}.wasm`));
  const pinned = Buffer.from(await (await get(`${PINNED}/${fam}.wasm`)).arrayBuffer());
  const meta = await (await get(`${BASE}/${fam}/runnable`)).json();
  const want = await localScores(local, qs);
  let differ = 0, n = 0, bad = 0;
  for (let i = 0; i < qs.length; i += 100) {
    const part = qs.slice(i, i + 100);
    const body = `{"batch":[${part.map(([t, m, c, tol]) => `{"ground_truth_value":${t},"miner_value":${m},"spec":[${c},${tol}]}`).join(",")}]}`;
    const r = await get(`${BASE}/${fam}/runnable`, { method: "POST", headers: { "content-type": "application/json" }, body });
    if (r.status !== 200) { bad++; continue; }
    const res = (await r.json()).results;
    res.forEach((x, j) => { n++; if (x.score !== want[i + j]) differ++; });
  }
  console.log(`${fam}: local sha256 ${sha(local)} | pinned-URL bytes ${pinned.length} sha256 ${sha(pinned) === sha(local) ? "equal" : "DIFFERENT " + sha(pinned)}` +
    ` | runnable GET sha256 ${meta.sha256 === sha(local) ? "equal" : "DIFFERENT " + meta.sha256} | POST ${n}/${qs.length} answered, ${differ} differ from local, ${bad} failed batches`);
}
