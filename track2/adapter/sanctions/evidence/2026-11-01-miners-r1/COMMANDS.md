# Commands and observed outputs (UTC capture date 2026-11-01)

Working directory: Telegraph `.claude/worktrees/evaluators-status-a51518`.
`$evalPython = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'`.
All APIs were read-only. No evaluation-pool pairs were requested.

```powershell
git status --short --branch
git log -1 --oneline
```

Initial output:

```text
## claude/evaluators-status-a51518
11618d6 Record the v4 and v5 sanctions measurements and pause the family until a measurement on answers we did not write exists
```

Another session concurrently advanced the shared branch with FX_NOW work (`9483970`,
`322e087`, `33b692a`). Its changes are preserved; they are not measurements from this run.

```powershell
& $evalPython track2/adapter/sanctions/collect_miners.py `
  --sdn C:/Users/hyada/tg-eval/data/sanctions/sdn.csv `
  --alt C:/Users/hyada/tg-eval/data/sanctions/alt.csv `
  --out track2/adapter/sanctions/evidence/2026-11-01-miners-r1
```

Observed output, per id, `(requests, complete HTTP-200 responses)`:

```text
4433 (32,32), 78021 (32,32), 302 (32,32), 78010 (32,0),
78003 (1,0), 78005 (1,1), 78009 (1,1), 78006 (1,1), 78007 (1,1),
78001 (1,1), 78004 (1,1), 78008 (1,1), 78022 (32,32), 9002 (32,32), 710637 (32,32)
```

Full machine output: `collection-summary.json`. An earlier aborted collection hit the
2.5 MB catalog cap; it was not used. The successful collector allowed 25 MB for metadata.
The original capture preceded explicit one-second pacing; the current collector honors
at least one second between calls, or a slower YAML rate. Captured calls were sequential
within each miner, at most four miners in flight.

```powershell
& $evalPython track2/adapter/sanctions/label_miners.py track2/adapter/sanctions/evidence/2026-11-01-miners-r1
```

Output (complete output in `label-command-output.txt`):

```text
queries: 32; responses: 232; pairs: 32; paired_names: 8
pairs_by_kind: listed=32
longer_answer_baseline: 1.0
```

The 24-pair exploratory run preceded the generic `match` boolean support and final
catalog completion. Its raw scores and inputs are kept in `exploratory-24pairs`; the
final common dataset is `pairs.jsonl` SHA-256
`39014a9003f4584e9339817c7a47be6265ea0b36d5c58ad7283b7533a25226f8`.

```powershell
& $evalPython track2/adapter/sanctions/measure_miners.py track2/adapter/sanctions/evidence/2026-11-01-miners-r1
```

Output (complete JSON output in `measure-v3-v5-command-output.txt`):

```text
v3: pairs=32 accuracy=0.90625 ties=0 all_comparisons_correct_names=5/8 gate=false
v4: pairs=32 accuracy=0.375   ties=0 all_comparisons_correct_names=0/8 gate=false
v5: pairs=32 accuracy=0.75    ties=0 all_comparisons_correct_names=2/8 gate=false
rendered max=993 tokens; truncated=31/64 texts; max_tokens=256; unique sequences=40
```

The original scorer's `started_at` field was printed at completion; for those v3/v4/v5
files it denotes completion time. Elapsed seconds and timestamped worker logs are retained.
The script now records start and finish separately. This timestamp bug does not affect scores.

```powershell
& $evalPython -m unittest discover -s track2/adapter/sanctions -p test_label_miners.py -v
& $evalPython track2/adapter/sanctions/verify_evidence.py track2/adapter/sanctions/evidence/2026-11-01-miners-r1
```

Observed output:

```text
Ran 9 tests in 0.001s
OK
PASS sources; 264 raw body hashes; 32 verbatim pairs
PASS v3 29/32 = 0.906250; gate=False
PASS v4 12/32 = 0.375000; gate=False
PASS v5 24/32 = 0.750000; gate=False
PASS historical v1 probe 29/48 = 0.604167
PASS historical v2 probe 46/80 = 0.575000
PASS historical v3 probe 58/80 = 0.725000
PASS historical v4 probe 48/80 = 0.600000
PASS historical v5 probe 43/80 = 0.537500
```

Pushed capture commit: `50abf15` to `origin/claude/evaluators-status-a51518`.
Experimental package commit: `43110d0861ae510dd6ed367ab0d6a9aaee17de17` to
`telegraph-factscore` branch `season2-adapters-v2`. `package-hosting.json` contains
commit-pinned URLs; each was downloaded with urllib and SHA-256 checked against the
local manifest: v4/v5 HTTP 200, 6,776,916 bytes each, `matches_local_manifest: true`.
No new adapter was registered or activated.

v6 build:

```powershell
& $evalPython track2/adapter/sanctions/build_structured.py `
  --sdn C:/Users/hyada/tg-eval/data/sanctions/sdn.csv `
  --alt C:/Users/hyada/tg-eval/data/sanctions/alt.csv `
  --exclude-queries track2/adapter/sanctions/evidence/2026-11-01-miners-r1/queries.json `
  --out C:/Users/hyada/tg-eval/pairs/sanctions_v6_pilot_r1
```

Output: 5,958/795/794 pairs; manifest in `v6-dataset-manifest.json`. The initial pilot
was discarded before training after the overlap audit found 3 train/validation and 3
train/test shared prompts. The revised generator removes cross-entity alias and query
collisions; revised prompt intersections are train/val=0, train/test=0, val/test=0.

From `C:/Users/hyada/tg-eval/kit-v2`:

```powershell
$env:HF_HOME='C:/Users/hyada/tg-eval/hf'
$env:HF_HUB_OFFLINE='1'
& $evalPython -m float_runtime.train_adapter --intent SANCTIONS_SCREENING_MATCH `
  --data ../pairs/sanctions_v6_pilot_r1/train.jsonl `
  --val-data ../pairs/sanctions_v6_pilot_r1/val.jsonl `
  --test-data ../pairs/sanctions_v6_pilot_r1/test.jsonl `
  --out ../runs-v2/SANCTIONS_SCREENING_MATCH_v6 `
  --max-length 256 --batch-size 8 --grad-accum 2 --lora-rank 8 --lora-alpha 32 `
  --epochs 2 --seed 42 --check-data
```

Observed gate output:

```text
dataset gate: PASS (5958 pairs)
unique negatives 99.6%; largest single neg 0.1%; length shortcut 53.3%
held-out leak 0.4%; surface probe 60.5%; mean length chosen 427 / rejected 444 characters
```

Batch-8 and batch-4 concurrent attempts failed with CUDA out of memory (logs outside
repo, copied after final training). A serial batch-1/accumulation-16 smoke reached
step 10 with loss 0.7423. After CPU workers stopped, the full serial retry uses the
same command without `--check-data`, with `--batch-size 4 --grad-accum 4 --eval-batch 1`.
Two epochs and the same seed/rank/alpha/token cap are retained. Training log:
`C:/Users/hyada/tg-eval/train_sanctions_v6.log`. Final output and package/node checks
are to be appended after completion; nothing in this record implies they already passed.
