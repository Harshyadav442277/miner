# WEATHER_FORECAST_VERIFY adapter lane

STOPPED at checkpoint B, 2026-11-16: 56 gated pairs, identity probe 0.696, shape probe 0.786; nothing trained or registered.

Family `WEATHER_FORECAST_VERIFY_GENERAL`, class judgment, 26 miners (read live 2026-11-16). Request `location`, `date`; only
`temp_max_c` is scored. Champion #445 (author `0x8d1a7ca0...`), eval_score 0.70; its keccak matched the registry
(`C:/Users/hyada/tg-eval/champions/WEATHER_FORECAST_VERIFY/445.safetensors`). The champion and GENERIC were never measured.

## Frozen queries

`holdout/queries.json`, 678 queries, sha256 `d9a93dbe4c64fc7d0873d3d5f1393830dd258b04fd155a07be1339b7acaef031`
(`holdout/queries.freeze.json`). Frozen before any answer was read. Pilot queries (3) are in `holdout/pilot_queries.json`.

**`holdout/holdout.jsonl`, `holdout.audit.json` and `report_only.json` are evidence of the failed audit. They are NOT a frozen
holdout**: no `freeze.py` run was made on them and no gate used them.

## Truth sources (checked 2026-11-16, details in `holdout/FREEZE_NOTE.md`)

| Source | Role | Licence, from its own page |
|---|---|---|
| GHCN-Daily TMAX, NOAA bucket `noaa-ghcn-pds` | primary | AWS Registry of Open Data: CC0-1.0 for NODD data |
| Open-Meteo archive (ERA5) | label cross-check only | CC BY 4.0; free API non-commercial only |
| Open-Meteo geocoder (GeoNames data) | coordinates | geonames.org: Creative Commons Attribution 4.0 |

## Label rule (fixed before labelling)

For numeric `temp_max_c = a`, per candidate place with GHCN `g` and ERA5 `e`: right if `|a-g|` and `|a-e|` are both <= 1.5 for some
candidate; wrong if both >= 3.0 for every candidate (all candidates need both truths); otherwise dropped. No numeric value,
transport errors and non-JSON bodies are report-only. One pair per query, chosen by seeded hash. Same-backend miners count once.

## Result

56 gated pairs from 678 queries (no_right 243, no_wrong 379). Answers: ok 3970, no_value 712, transport 64.

| service | right | wrong | dropped | other |
|---|---|---|---|---|
| zk-wxrecord = zk-wxobs (station) | 365 | 9 | 262 | 32 transport, 10 no value |
| chainsight-oracle (same backend) | 362 | 28 | 278 | 10 no value |
| counterproof-weather-verify (champion author, ERA5) | 414 | 2 | 262 | 0 |
| a1-preflight (ERA5) | 371 | 47 | 260 | 0 |
| txlens (ERA5) | 369 | 47 | 258 | 4 no value |
| sentinel-risk-oracle | 0 | 0 | 0 | 678 no value |

| probe (leave-one-out, ties half) | result | bar |
|---|---|---|
| longer answer wins | 0.580 | 0.65 |
| service identity | 0.696 | 0.65 |
| answer shape | 0.786 | 0.65 |
| value only | 0.411 | report |
| pairs | 56 | 100 |

Wrong kinds: near_wrong 28, far_wrong 22, gross_wrong 6. Pairs by services: a1 over chainsight 22, counterproof over a1 10, chainsight
over txlens 9, counterproof over txlens 6, txlens over chainsight 5, counterproof over chainsight 4.

## Limits

- Truth uses the nearest GHCN station within 25 km (elevation within 150 m); no time-of-observation correction.
- A transient ERA5 or geocoder failure returns nothing and an empty geocode is cached, so some places may have been dropped by
  accident (61 of 304 places skipped; not checked).
- The prompt (question text) and answer (mapped response fields as JSON) rendering is assumed; the node's rendering is unverified.
- The champion's accuracy on this family is unknown; no raw-body or alternative-prompt variant was run.

## Files

`places.py`, `make_queries.py`, `wx_truth.py` (queries and truth), `label.py`, `audit_holdout.py`, `test_label.py` (6 tests pass),
`holdout/FREEZE_NOTE.md`, `CHECKPOINT.md`. Captures: `C:/Users/hyada/tg-eval/captures/weather-20261116-{zk,chain,cp,a1,tx,sent}`,
pilot `weather-pilot-20261116`.

> ## G44 — WEATHER_FORECAST_VERIFY lane stopped at checkpoint B (2026-11-16) — CLOSED
>
> Evidence: `track2/adapter/weather_forecast_verify/` (README, CHECKPOINT.md, `holdout/queries.freeze.json`, `holdout/holdout.audit.json`);
> captures `C:/Users/hyada/tg-eval/captures/weather-20261116-*`; branch `claude/weather-forecast-verify-lane`. Not pushed.
>
> - Result: no clean real-answer holdout. 56 gated pairs from 678 queries (bar 100); service-identity probe 0.696 and answer-shape probe
>   0.786 against 0.65. 122 of 133 wrong verdicts come from a1-preflight, txlens and chainsight-oracle; the other services are right on
>   54 to 61% of queries and mostly agree within the right band; 38% of answers fall in the dropped 1.5 to 3.0 degC band.
> - Not done by decision: champion and GENERIC measurement, training data, training, compare and gate. No adapter, nothing registered,
>   no GPU time used.
> - Limits: nearest station within 25 km with no observation-time correction; possible transient geocoder or ERA5 drops; prompt
>   rendering assumed; champion accuracy on this family unknown.
> - Reopen only if the miners that return wrong values change (a1-preflight, txlens and chainsight-oracle stop being the only source
>   of wrong answers, or more independent services answer location and date), or if real pool pairs become readable. Then re-run the
>   pilot first.
