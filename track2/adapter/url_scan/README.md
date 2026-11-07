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
