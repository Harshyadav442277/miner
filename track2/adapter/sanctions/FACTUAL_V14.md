# Fixed-weight context transfer diagnostic

Frozen before any reserved-cohort model score: v3 parent weights, no training,
standard package, max_tokens 512. V13's configuration and decision rule remain
unchanged. The official kit at revision `1ed063e2f006` permits 512 tokens:
https://github.com/telegraphprotocol/telegraph-wasm-baseline/blob/1ed063e2f0066cfaf0e124d66ec6a17b7a6121fd/float_runtime/train_adapter.py

Our older 256-token limit was a training/package choice. An independent exact-value
span audit on the unchanged old 62 pairs finds both machine claims visible in
43 pairs at 256 and all 62 at 512. Its actual visible-length reference rises from
42/62 to 46/62 (74.19%). No model has been scored at 512 yet.

Re-export v3 with the larger limit as v14. Preserve the original checkpoint and
packages. After Stage1, assert exact equality of all 178 named package tensors,
including dtype/shape. Only package metadata/context can change. Score with
`measure_miners.py ... --versions 14 --max-tokens 512`; the script rejects a
package/measurement context mismatch. Keep original bodies, labels and pair hashes.
Compare v14 against 46/62, and v3 at 256 against 42/62; do not imply an equal-input
model comparison. Compute the separate 512-token claim audit after scoring.

This is a deterministic context intervention on this development sample, with
inherited v3 source exposure. V3 was trained at 256; v14 has not trained at 512.
The kit recommends matching those windows, so this remains an experimental
context-transfer result even if its score improves. No training/runtime fidelity
claim is extended to longer inputs without evidence. No submission or registration
readiness follows from these one-sided errors, and no pool rows are accessed.

Serialize Stage1/node execution after the v13 pipeline finishes. No GPU training
and foundation workers run together. Preserve hashes, commands and failures.

Result: actual node **33/62 (53.23%)**, below the 46/62 (74.19%) visible-length
reference. Rejected; all178 tensors match v3 exactly. More visible context alone
did not improve this sample. The reserved69 capture was not scored.
Post-Stage-1 SHA-256 `792d07d736e48afcaeac9c8c7aed5c418de4d510e1c8ca11452d2e6cba866170`.
