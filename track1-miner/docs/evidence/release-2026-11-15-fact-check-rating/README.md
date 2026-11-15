# Release 2026-11-15 (second): fact-check rating by the model, paper-fraud retraction notices

Build `7182410`, production `https://miner-712vfn5wr-wukong4.vercel.app` (`dpl_6njMDuDGKqj19C55AjRB6xeHJMTa`),
aliased to miner-wine. Rollback target: `miner-9l26rqk6f` (`69afe87`). Registration 5232 and `miner.yaml` unchanged.

## What changed

- `factcheck.ts` (`d261139`): after retrieval, the model rates the claim against the Wikipedia evidence (sent as
  JSON data) on the schema's seven verdicts. A quote is kept only if it appears in the evidence; without one the
  rating is labelled as knowledge-based (confidence 0.65; `sources` names the model first). No
  model answer leaves the word-rule answer unchanged. FACT_CHECK epoch 2099: 0.8432, rank 11/19.
- `paperfraud.ts` (`7182410`): OpenAlex now ranks the Lancet's 2010 retraction notice above the 1998 Wakefield
  paper; the notice was reported as "not flagged as retracted". The paper is now preferred, and a matching notice
  counts as a retraction. Found by the live suite failing in preflight.
- `scores.yml` (PR 25 and `PR/score-snapshots-quality`): hourly score recording, history carried by artifact.

## Gates

Unit 1014/1014 and tsc clean in the deploy tree at `7182410`; preflight 7/7 (`preflight.txt`). The preflight on
`d261139` was 5/7: the paper-fraud live test (fixed here) and ONCHAIN_METRIC (Blockscout did not answer; 43/43 on
a re-run).

## Probes

`fact-probes-before.txt` (6/15) and `fact-probes-after.txt` (12/15 on the final build; 13/15 on `d261139` an hour
earlier, so the model's ratings vary between runs). The expected labels are the author's, not a scorer's.

## Not verified

The score effect (G306), latency (G307), and the hourly schedule: only the dispatched run (17:08 UTC) had run by
17:59 UTC; the 17:23 scheduled run did not appear, so the carry-forward is untested.
