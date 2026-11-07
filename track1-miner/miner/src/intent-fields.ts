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
    match_score: r.matches[0]?.score ?? r.closest?.score ?? null,
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
  // WEATHER_CHECK_TEMPERATURE: a current reading has a zero-hour window, and its min and max are that reading
  "/weather-forecast": (b) => ({
    temperature_c: b.window_hours === 0 && num(b.temp_max_c) !== null && b.temp_min_c === b.temp_max_c ? num(b.temp_max_c) : null,
  }),
};

/** The scored fields `path` adds to `body`, leaving any field the route already sets as it is. Pure. */
export function scoredFields(path: string, body: unknown): Body {
  const map = SCORED[path];
  if (!map || body === null || typeof body !== "object" || Array.isArray(body)) return {};
  const b = body as Body;
  return Object.fromEntries(Object.entries(map(b)).filter(([k]) => !(k in b)));
}
