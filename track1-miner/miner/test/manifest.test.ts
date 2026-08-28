import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ENDPOINTS } from "../src/handler";

test("miner.yaml declares exactly the routes the service supports", () => {
  const yaml = readFileSync(resolve(process.cwd(), "../miner.yaml"), "utf8");
  const declared = [...yaml.matchAll(/^  - path: (\/\S+)$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(declared, [...ENDPOINTS].sort());
});
