#!/usr/bin/env node

/**
 * Release-identity gate for TEXT_AUTHENTICITY_CHECK, as it holds inside this monorepo.
 *
 * Two different artifacts carry the TAC name, and they are gated differently:
 *
 *   1. The released scorer — `scorer/`, published at telegraph-factscore. Its frozen bytes
 *      are pinned in `release/text-authenticity.json`, and the byte comparison belongs in
 *      the standalone repository, where the source is frozen next to the artifact
 *      (`release/verify-standalone.mjs`, `release/standalone-ci.yml`). Monorepo HEAD is not
 *      expected to rebuild those bytes: one crate compiles every module into every intent
 *      profile (A6), so every intent added after the freeze moves the TAC build even when
 *      no TAC behaviour changes. What must not move is behaviour, so HEAD is held to the
 *      manifest's measured evidence instead of its hash.
 *
 *   2. The registered artifact — registration 1882, a calibration wrapper tracked in this
 *      repository and served to the node from a pinned commit URL. Its bytes are the
 *      on-chain binding, so they must never change; `release/registered-text-authenticity.json`
 *      pins them.
 *
 * Usage: node release/check-release-identity.mjs <head-tac-wasm>
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const TRACK2 = resolve(HERE, "..");

/** Manifest `offline_evidence` key -> where the same number lives in a check-tac report. */
const EVIDENCE = [
  ["corpus_version", (report) => report.corpus_version],
  ["native_fixtures", (report) => report.corpus.fixtures],
  ["native_pairs", (report) => report.corpus.pairs],
  ["native_wins", (report) => report.metrics.wins],
  ["native_margin", (report) => report.metrics.separation],
];

async function tacReport(wasmPath) {
  const { stdout } = await run(process.execPath, [join(TRACK2, "harness/check-tac.mjs"), wasmPath, "--json"], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function checkReleasedBehaviour(wasmPath, failures) {
  const manifest = JSON.parse(await readFile(join(HERE, "text-authenticity.json"), "utf8"));
  const report = await tacReport(wasmPath);
  if (!report.passed) failures.push("check-tac reports the head build as failing");
  for (const [key, read] of EVIDENCE) {
    const frozen = manifest.offline_evidence[key];
    const head = read(report);
    if (head !== frozen) failures.push(`offline_evidence.${key}: frozen ${frozen}, head build ${head}`);
  }
  return { manifest, report };
}

async function checkRegisteredBytes(failures) {
  const pinned = JSON.parse(await readFile(join(HERE, "registered-text-authenticity.json"), "utf8"));
  const bytes = await readFile(join(TRACK2, pinned.artifact));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== pinned.bytes) failures.push(`registered artifact bytes: pinned ${pinned.bytes}, tracked ${bytes.length}`);
  if (sha256 !== pinned.sha256) failures.push(`registered artifact sha256: pinned ${pinned.sha256}, tracked ${sha256}`);
  return pinned;
}

async function main() {
  const wasmPath = process.argv[2];
  if (!wasmPath) {
    console.error("usage: node release/check-release-identity.mjs <head-tac-wasm>");
    process.exitCode = 1;
    return;
  }

  const failures = [];
  const { manifest, report } = await checkReleasedBehaviour(wasmPath, failures);
  const pinned = await checkRegisteredBytes(failures);

  if (failures.length) {
    console.error("RELEASE IDENTITY: FAIL");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("RELEASE IDENTITY: PASS");
  console.log(
    `  head build      ${report.artifact.bytes} bytes | sha256 ${report.artifact.sha256}\n` +
      `                  reproduces the frozen evidence: ${report.metrics.wins}/${report.corpus.pairs} pairs, ` +
      `separation ${report.metrics.separation}, corpus ${report.corpus_version}`,
  );
  console.log(
    `  frozen release  ${manifest.bytes} bytes | sha256 ${manifest.sha256}\n` +
      `                  rebuild from ${manifest.frozen_from.monorepo_source_commit.slice(0, 12)}; ` +
      `byte-gated in the standalone repository, not here`,
  );
  console.log(
    `  registration ${pinned.registration.registration_id}  ${pinned.bytes} bytes | keccak256 ${pinned.keccak256}\n` +
      `                  ${pinned.artifact} unchanged`,
  );
}

await main();
