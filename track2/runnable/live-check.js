// Compares a deployed endpoint with the locally proven scorer, for every served family:
//   node live-check.js [base-url]        (default: production)
// Per family: the commit-pinned hosted file's sha256 equals the pin, GET reports that sha256,
// and POST scores equal the local module's on a 600-question grid (6 batches of 100).
// For a protected preview, set VERCEL_BYPASS to a protection-bypass secret (sent as a header, never printed).
const crypto = require("node:crypto");
const { FAMILIES, PINNED_SHA256, handle } = require("./lib/score");
const BASE = (process.argv[2] || "https://livecert-comparator.vercel.app").replace(/\/$/, "");
const PINNED = "https://raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f8ae7e4a0cd16e9e8824d66ef8b8fa5a9/season2/comparator/dist";
const H = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : {};
const get = (url, init = {}) => fetch(url, { ...init, headers: { ...H, ...(init.headers || {}) }, signal: AbortSignal.timeout(30000) });
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
(async () => {
  const qs = [];
  const truths = [1n, 1000n, 77458000000n, 10n ** 18n, -(10n ** 18n), 9223372036854775807n];
  for (const code of [0n, 1n, 2n, 3n, 7n]) for (const tol of [0n, 50n, 100n, 10n ** 9n]) for (const t of truths)
    for (const d of [0n, 1n, -tol, 2n * tol, t / 200n]) qs.push(`{"ground_truth_value":${t},"miner_value":${BigInt.asIntN(64, t + d)},"spec":[${code},${tol}]}`);
  let allOk = true;
  for (const fam of FAMILIES) {
    const hosted = sha(Buffer.from(await (await fetch(`${PINNED}/${fam}.wasm`, { signal: AbortSignal.timeout(30000) })).arrayBuffer()));
    const g = await get(`${BASE}/${fam}/runnable`);
    const meta = g.status === 200 ? await g.json() : {};
    let bad = 0, n = 0, maxMs = 0;
    for (let i = 0; i < qs.length; i += 100) {
      const body = `{"batch":[${qs.slice(i, i + 100).join(",")}]}`;
      const t0 = Date.now();
      const r = await get(`${BASE}/${fam}/runnable`, { method: "POST", headers: { "content-type": "application/json" }, body });
      maxMs = Math.max(maxMs, Date.now() - t0);
      const live = r.status === 200 ? await r.json() : {};
      const [, local] = await handle("POST", fam, body);
      if (r.status !== 200 || JSON.stringify(live) !== JSON.stringify(local)) bad++;
      n += live.results?.length ?? 0;
    }
    const ok = hosted === PINNED_SHA256[fam] && meta.sha256 === hosted && n === qs.length && bad === 0;
    allOk &&= ok;
    console.log(`${ok ? "OK  " : "FAIL"} ${fam}: hosted sha256 ${hosted === PINNED_SHA256[fam] ? "= pin" : "!= pin " + hosted}` +
      ` | GET ${g.status} sha256 ${meta.sha256 === hosted ? "= hosted" : "!= hosted " + meta.sha256} | POST ${n}/${qs.length}, ${bad} batches differ | slowest ${maxMs} ms`);
  }
  const r = await get(`${BASE}/CRYPTO_PRICE/runnable`, { method: "POST", body: '{"score":1}' });
  console.log("old single form ->", r.status, "| base", BASE, "|", allOk ? "ALL OK" : "FAILURES");
  process.exitCode = allOk ? 0 : 1;
})();
