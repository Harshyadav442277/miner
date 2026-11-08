// Builds the frozen adversarial suite for FX_NOW, CRYPTO_PRICE and WEATHER_CHECK.
//   node gen-suite.mjs            -> writes suite/<FAMILY>.jsonl (deterministic: same bytes every run)
//
// Truth anchors come from truth.json (fetched once, frozen). Each case's `expected` score is
// computed here from the rule as the docs state it (anjoman.ai/docs/scoring/build-a-scoring-module,
// read 2026-11-08): code read as i32, unknown code = Exact; AbsTol/RelTol decay linearly to 0 at
// 2*tolerance; tolerance <= 0 means exact; RelTol error = |miner-truth|*10000/|truth| in exact
// arithmetic, truncated; multiplications saturate. No scorer under test is consulted.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "truth.json"), "utf8"));
const I64_MIN = -(2n ** 63n), I64_MAX = 2n ** 63n - 1n;
const wrap = (v) => BigInt.asIntN(64, v);
const sat = (v) => (v > I64_MAX ? I64_MAX : v < I64_MIN ? I64_MIN : v);
const abs = (v) => (v < 0n ? -v : v);

// ---- the rule, from the docs text ----
function decay(err, tol) {
  if (tol <= 0n) return err === 0n ? 10000n : 0n;
  const window = sat(tol * 2n);
  if (err >= window) return 0n;
  return sat(10000n * (window - err)) / window;
}
export function rule(code, tol, truth, miner) {
  const diff = wrap(abs(wrap(miner - truth))); // i64 abs wraps at MIN
  const c = BigInt.asIntN(32, code);
  if (c === 1n) return decay(diff, tol);
  if (c === 2n) {
    let d = wrap(abs(truth)); if (d < 1n) d = 1n;
    const q = (diff * 10000n) / d; // exact, truncates toward zero
    return decay(q > I64_MAX || q < I64_MIN ? I64_MAX : q, tol);
  }
  return miner === truth ? 10000n : 0n; // Exact, PassFail, unknown
}

// ---- helpers ----
function fixed(str, dec) { // exact decimal string -> integer at `dec` decimals (half away from zero)
  const neg = str.startsWith("-"); const [i, f = ""] = str.replace("-", "").split(".");
  const digits = BigInt(i + f.padEnd(dec + 1, "0").slice(0, dec + 1));
  const v = (digits + 5n) / 10n; return neg ? -v : v;
}
const divRound = (a, b) => (a >= 0n ? (2n * a + b) / (2n * b) : -((2n * -a + b) / (2n * b)));
let seed = 20261108; // mulberry32, fixed seed: the suite is identical on every run
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ceilDiv = (a, b) => (a + b - 1n) / b;

// Band cases: miners placed relative to the spec's own tolerance, so every spec gets its edges.
function bandCases(code, tol, truth) {
  const c = BigInt.asIntN(32, code), out = [];
  if ((c !== 1n && c !== 2n) || tol <= 0n) return out;
  const at = (bpsNum, bpsDen) => ceilDiv(abs(truth === 0n ? 1n : truth) * bpsNum, 10000n * bpsDen); // diff for a RelTol error
  const w = 2n * tol;
  const d = c === 1n
    ? { at_tolerance: tol, just_inside_band: w - 1n, just_outside_band: w, far_outside_band: 10n * w }
    : { at_tolerance: at(tol, 1n), just_inside_band: at(w - 1n, 1n), rounding_edge_band: at(2n * w - 1n, 2n), just_outside_band: at(w, 1n), far_outside_band: at(10n * w, 1n) };
  for (const [mode, diff] of Object.entries(d)) {
    out.push([mode + "_above", truth + diff]);
    out.push([mode + "_below", truth - diff]);
  }
  const r = Number(c === 1n ? w : at(w, 1n)) || 1;
  for (let k = 0; k < 2; k++) out.push(["seeded_jitter", truth + BigInt(Math.round((rnd() * 2 - 1) * 1.5 * r))]);
  return out;
}

function staticCases(truth) {
  return [["exact", truth], ["one_unit_above", truth + 1n], ["one_unit_below", truth - 1n],
    ["decimal_shift_x10", truth * 10n], ["decimal_shift_x100", truth * 100n], ["decimal_shift_x1000", truth * 1000n],
    ["decimal_shift_div100", truth / 100n], ["sign_flipped", -truth], ["zero_answer", 0n],
    ["parse_overflow_i64_max", I64_MAX], ["parse_overflow_i64_min", I64_MIN]];
}

const SPECS = {
  FX_NOW: [[0n, 0n, "gate_recorded (/api/wasm intent_spec, 2026-11-08)"], [2n, 50n, "hypothetical RelTol 0.5%"],
    [2n, 100n, "battery RelTol 1%"], [1n, 1000n, "battery AbsTol 0.001"], [3n, 0n, "battery PassFail"], [7n, 100n, "battery unknown code"], [2n, 10000n, "battery RelTol 100%"]],
  CRYPTO_PRICE: [[0n, 0n, "gate_recorded (/api/wasm intent_spec, 2026-11-08)"], [2n, 100n, "on-chain RelTol 1% (GAPS G237, read 2026-10-31)"],
    [2n, 10n, "battery RelTol 0.1%"], [1n, 1000000n, "battery AbsTol $1 at 6 dp"], [3n, 0n, "battery PassFail"], [7n, 100n, "battery unknown code"], [2n, 10000n, "battery RelTol 100%"]],
  WEATHER_CHECK: [[0n, 0n, "gate_recorded (/api/wasm intent_spec, 2026-11-08)"], [1n, 2000000n, "on-chain AbsTol 2.0 C (GAPS G237, read 2026-10-31; 6 dp assumed)"],
    [1n, 500000n, "battery AbsTol 0.5 C"], [2n, 100n, "battery RelTol 1%"], [3n, 0n, "battery PassFail"], [7n, 100n, "battery unknown code"], [1n, 0n, "battery AbsTol 0"]],
};

// Per-family anchors: [key, truth, extra failure-mode cases]
function anchors(fam) {
  if (fam === "FX_NOW") {
    const e = T.FX_NOW.eur_based, rate = (s, k) => divRound(fixed(s[k], 6) * 1000000n, fixed(s.USD, 6));
    const cur = { EUR: divRound(10n ** 12n, fixed(e.current.USD, 6)), CAD: rate(e.current, "CAD"), SEK: rate(e.current, "SEK") };
    const old = { EUR: divRound(10n ** 12n, fixed(e.stale.USD, 6)), CAD: rate(e.stale, "CAD"), SEK: rate(e.stale, "SEK") };
    return Object.keys(cur).map((k) => [`FX_NOW_${k}`, k, cur[k], [
      ["inverted_rate_usd_per_key", divRound(10n ** 12n, cur[k])],
      ...Object.keys(cur).filter((o) => o !== k).map((o) => [`wrong_pair_${o}`, cur[o]]),
      ["stale_rate_2026-10-01", old[k]],
      ["decimals_4_read_as_6", cur[k] / 100n]]]);
  }
  if (fam === "CRYPTO_PRICE") {
    const u = T.CRYPTO_PRICE.usd, out = [];
    for (const k of Object.keys(u)) {
      const t = fixed(u[k], 6), others = Object.keys(u).filter((o) => o !== k);
      out.push([`CRYPTO_PRICE_USD`, `${k}@6dp`, t, [["price_in_cents", t * 100n], ["wrong_asset_" + others[0], fixed(u[others[0]], 6)],
        ["inverted_asset_per_usd", divRound(10n ** 12n, t)], ["stale_synthetic_minus_3pct", t - t * 3n / 100n], ["satoshi_scale_x100", t * 100n]]]);
      out.push([`CRYPTO_PRICE_USD`, `${k}@8dp`, fixed(u[k], 8), [["six_dp_value_on_8dp_scale", t]]]);
    }
    out.push([`CRYPTO_PRICE_USD`, `XRP@18dp`, fixed(u.XRP, 18), [["six_dp_value_on_18dp_scale", fixed(u.XRP, 6)], ["one_wei_above", fixed(u.XRP, 18) + 1n]]]);
    return out;
  }
  const c = T.WEATHER_CHECK.celsius, out = [], cities = Object.keys(c);
  for (const k of cities) {
    const t = fixed(c[k], 6), f = divRound(t * 9n, 5n) + 32000000n, kel = t + 273150000n;
    const other = cities[(cities.indexOf(k) + 1) % cities.length];
    out.push([`WEATHER_CHECK_TEMPERATURE`, k, t, [["fahrenheit_as_celsius", f], ["kelvin_as_celsius", kel],
      ["wrong_city_" + other.replace(" ", "_"), fixed(c[other], 6)], ["rounded_to_whole_degree", divRound(t, 1000000n) * 1000000n]]]);
  }
  out.push([`WEATHER_CHECK_TEMPERATURE`, "boundary_min_-90C", -90000000n, [["fahrenheit_as_celsius", -130000000n], ["below_range_-91C", -91000000n]]]);
  out.push([`WEATHER_CHECK_TEMPERATURE`, "boundary_max_60C", 60000000n, [["fahrenheit_as_celsius", 140000000n], ["kelvin_as_celsius", 333150000n]]]);
  out.push([`WEATHER_CHECK_TEMPERATURE`, "zero_0C", 0n, [["fahrenheit_as_celsius", 32000000n], ["kelvin_as_celsius", 273150000n], ["one_microdegree_above", 1n]]]);
  out.push([`WEATHER_CHECK_TEMPERATURE`, "near_zero_-0.000001C", -1n, [["sign_crossing_+0.000001C", 1n]]]);
  return out;
}

mkdirSync(join(here, "suite"), { recursive: true });
for (const fam of Object.keys(SPECS)) {
  const rows = [];
  for (const [intent, key, truth, extra] of anchors(fam)) {
    for (const [code, tol, specSource] of SPECS[fam]) {
      const cases = [...staticCases(truth), ...extra, ...bandCases(code, tol, truth)];
      for (const [mode, m] of cases) {
        const miner = sat(m); // values the node could pass are i64
        const expected = rule(code, tol, truth, miner);
        rows.push({ id: `${fam}-${String(rows.length + 1).padStart(4, "0")}`, family: fam, intent, key, failure_mode: mode,
          spec: [code.toString(), tol.toString()], spec_source: specSource, truth: truth.toString(), miner: miner.toString(),
          expected: Number(expected), verdict: expected === 10000n ? "full" : expected === 0n ? "zero" : "partial" });
      }
    }
  }
  writeFileSync(join(here, "suite", `${fam}.jsonl`), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(fam, rows.length, "cases");
}
