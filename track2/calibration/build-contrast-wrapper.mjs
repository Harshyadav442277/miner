#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing ${name}`);
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

function f32(value) {
  const out = Buffer.alloc(4);
  out.writeFloatLE(value);
  return out;
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

function rewriteExports(payload, replacementIndex) {
  const count = readU32(payload, 0);
  let at = count.next;
  const parts = [u32(count.value)];
  let hits = 0;
  for (let i = 0; i < count.value; i += 1) {
    const length = readU32(payload, at);
    at = length.next;
    const name = payload.subarray(at, at + length.value);
    at += length.value;
    const kind = payload[at++];
    const index = readU32(payload, at);
    at = index.next;
    const isTarget = kind === 0 && name.toString("utf8") === "rank_answer";
    if (isTarget) hits += 1;
    parts.push(u32(name.length), name, Buffer.from([kind]), u32(isTarget ? replacementIndex : index.value));
  }
  if (at !== payload.length || hits !== 1) throw new Error(`expected one rank_answer export, found ${hits}`);
  return Buffer.concat(parts);
}

const basePath = resolve(arg("--base"));
const outPath = resolve(arg("--out"));
const expectedSha = arg("--expected-sha256").toLowerCase();
const delta = Number(arg("--delta"));
if (!(delta > 0 && delta <= 0.9)) throw new Error("--delta must be in (0, 0.9]");

const base = await readFile(basePath);
const baseSha = createHash("sha256").update(base).digest("hex");
if (baseSha !== expectedSha) throw new Error(`wrong base sha256: ${baseSha}`);
const sections = parseSections(base);
const imports = sections.find((section) => section.id === 2);
if (imports && readU32(imports.payload, 0).value !== 0) throw new Error("base must have zero imports");

const functions = sections.find((section) => section.id === 3);
const exports = sections.find((section) => section.id === 7);
const code = sections.find((section) => section.id === 10);
if (!functions || !exports || !code) throw new Error("base is missing function, export, or code section");

const functionCount = readU32(functions.payload, 0);
const typeIndices = [];
let at = functionCount.next;
for (let i = 0; i < functionCount.value; i += 1) {
  const type = readU32(functions.payload, at);
  typeIndices.push(type.value);
  at = type.next;
}
if (at !== functions.payload.length) throw new Error("malformed function section");

let exportAt = readU32(exports.payload, 0).next;
let rawIndex = null;
const exportCount = readU32(exports.payload, 0).value;
for (let i = 0; i < exportCount; i += 1) {
  const length = readU32(exports.payload, exportAt);
  exportAt = length.next;
  const name = exports.payload.subarray(exportAt, exportAt + length.value).toString("utf8");
  exportAt += length.value;
  const kind = exports.payload[exportAt++];
  const index = readU32(exports.payload, exportAt);
  exportAt = index.next;
  if (kind === 0 && name === "rank_answer") rawIndex = index.value;
}
if (rawIndex === null || rawIndex >= typeIndices.length) throw new Error(`invalid rank_answer index ${rawIndex}`);

const wrapperIndex = typeIndices.length;
const wrapperType = typeIndices[rawIndex];
functions.payload = Buffer.concat([u32(functionCount.value + 1), functions.payload.subarray(functionCount.next), u32(wrapperType)]);
exports.payload = rewriteExports(exports.payload, wrapperIndex);

const codeCount = readU32(code.payload, 0);
if (codeCount.value !== functionCount.value) throw new Error("function/code count mismatch");
const body = Buffer.concat([
  Buffer.from([0x01, 0x01, 0x7d]), // one f32 local at index 6
  Buffer.from([0x20, 0x00, 0x20, 0x01, 0x20, 0x02, 0x20, 0x03, 0x20, 0x04, 0x20, 0x05, 0x10]),
  u32(rawIndex),
  Buffer.from([0x21, 0x06]), // score = raw rank_answer(...)
  Buffer.from([0x20, 0x06, 0x43]),
  f32(delta),
  Buffer.from([0x20, 0x06, 0x94, 0x43]),
  f32(1),
  Buffer.from([0x20, 0x06, 0x93, 0x94, 0x43]),
  f32(2),
  Buffer.from([0x20, 0x06, 0x94, 0x43]),
  f32(1),
  Buffer.from([0x93, 0x94, 0x92, 0x0b]),
]);
code.payload = Buffer.concat([u32(codeCount.value + 1), code.payload.subarray(codeCount.next), u32(body.length), body]);

const out = Buffer.concat([
  base.subarray(0, 8),
  ...sections.flatMap((section) => [Buffer.from([section.id]), u32(section.payload.length), section.payload]),
]);
await WebAssembly.compile(out);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, out);
console.log(JSON.stringify({
  base: basePath,
  baseSha256: baseSha,
  output: outPath,
  bytes: out.length,
  delta,
  rawFunctionIndex: rawIndex,
  wrapperFunctionIndex: wrapperIndex,
  sha256: createHash("sha256").update(out).digest("hex"),
}, null, 2));
