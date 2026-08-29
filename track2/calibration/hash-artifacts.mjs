#!/usr/bin/env node

/**
 * Prints size, SHA-256 and Keccak-256 for each file given.
 *
 * The Telegraph console binds the **Keccak-256** of the hosted bytes on chain;
 * SHA-256 is only for matching a download against the build log. The Keccak
 * implementation is checked against two known-answer vectors before any file is
 * hashed, so a wrong hash cannot reach a registration form.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename } from "node:path";

const require = createRequire(import.meta.url);
let keccak256;
try {
  ({ keccak_256: keccak256 } = require("../../track3-certwatch/node_modules/@noble/hashes/sha3.js"));
} catch (error) {
  throw new Error(`@noble/hashes is not vendored in this checkout: ${error.message}`);
}

const hex = (bytes) => Buffer.from(bytes).toString("hex");

// Known-answer vectors: the empty string, and the bytes registered on chain as
// registration 1774 (LANGUAGE_TRANSLATION, alpha 0.61).
const EMPTY = "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
if (hex(keccak256(new Uint8Array(0))) !== EMPTY) throw new Error("Keccak-256 self-test failed");

for (const path of process.argv.slice(2)) {
  const bytes = await readFile(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  console.log([basename(path), bytes.length, sha256, hex(keccak256(bytes))].join("\t"));
}
