// node high-demand.mjs
// Ours vs the pending competitors on the six high-demand families' adversarial suites.
// Each competitor is fetched from its registered, commit-pinned wasm_url and must match the sha256 below,
// whose keccak256 was checked against the registry's wasm_hash on 2026-11-08 ~19:20 UTC (`go run . hash`, ../verify).
// Every module runs twice in fresh WebAssembly instances (node's V8, the runnable's runtime; the node's own
// wazero runtime is covered by the 234,848-case grid in ../verify). Scores are compared with each case's
// `expected`, which gen-suite.mjs computed from the documented rule. Three mutants show the suite can fail.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SR = "https://raw.githubusercontent.com/Sireadell/tg-scorer/b6c309d35311891477669171b1ae7791ed18241c/modules";
const ZK = "https://raw.githubusercontent.com/zkasuran/telegraph-catalog-miners/366251af17ea05a115b6a87cc6ec233af56fe96e/comparators";
const COMPETITORS = {
  REGULATORY_FILING_MONITOR: [["#120 0xb3fb14fe", `${SR}/REGULATORY_FILING_MONITOR_GENERAL.wasm`, "eb72bc68a12d55a38bf85d146fcd6f1a8686035a48cdf922acd1dc0fc298dd81"]],
  CORPORATE_REGISTRY_LOOKUP: [["#101 0xb3fb14fe", `${SR}/CORPORATE_REGISTRY_LOOKUP_GENERAL.wasm`, "596bf52b4c6bc1d6a49871ca266a9c44e6e0f0b550568b8ed65f1b5e7f3e1448"]],
  LIQUIDITY_DEPTH_VERIFY: [["#114 0xb3fb14fe", `${SR}/LIQUIDITY_DEPTH_VERIFY_GENERAL.wasm`, "c626a27ff1bfba2e875ff027fea24082b8a2ae4c3506620bce4e461c45ebfa8e"]],
  GRID_POWER_PRICE: [["#111 0xb3fb14fe", `${SR}/GRID_POWER_PRICE_GENERAL.wasm`, "59e769fa68283c38ce27a57ded68b4b83172b25152434ee4c13a431ccf9dea3a"],
    ["#76 0x8b224783", `${ZK}/GRID_POWER_PRICE-52fa7958.wasm`, "2f4c9d1ec34816a452aca24f4d46e383f17b9def60161d6cc47b1f0f393116e0"]],
  MINING_HASHPRICE_VERIFY: [["#116 0xb3fb14fe", `${SR}/MINING_HASHPRICE_VERIFY_GENERAL.wasm`, "0e35aa9cf1049b208582e30cae77e0425ceef83c00c6ac32232654c7f23671a6"]],
  FINANCIAL_DATA: [["#107 0xb3fb14fe", `${SR}/FINANCIAL_DATA_GENERAL.wasm`, "97d5356c7c0064804bc91bf0c4ed2a00e902566de0c562d83908c430491a0d05"]],
};
const sha = (b) => createHash("sha256").update(b).digest("hex");

async function wasmScorer(bytes) {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const { imw_alloc, imw_free, imw_score_deterministic, memory } = instance.exports;
  return (c) => {
    const p = imw_alloc(16), v = new DataView(memory.buffer);
    v.setBigInt64(p, c.code, true); v.setBigInt64(p + 8, c.tol, true);
    const s = imw_score_deterministic(c.truth, c.miner, p); imw_free(p, 16); return Number(s);
  };
}

// Mutants: plausible wrong ports of the rule.
const MAX = 2n ** 63n - 1n, MIN = -(2n ** 63n), w = (x) => BigInt.asIntN(64, x);
const sat = (x) => (x > MAX ? MAX : x < MIN ? MIN : x), abs = (x) => (x < 0n ? -x : x);
const decay = (err, tol, win = sat(tol * 2n)) => (tol <= 0n ? (err === 0n ? 10000n : 0n) : err >= win ? 0n : sat(10000n * (win - err)) / win);
const mut = (relq, win) => (c) => {
  const diff = w(abs(w(c.miner - c.truth))), k = BigInt.asIntN(32, c.code);
  if (k === 1n) return Number(decay(diff, c.tol, win ? win(c.tol) : undefined));
  if (k === 2n) { let d = w(abs(c.truth)); if (d < 1n) d = 1n; return Number(decay(relq(diff, d), c.tol, win ? win(c.tol) : undefined)); }
  return c.miner === c.truth ? 10000 : 0;
};
const exactQ = (diff, d) => { const q = (diff * 10000n) / d; return q > MAX ? MAX : q; };
const MUTANTS = {
  "mutant i64-saturating diff*10000": mut((diff, d) => sat(diff * 10000n) / d),
  "mutant window = tolerance": mut(exactQ, (t) => t),
  "mutant rounded RelTol quotient": mut((diff, d) => { const q = (diff * 10000n * 2n + d) / (2n * d); return q > MAX ? MAX : q; }),
};

for (const fam of Object.keys(COMPETITORS)) {
  const cases = readFileSync(join(here, "suite", `${fam}.jsonl`), "utf8").trim().split("\n").map((l) => {
    const r = JSON.parse(l);
    return { ...r, code: BigInt(r.spec[0]), tol: BigInt(r.spec[1]), truth: BigInt(r.truth), miner: BigInt(r.miner) };
  });
  const mods = [["ours dist/" + fam + ".wasm", readFileSync(join(here, "..", "dist", `${fam}.wasm`))]];
  for (const [name, url, want] of COMPETITORS[fam]) {
    const b = Buffer.from(await (await fetch(url, { signal: AbortSignal.timeout(30000) })).arrayBuffer());
    if (sha(b) !== want) throw new Error(`${fam} ${name}: sha256 ${sha(b)} != pinned ${want}`);
    mods.push([name, b]);
  }
  console.log(`\n== ${fam}: ${cases.length} cases`);
  for (const [name, bytes] of mods) {
    const a = await wasmScorer(bytes), b = await wasmScorer(bytes);
    let agree = 0, nondet = 0; const ex = [];
    for (const c of cases) { const s = a(c); if (s !== b(c)) nondet++; if (s === c.expected) agree++; else if (ex.length < 2) ex.push(`${c.id} ${c.failure_mode} want ${c.expected} got ${s}`); }
    console.log(`  ${name} (${bytes.length} B): ${agree}/${cases.length} agree, nondeterministic ${nondet}${ex.length ? " | " + ex.join("; ") : ""}`);
  }
  for (const [name, f] of Object.entries(MUTANTS)) {
    const bad = cases.filter((c) => f(c) !== c.expected).length;
    console.log(`  ${name}: ${bad} disagree${bad ? "" : " (not caught on this family)"}`);
  }
}
