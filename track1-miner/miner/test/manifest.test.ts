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

// A registration is effectively immutable and a rejection releases the slug, so
// an intent named on an endpoint but missing from semantics.supported_intents —
// or vice versa — must fail here, on a laptop, not on-chain.
test("every endpoint intent is declared in supported_intents, and none is orphaned", () => {
  const yaml = readFileSync(resolve(process.cwd(), "../miner.yaml"), "utf8");
  const onEndpoints = new Set(
    [...yaml.matchAll(/^    intents: \[([^\]]+)\]$/gm)]
      .flatMap((m) => m[1]!.split(",").map((s) => s.trim())),
  );
  const supported = new Set(
    [...yaml.matchAll(/^    - ([A-Z][A-Z_]+)$/gm)].map((m) => m[1]!),
  );
  for (const i of onEndpoints) {
    assert.ok(supported.has(i), `${i} is on an endpoint but not in supported_intents`);
  }
  for (const i of supported) {
    assert.ok(onEndpoints.has(i), `${i} is in supported_intents but no endpoint serves it`);
  }
});
