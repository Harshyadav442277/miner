# WEATHER_FORECAST_VERIFY lane: checkpoint (2026-11-16, before checkpoint B)

State: branch `claude/weather-forecast-verify-lane` (base 2b27a17 + capture cherry-pick ae364cd). Not pushed.

Done
- Live intent and champion #445 read (author 0x8d1a7ca0..., eval_score 0.70). Champion and GENERIC fetched, keccak match registry
  (`C:/Users/hyada/tg-eval/champions/WEATHER_FORECAST_VERIFY/445.safetensors`, `GENERIC/900005.safetensors`).
- Truth sources and licences recorded in `holdout/FREEZE_NOTE.md`. Advisor checkpoint A was run; its points are applied
  (wrong = at least 3.0 from BOTH sources, null answers report-only, service dedupe, NODD bytes, ERA5 cross-check only).
- Pilot (3 frozen queries, `holdout/pilot_queries.json`): the services that answer location + date with `temp_max_c` are
  one station backend (zk-wxrecord, zk-wxobs, chainsight-oracle: identical values), three ERA5 services (counterproof-weather-verify,
  a1-preflight, txlens) and sentinel-risk-oracle (no value, echoes the question). oathcast needs a bearer token (401). The wxfv-*,
  wnd-*, weather-verify-openmeteo miners need lat/lon and send nothing usable.
- Query set frozen: `holdout/queries.json`, 678 queries, sha256 d9a93dbe4c64fc7d0873d3d5f1393830dd258b04fd155a07be1339b7acaef031,
  committed (ad745ca, 87cb92d). Truth per candidate in `holdout/truth.json`.

In progress (not finished when this run ended)
- Six detached capture runs, one per host group, outputs `C:/Users/hyada/tg-eval/captures/weather-20261116-{zk,chain,cp,a1,tx,sent}`;
  each writes `miner-<id>.json` files and `summary.json` when done; logs in `C:/Users/hyada/tg-eval/data/weather/capture-*.log`.
  Do not start a second copy. Check that all six have `summary.json`.

## Result at checkpoint B: STOP (2026-11-16)

All six captures finished. `label.py` over the six dirs: 56 gated pairs from 678 queries (no_right 243, no_wrong 379);
answers ok 3970, no_value 712 (sentinel 678), transport 64. `audit_holdout.py` (leave-one-out, ties half, bar 0.65): longer 0.580,
service 0.696, shape 0.786, value 0.411. FAIL on count (56 < 100), service and shape. Not frozen, not trained. Draft files
`holdout/holdout.jsonl`, `holdout.audit.json`, `report_only.json` are untracked.

Per-service verdicts over 678 queries (right / wrong / dropped, other):
| service | right | wrong | drop | other |
|---|---|---|---|---|
| zk-wxrecord = zk-wxobs (station) | 365 | 9 | 262 | 32 transport, 10 no value |
| chainsight-oracle (same backend) | 362 | 28 | 278 | 10 no value |
| counterproof-weather-verify (champion author, ERA5) | 414 | 2 | 262 | 0 |
| a1-preflight (ERA5) | 371 | 47 | 260 | 0 |
| txlens (ERA5) | 369 | 47 | 258 | 4 no value |
| sentinel-risk-oracle | 0 | 0 | 0 | 678 no value |

Wrong answers come from a1-preflight, txlens and chainsight (122 of 133). Pairs used were a1 vs chainsight 22, counterproof vs a1 10,
chainsight vs txlens 9, counterproof vs txlens 6, txlens vs chainsight 5, counterproof vs chainsight 4. Right answers are not only the
champion author's service. Kinds: near_wrong 28, far_wrong 22, gross_wrong 6. About 38% of answers fall in the dropped band (1.5 to 3.0 degC).

Next (original plan)
1. `python -I label.py --captures <six dirs> --truth holdout/truth.json --queries holdout/queries.json --out-dir holdout`
   then `python -I audit_holdout.py holdout/holdout.jsonl`. Stop if fewer than 100 gated pairs, or longer-wins / service probe > 0.65.
2. Checkpoint B (advisor): yield of wrong answers is the risk. Expect few wrong answers: the services mostly agree within the
   right band, and station-vs-ERA5 splits fall in the dropped band by design.
3. Unverified: how the node renders prompt/answer for a structured request (prompt here is the question text; answer is the mapped
   response fields as JSON). A raw-body and a `location:`/`date:` prompt variant are to be measured report-only.
