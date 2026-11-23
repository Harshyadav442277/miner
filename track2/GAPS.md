# GAPS — Track 2 honesty ledger

The Season I gaps (G13–G27: rank_answer corpora, calibration thresholds, registration 1882) were cut on 2026-10-29.
The modules they describe are retired: they were deleted from the tree, and the V2 registry no longer lists 1882.
They are in `git log -p -- track2/GAPS.md`.

## G54 — what the pools hold (from contributors' public comments), and the new Diamond (2026-11-23) — `OPEN`

- **Pool contents.** These come from the contributors' own descriptions on `telegraphprotocol/bounties`, read
  2026-11-23. The rows themselves are not public, and none is used.
  - **#166, CONTENT_MODERATION:** zkasuran uploaded 120 rows. Each asks whether "an exact supplied discussion comment
    is Safe or Flagged under a stated discussion-toxicity policy", labelled from unanimous Wikipedia Talk annotations.
    Other contributors uploaded 20 and 5 rows.
  - **#146, TEXT_SUMMARIZATION:** zkasuran uploaded about 187 rows: short 118th-Congress bills, plus two-sentence
    summaries of 2024 NASA press releases. Another contributor uploaded 11 Wikipedia and LLM-drafted rows.
  - **CONTRACT_OBLIGATION_AUDIT:** no description has been found yet.
  - cm_v2 follows the moderation form. ts_v1 is synthetic; a real-genre check (117th-Congress bills, NASA releases,
    both public domain) is still owed.
- **New Diamond (docs `/protocol/addresses-and-params`, updated 2026-11-19):** `0x72a70e949362670Bf8bceAd24eFC5b8f950aa08b`
  replaces `0x3624…b99b` from 2026-11-17.
  - Bonds are paid in test USDC `0xcc194e1a…Ae17`; `machinaToken()` is zero.
  - `entityBonds()` = 0.1 / 1.0 / 0.1 USDC.
  - The wallet holds 1.316 Sepolia ETH and 72.57 test USDC (`cast`, 2026-11-23).
  - The repo CLAUDE.md commands still name the old Diamond: update before using them.
- **Unknown:** whether a rejected adapter's bond is returned on the new Diamond.

## G53 — registry state 2026-11-23 and the unknowns behind the final plan — `OPEN`

Read 2026-11-23 10:27 UTC, epoch 43: `/api/wasm` (66 families, 215 registrations) and `/api/evalpool/status` per family.
Raw files are in the session scratchpad, not committed. The plan is [PLAN_2026-11-23.md](PLAN_2026-11-23.md).

- **Ours:** 12 registrations, 0 active.
  - #139–#144 scored 1 and were superseded by `0xb3fb…` #145–#150.
  - #42–#46 were rejected: the runnable answered 422, "expected integer ground_truth_value, miner_value and spec".
  - #47 FINANCIAL_DATA was deregistered with score 0.
- **Pools need 3 submitters now** (`min_submitters: 3`; it was 5).
- **Inferred, not verified:** the 422s are a module-kind mismatch, not our parser. Every author's comparator in those
  families fails the same way, and adapters in LIQUIDITY_DEPTH_VERIFY and MINING_HASHPRICE_VERIFY are checked on
  "chosen" text pairs. The `livecert-comparator` logs from 2026-11-17 were not read; they are likely past Vercel's
  retention. Kill this if a log or the docs show integer pairs.
- **Unknown:** whether a rejected adapter's bond returns, and after how long (the registry shows `bond_amount: 0`).
- **Unknown:** whether the runnable must stay up after promotion.
- **Unknown:** whether TEXT_SUMMARIZATION can be evaluated: zkasuran #208 has been `awaiting_compatible_material` since
  06:44 UTC.
- **Unknown:** whether CUAD and the chosen moderation and patch datasets are licence-clean for training.

## G52 — post-reset pilots: VENDOR_VERIFY and CONTRACT_OBLIGATION_AUDIT split right/wrong by service (2026-11-18) — CLOSED

Pilots frozen before capture (`475230b`, `fdd66a0`); captures `tg-eval/captures/vendor-pilot-20261118`, `contract-pilot-20261118`.
Chosen because the prompt or a primary source carries the truth (EU VIES for VAT validity; the contract text itself).

- **CONTRACT_OBLIGATION_AUDIT** (9 miners): 3 services audit the given contract (a1-preflight, txlens, zk-contract-spans, the
  former champion author's) and extracted the obligations correctly on all 3 queries. 5 return unrelated government data
  (USAspending, Federal Register, Crossref, Chicago POs); factwire declares no endpoint.
- **VENDOR_VERIFY** (17 miners): a1-preflight and praman-compliance answer valid/valid/invalid, and txlens answers in prose.
  Three VIES wrappers on one proxy host return a fixed id (DE811569869, `id_valid` 1) whatever is asked, and one more
  answers 502. Nine sanctions or registry feeds answer a different question (the schema says `valid` is not sanctions).
- **Both:** right answers come from 2–3 services and wrong ones from fixed-behaviour services, so identity predicts the label
  (the G44–G48 cause). No full capture, no training. CONTENT_MODERATION has 0 miners (no real answers exist), and
  PRODUCT_AUTHENTICITY has no primary source for `authentic`.
- Reopen if a fresh pilot shows wrong answers from four or more services that do answer the question.

## G51 — the devnode registry was reset on 2026-11-17 (observed 07:22 UTC) — `OPEN`

- `/api/epoch`: `current_epoch` 0, 3 h epochs (2107 on Nov 16). `/api/wasm`: `{"count":0,"intents":{}}`. `/api/miners`: 1,283 then
  1,296 entries, all registered 07:23 UTC (2,173 on Nov 16). `/api/miners/4433` is now `verifywire-fx-now` (LiveCert's id until then).
  Eval pools kept their rows (EMAIL_SECURITY_GENERAL 651 eligible); our 144 LANGUAGE_TRANSLATION rows are still eligible.
- **Registry back on 2026-11-18 (read 09:16 UTC, epoch 8):** 102 entries, new ids. Our six comparators are #42–#47,
  pending with the same family-id snapshot reason as G49. FX_NOW, CRYPTO_PRICE and WEATHER_CHECK went canonical to
  #82/#80/#85 (`0xb3fb…`, registered 2026-11-17 20:04); re-registering ours gave "duplicate wasm" (the files are
  still on chain). Runtime pins unchanged (foundation 0a49b325, engine 77643d6e, tokenizer 67bc76f8).
- **Former judgment champions failed the 70% floor after the reset**, with new files and new corpus versions:
  VULNERABILITY_TRIAGE #88 55.2% (29 pairs), CONTRACT_OBLIGATION_AUDIT #92 65.5% (29), EMAIL_SECURITY #95 60.7% (28).
  #1–#3 (`0x3035…`: EVENT_OUTCOME, PRODUCT_AUTHENTICITY, VENDOR_VERIFY), #57, #62, #94, #99 are rejected with no score
  or reason. Nine judgment families have no champion and ≥ 6 submitters, plus CONTENT_MODERATION and WEB_SEARCH at 5.
  Snapshot: `tg-eval/champions/registry/wasm-20261118T091613Z.json` (sha256 b993a9e9…), `intent-detail-20261118.json`.
- Every registry fact in G40–G50 (ids, champions, epochs, pending comparators) is as of 2026-11-16.
- Not known: whether this is a migration, whether earlier registrations are restored or must be redone, whether ids
  change for good, and whether pre-reset rankings count. Asked in [material/ORGANISER_REPORT.md](material/ORGANISER_REPORT.md) §1 (not sent).

## G46 — EMAIL_SECURITY lane stopped before training: 65 pairs, identity probe 0.954 (2026-11-16) — CLOSED

Evidence: [adapter/email_security/](adapter/email_security/README.md) (rules fixed at `77ed687`, queries frozen at
`2fde3cd`, `evidence/2026-11-16/`); capture `C:/Users/hyada/tg-eval/captures/es-20261116`.

- 300 frozen queries, truth from NextDNS + DNS.SB before and after the capture (all 300 stable). 2,700 responses from 9
  services (2,716 requests with retries): 1,834 right, 69 wrong, 197 call failures, 600 off-query (chainsight, txlens).
- Wrong answers: 61 of 69 from telegraph-verity-intelligence, which reports NXDOMAIN as `lookup_ok: true`. 65 gated pairs
  (bar 100), identity probe 0.954 (bar 0.65), length 0.508. Rule 6 stops the lane; no training data, no training.
- Report-only on the 65 pairs: champion #315 73.8% / 67.7% and GENERIC 67.7% / 90.8% (question+JSON / bare-JSON
  rendering). Not evidence of quality either way (one rejected service), but the rendering swing is real (G43).
- Useful for the miner side and for judges: verity's NXDOMAIN-as-success is a real, repeatable `lookup_ok` error.
- Reopen only if more than two services start making `lookup_ok` errors, or if real pool pairs become readable.

## G44 — WEATHER_FORECAST_VERIFY lane stopped at checkpoint B (2026-11-16) — CLOSED

Evidence: `track2/adapter/weather_forecast_verify/` (README, CHECKPOINT.md, `holdout/queries.freeze.json`, `holdout/holdout.audit.json`);
captures `C:/Users/hyada/tg-eval/captures/weather-20261116-*`; branch `claude/weather-forecast-verify-lane`. Not pushed.

- Result: no clean real-answer holdout. 56 gated pairs from 678 queries (bar 100); service-identity probe 0.696 and answer-shape probe
  0.786 against 0.65. 122 of 133 wrong verdicts come from a1-preflight, txlens and chainsight-oracle; the other services are right on
  54 to 61% of queries and mostly agree within the right band; 38% of answers fall in the dropped 1.5 to 3.0 degC band.
- Not done by decision: champion and GENERIC measurement, training data, training, compare and gate. No adapter, nothing registered,
  no GPU time used.
- Limits: nearest station within 25 km with no observation-time correction; possible transient geocoder or ERA5 drops; prompt
  rendering assumed; champion accuracy on this family unknown.
- Reopen only if the miners that return wrong values change (a1-preflight, txlens and chainsight-oracle stop being the only source
  of wrong answers, or more independent services answer location and date), or if real pool pairs become readable. Then re-run the
  pilot first.

## G45 — VULNERABILITY_TRIAGE lane stopped at checkpoint B (2026-11-16) — CLOSED

Evidence: `track2/adapter/vulnerability_triage/` (README, CHECKPOINT.md, `holdout/queries.freeze.json`); pilot capture
`C:/Users/hyada/tg-eval/captures/vuln-pilot-20261116/`; branch `claude/vulnerability-triage-lane`, commits `d1412e9`
(queries frozen) and `517803a` (pilot record). Not pushed.

- Result: no clean, real-answer holdout exists for this family. On CNA != NVD queries only zk-cve-triage (champion
  author `0x8b224783…`) is right and 12 miners return the CNA score, so identity predicts the label (about 1.0 vs the 0.65
  bar); on CNA = NVD queries wrong answers come only from epss and chainsight. Constructed same-template pairs would be
  answers we wrote (A7 point 1), so none were built.
- Not done by decision: full capture, champion/GENERIC measurement, training data, training, compare and gate. No adapter,
  nothing registered, no GPU time used.
- Limits: a 3-query pilot (single observations per service); identity and length bars estimated, not measured; prompt
  rendering is an assumption; champion accuracy on this family unknown.
- Reopen only if a service other than zk-cve-triage starts returning the NVD primary score, or if real pool pairs become
  readable. Then rerun the pilot first.

## G43 — EMAIL_SECURITY lane: how pool rows render a request is unknown (2026-11-15) — `OPEN`

The pool's 651 rows are not public, so our holdout's prompt rendering is a guess. The gated rows put the plain
question and the request JSON together; a report-only copy uses the bare JSON
([adapter/email_security/](adapter/email_security/README.md) rule 8). If the champion lands near chance on our
holdout, or swings between the two renderings, suspect the rendering before calling the champion weak. Also open:
the holdout's answers come from each miner's public service called as its YAML declares, not from the paid
engine route, which may phrase or map the request differently.

## G50 — DNS_RECORD_LOOKUP_GENERAL is unranked since epoch 2019 (2026-11-05); cause unknown (2026-11-16) — `OPEN`

Evidence: `/api/miners` scores read 2026-11-16 ~18:00 UTC; 25 of 27 `ready` deterministic intents were scored at epochs
2105–2107. DNS_RECORD_LOOKUP_GENERAL's last scores are at epoch 2019 (about 11 days ago at ~3 h per epoch), and
VALIDATOR_PERFORMANCE_VERIFY_GENERAL's at 2032. The docs say an intent with no reference for any question "is not
ranked that epoch: its miners keep their previous ranking" ([research/](research/docs-comparator-truth-2026-11-16.md)).

- The epoch-2019 DNS table: the proxy-hosted resolver wrappers (omni-chat host) and the Cloudflare wrappers scored 0,
  while the direct dns.google wrappers scored 0.90–0.93 and doh.pub 0.90. That may be call failures (the Cloudflare
  path answers 400 without an accept header) rather than a reference error. Corrected 2026-11-17 after the Fable review.
- Not known:
  - whether the pool holds a truth source at all (rows are never shown back);
  - whether a single uploaded row can land in the ranking half (`ranking_split_bps` 5000);
  - how the node locates `has_record` in a source's response (the only existing DNS wrappers are a third party's
    `/truth/dns-has`).
- **Related party: our `livecert` serves DNS_RECORD_LOOKUP.** Any truth source we contribute sets the reference that
  scores our miner. It must be a neutral public API, never a wrapper we deploy, and it must be disclosed.
- livecert does not serve VALIDATOR_PERFORMANCE_VERIFY. Its epoch-2032 table also looks odd: the beacon-node wrappers
  scored 0.18–0.38. Unverified.
- **Reads done 2026-11-16 ~19:00 UTC (contribute-evaluation-data, yaml-config, validation-api):**
  - The node reads a source's value "with the node's response parser and the intent's answer format". Without an
    `intent_mapping`, that is a parser model reading the whole answer, so raw DoH JSON can serve.
  - Each pool row lands in a ranking or a testing half that the contributor does not choose. Sources in the testing
    half are unused.
  - The validation API answers 404 (stated on its own page).
  - DNS.SB and NextDNS return JSON to a plain GET with no header.
- **Prepared, not uploaded:** two neutral truth sources in
  [material/dns_truth/](material/dns_truth/README.md), sha256 `ccc8e992…0123`. Upload is the owner's signature.
  Success shows only as DNS_RECORD_LOOKUP_GENERAL scores with an `epoch_id` after the upload.

## G49 — 45 comparator registrations in 30 families wait on a pool snapshot that exists only under the `_GENERAL` id (2026-11-16) — `OPEN`

Evidence: registry snapshot `wasm-20261116T163719Z.json`. Re-evaluated 2026-11-16 15:45 UTC, 31 champion-less families
still read `awaiting_compatible_material: ... eval-pool: no published snapshot`. `/api/evalpool/status` has a published
snapshot under `X_GENERAL` for 29 of them and none under the family id. The docs say a comparator is asked 100 cases
from its correctness battery, not pool rows (anjoman.ai/docs/scoring/build-a-scoring-module, read 2026-11-16).
30 of the 31 are deterministic families; CODE_PATCH_VERIFY is judgment (too few submitters).

- **Correction 2026-11-19:** the family-id reading is contradicted. FX_NOW has no family-id snapshot and is evaluated;
  evaluated families all have non-`_GENERAL` intents, and waiting ones all `_GENERAL`. Cause unknown.
- **Post-reset rotation (2026-11-19):** in the six evaluated families (FX_NOW, CRYPTO_PRICE, WEATHER_CHECK, CURRENCY_EXCHANGE,
  SSL_VERIFICATION, STOCK_PRICE) the latest passing comparator supersedes the previous one: 0x8b22 #112–#117 replaced
  0xb3fb #80–#85 within 36 h, all 0 mismatches. Identical scoring with new bytes; no quality difference.
- Superseded reading (inferred): a platform mismatch between a family-id lookup and an intent-id pool. A report to the organiser
  is the owner's send.
- **It changes no ranking for us.** Those families' miners are scored now, without a champion comparator, because a
  comparator is not needed for scoring. Every exact comparator reproduces the same network rule. Our #273–#278 can at
  most carry a canonical label; who is promoted when the blocker clears is not stated for comparators.

## G48 — OPTIMAL_EXECUTION_ROUTE pilot: no wrong answers to build a holdout from (2026-11-16) — CLOSED

Evidence: [adapter/optimal_execution_route/PILOT.md](adapter/optimal_execution_route/PILOT.md) (pilot frozen at
`251e771` before capture); capture `C:/Users/hyada/tg-eval/captures/route-pilot-20261116`.

- The intent allows one pair (ETH/USDC). The capture got 126 answers from 42 miners: 48 right (all within 0.25% of the
  best public aggregator quote), **0 wrong**, 33 with no value and 45 call failures. Each service repeated its outcome.
- No right-versus-wrong holdout exists, and an identity probe on right-versus-no-value scores 1.00. Champion #417's
  accuracy was not measured. Reopen only if miners start returning wrong `amount_out`, or the intent allows more pairs.

## G47 — QUESTION_ANSWERING v2, the last iteration, fails the gate: 43.4% vs champion 45.3% (2026-11-16) — CLOSED

Evidence: [adapter/question_answering/](adapter/question_answering/README.md) v2 section (design fixed at `b0e7168`
before any data), `evidence/question_answering_v2/` (audit PASS, holdout and probe scores, chain log, Stage 1);
package `C:/Users/hyada/tg-eval/runs-v2/QUESTION_ANSWERING_v2/QUESTION_ANSWERING.safetensors`, keccak `0x20cceafe…cd3f`.

- Change from v1: balanced `true_negation` / `false_negation` kinds, after val-split probes showed v1 prefers the
  non-negated statement. On those probes v2 moved A1 from 1/60 to 22/60 and A2 from 60/60 to 49/60. The bias shrank
  but did not vanish, and knowledge (C) stayed at 46/60.
- Holdout (frozen 362, node runtime): v2 157 = 43.4% (TruthfulQA 47/150, HaluEval 57/150, miner pairs 52/61 + 1/1).
  v1 was 152 and the champion 164. Fixing the probe bias did not move TruthfulQA (46 → 47).
- `compare.py` / `gate.py` output, verbatim:

  ```
  [holdout] V2 0.4337 [0.3836, 0.4852] vs QA301 0.4530 [0.4025, 0.5045] n=362 | both_right=89 both_wrong=130 cand_only=68 base_only=75 | McNemar p=0.616003 | diff=-0.0193 CI95=[-0.0829, 0.0442] | P(pass on 30 pairs)=0.0026
  note: length baselines: longer-wins 0.4613, shorter-wins 0.5166
  FAIL: candidate 0.4337 < QA301 0.4530 + 0.02
  FAIL: candidate-only-right 68 <= QA301-only-right 75
  FAIL: candidate Wilson lower bound 0.3836 < 0.7
  FAIL: candidate 0.4337 < longer-answer-wins 0.4613 + 0.05
  FAIL: candidate 0.4337 < shorter-answer-wins 0.5166 + 0.05
  FAIL: P(pass a 30-pair round vs QA301) = 0.0026 < 0.6
  FAIL
  ```
- Reading (inferred, not measured): TruthfulQA and HaluEval pairs turn on facts that a ModernBERT-base reward head
  with a rank-8 adapter does not hold. The training data's own test split passed again (`training-result.json`)
  and again predicted nothing. Both iterations are used; the lane is closed. Do not register v1 or v2.

## G42 — QUESTION_ANSWERING v1 fails on bare answers; no scorer beats chance on the benchmark pairs (2026-11-15) — `CLOSED by G47`

Evidence: `C:/Users/hyada/tg-eval/runs-v2/qa_holdout/holdout-*.json` and `report-*.json` (node runtime, per-pair
f32 bits); holdout frozen at `3658ecd` before training; package keccak `0xa3880bf3…7443`, Stage 1 passed.

| Scorer | Gated holdout (362) | TruthfulQA (150) | HaluEval (150) | Miner pairs (62) | Report-only set (334) |
|---|---|---|---|---|---|
| Ours v1 (rank 8, alpha 32, 384 tokens) | 152 = 42.0% | 46 | 50 | 56 | 294 = 88.0% |
| Champion #301 | 164 = 45.3% | 86 | 41 | 37 | 93 = 27.8% |
| GENERIC #900005 | 159 = 43.9% | 58 | 74 | 27 | 117 = 35.0% |
| Longer answer wins / shorter answer wins | 46.1% / 51.7% | | | shorter wins 55 | 22.8% / 77.3% |

- Gate: FAIL. Ours is below the champion overall and below chance on the 300 benchmark pairs (96/300).
- The training run's own test split passed. It did not predict text we did not write, for the fourth time.
- The miner-pair and report-set wins are not usable evidence. Shorter-answer-wins scores 55/62 and 77.3% there;
  the report set repeats questions, holds whole response bodies and includes our own miner's answers.
  The 10.7-point lead over shorter-wins on the report set is the only sign of signal, and it is not independent.
- The champion scores 23/198 on whole response bodies: it prefers the longer body almost every time.
- Inferred, not measured: ranking a right bare answer over a plausible wrong one needs the fact, and the model
  has no evidence to check it against (same as G38). The 62 miner labels are a model's reading, 19 spot-checked.
- One iteration remains under the two-iteration rule. Not registered; do not register v1.
- **Gate run 2026-11-16** (first time `compare.py`/`gate.py` ran in any lane; `harness/merge_results.py` joined the
  per-package files into `C:/Users/hyada/tg-eval/runs-v2/qa_holdout/holdout-all-v1.json`):

  ```
  [holdout] OURS 0.4199 [0.3701, 0.4713] vs QA301 0.4530 [0.4025, 0.5045] n=362 | both_right=89 both_wrong=135 cand_only=63 base_only=75 | McNemar p=0.349115 | diff=-0.0331 CI95=[-0.0967, 0.0304] | P(pass on 30 pairs)=0.0016
  note: length baselines: longer-wins 0.4613, shorter-wins 0.5166
  FAIL: candidate 0.4199 < QA301 0.4530 + 0.02
  FAIL: candidate-only-right 63 <= QA301-only-right 75
  FAIL: candidate Wilson lower bound 0.3701 < 0.7
  FAIL: candidate 0.4199 < longer-answer-wins 0.4613 + 0.05
  FAIL: candidate 0.4199 < shorter-answer-wins 0.5166 + 0.05
  FAIL: P(pass a 30-pair round vs QA301) = 0.0016 < 0.6
  FAIL
  ```

## G41 — real-answer sanctions measurement exposes source/length confounding (2026-11-01) — `OPEN`

Evidence: `adapter/sanctions/evidence/2026-11-01-miners-r1/`. Frozen 32-name queries, 15 YAML routes,
232 responses; 32 unchanged answer pairs from 8 listed names. No negative-name pairs can be labeled
defensibly from observed disagreements. LiveCert is our related miner, disclosed throughout.

Node runtime: v3 29/32 (90.625%), v4 12/32 (37.5%), v5 24/32 (75%); length baseline **32/32**. All wrong
decisions come from one short-response OFAC service. V3 wins every comparison on only 5/8 names; its
diagnostic name-level Wilson 95% lower bound is 30.6%. This is not an 80% result with a defensible margin
on a representative set. It cannot justify sanctions registration. The exploratory 24-pair run is separate.

The snapshot proves exact-name membership/absence, not identity or all-list/fuzzy clearance. Labels
assess a decision only; narrative/evidence fields are not comprehensively verified. Other-list/fuzzy
positive alerts, transport errors, unknown status, wrong echoed names and conflicting verdicts abstain.
Raw responses, labels and agreement denominators are replayable. Engine ids differ from registration
ids; some detail API responses are missing or unrelated. Routing uses the catalog YAML's external_path
and parameter mapping. v4/v5 are now hosted as experimental packages, not ready-to-sign candidates.

V6 pilot completed: longer synthetic formats, 5,958/795/794 pairs, measured names/ids excluded, entity,
alias and query splits audited. Kit test 90.18% on 794 pairs; export/Stage 1 PASS. Actual node runtime:
22/32 (68.75%) on the initial set; 19/24 (79.17%) on a fresh 32-name capture (6 names contribute pairs).
V3 scores 20/24 (83.33%) there, but length alone scores 24/24. Both sets remain one-sided/source-confounded.
Since the initial capture informed v6 design, its results are development evidence. The fresh capture
was frozen while v6's configuration was fixed, with no training/model changes from its answers.
A readiness claim needs new independent answers, more names, both labels and source/length-balanced
mistakes. Synthetic exact-absence labels also do not ground-truth every fuzzy-alert threshold.

Wrong-query controls: v6 16/20 (80%), listed 10/10, absent 6/10; our LiveCert-format controls 3/4.
For the Bank of America question, a deliberately paired Bank of India response outranks the correct
answer (9.643579 vs 3.596127). This is a synthetic relevance failure, not an actual miner mistake.
The v6 builder's wrong-entity negatives always use listed replacements, leaving two-no-match swaps
untaught. No causal claim is established. These controls are not training or a registration gate.
No v6 claim of robust factual discrimination, safe own-style rejection or readiness is supported.

Concurrent session commit `33b692a` records owner deregistration of #46 and a released bond unlock at
2026-11-03 18:36:48 UTC. This measurement run did not independently repeat that chain read. Preserve
the current SIGN_S2 FX_NOW flow; this gap applies to sanctions adapters only.

## G40 — the first SANCTIONS_SCREENING_MATCH adapter only judged our own answer shapes (2026-11-01) — `OPEN: v3 REJECTED at 7/15`

**Registration 46 (v3) rejected, 16:25:59 UTC:** "at its runnable URL the adapter ordered 7 of 15 public pairs
correctly (46.7%), below the 70% floor". The node sent one batch of 30 texts, the longest 279 tokens; we answered in
54.4 s with the right identity, so the infrastructure worked and the judgement failed. **Our 72.5% probe did not
predict the pool**: we wrote the probe ourselves, so it shares our assumptions. Pool texts run longer than anything
we trained on (training p99 154 tokens, pool max 279). `0x3035…` scored 9/15 on the same check. Do not register
again on a self-written probe. First get a measurement whose answers we did not write: real sanctions miners'
responses, or another public source. Bond 4.835 MACHINA stays locked until the owner deregisters 46.

**v4 and v5 (not hosted):**
- **v4** (name-shape cue removed) scored 60.0% on the probe.
- **v5** (every SDN entity, twice, 77,936 pairs; keccak `0xddfdfcd0…a43e`) scored a 93.7% kit test. That is recall,
  since every test entity is in training. Its probe score was **53.75%**: it calls nearly every name listed
  (listed 87.5%, real unlisted names 12.5–37.5%).

None of v1–v5 is fit to register. **Sanctions is paused** until a measurement exists on answers we did not write.

**v3 (18:51 IST, keccak `0x49de4107…f2f0`, not hosted):** probe **72.5%** (80 pairs; one cell still 0/8: an
unlisted name's detailed "no entries found" lost to a bare "Match"); held-out 200 pairs 93.0%, 0 ties, length
50.5%. But bare verdicts on never-seen names scored 8/8, which knowledge cannot explain: name shape alone (word
count, capitals) predicted "listed" 71.7% on the v3 test set, because unlisted people were built as 2-word
names. v4 builds every unlisted name from a listed template, word for word, and gives both classes the same
25% typo rate. The words+caps+length rule now predicts listed 58.3% (the remainder is aliases); gate PASS.
v3's 93% is not a judgement number.

**v2 (17:30 IST, keccak `0x7cf777b7…562a`, not hosted):** kit test 91.2%, but the probe (now 80 pairs, with
mixed shapes) gave **57.5%**. With one detailed and one short answer it always preferred the detailed one:
right-detailed 100%, right-short 0%. Every v2 pair kept both answers in one shape, and the adapter scores each
answer alone, so it never learned a scale shared across shapes. Bare and one-word verdicts on listed names
stayed at chance (50%, 12.5%): it does not know which names are listed. v3 draws the worse answer's
shape independently in half the pairs (`CROSS_SHARE`; gate PASS, length 52.1%, surface 57.3%).
One `adapterexec` worker died silently mid-run (`exec_8083_died.log`, no error line): the fan-out then answers 502.
Before registering, watch the worker count during the remote check.

v1 (`pairs/sanctions_v1`, keccak `0x23bbe60e…7145`, not hosted or registered) scored 95.1% on the kit test gate and
96.0% on 200 held-out pairs in `adapterexec` (flipped 89.6%, the other kinds 100%). On 48 pairs written in
shapes the builder never produced (`adapter/sanctions/ood_probe.py`: schema JSON with string `matches`,
`{"matched": bool}`, one-word verdicts; 8 SDN-listed and 8 unlisted names) it scored **60.4%**. It preferred
"no match" whenever an answer carried no nearest entry: listed names scored 0% on bare and one-word answers. That
is the 60% that got `0x3035…` rejected on the 15 public pairs. v2 adds those shapes (prose 30%, full JSON 25%,
thin JSON 20%, bare 10%, word 15%; dataset gate PASS, surface 57.9%). On a bare verdict about a name it
never saw, the adapter can only guess: measure held-out and probe results by format before hosting.
The public pairs themselves are not readable from any devnode endpoint tried (`/api/evalpool/status` shows
416 eligible rows from 7 submitters, snapshot `1d53d852…`).

## G39 — no public tunnel for the executor yet (2026-11-01) — `WORKAROUND 14:50 IST`

**Update:** owner chose cloudflared (winget, 2026.10.7, installer hash verified). A quick tunnel has a 100 s
response cap: one `adapterexec` took 126 s on a worst-case 30-text batch (HTTP 524). `track2/adapter/fanout_exec.py`
splits the batch over 3 workers: 74 s, 200. Remaining risks: the quick-tunnel URL is ephemeral (a restart gives a new
one, which would not match a signed registration); 3 workers leave ~1.2 GB RAM free; a larger pool text than 256
tokens is truncated by the node too, so 74 s is the ceiling on this CPU. The original text follows.

The account's one ngrok domain (`grippelike-foliiferous-richie.ngrok-free.dev`) is already online from another
machine, serving "The Archive of Constantinople"; ngrok refuses a second agent (ERR_NGROK_334). Not touched.
Options: install Cloudflare's `cloudflared` for a quick tunnel; stop the other ngrok agent for the registration
window; or a VM. The validator needs a public https URL, no redirect, for about 1.5 h.

## G38 — the EVENT_OUTCOME_RESOLUTION adapter cannot verify facts about events it never saw (2026-11-01) — `OPEN, the main risk`

Node runtime, 200 test pairs from event series held out of training (`runs-v2\EVENT_OUTCOME_RESOLUTION\
node_scores_test200.json`): 75.5% overall, 0 ties, length baseline 0.42. By failure type: contradiction 12/12,
prediction 17/17, unresolved 13/13, wrong_event 61/61, **flipped 51.9% (52), wrong_winner 46.7% (45)**. The kit's
own test gate: 74.7% on 2,566 pairs. So the model checks form, internal consistency and relevance, not who
actually won; a 150M encoder cannot know unseen outcomes. Whether it clears 70% on the hidden pool depends on how
many of the pool's worse answers are factual flips, which we cannot see. Not yet measured: the famous-event
subset (high sitelinks), where pretraining may know the answer. Say this limitation wherever the adapter is
claimed.

## G37 — which text does a judgment adapter see for a ranked miner answer: prose or the response JSON? (2026-11-01) — `OPEN`

The docs say a hybrid adapter sees "the miner's whole response"; for judgment intents they say only "a miner's
answer". Pool rows are contributor prose. Our EVENT_OUTCOME_RESOLUTION data renders 40% of pairs as the intent's
response JSON and 60% as prose, so either reading is covered. Close it by asking Telegraph, or from a ranked
epoch's record if one is ever published.

## G36 — the kit's compiled class list disagrees with the live node (2026-11-01) — `OPEN, workaround in use`

`pkg/scoring/catalog` lists EVENT_OUTCOME_RESOLUTION and SANCTIONS_SCREENING_MATCH as hybrid;
`/engine/v1/intents/<INTENT>_GENERAL` says `judgment` for both, and registration 30 (another author) was rejected
`class_mismatch: class "hybrid", the intent needs "judgment"`. We export with the live class (ARCHITECTURE A1).
Worth reporting to Telegraph: it will cost every adapter author a bond cycle.

## G35 — the tokenizer saved with our October run differs from the pinned one (2026-11-01) — `CLOSED`

`export_adapter` refused `runs/LLM_OUTPUT_EVALUATION/adapter/tokenizer.json` (sha256 `a4285a69…`, pinned
`67bc76f8…`). The only difference is `truncation.max_length` (256 saved by training, 1536 pinned); token ids are
identical on all 22,800 rendered training texts. The pinned file was copied into the export copy
(`C:\Users\hyada\tg-eval\runs-v2\`), not the original run. Export, Stage 1 and the foundation load then passed.

## G34 — the adapter format changed again: safetensors deltas on a shared Foundation Model (2026-10-31) — `UNBLOCKED 2026-11-01`

**Update 2026-11-01:** Telegraph published `telegraphprotocol/telegraph-foundation` release
`modernbert-base-lora16-v1` (2026-10-31 18:19 UTC; all four sha256 checked `OK`) and the reference executor
`cmd/adapterexec` (kit `main` `1ed063e`). Our LLM_OUTPUT_EVALUATION delta is exported and passes Stage 1 and the
foundation load (track2 MEMORY, 2026-11-01). The original text follows.

`/docs/scoring/upgrade-shared-foundation` (updated 2026-10-31): an adapter is a LoRA delta plus a reward head in a
safetensors file; full-model `.wasm` is refused (`legacy_full_model`). Devnode already runs it (seeds 900001–900004
at 16:00 UTC). Our PEFT checkpoints are in `C:\Users\hyada\tg-eval\runs\LLM_OUTPUT_EVALUATION*\adapter\`, so the
docs' `export_adapter` path needs no retraining. **Blocked:** `foundation.json` and the reference executor are "to be
announced", and the runnable endpoint must match the node bit for bit. The family has an incumbent (900002), so a
new adapter must beat it by the replacement margin. Root GAPS G238.

## G33 — the Season II evaluator work predates protocol V2 (2026-10-29) — `PARTLY CLOSED 2026-10-31`

Comparators: checked, V2-valid, served at `livecert-comparator.vercel.app`, and not needed for scoring (root G237
killed). Adapter: superseded by G34. The original text follows.

V2 accepts only float model adapters in WASM, and registers them per family with `registerWasm(hash, url, prefix,
feeAddress, runnableUrl)` (anjoman.ai/docs `whats-new-v2`, updated 2026-10-27). The 31 comparators and the
LLM_OUTPUT_EVALUATION adapter below were built for the earlier formats. Whether either still loads, and which
family each would register on, has not been checked. G28–G32 describe the pre-V2 node and kit.

## G32 — the node runs a different ModernBERT from the one the kit trains (2026-10-22) — `FIXED for our adapter; organisers not yet told`

**Fixed 2026-10-22 ~17:30 UTC.** The retrain against `base-node` measures as follows:

| | value |
|---|---|
| node-architecture accuracy on the 800 test pairs | **96.6%** |
| flip | 93.5% |
| misquote | 98.8% |
| fabricate | 99.1% |

The new package is keccak `0x76f78441…88d02f77`. `verify_wide` in the node's own runtime gave Pearson 1.00000
against float, with every score within 0.04.

**Symptom.** `verify_wide` ran the packaged LLM_OUTPUT_EVALUATION adapter in the node's own runtime. It ordered both
probe pairs correctly, but its scores were far from the float model's:

| probe answer | wasm | float |
|---|---|---|
| pair 0, chosen | 16.49 | 20.72 |
| pair 0, rejected | 15.37 | 8.97 |

Pearson was 0.83. The interpreter took about 300 s per answer.

**Cause.** The converter in kit `992f2650` (`wide_runtime/convert.py` and `hf_helpers._norm_cfg`) reads `rope_theta`.
ModernBERT has no such key; it has `global_rope_theta` 160000 and `local_rope_theta` 10000. So the converter falls
back to 10000 for every layer. It also builds every layer as global attention, where ModernBERT slides a 128-token
window on 2 layers in 3. The package manifest's `Config` field shows theta × 1000 = `10000000`.

**Proof.** In float, with every layer global and theta 10000, the probe answers score 16.496 / 15.356 and
13.48 / −1.27. The wasm gave 16.493 / 15.368 and 13.60 / −1.24. That match is within about 0.1.

**Cost:** pairwise accuracy on the 800 test pairs.

| kind | trained architecture | node architecture |
|---|---|---|
| all | 96.9% | 81.0% |
| flip | 94.1% | 67.4% |
| misquote | 98.8% | 87.3% |
| fabricate | 99.1% | 95.3% |

The package `0xe54abbfe…` is withdrawn from the sign list.

**Fix.** Train against the architecture the node runs:

- `C:\Users\hyada\tg-eval\base-node` holds the same weights, with `global_attn_every_n_layers: 1` and both thetas
  set to 10000.
- Pass it as `--base-model` to training and as `--base` to conversion.
- Measure with [adapter/eval_deployed.py](adapter/eval_deployed.py), which scores 800 pairs in about a minute on
  the GPU.

**Who else it affects.** Every wide adapter built with this kit on ModernBERT. It is worth reporting to the
organisers. Fixing their converter would change the node's architecture back, so ask which architecture they intend
before relying on either.

## G31 — the LLM_OUTPUT_EVALUATION adapter is built; what it has not been tested on (2026-10-22) — `OPEN`

The package exists: 1,205,363,765 bytes, keccak `0xe54abbfe…b067ed89`. The numbers are in
[adapter/llm_output_eval/README.md](adapter/llm_output_eval/README.md). Not yet known:

1. **The hidden pool.** 96.9% is measured on our own template family. The pool's pairs are written by other
   contributors, and they may judge tone, safety or multi-source citations, which our data never teaches. The 70%
   first-canonical floor is the bar that counts, and it has not been measured.
2. **Material.** Nothing is evaluated until the intent's pool has 5 contributors. Pool status cannot be read until
   devnode switches.
3. **Hosting.** 1.2 GB is beyond GitHub raw. A release asset on the public `telegraph-factscore` repo (2 GiB cap) or
   the Hugging Face Hub would work. The node must download it within 30 minutes. This is a public upload and needs
   the operator's yes.
4. **Package fidelity.** `verify_wide` is checking whether the packaged module, run in the node's own runtime,
   orders the probe pairs like the float model. Its result is in the next entry.

## G30 — comparators: built and proved exact; routing and hosting open (2026-10-22) — `OPEN`

What is proved is in [comparator/README.md](comparator/README.md): 234,848 cases through the node's own runtime, 0
mismatches against the network's answer key. Open:

1. **Routing for 22 of the 31 intents.** Only 9 of the intents (FX_NOW, ROUTE_ETA, MACRO_ECONOMIC_INDICATOR,
   LIQUIDITY_DEPTH_VERIFY, MINING_HASHPRICE_VERIFY, GRID_POWER_PRICE, LIVE_SHELF_PRICE, ONCHAIN_METRIC_VERIFY,
   ASSET_RESERVE_ATTESTATION) are wired to the comparator path in the kit's compiled map. The other 22 are "A —
   Deterministic" only in the docs. A registration on an intent the node does not route as deterministic may be
   rejected. The cost is gas only, and that rejection would answer the question.
2. **Rollout.** At 2026-10-21 19:16 UTC devnode had not switched. Register nothing before
   `/api/evalpool/status` answers.
3. **Hosting.** Two candidates:
   - Push `comparator/` to the public `telegraph-factscore` repo and register commit-pinned raw URLs.
   - Push this branch. The working branch is unpushed and far ahead of `origin`, so pushing it publishes a lot of
     other work.

   Either way it is a public push and needs the operator's yes.
4. **What it is worth.** The docs say comparators cannot be better than one another, and a later passing one
   replaces ours. Expect judges to weigh the adapters, not these. That is an inference: the Evaluator judging
   criteria are unpublished.

## G29 — FACT_CHECK cannot be packaged with the published kit (2026-10-21) — `OPEN, needs the organisers`

The FACT_CHECK pairs are built and pass the kit's data gate ([adapter/fact_check/README.md](adapter/fact_check/README.md)).
The packager refuses the intent itself. The kit's compiled class map covers only the 31 judgment and hybrid intents
added on 2026-09-08 (facts and command output in [../docs/TELEGRAPH_FACTS.md](../docs/TELEGRAPH_FACTS.md)), and FACT_CHECK
is not one of them. The intents docs call FACT_CHECK "Judgment", so the node's database may still classify it that
way.

We will not patch the kit to force a class. Its guard exists because a package built for the wrong class is refused
by every node.

- **Question for the organisers:** in Season II, are FACT_CHECK and WEB_SEARCH judgment intents that take a wide
  adapter, and will the kit's class map include them?
- **Proposed while that is open (the operator decides):** move the same method to `LLM_OUTPUT_EVALUATION`, which is
  judgment, packageable and bought by 7 missions. That intent judges a model output's factual fidelity and citation
  support against a source.

## G28 — Season II evaluator path: open questions (2026-10-21) — `OPEN`

The facts are in [../docs/TELEGRAPH_FACTS.md](../docs/TELEGRAPH_FACTS.md), section "Season II evaluators: `rank_answer` is
retired". In short: `rank_answer` modules are retired, deterministic intents take a comparator, and judgment and
hybrid intents take a ModernBERT reward-model package of about 1.2 GB. What is not known:

1. **When devnode switches.** At 06:40 UTC it still ran the Season I gate. Until it switches, nothing in the new
   format can be tested live, and a `rank_answer` upload is wasted the day it does.
2. **Evaluator judging criteria** are unpublished. Comparators cannot be better than one another (docs), so they
   are unlikely to be what the judges weigh. That is an inference.
3. **Can this machine train an adapter? — CLOSED 2026-10-21, yes.** The probe ran the kit's own `build_model` and
   collator, with LoRA r=8, gradient checkpointing and bf16, on the RTX 3050 Laptop. The display holds about 1 GiB,
   leaving 2.91 GiB free. Every sequence was padded to the full 256 tokens, the worst case.

   | batch | peak allocated | peak reserved | seconds per pair |
   |---|---|---|---|
   | 1 | 0.38 GiB | 0.40 GiB | 0.744 |
   | 2 | 0.43 GiB | 0.47 GiB | 0.355 |
   | 4 | 0.53 GiB | 0.59 GiB | 0.175 |
   | 8 | 0.74 GiB | 0.82 GiB | 0.117 |

   At batch 8, 6,000 pairs take about 12 minutes an epoch, so 3 epochs take about 35 minutes. The kit defaults to
   batch 1, which would take about 75 minutes an epoch, so use `--batch-size 8 --grad-accum 2` (effective batch 16,
   the kit's default). Convert and package (each about 1.2 GB) are not yet measured.
4. **Hosting a 1.2 GB package.** GitHub raw and repository files are too small. A release asset (2 GiB cap) or
   the Hugging Face Hub would fit, and the node must download it within 30 minutes. Not tried.
5. **No adapter can be evaluated until 5 contributors have material in the intent's pool.** Pool status per
   intent cannot be read yet (the endpoint returns 404).
6. **Integrity rule, decided now.** We train adapters on pairs that we never upload to the evaluation pool, and
   we disclose that. Pool rows may land in the hidden testing half, and training on them would grade our module
   on what it has already seen.
