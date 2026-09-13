import { test } from "node:test";
import assert from "node:assert/strict";
import { placeCandidates } from "../src/extract";
import { resolvePlace } from "../src/storm";
import { assessFraud, scamMarkers } from "../src/fraud";
import { namesCode, webSearch } from "../src/websearch";

const json = (value: unknown) => new Response(JSON.stringify(value));
async function mocked(stub: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try { await run(); } finally { globalThis.fetch = original; }
}

test("long weather questions keep their best extracted location", async () => {
  for (const city of ["Lagos", "Abuja"]) {
    for (const q of [`Return the 3-day weather forecast for ${city}. Classify this as WEATHER_FORECAST.`,
      `Return current weather conditions for ${city}. Classify this as WEATHER_CHECK.`]) {
      assert.equal(placeCandidates(q)[0], city);
      await mocked((async input => {
        const name = new URL(String(input)).searchParams.get("name");
        return json({results: [{name, latitude: name === city ? 6.5 : 34.6, longitude: 3.4, country: name === city ? "Nigeria" : "United States"}]});
      }) as typeof fetch, async () => {
        const result = await resolvePlace(q);
        assert.match(result!.name, /Nigeria/);
      });
    }
  }
  assert.equal(placeCandidates("Return")[0], "Return");
  assert.equal(placeCandidates("Tokyo, Japan")[0], "Tokyo, Japan");
});

test("credential safety instructions do not trigger a request-to-disclose marker", () => {
  for (const q of ["Never share your seed phrase.", "Don't disclose your private key.", "Do not send a recovery phrase."]) {
    assert.deepEqual(scamMarkers(q), []);
  }
  assert.ok(scamMarkers("Never share your seed phrase. But send your private key to our support team.").length);
  assert.ok(scamMarkers("Never delay: send your seed phrase immediately.").length);
  assert.ok(scamMarkers("Buy gift cards today.").length);
});

const hash = "0x" + "1".repeat(64);
const sender = "0x" + "2".repeat(40);
const recipient = "0x" + "3".repeat(40);
test("unresolved transaction hashes never receive a clean fraud assessment", async () => {
  await mocked((async () => json({result: null})) as typeof fetch, async () => {
    const r = await assessFraud(`Is ${hash} fraudulent on Base?`);
    assert.equal(r.verdict, "unknown");
    assert.doesNotMatch(r.reason, /No fraud indicators were found/);
  });
});
test("a transaction's recipient is screened, on the chain requested", async () => {
  await mocked((async (input, init) => {
    const url = String(input);
    if (url.includes("githubusercontent")) return new Response(recipient + "\n");
    assert.match(url, /base/);
    assert.equal(JSON.parse(String(init?.body)).method, "eth_getTransactionByHash");
    return json({result: {hash, from: sender, to: recipient}});
  }) as typeof fetch, async () => {
    const r = await assessFraud(`Is ${hash} fraudulent on Base?`);
    assert.equal(r.verdict, "high_risk");
    assert.match(r.reason, new RegExp(`recipient ${recipient} appears`));
    assert.match(r.reason, /on base/);
  });
});
test("wrong-hash RPC data cannot substantiate a transaction assessment", async () => {
  await mocked((async () => json({result: {hash: "0x" + "4".repeat(64), from: sender, to: recipient}})) as typeof fetch, async () => {
    assert.equal((await assessFraud(`Is ${hash} fraudulent on Base?`)).verdict, "unknown");
  });
});
test("no responding fraud source means unknown, never no indicators", async () => {
  await mocked((async () => { throw new Error("down"); }) as typeof fetch, async () => {
    assert.equal((await assessFraud(`Is ${sender} fraudulent?`)).verdict, "unknown");
  });
});
test("product-code matching rejects different trials sharing a prefix", () => {
  assert.equal(namesCode("MK 2870 results", ["MK-2870"]), true);
  assert.equal(namesCode("ABBV-7060 results", ["ABBV-706"]), false);
  assert.equal(namesCode("MK-2870-032 results", ["MK-2870"]), false);
  assert.equal(namesCode("MK-2870-032 results", ["MK-2870-032"]), true);
});
test("web search recovers code coverage without substituting company background", async () => {
  const searched: string[] = [];
  await mocked((async input => {
    const url = new URL(String(input));
    if (url.hostname === "news.google.com") {
      const q = url.searchParams.get("q") ?? "";
      searched.push(q);
      return new Response(q === "MK-2870" ? '<rss><channel><item><title>MK-2870 trial reports results - Trial Publisher</title><pubDate>Fri, 11 Sep 2026 12:00:00 GMT</pubDate><source>Trial Publisher</source></item></channel></rss>' : '<rss><channel></channel></rss>');
    }
    return json({title: "Merck", extract: "Merck is a pharmaceutical company with many products."});
  }) as typeof fetch, async () => {
    const r = await webSearch("Will Merck's MK-2870 receive approval?");
    assert.ok(searched.includes("MK-2870"));
    assert.equal(r.verdict, "answered");
    assert.match(r.reason, /MK-2870 trial reports results/);
    assert.equal(r.background, null);
    assert.match(r.reason, /not a prediction/);
  });
});
test("old web coverage is labelled available rather than current", async () => {
  await mocked((async input => String(input).includes("news.google.com")
    ? new Response('<rss><channel><item><title>John Deere expands self-repair services - Publisher</title><pubDate>Thu, 31 Jul 2025 12:00:00 GMT</pubDate></item></channel></rss>')
    : json({title: "Other", extract: "Unrelated source"})) as typeof fetch, async () => {
    const r = await webSearch("Will John Deere expand self-repair services?");
    assert.match(r.reason, /most relevant available report/);
    assert.doesNotMatch(r.reason, /current report/);
  });
});
