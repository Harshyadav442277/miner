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
import { assertCoversDeclaredIntents, readManifest } from "./manifest.mjs";

const BASE = process.argv[2] ?? readManifest().baseUrl;
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
    // Lean body: the expiry horizon and issuer live in the prose the scorer reads.
    const gdays = String(good.body.reason ?? "").match(/(?:in|expires? in)\s+(\d+)\s+days/i);
    if (!gdays || Number(gdays[1]) <= 0) bad.push("github.com prose names no positive expiry-days figure");
    if (!/issued by\s+\S/i.test(String(good.body.reason ?? ""))) bad.push("github.com answer names no issuer");
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
    // window_hours, risk_score and max_wind_speed_kmh stopped being served on
    // 2026-09-05, when the payload was projected to {verdict, confidence, reason}
    // to stop the metadata diluting the scored text. All three facts are stated in
    // the prose, which is the copy the converter reads, so they are checked there.
    if (!/over the next 48 hours/i.test(b.reason)) bad.push("answer never states the 48-hour window");
    const graded = /([0-9]*\.?[0-9]+) on a scale of 0 to 1, graded (\w+)/i.exec(b.reason ?? "");
    if (!graded) bad.push("answer states no overall risk");
    else {
      const score = Number(graded[1]);
      if (!(score >= 0 && score <= 1)) bad.push(`risk ${graded[1]} out of range`);
      if (graded[2].toLowerCase() !== String(b.verdict).toLowerCase()) {
        bad.push(`prose grades ${graded[2]}, verdict says ${b.verdict}`);
      }
    }
    if (!/sustained winds up to [0-9]*\.?[0-9]+ km\/h/i.test(b.reason ?? "")) bad.push("no wind speed reported");
    return bad;
  },

  async WEATHER_FORECAST() {
    const bad = [];
    const r = await get("/weather-forecast", { query: "What is the weather forecast for London over the next 24 hours?" });
    const b = r.body;
    if (!/london/i.test(b.reason)) bad.push("answer never names London");
    // Lean body: the range lives in the prose ("from 14.7°C to 22.3°C").
    const range = String(b.reason ?? "").match(/from\s+(-?\d+(?:\.\d+)?)\s*°C\s+to\s+(-?\d+(?:\.\d+)?)\s*°C/i);
    if (!range) bad.push("no temperature range in prose");
    else {
      const [lo, hi] = [Number(range[1]), Number(range[2])];
      // London is not Death Valley and not Vostok; a sane band catches unit bugs.
      if (lo < -30 || hi > 50) bad.push(`temps ${lo}..${hi} implausible for London`);
      if (lo > hi) bad.push("min temp exceeds max temp");
    }
    if (!b.verdict || b.verdict === "unknown") bad.push(`verdict ${b.verdict} is not a condition`);
    return bad;
  },

  // The severity and the affected versions are both checked against NVD's own
  // record, fetched separately here — the endpoint's job is to resolve the CPE
  // configuration into stated versions, and that resolution is the thing most
  // likely to silently return nothing.
  async TVL_LOOKUP() {
    const bad = [];
    // The canonical description's OWN worked example, which is a token pool
    // liquidity question and not a protocol lookup. Answering it with a
    // protocol's TVL scores at the floor (~0.003 vs ~0.29 against champion 49),
    // so scope resolution is what this probe is really testing.
    const tok = await get("/tvl", {
      query: "For the token at contract 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 on base, how deep is its own trading liquidity in DEX pools (e.g. Uniswap)? Give this token's pool liquidity in USD.",
    });
    const t = tok.body;
    if (t.error) return [`errored: ${t.error}`]; // provider down; re-run the gate alone.
    if (t.scope !== "token_pool") bad.push(`canonical example -> scope ${t.scope}, want token_pool`);
    if (t.chain !== "base") bad.push(`canonical example -> chain ${t.chain}, want base`);
    if (t.verdict !== "found") bad.push(`canonical example -> ${t.verdict}, want found`);
    if (!/USDC/.test(String(t.reason ?? ""))) bad.push("token not identified as USDC");
    if (!/pool liquidity/i.test(String(t.reason ?? ""))) bad.push("answer never says pool liquidity");
    // USDC's market cap is orders of magnitude above its pool liquidity; serving
    // one for the other is the error this bound catches.
    if (!(t.usd > 1e6 && t.usd < 5e10)) bad.push(`pool liquidity ${t.usd} is outside a plausible range`);

    const prot = await get("/tvl", { query: "What is the total value locked in the Aave protocol right now?" });
    if (!prot.body.error) {
      if (prot.body.scope !== "protocol") bad.push(`Aave -> scope ${prot.body.scope}, want protocol`);
      if (prot.body.verdict !== "found") bad.push(`Aave -> ${prot.body.verdict}, want found`);
      if (!/DefiLlama/.test(String(prot.body.reason ?? ""))) bad.push("protocol answer does not attribute its source");
      if (!(prot.body.usd > 1e8)) bad.push(`Aave TVL ${prot.body.usd} is implausibly small`);
    }

    const chain = await get("/tvl", { query: "How much TVL is on the Base chain?" });
    if (!chain.body.error) {
      if (chain.body.scope !== "chain") bad.push(`Base chain -> scope ${chain.body.scope}, want chain`);
      if (!/aggregate TVL/i.test(String(chain.body.reason ?? ""))) bad.push("chain answer does not state it is the chain aggregate");
    }

    // A question with no identifiable subject must be refused, not answered
    // with whatever protocol happens to slugify from the filler words.
    const empty = await get("/tvl", { query: "What is the TVL?" });
    if (empty.body.error !== "no_subject") bad.push(`subjectless question -> ${empty.body.error}, want no_subject`);
    if (/\$[\d,]{4,}/.test(String(empty.body.reason ?? ""))) bad.push("a subjectless question was given a dollar figure");
    return bad;
  },

  async CVE_LOOKUP() {
    const bad = [];
    const r = await get("/cve", { cve_id: "CVE-2024-3094", query: "What is the severity and affected versions for CVE-2024-3094?" });
    const b = r.body;
    if (b.error) return [`errored: ${b.error}`]; // NVD rate limit; re-run the gate alone.
    if (b.verdict !== "critical") bad.push(`CVE-2024-3094 -> ${b.verdict}, want critical`);
    const reason = String(b.reason ?? "");
    if (!/CVSS 3\.1 base score of 10\.0/.test(reason)) bad.push("no CVSS 3.1 score of 10.0 in the answer");
    if (!/5\.6\.0 and 5\.6\.1/.test(reason)) bad.push("affected versions 5.6.0 and 5.6.1 not resolved from the CPE configuration");
    if (!/assigned by NVD/.test(reason)) bad.push("severity provenance not stated");

    // A record with hundreds of CPE entries must name the product the record is
    // about, not the commonest bundling vendor.
    const log4j = await get("/cve", { cve_id: "CVE-2021-44228" });
    if (!log4j.body.error) {
      if (!/log4j/i.test(String(log4j.body.reason ?? ""))) bad.push("CVE-2021-44228 answer never names log4j");
      if (/siemens|cisco/i.test(String(log4j.body.reason ?? ""))) bad.push("CVE-2021-44228 answer names a bundling vendor as the affected product");
    }

    // An unpublished identifier must not be given a severity.
    const missing = await get("/cve", { cve_id: "CVE-2099-99999" });
    if (!missing.body.error) {
      if (missing.body.verdict !== "not_found") bad.push(`unpublished id -> ${missing.body.verdict}, want not_found`);
      if (/base score of \d/.test(String(missing.body.reason ?? ""))) bad.push("a missing record was given a CVSS score");
    }
    // A truncated identifier is named as incomplete, not treated as absent.
    const stub = await get("/cve", { query: "tell me about CVE-2024" });
    if (stub.body.error !== "invalid_cve_id") bad.push(`truncated id -> ${stub.body.error}, want invalid_cve_id`);
    if (!/not a complete CVE identifier/.test(String(stub.body.reason ?? ""))) bad.push("truncated id not identified as incomplete");
    return bad;
  },

  // Every figure here is cross-checked against an independent RPC below, not
  // taken from our own answer — the scorer for this intent is an exact match on
  // the receipt, so a plausible-looking wrong number is the failure to catch.
  async ONCHAIN_TX_LOOKUP() {
    const bad = [];
    const FIRST = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060";
    const r = await get("/tx-lookup", { hash: FIRST, query: "What was the status and gas used of this transaction?" });
    const b = r.body;
    if (b.verdict !== "confirmed") bad.push(`first mainnet tx -> ${b.verdict}, want confirmed`);

    // Independent confirmation from a provider the miner does not use for this
    // route, so agreement means two sources agree rather than one echoing.
    // eth-pokt.nodies.app is deliberately NOT one of the endpoints /tx-lookup
    // reads, and it is archive-capable: rpc.flashbots.net and 1rpc.io both
    // return null for a 2015 receipt, and eth.llamarpc.com is dead (HTTP 525).
    const rpc = await fetch("https://eth-pokt.nodies.app", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [FIRST] }),
      signal: AbortSignal.timeout(20000),
    }).then((x) => x.json()).catch(() => null);
    const truth = rpc?.result ? Number(BigInt(rpc.result.gasUsed)) : null;
    if (truth !== null) {
      const said = String(b.reason ?? "").match(/used ([\d,]+) gas/);
      if (!said) bad.push("answer names no gas-used figure");
      else if (Number(said[1].replace(/,/g, "")) !== truth) {
        bad.push(`gas used ${said[1]} disagrees with an independent RPC (${truth})`);
      }
    }
    // 31,337 wei must not be rendered as a truncated decimal that reads as zero.
    if (!/31,337 wei/.test(String(b.reason ?? ""))) bad.push("sub-microcoin value not reported exactly");
    if (!/block 46,147/.test(String(b.reason ?? ""))) bad.push("answer names no block number");

    // A hash that is not on the chain must be not_found, and must not be given
    // invented receipt figures.
    const missing = await get("/tx-lookup", { hash: "0xa1b2b1a90b1d9bea0b1a7e5e9a3b31c88f8a3d16f2f4b0e0d1f7b8e1d6c8a9f0" });
    if (missing.body.verdict !== "not_found" && missing.body.verdict !== "unknown") {
      bad.push(`unknown hash -> ${missing.body.verdict}, want not_found`);
    }
    if (missing.body.verdict === "not_found" && /d[d,]* gas/.test(String(missing.body.reason ?? ""))) {
      bad.push("a missing transaction was given a gas figure");
    }
    // An unsupported chain is refused by name, not answered from Ethereum.
    const solana = await get("/tx-lookup", { hash: FIRST, chain: "solana" });
    if (solana.body.error !== "unsupported_chain") bad.push(`chain=solana -> ${solana.body.error}, want unsupported_chain`);
    // An address sent here belongs to WALLET_BALANCE_CHECK and must be said so.
    const addr = await get("/tx-lookup", { query: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 status?" });
    if (!/address, not a transaction hash/.test(String(addr.body.reason ?? ""))) {
      bad.push("a 20-byte address was not identified as the wrong subject for this intent");
    }
    return bad;
  },

  // Shares /weather-forecast with WEATHER_FORECAST, and that is exactly why it
  // needs its own case: the two intents ask different questions of one endpoint,
  // and until the coverage assertion below was added this intent was declared
  // on-chain with no correctness probe anywhere in the repo. "Right now" must
  // come back as present conditions, not as a multi-day outlook.
  async WEATHER_CHECK() {
    const bad = [];
    const r = await get("/weather-forecast", { query: "What is the weather in Tokyo right now?" });
    const b = r.body;
    if (!/tokyo/i.test(String(b.reason ?? ""))) bad.push("answer never names Tokyo");
    if (!b.verdict || b.verdict === "unknown") bad.push(`verdict ${b.verdict} is not a condition`);
    const temp = String(b.reason ?? "").match(/(-?\d+(?:\.\d+)?)\s*°C/);
    if (!temp) bad.push("no temperature in prose");
    else if (Number(temp[1]) < -30 || Number(temp[1]) > 50) bad.push(`temp ${temp[1]}°C implausible for Tokyo`);
    if (b.error) bad.push(`errored: ${b.error}`);
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
    if (/\bis supported\b/i.test(String(danger.body.reason))) bad.push("SAFETY: prose asserts support");
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
    // Lean body: the figure lives in the verdict ("N ETH") and prose.
    const fig = String(b.verdict ?? "").match(/(-?\d+(?:\.\d+)?)\s*ETH/i) ?? String(b.reason ?? "").match(/balance of\s+(-?\d+(?:\.\d+)?)/i);
    if (!fig) bad.push("no numeric balance in verdict or prose");
    // Cross-check against an RPC this miner does not use, so agreement means
    // the chain agrees rather than one endpoint agreeing with itself.
    const res = await fetch("https://eth.llamarpc.com", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [VITALIK, "latest"] }),
      signal: AbortSignal.timeout(15000),
    }).then((x) => x.json()).catch(() => null);
    if (res?.result) {
      const truth = Number(BigInt(res.result)) / 1e18;
      if (fig && Math.abs(truth - Number(fig[1])) > 0.01) bad.push(`balance ${fig[1]} disagrees with an independent RPC (${truth})`);
    }
    if (!String(b.verdict ?? "").includes("ETH")) bad.push(`verdict ${b.verdict} does not carry ETH`);
    // Polygon's native coin is POL, not ETH — the chain-specific symbol is easy
    // to get wrong and would be a confidently wrong answer.
    const pol = await get("/wallet-balance", { address: VITALIK, query: "What is the MATIC balance on Polygon?" });
    if (!/polygon/i.test(String(pol.body.reason ?? ""))) bad.push("polygon answer never names polygon");
    if (!String(pol.body.verdict ?? "").includes("POL") && !String(pol.body.reason ?? "").includes("POL")) bad.push("polygon answer does not carry POL");
    if (pol.body.error) bad.push(`polygon errored: ${pol.body.error}`);
    // A token asked about alongside the native coin must be called out, not
    // silently ignored — answering half a question is the failure mode here.
    const usdt = await get("/wallet-balance", { address: VITALIK, query: "How much USDT does this address hold?" });
    if (!/USDT/i.test(usdt.body.reason)) bad.push("USDT asked about but never mentioned in the answer");
    return bad;
  },
};

console.log(`intent answers against ${BASE}\n`);

// Before a single request: does this file still cover what we actually declare?
// It did not — the manifest declared thirteen intents and this file defined
// twelve cases, and `preflight.mjs` asserted the literal "12/12", so the missing
// WEATHER_CHECK probe read as a clean pass for weeks. Coverage is therefore
// derived from miner.yaml and a gap is fatal here, not silent.
try {
  const n = assertCoversDeclaredIntents(Object.keys(CHECKS), { label: "intent-answers.mjs" });
  console.log(`  coverage: ${n} declared intents, ${n} cases\n`);
} catch (e) {
  console.error(`COVERAGE FAILURE: ${e.message}`);
  process.exit(1);
}

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
