# Expansion targets — the undefended intents, measured 2026-08-30

Recon prompted by the observation that FACT_CHECK and AI_TEXT_DETECTION have only two miners each
and both look weak. They do, and they are not the only ones. This is what the live node says, and
what the two champion scorers say when run locally.

Sources: `/engine/v1/intents` (miner counts), `/scores?intent=X` (per-epoch results), `/api/miners`
(base URLs and manifests), `/api/wasm` (champion scorers),
`explorer.telegraphprotocol.com/api/daemon/api/questions` (real routed traffic). All read 2026-08-30.

## 1. The undefended intents

**Correction, second pass.** The first version of this table said every incumbent scores 0.0. That
was a formatting error on my side — `toFixed(8)` rounded real values like `1.674e-10` to
`0.00000000`. The FACT_CHECK and AI_TEXT_DETECTION incumbents **do** score; they score minutely. The
intents with a genuine 0.0 are the ones whose incumbents fail with an upstream error. The conclusion
does not change, but the bar to beat is a number, not zero.

| intent | miners | bar to beat (epoch 292) | incumbents |
|---|---:|---|---|
| **SENTIMENT_ANALYSIS** | 2 | **0.0** (genuine) | `telegraph-ai-miner-node` upstream 404, `textprocessing-sentiment` upstream 405. Both failing four straight epochs. |
| **NEWS_HEADLINES** | 2 | **0.0** (genuine) | `newsapi` upstream 400 every epoch; only one miner appears in the rows at all. |
| **CONTENT_EXTRACTION** | 2 | **0.0** (genuine) | `microlink-url-extraction` answers and still scores 0.0. |
| **AI_TEXT_DETECTION** | 2 | **1.674e-10** | `veritarach-ai-text-detector` — flat at 1.67e-10 for five epochs. `bittensor-sn32-itsai` upstream 400. |
| **FACT_CHECK** | 2 | **3.799e-9** | `tavily` — 3.4–3.8e-9 recently, but spiked to **1.0** at epoch 289 and 0.0035 / 0.0098 at epochs 282 / 284. `assay-miner` upstream **403 every epoch** (see §2). |
| **TEXT_AUTHENTICITY_CHECK** | **0** | — | **Never scored. No miner has ever served it.** |

## 2. Why the incumbents are failing

**`assay-miner` (FACT_CHECK) cannot ever score.** Its manifest sets
`base_url: https://raw.githubusercontent.com/GreatSage-dev/Assay/main` and declares its endpoint as
`path: /miner.py, method: POST`. GitHub's raw file host does not accept POST, so every call returns
403. It has failed identically in every epoch on record. This is not a miner that is losing; it is a
manifest pointed at a source-code file.

**`veritarach-ai-text-detector` returns a classification, not an answer.** Its live output is
`{"confidence":0.9998700618743896,"label":"human_written"}` — no prose, so there is nothing for
Telegraph's converter to turn into a scoreable answer. It used to score **0.33** at epochs 263–267
and collapsed to ~1e-10 from epoch 268 onward, which is when the champion scorer changed underneath
it. It has not adapted since.

`tavily` is the only genuine competitor in the group.

## 3. Measured: what actually scores in these two intents

Both champion scorers were downloaded and run locally. Neither resembles the 24 MB MiniLM modules
that score weather, SSL and storm — `fact_s01.wasm` (reg 1582) is **11 KB** and `aidet_s2.wasm`
(reg 1286) is **1 MB**. They behave completely differently, and the restatement fix from
[EPOCH_292_AUTOPSY.md](EPOCH_292_AUTOPSY.md) does **not** transfer unchanged.

### AI_TEXT_DETECTION — the incumbent's answer shape is the whole problem

Scored against `aidet_s2.wasm` on the real routed question observed on this intent
("Was the AI copyright notice against Luanti valid?") with an LLM-style ground truth:

```
answer shape                                          score
the incumbent's exact live output shape               0.0000000000
  {"confidence":0.99987,"label":"human_written"}
bare label "human_written"                            0.0000000000
"This text appears to be human written."              0.0000000000
hedged statistical-detector prose                     0.0000000003
prose that answers the routed question                1.0000000000
restated + prose that answers the question            1.0000000000
```

**The bar is 1.674e-10. A prose answer measures 1.0.** That is a margin of roughly six billion
times. Even the hedged detector prose, at 3e-10, already beats the incumbent.

### FACT_CHECK — winnable, but `tavily` is a real competitor

`fact_s01.wasm` is a **step function with disjoint bands**, not a gradient. Appending true filler to
a correct short verdict: 13–17 words scores 0.99999994, **19–33 words collapses to 2e-8**, and 35+
words returns to 1.0. Small wording changes flip between about 0 and about 1. That is exactly what
`tavily`'s history looks like — 1.0 once, 0.0098 once, 0.0035 once, and about 3.5e-9 the rest of the
time. It is a lottery, and the incumbent buys one ticket per epoch.

Scored across five claim-check questions with LLM-style ground truths:

```
answer shape                        beats the 3.8e-9 bar
empty answer                        0/5   (the only shape that scores an exact 0.0)
bare verdict label                  0/5
label + confidence JSON             0/5
short verdict only                  0/5
verdict + one evidence sentence     3/5   (4.5e-9, 7.1e-9, 1.0, 1.3e-9, 6.1e-9)
full ground-truth-style answer      5/5   (1.0 every question — but this IS the GT, an upper bound)
restated + verdict + evidence       3/5   — the restatement prefix HURTS here
"insufficient evidence" boilerplate 0/5   (1.5–2.4e-9, just under the bar)
```

**Two things follow.** A genuine verdict-plus-evidence answer beats `tavily` in most epochs but not
all, and it must carry real evidence prose — a bare verdict loses. And **FACT_CHECK must be exempted
from the `sendAnswer` restatement**: the prefix took a 5/5 shape down to 3/5. A per-route opt-out in
`restate.ts` is a prerequisite for that endpoint, not an afterthought.

## 4. What this is worth, honestly

**The upside.** Rank 1 in AI_TEXT_DETECTION is close to unloseable, and each entry takes its intent
from 2 miners to 3 — exactly the miner-count half of the eligibility rule.

**The limits, stated plainly:**

- **These intents are nearly dead.** In **500 routed questions over the last 720 hours**, FACT_CHECK
  appeared **zero times** and AI_TEXT_DETECTION appeared **once**. The 100-real-requests half of
  eligibility will never be met here — it is not close.
- **The one AI_TEXT_DETECTION question was not an AI-detection task.** It was "Was the AI copyright
  notice against Luanti valid?" — a general question the router mislabelled. A real detector answers
  it wrongly by construction, which is precisely how `veritarach` ends up at 1e-10. Any endpoint we
  build has to answer the question it is actually sent, and run a genuine statistical analysis only
  when actual text is supplied. Both paths have to be honest.
- **Judging averages across intents** (organizer, 2026-08-29) and the formula is not final. Two more
  rank-1s at near-zero traffic should help under any reasonable averaging, but nobody has confirmed
  that ineligible intents count at all.

## 5. Serviceability

Ordered by how honestly we can answer, which is the only order that matters — the `SPORTS_SCORE`
decision (a free API confidently returned the wrong fixture, so the intent was dropped) is the
precedent, and a confidently wrong answer is worse than no answer.

### AI_TEXT_DETECTION — cheap and honest, if it answers two shapes

Two code paths, both truthful:

1. **Actual text supplied** — report measurable statistical properties (sentence-length variance,
   type-token ratio, repetition, punctuation regularity), say what they weakly indicate, and give a
   calibrated confidence that is usually low. The science does not support confident classification
   and the answer must not pretend otherwise.
2. **A general question routed here instead** — answer the question in prose, and say plainly that
   no text was supplied to analyse.

Path 2 is what the live traffic actually needs, and it is what measures 1.0.
`TEXT_AUTHENTICITY_CHECK` (zero miners) can be served by the same endpoint; alone it makes that
intent 1 miner, still under the floor, so it is only worth adding alongside.

### FACT_CHECK — servable, with discipline

Needs evidence retrieval: Wikipedia/Wikidata plus the existing OpenAlex client in `papers.ts` covers
a real share of checkable claims. The measured requirement is a **verdict plus at least one real
evidence sentence** — bare verdicts and label JSON both lose to `tavily`. `insufficient_evidence`
must be a first-class answer, and it measures just under the bar, so it will cost the rank in epochs
where the evidence genuinely is not there. That is the correct trade.

### SENTIMENT_ANALYSIS — BUILT, MEASURED, AND REJECTED (2026-08-30)

**This was my recommended first target and the measurement killed it.** Recorded in full because
the reasoning was wrong in an instructive way.

The endpoint was built: a deterministic lexicon with negation and intensifier handling, no upstream
dependency, 8 passing tests. It works. Then it was scored against the live champion
(`sa_pure.wasm`, reg 1286's sibling for this intent), and the scorer turned out to be **binary** —
1.0 for an answer close to the ground truth, 0.0 for everything else:

```
answer shape                                case1  case2  case3
our shipped lexicon answer                  0.000  0.000  0.000
the same, without the restatement prefix    0.000  0.000  0.000
GT-style opener first                       0.000  0.000  0.000
question echoed, then verdict               0.000  0.000  0.000
a close paraphrase of the ground truth      1.000  0.000  0.000
the verbatim ground truth                   1.000  1.000  1.000
```

**The bar is not "beat 0.0".** Both incumbents score 0.0, so an answer that also scores 0.0 *ties*
with them and takes whatever rank the tie-break gives — not a win we control. Crossing requires
reproducing the ground truth, which we cannot do generically.

Worse, two of the three real questions ever routed here ask for sentiment **toward a token
contract** (`0x28C6c0…`, `CVE-2021-44228`) — that needs social data we do not have. This is the
`SPORTS_SCORE` situation exactly: most of the traffic is what we cannot honestly answer.

The endpoint and its tests were deleted rather than left as dead code. Declaring an intent we score
0.0 on would also drag the cross-intent average the organizers say judging uses.

## 6. Recommended order

1. **AI_TEXT_DETECTION** — **DONE.** Built, measured (4.5e-10 / 1.0 / 1.0 against a 1.674e-10
   bar), deployed, and declared in `miner.yaml`. Awaiting the operator's `updateMiner` signature —
   runbook at the top of [../REGISTRATION_UPDATE.md](../REGISTRATION_UPDATE.md).
2. ~~**SENTIMENT_ANALYSIS**~~ — **rejected on measurement**, see above. Do not revisit without
   re-running the scorer: the conclusion rests entirely on `sa_pure.wasm` being binary.
3. **FACT_CHECK** — winnable but needs real retrieval and a restatement exemption. Not attempted:
   with four or five epochs left it is more work than AI_TEXT_DETECTION for a contested slot.
4. **CONTENT_EXTRACTION** — mostly existing code in `src/extract.ts`. Untested against its scorer;
   assume nothing until it is measured, which is the lesson SENTIMENT_ANALYSIS just taught.

**The general lesson from this round:** every intent's champion scorer behaves differently, and
three of the four examined so far are step functions with disjoint bands. Miner counts and
incumbent scores tell you where the opportunity *might* be; only running the intent's own scorer
tells you whether you can take it.

Every entry is a manifest change and one `updateMiner` signature, and registration is effectively
immutable — so **batch them into a single update**, sandbox-validate first per CLAUDE.md rule 3.

## 7. The multiplier, and where it does not apply

The restatement change in [EPOCH_292_AUTOPSY.md](EPOCH_292_AUTOPSY.md) applies to a new endpoint for
free, because it lives in `sendAnswer` rather than in a domain module. **But it is not universal** —
it measures neutral-to-positive on AI_TEXT_DETECTION and actively negative on FACT_CHECK. A
per-route opt-out is a prerequisite for the FACT_CHECK endpoint.
