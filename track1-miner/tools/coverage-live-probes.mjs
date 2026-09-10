#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const base = process.argv[2] ?? "https://miner-wine.vercel.app";
const output = resolve(process.argv[3] ?? "track1-miner/docs/evidence/rank1-2026-09-10/coverage-live-after.json");
const rows = [];
async function probe(path, params, check) {
  const url = `${base}${path}?${new URLSearchParams(params)}`;
  const started = Date.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  const body = await response.json();
  const row = { url, status: response.status, elapsed_ms: Date.now() - started, body, passed: false };
  rows.push(row);
  assert.equal(response.status, 200);
  check(body);
  row.passed = true;
}
try {
  await probe("/extract", { query: "Extract email addresses and dates", text: "Email sam@example.com before March 12, 2026." }, b => {
    assert.deepEqual(b.extracted.emails, ["sam@example.com"]);
    assert.deepEqual(b.extracted.dates, ["March 12, 2026"]);
  });
  await probe("/extract", { query: "Extract numeric values", text: "Revenue was $1,234.56." }, b => {
    assert.deepEqual(b.extracted.values, ["$1,234.56"]);
  });
  await probe("/weather-forecast", { location: "Chennai", hours: "0" }, b => {
    assert.notEqual(b.verdict, "unknown");
    assert.match(b.reason, /A 1-hour hourly weather forecast/);
  });
  await probe("/storm-alert", { location: "Chennai", hours: "0" }, b => {
    assert.notEqual(b.verdict, "unknown");
    assert.match(b.reason, /right now/);
  });
  for (const days of ["1", "2"]) {
    await probe("/storm-alert", { location: "Chennai", days }, b => {
      assert.notEqual(b.verdict, "unknown");
      assert.ok(b.reason.includes(`over the next ${Number(days) * 24} hours`));
    });
  }
} finally {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ checked_at: new Date().toISOString(), base, rows }, null, 2) + "\n");
  console.log(`${rows.filter(r => r.passed).length}/${rows.length} production coverage probes passed; ${output}`);
}
