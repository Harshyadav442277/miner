# URL Scan challenger V1

This experiment trains one candidate and freezes two cohorts before reading model
results. All model files and full captures live under `C:/Users/hyada/tg-eval/`.
The `evidence-v1.json.gz` archive retains the source records, complete captured
responses, labels, pairs, runtime results and training record for reproduction.

## Training

`build_training.py` deterministically builds 768 synthetic training pairs and
96 validation and 96 test pairs. The prompt supplies a scanner observation. The
answer either changes the verdict or describes another target. Four neutral
response formats are balanced across correct and incorrect answers. No captured
miner response is used for training. Generated URLs differ across the splits.
The reserved `example.org` suffix appears in training and benign holdout URLs.

The first generator failed the kit's surface probe because the wrong URL used a
different hostname pattern. After correcting that shortcut, the surface probe
was 48.09% and the length shortcut 50.65%. Training used the kit's node-compatible
base, rank 8, alpha 32, max length 256, batch 2, accumulation 4, one epoch, learning
rate 0.0001, seed 42 and gradient checkpointing. The synthetic test result was
70/96, or 72.92%, against a 54.17% length baseline.

The kit exited 1 after writing its checkpoint and results because its final
instruction message referenced an undefined `pkg`. Independent export and Stage
1 passed. Both tokenizer files produced identical token IDs on 1,920 rendered
texts before the pinned tokenizer bytes were copied for export.

The compiled kit catalog lacks `URL_SCAN`. `live_class.go` obtains its hybrid
classification from the live child before invoking the unmodified kit parser.
Sepolia had already confirmed this family and kind. The exported hybrid package
loaded on the pinned foundation and returned the same bits twice. Its Keccak is
`fa82fae10628ec100671d411c6d737a8f03a94a26aef4282f02c55c55bf3a8e9`.

## Holdouts and labels

The first cohort uses five vendor warning demonstrations and three IANA example
sites. Its unsafe labels refer to the vendor warning policy. These demo pages
are deliberately inert and do not establish active malware detection.

The second cohort selects four domains from a frozen CERT Polska active warning
list, ordered by a fixed SHA-256 seed, plus the three benign controls. Labels
mean block under this frozen source policy. Listing does not establish that every
claim about a site's contents or current activity is true. Sources are
[CERT Polska](https://cert.pl/en/warning-list/),
[Google](https://testsafebrowsing.appspot.com/),
[Microsoft](https://demo.wd.microsoft.com/Page/UrlRep) and
[IANA](https://www.iana.org/help/example-domains).

Calls follow public YAML routes with a URL parameter. Errors, unknown or
contradictory verdicts, and responses identifying another target abstain. LiveCert
is excluded from pairs. Four other services with distinct owner wallets supply
usable replies. These calls measure service output, not adoption or paid demand.
Each case contributes at most two correct and two incorrect answers. The whole
response remains unchanged. Cases with no disagreements do not become decision
pairs. The naturally occurring decision pairs contain unsafe cases only.
The benchmark wraps each direct typed URL request as `Is <url> safe to open?`.
This is the experiment's question, not a recovered network epoch template.

Wrong-query controls put an untouched answer for another URL under the current
question, with both verdicts correct. They are explicitly constructed controls,
not observed miner mistakes. Repeated answers and shared domains make pair counts
larger than the number of independent cases.

## Scoring and the hybrid limit

`run_replay.py` owns a loopback executor and stops it when scoring ends.
`score_holdout.py` verifies foundation, tokenizer and adapter identity on every
reply and retains exact float bits. Generic uses its registered 512-token limit.
The challenger uses its exported 256-token limit. Counts at those limits are
reported. `convert_scores.go` applies the kit's exact integer sigmoid to the bits.

The kit's `ReferenceScore` returned 10000 for both matching boolean encodings
and zero for both mismatches. Against our references, that comparator resolves
every decision pair and ties on every wrong-query control. This comparison uses
our frozen references, not undisclosed network truth-source output.

The public API exposes neither the current fusion thresholds from `intent_specs`
nor the reference values used by the node. Its installed schema describes a gate
that caps a failed comparator result. We can measure raw model order, integer
basis points and comparator order, but cannot claim exact live fused scores.

Advance the pilot only if the fresh CERT cohort reaches at least 70%, improves
over generic by at least two percentage points, improves wrong-query ordering
and does not regress decision ordering. Even that requires a later check with
the live fusion configuration and an independent broader cohort before signing.
For hybrid use, improvements must survive the kit's integer conversion. A raw
float margin that becomes a basis-point tie does not count as an improvement.

## Vendor-demo result

| Pair kind | Generic raw wins | Challenger raw wins | Generic basis-point wins | Challenger basis-point wins | Comparator wins |
|---|---:|---:|---:|---:|---:|
| Decision, 10 pairs | 4 | 8 | 4 | 8 | 10 |
| Constructed wrong query, 11 pairs | 6 | 7 | 6 | 5 | 0, all tied |

The challenger improves the component that the comparator already resolves,
but regresses after integer conversion on the controls where the comparator
ties. The raw 15/21 result therefore fails to establish improved hybrid scoring.
At the respective limits, 17/26 challenger texts and 4/26 generic texts were
truncated or exactly filled the token window. No omitted tail was treated as
observed evidence.

## Fresh CERT Polska result and decision

| Pair kind | Generic raw wins | Challenger raw wins | Generic basis-point wins | Challenger basis-point wins | Comparator wins |
|---|---:|---:|---:|---:|---:|
| Decision, 8 pairs from 4 listed domains | 8 | 1 | 8 | 1 | 8 |
| Constructed wrong query, 13 pairs from 7 URLs | 4 | 12 | 4 | 10 | 0, all tied |

V1 fails the pilot gate. Its raw 13/21 result is below 70%, and it loses seven
decision pairs that generic ordered correctly. It does improve target binding
on this cohort, with eight raw gains and zero raw losses. Two of those wins
become ties at the integer boundary. The comparator can supply the decision
ordering against our reference, but this does not repair the adapter's own
qualification failure or prove a live fused improvement.

Generic fills its 512-token window on 8/25 unique inputs. V1 fills its 256-token
window on 18/25. This is a material coverage limit. The two cohorts also reverse
the relative benefit on wrong-query controls after conversion, so a stable
improvement across response contexts is unproven. V1 is rejected for registration.
Any later candidate needs a new independent holdout, wider context coverage,
better factual discrimination and verified live fusion parameters.

There are 232 recorded response attempts across the two cohorts. JSON parsing,
identity echoes, retained response SHA-256 values, pair hashes, finite-score
checks and the native integer conversion were checked. These checks establish
replay integrity, not a network qualification result or independent adoption.

## Reproduction

Use the `tg-eval` Python environment and the pinned kit/foundation described in
`README.md`. Build training with `python build_training.py <pairs-directory>`.
Train from the kit with `python -m float_runtime.train_adapter --intent URL_SCAN
--data <train.jsonl> --val-data <val.jsonl> --test-data <test.jsonl> --base-model
<base-node> --out <run-directory> --max-length 256 --batch-size 2 --grad-accum 4
--eval-batch 1 --epochs 1 --lr 0.0001`.

For either retained capture, run `label_holdout.py <capture-directory>`, then
`run_replay.py <capture-directory> --package <package> --hash <keccak> --name generic`
and the equivalent with `--name challenger`. From the kit, run `go run
<convert_scores.go> <generic-scores.json> <challenger-scores.json>`. Finally run
`summarize.py <capture-directory>`. These steps recreate the comparison from the
frozen bytes. A fresh collection is a different cohort and requires its own labels.
