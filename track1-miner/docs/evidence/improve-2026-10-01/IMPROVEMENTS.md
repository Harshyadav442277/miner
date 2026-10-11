# LiveCert improvements — 2026-10-01

## Changes

- URL scans with different subjects now share an in-flight URLhaus feed download within the same process. Successful lists retain the existing fifteen-minute cache; failures release the pending read so recovery can retry. No stale feed is served as fresh evidence.
- Model-generated sentiment and classification explanations reject extra sentences, extra label separators, and responses over sixty words. Invalid model output follows the existing deterministic fallback.

## Validation

- `npm run typecheck`: passed.
- `npm run test:unit`: 771 passed, zero failed. Output: `unit-tests.txt`.
- Concurrent feed regression: twelve waiting scans make two upstream reads; a failed batch can retry successfully; a completed batch is reused.
- Model fallback regression: a second conflicting sentence, an additional separator, and excessive output are rejected.

## Live baseline and limits

Registration 2750 was active. The saved audit has epoch 376 scores for 31 of 36 intents and six rank-1 rows. Five missing rows in this epoch are not evidence of endpoint failure. `rank-audit.json` and the per-intent files preserve the baseline.

IP_GEOLOCATION's epoch-376 zero was a Telegraph request-builder HTTP 429 before the miner request, rather than a LiveCert runtime failure. Its epoch-375 score was 0.9959303.

The live correctness probe passed 34 of 36 intents. Its IP geolocation assertion pins a Google address to Tokyo from older provider evidence; the current response names a different location. Its sentiment assertion requires exact input words even when the model paraphrases them. Neither failed assertion alone proves the live answer is wrong, and neither assertion has been weakened to claim a passing result.

These code changes are local, uncommitted, and undeployed. No leaderboard improvement is established. The registered manifest, deployment, and supported intents were not changed. Scheduled monitors remain disabled; no automatic commits were introduced.
