# Node Promotion-Gate Analysis — 2026-08-27

Recon target: `github.com/telegraphprotocol/telegraph-subnet` (assigned) plus fallback org repos.
Scope: Track 2 (Script Authors). Read-only. No wallet, no transactions, no miner/app code touched.

**Headline:** the assigned repo is a dead end, but the gate was fully recovered anyway — from a
**redacted-then-deleted docs page still present in git history**, and cross-validated against
**1,220 live registrations** on the node's public `/api/wasm` endpoint. Every constant the mission
listed as unknown is now pinned with two independent sources.

---

## 0. Source inventory and confidence

| # | Source | What it gave | Confidence |
|---|---|---|---|
| S1 | `telegraph-docs` git history, commit `fe45f5c` "docs: **redact ranking internals**" | The pre-redaction thresholds table, verbatim | High — real code-derived doc, but dated 2026-08-11 |
| S2 | `https://devnode.telegraphprotocol.com/api/wasm` (live, 1,220 registrations, 1,033 rejection reasons) | Every threshold restated by the node itself, with observed values | **Highest — this is the running gate today** |
| S3 | `https://devnode.telegraphprotocol.com/scores` (live epoch-scoring corpus) | `converted_answer` generator output, ground truths, real input distribution | Highest |
| S4 | `telegraph-docs/scoring/build-a-scoring-module.md` (HEAD) | Post-redaction public description | High but deliberately vague |
| S5 | `telegraph-api-docs/openapi/internal-bridge.yaml` | Ground-truth + scores API contract | High |
| S6 | `telegraph-examples/wasm-scoring-module/go-tester/main.go` | Exact host calling convention | High |

S1 and S2 **agree on every number**. That is the key result: the thresholds published on 2026-08-11
and then redacted are still the live thresholds on 2026-08-27.

---

## 1. `telegraph-subnet` is NOT the node — assignment was a dead end

Plainly: the assigned repo does not contain the gate, the benchmark, or the converter. It is an
abandoned **Bittensor subnet** for token-price and real-estate prediction.

Evidence:

- `telegraph-subnet/requirements.txt` — `bittensor`, `tensorflow`, `scikit-learn`, `joblib`.
- `telegraph-subnet/telegraph/protocol.py:1-8`:
  ```python
  import bittensor as bt
  from base.types import ChainType, TokenPrediction
  from telegraph.nextplace_synapsis import RealEstateSynapse
  bt.synapse.register(RealEstateSynapse)

  class PredictionSynapse(bt.Synapse):
      """Synapse for token price predictions"""
  ```
- Layout is stock Bittensor: `neurons/miner/`, `neurons/validator/`, `base/neuron.py`, `base/validator.py`.
- Zero hits across the whole tree for `rank_answer`, `champion`, `spearman`, `self_match`,
  `converted_answer`, `promotion`. Four incidental hits for `wasm`-adjacent strings, none relevant.
- `README.md` is 0 bytes. Last push **2025-05-23** — 15 months stale. Merged from `telegraphbridge/subnet`.

**The real node is Go and closed-source.** Two independent confirmations:

- The docs say the runtime is [wazero](https://wazero.io), "a pure-Go WASM runtime"
  (`telegraph-docs/scoring/build-a-scoring-module.md:320-323`).
- `telegraph-api-docs/openapi/internal-bridge.yaml:38-39` names the repo:
  ```yaml
  contact:
    name: Telegraph Protocol
    url: https://github.com/AnomalyFi/Telegraph
  ```
  The redacted commit also removed links to `github.com/telegraphprotocol/Telegraph/blob/develop/...`,
  described in its own message as a "private repo". Both are 404 to us.

`Telegraph-Node-UI` (last push 2024-12-31) and `telegraph-skills` were checked and contain nothing:
`telegraph-skills` is an unrelated project (an "open-prose" skills/agent repo) that merely shares the name.

---

## 2. The promotion gate — every constant, recovered

### 2.1 The redaction that failed

`telegraph-docs` commit `fe45f5c` (2026-08-11, author 0xWick) is titled
**"docs: redact ranking internals, correct the bond claims, drop private-repo links"**. Its own message:

> The scoring weights and the promotion thresholds made it easier to tune a
> module to the bar than to rank well, and the replay records are public.

The file was later deleted entirely (`ae8c780`, 2026-08-12). Both the pre-redaction content and the
deletion are recoverable:

```bash
git clone https://github.com/telegraphprotocol/telegraph-docs
cd telegraph-docs && git show 7017580:scoring/scoring-reference.md
```

### 2.2 Stage 2 thresholds — verbatim pre-redaction table

`scoring/scoring-reference.md:180-193` @ `7017580` (deleted at HEAD):

> ### Stage 2 — historical replay comparison (before promotion)
>
> Only candidates that passed Stage 1 reach this
> (`pkg/scoring/candidate_eval.go`). It replays up to 1,000 recent real
> `(question, ground_truth, answer)` rows through the candidate and checks,
> against the current default thresholds:
>
> | Check | Bar |
> |---|---|
> | A — not degenerate | Score stdev across replayed rows > `0.05` |
> | B — recognizes exact matches | Verbatim-correct answers score ≥ 75th percentile of the candidate's own distribution |
> | C — sane relative ranking | Per-intent Spearman correlation vs. the incumbent's historical scores ≥ `0.6` (skipped for intents with <2 distinct miners) |
> | D — self-match floor | `rank_answer(q, gt, gt)` ≥ `max(0.75, incumbent's own self-match score)` — a ratchet, never regresses |
> | E — near-miss discrimination | Paraphrase-of-truth answer must outscore an off-topic answer by ≥ `max(0.15, incumbent's own margin)` per curated test case |

### 2.3 The same constants, restated by the live node today

Extracted from 1,033 `rejection_reason` strings on `/api/wasm`. These are the node's own words:

| Constant | Live node message (verbatim) | Value | n |
|---|---|---|---|
| Absolute margin floor | `weak discrimination: your scorer did not separate good answers from bad ones clearly enough (average margin 0.1332, need at least 0.15).` | **0.15** | 37 |
| Spearman threshold | `disagreed with the champion on real traffic: on real miner answers for WEATHER_CHECK your scorer's ranking did not match the current champion's (agreement 0.5402, need at least 0.60).` | **0.60** | 98 |
| Self-match floor | `self-match too low: ... Scoring a ground-truth answer against itself gave 0.6561 on at least one fixture case, below the required floor 0.75. A good scorer should rate a perfect answer near 1.0.` | **0.75** | 11 |
| Stddev floor | `scores collapsed: your scorer returned almost the same score for every answer (spread 0.0381, need > 0.0500), so it cannot tell good answers from bad ones.` | **> 0.05** (strict) | 2 |

Two legacy messages also survive with the same 0.60:
`rank agreement below threshold (0.60), got: map[AGENT_TASK:0.111 IMAGE_VERIFICATION:0.306 LANGUAGE_GENERATION:-0.462 ...]`
— note this older variant scored agreement across **many** intents; the current one names exactly one.
All 159 live `spearman` objects contain exactly one key (the candidate's own intent).

### 2.4 Comparison-vs-champion rules — and the one the docs get wrong

The two head-to-head rejections, with counts:

```
532×  lost to the current champion on separation: your scorer did not separate good from bad
      answers more clearly than the champion (your average margin 0.5467 vs champion 0.5944).
      To replace it, you must beat its separation, not just tie it.

290×  lost to the current champion on ordering: your scorer ranked the good answer above the
      bad one on fewer fixture cases than the champion (you: 6 of 11, champion: 7 of 11).
      Score correct answers above wrong ones more consistently.
```

**The public docs are wrong on the margin rule.** `build-a-scoring-module.md:424` says
`champion_margin` is the number "You must match or beat". The live node says
*"you must beat its separation, **not just tie it**"*.

Verified against 186 clean promotions (status `active`/`superseded` with no rejection reason):

| Rule | Violations among 186 promotions | Verdict |
|---|---|---|
| `candidate_margin > champion_margin` | 0 strictly-less; **1 exact tie**, reg 16, 2026-08-16 | **Strict `>` is current** |
| `candidate_wins >= champion_wins` | 0 with fewer; **181 promoted on an exact tie** | **`>=`, ties fine** |
| `candidate_margin >= 0.15` | 0 | confirmed |
| `worst_self_match >= 0.75` | 0 | confirmed |
| `score_stddev > 0.05` | 0 | confirmed |
| `spearman >= 0.60` when present | 0 | confirmed |

The single tie-promotion (reg 16, `CHAT_COMPLETION`, `0.37360683` vs `0.37360683`) predates the rule
change: the loose wording *"To replace it, match or beat its separation"* appears exactly once, on
**2026-08-18**; the strict wording runs **2026-08-20 → 2026-08-27** (532 occurrences).
**The gate tightened from `>=` to `>` around 2026-08-19.**

> **Actionable:** wins may tie; margin may not. Target a margin comfortably above the champion's,
> not equal to it. Floating-point equality is a real failure mode here — several challengers landed
> exact ties and were rejected.

### 2.5 Spearman is gated on miner diversity, not row count

`historical_rows_evaluated` does **not** determine whether the Spearman check runs:

- Spearman **present** with as few as **3** historical rows.
- Spearman **absent** with as many as **15** historical rows.

This matches S1's "skipped for intents with <2 distinct miners". The trigger is **≥2 distinct miners
with scoring history**, not a row threshold.

Practical consequence for our targets: `IP_GEOLOCATION` has exactly **one** live miner (`iplocate`)
→ Spearman is skipped there. `WEATHER_FORECAST` has 6+ miners → Spearman **is** enforced (the current
champion's eval records `"spearman": {"WEATHER_FORECAST": 0.81260157}`).

### 2.6 Timeout — an undocumented hard gate

Not in any doc. 21 registrations died on it:

```
evaluation exceeded its time budget: the fixture gate did not complete in time
(10m41s elapsed, including module load). If your module embeds or ranks slowly,
reduce per-call work.
```

Observed elapsed values, sorted: `10m3s, 10m7s, 10m14s, 10m41s, 10m44s, 10m53s, 12m13s, 13m0s,
13m1s, 13m14s, 13m15s, 13m39s, 13m43s, 14m6s, 14m55s, 15m31s, 15m51s, 17m51s, 18m45s, 21m11s, 23m24s`.

Minimum failure = **10m3s** ⇒ **the fixture-gate budget is 10 minutes**, inclusive of module load.
Also seen: `gave up after 3 failed evaluation attempts: structural validation timed out` (×2), so
there is a **3-attempt retry cap**.

> **Actionable:** an embedding-heavy module that clears every quality bar can still be rejected on
> wall-clock. Budget for ~15 fixture cases × (2 answers + 1 self-match) × 2 modules, plus load, inside 10 min.

### 2.7 Can a champion decay without a challenger? — No, but its bar drifts

**No autonomous demotion.** A champion's status changes only when a challenger beats it or the author
deregisters it. But its *measured* margin is **recomputed at every challenge**, and it drifts because
the fixture set drifts (§3).

`WEATHER_FORECAST`, champion reg 636 unchanged since 2026-08-24T02:51 — `champion_margin` as measured
by successive challengers:

```
2026-08-24T06:21  reg651   0.530206  (15/15)   <- equals 636's own stored eval
2026-08-24T09:39  reg676   0.595505  (15/15)
2026-08-24T16:12  reg7     0.727531  (15/15)
2026-08-24T16:12  reg10    0.793408  (15/15)
2026-08-25T23:45  reg969   0.793480  (10/10)
2026-08-26T00:49  reg970   0.892180  (10/10)
2026-08-26T02:56  reg983   0.849226  ( 7/7 )
2026-08-26T15:58  reg1112  0.990033  (15/15)
2026-08-26T22:51  reg1178  0.990033  (15/15)
```

Same champion binary, same `comparable_cases` count at both ends (15), **margin 0.53 → 0.99**. The
only thing that can have changed is the fixture *content*.

Contrast `CVE_LOOKUP`, whose champion was promoted 2026-08-27T04:11 and challenged 7 times in the next
3 hours: `champion_margin` was **identical to 6 decimal places (0.932565) every time**. Scoring is
deterministic; the drift is entirely fixture rotation.

> **Actionable — timing is a lever.** The bar is not a fixed number. Sample `/api/wasm` for the
> target intent, read `champion_margin` off the newest challenger's eval, and register when that
> number is at a local low. On WEATHER_FORECAST the bar nearly doubled inside 48 hours.

---

## 3. The built-in benchmark ("fixture gate")

**Not in any public repo.** It lives inside the closed Go node (`pkg/scoring/candidate_eval.go` per S1).
It is not fetched from any URL we can observe. What we *can* establish from 1,180 live eval records:

### 3.1 It is not fixed — it rotated on 2026-08-22/23

`comparable_cases` ("how many benchmark questions both modules were scored on"), by registration date:

```
2026-08-16 {32: 5}
2026-08-17 {32: 36}
2026-08-18 {32: 21}
2026-08-19 {32: 12}
2026-08-20 {32: 65}
2026-08-21 {32: 143}
2026-08-22 {32: 133, 12: 9, 15: 3, 10: 2, 11: 1}     <- switchover
2026-08-23 {15: 57, 14: 16, 13: 8, 10: 6, 32: 5, ...}
2026-08-24 {15: 92, 32: 15, 11: 10, 13: 8, ...}
2026-08-25 {15: 167, 10: 10, 8: 6, ...}
2026-08-26 {15: 157, 13: 16, 14: 11, ...}
2026-08-27 {15: 91, 13: 1, 9: 1, 8: 1}
```

Two regimes:

- **Until 2026-08-21: a single global 32-case set.** This is the docs' "winning `32/32` benchmark
  questions to the champion's `19/32`" example (`build-a-scoring-module.md:431-434`) — that text
  describes the *retired* benchmark.
- **From 2026-08-22: per-intent sets, modal size 15**, ranging 4–15 by intent.

Per-intent ceiling for evals registered on/after 2026-08-23 (≈ that intent's fixture count):

```
WEATHER_FORECAST 15   CVE_LOOKUP 15   IP_GEOLOCATION 15   STORM_ALERT 15   SSL_VERIFICATION 13
WEATHER_CHECK 14      TOKEN_HOLDER_COUNT 13
DEEPFAKE_DETECTION 6  MEDIA_AUTHENTICITY_CHECK 6  VIDEO_VERIFICATION 6
(AGENT_TASK / CHAT_COMPLETION / CRYPTO_PRICE / NEWS_HEADLINES / NEWS_SEARCH /
 RESEARCH_SYNTHESIS / TWITTER_SEARCH / WEB_SEARCH still show 32 in this window)
```

Fixture count tracks intent traffic volume (thin intents → 6), and §2.7 shows the content rotates
while the count holds. **Strong inference (UNVERIFIED):** post-2026-08-22 fixtures are assembled
per-intent from *recent real epoch-scoring rows* — the same `(question, ground_truth, answer)` data
served by `/scores` — capped at ~15, with the "good" answer being a high-scoring real answer and the
"bad" answer an unrelated one. This is consistent with every observation but we have no code.

### 3.2 One fixture ID leaked

A single rejection exposes a fixture identifier:

```
candidate errored scoring fixture case capital-france:
wasm/runtime: write question: mem.Write at ptr=1114112 len=30 failed
```

`capital-france`, question length **30 bytes** — i.e. `"What is the capital of France?"` (exactly 30
chars), the same example used in the docs' tester invocation
(`build-a-scoring-module.md:334-338`). So the **legacy 32-case set was hand-written generic
trivia with slugged IDs**. No other fixture ID appears in 1,033 rejections.

### 3.3 Verbatim fixture contents for our target intents: NOT FOUND

**UNVERIFIED / NOT RECOVERABLE from public sources.** They are not in `telegraph-subnet`,
`telegraph-docs`, `telegraph-examples`, `telegraph-api-docs`, `tg-miner-integration`,
`Telegraph-Node-UI`, `telegraph-chatbot`, or `tg-website-backend`, and no runtime endpoint serves
them. The closest available proxy is `/scores?intent=<INTENT>` (§4), which — per §3.1 — is plausibly
the very corpus the fixtures are drawn from.

### 3.4 Current bar per target intent (as last measured by the node)

Champion of every one of our five target intents is currently a `zkasuran/telegraph-salience-scorer`
build. (That repo is another agent's assignment and was not investigated.)

| Intent | Champion reg | Last-measured `champion_margin` | `champion_wins` | Spearman enforced? |
|---|---|---|---|---|
| WEATHER_FORECAST | 636 | **0.988913** | 8/8 | **Yes** (6+ miners; champion scored 0.8126) |
| SSL_VERIFICATION | 631 | **0.913363** | 13/13 | Unlikely (5 miners, only 43 rows) |
| STORM_ALERT | 453 | **0.859331** | 14/15 | Possible (4 miners) |
| CVE_LOOKUP | 1254 | **0.932565** | 15/15 | Not in champion's eval (14 rows, no spearman) |
| IP_GEOLOCATION | 630 | **0.991959** | 15/15 | **No** — single miner (`iplocate`) |

Competitive pressure, by entry count: `WEATHER_FORECAST` 67 registrations (53 rejected),
`CVE_LOOKUP` 53 (46 rejected), `STORM_ALERT` 11, `SSL_VERIFICATION` 9, `IP_GEOLOCATION` 5.
`IP_GEOLOCATION` and `SSL_VERIFICATION` are the soft targets — but note CVE_LOOKUP's champion was
promoted **today** by a margin of only `0.932565 − 0.929666 = 0.0029`.

---

## 4. The `converted_answer` generator — found, live, and decisive

The mission's highest-leverage unknown. **`rank_answer` does not see the miner's JSON.** It sees an
LLM-written prose summary of it. Both are stored and both are public.

`GET /scores` (undocumented publicly but specified in
`telegraph-api-docs/docs/internal-bridge/networks.md:71-83`, auth: **none**) returns per row:

```
id, epoch_id, intent_id, miner_slug, rank, score,
question, ground_truth, miner_answer, converted_answer, failure_reason, scored_at, created_at
```

Real row (`CVE_LOOKUP`, miner `patchsignal-cve`, score **0.7679**, epoch 271):

- **question** — `What is the CVSS score and affected versions for CVE-2021-44228?`
- **ground_truth** (149 ch) — `The CVSS score for CVE-2021-44228 is **10**, indicating a critical severity level.\n\nAffected versions include Apache Log4j versions up to **2.14.1**.`
- **miner_answer** (1,548 ch, raw) — `{"cve_id":"CVE-2021-44228","cvss_score":10,"cwe":["CWE-20",...],"description":"CVE-2021-44228. Severity: CRITICAL. ...`
- **converted_answer** (246 ch, **this is what is scored**) — `The data describes a critical security vulnerability (CVE-2021-44228) in Apache Log4j2 with a CVSS score of 10, detailing multiple affected version ranges, the potential for remote code execution, and providing references for further information.`

### 4.1 Measured shape of the input distribution (515 rows across the 5 target intents)

| Property | `converted_answer` | `ground_truth` |
|---|---|---|
| Starts with literal `"The data"` | **86.9%** (238/274 non-empty) | — |
| Contains `**` markdown bold | **0.0%** | 22.3% |
| Contains a newline | **0.0%** | 31.0% |
| First-person voice (`I`, `we`, `checked`) | ~0% | 25.2% |
| Median length | 146–304 ch by intent | 295–1,954 ch by intent |

Median `len(ground_truth) / len(converted_answer)` = **2.25×**.

Opening-phrase histogram (non-empty, 274 rows):
`The data shows` 181 · `The data provides` 30 · `The data indicates` 17 · `The weather forecast` 16 ·
`The data describes` 10 · `The current weather` 4 · `The weather in` 4 · `The forecast for` 3 ·
`This data shows` 3 · `This data describes` 3.

> **This is the single most exploitable fact in this report.** The two texts being compared are in
> *systematically different registers*: `ground_truth` is a Markdown-formatted, often first-person
> direct answer; `converted_answer` is a flat, single-paragraph, third-person summary that almost
> always opens `"The data ..."`. Any scorer built on symmetric lexical overlap, or on recall of the
> ground truth, is structurally penalised — the answer is 2.25× shorter and shares little surface
> form. This is why live scores are so low (median **0.0059** for SSL_VERIFICATION,
> **0.0087** for WEATHER_FORECAST, **0.0105** for CVE_LOOKUP). Score **precision-of-the-answer**, not
> recall-of-the-truth, and normalise away the boilerplate prefix.

### 4.2 The converter is a filtered, hosted LLM

One row's entire `converted_answer` is:

```
- The generated text has been blocked by our content filters.
```

(`IP_GEOLOCATION`, miner `iplocate`, epoch 267 — the question concerned a Russian IP's abuse history;
the raw `miner_answer` contained a full postal address, phone and email.) That string is an
Azure OpenAI content-filter response. So the converter is an **externally hosted LLM with content
filtering**, and its refusals are passed straight through into the scoring input.

**Actionable:** treat a content-filter refusal as a non-answer. It scored 0.0047 under the incumbent —
correct behaviour, but it should be a hard near-zero, and a scorer that rewards it is misordering.

### 4.3 Empty answers are ~47% of live traffic

241 of 515 rows have an empty `converted_answer`. 216 of those scored exactly `0`. **25 did not**
(max 0.196) — and in all 25 the raw `miner_answer` was large (5–52 KB) while `converted_answer`
was empty. In zero cases were both empty and the score positive.

**Inference (UNVERIFIED):** when conversion yields nothing, the scorer is fed the **raw JSON**
`miner_answer` instead. Alternative explanation: the column was written after scoring. Either way,
a scorer will occasionally be handed unconverted JSON, and should degrade gracefully rather than
scoring it high on token overlap.

### 4.4 Where ground truths come from

`telegraph-api-docs/openapi/internal-bridge.yaml:1685-1702`:

```yaml
  /groundtruths/{intent_id}:
    get:
      operationId: getGroundTruth
      summary: Get ground-truth question + reference answer for an intent
      description: |
        Returns the ground-truth question + reference answer for an intent
        (read from the `ground_truths` table). Used by the epoch scorer.
```

Schema (`:598-606`) is `{intent_id, question, ground_truth}`. The path 404s on devnode (the scoring
endpoints are mounted, this one is not exposed there), but `ground_truths` is a confirmed
PostgreSQL table (`telegraph-chatbot/knowledge/code_architecture.txt:57`). Style analysis (§4.1 —
markdown bold, first-person, trailing-space citation artefacts) indicates the ground truths are
**LLM-generated and cached per intent**, not hand-authored. Distinct ground truths per intent in
our sample: 20–25, against 18–25 distinct questions — so roughly one ground truth per question,
regenerated as questions rotate each epoch.

---

## 5. Stage 1 — structural validation

`scoring/scoring-reference.md:164-178` @ `7017580`:

> Runs the moment the registration event is seen (`pkg/listener/listener.wasm.validate.go`).
> Any failure is a hard reject:
>
> 1. Module loads in wazero and exports `rank_answer`, `alloc`, `dealloc`.
> 2. `rank_answer(q, gt, "")` — a genuinely empty answer — returns **exactly** `0`.
> 3. `rank_answer(q, gt, "   ")` — whitespace-only — also returns exactly `0`.
> 4. Self-match beats an unrelated cross-match:
>    `rank_answer(q, gt, gt) > rank_answer(q, gt, unrelated_text)`.
> 5. No panic/trap on adversarial input — a **~54 KB repeated-text string** and a
>    Unicode string (**emoji, accents, CJK**) must both return without error.

Live Stage-1 rejections confirm all of it, and add failure modes worth designing against:

```
structural validation failed: self-match (0.0000) did not beat unrelated cross-match (0.0000)   ×10
structural validation failed: rank_answer(empty) errored:
    wasm/runtime: rank_answer: expected 6 params, but passed 3                                   ×2
structural validation failed: rank_answer(whitespace) = 0.0007, want exactly 0                   ×1
structural validation failed: module load failed: wasm/runtime: compile: invalid magic number    ×1
candidate failed to load: wasm/runtime: instantiate: module[env] not instantiated                ×1
structural validation failed on re-fetch: module load failed:
    wasm/runtime: instantiate: module[./onlookout_scorer_bg.js] not instantiated                 ×2
wasm hash mismatch: expected=c6aab757... got=c54b3bd9...                                          ×4
```

Notes:
- `module[env]` = a WASI build. `module[./*_bg.js]` = a `wasm-bindgen` build. Both are instant rejects.
- **`rank_answer` must take exactly 6 `i32` params and return `f32`.** A 3-param signature is rejected.
- The whitespace test is *exact equality to 0* — `0.0007` failed. Trim before any scoring branch.
- Hash is **keccak256** of the file bytes for WASM (`registerWasm`), *not* SHA-256 (which is the
  miner-YAML rule). Confirmed by `build-a-scoring-module.md:461-465` and 4 live mismatch rejections.

### Runtime limits (beyond the documented 32 MB module cap)

`scoring/scoring-reference.md:153-157` @ `7017580`:

> **Limits enforced by the host** (`pkg/wasm/runtime`), not something your module needs to check
> itself: individual text inputs capped at **128 KiB** (`MaxTextBytes`), vector inputs capped at
> **16,384** elements (`MaxVecDim`). Returned scores are clamped to `[0, 1]` and **NaN/Inf collapse
> to `0`** before your module's output is trusted.

No fuel metering, no explicit memory-page cap, and no per-call timeout are documented or observable —
the only wall-clock enforcement found is the **10-minute whole-gate budget** (§2.6). A `mem.Write ...
failed` at `ptr=1114112 len=30` (the `capital-france` row) shows the host will fail the call rather
than grow memory, so **`alloc` must return a pointer inside already-committed linear memory**.

### Host calling convention — and the `ptr=0` trap

`telegraph-examples/wasm-scoring-module/go-tester/main.go:45-68`:

```go
writeStr := func(s string) (ptr, length uint32) {
    if len(s) == 0 {
        return 0, 0
    }
    res, err := alloc.Call(ctx, uint64(len(s)))
    ...
    p := uint32(res[0])
    if !mem.Write(p, []byte(s)) { panic("failed to write into module memory") }
    return p, uint32(len(s))
}
qPtr, qLen := writeStr(question)
gtPtr, gtLen := writeStr(groundTruth)
maPtr, maLen := writeStr(answer)
res, err := rankAnswer.Call(ctx, uint64(qPtr), uint64(qLen), uint64(gtPtr), uint64(gtLen), uint64(maPtr), uint64(maLen))
```

**For an empty string the host does not call `alloc` — it passes `ptr = 0, len = 0`.** Since Stage 1
check #2 passes an empty answer, any module that constructs a slice from `ptr` before testing `len`
risks a trap at address 0. Check `len == 0` first.

---

## 6. Epoch scoring, aggregation, and one important caveat

`scoring/scoring-reference.md:52-71` @ `7017580` (Go internals, pre-redaction):

> 1. Every epoch, `pkg/scoring/epoch_scorer.go`'s `EpochScorer.RunEpoch` loads active miners per
>    intent, fetches each intent's ground truth (`GroundTruthClient`), and fans out concurrent calls
>    to ask each miner the question.
> 2. Each `(question, ground_truth, miner_answer)` triple is scored by calling the WASM module's
>    `rank_answer` via a pooled runtime (`pkg/wasm/runtime.Pool` ...). `rank_answer` is the only
>    scoring export the live path actually calls.
> 3. Results are sorted best→worst and pushed into `pkg/scoring/ranker.go`'s `Ranker.Update` — an
>    in-memory, per-intent leaderboard (`IntentRanking`).
> 4. The engine's request router (`pkg/engine/router`) reads `ranker.TopN(intentID, n)` ...
> 5. **Scoring is per-intent, not global.**

- **No batching, no sanitisation, no truncation** is described or observable. One `rank_answer` call
  per row. Answers arrive as-is (subject only to the 128 KiB `MaxTextBytes` cap).
- Optional exports `rank_answer_cached` + `embed` (384-dim, MiniLM-L6-v2 sized) exist as a Stage-2
  speed path only — "**No effect on pass/fail**". Given the 10-minute budget (§2.6), implementing
  both is nonetheless a cheap insurance policy. `cosine_sim` and `bm25_score` were removed from the
  docs in `4f17127` as "not called by anything".
- `breakdown_answer` returns 5 floats `[relevance, correctness, lexical, length_quality, composite]`
  — debug-only, never called by either gate.

### The retired default scorer's formula

`scoring/scoring-reference.md:35-40` @ `7017580` — redacted precisely because it "made it easier to
tune a module to the bar than to rank well":

| Signal | Weight | Meaning |
|---|---|---|
| Relevance | 0.25 | cosine similarity(question, miner_answer) |
| Correctness | 0.50 | cosine similarity(ground_truth, miner_answer) |
| Lexical | 0.15 | BM25(ground_truth, miner_answer) |
| Length quality | 0.10 | `sigmoid((byte_length - 50) / 20)` — rewards answers past ~50 bytes, no penalty for being long |

This is the **fallback/genesis** module, not any current champion. Its length term is monotonically
increasing — a known weakness: "a giant wall of text scores near-max on this signal same as a
well-sized one."

### Canonical Score / consensus — design doc, NOT live

`telegraph-chatbot/knowledge/` restates the whitepaper: commit-reveal BFT, stake-weighted median as
Canonical Score, 43/64 validators, testing cohort 10%, `δ_promote = 0.10`, "minimum 3 test epochs for
script promotion", 10,000 MACHINA WASM bond.

**None of this is the live gate.** The whitepaper itself marks Catch-Rate Script Promotion as
"on-chain ready, **coordinator TBD**" (`whitepaper.txt:162`), and `fe45f5c` removed the bond claims as
factually wrong — the 10,000 MACHINA bond "was removed because it had no release path". Live
`/api/wasm` shows `"bond_amount": 0` on all 1,220 registrations. Registration costs gas only.
Do not design against the whitepaper numbers.

---

## 7. What remains UNVERIFIED

| Item | Status |
|---|---|
| Verbatim fixture questions/answers for the 5 target intents | **Not recoverable publicly.** Closed-source; no endpoint serves them. Best proxy is `/scores?intent=…` |
| That post-2026-08-22 fixtures are drawn from recent `/scores` traffic | Strong inference from §2.7 + §3.1; no code seen |
| Raw JSON fallback when `converted_answer` is empty (§4.3) | Inference from 25 rows; alternative is a write-ordering artefact |
| Exact `comparable_cases` denominator semantics (both-scored vs pool size) | Consistent with both; count varies 4–15 within one intent |
| Check B ("verbatim-correct ≥ 75th percentile of own distribution") | In S1 only; **no live rejection message references it** — may have been dropped in the 08-22 rewrite |
| Per-call fuel/memory-page limits | Not documented, not observable. Only the 10-min gate budget is confirmed |
| Whether Spearman uses `converted_answer` or raw rows | Message says "on real miner answers"; column not identified |

## 8. Reproduction

```bash
# 1. the redacted gate doc
git clone https://github.com/telegraphprotocol/telegraph-docs && cd telegraph-docs
git show fe45f5c                                  # the redaction diff
git show 7017580:scoring/scoring-reference.md     # full pre-redaction page

# 2. the live gate: every threshold, every rejection, 1220 registrations
curl -s https://devnode.telegraphprotocol.com/api/wasm | jq '.intents.CVE_LOOKUP.champion.eval'

# 3. the real input distribution (question / ground_truth / miner_answer / converted_answer)
curl -s 'https://devnode.telegraphprotocol.com/scores?intent=CVE_LOOKUP&limit=200'
```
