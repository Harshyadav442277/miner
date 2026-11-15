# SECURITY_REVIEW evaluator (Season II): v1, not ready to sign

Status 2026-11-08 (UTC): **v1 fails the bar.** It loses to a prompt-blind bag-of-words baseline,
and the incumbent #42 could not be measured because its package is no longer downloadable.
Nothing has been registered, signed, uploaded or posted.

## Results (node runtime: adapterexec, released foundation `0a49b325…`, engine `77643d6e…`)

| Scorer | Holdout (n=200, entity-disjoint) | OOT probe (n=30, hand-written) |
|---|---|---|
| v1 (`c55267d5…` keccak) | **68.0%** (136/200, Wilson 61.3–74.1) | 63.3% (19/30) |
| GENERIC #900005 (`dc4f8bd5…`, keccak verified) | 58.5% (117/200) | 63.3% (19/30) |
| Incumbent #42 (`c6b82b10…`) | **not measured**: file 404 | not measured |
| Length baseline (prefer longer) | 51.5% | 46.7% |
| Bag-of-words, answer only (kit probe fitted on train) | **73.0%** | **76.7%** |

v1 holdout by kind: code_quality 13/13, generic 14/14, hallucinated_cve 15/16, missed_critical 22/31,
wrong_location 26/38, wrong_severity 20/32, false_no_issues 12/23, false_positive 14/33.
By answer format (all seen in training): json 24/31, md 47/71, plain 25/38, prose 21/28, table 19/32.
OOT formats are all unseen: 19/30. No text was truncated (max 499 of 512 tokens).
The training-time validation score was 78.1% (`evidence/v1/train-result.json`). The 10-point drop on the
entity-disjoint holdout is a generalisation gap.

Bit equality between adapterbuild (`--input`) and adapterexec: 4 of 4 identical
(`evidence/v1/bit-equality.json`). Per-pair f32 bits are in `evidence/v1/node-scores.json`.

## Data

- Dependency findings come from 7,713 reviewed GitHub Security Advisories (CC-BY-4.0), fetched
  2026-11-07 21:35 UTC with `fetch_ghsa.py` (`evidence/v1/ghsa-manifest.json`). Truth is the GHSA
  vulnerable range.
- Code, configuration and fake-credential templates are self-authored (`sr_code.py`,
  `sr_config.py`, `sr_deps.py`). CWE ids come from MITRE. The credentials are random fakes.
- No eval-pool row and no miner answer was read. Ten packages are held out of every split for the
  OOT probe (`oot_packages.txt`).
- Splits are disjoint by entity: package, code template, config template and secret file format.
  `audit_splits.py` passes (`evidence/v1/audit.json`). The kit's `--check-data` passes: length
  shortcut 55.1%, surface probe 64.8%.
- Frozen files, under `C:/Users/hyada/tg-eval/pairs/` and verified by the sha256 values in
  `evidence/v1/data-manifest.json`:
  - `security_review_v1/{train,val,holdout}.jsonl`
  - `security_review_oot_v1/oot.jsonl`: sha256 in `evidence/v1/other-inputs.sha256`. It stays out of git
    because a fake AWS-format key could trip push protection.

## Reproduce

`build_pairs.py`, then `audit_splits.py`, then
`bash with_gpu_lock.sh <tag> -- bash pipeline.sh v1 security_review_v1 --epochs 2`.
The pipeline runs train, tokenizer parity, export, Stage 1 and node scoring, then the bit check.
`baselines.py` gives the length and bag-of-words rows. Every step leaves `<log>` and
`<log>.command.json` in `evidence/v1/`.

## Open gaps

1. **The incumbent is unmeasurable.** `wasm_url` and `wasm_runnable_url` for #42 both return 404,
   re-checked 2026-11-08 08:18 UTC. The node presumably still holds a cached copy, so the
   replacement rule (+2 points on 21 hidden pairs) still applies, but we cannot estimate the margin.
2. **The bag-of-words shortcut beats v1.** The kit's split probe estimated 64.8%, but fitted on all
   of train it scores 73% on the holdout. Prompt-blind kinds carry most of v1's wins: generic,
   code_quality and hallucinated CVE ids on first-party code. The kinds that need the input stay
   weak, false_positive (42%) and false_no_issues (52%) worst. v1 appears to have learned "more
   findings is better".
3. The hidden pool's distribution is unknown. Neither the 15-pair remote check (#216 failed at
   8/15, #46 at 7/15) nor the 21-pair hidden sample can be estimated from this holdout.
4. The OOT probe is n=30: its Wilson interval is ±16 points. The answers are hand-written, and
   9 rejected answers had a clause appended to balance length.
5. The sha256 printed in the export log (`411bc11f…`) does not match the file's sha256
   (`ba8ad282…`, which adapterbuild agrees with). This was not investigated.
6. The kit's `train_adapter.py:838` raises a NameError after a PASS. It is harmless, and
   `pipeline.sh` reads `result.json` instead.

## Next iteration (v2), if run

Rebalance so that answer-only cues cannot win:
- give every prompt-blind kind a matched counterpart (a chosen answer with the same vocabulary);
- double false_positive and clean scenarios;
- make the bag-of-words baseline on held-out data a build gate (≤ 60%);
- train 3 epochs.

By the kill criterion, a v2 that does not beat both baselines by 5 or more points ends the lane.
