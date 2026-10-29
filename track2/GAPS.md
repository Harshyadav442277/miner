# GAPS — Track 2 honesty ledger

The Season I gaps (G13–G27: rank_answer corpora, calibration thresholds, registration 1882) were cut on
2026-10-29. The modules they describe are retired: deleted from the tree on 2026-10-23, and the V2 registry no
longer lists 1882. They are in `git log -p -- track2/GAPS.md`.

The Season II gaps (G29 the kit refuses FACT_CHECK and WEB_SEARCH; G32 the converter's ModernBERT mismatch) are
on branch `claude/wasm-track-2-quality-e21db3`.

## G33 — the Season II evaluator work predates protocol V2 (2026-10-29). `OPEN`

V2 accepts only float model adapters in WASM and registers them per family with `registerWasm(hash, url,
prefix, feeAddress, runnableUrl)` (anjoman.ai/docs `whats-new-v2`, updated 2026-10-27). The 31 comparators and
the LLM_OUTPUT_EVALUATION adapter were built for the earlier formats. Whether either still loads, and which
family each would register on, has not been checked.
