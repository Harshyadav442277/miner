#!/usr/bin/env node
/**
 * One realistic question per declared intent, checked for a CORRECT answer.
 *
 * The other gates check shape: 200, non-empty reason, no refusal, no crash.
 * None of them check that the answer is RIGHT. `verify-deploy` predates the
 * expansion and covers only the original seven routes, so CONTENT_EXTRACTION,
 * NEWS_HEADLINES and WALLET_BALANCE_CHECK had no correctness check at all until
 * this file — they were signed on-chain having only ever been shape-tested.
 *
 * Assertions are facts that can be verified independently, not vibes: a known
 * expired certificate, a wallet balance cross-checked against a second RPC, a
 * geofeed-published address only the primary provider places correctly.
 *
 *   node track1-miner/tools/intent-answers.mjs [base-url]
 */
const BASE = process.argv[2] ?? "https://miner-wine.vercel.app";
const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

const get = async (path, params) => {
  const u = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  return { status: r.status, body: await r.json() };
};

/** Each check returns an array of failure strings; empty means it passed. */
const CHECKS = {
  async SSL_VERIFICATION() {
    const bad = [];
    const exp = await get("/ssl-check", { domain: "expired.badssl.com" });
    if (exp.body.verdict !== "expired") bad.push(`expired.badssl.com -> ${exp.body.verdict}, want expired`);
    const good = await get("/ssl-check", { domain: "github.com" });
    if (good.body.verdict !== "valid") bad.push(`github.com -> ${good.body.verdict}, want valid`);
    if (good.body.days_remaining == null || good.body.days_remaining <= 0) bad.push("github.com has no positive days_remaining");
    if (!good.body.issuer) bad.push("github.com answer names no issuer");
    const mismatch = await get("/ssl-check", { domain: "wrong.host.badssl.com" });
    if (mismatch.body.verdict !== "hostname_mismatch") bad.push(`wrong.host -> ${mismatch.body.verdict}, want hostname_mismatch`);
    return bad;
  },

  async STORM_ALERT() {
    const bad = [];
    const r = await get("/storm-alert", { query: "Is there a storm risk in Chennai over the next 48 hours?" });
    const b = r.body;
    if (!["none", "low", "moderate", "high", "severe"].includes(b.verdict)) bad.push(`verdict ${b.verdict} is not a risk grade`);
    if (!/chennai/i.test(b.reason)) bad.push("answer never names Chennai");
    if (b.window_hours !== 48) bad.push(`window_hours ${b.window_hours}, want 48`);
    if (typeof b.risk_score !== "number" || b.risk_score < 0 || b.risk_score > 1) bad.push(`risk_score ${b.risk_score} out of range`);
    if (b.max_wind_speed_kmh == null) bad.push("no wind speed reported");
    return bad;
  },

  async WEATHER_FORECAST() {
    const bad = [];
    const r = await get("/weather-forecast", { query: "What is the weather forecast for London over the next 24 hours?" });
    const b = r.body;
    if (!/london/i.test(b.reason)) bad.push("answer never names London");
    if (b.temp_min_c == null || b.temp_max_c == null) bad.push("no temperature range");
    // London is not Death Valley and not Vostok; a sane band catches unit bugs.
    if (b.temp_min_c < -30 || b.temp_max_c > 50) bad.push(`temps ${b.temp_min_c}..${b.temp_max_c} implausible for London`);
    if (b.temp_min_c > b.temp_max_c) bad.push("min temp exceeds max temp");
    if (!b.verdict || b.verdict === "unknown") bad.push(`verdict ${b.verdict} is not a condition`);
    return bad;
  },

  async IP_GEOLOCATION() {
    const bad = [];
    const g = await get("/ip-geolocate", { ip: "8.8.8.8" });
    if (!/united states/i.test(g.body.reason)) bad.push("8.8.8.8 not placed in the United States");
    if (!/google/i.test(g.body.reason)) bad.push("8.8.8.8 answer never names Google");
    if (!/tor|abuse|reputation/i.test(g.body.reason)) bad.push("no abuse clause — most recorded questions ask for it");
    // Only ip-api honours operator geofeeds and puts this in Tokyo; the
    // ipwho.is fallback misplaces it in Mumbai. Tokyo proves the PRIMARY answered.
    const geo = await get("/ip-geolocate", { ip: "142.251.42.174" });
    if (!/tokyo|japan/i.test(geo.body.reason)) bad.push(`142.251.42.174 -> ${geo.body.verdict}; not Tokyo, so the primary provider is not answering`);
    const priv = await get("/ip-geolocate", { ip: "192.168.1.10" });
    if (priv.body.verdict !== "private") bad.push(`192.168.1.10 -> ${priv.body.verdict}, want private`);
    if (!/rfc 1918|private/i.test(priv.body.reason)) bad.push("private range not explained");
    return bad;
  },

  async LANGUAGE_TRANSLATION() {
    const bad = [];
    const r = await get("/translate", { query: 'Translate "Good morning" into French.' });
    const b = r.body;
    if (!/bonjour/i.test(String(b.reason))) bad.push(`reason "${b.reason}" is not the French translation`);
    // The starve invariant: the converter reads the WHOLE payload, and this
    // intent's ground truths are bare translations. Any extra English field
    // here is prose wrapped around the answer, which is what cost epoch 295.
    const keys = Object.keys(b).sort().join(",");
    if (keys !== "confidence,reason,translation,verdict") bad.push(`payload carries ${keys} — must be exactly confidence,reason,translation,verdict`);
    const ja = await get("/translate", { query: 'Translate "one coffee please" into Japanese.' });
    if (!/[぀-ヿ一-鿿]/.test(String(ja.body.reason))) bad.push("Japanese translation returned no Japanese script");
    return bad;
  },

  async ACADEMIC_SEARCH() {
    const bad = [];
    const r = await get("/papers", { query: "Find recent peer-reviewed papers on CRISPR gene editing" });
    const b = r.body;
    // The payload is deliberately lean — {verdict, confidence, reason} — so the
    // converter summarises the restated prose instead of the papers JSON
    // (bench/acad_shape.mjs: 0.006041 full vs 0.013419 lean, 22/22 rows). The
    // papers therefore live in `reason`, and that is what is checked.
    const reason = String(b.reason ?? "");
    const entries = (reason.match(/\d+\)\s/g) ?? []).length;
    // OpenAlex rate-limits per IP and sheds anonymous load cluster-wide, so an
    // empty result is an upstream state, not a defect in us. What must always
    // hold is that we answer honestly. Relevance is only checked with papers.
    if (entries === 0) {
      if (!/no peer-reviewed papers/i.test(reason)) {
        bad.push("no papers AND no honest explanation of why");
      }
    } else {
      if (entries < 3) bad.push(`only ${entries} papers returned`);
      if (!/crispr|gene|cas9/i.test(reason)) bad.push("no returned paper is topically relevant to CRISPR");
      if (!/cited/i.test(reason)) bad.push("citation counts missing — the questions ask for them");
    }
    // The payload key set itself is pinned by the unit tests (handler.test.ts),
    // not here — this gate also runs against pre-lean production.
    // Publisher line-wrapping used to leak a literal backslash-n into the prose.
    if (/\\n|\\t/.test(reason)) bad.push("an escape sequence leaked into the scored prose");
    return bad;
  },

  async AI_TEXT_DETECTION() {
    const bad = [];
    const passage =
      "The rapid proliferation of artificial intelligence has fundamentally transformed numerous sectors across the global economy. " +
      "Moreover, it is important to note that these developments continue to accelerate at an unprecedented pace, reshaping how " +
      "organisations approach strategic planning and operational efficiency in ways that were previously unimaginable to observers.";
    const r = await get("/ai-detect", { text: passage });
    const b = r.body;
    if (!["likely_human", "likely_ai", "inconclusive"].includes(b.verdict)) bad.push(`verdict ${b.verdict} is not a determination`);
    if (b.words == null || b.words < 40) bad.push(`counted ${b.words} words in a 45-word passage`);
    if (b.type_token_ratio == null || b.sentence_length_stdev == null) bad.push("measurements missing from the answer");
    // The honesty constraint: this method cannot support a confident claim.
    if (b.confidence > 0.6) bad.push(`confidence ${b.confidence} exceeds the 0.6 cap this method can honestly support`);
    // Below the 40-word floor the statistics are meaningless and a refusal is correct.
    const short = await get("/ai-detect", { text: "hey i went to the store yesterday" });
    if (short.body.verdict !== "unknown") bad.push("analysed a passage below the 40-word floor instead of refusing");
    return bad;
  },

  async CONTENT_EXTRACTION() {
    const bad = [];
    const r = await get("/extract", { text: "Reach us at support@example.com or call 555-0192.", query: "Extract the contact details." });
    const b = r.body;
    if (!/support@example\.com/.test(b.reason)) bad.push("email not extracted into the answer");
    if (!/555-0192/.test(b.reason)) bad.push("phone not extracted into the answer");
    if (!b.extracted?.emails?.includes("support@example.com")) bad.push("extracted.emails missing the address");
    // Short and reference-shaped is the whole reason this intent scores 1.0 —
    // it must survive the ~32-word conversion clip.
    if (b.reason.split(/\s+/).length > 32) bad.push(`answer is ${b.reason.split(/\s+/).length} words; the conversion budget is ~32`);
    const qty = await get("/extract", { text: "The shipment weighs 45 kilograms and is 2.3 meters long.", query: "Extract the quantities and units." });
    if (!/45/.test(qty.body.reason) || !/2\.3/.test(qty.body.reason)) bad.push("quantities not extracted");
    return bad;
  },

  async NEWS_HEADLINES() {
    const bad = [];
    const r = await get("/headlines", { topic: "technology" });
    const b = r.body;
    const heads = b.headlines ?? [];
    if (heads.length < 3) bad.push(`only ${heads.length} headlines returned`);
    if (!heads.every((h) => h.title)) bad.push("a headline has no title");
    if (!heads.some((h) => h.source)) bad.push("no headline names its source");
    // Headlines rotate; a stale feed is the known cap on this intent's score.
    const newest = heads.map((h) => Date.parse(h.published ?? "")).filter(Number.isFinite).sort().reverse()[0];
    if (newest && Date.now() - newest > 7 * 864e5) bad.push(`newest headline is ${Math.round((Date.now() - newest) / 864e5)} days old`);
    return bad;
  },

  async FACT_CHECK() {
    const bad = [];
    // The safety property first: no amount of word overlap may produce a
    // "supported" verdict, because an article about a claim shares its whole
    // vocabulary. An earlier version rated "vaccines cause autism" supported.
    const danger = await get("/fact-check", { query: "Fact-check: vaccines cause autism." });
    if (danger.body.verdict === "supported") bad.push("SAFETY: asserted support for a misinformation claim");
    if (/is supported/i.test(String(danger.body.reason))) bad.push("SAFETY: prose asserts support");
    const r = await get("/fact-check", { query: "Is it true that the Eiffel Tower is located in Paris?" });
    if (r.body.source !== "Wikipedia") bad.push(`source ${r.body.source}, want a named reference`);
    if (!/wikipedia\.org\/wiki\//.test(String(r.body.source_url))) bad.push("no citable source url");
    if (!/Eiffel Tower/.test(String(r.body.reason))) bad.push("answer never names the claim");
    if (String(r.body.evidence ?? "").length < 40) bad.push("evidence not quoted");
    return bad;
  },

  async TELEGRAPH_KNOWLEDGE() {
    const bad = [];
    const live = await get("/telegraph", { query: "How many miners are registered on Telegraph?" });
    if (!/\d+ miners/.test(String(live.body.reason))) bad.push("no live miner count");
    if (!/live/i.test(String(live.body.source))) bad.push("live figure not attributed as live");
    const fact = await get("/telegraph", { query: "How do I register a miner on Telegraph?" });
    if (!/YAML manifest/i.test(String(fact.body.reason))) bad.push("registration answer missing the manifest");
    // It must decline what it cannot source rather than inventing an answer.
    const off = await get("/telegraph", { query: "What is the airspeed velocity of an unladen swallow?" });
    if (off.body.verdict !== "not_covered") bad.push(`answered an out-of-scope question as ${off.body.verdict}`);
    return bad;
  },

  async WALLET_BALANCE_CHECK() {
    const bad = [];
    const r = await get("/wallet-balance", { address: VITALIK, query: `What is the ETH balance of ${VITALIK}?` });
    const b = r.body;
    if (b.error) bad.push(`errored: ${b.error}`);
    if (typeof b.balance_eth !== "number") bad.push("no numeric balance returned");
    // Cross-check against an RPC this miner does not use, so agreement means
    // the chain agrees rather than one endpoint agreeing with itself.
    const res = await fetch("https://eth.llamarpc.com", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [VITALIK, "latest"] }),
      signal: AbortSignal.timeout(15000),
    }).then((x) => x.json()).catch(() => null);
    if (res?.result) {
      const truth = Number(BigInt(res.result)) / 1e18;
      if (Math.abs(truth - b.balance_eth) > 0.01) bad.push(`balance ${b.balance_eth} disagrees with an independent RPC (${truth})`);
    }
    if (b.symbol !== "ETH") bad.push(`symbol ${b.symbol}, want ETH`);
    // Polygon's native coin is POL, not ETH — the chain-specific symbol is easy
    // to get wrong and would be a confidently wrong answer.
    const pol = await get("/wallet-balance", { address: VITALIK, query: "What is the MATIC balance on Polygon?" });
    if (pol.body.chain !== "polygon") bad.push(`chain ${pol.body.chain}, want polygon`);
    if (pol.body.symbol !== "POL") bad.push(`polygon symbol ${pol.body.symbol}, want POL`);
    if (pol.body.error) bad.push(`polygon errored: ${pol.body.error}`);
    // A token asked about alongside the native coin must be called out, not
    // silently ignored — answering half a question is the failure mode here.
    const usdt = await get("/wallet-balance", { address: VITALIK, query: "How much USDT does this address hold?" });
    if (!/USDT/i.test(usdt.body.reason)) bad.push("USDT asked about but never mentioned in the answer");
    return bad;
  },
};

console.log(`intent answers against ${BASE}\n`);
let failed = 0;
for (const [intent, check] of Object.entries(CHECKS)) {
  process.stdout.write(`  ${intent.padEnd(22)} `);
  let problems;
  try { problems = await check(); }
  catch (e) { problems = [`threw: ${e.message}`]; }
  if (problems.length === 0) console.log("PASS");
  else {
    failed++;
    console.log("FAIL");
    for (const p of problems) console.log(`      - ${p}`);
  }
}
console.log(`\n${Object.keys(CHECKS).length - failed}/${Object.keys(CHECKS).length} intents answering correctly.`);
process.exit(failed ? 1 : 0);
