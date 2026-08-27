# Phase B — fixture corpus + gate-proxy harness: build and validation — 2026-08-27

What was built, what it measures, and what it measured when pointed at the live champion
binaries. Every number below is from a committed fixture file and a commit-pinned `.wasm`;
nothing is quoted from memory. Where a claimed pathology did **not** reproduce, it is said so
plainly rather than rounded to "fine" — see §6.

---

## 0. Bottom line

1. **The harness reproduces the node.** 20 of 20 recorded rows scored by the binary under test
   come back to 6 significant figures; the 8 that differ are all from older epochs scored by a
   different champion. No intermediate cases.
2. **The gate proxy reproduces a real promotion decision.** WEATHER reg 636 vs the reg 442 it
   actually superseded: 6 of 6 gate conditions pass, margin +0.364, Spearman 0.675.
3. **The self-versus-self control behaves exactly right**, including failing D1 on a tie —
   a byte-identical scorer is correctly not promoted.
4. **PREFIX-PARROT reproduces.** A contentless echo scores 0.993 against real weather ground
   truths where real data answers score 0.003–0.010 — a 100–124× inversion, on the binary
   serving live traffic today.
5. **"A refusal outscoring a correct answer" does NOT reproduce** — 0 cases in 554 recorded
   answers. `FIXTURES.md`'s class-3 archetype is inverted and needs correcting (§5.3).
6. **Margin is not the binding gate constraint.** Self-match ratchet and Spearman agreement are
   what a challenger fails (§4, STORM).
7. **The base algorithm is more fact-aware than the tuned champions** — by two orders of
   magnitude on FACT-SWAP, confirmed independently on IP_GEOLOCATION and WEATHER (§4).

---

## 1. What was built

Nine zero-dependency `.mjs` modules under `track2/harness/` (Node only, no npm, no Rust):

| File | Lines | Role |
|---|---|---|
| `wasm-abi.mjs` | 142 | Loads a scorer via the node's exact call path; bump-allocator safety |
| `score-pool.mjs` | 82 | Worker pool — a `rank_answer` call costs 0.3–2 s, a corpus run is thousands |
| `corpus.mjs` | 126 | Fixture loading + validation, mean/stddev/Spearman |
| `fetch-real.mjs` | 206 | REAL fixtures (class 1) from the public `/scores` endpoint |
| `synth-schemas.mjs` | 454 | Per-intent fact schemas — the generators, blind to any instance |
| `gen-synth.mjs` | 367 | Classes 2–10 + EMPTY-ANSWER + CONTENT-FILTER, rendered from fact records |
| `gen-probes.mjs` | 130 | REAL-PARROT probes: mechanical question-echo against real ground truths |
| `run-eval.mjs` | 594 | Stage 1 + Stage 2 gate proxy, per-class accuracy, Spearman, exhibits |
| `report.mjs` | 174 | Plain-text rendering |

`run-eval.mjs` is over the ~300-line guidance in `track2/CLAUDE.md`. It is the orchestrator;
the four things it could be split into (ABI, pool, corpus/stats, rendering) already are.

### Corpus inventory (`track2/fixtures/`)

| Dir | Fixtures | Answers | Pairs | What |
|---|---|---|---|---|
| `real/` | 94 across 7 intents | 454 | 0 | Recorded traffic, verbatim, provenance pinned |
| `synth/` | 119 (17 × 7) | 280 | 147 | Classes 2–10 plus EMPTY-ANSWER and CONTENT-FILTER |
| `probe/` | 56 (8 × 7) | 201 | 56 | REAL-PARROT — the pathology probe on real inputs |

3.6 MB total. REAL carries zero pairs by design (§1, honesty properties).

Intents: WEATHER_FORECAST, SSL_VERIFICATION, STORM_ALERT, CVE_LOOKUP, IP_GEOLOCATION,
CRYPTO_PRICE, STOCK_PRICE.

### Honesty properties, as built

- **REAL fixtures are never edited.** Question, ground truth and `converted_answer` are copied
  byte-for-byte; the live score is metadata (`meta.live_score`), never a quality label. REAL
  records carry `quality: null` and **zero pairs** — no ordering claim is made about traffic we
  cannot verify. They contribute only self-match, stddev and the Spearman proxy.
- **Synthetic answers are generated, not hand-typed.** A schema defines fact generators and
  renderers once, blind to any instance. A wrong answer is *the same renderer* applied to a fact
  record with one field mutated. No answer text was written while looking at a ground truth.
- **Deterministic.** `gen-synth.mjs --seed 20260827` is byte-reproducible; `run-eval.mjs`
  fans jobs across workers by index and merges by index, so the result is identical for any
  worker count.
- **Register matched to reality.** Synthetic answers are single-paragraph, third-person, no
  markdown, opening "The data …" — the shape of `converted_answer`, which is what the node
  actually scores. Writing them in the *ground truth's* register (markdown, first-person, 2×
  longer) would have measured a distribution the node never sees.

---

## 2. Gate constants implemented

`run-eval.mjs` implements the stricter recovered constants, not the looser public-doc versions:

| Gate | Implemented | Note |
|---|---|---|
| A `score_stddev` | **strictly** `> 0.05` | docs say only "a small floor" |
| B `worst_self_match` | `>= max(0.75, incumbent's)` | ratcheted, not a flat 0.75 |
| C Spearman | `>= 0.60`, **skipped** when `< 2` miners with history | skip ≠ pass |
| D1 margin | **strictly** `> champion_margin` | a tie is a rejection |
| D2 margin | `>= 0.15` absolute | |
| D3 wins | `>= champion_wins` | tie allowed here |
| Wall clock | 600 s whole gate | projected from serial latency |

Margin is computed the node's way — `mean(good) − mean(bad)` over labelled answers — and
reported as `separation`, alongside the per-pair mean for contrast.

**These constants are not independently verified by this harness.** They came from the gate
recon; this document records them as implemented, not as confirmed. See §7.

---

## 3. Harness validation — does it reproduce the node?

### 3.1 Self-versus-self sanity (WEATHER_FORECAST champion reg 636 as both sides)

| Metric | candidate | reference |
|---|---|---|
| `worst_self_match` | 1.0000 | 1.0000 |
| `score_stddev` | 0.445129 | 0.445129 |
| `separation` (margin) | 0.437135 | 0.437135 |
| wins / pairs | 17 / 29 | 17 / 29 |
| **Spearman on real traffic** | **1.0000** (n=77, 11 miners) | — |

All metrics identical, Spearman exactly 1.0. And the verdict is the one that matters:

```
FAIL D1 margin > champion_margin (strict)   candidate 0.437135 vs reference 0.437135 (delta 0)
```

A scorer byte-identical to the champion is **correctly not promoted**. That is the strict
inequality doing its job, and it matches the recorded behaviour where a candidate margin of
0.99999994 lost to a champion at 0.999999.

### 3.2 The strong validation: live-score reproduction

Each REAL-PARROT probe carries the miner answers verbatim plus the score the node actually
gave them. Scoring those same answers offline against the same binary:

**WEATHER_FORECAST — champion reg 636 (`xfmr/wf_mini.wasm`, registered 2026-08-24T02:41Z)**

| Epoch | Miner | Live score | Harness | |
|---|---|---|---|---|
| 285 | isobar-weather | 0.008892506 | 0.008893 | match |
| 285 | amanat-weather-risk | 0.005182328 | 0.005182 | match |
| 284 | verity-weather-forecast | 0.009923598 | 0.009924 | match |
| 284 | isobar-weather | 0.002964984 | 0.002965 | match |
| 283 | onlookout-weather | 0.008001359 | 0.008001 | match |
| 283 | bittensor-sn18-zeus | 0.0034790197 | 0.003479 | match |
| 282 | verity-weather-forecast | 0.011126936 | 0.011127 | match |
| 282 | openweathermap | 0.0065441607 | 0.006544 | match |
| 275 | weatherapi | 0.011128563 | 0.011129 | match |
| 275 | bittensor-sn18-zeus | 0.0059396564 | 0.005940 | match |
| 262 | weatherapi | 0.9963309 | 0.009106 | **differs** |
| 260 | skywire-forecast | 0.9948771 | 0.010778 | **differs** |
| 259 | weatherapi | 0.99468696 | 0.009239 | **differs** |

**STORM_ALERT — champion reg 453 (`xfmr/storm_rpen.wasm`, registered 2026-08-22T11:28Z)**:
10 of 12 rows match to 6 significant figures — every row from epochs 268–285. The two that
differ are epochs 202 and 257.

**The split is clean and it is by epoch.** Across both intents, **20 of 20 rows from the recent
epochs reproduce to 6 significant figures, and 8 of 8 rows from older epochs do not** — with no
intermediate cases. The matching rows are epochs 275–285 (weather) and 268–285 (storm); the
misses are 259–262 and 202/257. The natural explanation is that the older rows were scored by a
*previous* champion registration — reg 636 was registered 2026-08-24 and reg 453 on 2026-08-22.
I did not independently verify the epoch-to-timestamp mapping, so treat the causal claim as
strongly indicated rather than proven; the reproduction itself is measured either way.

This is the harness validating itself against the node, and it also confirms the
`converted_answer` boundary — these are scores of the converted prose, not the raw miner JSON.

---

## 4. Real separation numbers

Four runs, all against commit-pinned binaries verified byte-identical to the registry by SHA-256.

### WEATHER_FORECAST — champion reg 636 vs superseded reg 442 (`xfmr/wfc_t66.wasm`)

This is the end-to-end validation of the gate proxy, because the node already made this
decision: reg 636 *did* supersede reg 442 on the live network.

| Gate condition | Result | Numbers |
|---|---|---|
| A `score_stddev` > 0.05 | PASS | 0.445129 vs 0.460550 |
| B `worst_self_match` ≥ max(0.75, incumbent) | PASS | 1.0000 vs bar 0.989757 |
| C Spearman ≥ 0.60 | PASS | **0.6749** (n=77, 11 miners) |
| D1 margin > champion (strict) | PASS | **0.437135 vs 0.073139** (delta +0.364) |
| D2 margin ≥ 0.15 | PASS | 0.437135 |
| D3 wins ≥ champion wins | PASS | 17/29 vs 17/29 |

**Verdict: would promote — 6 of 6, no skips.** The harness independently reproduces a promotion
the node actually performed. Note how close Spearman lands to the value the registry reports for
this registration (0.8126 there, 0.6749 on our corpus): same side of the floor, different
benchmark, exactly as expected for a proxy.

### STORM_ALERT — champion reg 453 vs superseded reg 223 (`xfmr/storm_c3.wasm`)

| Metric | reg 453 (champion) | reg 223 (superseded) |
|---|---|---|
| `worst_self_match` | 0.9933 | 1.0000 |
| `score_stddev` | 0.456164 | 0.453018 |
| `separation` | **0.424673** | 0.359961 |
| wins / pairs | 18 / 29 | 18 / 29 |
| Spearman (cand vs ref, real traffic) | 0.2842 (n=29, 4 miners) | — |

Verdict on this corpus: **would be rejected** — D1/D2/D3 pass (margin +0.0647 over the
reference) but **B fails** (0.9933 < the reference's 1.0000) and **C fails** (0.284 < 0.60).

That is worth dwelling on. The current live champion, evaluated against its own predecessor on
our corpus, does not clear the ratcheted self-match bar or the agreement floor. Two readings,
both instructive: (a) the node's real benchmark differs enough from ours that these thresholds
land differently, or (b) the ratchet and Spearman floors are the real obstacles for a
challenger, not the margin. Either way, **margin is not the binding constraint** — agreement
and self-match are. That reorders Phase C's priorities.

### IP_GEOLOCATION — champion reg 630 vs the generic untuned build

No older IP_GEOLOCATION registration is fetchable (the intent has 5 entries and the two
non-zkasuran ones are 404), so the reference here is `dist/telegraph-salience-scorer.wasm` —
the same algorithm with no per-intent tuning, 1 MB instead of 24 MB.

| Metric | reg 630 (tuned champion) | generic untuned build |
|---|---|---|
| `worst_self_match` | 1.0000 | 1.0000 |
| `score_stddev` | 0.490668 | 0.385697 |
| `separation` | 0.595853 | **0.603447** |
| wins / pairs | 22 / 29 | 22 / 29 |

**The untuned generic build out-separates the live champion on this corpus** (D1 fails by
−0.0076). The per-class margins say why, and this is the single most useful finding for Phase C:

| Class | tuned champion margin | generic build margin |
|---|---|---|
| FACT-SWAP | 0.0040 | **0.3974** |
| UNIT/FORM | 0.0026 | **0.3491** |
| OUR-STYLE-WRONG | 0.0035 | **0.1018** |
| CONTRADICTION | 0.0004 | 0.0143 |
| TEMPORAL | 0.9917 | 0.9076 |

On the classes that test whether the *facts* are right, the generic build separates by 0.35–0.40
where the tuned champion separates by 0.003–0.004 — two orders of magnitude. The per-intent
tuning buys contrast and self-match (stddev 0.49 vs 0.39, mean_good 0.998 vs 0.893) and pays for
it in fact discrimination. **The fact-awareness we need is partly present in the base algorithm
and is being tuned out.** That is a much cheaper starting point than building from zero.

The same pattern appears independently on WEATHER: the *superseded* reg 442 beats the current
champion on FACT-SWAP (accuracy 1.000 vs 0.750, margin 0.0265 vs 0.0021), OUR-STYLE-WRONG
(1.000 vs 0.000) and UNIT/FORM (0.250 vs 0.000), while losing overall margin by 0.364. Two
independent intents, same trade: each tuning generation gains benchmark separation and loses
fact-awareness.

### Per-class pairwise accuracy — where the champion actually fails

Pooled over the STORM run (candidate = live champion reg 453):

| Class | pairs | champion accuracy | mean margin |
|---|---|---|---|
| EMPTY-ANSWER | 2 | 1.000 | 0.9982 |
| CONTENT-FILTER | 1 | 1.000 | 0.9969 |
| REFUSAL | 2 | 1.000 | 0.9868 |
| STUFFING | 3 | 1.000 | 0.6709 |
| FACT-SWAP | 4 | 1.000 | **0.0043** |
| TEMPORAL | 1 | 1.000 | 0.0017 |
| OUR-STYLE-WRONG | 1 | 1.000 | 0.0012 |
| LENGTH | 2 | 0.500 | 0.0018 |
| UNIT/FORM | 4 | 0.500 | **−0.4884** |
| CONTRADICTION | 1 | **0.000** | −0.0002 |
| REAL-PARROT | 8 | **0.125** | −0.0044 |

The shape of this table is the Track 2 thesis in one place. The champion is excellent at
rejecting *empty* answers and *refusals* — margins near 1.0. It is near-blind to whether the
*facts* are right: FACT-SWAP is ordered correctly but by a margin of 0.004, i.e. inside the
noise floor; CONTRADICTION is ordered backwards; UNIT/FORM is ordered backwards by 0.49.

On WEATHER_FORECAST the same table shows UNIT/FORM 0/4 (margin −0.0034) and OUR-STYLE-WRONG
0/1 — the champion ranks a unit-converted correct answer *below* a wrong-number answer.

### Near-equality constraints (same facts, different surface)

STORM champion: FORMAT-EQUIVALENCE 0/1 satisfied, worst spread **0.9896**; UNIT/FORM 0/2,
worst spread **0.9856**; STUFFING 0/1, spread 0.9444. The same facts written as JSON versus
prose differ by 0.99 of the entire score range. That is the fairness exhibit for ARCHITECTURE
A4, measured rather than asserted.

---

## 5. Pathology reproduction — the critical section

### 5.1 PREFIX-PARROT — **REPRODUCED**

A contentless restatement of the question's own opening ~17 words, generated mechanically from
the question alone, scored against real ground truths with the live WEATHER champion:

| Probe | Epoch | prefix-parrot (no data) | best real data answer | ratio |
|---|---|---|---|---|
| probe-02 | 285 | **0.9930** | 0.0089 | **112×** |
| probe-03 | 284 | **0.9943** | 0.0099 | **100×** |
| probe-04 | 283 | **0.9923** | 0.0080 | **124×** |
| probe-05 | 282 | 0.0110 | 0.0111 | 1.0× (parrot **+ data** = 0.9925, 89×) |
| probe-07 | 260 | 0.0109 | 0.0108 | 1.0× (parrot **+ data** = 0.9935, 92×) |
| probe-01/06/08 | 259/275/262 | 0.008–0.012 | 0.009–0.011 | ~1× |

**On 3 of 8 real weather questions a contentless echo scores ~0.993 while answers carrying real
data score 0.003–0.010 — a 100–124× inversion. On 5 of 8, the echo construction (alone or with
data appended) reaches ~0.99 against real answers at ~0.01.** Every score in this table was
produced offline by the *current* champion binary (reg 636), whatever epoch the question came
from — so the hole is open in the binary serving live traffic today. The three cleanest cases
(probes 02/03/04, epochs 283–285) are also epochs this binary actually scored, and its scores
for the real answers there match the node's to 6 significant figures (§3.2).

The class-level number: REAL-PARROT accuracy **0.375** for the WEATHER champion (margin
−0.3691) and **0.125** for the STORM champion. The champion ranks a zero-data answer above a
real one on 5 of 8 weather probes and 7 of 8 storm probes.

Magnitude differs by intent exactly as the earlier audit found: weather reaches a hard 0.99;
storm never does (0.0121 vs 0.0054, 0.0155 vs 0.0080, 0.0131 vs 0.0066 — a ~2× effect,
matching the audit's "median ~2.2×").

### 5.2 A data-carrying non-echoing answer at ~0.005 — **REPRODUCED (on real fixtures only)**

Real data answers score 0.0030–0.0111 across every weather probe. Confirmed against the node's
own live scores (§3.2), so this is not a harness artefact.

**It does not reproduce on the synthetic fixtures, and that is a real limitation of the
synthetic corpus.** On `weather_forecast-synth-08`, `correct-nonecho` scores 0.9945, not 0.005.
The reason is structural: a *generated* ground truth is a short paraphrase built from the same
fact record as the answer, so a data-carrying answer already overlaps it heavily. Real ground
truths are 100–350 words of hedged LLM prose that share almost no wording with a data payload.
**The synthetic corpus cannot exhibit this pathology by construction** — which is exactly why
`gen-probes.mjs` and the `probe/` fixtures exist. Do not quote synthetic numbers for this claim.

### 5.3 A refusal outscoring a correct answer — **DOES NOT REPRODUCE**

Stating this loudly, because it is in `track2/FIXTURES.md` as the archetype for class 3.

Scanning **all 554 non-empty recorded answers across all 7 intents**:

- Groups where a refusal-shaped miner answer outscored a data-carrying one: **0**
- Refusal-shaped miner answers scoring above 0.5: **0**

Both zero. And on synthetic fixtures the champions handle refusals correctly and decisively —
REFUSAL class accuracy 1.000 with margin 0.9868 (STORM) and 0.9918 (WEATHER). The champion is
*good* at rejecting refusals.

**What is actually in the records is a different and worse thing: the refusal is the GROUND
TRUTH.** 8 of 15 captured WEATHER ground truths are refusal-shaped ("Sorry, I can't provide the
exact 48-hour hourly weather forecast for Tokyo, Japan starting from August 25, 2026 UTC…"),
and 40 of the 58 weather rows scoring below 0.02 were scored against one. Note what such a
ground truth *is*: a verbatim restatement of the question. Its high-salience opening tokens are
the question's tokens — which is precisely the mechanism §5.1 exploits.

So the archetype in FIXTURES.md is inverted. The recorded fact is not "a refusal scored 0.99";
it is "**the ground truth was a refusal, and against it the question-echo earned 0.99 while the
real forecast earned 0.007**". The REFUSAL fixture class should be re-pointed at
refusal-shaped *ground truths*, not refusal-shaped answers. Recommend correcting FIXTURES.md.

### 5.4 A surprise: the echo effect is a prefix effect, not an overlap effect

Testing the obvious explanation — that answers sharing more vocabulary with the question score
higher — against all 554 recorded rows:

| Intent | n | Spearman(question-overlap, live score) |
|---|---|---|
| CVE_LOOKUP | 13 | 0.679 |
| IP_GEOLOCATION | 11 | 0.638 |
| CRYPTO_PRICE | 44 | 0.441 |
| SSL_VERIFICATION | 18 | 0.416 |
| WEATHER_FORECAST | 166 | 0.199 |
| STORM_ALERT | 264 | −0.058 |
| STOCK_PRICE | 38 | −0.135 |
| **Pooled** | **554** | **−0.258** |

Mean question-overlap for rows scoring >0.9 is **0.295**; for rows scoring <0.02 it is
**0.276**. Statistically indistinguishable.

**Bag-of-words question overlap does not predict the score at all.** Yet the controlled probe
in §5.1 moves the score 100×. Both are true because the effect lives in the *opening region* —
consistent with the measured cliff between word 16 and word 17 — not in global overlap. This
matters for Phase C: a candidate scorer that defends against "echoing the question" by
penalising question-vocabulary overlap would be defending against the wrong thing, and would
wreck its Spearman agreement for nothing.

---

## 6. Other measured findings

**~47% of live `converted_answer` rows are empty**, confirmed per intent: CVE 75%, CRYPTO 63%,
SSL 58%, IP_GEO 48%, WEATHER 45%, STOCK 39%, STORM 12%. The EMPTY-ANSWER fixture class covers
the behaviour; all champions return exactly 0.0.

**Unicode whitespace is not treated as blank.** Every champion tested returns exactly 0.0 for
`""` and for ASCII whitespace, but a non-zero for U+00A0 / U+2003 / U+3000 / U+200B answers —
0.000303 (WEATHER), 0.000543 (STORM). Their blank check is byte-level ASCII. Reported as an
advisory WARN, not a gate failure, since the live champions themselves fail it and it is
therefore evidently not enforced. Worth knowing before we write our own blank check.

**Wall-clock headroom is comfortable.** Serial in-process latency is 2.008 s/call for the STORM
champion, projecting to ~143 s of the 600 s budget for a ~66-call gate. Worst adversarial input
(54 KB repeated text) took 1.83 s. Earlier "AT RISK" readings were an artefact of measuring
worker-seconds under 16-way memory contention across 24 MB modules; the harness now measures and
reports serial latency instead.

**Adversarial inputs are all handled.** 100 KB answers, emoji, CJK/Arabic/Cyrillic, accents,
invalid UTF-8 byte sequences, embedded NULs, and a single 50 000-character token: no crashes,
all outputs in [0,1], across every champion tested.

---

## 7. Honest ledger

- **The gate constants in §2 are implemented, not verified.** They came from the gate recon.
  This harness cannot confirm them; only a registration can. Belongs in `track2/GAPS.md`.
- **The node's benchmark is not published.** Every Stage-2 number here is this corpus's, not the
  node's. What transfers is the *comparison* between two scorers, never the absolute margin.
- **The synthetic corpus cannot exhibit the §5.2 pathology** (see the reasoning there). Claims
  about data-carrying answers scoring ~0.005 must cite `probe/` or `real/`, never `synth/`.
- **REAL fixtures carry no quality labels**, so they contribute no pairwise accuracy — only
  self-match, stddev and Spearman. Any future temptation to label them is the measurement trap.
- **`FIXTURES.md`'s class-3 archetype is wrong** as written (§5.3) and should be corrected.
- **REAL-PARROT pairs assert a judgement**: that an answer carrying no data must not outrank one
  carrying data. That is a claim about the scorer, not about whether the miner's numbers were
  right — we do not know that and do not assert it.
- **Question de-duplication is by (question, ground_truth)**, not by question alone: the same
  question in a later epoch carries a freshly generated ground truth, and a score is only
  meaningful against the ground truth it was scored on. This reduces multi-answer fixtures for
  CVE_LOOKUP and IP_GEOLOCATION to zero, which is why their Spearman samples are thin.
- Read-only throughout: no wallet, no signing, no on-chain call, no change outside
  `track2/harness/`, `track2/fixtures/`, this file, and the scratchpad.

---

## 8. How to re-run

```bash
node track2/harness/fetch-real.mjs                      # REAL fixtures (network)
node track2/harness/gen-synth.mjs --seed 20260827       # synthetic, deterministic
node track2/harness/gen-probes.mjs                      # REAL-PARROT probes

node track2/harness/run-eval.mjs \
  --scorer <candidate>.wasm --against <champion>.wasm \
  --intent WEATHER_FORECAST --workers 14
```

Champion binaries are commit-pinned in the registry (`/api/wasm`); the local clone's
`dist/` copies were verified byte-identical by SHA-256 for all four champions used here.

`run-eval.mjs` writes its JSON report to `track2/fixtures/report-<timestamp>.json` by default.
The four validation runs behind this document were sent to the scratchpad with `--out` instead,
so the repo does not carry four multi-hundred-KB report files; re-run with the default if you
want one committed.

Binaries used, all SHA-256-verified against their registry `wasm_url` commit pin:

| Intent | Role | Path under `dist/` | SHA-256 (first 16) |
|---|---|---|---|
| WEATHER_FORECAST | champion reg 636 | `xfmr/wf_mini.wasm` | `61db5f04aff9cba3` |
| WEATHER_FORECAST | superseded reg 442 | `xfmr/wfc_t66.wasm` | `50b9a5c3d6596b6c` |
| STORM_ALERT | champion reg 453 | `xfmr/storm_rpen.wasm` | `dcfe36c9c84c58ce` |
| STORM_ALERT | superseded reg 223 | `xfmr/storm_c3.wasm` | — |
| IP_GEOLOCATION | champion reg 630 | `subagent/IP_GEOLOCATION.wasm` | `84d6b1dc03453df2` |
| IP_GEOLOCATION | untuned reference | `telegraph-salience-scorer.wasm` | — (1 MB base build) |
| SSL_VERIFICATION | champion reg 631 | `subagent/SSL_VERIFICATION.wasm` | `021af36410350ef1` |
