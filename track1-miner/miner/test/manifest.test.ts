import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ENDPOINTS } from "../src/handler";

// Routes that refuse every request on licence and are no longer declared. They
// stay served until the updateMiner that drops them is signed, because the live
// registration still points at them; delete their code after that, then empty this.
const RETIRED = ["/headlines", "/ip-geolocate", "/news-search", "/stock-price"];

test("miner.yaml declares exactly the routes the service supports, less the retired ones", () => {
  const yaml = readFileSync(resolve(process.cwd(), "../miner.yaml"), "utf8");
  const declared = [...yaml.matchAll(/^  - path: (\/\S+)$/gm)].map((m) => m[1]).sort();
  for (const r of RETIRED) assert.ok(ENDPOINTS.includes(r), `${r} is retired but no longer served; remove it from RETIRED`);
  assert.deepEqual(declared, ENDPOINTS.filter((e) => !RETIRED.includes(e)).sort());
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
