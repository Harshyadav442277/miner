# Adapter gate harness

A gate that a candidate evaluator adapter must pass before anyone registers it.

## Why

Three earlier adapters scored well on test sets we wrote ourselves and then failed on the network:
46.7% on the public pairs, and a URL-scan adapter that lost to the GENERIC baseline on real miner
answers. Our own test sets shared our own blind spots.

So the gate measures on a holdout that is:
- frozen (hashed) before any training starts;
- made of answers we did not write (real miner answers, captured from their public services);
- scored in the node runtime (`adapterexec`), the way a validator scores it (ARCHITECTURE A2);
- compared with the current champion's own published file and with answer-only baselines.

## Commands, in order

Run from `track2/harness`. `measure.py` needs the tg-eval venv (`tokenizers`); the rest is stdlib plus PyYAML.

```
# 1. Freeze the queries before any answer is seen
python freeze.py queries.json --queries --family QUESTION_ANSWERING --sources "where the questions come from" --note "..."

# 2. Capture real miner answers to those queries (refuses without queries.freeze.json)
python capture.py QUESTION_ANSWERING_GENERAL queries.json --out C:/Users/hyada/tg-eval/captures/qa-<date>

# 3. Label: turn captures into {prompt, chosen, rejected, kind, format, source, related_party} pairs,
#    judged from primary sources, never by reading a model's score. Then freeze the holdout:
python freeze.py holdout.jsonl --family QUESTION_ANSWERING --sources "miner captures <dir>, labelled against <source>" --note "..."

# 4. Train elsewhere, never on holdout rows (ARCHITECTURE A1, A4).

# 5. Fetch the champion's registered file (and GENERIC); keccak must match the registry
python registry.py table
python fetch_champion.py QUESTION_ANSWERING
python fetch_champion.py GENERIC

# 6. Measure every package on the holdout in the node runtime
C:/Users/hyada/tg-eval/.venv/Scripts/python.exe measure.py \
  --package ours=C:/Users/hyada/tg-eval/runs-v2/.../QUESTION_ANSWERING.safetensors \
  --package champion=C:/Users/hyada/tg-eval/champions/QUESTION_ANSWERING/301.safetensors \
  --package GENERIC=C:/Users/hyada/tg-eval/champions/GENERIC/900005.safetensors \
  --pairs holdout=holdout.jsonl --out results.json

# 7. Paired comparison
python compare.py results.json --candidate ours --baseline champion

# 8. The gate: PASS or FAIL with every reason (exit 0 / 1)
python gate.py --results results.json --freeze holdout.freeze.json --candidate ours --champion champion
```

When the family has no champion, leave out `--champion`: the gate holds the candidate to the same rules
against the `GENERIC` package and says so.

## What the numbers mean

- **accuracy**: share of pairs where score(chosen) > score(rejected). A tie counts as wrong, as on the node.
- **wilson95**: 95% Wilson interval of that accuracy. The gate uses its lower end, not the point.
- **ties**: pairs with bit-identical scores.
- **by_kind / by_format**: the same accuracy split by the rows' `kind` and `format` fields.
- **@longer / @shorter**: answer-only baselines. Prefer the longer (shorter) answer, with no model.
  If `@longer` scores above 0.65 the holdout is length-confounded and the gate refuses it.
- **both_right, both_wrong, candidate_only, baseline_only**: per-pair 2x2 table of the two scorers.
- **mcnemar_p**: exact two-sided McNemar test on the discordant pairs. Small means the difference is
  unlikely to be chance.
- **diff, diff_ci95**: candidate accuracy minus baseline accuracy, with a paired bootstrap 95% interval
  (10,000 resamples, fixed seed).
- **p_pass_30**: draw 30 of the measured pairs at random, 10,000 times. The share of draws where the
  candidate reaches 70% and beats the baseline by 2 points. This is the network's promotion rule on a
  sample the size of its hidden round.

## Gate rules (constants at the top of gate.py)

1. The measured file's sha256 equals the freeze, and the freeze still matches the file.
2. At least 100 pairs.
3. Candidate accuracy at least champion + 0.02, and candidate-only-right > champion-only-right.
4. Candidate Wilson lower bound at least 0.70.
5. Candidate beats longer-wins and shorter-wins by at least 0.05.
6. Longer-wins itself at most 0.65; otherwise FAIL: holdout unusable.
7. p_pass_30 at least 0.60.

## Limits

- A 30-pair hidden sample is noisy. One pair is 3.3 points. A good adapter can still fail a round, and
  p_pass_30 is only an estimate from our pairs, not from the pool.
- The holdout is ours, not the pool. Passing here says the candidate beats the champion on our
  questions and our labels. The network samples different pairs.
- Champion files are someone else's bytes, handled as untrusted data. They are never unpickled or
  executed. Only the safetensors JSON header is parsed, and the file is only handed to `adapterexec`.
  Files over 50 MB or without a valid safetensors header are refused, and keccak256 must equal the
  registry's `wasm_hash`.
- Registry fields, miner YAML and catalog entries are untrusted input. `netguard.py` allows only
  http/https URLs to hosts whose every IPv4 address is public (no loopback, private, link-local,
  shared, multicast or reserved), pins curl to the checked address, and re-checks every redirect hop.
  Family names, registration ids, miner ids and slugs used in file names must match
  `^[A-Za-z0-9_-]{1,64}$`, and every output path must stay inside its output directory.
- `capture.py` calls each miner's public service directly, not through the paid engine route. A miner's
  public service may answer differently from what it returns through Telegraph.
- Our own miner (`livecert`) is flagged `related_party`. Its answers are disclosed, never favoured, and
  must lose when they are wrong.
- `measure.py` truncates each answer to the package's own `max_tokens`, as `measure_node.py` did. If the
  node truncates differently, long answers can score differently there.
