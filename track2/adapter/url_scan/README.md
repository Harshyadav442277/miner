# URL Scan evaluator preflight

The trained V1 challenger, independent miner captures, integer conversion and
comparator comparison are documented in [EXPERIMENT_V1.md](EXPERIMENT_V1.md).
The smaller controlled probe below is the initial baseline.

On November 7 IST, Sepolia `getPrefixes()` returned `URL_SCAN` with hybrid kind 2.
`intentKind("URL_SCAN_VERDICT")` returned 2. The family is the dedicated adapter
target. The child is the evaluation material target. The public registry had no
entries for either and resolved the child to the `GENERIC` fallback, registration
900005. The child pool had five eligible contributors and 65 rows. The epoch
2030 leaderboard listed eight ranked miners, including LiveCert. Public pool
counts do not identify the truth sources or the reference values used in ranking.

The [controlled probe](build_preflight_pairs.py) uses eight URLs, each with a
verdict flip and a wrong-URL answer. The prompt supplies the observations. Six
cases are synthetic fixtures. Two use warning test URLs documented by
[Microsoft](https://demo.wd.microsoft.com/Page/UrlRep)
and [Google](https://github.com/google/safebrowsing/blob/master/README.md).
The URLs were used as text only. No pool material or miner output was used.

The [scores](generic-preflight.json) come from the exact `GENERIC` delta. The
kit's `adapterexec` verified the registry Keccak and loaded the package on the
published ModernBERT foundation. The pinned tokenizer rendered the kit's
`Task` / `Answer` template with a 512-token limit. The existing `score_pairs.py`
from `bd03fd1:track2/adapter/score_pairs.py` compared the raw float scores.

| Change to the worse answer | Generic ordered correctly |
|---|---:|
| Flip the verdict with evidence unchanged | 3/8 |
| Substitute the URL with verdict and evidence unchanged | 5/8 |
| Total | 8/16 |

All four unsafe controls ranked the false-safe answer above the supported unsafe
answer. This is a diagnostic of the judgment component. The probe does not replay
the validator's truth-source comparator, score fusion, or qualification pool.

Before registration, freeze an independent cohort with timestamped references,
capture complete answers from unrelated public miners, and keep URLs and miner
styles from training out of the holdout. Include unsafe answers that falsely say
safe, benign answers that falsely say unsafe, and responses about a different
URL. Compare the challenger with both the exact generic adapter and the boolean
comparator. Advance only if the challenger improves measurement on the same
holdout, especially on false-safe and wrong-URL pairs, and the fused result
changes a reproducible check-before-opening workflow for the better.

## V2 and V3 (2026-11-08)

V1 reached 72.9% on its synthetic test split and 13/21 on the fresh CERT cohort, losing 7
decision pairs that GENERIC ordered correctly; it was rejected ([EXPERIMENT_V1.md](EXPERIMENT_V1.md)).

### Data and licences

[`fetch_sources.py`](fetch_sources.py) snapshotted each source on 2026-11-07 ~21:35 UTC with its
sha256 and the licence text quoted from the publisher ([manifest](evidence/v2-data/sources-manifest.json)).

| Source | Use | Licence |
|---|---|---|
| CERT Polska Warning List | unsafe hosts | any purpose including commercial; attribution not required |
| Majestic Million (top 50,000, minus anything CERT lists) | safe hosts | CC BY 3.0; attribution: The Majestic Million, Majestic-12 Ltd |
| Public Suffix List | registrable-domain splits | MPL 2.0 |
| Feodo Tracker, SSLBL | fetched, unused (5 IPs; SSLBL deprecated) | CC0 |

Excluded for their terms: OpenPhish (no commercial use), URLhaus (commercial use may need a paid
subscription), Tranco (includes CC BY-NC data), PhishTank (needs an account). No pool row, miner
answer or captured response is used for training. Only list membership and Majestic rank are
facts about a real domain; every other check result in an answer is synthetic text.

[`build_pairs_v2.py`](build_pairs_v2.py) ([`synth.py`](synth.py)) builds pairs over ten kinds:
false safe (weak evidence, contradiction, URL-only), the same three for false unsafe, wrong URL,
stale, unsupported and non-answer. Splits are hashed by registrable domain; probe, V1-cohort and
IANA domains are excluded. [`audit_splits_v2.py`](audit_splits_v2.py) passes (no shared
registrable domain across train/val/test/H1). The kit's `--check-data` gate passes
([V2](evidence/v2-data/check-data.txt): probe 64.1%, length 51.1%).

### Holdouts

- **H1**, 200 pairs, frozen and committed before training ([gz](evidence/v2-data/holdout-h1.jsonl.gz),
  sha256 `06747f29…a388`): domains disjoint from training, two response formats and two prompt
  wordings never used in training (113 pairs use an unseen format).
- **H2**, real answers: 20 hosts from a reserved hash bucket (12 CERT-listed, 8 Majestic), frozen
  by [`h2_cases.py`](h2_cases.py) before any call; the hardened collector captured public miners'
  answers. 25 decision pairs (correct vs incorrect miner, LiveCert excluded) and 37 constructed
  wrong-query controls ([evidence](evidence/h2-r1)). Labels mean list agreement, not ground truth.
- **Probe**: the 16 controlled pairs above.

All scores are from the node runtime ([`measure_v2.py`](measure_v2.py)): three `adapterexec`
workers, runtime-reported keccak checked, identity echo and input_root checked on every batch,
f32 bits kept, each package at its own `max_tokens` (both 512).

### V2 result (`URL_SCAN_v2`, keccak `0x9d260a75…669364`)

| Set | n | V2 | GENERIC 900005 | Length | Bag-of-words |
|---|---:|---:|---:|---:|---:|
| H1 | 200 | 138 (69.0%) | 108 (54.0%) | 103 (51.5%) | 128 (64.0%) |
| Probe | 16 | 10 | 8 | 8 | 8 |
| H2 decision | 25 | **1** | 24 | 24 | 15 |
| H2 wrong-query | 37 | 30 | 12 | 6 | 5 |

Synthetic test 80.0% (400 pairs). adapterbuild and adapterexec gave identical bits on the kit's
verify input (`0xbf82b1f3`). V2 fails the bar: under 80% on H1, and inverted on real decisions.

**Diagnosis.** V2's score tracks the response format and length, not the verdict. Every answer
in the long CERT-citing format (≈2,900 characters, truncated at 512 tokens) scored about −1.7
whatever its verdict; the short false-safe format scored about −0.4. Within one format the order
was mostly right (wrong-query 30/37). V2 had been trained almost only on same-format pairs matched
in length, so nothing taught it to compare scores across formats or long, truncated bodies.
GENERIC's 24/25 equals the length baseline: real correct answers are the longer ones.

### V3: the final iteration under the kill rule

[`synth_mimic.py`](synth_mimic.py) adds five renderers copying the field structure of public miner
responses (field names, nesting, repeated summaries, bodies over 512 tokens), filled from the same
synthetic records; no response text is copied. 60% of V3 pairs cross formats at natural lengths,
with format drawn independently of the label; contradiction kinds are weighted up. 5,000 pairs,
3 epochs, H1 unchanged. Gate: probe 63.2%, length 51.9% ([evidence](evidence/v3-data)).
Advance only if V3 reaches ≥80% on H1 and at least matches GENERIC on H2 decision pairs.

## Open gaps

- The hidden pool's pair construction, truth sources and fusion thresholds are not public; H2 is
  our proxy and labels by CERT/Majestic membership only.
- V3's format renderers are shaped after observed public miner responses; that improves fit to
  the five current contributors and may not generalise to a new miner's format.
- The bag-of-words probe sits near the kit's 65% limit by design (non-answers, stale dates).
- Stage 1 for V2 first ran at 03:07:04 UTC without `GPU.lock` while another lane held it
  (3.7 s, no OOM seen); it was re-run under the lock with identical keccak and bits.
- V1 captures (Nov 7) used the old collector, which followed redirects without validation;
  SSRF there cannot be excluded after the fact. Ids and YAML URLs were numeric/https.
- Nothing is hosted, signed or registered. A durable runnable-URL host is still needed.
