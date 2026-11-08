# SANCTIONS_SCREENING_MATCH: pool-measured lane, stopped at step 1

**Status: stopped. No measurement made, nothing trained, nothing hosted. Not ready to sign.**

The plan needed the family's eval-pool snapshot rows, split 60/40 into DEV and SEALED. Those rows
are not public. Telegraph's docs offer no route to read them, so the split, the DEV table and the
SEALED run all have nothing to work on.

## What was checked (2026-11-08, ~15:34 UTC, plain GETs only)

| Source | Finding |
|---|---|
| `GET https://devnode.telegraphprotocol.com/api/evalpool/status?intent_id=SANCTIONS_SCREENING_MATCH_GENERAL` | 778 eligible, 112 admitted, 3 rejected; 11 submitters; snapshot `corpus_version` `ce22e9e524012bdf2a66016952c7437237fee07f36325636d84db62423a1857d`, 391 qualification / 387 ranking, published 2026-11-05T08:47:55Z, active from epoch 2018 (current 2043). This returns counts only, no rows. Saved as [evidence/evalpool-status-2026-11-08.json](evidence/evalpool-status-2026-11-08.json), sha256 `d36c29a0a8f5b6d0c5a24c8d1333c537fad517c51fe101351673df427bd9a773`. |
| `GET /api/evalpool/submissions/mine?submitter=0xdAd2…A39e&intent_id=…` | `{"count":0,"rows":[]}`. We have no rows in this pool. The route returns only the caller's own rows anyway. |
| anjoman.ai/docs/scoring/contribute-evaluation-data (Nov 1 revision, sha256 `dc0f3149…39e6fa`) | The documented routes are `status`, `submissions/mine` and a signed `POST submissions`. No route reads snapshot rows. The page says "There is no public endpoint" for the per-use record. |
| anjoman.ai/docs/bounties/evaluation-material (Oct 29) | Evaluation work is "not a public dump of hidden test cases". It also asks contributors not to publish hidden qualification prompts or expected answers. |
| anjoman.ai/docs/scoring/build-a-scoring-module | The "15 public pairs" exist only as a registration-time batch the node sends to your runnable URL. "The hidden competition split is never sent to your endpoint." |
| docs/TELEGRAPH_FACTS.md (Nov 1) | Already recorded: "pools are not public". |

No undocumented routes were probed.

## Why #46 scored 7/15

Evidence: [evidence/registration-46.json](evidence/registration-46.json), and G40 in the
`claude/evaluators-status-a51518` lane's track2/GAPS.md.

- The infrastructure worked. The node sent one batch of 30 texts, the longest 279 tokens. The endpoint
  replied in 54.4 s with the correct identity. The judgement is what failed.
- 7/15 is chance. With p = 0.5, P(≥7 of 15) ≈ 0.70. The v3 package carried no usable signal on real
  pool texts. `0x3035…` (#31) scored 9/15 on the same check, which is also near chance.
- The likely cause, which is inferred and not measured: v3 trained only on our own answer shapes.
  Training p99 was 154 tokens, against 279 tokens in the pool. Our 72.5% probe was self-written and
  shared those assumptions. This is the same failure as the SECURITY_REVIEW and URL_SCAN lanes.
- `fanout_exec.py` logs batch sizes and timing only, so the 15 public pairs were never captured.

## What would make a pool-faithful measurement possible

1. **Capture the 15 public pairs at the next registration.** If the runnable endpoint logs the
   request texts, they become the one public sample of the pool's answer distribution. This needs
   a registration, which means a signature and the bond, and the pairs may not be stable between
   checks. Logging what the node sends to our own endpoint is ours to keep, but redistributing it
   should be checked against the evaluation-material page first.
2. **Ask Telegraph for a public dev split** of the SANCTIONS pool, or for its answer-format
   statistics. That means a message to the organiser, which needs the owner's yes.
3. **Use real miner answers that we did not write.** Codex's frozen capture
   (`2026-11-01-miners-r1`: 232 responses, 32 pairs, 8 names) is the nearest thing that exists. It
   cannot rank packages: its labels are ours, and the longer-answer baseline already scores 1.0 on
   it. It would need far more names and independent labels to separate candidates.

Until one of these exists, training another version repeats the 34-version loop. Every one of those
versions was selected on a distribution we wrote ourselves.
