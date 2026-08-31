#!/usr/bin/env node
/**
 * Every Track 1 gate, in one command.
 *
 *   node track1-miner/tools/preflight.mjs [base-url]
 *
 * Run it before any deploy and before signing anything on-chain. `verify-deploy`
 * alone is not sufficient and never was — it passed green through all five
 * defects found on 2026-08-30 (GAPS G30-G33).
 *
 * `no-regression` is expected to report 7 identical and 1 differing: the
 * `/ip-geolocate` divergence is known, deliberate and documented in GAPS G35.
 * Any OTHER shape from it is a real regression, so the expectation is asserted
 * here rather than the exit code being ignored.
 *
 * The upstreams flap under concurrent load. A single red run is not proof of a
 * defect — re-run the failing gate on its own before believing it.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TOOLS = dirname(fileURLToPath(import.meta.url));
const MINER = join(TOOLS, "..", "miner");
const BASE = process.argv[2] ?? "https://miner-wine.vercel.app";

const run = (cmd, args, cwd) =>
  spawnSync(cmd, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });

const GATES = [
  ["unit + live suite", () => run("npm", ["test"], MINER),
    (o) => /^# fail 0$/m.test(o) || /ℹ fail 0/.test(o)],
  ["verify-deploy", () => run("node", [join(TOOLS, "verify-deploy.mjs"), BASE], TOOLS),
    (o) => /ALL CHECKS PASSED/.test(o)],
  ["param shapes (engine-shaped)", () => run("node", [join(TOOLS, "param-shapes.mjs"), BASE], TOOLS),
    (o) => /\b0 failed\b/.test(o)],
  // Correctness, not shape. Every other gate here would happily pass an
  // endpoint returning a confident, well-formed, WRONG answer — and
  // verify-deploy predates the expansion, so three of the ten intents had no
  // correctness check at all until this one. It is what caught /extract
  // silently dropping "2.3 meters" and returning nothing for an un-instructed
  // payload, on the intent with the largest measured upside in the project.
  ["intent answers (correctness)", () => run("node", [join(TOOLS, "intent-answers.mjs"), BASE], TOOLS),
    (o) => /10\/10 intents answering correctly/.test(o)],
  ["hostile inputs", () => run("node", [join(TOOLS, "hostile-inputs.mjs"), BASE], TOOLS),
    (o) => /\b0 bad\b/.test(o)],
  ["upstream health", () => run("node", [join(TOOLS, "upstream-health.mjs")], TOOLS),
    (o) => /0 primary failing/.test(o)],
  // Exit code 1 is CORRECT here; the assertion is on the exact known shape.
  ["no-regression (7 identical, 1 differ)", () => run("node", [join(TOOLS, "no-regression.mjs"), BASE], TOOLS),
    (o) => /7 identical, 1 differ/.test(o)],
];

console.log(`preflight against ${BASE}\n`);
let failed = 0;
const detail = [];
for (const [name, exec, ok] of GATES) {
  process.stdout.write(`  ${name.padEnd(38)} `);
  const r = exec();
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (ok(out)) console.log("PASS");
  else {
    failed++;
    console.log("FAIL");
    detail.push([name, out.trim().split(/\r?\n/).slice(-14).join("\n")]);
  }
}
for (const [name, tail] of detail) console.log(`\n--- ${name} ---\n${tail}`);
console.log(
  failed
    ? `\n${GATES.length - failed}/${GATES.length} gates passed — re-run the failing gate alone before believing it.`
    : `\n${GATES.length}/${GATES.length} gates passed.`,
);
process.exit(failed ? 1 : 0);
