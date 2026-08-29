#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const BASE_SHA256 = "9407b62d1980c8a2e9cc7622da33485d02c390007695d02ab138e64b916ced9e";
const BASE_BYTES = 5114;
const FROM = Buffer.from([0x43, 0x9a, 0x99, 0x19, 0x3f]); // f32.const 0.6

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`missing ${name}`);
  return resolve(process.argv[i + 1]);
}

const basePath = arg("--base");
const outPath = arg("--out");
const alphaIndex = process.argv.indexOf("--alpha");
const alpha = alphaIndex < 0 ? 0.9 : Number(process.argv[alphaIndex + 1]);
if (!(alpha > 0.6 && alpha <= 0.9)) throw new Error("--alpha must be in (0.6, 0.9]");
const encodedAlpha = Buffer.alloc(5);
encodedAlpha[0] = 0x43;
encodedAlpha.writeFloatLE(alpha, 1);
const base = await readFile(basePath);
const sha = createHash("sha256").update(base).digest("hex");
if (base.length !== BASE_BYTES || sha !== BASE_SHA256) {
  throw new Error(`wrong base: ${base.length} bytes sha256=${sha}`);
}

const hits = [];
for (let at = base.indexOf(FROM); at >= 0; at = base.indexOf(FROM, at + 1)) hits.push(at);
if (hits.length !== 1) throw new Error(`expected one calibration constant, found ${hits.length}`);

const out = Buffer.from(base);
encodedAlpha.copy(out, hits[0]);
await WebAssembly.compile(out);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, out);
const outSha = createHash("sha256").update(out).digest("hex");
console.log(JSON.stringify({ base: basePath, output: outPath, bytes: out.length, patchedOffset: hits[0], alpha, sha256: outSha }, null, 2));
