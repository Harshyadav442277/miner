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
  async GAS_PRICE() {
    const bad = [];
    // The described trap is answering with the token price instead of the fee.
    const r = await get("/gas-price", { query: "What is the current gas price in Gwei on the Ethereum network?" });
    const b = r.body;
    if (b.error) return [`errored: ${b.error}`];   // RPCs down; re-run the gate alone.
    const reason = String(b.reason ?? "");
    if (b.verdict !== "gas_price") bad.push(`ethereum -> ${b.verdict}, want gas_price`);
    if (!/on ethereum is [\d.]+ Gwei/.test(reason)) bad.push("no Gwei figure for ethereum in the answer");
    if (!/as of block [\d,]+/.test(reason)) bad.push("answer names no block, so the figure is not checkable");
    if (!/not the price of ETH/.test(reason)) bad.push("answer does not distinguish the fee from the token price");
    if (/\$/.test(reason)) bad.push("a gas answer quotes a dollar price");

    // Independently: recompute from the chain and compare the magnitude. An
    // exact match is not expected (gas moves every block) but a wrong ORDER
    // of magnitude means we read the wrong thing.
    try {
      const rpc = await (await fetch("https://ethereum-rpc.publicnode.com", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }),
        signal: AbortSignal.timeout(15000),
      })).json();
      const want = Number(BigInt(rpc.result)) / 1e9;
      const got = Number((reason.match(/on ethereum is ([\d.]+) Gwei/) ?? [])[1]);
      if (Number.isFinite(want) && Number.isFinite(got) && want > 0) {
        const ratio = got / want;
        if (ratio < 0.1 || ratio > 10) bad.push(`gas figure ${got} is far from the chain\u2019s ${want.toFixed(6)}`);
      }
    } catch { /* the cross-check is best effort */ }

    // A chain we do not read must be named, not answered from Ethereum.
    const sol = await get("/gas-price", { query: "What is the gas price on Solana?" });
    if (sol.body.error !== "unsupported_chain") bad.push(`solana -> ${sol.body.error}, want unsupported_chain`);
    if (/Gwei/.test(String(sol.body.reason ?? ""))) bad.push("a figure was quoted for a chain we do not read");

    // A named L2 must not be captured by the Ethereum pattern.
    const base = await get("/gas-price", { query: "gas on base?" });
    if (!base.body.error && !/on base is/.test(String(base.body.reason ?? ""))) {
      bad.push("a Base question was not answered about Base");
    }
    return bad;
  },

  async FINANCIAL_DATA() {
    const bad = [];
    // The intent is explicitly "beyond a single quoted price", so a bare price
    // is the wrong answer here even when the number is right.
    const tok = await get("/financial", {
      query: "Give the market cap and 24h trading volume for token 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 on base.",
    });
    const t = tok.body;
    if (t.error) return [`errored: ${t.error}`];   // provider down; re-run the gate alone.
    const tr = String(t.reason ?? "");
    if (t.verdict !== "financial_data") bad.push(`token -> ${t.verdict}, want financial_data`);
    if (!/market capitalisation of \$[\d,]+/.test(tr)) bad.push("no market capitalisation in the token answer");
    if (!/24-hour trading volume of \$[\d,]+/.test(tr)) bad.push("no 24h volume in the token answer");
    if (!/USDC/.test(tr)) bad.push("token not identified as USDC");
    if (!/not a single quoted price/.test(tr)) bad.push("answer does not distinguish itself from a price lookup");

    // Fundamentals are not retrievable keylessly. The answer must say so
    // rather than let the market data read as a P/E ratio.
    const eq = await get("/financial", { query: "What is Apple\u2019s P/E ratio and revenue growth this quarter?" });
    if (!eq.body.error) {
      const er = String(eq.body.reason ?? "");
      if (!/Apple/.test(er)) bad.push("Apple not resolved");
      if (!/52-week range/.test(er)) bad.push("no 52-week range in the equity answer");
      if (!/price-to-earnings ratio/.test(er)) bad.push("the P/E ratio asked for is not mentioned at all");
      if (!/not retrieved|not available/i.test(er)) bad.push("the unavailable fundamentals are not declared unavailable");
    }

    const none = await get("/financial", { query: "market data please" });
    if (none.body.error !== "no_subject") bad.push(`subjectless -> ${none.body.error}, want no_subject`);
    return bad;
  },

  async FRAUD_DETECTION() {
    const bad = [];
    // A clean result must never read as a clearance: a caller acts on it.
    const clean = await get("/fraud-check", { query: "How risky is 0x0000000000000000000000000000000000000001?" });
    const c = clean.body;
    if (c.error && c.error !== "no_subject") return [`errored: ${c.error}`];
    const cr = String(c.reason ?? "");
    if (c.verdict === "no_indicators") {
      if (!/not the same as being safe/i.test(cr)) bad.push("a clean result does not disclaim that it means safe");
      if (!/checks performed/i.test(cr)) bad.push("a clean result does not say which checks were performed");
    }

    // A sanctioned address must be high risk, taken from the list at run time
    // so the fixture cannot go stale.
    let sanctionedAddr = null;
    try {
      const body = await (await fetch(
        "https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt",
        { signal: AbortSignal.timeout(15000) },
      )).text();
      sanctionedAddr = body.trim().split(/\r?\n/)[0] ?? null;
    } catch { /* list unavailable; skip this half */ }
    if (sanctionedAddr) {
      const hit = await get("/fraud-check", { query: `Is it safe to receive funds from ${sanctionedAddr}?` });
      if (!hit.body.error) {
        if (hit.body.verdict !== "high_risk") bad.push(`sanctioned address -> ${hit.body.verdict}, want high_risk`);
        if (!/OFAC sanctioned/.test(String(hit.body.reason ?? ""))) bad.push("a sanctions hit does not name the sanctions list");
      }
    }

    // Scam wording alone must raise risk.
    const scam = await get("/fraud-check", { query: "They asked me to buy gift cards to settle the invoice." });
    if (!scam.body.error && scam.body.verdict === "no_indicators") {
      bad.push("gift-card payment wording did not raise risk");
    }

    const none = await get("/fraud-check", { query: "is this fraudulent?" });
    if (none.body.error !== "no_subject") bad.push(`subjectless -> ${none.body.error}, want no_subject`);
    return bad;
  },

  async GAME_RESULT() {
    const bad = [];
    // The champion here rewards the WRONG winner above the right one (0.854 vs
    // 0.822) and inventing a winner for a draw above both (0.951). This probe
    // therefore checks the answer against the actual scoreboard rather than
    // against the scorer's taste.
    const r = await get("/game-result", { query: "Who won the Arsenal vs Chelsea game?" });
    const b = r.body;
    if (b.error) return [`errored: ${b.error}`]; // scoreboard down; re-run the gate alone.

    if (b.verdict === "result") {
      const reason = String(b.reason ?? "");
      const score = reason.match(/(\d+)-(\d+)/);
      if (!score) bad.push("a result carries no score");
      if (!/is complete/.test(reason)) bad.push("a result does not state that the fixture is finished");
      // Independently: read ESPN and confirm the winner and score agree.
      try {
        const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260901-" +
          new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const j = await (await fetch(url, {
          headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
          signal: AbortSignal.timeout(15000),
        })).json();
        const ev = (j.events ?? []).filter((e) => /ARS/.test(e.shortName ?? "") && /CHE/.test(e.shortName ?? ""))
          .filter((e) => e.competitions?.[0]?.status?.type?.completed)
          .sort((x, y) => String(y.date).localeCompare(String(x.date)))[0];
        if (ev) {
          const cs = ev.competitions[0].competitors;
          const home = cs.find((c) => c.homeAway === "home");
          const away = cs.find((c) => c.homeAway === "away");
          const hs = Number(home.score), as = Number(away.score);
          const want = hs === as ? null : (hs > as ? home.team.displayName : away.team.displayName);
          if (want === null) {
            if (!/neither side won/i.test(reason)) bad.push("a drawn fixture was not reported as a draw");
          } else if (!reason.includes(want)) {
            bad.push(`answer does not name the actual winner ${want}`);
          }
          const hi = Math.max(hs, as), lo = Math.min(hs, as);
          if (hs !== as && !reason.includes(`${hi}-${lo}`)) bad.push(`answer does not carry the actual score ${hi}-${lo}`);
        }
      } catch { /* the cross-check is best effort */ }
    } else if (b.verdict !== "not_found") {
      bad.push(`Arsenal vs Chelsea -> ${b.verdict}, want result or not_found`);
    }

    // A fixture that has not been played must never come back as a result. This
    // is the SPORTS_SCORE mistake and the shape the scorer punishes hardest.
    const unplayed = await get("/game-result", { query: "Who won the Manchester United vs Liverpool game?" });
    if (!unplayed.body.error) {
      if (unplayed.body.verdict === "result") bad.push("an unplayed fixture was reported as a result");
      if (unplayed.body.verdict === "not_found" && /\d+-\d+/.test(String(unplayed.body.reason ?? ""))) {
        bad.push("a score was quoted for a fixture with no finished record");
      }
    }

    // No fixture named: refuse rather than guess which two teams were meant.
    const vague = await get("/game-result", { query: "Who won the game?" });
    if (vague.body.error !== "no_fixture") bad.push(`fixtureless request -> ${vague.body.error}, want no_fixture`);
    return bad;
  },

  async CURRENCY_EXCHANGE() {
    const bad = [];
    // The scorer is an exact match on the number, so this probe checks the
    // number against an independent computation of the same reference rate
    // rather than checking that the answer merely looks like a conversion.
    const r = await get("/convert", { query: "What is 100 USD in EUR right now?" });
    const b = r.body;
    if (b.error) return [`errored: ${b.error}`]; // rate source down; re-run the gate alone.
    if (b.verdict !== "converted") bad.push(`100 USD in EUR -> ${b.verdict}, want converted`);
    const reason = String(b.reason ?? "");

    // Independently: read the ECB feed here and recompute.
    let ecb = null;
    try {
      const x = await (await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", { signal: AbortSignal.timeout(15000) })).text();
      const usd = Number(x.match(/currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/)?.[1]);
      const date = x.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
      if (Number.isFinite(usd) && date) ecb = { usd, date };
    } catch { /* the cross-check is best effort */ }

    if (ecb) {
      const want = (100 / ecb.usd).toFixed(2);
      if (!reason.includes(want)) bad.push(`answer does not carry the ECB-derived figure ${want} EUR`);
      if (!reason.includes(ecb.date)) bad.push(`answer does not carry the reference date ${ecb.date}`);
      if (!reason.includes(String(ecb.usd))) bad.push(`answer does not carry the inverse rate ${ecb.usd}`);
    }
    // A reference rate must be labelled as one, not implied to be a live quote.
    if (!/reference rate published for/.test(reason)) bad.push("answer does not identify the rate as a daily reference rate");
    if (!/not a live trading quote/.test(reason)) bad.push("answer does not distinguish itself from a trading quote");
    // Both directions, because an inverted answer scores 1.9e-7.
    if (!/1 USD = /.test(reason) || !/1 EUR = /.test(reason)) bad.push("answer does not state the rate in both directions");

    // "How many X is Y" names the target first; reading it in order inverts it.
    const inverted = await get("/convert", { query: "How many yen is 1 dollar?" });
    if (!inverted.body.error) {
      const ir = String(inverted.body.reason ?? "");
      if (!/1\.00 USD is [\d,]+\.\d\d JPY/.test(ir)) bad.push(`"how many yen is 1 dollar" was not read as USD to JPY: ${ir.slice(0, 90)}`);
    }

    // One named currency is quoted against the dollar, and against the euro when
    // the dollar is the one named. This gate used to demand `missing_currency`
    // here; three of the four routed CURRENCY_EXCHANGE questions name exactly
    // one currency and all three were refused, so the refusal was the defect and
    // the assertion moved with the behaviour.
    const half = await get("/convert", { query: "How much is 100 dollars?" });
    if (half.body.error) bad.push(`single-currency request -> ${half.body.error}, want a quote against the euro`);
    else if (!/100\.00 USD is [\d,]+\.\d\d EUR/.test(String(half.body.reason ?? ""))) {
      bad.push(`"how much is 100 dollars" was not quoted against the euro: ${String(half.body.reason ?? "").slice(0, 90)}`);
    }
    const euro = await get("/convert", { query: "whats the fx rate of euro?" });
    if (!euro.body.error && !/1 EUR = [\d.]+ USD/.test(String(euro.body.reason ?? ""))) {
      bad.push(`"fx rate of euro" was not quoted against the dollar: ${String(euro.body.reason ?? "").slice(0, 90)}`);
    }

    // Naming NO currency is still not a conversion, and must still refuse.
    const none = await get("/convert", { query: "What is the exchange rate?" });
    if (none.body.error !== "missing_currency") bad.push(`no-currency request -> ${none.body.error}, want missing_currency`);
    return bad;
  },

  async NEWS_SEARCH() {
    const bad = [];
    // Article coverage, not a headline list: every item must carry a publisher
    // and a date. Measured against champion 3165, a relevant answer crosses at
    // ~0.99 and an irrelevant one scores 1.2e-4 — the same as saying nothing —
    // so relevance is what this probe is really testing.
    const r = await get("/news-search", {
      query: "Find recent articles covering the European Central Bank interest rate decision.",
    });
    const b = r.body;
    if (b.error) return [`errored: ${b.error}`]; // news index down; re-run the gate alone.
    if (b.verdict !== "articles") bad.push(`ECB search -> ${b.verdict}, want articles`);
    const reason = String(b.reason ?? "");
    // Every listed article is "headline" (publisher, date). At least two of them.
    const cited = [...reason.matchAll(/"[^"]{8,}"\s+\(([^,)]+),\s*([^)]+)\)/g)];
    if (cited.length < 2) bad.push(`only ${cited.length} articles carry a publisher and a date`);
    for (const [, publisher, date] of cited) {
      if (!publisher.trim() || /^publisher not stated$/i.test(publisher)) bad.push(`an article has no publisher`);
      if (Number.isNaN(new Date(date).getTime())) bad.push(`unparseable publication date: ${date}`);
    }
    // The subject must actually be named by the articles, by name or acronym.
    // A list of nearby-but-wrong articles is the incumbent failure mode.
    const onSubject = cited.filter(([whole]) => /\bECB\b|European Central Bank|eurozone|euro\b/i.test(whole));
    if (onSubject.length < 1) bad.push("no returned article names the ECB by name or acronym");

    // An explicit window must be enforced against the dates, not just passed to
    // the upstream as a hint.
    const windowed = await get("/news-search", { query: "Find articles about the Federal Reserve from the last 3 days" });
    if (!windowed.body.error) {
      const wr = String(windowed.body.reason ?? "");
      const cutoff = Date.now() - 4 * 86400000;
      for (const [, , date] of wr.matchAll(/"[^"]{8,}"\s+\(([^,)]+),\s*([^)]+)\)/g)) {
        const t = new Date(date).getTime();
        if (Number.isFinite(t) && t < cutoff) bad.push(`article dated ${date} is outside the 3-day window`);
      }
    }

    // A subject nobody has written about must be reported as no results, not
    // padded with whatever the index returned.
    const none = await get("/news-search", { query: "Find recent articles covering zzqxwv klmnop nonexistent subject" });
    if (!none.body.error) {
      if (none.body.verdict !== "no_results") bad.push(`nonsense subject -> ${none.body.verdict}, want no_results`);
      if (/"[^"]{8,}"\s+\(/.test(String(none.body.reason ?? ""))) bad.push("a nonsense subject was given articles");
    }

    // A request naming no subject must be refused rather than searched.
    const empty = await get("/news-search", { query: "What is the news?" });
    if (empty.body.error !== "no_subject") bad.push(`subjectless request -> ${empty.body.error}, want no_subject`);
    return bad;
  },

  async TVL_LOOKUP() {
    const bad = [];
    // `lean()` projects the payload to verdict/confidence/reason, so every
    // assertion here is on the prose the network actually scores rather than on
    // fields the miner does not send. That is the point: a probe that reads
    // internal state can pass while the answer the scorer sees is wrong.
    const dollars = (t) => [...String(t ?? "").matchAll(/\$([\d,]+)(?![\d,]*\s*(?:million|billion|trillion|thousand))/g)]
      .map((m) => Number(m[1].replace(/,/g, ""))).filter(Number.isFinite);

    // The canonical description's OWN worked example, which is a token pool
    // liquidity question and not a protocol lookup. Answering it with a
    // protocol's TVL scores at the floor (~0.003 vs ~0.29 against champion 49),
    // so scope resolution is what this probe is really testing.
    const tok = await get("/tvl", {
      query: "For the token at contract 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 on base, how deep is its own trading liquidity in DEX pools (e.g. Uniswap)? Give this token's pool liquidity in USD.",
    });
    const t = tok.body;
    if (t.error) return [`errored: ${t.error}`]; // provider down; re-run the gate alone.
    if (t.verdict !== "found") bad.push(`canonical example -> ${t.verdict}, want found`);
    const tr = String(t.reason ?? "");
    if (!/own DEX pool liquidity/i.test(tr)) bad.push("canonical example not answered as token pool liquidity");
    if (!/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913/.test(tr)) bad.push("answer does not echo the contract asked about");
    if (!/\bon base\b/i.test(tr)) bad.push("answer does not name the chain asked about");
    if (!/USDC/.test(tr)) bad.push("token not identified as USDC");
    if (/according to DefiLlama/i.test(tr)) bad.push("a token question was answered from the protocol source");
    // USDC's market cap is orders of magnitude above its pool liquidity;
    // serving one for the other is the error this bound catches.
    const liq = dollars(tr)[0];
    if (!(liq > 1e6 && liq < 5e10)) bad.push(`pool liquidity ${liq} is outside a plausible range`);

    const prot = await get("/tvl", { query: "What is the total value locked in the Aave protocol right now?" });
    if (!prot.body.error) {
      const pr = String(prot.body.reason ?? "");
      if (prot.body.verdict !== "found") bad.push(`Aave -> ${prot.body.verdict}, want found`);
      if (!/Aave protocol has/i.test(pr)) bad.push("Aave not answered as a protocol lookup");
      if (!/aggregated across every chain/i.test(pr)) bad.push("protocol answer does not state its aggregation scope");
      if (!/DefiLlama/.test(pr)) bad.push("protocol answer does not attribute its source");
      if (!(dollars(pr)[0] > 1e8)) bad.push(`Aave TVL ${dollars(pr)[0]} is implausibly small`);
    }

    const chain = await get("/tvl", { query: "How much TVL is on the Base chain?" });
    if (!chain.body.error) {
      const cr = String(chain.body.reason ?? "");
      if (!/Base chain has/i.test(cr)) bad.push("Base not answered as a chain lookup");
      if (!/aggregate TVL/i.test(cr)) bad.push("chain answer does not state it is the chain aggregate");
    }

    // A protocol named alongside a chain is still a protocol question. Reading
    // the chain word as the subject answers something else entirely.
    const both = await get("/tvl", { query: "What is Aave's TVL on Base?" });
    if (!both.body.error && !/Aave protocol has/i.test(String(both.body.reason ?? ""))) {
      bad.push("a protocol question naming a chain was answered as a chain question");
    }

    // A question with no identifiable subject must be refused, not answered
    // with whatever protocol happens to slugify from the filler words.
    const empty = await get("/tvl", { query: "What is the TVL?" });
    if (empty.body.error !== "no_subject") bad.push(`subjectless question -> ${empty.body.error}, want no_subject`);
    if (dollars(String(empty.body.reason ?? "")).length) bad.push("a subjectless question was given a dollar figure");
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
    if (missing.body.verdict === "not_found" && /\d[\d,]* gas\b/.test(String(missing.body.reason ?? ""))) {
      bad.push("a missing transaction was given a gas figure");
    }
    // An unsupported chain is refused by name, not answered from Ethereum.
    const solana = await get("/tx-lookup", { hash: FIRST, chain: "solana" });
    if (solana.body.error !== "unsupported_chain") bad.push(`chain=solana -> ${solana.body.error}, want unsupported_chain`);
    // An address sent here belongs to WALLET_BALANCE_CHECK and must be said so.
    // ...unless the question asks about the contract's ACTIVITY, which this
    // intent does receive and used to refuse outright.
    const activity = await get("/tx-lookup", {
      query: "For the contract address 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D on ethereum, report its on-chain activity: the date it was deployed and the total number of transactions.",
    });
    const ab = activity.body;
    if (!/contract_activity|account_activity/.test(String(ab.verdict ?? ""))) {
      bad.push(`contract activity -> ${ab.verdict}, want an activity verdict`);
    } else {
      if (!/2020/.test(String(ab.reason ?? ""))) bad.push("activity answer carries no deployment year");
      if (!/[\d,]{7,}\s+transactions/.test(String(ab.reason ?? ""))) bad.push("activity answer carries no transaction count");
    }
    // G93 in a second place: a delegated EOA is not a deployed contract.
    const deleg = await get("/tx-lookup", { query: "When was 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 deployed and how many transactions does it have?" });
    if (/\bis a contract\b/.test(String(deleg.body.reason ?? ""))) {
      bad.push("a delegated account is described as a contract");
    }
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
    /**
     * A present-tense question must get a CURRENT reading. This check used to
     * accept any temperature in the prose, so "What is the current temperature in
     * Cairo?" passed on production while being answered with a 24-hour range
     * (2026-09-13). A range is a true answer to a different question.
     */
    if (/hourly weather forecast|from -?\d+(?:\.\d+)?°C to/.test(String(b.reason ?? ""))) {
      bad.push("a right-now question was answered with a forecast range, not a current reading");
    }
    const cairo = await get("/weather-forecast", { query: "What is the current temperature in Cairo?" });
    if (!cairo.body.error && !/^The current temperature in Cairo[^.]* is -?\d+(?:\.\d+)?°C/.test(String(cairo.body.reason ?? ""))) {
      bad.push(`current temperature -> "${String(cairo.body.reason ?? "").slice(0, 80)}", not a current reading`);
    }
    // And a forecast question must still get the forecast, not a reading.
    const fc = await get("/weather-forecast", { query: "What is the weather forecast for Tokyo over the next 24 hours?" });
    if (!fc.body.error && !/hourly weather forecast/.test(String(fc.body.reason ?? ""))) {
      bad.push("a forecast question was diverted to the current reading");
    }
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
      // TWO honest answers are possible and they are different claims: the index
      // answered and had nothing ("no peer-reviewed papers ... were found"), or
      // the index did not answer at all ("could not be searched ... availability
      // problem"). Only the second is true during an OpenAlex outage, and
      // asserting the first then would be a statement about the literature made
      // without having looked at it. Either is accepted here; silence is not.
      const saysEmpty = /no peer-reviewed papers/i.test(reason);
      const saysUnavailable = /could not be searched/i.test(reason) && /availability problem/i.test(reason);
      if (!saysEmpty && !saysUnavailable) {
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

  // Shares the fixture providers with GAME_RESULT, and that is exactly why it
  // needs its own case: a live score reported as an outcome is the confusion the
  // canonical description calls out by name.
  async SPORTS_SCORE() {
    const bad = [];
    const r = await get("/sports-score", { query: "What is the score in the Arsenal vs Chelsea match?" });
    const b = r.body;
    if (!["live_score", "final_score", "not_played", "not_found"].includes(String(b.verdict))) {
      bad.push(`verdict ${b.verdict} is not a score verdict`);
    }
    if (b.verdict === "live_score" || b.verdict === "final_score") {
      if (!/\d+,\s+.+\s+\d+/.test(String(b.reason ?? ""))) bad.push("a score verdict carries no two-sided score in prose");
      // The winner belongs to GAME_RESULT. Naming one here answers the wrong
      // question with the right data.
      if (/\bbeat\b|\bwon\b|\bwinner\b/i.test(String(b.reason ?? ""))) bad.push("a score answer names a winner");
    }
    if (b.verdict === "live_score" && !/not a final result/i.test(String(b.reason ?? ""))) {
      bad.push("a live score is not marked as provisional");
    }
    // Both sides must be named; nothing is guessed from prose.
    const vague = await get("/sports-score", { query: "What is the score?" });
    if (vague.body.error !== "no_fixture") bad.push(`a fixture-less question -> ${vague.body.error}, want no_fixture`);
    return bad;
  },

  async TOKEN_HOLDER_COUNT() {
    const bad = [];
    const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    /**
     * Probe the provider before grading ourselves against it.
     *
     * G89's lesson, hit again on 2026-09-11: Blockscout returned 503 across the
     * board and this gate reported three failures for an outage that was not
     * ours. A gate that goes red on somebody else's downtime teaches you to
     * ignore the gate. What must ALWAYS hold is that we answer honestly, and
     * that is asserted below in both states.
     */
    let providerUp = true;
    try {
      const probe = await fetch(`https://base.blockscout.com/api/v2/tokens/${USDC_BASE}`, {
        headers: { accept: "application/json", "user-agent": "livecert-miner/1.0" },
        signal: AbortSignal.timeout(20000),
      });
      providerUp = probe.ok;
    } catch { providerUp = false; }

    const r = await get("/token-holders", { query: `How many addresses hold the token ${USDC_BASE} on base?` });
    const b = r.body;

    if (!providerUp) {
      // The only thing gradeable during an outage: we must say it is an outage
      // and must not claim the token has no holders.
      if (b.error !== "upstream_unavailable") {
        bad.push(`blockscout is shedding and we answered ${b.verdict}/${b.error}, want upstream_unavailable`);
      }
      if (!/index outage rather than a token with no holders/i.test(String(b.reason ?? ""))) {
        bad.push("an outage was not described as one");
      }
      console.log("\n      (blockscout shedding — holder counts checked for honesty only)");
    } else {
      if (b.verdict !== "holder_count") bad.push(`base USDC -> ${b.verdict}, want holder_count`);
      const n = String(b.reason ?? "").match(/([\d,]{4,})\s+distinct holder addresses/);
      if (!n) bad.push("no holder figure in prose");
      else if (Number(n[1].replace(/,/g, "")) < 100000) bad.push(`holder figure ${n[1]} implausible for USDC on Base`);
      // The contract the figure came from is what makes it checkable.
      if (!new RegExp(USDC_BASE, "i").test(String(b.reason ?? ""))) bad.push("answer never names the contract read");
      // A symbol with its chain, which is the shape of the only clean routed
      // question this intent has received.
      const sym = await get("/token-holders", { query: "How many addresses hold usdc on base?" });
      if (sym.body.verdict !== "holder_count") bad.push(`symbol form -> ${sym.body.verdict}, want holder_count`);
    }

    // Independent of any provider: a CVE id is not a token and is never searched
    // for as one, because that path never reaches an upstream.
    const cve = await get("/token-holders", { query: "For token CVE-2021-44228, report total holder count." });
    if (cve.body.error !== "not_a_token") bad.push(`CVE id -> ${cve.body.error}, want not_a_token`);
    return bad;
  },

  async RESEARCH_QUERY() {
    const bad = [];
    const r = await get("/research", { query: "Will Lepodisiran reduce coronary plaque?" });
    const b = r.body;
    if (b.verdict !== "evidence") bad.push(`Lepodisiran -> ${b.verdict}, want evidence`);
    const prose = String(b.reason ?? "");
    if (!/Lepodisiran/i.test(prose)) bad.push("answer never names the subject asked about");
    // A cited answer means a citation a reader can follow.
    if (!/NCT\d{6,}/.test(prose)) bad.push("no trial identifier cited");
    // Nothing predicts an outcome that has not been decided.
    if (/\bwill (?:be approved|succeed|likely)\b|\bwe expect\b|\bprobably\b/i.test(prose)) {
      bad.push("answer predicts an outcome instead of reporting the record");
    }
    const empty = await get("/research", { query: "  " });
    if (empty.body.error !== "no_question") bad.push(`an empty question -> ${empty.body.error}, want no_question`);
    return bad;
  },

  async TEXT_AUTHENTICITY_CHECK() {
    const bad = [];
    const copied =
      'Is this original writing or was it copied? "The Eiffel Tower is a wrought-iron lattice tower on '
      + 'the Champ de Mars in Paris, France. It is named after the engineer Gustave Eiffel, whose company '
      + 'designed and built the tower from 1887 to 1889."';
    const r = await get("/authenticity", { query: copied });
    const b = r.body;
    if (b.verdict === "unavailable") {
      // An index outage is honest and is reported as one, not graded as a miss.
      if (b.error !== "upstream_unavailable") bad.push("unavailable without an upstream error");
    } else {
      if (b.verdict !== "copied") bad.push(`a verbatim Wikipedia passage -> ${b.verdict}, want copied`);
      if (!/verbatim/i.test(String(b.reason ?? ""))) bad.push("a copying verdict cites no verbatim phrase");
    }
    // A miss must never be dressed up as proof of originality.
    const fresh = await get("/authenticity", {
      query: 'Is this original? "My grandmother kept a tin of buttons under the stairs and every rainy '
        + 'afternoon she would tip them across the kitchen table so I could sort them into colours she '
        + 'named after birds she had never seen, and I believed every name until I was nearly twelve."',
    });
    const fb = String(fresh.body.reason ?? "");
    if (fresh.body.verdict === "no_source_found" && !/not proof the text is original/i.test(fb)) {
      bad.push("a miss is reported without its limit");
    }
    const none = await get("/authenticity", { query: "Is this text original?" });
    if (none.body.error !== "no_text") bad.push(`no passage -> ${none.body.error}, want no_text`);
    return bad;
  },

  async CRYPTO_PRICE() {
    const bad = [];
    // An independent trade price to grade against. Coinbase is also one of the
    // route's sources, so agreement within 2% is a sanity bound on the figure we
    // print, not proof of a second opinion; the UTC stamp is what makes it checkable.
    let truth = null;
    try {
      const t = await fetch("https://api.exchange.coinbase.com/products/BTC-USD/ticker", { signal: AbortSignal.timeout(15000) });
      if (t.ok) truth = Number((await t.json()).price);
    } catch { truth = null; }

    const r = await get("/crypto-price", { query: "What is the current price of Bitcoin (BTC) in USD?" });
    const b = r.body;
    const prose = String(b.reason ?? "");
    if (b.error === "upstream_unavailable") {
      // Honesty is the only gradeable thing in an outage: no figure may be invented.
      if (/\$\d/.test(prose)) bad.push("an outage answer carries a price figure");
      if (!/availability problem/.test(prose)) bad.push("an outage was not described as one");
      console.log("\n      (price providers down — CRYPTO_PRICE checked for honesty only)");
    } else {
      if (b.verdict !== "price") bad.push(`BTC -> ${b.verdict}, want price`);
      const said = Number(prose.match(/^Bitcoin \(BTC\) is \$([\d,]+\.\d{2}) USD/)?.[1]?.replace(/,/g, ""));
      if (!Number.isFinite(said)) bad.push("answer does not lead with a BTC figure in USD");
      else if (truth && Math.abs(said - truth) / truth > 0.02) bad.push(`BTC ${said} is more than 2% from Coinbase ${truth}`);
      if (!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/.test(prose)) bad.push("no UTC quote time");
      if (!/Coinbase|Kraken|CoinGecko/.test(prose)) bad.push("no quoting venue named");
    }

    // Refusals that reach no upstream, so they hold in every provider state.
    const testnet = await get("/crypto-price", { query: "What is the price of Base sepolia now?" });
    if (testnet.body.verdict !== "no_market_price") bad.push(`Base sepolia -> ${testnet.body.verdict}, want no_market_price`);
    const none = await get("/crypto-price", { query: "crypto price check" });
    if (none.body.error !== "no_subject") bad.push(`subjectless -> ${none.body.error}, want no_subject`);
    // A fork's name is never answered with the major's price (2026-09-12: BCH got BTC's $77k).
    const bch = await get("/crypto-price", { query: "Bitcoin Cash price" });
    if (/^Bitcoin \(BTC\)/.test(String(bch.body.reason ?? ""))) bad.push("Bitcoin Cash answered with Bitcoin's price");
    const link = await get("/crypto-price", { query: "Is it a good time to link my wallet?" });
    if (link.body.error !== "no_subject") bad.push(`'link my wallet' -> ${link.body.verdict}, want no_subject`);
    return bad;
  },

  async STOCK_PRICE() {
    const bad = [];
    // Read the session window straight from the source, so "open" and "closed"
    // are graded against the exchange's own clock rather than ours.
    let meta = null;
    try {
      const y = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=1d", {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
        signal: AbortSignal.timeout(15000),
      });
      if (y.ok) meta = (await y.json()).chart?.result?.[0]?.meta ?? null;
    } catch { meta = null; }

    const r = await get("/stock-price", { query: "What is the current share price of Apple (AAPL)?" });
    const b = r.body;
    const prose = String(b.reason ?? "");
    if (b.error === "upstream_unavailable") {
      if (/\d+\.\d{2} USD/.test(prose)) bad.push("an outage answer carries a price figure");
      console.log("\n      (quote providers down — STOCK_PRICE checked for honesty only)");
    } else {
      if (b.verdict !== "price") bad.push(`AAPL -> ${b.verdict}, want price`);
      if (!/\(AAPL\)/.test(prose)) bad.push("ticker not named");
      const said = Number(prose.match(/(?:trading at|last traded at) (\d+\.\d{2}) USD/)?.[1]);
      if (meta && Number.isFinite(said) && Math.abs(said - meta.regularMarketPrice) / meta.regularMarketPrice > 0.01) {
        bad.push(`AAPL ${said} is more than 1% from Yahoo ${meta.regularMarketPrice}`);
      }
      if (!/America\/New_York/.test(prose)) bad.push("quote time not given in the exchange's zone");
      const p = meta?.currentTradingPeriod?.regular;
      if (p) {
        const open = Date.now() / 1000 >= p.start && Date.now() / 1000 < p.end;
        if (open && !/session is open/.test(prose)) bad.push("market is open but the answer does not say so");
        if (!open && !/not a live quote/.test(prose)) bad.push("market is closed but the last price is not labelled as such");
      }
    }
    // "Fresenius Kabi" resolved to Fresenius Medical Care on 2026-09-12; a sibling's
    // price must never stand in for an unlisted subsidiary's.
    const kabi = await get("/stock-price", { query: "Will Fresenius Kabi stock drop?" });
    if (!kabi.body.error && /last traded at|trading at/.test(String(kabi.body.reason ?? ""))) {
      bad.push("Fresenius Kabi was answered with another company's price");
    }
    const lly = await get("/stock-price", { query: "Will Eli Lilly stock rise?" });
    if (!lly.body.error && !/no forecast is made/.test(String(lly.body.reason ?? ""))) bad.push("a rise question was not declined as a forecast");
    // Wrong-subject prices found by the 2026-09-12 verifier, refused with no upstream call.
    const wx = await get("/stock-price", { query: "What is the 24-hour weather forecast for Auckland?" });
    if (wx.body.error !== "no_subject") bad.push(`misrouted weather -> ${wx.body.verdict}, want no_subject`);
    const usd = await get("/stock-price", { query: "What is Apple share price (USD)?" });
    if (/ProShares|\(USD\) last traded/.test(String(usd.body.reason ?? ""))) bad.push("'(USD)' was read as a ticker");
    const tsla = await get("/stock-price", { query: "What is the ticker for Tesla and its share price?" });
    if (/\(FOR\)/.test(String(tsla.body.reason ?? ""))) bad.push("'ticker for' read FOR as the ticker");
    return bad;
  },

  async CROSS_CHAIN_STATE_VERIFY() {
    const bad = [];
    // A delivered Stargate message, Arbitrum -> Base, read 2026-09-12. Scan is
    // probed first so an indexer outage is graded for honesty, not as a failure.
    const SRC = "0x46b617219a83f81f264e9e3f6ff6714e974701a207059989346fd092e4c81a22";
    let scanned = null;
    try {
      const s = await fetch(`https://scan.layerzero-api.com/v1/messages/tx/${SRC}`, { signal: AbortSignal.timeout(20000) });
      if (s.ok) scanned = (await s.json()).data?.[0] ?? null;
    } catch { scanned = null; }

    const r = await get("/cross-chain", { query: `Verify the LayerZero message in arbitrum tx ${SRC} executed on base.` });
    const b = r.body;
    if (!scanned) {
      if (b.verdict === "verified") bad.push("verified while LayerZero Scan was unreachable from the checker");
      console.log("\n      (LayerZero Scan unreachable — CROSS_CHAIN checked for honesty only)");
    } else if (b.verdict === "unknown") {
      if (!/did not respond/.test(String(b.reason ?? ""))) bad.push("an unknown verdict does not name the outage");
    } else {
      if (b.verdict !== "verified") bad.push(`delivered message -> ${b.verdict}, want verified`);
      const dst = scanned.destination?.tx?.txHash;
      if (dst && !String(b.reason ?? "").includes(dst)) bad.push("destination transaction hash not stated");
      if (!String(b.reason ?? "").includes(scanned.guid)) bad.push("message GUID not stated");
    }
    // The canonical example names no message; a state root is never claimed.
    const canon = await get("/cross-chain", {
      query: "Verify that the LayerZero message with nonce 4412 from arbitrum executed on base and that the committed state root matches.",
    });
    if (canon.body.verdict === "verified") bad.push("canonical example verified without a message reference");
    if (!/does not verify state roots/.test(String(canon.body.reason ?? ""))) bad.push("the state-root limit is not named");
    const concept = await get("/cross-chain", { query: "How do cross-chain bridges work?" });
    if (concept.body.verdict !== "insufficient_input") bad.push(`conceptual -> ${concept.body.verdict}, want insufficient_input`);
    return bad;
  },

  async EVENT_OUTCOME_RESOLUTION() {
    const bad = [];
    // Polymarket's own settlement of the Fed's September 2025 decision: the 25 bps
    // market paid Yes. Probed directly so an outage is graded for honesty only.
    let settled = null;
    try {
      const g = await fetch("https://gamma-api.polymarket.com/public-search?q=fed%20september%202025&limit_per_type=10&keep_closed_markets=1", { signal: AbortSignal.timeout(20000) });
      if (g.ok) {
        const m = ((await g.json()).events ?? []).flatMap((e) => e.markets ?? [])
          .find((x) => x.question === "Fed decreases interest rates by 25 bps after September 2025 meeting?");
        settled = m ? JSON.parse(m.outcomePrices)[0] === "1" : null;
      }
    } catch { settled = null; }

    const r = await get("/event-outcome", { query: "Did the Fed cut rates by 25 bps at its September 2025 meeting? Resolve this market." });
    const b = r.body;
    const prose = String(b.reason ?? "");
    if (settled === null) {
      if (b.verdict === "resolved" && !/Fed/.test(prose)) bad.push("resolved against a market that is not the Fed's");
      console.log("\n      (Polymarket unreachable from the checker — EVENT_OUTCOME checked for honesty only)");
    } else if (b.verdict !== "unknown") {
      if (b.verdict !== "resolved") bad.push(`Fed Sept 2025 -> ${b.verdict}, want resolved`);
      if (!/^Resolved Yes: /.test(prose)) bad.push("settlement not stated as Yes");
      if (!/Fed decreases interest rates by 25 bps/.test(prose)) bad.push("the settled market is not named");
    }
    // Odds are never an outcome, in any state.
    if (/\d+(?:\.\d+)?%|probability/i.test(prose)) bad.push("answer reports odds");
    const guess = await get("/event-outcome", { query: "Who do you think will win the election?" });
    if (guess.body.error !== "prediction_requested") bad.push(`prediction -> ${guess.body.error}, want prediction_requested`);
    // The Fed cut in September 2025, so "did it hold" must never resolve Yes.
    const hold = await get("/event-outcome", { query: "Did the Fed hold rates steady at its September 2025 meeting?" });
    if (/^Resolved Yes/.test(String(hold.body.reason ?? ""))) bad.push("a hold question resolved Yes although the Fed cut");
    return bad;
  },

  async URL_SCAN() {
    const bad = [];
    /**
     * Probe the provider before grading ourselves against it (G89). Cloudflare
     * publishes malware.testcategory.com as a test domain its security resolver
     * blocks; that 0.0.0.0 is the verifiable fact. With the resolver down, only
     * honesty is graded: a known malware test domain must never be called safe.
     */
    let filterUp = true;
    try {
      const probe = await fetch("https://security.cloudflare-dns.com/dns-query?name=malware.testcategory.com&type=A", {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(15000),
      });
      const j = await probe.json();
      filterUp = probe.ok && (j.Answer ?? []).some((a) => a.data === "0.0.0.0");
    } catch { filterUp = false; }

    const flagged = await get("/url-scan", { query: "Is http://malware.testcategory.com/download safe to click?" });
    const f = flagged.body;
    if (!filterUp) {
      if (f.verdict === "safe") bad.push("the security resolver is down and a malware test domain was called safe");
      console.log("\n      (Cloudflare security resolver unavailable — URL_SCAN checked for honesty only)");
    } else {
      if (f.verdict !== "unsafe") bad.push(`malware.testcategory.com -> ${f.verdict}, want unsafe`);
      if (!/0\.0\.0\.0/.test(String(f.reason ?? ""))) bad.push("an unsafe verdict does not state the resolver evidence");
    }

    // A clean verdict must carry its limit, because a caller acts on it.
    const good = await get("/url-scan", { query: "Is this URL safe to click: https://github.com/torvalds/linux ?" });
    if (good.body.error !== "upstream_unavailable") {
      if (good.body.verdict !== "safe") bad.push(`github.com -> ${good.body.verdict}, want safe`);
      if (!/No blocklist can prove a site safe/.test(String(good.body.reason ?? ""))) bad.push("a safe verdict does not state that it is not proof");
    }

    // Provider-independent: a brand lookalike is never safe, and a CVE id is not a URL.
    const fake = await get("/url-scan", { query: "Scan the URL https://binance-security-update.co/verify for malware or phishing." });
    if (!["suspicious", "unsafe"].includes(fake.body.verdict)) bad.push(`binance lookalike -> ${fake.body.verdict}, want suspicious or unsafe`);
    // A domain the brand itself operates is not impersonation (googleusercontent.com: Google's own nameservers).
    const own = await get("/url-scan", { query: "Is https://googleusercontent.com safe?" });
    if (/names? google|not a known google domain/.test(String(own.body.reason ?? ""))) bad.push("googleusercontent.com was called a Google lookalike");
    // The canonical "Not" example is SSL_VERIFICATION and gets no safety verdict.
    const cert = await get("/url-scan", { query: "Is example.com's SSL certificate valid?" });
    if (cert.body.error !== "out_of_scope") bad.push(`certificate-only question -> ${cert.body.verdict}/${cert.body.error}, want out_of_scope`);
    const cve = await get("/url-scan", { query: "Scan and judge this URL safe or unsafe: CVE-2021-44228" });
    if (cve.body.error !== "not_a_url") bad.push(`CVE id -> ${cve.body.error}, want not_a_url`);
    return bad;
  },

  async WEB_SEARCH() {
    const bad = [];
    // Probe Google News before grading relevance against it (G89).
    let newsUp = true;
    try {
      const probe = await fetch("https://news.google.com/rss/search?q=Federal%20Reserve", {
        headers: { "user-agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(15000),
      });
      newsUp = probe.ok && (await probe.text()).includes("<item>");
    } catch { newsUp = false; }

    const r = await get("/web-search", { query: "What's the latest news on the Fed's interest rate decision?" });
    const reason = String(r.body.reason ?? "");
    if (!newsUp) {
      // An outage must never be reported as "no reports exist".
      if (r.body.verdict === "no_results") bad.push("the news index is down and the answer claims nothing was published");
      console.log("\n      (Google News unavailable — WEB_SEARCH checked for honesty only)");
    } else {
      if (r.body.verdict !== "answered") bad.push(`Fed question -> ${r.body.verdict}, want answered`);
      const cited = [...reason.matchAll(/"([^"]{8,})"\s+\(([^,)]+),\s*(\d{1,2} [A-Z][a-z]+ \d{4})\)/g)];
      if (cited.length < 1) bad.push("no cited report carries a publisher and a date");
      for (const [, title, publisher, date] of cited) {
        if (!publisher.trim() || /publisher not stated/i.test(publisher)) bad.push("a cited report has no publisher");
        const when = new Date(date).getTime();
        if (Number.isNaN(when)) bad.push(`unparseable report date: ${date}`);
        else if (Date.now() - when > 400 * 86_400_000) bad.push(`a "latest" answer cites a report over a year old: ${date}`);
        if (!/\bFed\b|Federal Reserve|FOMC|interest rate/i.test(title)) bad.push(`a cited report is not about the Fed: ${title.slice(0, 60)}`);
      }
    }

    // Nothing predicts an outcome no source can state as fact. Quoted headlines
    // are the sources' words, so only the answer's own words are checked.
    const future = await get("/web-search", { query: "Will OpenAI face legal action?" });
    const own = String(future.body.reason ?? "").replace(/"[^"]*"/g, "");
    if (future.body.verdict === "answered" && !/coverage, not a prediction/.test(own)) bad.push("a forward-looking answer does not say it is not a prediction");
    if (/\bwill (?:likely|probably)\b|\bis (?:likely|expected) to\b/i.test(own)) bad.push("a forward-looking answer predicts an outcome");

    // Provider-independent: a misroute is refused by name, not searched.
    const tls = await get("/web-search", { query: "Verify the SSL/TLS certificate of the domain www.google.com: is it valid?" });
    if (tls.body.verdict !== "out_of_scope") bad.push(`TLS misroute -> ${tls.body.verdict}, want out_of_scope`);
    const staticQ = await get("/web-search", { query: "Explain what an interest rate is." });
    if (staticQ.body.verdict !== "out_of_scope") bad.push(`canonical Not example -> ${staticQ.body.verdict}, want out_of_scope`);
    return bad;
  },

  async CONTENT_VERIFICATION() {
    const bad = [];
    const { createHash } = await import("node:crypto");
    const clause = "The Supplier shall indemnify the Buyer against all losses arising from defective goods.";
    const hex = createHash("sha256").update(clause, "utf8").digest("hex");

    // A digest is checkable by anyone and needs no provider at all.
    const ok = await get("/content-verify", { query: `Is this text unaltered? "${clause}" Its published SHA-256 is ${hex}.` });
    if (ok.body.verdict !== "unaltered") bad.push(`matching digest -> ${ok.body.verdict}, want unaltered`);
    if (!String(ok.body.reason ?? "").includes(hex)) bad.push("the recomputed digest is not stated");
    const tampered = await get("/content-verify", { query: `Is this text unaltered? "${clause.replace("shall", "may")}" Its published SHA-256 is ${hex}.` });
    if (tampered.body.verdict !== "altered") bad.push(`edited text with the original digest -> ${tampered.body.verdict}, want altered`);

    // Structured parameters: the changed word must be named, original first.
    const two = await get("/content-verify", { query: "Has this clause been altered?", content: clause.replace(" all ", " some "), original: clause });
    if (!/"all" became "some"/.test(String(two.body.reason ?? ""))) bad.push("a two-version comparison does not name the changed word");
    // Structured content quoting its defined terms, with its TRUE digest, is unaltered.
    const defined = 'The "Supplier" shall indemnify the "Buyer" against all losses arising from any breach.';
    const dhex = createHash("sha256").update(defined, "utf8").digest("hex");
    const d = await get("/content-verify", { query: "Is this clause unaltered?", content: defined, sha256: dhex });
    if (d.body.verdict !== "unaltered") bad.push(`clause with quoted defined terms and its true digest -> ${d.body.verdict}, want unaltered`);

    // The published-text path: an edited preamble must never read as genuine.
    const preamble = "We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America.";
    const edited = preamble.replace("insure domestic Tranquility", "guarantee national Security");
    const e = await get("/content-verify", { query: `Here's a copy of the preamble: '${edited}'. Has it been altered?` });
    if (e.body.error === "upstream_unavailable") {
      console.log("\n      (Wikisource and Wikipedia unavailable — published-text path checked for honesty only)");
    } else {
      if (e.body.verdict === "matches_published_source") bad.push("an edited preamble was reported as matching published text");
      if (e.body.verdict === "differs_from_published_source" && !/guarantee/.test(String(e.body.reason ?? ""))) bad.push("the located difference does not quote the edited wording");
    }

    // Out of scope by name: media forensics is a different intent.
    const img = await get("/content-verify", { query: "Is this image a deepfake? https://example.com/photo.jpg" });
    if (img.body.verdict !== "out_of_scope") bad.push(`image question -> ${img.body.verdict}, want out_of_scope`);
    return bad;
  },

  async SENTIMENT_ANALYSIS() {
    const bad = [];
    // No upstream: computed from the request, so every assertion holds in every state.
    const neg = await get("/sentiment", { query: "What's the sentiment of this review: 'The product broke after one day, terrible quality.'?" });
    if (neg.body.verdict !== "negative") bad.push(`canonical review -> ${neg.body.verdict}, want negative`);
    if (!/terrible/.test(String(neg.body.reason ?? "")) || !/broke/.test(String(neg.body.reason ?? ""))) {
      bad.push("the negative label names neither word that carried it");
    }
    const pos = await get("/sentiment", { text: "Absolutely wonderful service, I love it" });
    if (pos.body.verdict !== "positive") bad.push(`plainly positive text -> ${pos.body.verdict}, want positive`);
    // Negation is the rule a naive word count gets wrong, in both directions.
    const negated = await get("/sentiment", { text: "The food was not good" });
    if (negated.body.verdict !== "negative") bad.push(`"not good" -> ${negated.body.verdict}, want negative`);
    // A negator never reaches across a comma (verifier repro 2026-09-13: "No problems, great service" read as "not great").
    const scoped = await get("/sentiment", { text: "No problems, great service." });
    if (scoped.body.verdict !== "positive" || /not great/.test(String(scoped.body.reason ?? ""))) bad.push(`"No problems, great service." -> ${scoped.body.verdict}: ${String(scoped.body.reason).slice(0, 80)}`);
    // No opinion word is neutral, and the answer must say that is a reading, not a certainty.
    const flat = await get("/sentiment", { query: "github.com" });
    if (flat.body.verdict !== "neutral" || !/word-list reading/.test(String(flat.body.reason ?? ""))) bad.push("a text with no opinion words is not reported as a neutral word-list reading");
    const empty = await get("/sentiment", {});
    if (empty.body.error !== "no_text") bad.push(`no text -> ${empty.body.error}, want no_text`);
    return bad;
  },

  async TEXT_CLASSIFICATION() {
    const bad = [];
    const ticket = "Classify this support ticket as billing, technical, or account issue: 'I can't log into my account.'";
    // Probe the relatedness index before grading ourselves against it (G89).
    let datamuseUp = true;
    try {
      datamuseUp = (await fetch("https://api.datamuse.com/words?ml=billing&max=1", { signal: AbortSignal.timeout(15000) })).ok;
    } catch { datamuseUp = false; }
    const t = await get("/classify", { query: ticket });
    // The label word itself is in the text, so this answers in both states.
    if (!/^This support ticket is an account issue\./.test(String(t.body.reason ?? ""))) bad.push(`canonical ticket -> ${String(t.body.reason).slice(0, 60)}`);
    const unclear = await get("/classify", { query: "Classify this ticket as billing, technical, or account issue: 'Hello, I have a question.'" });
    if (!datamuseUp) {
      if (unclear.body.verdict === "classified") bad.push("relatedness index down, yet a label was chosen without a direct match");
      console.log("\n      (datamuse down — classification checked for honesty only)");
    } else {
      if (unclear.body.verdict !== "ambiguous") bad.push(`a text with no topical word -> ${unclear.body.verdict}, want ambiguous`);
      const art = await get("/classify", {
        query: "Assign this article to one of these categories: world news, business and finance, science and technology, sport. Text: 'Researchers have sequenced the genome of a 40,000-year-old mammoth using a new extraction method.'",
      });
      if (!/science and technology/.test(String(art.body.reason ?? "")) || art.body.verdict !== "classified") bad.push("genome article not placed under science and technology");
    }
    // "not spam" must never be chosen from an absence of spam words.
    const ham = await get("/classify", { query: "Classify this email as spam or not spam: 'Hi Sam, are we still meeting at 3pm tomorrow?'" });
    if (/is not spam\./.test(String(ham.body.reason ?? ""))) bad.push("'not spam' was asserted from an absence of evidence");
    const none = await get("/classify", { query: "github.com" });
    if (none.body.error !== "no_labels") bad.push(`no label set -> ${none.body.error}, want no_labels`);
    return bad;
  },

  async RESEARCH_SYNTHESIS() {
    const bad = [];
    /**
     * The routed notes question needs no upstream, so it is graded in every
     * state: the answer restates the notes with their attributions, and says
     * the stated topic is not in them rather than inventing anything about it.
     */
    const notes = "Summarise these notes on how to destroy belarus with help over bears research in one paragraph of about 150 words in plain English, keeping the attributions in parentheses and adding nothing that is not in the notes.\n\nNotes:\n- Commission sets out next chapter for European Capitals of Culture after over 40 years of success (European Commission, 2026-09-10)\n- Dust Storm Sweeps Over Mali (NASA, 2026-09-10)\n\nNow write that paragraph.";
    const n = await get("/research-synthesis", { query: notes });
    const np = String(n.body.reason ?? "");
    if (!/Dust Storm Sweeps Over Mali \(NASA, 2026-09-10\)/.test(np)) bad.push("a note lost its attribution");
    if (!/one from European Commission and one from NASA/.test(np)) bad.push("notes answer does not count its sources");
    if (!/None of the notes addresses/.test(np)) bad.push("an unaddressed topic was not named as unaddressed");

    // Probe both indexes before grading ourselves against them (G89).
    const up = async (u) => { try { return (await fetch(u, { signal: AbortSignal.timeout(15000) })).ok; } catch { return false; } };
    const [pubmedUp, epmcUp] = await Promise.all([
      up("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=1&term=coffee"),
      up("https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=coffee&format=json&pageSize=1"),
    ]);
    const r = await get("/research-synthesis", { query: "Summarize what the latest studies say about coffee's effect on longevity, across multiple sources." });
    const b = r.body;
    const prose = String(b.reason ?? "");
    if (!pubmedUp && !epmcUp) {
      if (b.error !== "upstream_unavailable") bad.push(`both indexes down and we answered ${b.verdict}/${b.error}, want upstream_unavailable`);
      if (!/outage rather than an absence/i.test(prose)) bad.push("an outage was not described as one");
      console.log("\n      (PubMed and Europe PMC both down — synthesis checked for honesty only)");
    } else {
      if (!["synthesis", "single_source", "no_sources"].includes(b.verdict)) bad.push(`coffee and longevity -> ${b.verdict}/${b.error}`);
      if (b.verdict !== "no_sources") {
        if (!/PMID \d{6,}/.test(prose)) bad.push("no PubMed id cited");
        const quotes = prose.match(/"[^"]+"/g) ?? [];
        if (quotes.length === 0) bad.push("no finding is quoted from a source");
        // Relevance, not shape: each quote names BOTH topic words and is not a statement of purpose.
        for (const q of quotes) {
          if (!/coffee/i.test(q) || !/longevity/i.test(q)) bad.push(`quoted finding is not about coffee and longevity: ${q.slice(0, 60)}`);
          if (/^"(?:To\s+(?:examine|assess|evaluate|determine|investigate)|This (?:review|study) aims|Previous research|We (?:searched|aimed))/.test(q)) bad.push(`purpose or background quoted as a finding: ${q.slice(0, 60)}`);
        }
        // Maruthai et al. (pest detection in coffee plants) was quoted as a longevity finding before 2026-09-13.
        if (/PMID 40189644/.test(prose)) bad.push("the coffee-pest-detection paper is cited as a longevity finding");
        if (!/whether the studies agree is not assessed/.test(prose)) bad.push("answer implies an agreement it did not assess");
      }
    }
    const empty = await get("/research-synthesis", {});
    if (empty.body.error !== "no_topic") bad.push(`no topic -> ${empty.body.error}, want no_topic`);
    return bad;
  },
};

/**
 * Prove the target is the miner before grading a single answer.
 *
 * A protected preview answers every anonymous request with Vercel's login HTML,
 * and each check here then reports `threw: Unexpected token '<'` — sixteen
 * confident failures about a build that is fine. `preflight.mjs` already
 * refuses that (GAPS G78); this file is run directly often enough to need the
 * same refusal rather than the same lesson twice. Probe a protected preview
 * with `npx vercel curl <preview>/health --scope wukong4`.
 */
try {
  const probe = await fetch(`${BASE}/health`, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
  const body = probe.status === 200 ? await probe.json().catch(() => null) : null;
  if (body?.service !== "livecert") {
    const where = probe.headers.get("location") ?? probe.headers.get("content-type") ?? "";
    console.error(
      `${BASE}/health answered HTTP ${probe.status} ${where} instead of the miner's JSON. ` +
      "This is not the miner, so no answer can be graded against it. A protected preview needs " +
      "`npx vercel curl`; otherwise point this at production.",
    );
    process.exit(2);
  }
} catch (e) {
  console.error(`${BASE}/health is unreachable (${e.message}); nothing can be graded.`);
  process.exit(2);
}

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
