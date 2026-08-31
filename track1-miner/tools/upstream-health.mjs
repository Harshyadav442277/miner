#!/usr/bin/env node
/**
 * Every third-party provider this miner depends on, probed with the same shape
 * of call the miner makes.
 *
 * The organizers confirmed on 2026-08-30 that third-party upstreams are allowed
 * but that **their uptime is our responsibility**. A provider that quietly dies
 * costs an epoch before anyone notices, and the wallet RPC list already lost
 * three endpoints this way — eth.llamarpc.com (HTTP 521), rpc.ankr.com/eth (now
 * needs auth) and cloudflare-eth.com (internal error) were all in its first
 * draft and all three were dead.
 *
 * A FAIL on a primary is worth acting on. A FAIL on a declared failover is worth
 * recording, because it means the next primary outage has nothing behind it.
 *
 *   node track1-miner/tools/upstream-health.mjs
 */
const ADDR = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

/** [label, role, request] — role is "primary" or "failover". */
const PROBES = [
  ["open-meteo forecast", "primary", { url: "https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&hourly=temperature_2m&forecast_days=1" }],
  ["open-meteo geocoding", "primary", { url: "https://geocoding-api.open-meteo.com/v1/search?name=Chennai&count=1" }],
  ["bigdatacloud reverse-geocode", "failover", { url: "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=40.71&longitude=-74.01&localityLanguage=en" }],
  // Checked through production, for the same reason as ip-api below: OpenAlex
  // rate-limits PER IP, and a dev machine that has been running answer-shape
  // sweeps gets 429/503 for a while afterwards while production, calling from
  // Vercel, is unaffected. Probing it directly from here reports a primary
  // outage that does not exist. Five papers coming back proves the real path.
  // Two separate things, deliberately at different severities.
  //
  // That /papers ANSWERS is a primary concern: a 200 with a real `reason` is
  // the contract, and it holds even when OpenAlex gives us nothing, because the
  // honest "no papers were found" is still a scoreable answer.
  ["/papers answers at all", "primary", {
    url: "https://miner-wine.vercel.app/papers?query=" +
      encodeURIComponent("Find recent peer-reviewed papers on CRISPR gene editing"),
    expect: /"reason":"[^"]{20,}/,
  }],
  // Whether OpenAlex is actually YIELDING papers is only failover severity.
  // The payload is lean — the papers live in the numbered prose list, so a
  // "1) <title>" entry in `reason` is what proves papers came back. An empty
  // result is a visible product degradation and worth seeing, not a reason to
  // block a deploy (the honest none-found answer still restates the question,
  // which is most of what the converter keeps — bench/acad_shape.mjs).
  ["openalex yielding papers", "failover", {
    url: "https://miner-wine.vercel.app/papers?query=" +
      encodeURIComponent("Find recent peer-reviewed papers on CRISPR gene editing"),
    expect: /1\)\s[^"]{5,}/,
  }],
  ["google translate (keyless)", "primary", { url: "https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=fr&q=good%20morning" }],
  ["mymemory", "failover", { url: "https://api.mymemory.translated.net/get?q=good%20morning&langpair=en|fr" }],
  // NOT probed directly: ip-api.com is TCP-blocked from the dev machine (GAPS
  // G27), so a direct probe reports a false primary outage. It is checked
  // through production instead, where the answer identifies the provider: only
  // ip-api honours operator geofeeds and places 142.251.42.174 in Tokyo, while
  // the ipwho.is fallback misplaces it in Mumbai. Tokyo therefore proves the
  // primary answered.
  ["ip-api.com (via production)", "primary", {
    url: "https://miner-wine.vercel.app/ip-geolocate?ip=142.251.42.174",
    expect: /tokyo|japan/i,
  }],
  ["ipwho.is", "failover", { url: "https://ipwho.is/8.8.8.8" }],
  ["ipinfo.io", "failover", { url: "https://ipinfo.io/8.8.8.8/json" }],
  ["google news rss", "primary", { url: "https://news.google.com/rss/search?q=technology&hl=en-US&gl=US&ceid=US:en" }],
  ["publicnode eth rpc", "primary", { rpc: "https://ethereum-rpc.publicnode.com" }],
  ["drpc eth rpc", "failover", { rpc: "https://eth.drpc.org" }],
  ["flashbots eth rpc", "failover", { rpc: "https://rpc.flashbots.net" }],
  ["merkle eth rpc", "failover", { rpc: "https://eth.merkle.io" }],
  ["base rpc", "primary", { rpc: "https://mainnet.base.org" }],
  ["base publicnode rpc", "failover", { rpc: "https://base-rpc.publicnode.com" }],
  ["arbitrum rpc", "primary", { rpc: "https://arb1.arbitrum.io/rpc" }],
  ["arbitrum publicnode rpc", "failover", { rpc: "https://arbitrum-one-rpc.publicnode.com" }],
  ["optimism rpc", "primary", { rpc: "https://mainnet.optimism.io" }],
  ["optimism publicnode rpc", "failover", { rpc: "https://optimism-rpc.publicnode.com" }],
  ["polygon publicnode rpc", "primary", { rpc: "https://polygon-bor-rpc.publicnode.com" }],
  ["polygon drpc", "failover", { rpc: "https://polygon.drpc.org" }],
  ["polygon 1rpc", "failover", { rpc: "https://1rpc.io/matic" }],
];

let failed = 0, degraded = 0;
for (const [label, role, spec] of PROBES) {
  const t0 = Date.now();
  let ok = false, note = "";
  try {
    const res = spec.rpc
      ? await fetch(spec.rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [ADDR, "latest"] }),
          signal: AbortSignal.timeout(10000),
        })
      : await fetch(spec.url, { signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    ok = res.ok && text.trim().length > 0;
    if (!res.ok) note = `HTTP ${res.status}`;
    // Some providers can only be identified by what the answer says.
    if (ok && spec.expect && !spec.expect.test(text)) {
      ok = false;
      note = `answered, but not from the expected provider (wanted ${spec.expect})`;
    }
    if (spec.rpc && ok) {
      const body = JSON.parse(text);
      ok = typeof body?.result === "string" && body.result.startsWith("0x");
      if (!ok) note = `no result: ${text.slice(0, 70)}`;
    }
  } catch (e) {
    note = e.name === "TimeoutError" ? "timeout >10s" : e.message.slice(0, 60);
  }
  const ms = Date.now() - t0;
  if (ok) console.log(`ok    ${label.padEnd(30)} ${role.padEnd(8)} ${ms}ms`);
  else {
    if (role === "primary") failed++; else degraded++;
    console.log(`FAIL  ${label.padEnd(30)} ${role.padEnd(8)} ${ms}ms  ${note}`);
  }
}
console.log(`\n${failed} primary failing, ${degraded} failover failing, ${PROBES.length} probed`);
// Only a failing PRIMARY is an incident; a failing failover is a warning.
process.exit(failed ? 1 : 0);
