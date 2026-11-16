# Comparator / truth-source docs research, 2026-11-16 (read-only; plain GETs)
Docs base: https://anjoman.ai/docs ; node: https://devnode.telegraphprotocol.com . Pages read: scoring/build-a-scoring-module (BSM),
scoring/contribute-evaluation-data (CED), using/intents (INT), bounties/evaluation-material, hackathon /rules (Evaluators tab, via browser pane).
Inference is marked INFERENCE; everything else is quoted.

## Q1. Comparator evaluation before promotion; "public material"; family vs intent id
- Docs describe two different checks, and they do not agree.
  - BSM "When it is called": "For a comparator the node asks 100 cases out of its correctness battery (two batch requests)." and
    "Stage 2 for comparator modules": "The node runs your module on about 1,260 test cases: the intent's own comparison code and tolerance ... On every case
    your score must be within +-10 basis points". Nothing here uses pool pairs or truth_source rows.
  - BSM (remote-executor section): "If the intent has no public evaluation material yet, there is nothing to check your endpoint against: the registration
    stays pending (awaiting_compatible_material) and is re-evaluated when a snapshot is published." It does not say what "public material" is for a comparator.
    For adapters: "re-scores the same public pairs" (preference pairs). Truth_source rows are "Truth sources in this half are not used" for testing (CED).
  - So the docs state that a comparator waits on a published snapshot, but never say which rows, or under which id, the lookup reads. Not stated.
- Id evidence (node):
  - GET /api/wasm: comparator entries are grouped under the FAMILY id (e.g. key CORPORATE_REGISTRY_LOOKUP, entry intent_id "CORPORATE_REGISTRY_LOOKUP",
    registration 274 = ours). eval.reason: "awaiting_compatible_material: no public material to ask CORPORATE_REGISTRY_LOOKUP's runnable URL about yet:
    eval-pool: no published snapshot" (family id in the message).
  - GET /api/evalpool/status?intent_id=CORPORATE_REGISTRY_LOOKUP_GENERAL: "eligible":982, 6 submitters, snapshot published_at 2026-11-14T03:45:02Z,
    activation_epoch 2087, current_epoch 2107, min_submitters 5. intent_id=CORPORATE_REGISTRY_LOOKUP: "snapshot":null, "counts":[].
  - Scan of all 31 families with a pending comparator: family id -> snapshot null for 30 (1 request error: PACKAGE_STATUS); the _GENERAL id has
    rows for 29 (e.g. GAS_PRICE_GENERAL 159, ONCHAIN_TX_LOOKUP_GENERAL 898); CVE_LOOKUP_GENERAL and PACKAGE_STATUS_GENERAL have none.
  - /engine/v1/intents/CORPORATE_REGISTRY_LOOKUP_GENERAL: "class":"deterministic", served_by CORPORATE_REGISTRY_LOOKUP_GENERAL.
- Docs on which id is the pool key: CED example uses "intent_id":"CODE_REVIEW_GENERAL" in /submissions/mine, and "one intent per upload". Pool is per intent id.
  BSM: "A module belongs to a family". Docs never say which id the comparator's snapshot lookup uses.
- Verdict: docs do not explain it. The node data shows the lookup uses the family id while material is stored under the _GENERAL intent id.
  INFERENCE: platform mismatch (family-id lookup vs intent-id pool), not caused by our modules. Consistent with ~40 comparators waiting since 11-16.
  Caveat: the BSM warning "Most deterministic intents sit under a judgment family ... A comparator sent to such a family is never rejected and never goes live;
  it waits at pending for ever" is a second possible explanation; I did not verify the class of each family (the /api/wasm?intent=..&resolve=.. call returned the list, not a resolve object).

## Q2. Several candidates passing in one round, family with no champion
- Quoted rule is for MODEL ADAPTERS only (BSM, "Stage 2 for model adapters"): "The intent has no module yet | The best candidate that reaches 70% (and the
  per-child floor) becomes the first canonical module." and "Ties | Higher win rate first, then more scored pairs, then the lower registration ID."
  "Every pending candidate for the intent and the current module are scored on exactly the same sample (30 pairs per round)." "Every other candidate in the round is rejected".
  => first canonical = highest win rate on the shared sample, not earliest registration; earliest (lower registration ID) is only the third tie-break.
- Comparators: "A module that passes becomes the intent's comparator, replacing the previous one." (BSM Stage 2 comparators). "A comparator module is then usually
  decided within minutes." No ordering among several passing comparators, no tie rule, no score ranking (comparators score a correctness gate, not a competition). Not stated.
  INFERENCE: pass/fail gate, so the first to be evaluated and pass likely wins and later ones "replace" it; unverified.
- Live evidence: /api/wasm shows states active/first_canonical (4), active/won (13), superseded/first_canonical (15): first_canonical does occur, but
  the docs give no per-comparator order rule.

## Q3. Truth sources
- Definition (CED, "Truth sources (deterministic intents)"): "A truth source describes one public API that answers the intent's question, written in the same
  format as a miner YAML. The node checks it against the same schema, with the same loader, that miner YAMLs use". "A truth source is evaluation material,
  not a miner. Uploading one registers nothing on-chain. It is never routed traffic, never ranked and never paid as a miner."
- Format: JSONL row {"label_kind":"truth_source","source":"<YAML or JSON text as a JSON string, or the document as an object>"}; "The row has no prompt, chosen or rejected."
  Uploaded to the same signed endpoint "under the intent it answers"; one row per intent ("A source that serves several intents is uploaded once per intent").
- Required: valid miner YAML (version, kind: miner, id, slug, name, base_url, endpoints...); "At least one endpoint must list the intent (or "*") in intents";
  "id and slug ... are only labels here"; "The API must need no key: auth.type: none."
- Rejections: source_unparseable, source_no_endpoint, source_url_rejected (non-https/private hosts), source_auth_unsupported, source_too_large ("Over 32 KB, or more than 32 endpoints"),
  duplicate_case (same endpoints+params), rate_limited.
- Making an intent rankable: "Picks up to 3 truth sources from the ranking half of the intent's active snapshot ... Calls each one ... Takes the median of the values it could read
  ... That median is the reference every miner's answer is checked against". "A new deterministic intent needs no code. Once the intent has its scoring settings on the node ...
  and at least one truth source in an active snapshot, it is scored." "Truth sources have no such minimum: one is enough" (the 5-contributor minimum applies to questions).
  Timing: "a source uploaded during epoch N is first called in epoch N+1."
- No truth source: CED: "If an intent has no truth source in the ranking half of its active snapshot, or every source picked for a question fails, that question gets no reference. An intent
  with no reference for any question is not ranked that epoch: its miners keep their previous ranking and are not penalised." INT: "The same is true of a deterministic or hybrid intent with no truth source in the evaluation pool."
  Implication for miners (quoted): they "keep their previous ranking and are not penalised"; i.e. no new ranking movement, so no demand/rank change from quality. Whether routing falls back to the old ranking is not stated.
- Which intents lack one: NOT answerable from public endpoints. /api/evalpool/status returns counts by state (eligible/quarantine) and rows, never label_kind; CED: "Rows are never shown back.
  The endpoints on this page return counts, states and row identities, never row content." Intents with no pool at all (so certainly no truth source): CVE_LOOKUP_GENERAL, PACKAGE_STATUS_GENERAL, FX_NOW_GENERAL
  (status: snapshot null, counts []). Note the docs' own example uses FX_NOW. Pools of other _GENERAL intents may hold only preference pairs; unknown.

## Q4. Material-only entries, credit and verification
- CED: "Each upload is signed, and every row is credited to the address that signed it." Use record: for truth sources "the node records the use ... the epoch, the intent, your source and your address.
  Only sources whose answer counted toward the median are recorded." "There is no public endpoint for this record." Row states/provenance: submissions/mine shows status and provenance_class
  ("attested", "unverified"); content never returned.
- Verification of material: quality checks on rows (reason codes, quality_rules_version evalpool-quality-v1); bounties/evaluation-material: "Synthetic examples and passing local checks alone do not establish
  semantic correctness." "The protocol separately decides whether material is admitted, whether an evaluator is canonical, and whether a provider is eligible for ranking."
- Rules (https://hackathon.telegraphprotocol.com/rules, Evaluators tab): Track 03 is "An evaluation adapter, evaluation material, or both"; "Submit an adapter, evaluation material, or both, with a sound,
  repeatable way to measure quality"; "show credible new tests and reference quality"; "Don't claim Canonical status, a finalized ranking change, or paid material use without network evidence. Useful evaluation work
  can qualify even before live activation." Scoring: 40 Measurement validity, quality discrimination, baseline evidence (min 28); 15 Integrity and robustness; 10 Reproducibility and protocol compatibility;
  10 Useful evaluation coverage and demonstrated improvement; 5 Documentation; 20 organic growth. Ties: "proven measurement improvement or valuable new coverage, then the validity score."
  Reviewers connect "Evaluator and material version, tests, and any finalized ranking."
- Not stated: any payout or score for material rows by count; how a judge verifies that a given signer's rows were used (use record has no public endpoint).
