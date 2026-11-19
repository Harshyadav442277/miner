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

// sha256 of each file as hosted at the commit-pinned registration URL
// (raw.githubusercontent.com/Harshyadav442277/telegraph-factscore/2825b06f.../season2/comparator/dist/<FAMILY>.wasm).
// The bytes are checked once at load: a mismatch makes the function fail to start rather than serve other bytes.
// The six families the node evaluates after the 2026-11-17 reset serve the 0.2.0 files instead
// (track2/comparator/dist-v2, hosted at a pinned commit of Harshyadav442277/miner): same arithmetic, new label.
const PINNED_SHA256 = {
  FX_NOW: "5bbd4af6df957b0a6922262fe4cacb1868acb0c7a929c858026f3e473e8c47ca",
  CRYPTO_PRICE: "a5de8f16f57ec703bb4597b3d89d70a0a0a146f738110645bb929d3ae9ad0fab",
  WEATHER_CHECK: "64f5669d62a5889f6bde69005da4472422bc1c690d4f65e5a35d8ad0067c74b6",
  CURRENCY_EXCHANGE: "886e67c7b8f8c242d95ab9be3cefe3d50fdf9671e2b2d05998a973a88fca10e5",
  SSL_VERIFICATION: "57fa6d4ccaea6c63f6ed0e416ce968277871eb3ea5bb74cc8354478906b0bdb2",
  STOCK_PRICE: "33649d0e49bb867f162cb94cc07c24e6ba2ffe45f040f6b348a6c3f0b271e03b",
  REGULATORY_FILING_MONITOR: "5506d7f0f3b168d1ea45a5ab7ca43457264d9eb43403d505936a0cadd824c97e",
  CORPORATE_REGISTRY_LOOKUP: "86ff887bc600975c2be5e6687dc6ca2dac3caf954bfe8d4535f5dacc9d0b4088",
  LIQUIDITY_DEPTH_VERIFY: "65bdefda4bc80ef2728c9f7556789750a97ef88b20e2ebb7a9231bc43c3d1ee5",
  GRID_POWER_PRICE: "a5aa5d7dc954883e9c2215f3479ff91884758a65624ef579837328c9e910e2ac",
  MINING_HASHPRICE_VERIFY: "9b816e49609a9eb23a7b0793ccb4d71564a697e70654bc86a1e21f2b8011d0da",
  FINANCIAL_DATA: "dc502271f195e3d3d046ad229fb002f99d67c563638fc3a8f412dbe46a8ef395",
};
const FAMILIES = Object.keys(PINNED_SHA256);
const MAX_BATCH = 100;
const I64_MIN = -(2n ** 63n);
const I64_MAX = 2n ** 63n - 1n;

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const BYTES = Object.fromEntries(FAMILIES.map((family) => {
  const b = fs.readFileSync(path.join(__dirname, "..", "wasm", `${family}.wasm`));
  if (sha256(b) !== PINNED_SHA256[family]) throw new Error(`${family}.wasm sha256 ${sha256(b)} is not the hosted ${PINNED_SHA256[family]}`);
  return [family, b];
}));
const bytesOf = (family) => BYTES[family];

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
    return [200, { family, kind: "comparator", bytes: b.length, sha256: sha256(b),
      protocol: 'POST {"batch":[{"ground_truth_value":i64,"miner_value":i64,"spec":[kind,tolerance]}]}' }];
  }
  if (method !== "POST") return [405, { error: "POST a batch" }];
  let body;
  try { body = parseExact(rawBody); } catch (e) { return [400, { error: `body is not JSON: ${e.message}` }]; }
  if (!body || !Array.isArray(body.batch)) return [400, { error: 'expected {"batch": [...]}' }];
  if (body.batch.length > MAX_BATCH) return [400, { error: `at most ${MAX_BATCH} questions per batch` }];
  return [200, { results: await scoreBatch(family, body.batch) }];
}

module.exports = { FAMILIES, PINNED_SHA256, handle, parseExact, scoreBatch, bytesOf };
