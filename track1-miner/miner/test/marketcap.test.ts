import { test } from "node:test";
import assert from "node:assert/strict";
import { marketCap } from "../src/fundamentals";

test("market cap is computed from the latest filed cover share count, summing share classes (2026-10-21)", async (t) => {
  const original = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = (async (url: string) => {
    seen.push(String(url));
    // NVIDIA's dei facts as read on 2026-10-21, plus a second class on the latest cover.
    return Response.json({ units: { shares: [
      { end: "2026-05-15", val: 24_200_000_000, accn: "0001045810-26-000052", form: "10-Q", filed: "2026-05-20" },
      { end: "2026-08-21", val: 24_100_000_000, accn: "0001045810-26-000075", form: "10-Q", filed: "2026-08-26" },
      { end: "2026-08-21", val: 100_000_000, accn: "0001045810-26-000075", form: "10-Q", filed: "2026-08-26" },
    ] } });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const s = await marketCap("NVDA", 216.47, "USD");
  assert.match(seen[0]!, /CIK0001045810\/dei\/EntityCommonStockSharesOutstanding\.json$/);
  assert.match(s ?? "", /^Its market capitalisation is about \$5\.24 trillion, computed from 24,200,000,000 shares outstanding on 21 August 2026/);
  assert.equal(await marketCap("NVDA", 216.47, "INR"), null);
});
