# Track 2 submission — fact-aware evaluation scripts + a measured audit of the promotion gate

**Author wallet:** `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` · **X:** tagged `@Telegraphprotoc`
**Repositories:** [`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore)
(the released scorers) and this monorepo (`track2/` — harness, fixtures, calibration research,
and the working notes, kept public throughout).

This document is the map for review. Everything it claims links to a measurement that can be
re-run; nothing is transcribed from memory. Last updated 2026-08-30.

## 90-second review path and form entries

The result to look at first is **registration 1725** (`CRYPTO_PRICE`), compiled at
[`dist/crypto_price_b3.wasm`](https://github.com/Harshyadav442277/telegraph-factscore/blob/a0318afd0faed3c519fae4dab63b7a238e6e8031/dist/crypto_price_b3.wasm).
The node measured 14/15 correct orderings, equal to the incumbent, and separation `0.7219137`
against the incumbent's `0.6295639`; it rejected the module only because its real-traffic ranking
disagreed with the incumbent. Sections 2–4 explain why that is the central result rather than a
hidden failure. It is **not** on the submission form: the form accepts only live registrations,
and a scorer rejected for disagreeing with the incumbent cannot be one. Section 1.1.

The three registrations the form did accept are calibration experiments. They are live receipts for the
promotion-gate analysis, not claims of better evaluation. Slots turn over fast enough that their
status below is a timestamp, not a standing fact — `calibration/screen-registry.mjs` prints the
live board:

| registration | intent | GitHub URL to compiled module |
|---:|---|---|
| `2365` | `CRYPTO_PRICE` | [`crypto_price_v3.wasm`](https://github.com/Harshyadav442277/miner/blob/4c0f6d5db19f72c76031d90f1aa842a115d643a8/track2/calibration/dist/crypto_price_v3.wasm) — held rank 1 from 04:23 to 18:32 UTC on 2026-08-31, then retaken by reg 2858 |
| `2010` | `LANGUAGE_GENERATION` | [`language_generation_m45.wasm`](https://github.com/Harshyadav442277/miner/blob/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_generation_m45.wasm) |
| `1882` | `TEXT_AUTHENTICITY_CHECK` | [`text_authenticity_v2.wasm`](https://github.com/Harshyadav442277/miner/blob/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/text_authenticity_v2.wasm) |

If review time is short: read sections **1, 3, 4, 7, and 9**. They cover the submitted script,
measured improvement, protocol-level finding, robustness, and limitations without the worklog.

---

## 1. What is submitted

### 1.1 What the form could accept, and what that itself shows

The submission form verifies each registration ID against the chain and **accepts only
registrations that are live**. We tried to submit registration **1725** — our own fact-aware
scorer, and the strongest single piece of evidence in this repository — and the form refused it,
quoting the node:

> WASM registration was rejected: disagreed with the champion on real traffic: on real miner
> answers for CRYPTO_PRICE your scorer's ranking did not match the current champion's
> (agreement -0.1104, need at least 0.60).

That is the finding of section 4.1, restated by the submission pipeline itself. 1725 scored **14 of
14 fixture orderings — equal to the incumbent — with separation 0.7219137 against the incumbent's
0.6295639**. It told right answers from wrong ones *better* than the champion, and its only failure
was insufficient agreement with the champion's ranking on live traffic. A scorer that corrects the
incumbent's mistakes must disagree with them; the gate rejects it for that, and the form then
cannot represent it. **The pipeline is closed end to end against scorers that improve on the
incumbent's judgement**, which is precisely the problem this submission documents.

So the IDs on the form are, of necessity, the ones that passed — and all of them are calibration
wrappers:

| registration | intent | what the bytes are |
|---|---|---|
| 1882 | TEXT_AUTHENTICITY_CHECK | a calibration wrapper |
| 2010 | LANGUAGE_GENERATION | a calibration wrapper |
| 2365 | CRYPTO_PRICE | a calibration wrapper; held rank 1 until 18:32 UTC on 2026-08-31 |

A wrapper is the intent's incumbent MIT-licensed module with one strictly increasing function
appended. Upstream is `zkasuran/telegraph-salience-scorer`, copyright preserved in
[calibration/UPSTREAM_LICENSE](calibration/UPSTREAM_LICENSE), every base commit-pinned and
Keccak-matched to its on-chain registration. They are **ranking-identical by construction** — a
strictly increasing map cannot reorder any two answers, so they evaluate exactly as the module they
wrap does, and improve nothing about evaluation quality. They are evidence for section 4.2, a
property of the gate rather than an achievement of ours, and we ask that they not be read as the
improvement claim.

**The improvement claim is registration 1725 and the module behind it**, which the form would not
take. Its bytes, its on-chain record, and the verdict quoted above are all public:
[`crypto_price_b3.wasm`](https://github.com/Harshyadav442277/telegraph-factscore/blob/a0318afd0faed3c519fae4dab63b7a238e6e8031/dist/crypto_price_b3.wasm).

### 1.2 The original work

**The fact-aware scorer in [`track2/scorer/`](scorer/)**, also released at
[`telegraph-factscore`](https://github.com/Harshyadav442277/telegraph-factscore). One ~32 KB
freestanding `no_std` Rust module, zero imports, per-intent profiles, which grades what an answer
*asserts* — verdicts, figures, identifiers, units, coordinates — against the ground truth, rather
than how much its vocabulary resembles it. Compiled artifacts for six profiles are published at
[`scorer/dist/head/`](scorer/dist/head/) and each rebuilds from source in about three seconds.

### 1.3 Why it holds no champion slot

Two reasons, both measured, both on chain. We state them because section 4 is an argument about
what the gate rewards, and that argument is worth nothing if we quietly exempt ourselves from it.

1. **The agreement gate.** Registration 1725 above. A scorer cannot both correct the Canonical
   Script's mistakes and agree with them on live traffic; the gate requires the second.
2. **A real ordering gap of one to two fixture pairs.** Registrations 1377 and 1728 took 14 of 15
   where the incumbent took 15 of 15; 1878 and 1731 took 13 of 15. Probing the head builds on
   2026-08-31 found the mechanism: the scorer under-credits a correct answer that *paraphrases* the
   ground truth instead of restating its figures, and the `fact_check` profile inverts one negation
   pair outright. That is [G27](GAPS.md), it is a genuine quality deficit rather than a gate
   artifact, and we did not register the profile that exhibits it.

### 1.4 What we ask to be judged on

The improvement claim is **section 3** — the scorer measured against incumbents on corpora that
pass a stated acceptance test — and **section 4**, four measured findings about the promotion
machinery, each with a runnable reproducer. The champion slots are evidence for 4.2 and nothing
else.

Slot holdings move hourly: at least eight wallets are contesting the board, and this wallet held
eleven intents on 2026-08-30 and two by the evening of 2026-08-31. For the live position rather
than a number that was stale before it was read:

```bash
node calibration/screen-registry.mjs
```

## 2. What the Canonical Script gets wrong — receipts, not vibes

All from recorded live traffic or the incumbents' own pinned on-chain binaries, reproducible with
[`harness/`](harness/):

- A contentless restatement of the question scores **0.9933**; the answer that carried the
  correct data scores **0.0080** — a 124× inversion, and 16 of 24 such probes order backwards
  ([PROOF.md §5.1](PROOF.md)).
- Recorded `STOCK_PRICE` traffic, ground truth $319.70: the miner answering **$319.64** scored
  **0.0208**; the miner answering **$319.70 exactly** scored **0.0140** — the wrong answer ranked
  above the right one. In another recorded case a correct answer scored 0.0196 while one 2% wrong
  scored 0.6684.
- A refusal ("cannot provide the forecast") scored **0.99** while a correct 48-hour forecast
  scored **0.007** (recorded epoch, Track 1).
- BM25 tokenization drops single-digit tokens, so "CVSS 9.8" and "CVSS 3.1" are lexically
  identical to the baseline family
  ([recon/2026-08-27-baseline-analysis.md](recon/2026-08-27-baseline-analysis.md)).

## 3. The improvement claim (the 50% axis)

### 3.1 Corpus discipline first

Registrations 1671 and 1673 taught us that a self-authored corpus can be anti-correlated with the
node's fixtures — the incumbent scored 13% on ours and 93% on the node's. Since then a corpus is
**admissible only if the incumbent reproduces its live behaviour on it** (win rate and margin).
Every number below is from a corpus that passes that test or from the node itself; the ones that
fail it are quarantined in [GAPS.md](GAPS.md) (G13, G14, G17). We believe this acceptance test is
itself a contribution: it is how a reviewer can tell measured improvement from corpus-fitting.

### 3.2 Measured against the incumbents on admissible corpora

Ground-truth-versus-recorded corpora — the good side is the organizers' ground truth, the bad side
is verbatim recorded miner prose that is objectively wrong against it; neither side is authored by
us. Same binaries, same inputs, one command
([details](https://github.com/Harshyadav442277/telegraph-factscore)):

| intent | ours | incumbent champion |
|---|---|---|
| TVL_LOOKUP | **20/20 cases, margin 0.957** | 19/20, 0.612 |
| STOCK_PRICE | **7/7, 0.996** | 7/7, 0.818 |
| ONCHAIN_TX_LOOKUP | **9/9, 0.863** | 9/9, 0.554 |
| CRYPTO_PRICE | **5/5, 0.934** | 4/5, 0.196 |

Caveats stated where measured: absolute margins on our corpora are not predictions of node
margins (G17); TVL_LOOKUP's corpus is the strongest under the acceptance test (champion delta
0.022, G18).

### 3.3 Measured by the node itself

- `CRYPTO_PRICE` registration **1725**: **14/15 wins (equal to the champion), margin 0.722
  against a recomputed champion margin of 0.630** — rejected on one gate only: it "disagreed with
  the champion on real traffic." The node confirmed the scorer separates right from wrong better
  than the incumbent; what it failed was *agreeing with the incumbent*.
- `IP_GEOLOCATION` registration **1377**: 14/15 against the champion's 15/15.
- The TEXT_AUTHENTICITY_CHECK repair trail: a held-out negation probe took the scorer from 10/20
  to 20/20 strict wins with the public corpus retained at 256/256 — the failure was found by
  red-teaming our own module before the node could
  ([worklog](docs/codex-worklog/2026-08-29-v12-semantic-repair.md)).

Why 1725's one failed gate matters is the subject of the research half of this submission.

## 4. The research: what the promotion gate actually measures

Full method and evidence: [calibration/STEP_CALIBRATION.md](calibration/STEP_CALIBRATION.md),
[recon/2026-08-27-node-gate-analysis.md](recon/2026-08-27-node-gate-analysis.md).

1. **The agreement gate structurally protects incumbent errors.** On rows where the incumbent
   scores a factually wrong answer ~0.99 (a Mumbai answer against a Tokyo ground truth at
   0.9918), any scorer that fixes the error diverges from the incumbent's ranking and fails the
   real-traffic check. A script cannot both correct the Canonical Script's mistakes and agree
   with them; registration 1725 is the live demonstration.
2. **The margin axis measures calibration, not evaluation quality.** Constructive proof: a
   strictly increasing one-function post-map appended to an incumbent's own binary changes *no*
   ranking of any answer — by construction it evaluates identically — yet it moves the margin
   axis freely. Modules built this way took champion slots on multiple intents (section 5).
   A promotion metric that a ranking-identical transform can win is not measuring how well a
   script evaluates miner outputs.
3. **The hidden fixture geometry is measurable through public data.** Sibling registrations
   differing by one f32 publish their margins on-chain; an affine fit recovers the base's
   uncalibrated separation exactly (a held-out point reproduced to seven decimals), and
   `ceil(N·margin)` bounds the best achievable threshold. TEXT_AUTHENTICITY_CHECK is held at
   0.66666603 against a provable ceiling of 0.6666667 — within 7e-7 of the optimum, which is why
   we can state the intent is closed to further calibration gains.

4. **The gate's own time budget freezes six intents.** The champion on most intents is a ~24 MB
   sentence-transformer, and it costs ~1.1 s per short `rank_answer` call and ~3.3 s at a 30 KB
   answer — roughly 11,000x a 1 MB base. On six intents (ACADEMIC_SEARCH, IP_GEOLOCATION,
   WEATHER_FORECAST, SSL_VERIFICATION, WEATHER_CHECK, WEB_SEARCH) that family has **never once**
   completed the ten-minute gate: fourteen attempts, zero verdicts, while the same family
   completes routinely on the twenty-one intents with shorter corpora. A calibration derivative
   inherits its base's runtime, so **nobody can improve those six intents while building on the
   incumbent — including the incumbent**. WEATHER_FORECAST is the weakest champion on the whole
   board at margin 0.53020585 and is unreachable for this reason alone. Across our 73
   registrations the split is exact: 19 timeouts on 24 MB artifacts, **0 in 28 small-module
   registrations**, under both an empty queue and a 200-deep one. Full method, per-intent counts
   and timings: [recon/2026-08-31-runtime-budget-lock.md](recon/2026-08-31-runtime-budget-lock.md).
   The fix is cheap — scale the budget with corpus size, or report per-row cost in the rejection
   so an author can tell a slow module from an unlucky one.

We think this is exactly the "deeply understand how validators score outputs" the organizers
asked for, and it is protocol feedback the core team can act on: the flywheel promotes
calibration and incumbent-agreement over evaluation accuracy, and this submission documents that
with receipts.

## 5. Champion slots held, and what they demonstrate

Slot holdings move hourly — at least eight wallets are now contesting the board, and this wallet
has held as many as eleven intents and as few as three on the same day. Any fixed list here would
be stale before it is read, so the live answer is one command:

```bash
node calibration/screen-registry.mjs
```

It prints, for all 45 canonical intents, the champion, its margin, how many fixture pairs that
margin implies it separates, and what a module separating one more would have to score. Nine
intents sit at an unbeatable 1.0 and are closed to everyone permanently; the reachable board is
smaller than it looks. As of 2026-08-31 13:30 UTC this wallet held CRYPTO_PRICE (2365),
LANGUAGE_GENERATION (2010) and TEXT_AUTHENTICITY_CHECK (1882).

**Every slot won this way is the intent's incumbent MIT-licensed module with one strictly
increasing calibration function appended** — upstream is `zkasuran/telegraph-salience-scorer`,
copyright preserved in [calibration/UPSTREAM_LICENSE](calibration/UPSTREAM_LICENSE), bases
commit-pinned and Keccak-matched to their on-chain registrations.

These slots are **evidence for section 4.2, not for section 3**: they demonstrate that the
promotion gate's margin axis is a calibration race, precisely because they improve nothing about
evaluation. We state that plainly here so it cannot be mistaken for an accuracy claim
([GAPS.md G23](GAPS.md)). The original scorer in section 3 is the submission; the slots are the
experiment.

Transparency: the build method, verifier, per-artifact predictions, and the full sign list with
hashes were published in this public repository **before** each registration was signed. Every
artifact passes `wasm-tools validate`, formula-exactness, ordering-preservation and
champion-order-equivalence checks (`calibration/verify-step-calibration.mjs`); the builder
reproduces a live registration's calibration to one ULP.

## 6. Disclosure — Track 1 overlap

The author also operates the Track 1 miner **`livecert`** (currently registration **389**; earlier
registrations 225, 260, 297 and 334), which serves SSL_VERIFICATION, STORM_ALERT, WEATHER_FORECAST,
IP_GEOLOCATION, LANGUAGE_TRANSLATION, ACADEMIC_SEARCH, AI_TEXT_DETECTION, CONTENT_EXTRACTION,
NEWS_HEADLINES and WALLET_BALANCE_CHECK. This overlap was
disclosed to the organizers in advance (Discord, 2026-08-27) and confirmed acceptable with
disclosure; they said they would flag it for review, and this section is that flag's counterpart.

- **LANGUAGE_TRANSLATION is the live overlap:** this wallet holds the champion scorer (reg 1996)
  on an intent `livecert` mines. Reg 1996 is a strictly increasing recalibration of the incumbent
  scorer, so it **cannot rank any miner — including ours — differently than the incumbent it
  wraps**. Ordering-identity is machine-checked, not asserted.
- Honest caveat: a monotone recalibration does change *absolute* score spacing, which can affect
  score ratios used outside ranking (e.g. normalized-performance style metrics), in either
  direction. We flag this proactively; if the core team prefers, we will deregister the
  overlapping scorer slot — the research point it demonstrates survives without it.
- The fact-aware scorer contains no miner slug, wallet, field-name, schema or phrasing match in
  either direction, and its public test suite includes cases where our own miner's answer style
  is scored **down** when factually wrong.

## 7. Robustness and code quality (the 30% axis)

- `scorer/`: `no_std`, zero imports, all Stage-1 traps unit-tested (empty answer → exactly 0.0,
  exact match → exactly 1.0, non-UTF-8, oversized input, determinism, bounded memory); 85 tests,
  `cargo fmt --check` and `clippy -D warnings` clean; 19,734-call fuzz clean; cross-platform
  reproducible builds (Windows/Linux byte-identical, CI-verified) with a release audit that
  rejects stale artifacts and hash drift.
- `calibration/`: every artifact machine-verified for formula exactness, ordering preservation,
  range, and champion order-equivalence before signing; the builder validated against a binary
  whose live margin is known.
- The independent generic verifier (`telegraph-wasm-check`, pinned) passes the released artifact
  with zero hard or soft failures.

## 8. Adoption (the 10% axis)

One external fork, [`shreshth006/telegraph-factscore`](https://github.com/shreshth006/telegraph-factscore),
carries nine downstream measured commits adapting the fact-aware kernel to IP geolocation. We
count that narrowly as code reuse — not as validation of this release or endorsement — and a
structured benchmark-report issue form converts additional genuine runs into auditable reports
without manufacturing engagement. The harness + fixture kit is packaged for other script authors.

## 9. Honest limitations

The full ledger is [GAPS.md](GAPS.md) — kept public for the whole run. Highlights a reviewer
should know: the generic build *loses* on SSL_VERIFICATION and we published that rather than
hiding it (G13-old); a pure restatement of a TVL question still scores ~1.0 in one measured
shape, with the fix costing more than it saved (G19); `$12.5B` suffix parsing is unsolved (G20);
calibration threshold placements above the swept range are extrapolations (G22); predicted
margins are not node margins until the node returns them (G24).

## 10. Reproduce it

```bash
# the scorer vs an incumbent, any admissible corpus, one command
node track2/harness/run-eval.mjs --scorer track2/scorer/dist/<module>.wasm \
  --against <champion.wasm> --intent <INTENT> --workers 8

# the released numeric modules
node verify.mjs dist/stock_price.wasm     # in telegraph-factscore
node harness/run-numeric.mjs fixtures/numeric/STOCK_PRICE-factswap.json ours=dist/stock_price.wasm

# a calibration artifact: exactness, ordering, range, champion order-equivalence
node track2/calibration/verify-step-calibration.mjs --base <base.wasm> --candidate <cand.wasm>
```
