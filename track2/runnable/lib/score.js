"use strict";
/**
 * The comparator batch request, served from the exact bytes registered on-chain.
 *
 * Protocol (docs /scoring/build-a-scoring-module, "The runnable endpoint", read 2026-10-31):
 *   POST {"batch": [{"ground_truth_value": i64, "miner_value": i64, "spec": [kind, tolerance]}, ...]}
 *   200  {"results": [{"score": 0..10000} | {"error": "..."}, ...]}, one per question, in order.
 *
 * Values reach wei scale (1e18), past JavaScript's safe integers, so every JSON
 * integer is read as a BigInt from its source text. A fresh instance scores each
 * batch, so no state carries between requests.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const FAMILIES = ["CRYPTO_PRICE", "WEATHER_CHECK", "FX_NOW"];
const MAX_BATCH = 100;
const I64_MIN = -(2n ** 63n);
const I64_MAX = 2n ** 63n - 1n;

const bytesOf = (family) => fs.readFileSync(path.join(__dirname, "..", "wasm", `${family}.wasm`));

/** JSON.parse with every integer kept exact as a BigInt (needs Node 21+ reviver source text). */
function parseExact(text) {
  return JSON.parse(text, (_key, value, context) => {
    if (typeof value !== "number") return value;
    const src = context && context.source;
    if (typeof src !== "string") throw new Error("this runtime cannot read JSON source text");
    return /^-?\d+$/.test(src) ? BigInt(src) : value;
  });
}

const isI64 = (v) => typeof v === "bigint" && v >= I64_MIN && v <= I64_MAX;

async function scoreBatch(family, batch) {
  const { instance } = await WebAssembly.instantiate(bytesOf(family), {});
  const { imw_alloc, imw_free, imw_score_deterministic, memory } = instance.exports;
  return batch.map((q) => {
    const spec = q && q.spec;
    if (!q || !isI64(q.ground_truth_value) || !isI64(q.miner_value) || !Array.isArray(spec) ||
        spec.length !== 2 || !isI64(spec[0]) || !isI64(spec[1])) {
      return { error: "expected integer ground_truth_value, miner_value and spec [kind, tolerance]" };
    }
    const ptr = imw_alloc(16);
    const view = new DataView(memory.buffer);
    view.setBigInt64(ptr, spec[0], true);
    view.setBigInt64(ptr + 8, spec[1], true);
    const score = imw_score_deterministic(q.ground_truth_value, q.miner_value, ptr);
    imw_free(ptr, 16);
    if (score < 0n || score > 10000n) return { error: `module refused the input (${score})` };
    return { score: Number(score) };
  });
}

/** Returns [status, body] for one request; the HTTP layer only moves bytes. */
async function handle(method, family, rawBody) {
  if (!FAMILIES.includes(family)) return [404, { error: `unknown family; serving ${FAMILIES.join(", ")}` }];
  if (method === "GET") {
    const b = bytesOf(family);
    return [200, { family, kind: "comparator", bytes: b.length, sha256: crypto.createHash("sha256").update(b).digest("hex"),
      protocol: 'POST {"batch":[{"ground_truth_value":i64,"miner_value":i64,"spec":[kind,tolerance]}]}' }];
  }
  if (method !== "POST") return [405, { error: "POST a batch" }];
  let body;
  try { body = parseExact(rawBody); } catch (e) { return [400, { error: `body is not JSON: ${e.message}` }]; }
  if (!body || !Array.isArray(body.batch)) return [400, { error: 'expected {"batch": [...]}' }];
  if (body.batch.length > MAX_BATCH) return [400, { error: `at most ${MAX_BATCH} questions per batch` }];
  return [200, { results: await scoreBatch(family, body.batch) }];
}

module.exports = { FAMILIES, handle, parseExact, scoreBatch, bytesOf };
