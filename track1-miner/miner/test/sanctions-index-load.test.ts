import { test } from "node:test";
import assert from "node:assert/strict";
import { screenSanctions } from "../src/sanctions";
import { indexWithoutEu } from "./sanctions-fixtures";

// Its own file, so the list cache starts empty: node --test runs each file in a separate process.
test("a usable index is the only fetch, and screens the UK list: Hezbollah is an exact UK alias", async (t) => {
  const original = globalThis.fetch;
  const body = indexWithoutEu();
  const asked: string[] = [];
  globalThis.fetch = (async (url: string) => {
    asked.push(String(url));
    return String(url).endsWith("/sanctions-data/sanctions-index.json")
      ? new Response(body, { status: 200, headers: { "content-type": "application/json" } })
      : new Response("", { status: 503 });
  }) as typeof globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });

  const hiz = await screenSanctions("Is Hezbollah sanctioned?", "Hezbollah");
  assert.equal(hiz.verdict, "match");
  assert.equal(hiz.closest!.list, "UK Sanctions List");
  assert.equal(hiz.closest!.matched_name, "Hezbollah");
  assert.deepEqual(hiz.lists_checked.map((e) => [e.list, e.published]), [
    ["OFAC SDN", "2026-11-05"], ["OFAC Consolidated (non-SDN)", "2026-11-05"], ["UN Security Council Consolidated", "2026-11-07"],
    ["UK Sanctions List", "2026-11-03"],
  ]);
  assert.deepEqual(hiz.lists_not_checked, ["EU Financial Sanctions Consolidated List"]);
  assert.match(hiz.reason, /UK Sanctions List \(generated 2026-11-03, 1,103 entries\)/);
  assert.match(hiz.reason, /the EU list was not screened/);

  const putin = await screenSanctions("Screen Vladimir Putin");
  assert.equal(putin.verdict, "match");
  assert.equal(putin.matches[0]!.list, "UK Sanctions List");
  assert.deepEqual(putin.matches[0]!.dob_years, [1952]);

  const viktor = await screenSanctions("Is Viktor Bout sanctioned?");
  assert.equal(viktor.verdict, "match");
  assert.equal(viktor.closest!.list, "OFAC SDN");
  const wallet = await screenSanctions("Is 0x1111111111111111111111111111111111111111 sanctioned?");
  assert.equal(wallet.verdict, "match", "OFAC wallets survive the index");
  assert.deepEqual(asked, ["https://raw.githubusercontent.com/Harshyadav442277/miner/sanctions-data/sanctions-index.json"],
    "one fetch per instance, then the cache");
});
