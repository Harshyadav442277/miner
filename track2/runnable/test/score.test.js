"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { FAMILIES, handle, parseExact, bytesOf } = require("../lib/score");

// ReferenceScore from telegraph-wasm-baseline pkg/scoring/comparator/reference.go
// (unchanged between 992f2650 and 5fa5d68b), ported independently of the module:
// Go int64 arithmetic wraps, so every step is folded back to 64 bits.
const w = (v) => BigInt.asIntN(64, v);
const MAX = 2n ** 63n - 1n, MIN = -(2n ** 63n), ONE = 10000n;
const sat = (a, b) => { const p = a * b; return p > MAX ? MAX : p < MIN ? MIN : p; };
const absWrap = (v) => (v < 0n ? w(-v) : v);
const decay = (err, tol) => {
  if (tol <= 0n) return err === 0n ? ONE : 0n;
  const win = sat(tol, 2n);
  if (err >= win) return 0n;
  const num = sat(ONE, w(win - err));
  return num / win; // Go truncates toward zero, as BigInt division does
};
function reference(code, tol, truth, miner) {
  const diff = absWrap(w(miner - truth));
  const kind = Number(BigInt.asIntN(32, code));
  if (kind === 1) return decay(diff, tol);
  if (kind === 2) {
    let denom = absWrap(truth);
    if (denom < 1n) denom = 1n;
    const q = (diff * ONE) / denom;
    return decay(q >= MIN && q <= MAX ? q : MAX, tol);
  }
  return miner === truth ? ONE : 0n;
}

function cases() {
  const out = [];
  const codes = [0n, 1n, 2n, 3n, 4n, -1n, 2n ** 32n + 1n, 2n ** 32n + 2n];
  const tols = [-5n, 0n, 1n, 20n, 50n, 100n, 10000n, 10n ** 9n, MAX];
  const truths = [1n, 7n, 1000n, 10n ** 6n, 10n ** 12n, 10n ** 18n, -1n, -(10n ** 18n), MAX, MIN + 1n];
  for (const code of codes) for (const tol of tols) for (const truth of truths) {
    for (const d of [0n, 1n, -1n, tol, -tol, sat(tol, 2n), -sat(tol, 2n), truth / 100n, -(truth / 100n)]) {
      out.push([code, tol, truth, w(truth + d)]);
    }
  }
  let s = 0x2545f491n; // xorshift64, seeded: the same cases on every run
  const next = () => { s ^= w(s << 13n); s ^= w(s >> 7n); s ^= w(s << 17n); return s; };
  for (let i = 0; i < 20000; i++) out.push([next() % 5n, next() % 100000n, next() % (10n ** 18n) || 1n, next() % (10n ** 18n)]);
  return out;
}

const asBody = (batch) =>
  `{"batch":[${batch.map(([c, t, tr, m]) => `{"ground_truth_value":${tr},"miner_value":${m},"spec":[${c},${t}]}`).join(",")}]}`;

test("the served bytes are the verified comparator builds", () => {
  for (const f of FAMILIES) {
    const verified = fs.readFileSync(path.join(__dirname, "..", "..", "comparator", "dist", `${f}.wasm`));
    assert.ok(bytesOf(f).equals(verified), f);
  }
});

test("JSON integers past 2^53 are read exactly", () => {
  const b = parseExact('{"batch":[{"ground_truth_value":1000000000000000001,"miner_value":-9223372036854775807,"spec":[2,100]}]}');
  assert.equal(b.batch[0].ground_truth_value, 1000000000000000001n);
  assert.equal(b.batch[0].miner_value, -9223372036854775807n);
});

for (const family of FAMILIES) {
  test(`${family}: every case matches the reference rule exactly, twice`, async () => {
    const all = cases().filter(([, , truth]) => truth !== 0n); // the node never sends a truth of 0
    let first = null;
    for (let run = 0; run < 2; run++) {
      const scores = [];
      for (let i = 0; i < all.length; i += 100) {
        const batch = all.slice(i, i + 100);
        const [status, body] = await handle("POST", family, asBody(batch));
        assert.equal(status, 200);
        assert.equal(body.results.length, batch.length);
        body.results.forEach((r, j) => {
          const [c, t, tr, m] = batch[j];
          assert.equal(BigInt(r.score), reference(c, t, tr, m), `code ${c} tol ${t} truth ${tr} miner ${m}`);
          scores.push(r.score);
        });
      }
      if (first) assert.deepEqual(scores, first);
      first = scores;
    }
  });
}

test("malformed questions get a per-question error, the batch still answers", async () => {
  const [status, body] = await handle("POST", "CRYPTO_PRICE",
    '{"batch":[{"ground_truth_value":5,"miner_value":5,"spec":[0,0]},{"ground_truth_value":1.5,"miner_value":1,"spec":[0,0]},{"miner_value":1}]}');
  assert.equal(status, 200);
  assert.deepEqual(body.results[0], { score: 10000 });
  assert.ok(body.results[1].error);
  assert.ok(body.results[2].error);
});

test("the request shape is enforced", async () => {
  assert.equal((await handle("POST", "CRYPTO_PRICE", '{"score":1}'))[0], 400);
  assert.equal((await handle("POST", "CRYPTO_PRICE", "not json"))[0], 400);
  assert.equal((await handle("POST", "NOPE", "{}"))[0], 404);
  assert.equal((await handle("POST", "CRYPTO_PRICE", asBody(Array(101).fill([0n, 0n, 1n, 1n]))))[0], 400);
  assert.equal((await handle("GET", "WEATHER_CHECK", ""))[1].bytes, 2294);
});
