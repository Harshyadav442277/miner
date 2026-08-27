# ARCHITECTURE.md — Track 2 design decisions

Code must conform to this. **Update this file before deviating from it**, not after.

---

## A1 — Match the canonical ABI exactly · CONFIRMED 2026-08-27

WASM module, freestanding `wasm32-unknown-unknown`, **zero imports** (WASI `module[env]` and
wasm-bindgen `*_bg.js` builds are instant rejects). Exports `alloc`, `dealloc`, `rank_answer`
(and `memory`). `rank_answer` is **exactly six `i32`** — `(q_ptr, q_len, gt_ptr, gt_len, ma_ptr,
ma_len)` in that order — returning one `f32` in `[0,1]`. A 3-param build was rejected. Hard
Stage-1 traps, each seen in a live rejection (`recon/2026-08-27-node-gate-analysis.md` §5):

- Empty answer → **exactly 0.0**; whitespace-only → **exactly 0.0** (a `0.0007` failed). Trim first.
- The host passes **`ptr=0, len=0` for an empty string without calling `alloc`** — check `len==0`
  before constructing any slice, or trap at address 0.
- `self-match(q,gt,gt)` must be **strictly greater** than an unrelated cross-match.
- No trap on a ~54 KB repeated-text answer or on emoji/CJK/accented input.
- Host caps each text at **128 KiB** (`MaxTextBytes`); returned score is clamped to `[0,1]` and
  **NaN/Inf collapse to 0** before the node trusts it. `alloc` must return a pointer inside
  already-committed linear memory (the host fails the call rather than growing memory).

Keep an optional `breakdown_answer` (5 floats) and `embed`/`rank_answer_cached` exports for
legibility and the Stage-2 speed path — **debug/insurance only, no effect on pass/fail**.

## A2 — Rust `no_std`, and no heavy embedding in the hot path · CONFIRMED 2026-08-27

Rust `#![no_std]` → `wasm32-unknown-unknown`, zero host imports, no nondeterminism (no clock, no
randomness). Toolchain installed and proven (GAPS G6). Reviewers read Rust against the salience
champion's public Rust; diffing is legible.

**The 10-minute whole-gate budget (§2.6) is a design constraint, not a footnote.** The gate runs
~15 fixtures × (2 answers + self-match) × 2 modules + load inside 10 min, 3-attempt cap;
embedding-heavy modules have been rejected on wall-clock alone. So the scorer is **pure
lexical/fact computation** — which is also exactly our thesis (A3). No MiniLM in the scoring path.
An `embed` export may exist as dead insurance but nothing hot may call it.

## A3 — Fact-aware scoring over embedding similarity (the thesis)

For Tier A deterministic intents, correctness lives in **typed facts**: verdicts, numbers with
units, identifiers (CVE ids, hostnames, coordinates), timestamps. The scorer:

1. extracts typed facts from `ground_truth` and from the miner answer;
2. compares them with typed tolerance (numeric epsilon/relative bands, unit normalization,
   identifier canonicalization, timestamp parsing);
3. scores fact agreement as the dominant signal;
4. uses lexical/semantic overlap only as a low-weight tie-breaker for prose quality;
5. is robust to gaming: keyword stuffing, ground-truth-shaped refusals, length manipulation, and
   contradiction (an answer containing both the right and wrong value must not win).

A refusal or error must score near zero when the ground truth contains a real answer — the
measured baseline failure (refusal 0.99 vs correct 0.007) is the canonical counter-example.

Two requirements added from measurement (2026-08-27):

6. **Answered-vs-unanswered detection is first-class.** The live champion scores a contentless
   question-echo 0.9933 — identical to a real answer (fable_review_audit.md §2, measured). Our
   scorer must score an answer near zero when it contributes no information beyond the question's
   own content and the ground truth contains an answer. This single property, demonstrated
   side-by-side, is the strongest improvement exhibit we hold.
7. **Continuity over cliffs.** The champion is a step function (16 words 0.011 → 17 words 0.992;
   one synonym swap collapses it). Ours must degrade smoothly with factual disagreement — cliffs
   are what make parroting dominant and near-misses indistinguishable from garbage. Calibration
   for the gate (stddev, margin) must come from genuine spread, not a step band.
8. **Precision of the answer, not recall of the truth.** The text scored is `converted_answer` — a
   flat third-person summary, 86.9% opening literally "The data …", **2.25× shorter** than the
   markdown/first-person ground truth (`recon/2026-08-27-node-gate-analysis.md` §4.1). A
   recall-of-truth scorer penalizes every terse-but-correct answer (why live medians sit at
   ~0.006); score *of what the answer asserts, how much the ground truth supports it*. Normalize
   the boilerplate prefix before scoring.
9. **Non-answers are near-zero.** Empty `converted_answer` (~47% of live traffic) and the literal
   content-filter refusal `"- The generated text has been blocked by our content filters."` must
   both score ~0 whenever the ground truth carries a real answer. Degrade gracefully if handed raw
   JSON (conversion occasionally yields nothing and the raw `miner_answer` may be passed instead).

## A4 — The legitimacy boundary is a design constraint

General intent correctness only. JSON and prose answers with equal facts score equally. No
fingerprints of any specific miner (slug, wallet, field names, phrasing) — favoring OR
disfavoring. The fixture suite must include adversarial cases where a livecert-style answer is
factually wrong and scored down. Source and reasoning are published for manual review.

## A5 — The proof harness is part of the product

Manual review decides winners, so the deliverable is script + evidence. The harness must:

- run baseline and candidate side-by-side on the same fixture corpus (pinned binaries);
- report an interpretable accuracy metric: **pairwise ranking accuracy** (does the scorer rank
  the factually-better answer above the worse one?) plus score-vs-correctness correlation;
- include three fixture classes: neutral (typical answers), adversarial (gaming attempts,
  refusals, stuffing), and **real recorded traffic** (public `/scores` records with actual
  question/ground_truth/answer triples);
- be one command, reproducible by a reviewer.

## A6 — Portfolio: one generic core, tuned per intent, registered on soft targets · LOCKED 2026-08-27

One generic fact-aware `no_std` core with thin per-intent fact extractors — the same
one-source-compiled-per-intent shape the salience champion uses (`tune.py` over ~700 builds).
Registration is gas-only and reversible, so multiple champion slots are the realistic Track 2 win
(pending the organizer ranking-formula answer, G-open). **Target selection is measured and timed,
not fixed** — the champion_margin bar drifts with fixture rotation (weather swung 0.53→0.99 in
48 h), so poll `/api/wasm` for the target's current bar and register at a local low.

**Correction 2026-08-27:** the committed `track1-miner/miner.yaml` declares `supported_intents:
SSL_VERIFICATION, STORM_ALERT, WEATHER_FORECAST, IP_GEOLOCATION, CVE_LOOKUP` — so **all five
natural targets are mined by livecert.** Registration and proof therefore split:

- **Proof corpus (the 50% exhibit): any Tier A intent, mined ones included.** Demonstrating our
  scorer out-ranks the champion is analysis, not self-dealing — a scorer only affects an intent it
  is *registered* on. Use the mined intents freely here; that is where our data is richest.
- **On-chain champion registration: prefer a NON-mined Tier A intent** until the organizer clears
  overlap (G10). A scorer registered on, e.g., URL_SCAN cannot touch how livecert is scored on
  SSL, so it is unimpeachable *and* still wins Track 2 (a held champion slot + a demonstrated
  improvement). Non-mined Tier A set to survey at registration time (poll `/api/wasm` for the
  softest gate — lowest `champion_margin`, single-miner → Spearman-skipped): URL_SCAN (security,
  deterministic — best narrative fit), STOCK_PRICE, CRYPTO_PRICE, FINANCIAL_DATA, CURRENCY_EXCHANGE,
  WALLET_BALANCE_CHECK, GAS_PRICE, TOKEN_HOLDER_COUNT, TVL_LOOKUP, ONCHAIN_TX_LOOKUP, WEATHER_CHECK,
  SPORTS_SCORE, GAME_RESULT.

Build/validation still starts on **IP_GEOLOCATION + STORM_ALERT** (richest data, single-miner
IP_GEO gives a Spearman-free validation of the core); those double as proof intents. If G10 is
answered "overlap is fine with disclosure," they also become registration targets — their gates
are known (STORM bar ~0.859 is the softest measured). Register on whichever intent's gate is
lowest at the moment, mined-status permitting.

## A8 — The gate we must clear · reference (`recon/2026-08-27-node-gate-analysis.md`)

Two agreeing sources (git-history docs + 1,033 live rejections). A candidate is promoted only if it
clears **every** check for the intent:

| Check | Bar | Note |
|---|---|---|
| stddev | scores' stddev **> 0.05** (strict) | a flat scorer is rejected |
| self-match | `rank_answer(q,gt,gt)` **≥ max(0.75, incumbent self-match)** | a ratchet; never regresses |
| Spearman | rank-corr vs champion on real answers **≥ 0.60** | **skipped when <2 distinct miners** |
| margin | mean(good)−mean(bad) **strictly > champion_margin** AND **≥ 0.15** | docs say "≥"; live gate is strict `>` (186 promotions). Exact ties fail |
| wins | good>bad on **≥** as many cases as champion | ties are fine |
| wall-clock | full fixture gate **< 10 min** incl. load | 3-attempt cap; no heavy embed |

Fixture **contents** are closed-source and unrecoverable (GAPS G11); the harness proxies them with
real `/scores` traffic, which §3.1 argues is plausibly their actual source. A real (cheap,
reversible) registration is the final confirmation.

## A7 — Conventions

Boring, explicit code; files under ~300 lines; TypeScript for harness tooling, Rust for the
module; one task = one change = one commit; no secrets anywhere (nothing here needs any).
