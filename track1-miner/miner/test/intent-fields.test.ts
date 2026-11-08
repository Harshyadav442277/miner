import { test } from "node:test";
import assert from "node:assert/strict";
import { countFields, filingTitle } from "../src/filings";
import type { Filing } from "../src/edgar";
import { registryIntentFields, sanctionsIntentFields, scoredFields } from "../src/intent-fields";
import { asksTemperatureNow } from "../src/currentweather";
import type { RegistryResult } from "../src/registry";
import type { Match, SanctionsResult } from "../src/sanctions";

// The scored names come from GET /engine/v1/intents/<id> response.fields, read 2026-11-04 UTC:
// SANCTIONS_SCREENING_MATCH_GENERAL `matched`, CORPORATE_REGISTRY_LOOKUP_GENERAL `active`,
// REGULATORY_FILING_MONITOR_GENERAL `filing_count`.

const hit = (score: number): Match => ({
  list: "OFAC SDN", id: "1", name: "ROSNEFT", matched_name: "ROSNEFT", type: "entity", programs: [], score,
  dob_years: [], dob_check: "not_given", nationalities: [], listed_on: null, url: null,
});
const screened = (verdict: SanctionsResult["verdict"], matches: Match[] = [], closest: Match | null = null): SanctionsResult => ({
  subject: "Rosneft", subject_type: null, dob_year: null, verdict, confidence: 0.9, reason: "", matches, closest,
  lists_checked: [{ list: "OFAC SDN", published: "2026-11-03", entries: 18_000 }, { list: "UN Security Council Consolidated", published: null, entries: 1_000 }],
  lists_not_checked: [],
});

test("sanctions: matched follows the verdict, and an unscreened subject is not cleared", () => {
  const m = sanctionsIntentFields(screened("match", [hit(0.97)], hit(0.97)));
  assert.equal(m.matched, true);
  assert.equal(m.name, "Rosneft");
  assert.deepEqual(m.lists, ["OFAC SDN", "UN Security Council Consolidated"]);
  assert.equal(m.match_score, 0.97);
  assert.equal(m.verdict, "match", "the existing fields stay");
  // The intent counts near-matches on spelling or transliteration.
  assert.equal(sanctionsIntentFields(screened("possible_match", [hit(0.91)])).matched, true);
  const clear = sanctionsIntentFields(screened("no_match", [], hit(0.84)));
  assert.equal(clear.matched, false);
  assert.equal(clear.match_score, 0.84);
  const outage = sanctionsIntentFields(screened("unknown"));
  assert.equal(outage.matched, null);
  assert.equal(outage.match_score, null);
});

const record = (over: Partial<RegistryResult>): RegistryResult => ({
  subject: "x", verdict: "found", confidence: 0.92, reason: "", not_in_sources: [], sources: [], ...over,
});

test("registry: active is GLEIF's entity status, and no record means unknown", () => {
  const live = registryIntentFields(record({ entity_status: "ACTIVE", lei_registration_status: "LAPSED", company_number: "2024634", lei: "549300FDK6ZP3YIHRJ47" }));
  assert.equal(live.active, true, "a lapsed LEI is a data-renewal status, not the company's");
  assert.equal(live.registration_id, "2024634");
  const gone = registryIntentFields(record({ entity_status: "INACTIVE", lei: "L" }));
  assert.equal(gone.active, false);
  assert.equal(gone.registration_id, "L");
  assert.equal(registryIntentFields(record({ verdict: "not_found" })).active, null);
  assert.equal(registryIntentFields(record({ verdict: "found", entity_status: undefined })).active, null, "an EDGAR-only answer reads no register status");
});

const filing = (form: string, filed: string, extra: Partial<Filing> = {}): Filing => ({
  form, filed, accepted: null, accession: `a-${filed}`, period: null, items: [], url: `https://sec.example/${filed}`, ...extra,
});

test("filings: titles name the form, date, period or 8-K items", () => {
  assert.equal(filingTitle(filing("10-Q", "2026-10-31", { period: "2026-09-27" })), "10-Q filed 2026-10-31 for the period ended 2026-09-27");
  assert.equal(filingTitle(filing("8-K", "2026-10-30", { period: "2026-10-30", items: [{ item: "2.02", name: "" }, { item: "9.01", name: "" }] })),
    "8-K filed 2026-10-30, event dated 2026-10-30, items 2.02, 9.01");
});

test("filings: filing_count counts the window, and says when EDGAR's index cut it short", () => {
  const index = [filing("8-K", "2026-10-30"), filing("10-Q", "2026-07-31"), filing("10-K", "2025-11-01")];
  const window = index.slice(0, 2);
  const c = countFields(window, index, "2026-01-01");
  assert.equal(c.filing_count, 2);
  assert.deepEqual(c.urls, ["https://sec.example/2026-10-30", "https://sec.example/2026-07-31"]);
  assert.equal(c.counted_since, "2026-01-01");
  assert.equal(c.count_complete, undefined);
  // A count of the whole index answers no question that was asked (epoch 2019, 2026-11-05: filings fell to 0.8145).
  const open = countFields(index, index, null);
  assert.equal(open.filing_count, null, "no window is no count");
  assert.equal(open.counted_since, null);
  assert.equal(open.filings!.length, 3, "the filings read are still listed");
  assert.equal(countFields(index.slice(2), index, null, true).filing_count, 1, "a fiscal year is a window without a since date");

  const full = Array.from({ length: 1_000 }, (_, i) => filing("4", `2026-${String(12 - Math.floor(i / 100)).padStart(2, "0")}-01`));
  assert.equal(countFields(full, full, "2020-01-01").count_complete, false);
  assert.equal(countFields(full, full, "2026-12-01").count_complete, undefined);
  assert.equal(countFields(full, full, null).count_complete, undefined, "no count, so nothing to call incomplete");
  const capped = countFields(full.concat(full), full.concat(full), "2020-01-01");
  assert.equal(capped.filing_count, 2_000);
  assert.equal(capped.filings!.length, 100, "the list is capped, the count is not");
});

// The answer shapes below are production's own (probed 2026-11-05 ~21:30 UTC, docs/evidence/scored-fields-2026-11-05/).
/** The fields of `o` named in `e`: each assertion checks the field it is about, not every field a route adds. */
const only = (o: Record<string, unknown>, e: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.keys(e).map((k) => [k, o[k]]));

test("each route names its intent's scored field, from a value it already states", () => {
  assert.deepEqual(only(scoredFields("/ssl-check", { valid: true }), { certificate_valid: true }), { certificate_valid: true });
  assert.deepEqual(only(scoredFields("/ssl-check", { verdict: "unknown" }), { certificate_valid: null }), { certificate_valid: null });
  assert.deepEqual(only(scoredFields("/gas-price", { gwei: 0.240449294 }), { gas_price_gwei: 0.240449294 }), { gas_price_gwei: 0.240449294 });
  assert.deepEqual(only(scoredFields("/convert", { rate: 88.2, converted: null }), { converted_amount: null }), { converted_amount: null }, "a rate is not a converted amount");
  assert.deepEqual(only(scoredFields("/convert", { converted: 8820.5 }), { converted_amount: 8820.5 }), { converted_amount: 8820.5 });
  assert.deepEqual(only(scoredFields("/token-holders", { holders: 9_561_593 }), { holders_count: 9_561_593 }), { holders_count: 9_561_593 });
  assert.deepEqual(only(scoredFields("/crypto-price", { price: 2240.56, quote: "USD" }), { price_usd: 2240.56 }), { price_usd: 2240.56 });
  assert.deepEqual(only(scoredFields("/crypto-price", { price: 1910.1, quote: "EUR", usd_price: 2240.56 }), { price_usd: 2240.56 }), { price_usd: 2240.56 });
  assert.deepEqual(only(scoredFields("/tx-lookup", { transaction: { block_number: 46147 } }), { block_number: 46147 }), { block_number: 46147 });
  assert.deepEqual(only(scoredFields("/tx-lookup", { verdict: "contract_activity" }), { block_number: null }), { block_number: null });
  assert.deepEqual(only(scoredFields("/wallet-balance", { balance_eth: 5.78044104 }), { balance: 5.78044104 }), { balance: 5.78044104 });
  assert.deepEqual(only(scoredFields("/wallet-balance", { balance_eth: null, symbol: "ETH", token_balances: [{ symbol: "USDC", contract: "0xa0", amount: "39.192124" }] }),
    { balance: 0, token_symbol: "" }), { balance: 39.192124, token_symbol: "USDC" }, "the one token asked for, in whole units, under its own symbol");
  assert.deepEqual(only(scoredFields("/event-outcome", { verdict: "resolved", outcome: "Yes" }), { resolved_yes: true }), { resolved_yes: true });
  assert.deepEqual(only(scoredFields("/event-outcome", { verdict: "resolved", outcome: "No" }), { resolved_yes: false }), { resolved_yes: false });
  assert.deepEqual(only(scoredFields("/event-outcome", { verdict: "resolved", outcome: "Arsenal" }), { resolved_yes: null }), { resolved_yes: true }, "a named winner: the event happened");
  assert.deepEqual(only(scoredFields("/event-outcome", { verdict: "open", outcome: null }), { resolved_yes: null }), { resolved_yes: null });
  assert.deepEqual(only(scoredFields("/url-scan", { verdict: "safe" }), { safe: true }), { safe: true });
  assert.deepEqual(only(scoredFields("/url-scan", { verdict: "suspicious" }), { safe: false }), { safe: false });
  assert.deepEqual(only(scoredFields("/url-scan", { verdict: "unreachable" }), { safe: null }), { safe: null });
  const src = (result: string) => ({ source: "s", kind: "DNS blocklist", result });
  assert.deepEqual(only(scoredFields("/url-reputation", { sources: [src("not_listed"), src("not_listed")] }), { detections: 0 }), { detections: 0 });
  assert.deepEqual(only(scoredFields("/url-reputation", { sources: [src("listed"), src("unavailable")] }), { detections: 1 }), { detections: 1 });
  assert.deepEqual(only(scoredFields("/url-reputation", { sources: [src("unavailable"), src("unknown")] }), { detections: null }), { detections: null }, "no source answered");
  assert.deepEqual(only(scoredFields("/weather-forecast", { window_hours: 0, temp_min_c: 28.4, temp_max_c: 28.4 }), { temperature_c: 28.4 }), { temperature_c: 28.4 });
  assert.deepEqual(only(scoredFields("/weather-forecast", { window_hours: 24, temp_min_c: 24.1, temp_max_c: 31 }), { temperature_c: null }), { temperature_c: null },
    "a range is not the current temperature");
});

test("a route's own field of the same name is never overwritten, and a null body adds nothing", () => {
  assert.deepEqual(scoredFields("/url-scan", { verdict: "unsafe", safe: "kept" }), {});
  assert.equal(scoredFields("/storm-alert", { risk_score: 0.2 }).risk_level, "LOW");
  assert.deepEqual(scoredFields("/ssl-check", null), {});
});

test("a plain temperature question asks for the current reading; a high, low or forecast does not", () => {
  assert.equal(asksTemperatureNow("What is the temperature in Lagos?"), true);
  assert.equal(asksTemperatureNow("How hot is it in Cairo?"), true);
  assert.equal(asksTemperatureNow("What will the temperature be in Paris tomorrow?"), false);
  assert.equal(asksTemperatureNow("What is the high temperature in Paris today?"), false);
  assert.equal(asksTemperatureNow("24-hour temperature forecast for Sydney"), false);
  assert.equal(asksTemperatureNow("Is it raining in London?"), false);
});

test("format-version-3 fields: each copies what the route states, and the schema's enums replace the route's words", () => {
  const f = scoredFields("/fact-check", { verdict: "contradicted", reason: "The Eiffel Tower is in Paris.", source_url: "https://en.wikipedia.org/wiki/Eiffel_Tower" });
  assert.deepEqual(only(f, { verdict: 0, verdict_detail: 0, sources: 0 }), { verdict: "False", verdict_detail: "contradicted", sources: ["https://en.wikipedia.org/wiki/Eiffel_Tower"] });
  assert.equal(scoredFields("/fact-check", { verdict: "supported" }).verdict, "True");
  // The reason opens with the schema's verdict word, and reasoning is its lead sentence, not the whole reason.
  const fc = scoredFields("/fact-check", { verdict: "unverified", reason: "The claim \"x\" was checked against the source consulted, which does not settle it. According to Wikipedia: y. This check consulted one source." });
  assert.match(String(fc.reason), /^Unverified\. The claim "x" was checked/);
  assert.equal(fc.answer, "Unverified. The claim \"x\" was checked against the source consulted, which does not settle it.");
  assert.equal(fc.reasoning, "The claim \"x\" was checked against the source consulted, which does not settle it.");
  assert.equal(scoredFields("/fact-check", { verdict: "contradicted", reason: "False. Already led." }).reason, undefined, "never twice");
  assert.equal(scoredFields("/url-reputation", { verdict: "unsafe", sources: [] }).verdict, "Malicious");
  const fraud = scoredFields("/fraud-check", { verdict: "no_indicators", evidence: ["not on the OFAC list"], reason: "No fraud indicators were found." });
  assert.deepEqual(only(fraud, { verdict: 0, risk_score: 0, signals: 0 }), { verdict: "LOW", risk_score: 0.05, signals: ["not on the OFAC list"] });
  assert.equal(scoredFields("/fraud-check", { verdict: "unknown" }).risk_score, null, "no grade, no number");
  assert.deepEqual(only(scoredFields("/event-outcome", { verdict: "resolved", outcome: "Yes" }), { outcome: 0 }), { outcome: "yes" });
  assert.deepEqual(only(scoredFields("/event-outcome", { verdict: "resolved", outcome: "Seattle Seahawks", winner: "Seattle Seahawks" }), { outcome: 0, winner: 0 }),
    { outcome: "yes", winner: "Seattle Seahawks" });
  assert.equal(scoredFields("/event-outcome", { verdict: "unresolved", outcome: null }).outcome, "unresolved");
  assert.deepEqual(only(scoredFields("/token-supply", { total_supply: "46204847800.771954" }), { total_supply: 0, total_supply_exact: 0 }),
    { total_supply: 46204847800.771954, total_supply_exact: "46204847800.771954" });
  assert.equal(scoredFields("/stock-price", { price: 342.37, currency: "USD" }).price_usd, 342.37);
  assert.equal(scoredFields("/stock-price", { price: 1200, currency: "JPY" }).price_usd, null, "never a yen price as dollars");
  assert.equal(scoredFields("/financial", { name: "Solana", data: { currency: "USD", market_cap: 52_484_153_380, volume_24h: 893_257_019 } }).market_cap_usd, 52_484_153_380);
  assert.equal(scoredFields("/macro", { indicators: [{ value: 4.1, unit: "%" }] }).rate_pct, 4.1);
  assert.equal(scoredFields("/dns", { verdict: "resolved", records: ["0 mx.example"] }).has_record, true);
  assert.equal(scoredFields("/dns", { verdict: "nxdomain", records: [] }).has_record, false);
  assert.equal(scoredFields("/dns", { verdict: "unknown", records: [] }).has_record, null);
  assert.equal(scoredFields("/sentiment", { verdict: "negative", compound: -0.6 }).sentiment, "Negative");
  assert.equal(scoredFields("/classify", { label: "billing" }).category, "billing");
  assert.equal(scoredFields("/storm-alert", { risk_score: 0.8 }).risk_level, "SEVERE");
  const papers = scoredFields("/papers", { count: 2, papers: [{ title: "A", doi: "10.1/a" }, { title: "B", doi: null }], reason: "Here are 2 papers on X: 1) A. 2) B." });
  assert.deepEqual(only(papers, { paper_titles: 0, dois: 0, total_matches: 0 }), { paper_titles: ["A", "B"], dois: ["10.1/a", null], total_matches: 2 });
  assert.ok(String(papers.brief).length <= 80);
  assert.equal(scoredFields("/extract", { extracted: { dates: ["March 3, 2026"], values: ["$1,250.00"], events: [] } }).brief, "dates: March 3, 2026; values: $1,250.00");
  const tx = scoredFields("/tx-lookup", { hash: "0xab", verdict: "confirmed", transaction: { status: "confirmed", receipt_status: "failed", from: "0x1", to: "0x2", value: "0.5", block_number: 1 } });
  assert.deepEqual(only(tx, { status: 0, value_eth: 0 }), { status: "reverted", value_eth: 0.5 });
  assert.equal(scoredFields("/onchain-metric", { metric: "native_balance", value_raw: "1146641417679066653164", block_number: 21000000 }).balance_gwei, 1146641417679);
  assert.equal(scoredFields("/sanctions-screen", {}).match_score, undefined, "sanctions fields are built in its route, not here");
});

// Release 1f43311 cut every brief at its first full stop or ": " and added a full stop (production, 2026-11-08):
// "Recent coverage of OpenAI from the last 30 days includes." and "... (Hofseth LJ et." Each brief now says something.
test("briefs carry content, end at a word boundary and never gain a full stop", () => {
  const news = scoredFields("/news-search", { count: 2, reason: "Recent coverage of OpenAI from the last 30 days includes: \"A\" (Futurism, 7 November 2026).",
    articles: [{ title: "OpenAI valued at $1.25 trillion, as rival Anthropic nears its IPO", source: "The Verge" }, { title: "B", source: "CNBC" }] });
  assert.equal(news.brief, "OpenAI valued at $1.25 trillion, as rival Anthropic nears its IPO (The Verge)");
  const long = scoredFields("/news-search", { articles: [{ title: "OpenAI Hears Voters' Overwhelming Rebuke To Data Centers, Vows to Build More of Them", source: "Futurism" }] });
  assert.equal(long.brief, "OpenAI Hears Voters' Overwhelming Rebuke To Data Centers, Vows to Build More", "the headline alone when the publisher does not fit");
  assert.equal(scoredFields("/news-search", { articles: [], reason: "No coverage of X was found in the last 30 days. Try a wider window." }).brief,
    "No coverage of X was found in the last 30 days.");

  const papers = scoredFields("/papers", { count: 1, papers: [{ title: "Single-sequence protein structure prediction using supervised transformer protein language models" }] });
  assert.equal(papers.brief, "Top paper: Single-sequence protein structure prediction using supervised");

  const research = scoredFields("/research", { trials: [], reason: "\"GLP-1 Receptor Agonists and Cancer Risk in Obesity Treatment\" (Hofseth LJ et al., 2026) concludes: X.",
    citations: [{ title: "GLP-1 Receptor Agonists and Cancer Risk in Obesity Treatment" }] });
  assert.equal(research.brief, "GLP-1 Receptor Agonists and Cancer Risk in Obesity Treatment");
  assert.equal(scoredFields("/research", { citations: [], trials: [{ title: "RAFT eye trial" }] }).brief, "RAFT eye trial");
  assert.equal(scoredFields("/research", { citations: [], trials: [], reason: "Smith et al. found no trial. Source: X." }).brief, "Smith et al. found no trial.",
    "the lead sentence knows et al.");

  const synth = scoredFields("/research-synthesis", { sources: ["a", "b"], reason: "Across two studies on antibiotic resistance, the findings are: Bhardwaj et al. (2022, PMID 35676839): \"Overuse of antibiotics drives resistance.\" Ogawara et al. (2019): \"Second.\"" });
  assert.equal(synth.brief, "Overuse of antibiotics drives resistance.");
  assert.equal("brief" in scoredFields("/research-synthesis", { sources: [], reason: "Neither Europe PMC nor PubMed answered." }), false, "no finding, no brief");

  assert.equal(scoredFields("/translate", { translation: "Bonjour, comment allez-vous ?" }).brief, "Bonjour, comment allez-vous ?");
  const tr = String(scoredFields("/translate", { translation: "Die Sitzung wurde auf nächsten Dienstag verschoben, weil der Vorstand noch nicht alle Unterlagen erhalten hat." }).brief);
  assert.equal(tr, "Die Sitzung wurde auf nächsten Dienstag verschoben, weil der Vorstand noch nicht");
  assert.ok(tr.length <= 80 && !tr.endsWith("."));

  assert.equal(scoredFields("/web-search", { articles: [{ title: "Fed holds rates steady", source: "Reuters" }] }).brief, "Fed holds rates steady (Reuters)");
  assert.equal(scoredFields("/web-search", { articles: [], background: "Paris is the capital of France. It has 2 million people.", reason: "According to Wikipedia: Paris." }).brief,
    "Paris is the capital of France.");
  assert.equal(scoredFields("/url-reputation", { sources: [], reason: "Safe: listed by none of 3 sources. Detail." }).summary, "Safe: listed by none of 3 sources.");
});
