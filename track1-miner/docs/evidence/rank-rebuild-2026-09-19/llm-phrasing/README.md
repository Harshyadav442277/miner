# llm-phrasing lane — generative answers for the two prose intents

Run 2026-09-19 from worktree revision `0074f14` (detached). Nothing committed, nothing
deployed, `track1-miner/miner.yaml` untouched.

## What was measured, and what it says

TEXT_CLASSIFICATION (champion reg687 `tc_pen0`) and SENTIMENT_ANALYSIS (reg646 `sa_pure`) have
scored our miner exactly **0.0000 in every epoch from 329 to 343** while LLM-backed miners take
1.0000 in roughly a third of them (`score-rows.txt`). The lane asked whether a generative answer
changes that.

**1. The champions score wording, not correctness.** Both return essentially 1.0000 or 0.0000. A
deliberately WRONG label in the right register scored the same 1.0000 as the right one. This is
GAPS G154's finding reaching two more intents.

**2. Only one register survives.** Ten whole-answer shapes over six classification inputs
(`register-search.txt`): our production template 0/6, every short third-person paraphrase 0/6,
txlens's terse shape 0/6, and only chainsight-oracle's long hedged shape — label, then 25-45 words
of "The user is mentioning …, which …, making <label> the most relevant category" — scored anything
at all. That shape is what `src/prose-phrase.ts` now prompts for.

**3. The instrument is barely an instrument.** Three consecutive calls to the SAME crossing miner
with the SAME question produced three different reference sentences, and one fixed candidate scored
1.00, 0.00, 0.00 against them (`register-search.txt`, second table). Two full bench runs of the same
shipped code over the same twelve inputs disagree per input — SENTIMENT run 1 gave 2/6 and run 2
gave 4/6; the shipping/parcel classification crossed in run 1 and not in run 2
(`bench-tuned-maxtokens200.txt` vs `bench.txt`).

**4. The validity gate mostly fails.** Two independent crossers agree at >=0.98 on only **2 of 6**
inputs per intent. Where they disagree there is no valid reference, so the matrices are reported in
full and labelled rather than filtered.

## The before/after matrix

`bench.txt`, against the code as it stands. "Crossed" means >=0.9 against at least one live crossing
reference; the min-over-references column is 0.000 for every candidate including the crossers
themselves, which is what a failing gate looks like.

| intent | inputs | gate passes | ours-before crossed | ours-after crossed |
|---|---|---|---|---|
| TEXT_CLASSIFICATION | 6 | 2/6 | 1/6 | 4/6 |
| SENTIMENT_ANALYSIS | 6 | 2/6 | 1/6 | 4/6 |

Read it as: the template is structurally unable to match an LLM-written truth, and the model's
register can match one sometimes. **It buys a lottery ticket in place of a certain zero. It is not
a fix, and no rank gain is claimed** — only a scored epoch is a verdict (G62).

## Model cost

17 calls, all 200. Latency **p50 757 ms, p95 1130 ms** (budget 4.5 s, watchdog 11 s). **389 tokens
a call** on average (197 prompt, 192 completion at `reasoning_effort: "low"`).

Free plan, per model: 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD. At 389 tokens the daily **token**
budget binds first: **513 calls/day/model, 1,539 across the three**, and **20/min/model, 60/min**
across three. Scoring costs 2 calls an epoch; the rest is spot-check and validator traffic.

## Hidden inputs — not available for these two intents

Every competitor `failure_reason` on `/scores` for both intents over epochs 288-343 is a transport
or upstream error; none carries a question or a passage (listed in full in `score-rows.txt`). Unlike
the intents GAPS G152 lists, nothing leaks here. The bench inputs are therefore **ours**, written in
the canonical shapes — which is a real weakness of the measurement, not a detail.

## Open risks

- **The registered manifest now misdescribes both routes** — it says "no model", "nothing is
  fetched", and promises the answer names the matched words. See `manifest-divergence.txt`. This is
  the operator's decision and it gates enabling the key in production.
- **Rate limits under spot-check traffic.** 60 calls/minute across three models is the ceiling. A
  burst of validator spot-checks past that gets 429s; the path then answers with the keyless text
  for 60 s, which is correct but is the old zero-scoring answer.
- **The converter step is not modelled.** The node summarises the whole payload to ~32 words before
  the champion sees it (`docs/CONVERTER_MODEL.md`). This bench scores the raw `reason`, so a shape
  that wins here can still lose after the summary.
- **Label drift.** The model's label now wins over the keyless one when they differ, on both routes.
  The gate keeps it inside the offered set, but it is a model deciding, and the 0.7 confidence is
  the only signal that only one method supports it.
- **Two runs disagree.** Anything in this folder measured on six inputs is a filter, not a verdict.

## Files

| file | what it holds |
|---|---|
| `bench.txt` | the before/after matrix against the shipped code, with every answer quoted |
| `bench-tuned-maxtokens200.txt` | the same bench one revision earlier — kept because it disagrees |
| `bench-before-tuning.txt` | the first run, short-paraphrase register, 0/6 after |
| `register-search.txt` | the ten-shape search and the reference-stability table |
| `score-rows.txt` | epochs 288-343 for both intents, champion identity, the failure_reason survey |
| `fail-closed.txt` | both routes with no key, answering exactly the keyless text |
| `manifest-divergence.txt` | what the registered YAML promises and no longer does |
