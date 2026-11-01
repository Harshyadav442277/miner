// Compares the deployed endpoint with the locally proven scorer: node live-check.js
const { handle } = require("./lib/score");
const BASE = "https://livecert-comparator.vercel.app";
(async () => {
  const qs = [];
  const truths = [1n, 1000n, 77458000000n, 10n ** 18n, -(10n ** 18n), 9223372036854775807n];
  for (const code of [0n, 1n, 2n, 3n, 7n]) for (const tol of [0n, 50n, 100n, 10n ** 9n]) for (const t of truths)
    for (const d of [0n, 1n, -tol, 2n * tol, t / 200n]) qs.push(`{"ground_truth_value":${t},"miner_value":${BigInt.asIntN(64, t + d)},"spec":[${code},${tol}]}`);
  for (const fam of ["CRYPTO_PRICE", "WEATHER_CHECK", "FX_NOW"]) {
    const meta = await (await fetch(`${BASE}/${fam}/runnable`)).json();
    let bad = 0, n = 0, maxMs = 0;
    for (let i = 0; i < qs.length; i += 100) {
      const body = `{"batch":[${qs.slice(i, i + 100).join(",")}]}`;
      const t0 = Date.now();
      const r = await fetch(`${BASE}/${fam}/runnable`, { method: "POST", headers: { "content-type": "application/json" }, body });
      maxMs = Math.max(maxMs, Date.now() - t0);
      const live = await r.json();
      const [, local] = await handle("POST", fam, body);
      if (r.status !== 200 || JSON.stringify(live) !== JSON.stringify(local)) bad++;
      n += live.results?.length ?? 0;
    }
    console.log(fam, "meta", JSON.stringify(meta).slice(0, 140), "| results", n, "of", qs.length, "| batches differing", bad, "| slowest batch", maxMs, "ms");
  }
  const r = await fetch(`${BASE}/CRYPTO_PRICE/runnable`, { method: "POST", body: '{"score":1}' });
  console.log("old single form ->", r.status);
})();
