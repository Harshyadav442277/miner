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
