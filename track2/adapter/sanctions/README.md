# Sanctions evaluator: reproduce the measurement

This Season II Evaluator experiment uses the shared Telegraph foundation and node runtime.
It has **not established registration readiness**. Registration #46 (v3) failed 7/15 at
the remote check. No pool questions or answers are in this directory or training data.

Start with [the write-up](../../SUBMISSION_S2.md). The frozen public measurement is
[`evidence/2026-11-01-miners-r1`](evidence/2026-11-01-miners-r1).

Prerequisites: Python 3.12, PyYAML and tokenizers for capture/replay; the training kit at
`telegraphprotocol/telegraph-wasm-baseline` revision `1ed063e2f006`, its `adapterexec`,
the published `modernbert-base-lora16-v1` foundation, and the three package files for
runtime measurement. Original Windows setup: `C:/Users/hyada/tg-eval/.venv`.
PyTorch/Transformers/PEFT and a suitable GPU are needed only to retrain.

From the repository root in PowerShell:

```powershell
$evalPython = 'C:/Users/hyada/tg-eval/.venv/Scripts/python.exe'
$capture = 'track2/adapter/sanctions/evidence/2026-11-01-miners-r1'
& $evalPython -m unittest discover -s track2/adapter/sanctions -p test_label_miners.py -v
& $evalPython track2/adapter/sanctions/label_miners.py $capture
& $evalPython track2/adapter/sanctions/measure_miners.py $capture --home C:/Users/hyada/tg-eval
```

Expected offline labeling: 232 responses, 32 cross-miner pairs from 8 names, all listed;
the longer-answer baseline is 1.0. Agreement denominators differ because unsupported
or ambiguous responses abstain. `labels.json` explains every abstention.
The runtime script hashes the foundation, engine, tokenizer and packages, uses the
node's rendering/truncation, validates every identity and input root, preserves f32
bits, and stops only its own local workers. It refuses to replace an occupied port.
`v*-node-scores.json` holds the measured scores and the registration-gate result.

The default rerun writes derived labels/scores. Preserve a copy before intentionally
changing labeling code; never rewrite the raw capture files. The preserved 24-pair
exploratory run predates recognition of the generic `match` boolean and completion of
all captures; it is not the final 32-pair benchmark.

To collect fresh public data into a **new** directory:

```powershell
& $evalPython track2/adapter/sanctions/collect_miners.py `
  --sdn C:/Users/hyada/tg-eval/data/sanctions/sdn.csv `
  --alt C:/Users/hyada/tg-eval/data/sanctions/alt.csv `
  --out C:/Users/hyada/tg-eval/new-public-measurement
```

The collector freezes names before calls, stores the SDN/alias snapshot compressed with
hashes, captures the live schema, catalog, detail endpoint and YAML, then calls each
published `base_url + external_path` using the declared method/parameter mapping.
The intent's input is `name`; some YAMLs require translating it to `entity` or `query`.
Engine miner ids differ from registration ids: several `/api/miners/<engine-id>` lookups
are missing or refer to unrelated superseded registrations. The catalog YAML is retained
as the routing evidence. Static feeds are probed once, not counted as 32 answers.

Labels mean **SDN exact-name decision agreement only**. Positives are matched to primary
or alias tokens and recorded SDN ids. An absent exact name is not global sanctions
clearance; fuzzy or other-list positive alerts abstain. HTTP failures, unrelated names,
unknown status, conflicting machine verdicts and unverifiable record ids abstain.
All candidate response bytes are unchanged in pairs. Neither source identity nor capture
metadata enters the model. LiveCert is our related miner, so these calls are not external
adoption, ranked routing or paid-use evidence.

For a small v6 retrain, build `sanctions_v6_pilot_r1` with `build_structured.py`, the two
frozen CSV snapshots and `--exclude-queries $capture/queries.json`. The manifest records
the seed, source hashes, excluded ids and disjoint splits. Run the kit's data gate before
training. See the exact command and outputs in the write-up/evidence log. Captured answers
are never loaded by the training builder. Its generated evidence fields remain synthetic.

Costs: offline replay needs no network or wallet. Runtime scoring uses local CPU/RAM;
training uses the local GPU. Capture makes direct public HTTP requests without the paid
Engine. The $5-equivalent MACHINA adapter bond and Sepolia gas would apply to a future
owner-signed registration, which remains gated.

Troubleshooting: install the listed Python dependencies in the selected environment;
use `curl.exe -4 -A 'Mozilla/5.0'` for node APIs; keep model cache outside OneDrive with
`HF_HOME` and `HF_HUB_OFFLINE=1`; reduce batch size on CUDA OOM. A stale quick-tunnel URL
must never be reused for signing. Do not fetch, reconstruct or train on pool material.

Useful next step: reproduce the labels, inspect the eight disagreement cases and report
a defensible labeling error or a new public-answer test. This is an invitation, not a
claim that an independent developer has acted on it. Telegraph's role and package contract:
[adapter guide](https://anjoman.ai/docs/scoring/build-a-scoring-module).
