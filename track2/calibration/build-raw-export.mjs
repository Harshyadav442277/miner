#!/usr/bin/env node

/**
 * Raw-export builder (analysis only -- never register the output).
 *
 * Repoints a module's `rank_answer` export at an inner function so the
 * uncalibrated score can be read directly. This is how the calibration sweep is
 * measured offline: score a corpus through the raw function, then check what a
 * candidate threshold would do to it, without rebuilding anything.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing ${name}`);
  }
  return process.argv[index + 1];
}

function readU32(bytes, offset) {
  let value = 0;
  let shift = 0;
  let at = offset;
  while (at < bytes.length && shift < 35) {
    const byte = bytes[at++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value: value >>> 0, next: at };
    shift += 7;
  }
  throw new Error(`invalid u32 LEB at ${offset}`);
}

function u32(value) {
  const out = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value) byte |= 0x80;
    out.push(byte);
  } while (value);
  return Buffer.from(out);
}

function parseSections(bytes) {
  if (bytes.subarray(0, 8).toString("hex") !== "0061736d01000000") throw new Error("not a core WASM v1 module");
  const sections = [];
  let at = 8;
  while (at < bytes.length) {
    const id = bytes[at++];
    const size = readU32(bytes, at);
    at = size.next;
    const end = at + size.value;
    if (end > bytes.length) throw new Error(`section ${id} exceeds file`);
    sections.push({ id, payload: bytes.subarray(at, end) });
    at = end;
  }
  return sections;
}

const basePath = resolve(arg("--base"));
const outPath = resolve(arg("--out"));
const inner = Number(arg("--inner", "0"));

const base = await readFile(basePath);
const sections = parseSections(base);
const exports = sections.find((section) => section.id === 7);
if (!exports) throw new Error("base has no export section");

const count = readU32(exports.payload, 0);
let at = count.next;
const parts = [u32(count.value)];
let hits = 0;
for (let i = 0; i < count.value; i += 1) {
  const length = readU32(exports.payload, at);
  at = length.next;
  const name = exports.payload.subarray(at, at + length.value);
  at += length.value;
  const kind = exports.payload[at++];
  const index = readU32(exports.payload, at);
  at = index.next;
  const isTarget = kind === 0 && name.toString("utf8") === "rank_answer";
  if (isTarget) hits += 1;
  parts.push(u32(name.length), name, Buffer.from([kind]), u32(isTarget ? inner : index.value));
}
if (hits !== 1) throw new Error(`expected one rank_answer export, found ${hits}`);
exports.payload = Buffer.concat(parts);

const out = Buffer.concat([
  base.subarray(0, 8),
  ...sections.flatMap((section) => [Buffer.from([section.id]), u32(section.payload.length), section.payload]),
]);
await WebAssembly.compile(out);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, out);
console.log(JSON.stringify({
  base: basePath,
  output: outPath,
  bytes: out.length,
  innerFunctionIndex: inner,
  sha256: createHash("sha256").update(out).digest("hex"),
}, null, 2));
