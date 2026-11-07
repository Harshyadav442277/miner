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
test("each route names its intent's scored field, from a value it already states", () => {
  assert.deepEqual(scoredFields("/ssl-check", { valid: true }), { certificate_valid: true });
  assert.deepEqual(scoredFields("/ssl-check", { verdict: "unknown" }), { certificate_valid: null });
  assert.deepEqual(scoredFields("/gas-price", { gwei: 0.240449294 }), { gas_price_gwei: 0.240449294 });
  assert.deepEqual(scoredFields("/convert", { rate: 88.2, converted: null }), { converted_amount: null }, "a rate is not a converted amount");
  assert.deepEqual(scoredFields("/convert", { converted: 8820.5 }), { converted_amount: 8820.5 });
  assert.deepEqual(scoredFields("/token-holders", { holders: 9_561_593 }), { holders_count: 9_561_593 });
  assert.deepEqual(scoredFields("/crypto-price", { price: 2240.56, quote: "USD" }), { price_usd: 2240.56 });
  assert.deepEqual(scoredFields("/crypto-price", { price: 1910.1, quote: "EUR", usd_price: 2240.56 }), { price_usd: 2240.56 });
  assert.deepEqual(scoredFields("/tx-lookup", { transaction: { block_number: 46147 } }), { block_number: 46147 });
  assert.deepEqual(scoredFields("/tx-lookup", { verdict: "contract_activity" }), { block_number: null });
  assert.deepEqual(scoredFields("/wallet-balance", { balance_eth: 5.78044104 }), { balance: 5.78044104 });
  assert.deepEqual(scoredFields("/wallet-balance", { balance_eth: null, token_balances: [{ symbol: "USDC", contract: "0xa0", amount: "39.192124" }] }),
    { balance: 39.192124 }, "the one token asked for, in whole units");
  assert.deepEqual(scoredFields("/event-outcome", { verdict: "resolved", outcome: "Yes" }), { resolved_yes: true });
  assert.deepEqual(scoredFields("/event-outcome", { verdict: "resolved", outcome: "No" }), { resolved_yes: false });
  assert.deepEqual(scoredFields("/event-outcome", { verdict: "resolved", outcome: "Arsenal" }), { resolved_yes: null });
  assert.deepEqual(scoredFields("/event-outcome", { verdict: "open", outcome: null }), { resolved_yes: null });
  assert.deepEqual(scoredFields("/url-scan", { verdict: "safe" }), { safe: true });
  assert.deepEqual(scoredFields("/url-scan", { verdict: "suspicious" }), { safe: false });
  assert.deepEqual(scoredFields("/url-scan", { verdict: "unreachable" }), { safe: null });
  const src = (result: string) => ({ source: "s", kind: "DNS blocklist", result });
  assert.deepEqual(scoredFields("/url-reputation", { sources: [src("not_listed"), src("not_listed")] }), { detections: 0 });
  assert.deepEqual(scoredFields("/url-reputation", { sources: [src("listed"), src("unavailable")] }), { detections: 1 });
  assert.deepEqual(scoredFields("/url-reputation", { sources: [src("unavailable"), src("unknown")] }), { detections: null }, "no source answered");
  assert.deepEqual(scoredFields("/weather-forecast", { window_hours: 0, temp_min_c: 28.4, temp_max_c: 28.4 }), { temperature_c: 28.4 });
  assert.deepEqual(scoredFields("/weather-forecast", { window_hours: 24, temp_min_c: 24.1, temp_max_c: 31 }), { temperature_c: null },
    "a range is not the current temperature");
});

test("a route's own field of the same name is never overwritten, and unknown paths add nothing", () => {
  assert.deepEqual(scoredFields("/url-scan", { verdict: "unsafe", safe: "kept" }), {});
  assert.deepEqual(scoredFields("/storm-alert", { risk_score: 0.2 }), {});
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
