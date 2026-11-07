/**
 * The fields a V2 intent's response format scores, under the intent's own names.
 *
 * Registration 4829 declares no intent_mapping, so the node's parser model has
 * to find each scored value in the answer. SANCTIONS_SCREENING_MATCH_GENERAL
 * scores `matched` and CORPORATE_REGISTRY_LOOKUP_GENERAL scores `active`
 * (GET /engine/v1/intents/<id>, response.fields, read 2026-11-04 UTC); the answers
 * carried `verdict` and `entity_status` instead. Naming the fields exactly
 * removes the guess. REGULATORY_FILING_MONITOR_GENERAL's `filing_count` is
 * built in filings.ts, which holds the whole filing window. Pure.
 */
import { cut, opening } from "./genai";
import type { RegistryResult } from "./registry";
import type { SanctionsResult } from "./sanctions";

export interface SanctionsIntentFields {
  name: string | null;
  /** A near-match on spelling or transliteration is a match on the name; `null` when nothing could be screened. */
  matched: boolean | null;
  lists: string[];
  match_score: number | null;
}

export function sanctionsIntentFields(r: SanctionsResult): SanctionsResult & SanctionsIntentFields {
  const matched = r.verdict === "match" || r.verdict === "possible_match" ? true : r.verdict === "no_match" ? false : null;
  return {
    ...r,
    name: r.subject,
    matched,
    lists: r.lists_checked.map((e) => e.list),
    // The schema's match_score is a number from 0 to 1: a screen that found nothing close is 0, not null.
    match_score: r.matches[0]?.score ?? r.closest?.score ?? (r.verdict === "no_match" ? 0 : null),
  };
}

export interface RegistryIntentFields {
  /** GLEIF's entity status; `null` when no register record was read. */
  active: boolean | null;
  registration_id: string | null;
}

export function registryIntentFields(r: RegistryResult): RegistryResult & RegistryIntentFields {
  return {
    ...r,
    active: r.entity_status ? r.entity_status === "ACTIVE" : null,
    registration_id: r.company_number ?? r.lei ?? null,
  };
}

type Body = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const list = (v: unknown): Body[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Body[]) : []);
/** The answer's opening sentence, at most `n` characters: what a `brief` field asks for. */
const brief = (reason: unknown, n = 80): string | null => (typeof reason === "string" && reason.trim() ? cut(opening(reason), n) : null);
const amount = (v: unknown): number | null => (typeof v === "string" && /^\d+(?:\.\d+)?$/.test(v) ? Number(v) : num(v));

/**
 * Every other route's scored field, by path, under the intent's own name (the same read, 2026-11-05 UTC; the
 * audit is in docs/evidence/scored-fields-2026-11-05/). Each copies a value the route already states under its
 * own name, in the intent's unit, or is `null`: nothing is derived that the route did not say. FRAUD_DETECTION's
 * `risk_score` and FINANCIAL_DATA's `market_cap_usd` are left out: the first has no number behind its verdict,
 * and the second is refused on its licence.
 */
const SCORED: Record<string, (b: Body) => Body> = {
  // SSL_VERIFICATION_CERT
  "/ssl-check": (b) => ({ certificate_valid: typeof b.valid === "boolean" ? b.valid : null }),
  // GAS_PRICE_GENERAL, in gwei
  "/gas-price": (b) => ({ gas_price_gwei: num(b.gwei) }),
  // CURRENCY_EXCHANGE_CONVERT: only when an amount was converted, never a rate standing in for one
  "/convert": (b) => ({ converted_amount: num(b.converted) }),
  // TOKEN_HOLDER_COUNT_GENERAL
  "/token-holders": (b) => ({ holders_count: num(b.holders) }),
  // CRYPTO_PRICE_USD: the price itself when quoted in dollars, else the dollar price a derived quote was built from
  "/crypto-price": (b) => ({ price_usd: b.quote === "USD" ? num(b.price) : num(b.usd_price) }),
  // ONCHAIN_TX_LOOKUP_GENERAL: the block lives inside `transaction`
  "/tx-lookup": (b) => ({ block_number: num((b.transaction as Body | undefined)?.block_number) }),
  // WALLET_BALANCE_CHECK_GENERAL, in whole units: the one token asked for, else the native coin
  "/wallet-balance": (b) => {
    const tokens = Array.isArray(b.token_balances) ? (b.token_balances as Body[]) : [];
    return { balance: tokens.length === 1 ? amount(tokens[0]!.amount) : num(b.balance_eth) };
  },
  // EVENT_OUTCOME_RESOLUTION_GENERAL: a settled Yes or No only; a named winner is not a yes/no
  "/event-outcome": (b) => ({
    resolved_yes: b.verdict === "resolved" ? (b.outcome === "Yes" ? true : b.outcome === "No" ? false : null) : null,
  }),
  // URL_SCAN_VERDICT
  "/url-scan": (b) => ({
    safe: b.verdict === "safe" ? true : b.verdict === "unsafe" || b.verdict === "suspicious" ? false : null,
  }),
  // URL_SAFE_GENERAL: how many of the threat sources that answered list the URL
  "/url-reputation": (b) => {
    const sources = Array.isArray(b.sources) ? (b.sources as Body[]) : [];
    const answered = sources.filter((s) => s.result === "listed" || s.result === "not_listed");
    return { detections: answered.length ? answered.filter((s) => s.result === "listed").length : null };
  },
  // WEATHER_CHECK_TEMPERATURE: a current reading has a zero-hour window, and its min and max are that reading.
  // WEATHER_FORECAST_GENERAL: the window and the peak chance of rain under its own names.
  "/weather-forecast": (b) => ({
    temperature_c: b.window_hours === 0 && num(b.temp_max_c) !== null && b.temp_min_c === b.temp_max_c ? num(b.temp_max_c) : null,
    when: typeof b.start_time === "string" && typeof b.end_time === "string" ? `${b.start_time} to ${b.end_time}` : null,
    precipitation_probability_pct: num(b.precipitation_probability_max_pct),
  }),

  // Format version 3 (GET /engine/v1/intents/<id>, re-read 2026-11-07 UTC; tools/schema-sweep.mjs): 22 intents
  // scored a field the answer did not carry under that name. Each below copies a value the route already states.
  // ACADEMIC_SEARCH_GENERAL
  "/papers": (b) => {
    const papers = list(b.papers);
    return { paper_titles: papers.map((p) => p.title).filter(Boolean), dois: papers.map((p) => p.doi ?? null),
      total_matches: num(b.count), brief: brief(b.reason) };
  },
  // LANGUAGE_TRANSLATION_GENERAL: the translation itself when it fits
  "/translate": (b) => ({ brief: typeof b.translation === "string" ? cut(b.translation) : null }),
  // CONTENT_EXTRACTION_GENERAL: the values asked for as name: value pairs, and every value as an entity
  "/extract": (b) => {
    const ex = b.extracted && typeof b.extracted === "object" && !Array.isArray(b.extracted) ? (b.extracted as Record<string, unknown>) : {};
    const pairs = Object.entries(ex).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => `${k}: ${(v as unknown[]).join(", ")}`);
    return { entities: Object.values(ex).flatMap((v) => (Array.isArray(v) ? v : [])), brief: pairs.length ? cut(pairs.join("; ")) : brief(b.reason) };
  },
  // NEWS_HEADLINES_GENERAL
  "/headlines": (b) => ({ top_headline: (list(b.headlines)[0]?.title as string | undefined) ?? null }),
  // NEWS_SEARCH_GENERAL
  "/news-search": (b) => {
    const a = list(b.articles);
    return { result_count: num(b.count) ?? a.length, sources: a.map((x) => x.url ?? x.source).filter(Boolean), brief: brief(b.reason) };
  },
  // FINANCIAL_DATA_GENERAL: a coin's or token's dollar figures as the route read them
  "/financial": (b) => {
    const d = (b.data ?? {}) as Body;
    const usd = !d.currency || d.currency === "USD";
    return { asset: b.name ?? d.name ?? null, market_cap_usd: usd ? num(d.market_cap) : null,
      volume_24h_usd: usd ? num(d.volume_24h) : null, as_of: typeof d.observed_at === "string" ? d.observed_at : null };
  },
  // RESEARCH_QUERY_GENERAL
  "/research": (b) => {
    const c = list(b.citations);
    return { source_count: c.length, sources: c.map((x) => x.url ?? x.title).filter(Boolean), brief: brief(b.reason) };
  },
  // STOCK_PRICE_US_EQUITY: a dollar quote only
  "/stock-price": (b) => ({ price_usd: b.currency === "USD" ? num(b.price) : null }),
  // WEB_SEARCH_GENERAL
  "/web-search": (b) => ({ sources: list(b.articles).map((x) => x.url ?? x.source).filter(Boolean), brief: brief(b.reason) }),
  // SENTIMENT_ANALYSIS_GENERAL: the label in the schema's case, and the compound score (-1 to 1)
  "/sentiment": (b) => ({
    sentiment: typeof b.verdict === "string" && /^(positive|negative|neutral|mixed)$/.test(b.verdict) ? b.verdict[0]!.toUpperCase() + b.verdict.slice(1) : null,
    score: num(b.compound),
  }),
  // TEXT_CLASSIFICATION_GENERAL
  "/classify": (b) => ({ category: typeof b.label === "string" ? b.label : null }),
  // RESEARCH_SYNTHESIS_GENERAL
  "/research-synthesis": (b) => ({ source_count: Array.isArray(b.sources) ? b.sources.length : null, brief: brief(b.reason) }),
  // FACT_CHECK_GENERAL
  "/fact-check": (b) => ({ reasoning: typeof b.reason === "string" ? b.reason : null, sources: typeof b.source_url === "string" ? [b.source_url] : [] }),
  // MACRO_ECONOMIC_INDICATOR_GENERAL: the first percentage reported
  "/macro": (b) => ({ rate_pct: num(list(b.indicators).find((i) => i.unit === "%")?.value) }),
  // DNS_RECORD_LOOKUP_GENERAL: at least one record, or none (NXDOMAIN or an empty answer); null when unread
  "/dns": (b) => ({ has_record: Array.isArray(b.records) && b.verdict !== "unknown" ? b.records.length > 0 : null }),
  // ONCHAIN_METRIC_VERIFY_GENERAL scores a native balance in gwei
  "/onchain-metric": (b) => b.metric === "native_balance" && typeof b.value_raw === "string" && /^\d+$/.test(b.value_raw)
    ? { balance_gwei: Number(BigInt(b.value_raw) / 1_000_000_000n), block: b.block_number === null ? null : String(b.block_number) }
    : {},
  // STORM_ALERT_GENERAL. risk_level is a stated rule on risk_score, the only derived value here: under 0.25 LOW,
  // under 0.5 MODERATE, under 0.75 HIGH, else SEVERE.
  "/storm-alert": (b) => {
    const r = num(b.risk_score);
    return { risk_level: r === null ? null : r < 0.25 ? "LOW" : r < 0.5 ? "MODERATE" : r < 0.75 ? "HIGH" : "SEVERE",
      risk_level_rule: "risk_score under 0.25 LOW, under 0.5 MODERATE, under 0.75 HIGH, else SEVERE",
      peak_gust_kmh: num(b.max_wind_gust_kmh), window: num(b.window_hours) === null ? null : `${b.window_hours} hours` };
  },
};

/** Fields added alongside an existing route's own map. */
const MORE: Record<string, (b: Body) => Body> = {
  // The one token asked for, else the chain's coin: the symbol of the balance the scored field carries
  "/wallet-balance": (b) => {
    const tokens = Array.isArray(b.token_balances) ? (b.token_balances as Body[]) : [];
    const sym = tokens.length === 1 ? tokens[0]!.symbol : b.symbol;
    return { token_symbol: typeof sym === "string" ? sym : null };
  },
  "/token-holders": (b) => ({ token: b.address ?? b.name ?? null, token_symbol: b.symbol ?? null }),
  "/tx-lookup": (b) => {
    const t = (b.transaction ?? {}) as Body;
    const status = b.verdict === "not_found" ? "not_found" : b.verdict === "pending" ? "pending"
      : t.receipt_status === "failed" || t.status === "failed" ? "reverted" : b.verdict === "confirmed" ? "confirmed" : null;
    return { tx_hash: b.hash ?? null, status, from: t.from ?? null, to: t.to ?? null,
      value_eth: typeof t.value === "string" && /^\d+(?:\.\d+)?$/.test(t.value) ? Number(t.value) : null };
  },
  "/event-outcome": (b) => ({ sources: typeof b.source === "string" ? [b.source] : [] }),
  "/url-reputation": (b) => ({ summary: brief(b.reason, 400) }),
  "/fraud-check": (b) => ({ signals: Array.isArray(b.evidence) ? b.evidence : [], summary: brief(b.reason, 400) }),
};

/**
 * Where the schema contradicts a field the route already sets, by value or by type. The route's own word is kept
 * under `verdict_detail` (or `total_supply_exact`), so nothing it said is lost.
 */
const OVERRIDE: Record<string, (b: Body) => Body> = {
  // FACT_CHECK_GENERAL: True | Mostly True | Mixed | Misleading | Mostly False | False | Unverified
  "/fact-check": (b) => mapped(b, { supported: "True", contradicted: "False", unverified: "Unverified", unknown: "Unverified" }),
  // URL_SAFE_GENERAL: Safe | Suspicious | Malicious | Unknown
  "/url-reputation": (b) => mapped(b, { safe: "Safe", suspicious: "Suspicious", unsafe: "Malicious", unknown: "Unknown" }),
  // FRAUD_DETECTION_GENERAL: the grade, and risk_score as that grade's stated midpoint, not a calibrated probability
  "/fraud-check": (b) => {
    const grade: Record<string, [string, number | null]> = { high_risk: ["HIGH", 0.85], elevated_risk: ["ELEVATED", 0.5],
      low_risk: ["LOW", 0.15], no_indicators: ["LOW", 0.05], insufficient_evidence: ["INCONCLUSIVE", null], unknown: ["INCONCLUSIVE", null] };
    const g = typeof b.verdict === "string" ? grade[b.verdict] : undefined;
    return g ? { verdict: g[0], verdict_detail: b.verdict, risk_score: g[1], risk_score_basis: "the grade's stated midpoint, not a calibrated probability" } : {};
  },
  // EVENT_OUTCOME_RESOLUTION_GENERAL: yes | no | unresolved; a named winner stays in `winner`
  "/event-outcome": (b) => ({
    outcome: b.verdict === "resolved" ? (b.outcome === "No" ? "no" : "yes") : "unresolved",
    // Kept in step with outcome: a resolved event with a named winner happened, so it resolved YES (2026-11-07).
    resolved_yes: b.verdict === "resolved" ? b.outcome !== "No" : null,
    ...(typeof b.outcome === "string" && !/^(?:Yes|No)$/.test(b.outcome) ? { winner: b.winner ?? b.outcome } : {}),
  }),
  // TOKEN_TOTAL_SUPPLY_VERIFY_GENERAL: a number in whole tokens; the exact decimal string is kept beside it
  "/token-supply": (b) => (typeof b.total_supply === "string" && /^\d+(?:\.\d+)?$/.test(b.total_supply)
    ? { total_supply: Number(b.total_supply), total_supply_exact: b.total_supply } : {}),
};

function mapped(b: Body, to: Record<string, string>): Body {
  const v = typeof b.verdict === "string" ? to[b.verdict] : undefined;
  return v ? { verdict: v, verdict_detail: b.verdict } : {};
}

/**
 * The scored fields `path` adds to `body`, leaving any field the route already sets as it is, and then the
 * overrides where the schema contradicts one. Pure.
 */
export function scoredFields(path: string, body: unknown): Body {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return {};
  const b = body as Body;
  const add = { ...(SCORED[path]?.(b) ?? {}), ...(MORE[path]?.(b) ?? {}) };
  return { ...Object.fromEntries(Object.entries(add).filter(([k]) => !(k in b))), ...(OVERRIDE[path]?.(b) ?? {}) };
}
