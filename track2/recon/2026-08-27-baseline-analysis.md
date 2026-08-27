# Official baseline analysis — telegraph-wasm-baseline (Track 2)

**Date:** 2026-08-27 · **Scope:** the OFFICIAL BASELINE only
(`github.com/telegraphprotocol/telegraph-wasm-baseline`). The live champion WASMs
(`zkasuran/telegraph-salience-scorer`) and the `/api/wasm` registry are a separate
agent's scope and are referenced here only as corroborating measurement.

**Companion doc:** `track2/recon/2026-08-27-track2-scorer-spec.md` covers how to author /
build / submit a module and the champion internals. This doc is the missing half: the
**baseline's** exact internals and where it mis-ranks. They are meant to be read together.

**Method:** full source read of the cloned repo (commit `dfa0cf7`, 3 commits total:
`2711dc5 baseline wasm` → `dff6d32 docs update` → `dfa0cf7 Add MIT License`). Nothing
was executed — see toolchain status. Every scoring claim below is either a **verbatim
quote** (cited `file:line`) or an **analytic derivation** from the quoted formula,
explicitly labelled. Live `/scores` records are **measured** but come from the champion
scorers, not this baseline binary.

---

## 0. Toolchain status — cannot build or run here (do not install)

- `cargo --version` → not found. `rustc --version` → not found. No `~/.cargo`, no
  `rustup`. The `wasm32-unknown-unknown` target is therefore absent.
- **Requirement to build:** Rust stable + `rustup target add wasm32-unknown-unknown`,
  then `cargo build --release --target wasm32-unknown-unknown [--features real_weights]`
  (README.md:47-59). Output: `target/wasm32-unknown-unknown/release/telegraph_scoring.wasm`.
- The bundled `weights/minilm_l6_v2_q8.bin` is a **genuine 22,509,880-byte INT8 MiniLM-L6-v2
  export** (size matches 30522×384 word-emb + 128×384 pos + 6 encoder layers + biases), and
  `vocab.txt` is the real 30,522-line BERT-uncased vocab (`[PAD]`,`[unused0]`…). So
  `real_weights` mode is fully functional out of the box — no Python/export step needed
  (README.md:52-55). We simply cannot compile it in this environment.
- Offline harness `track1-miner/docs/codex-worklog/probe-champion.mjs` runs a **prebuilt**
  `.wasm` under Node's `WebAssembly`; it cannot help until someone compiles the baseline
  elsewhere. It *does* confirm the ABI (below) because it drives the live champions through
  the identical interface.

---

## 1. Exact scoring formula (verbatim)

### 1.1 Composite weights — `src/lib.rs:54-57`

```rust
const W_RELEVANCE:   f32 = 0.25; // cosine(question,     miner_answer)
const W_CORRECTNESS: f32 = 0.50; // cosine(ground_truth, miner_answer)
const W_LEXICAL:     f32 = 0.15; // bm25(ground_truth,   miner_answer)
const W_LENGTH:      f32 = 0.10; // sigmoid length-quality penalty
```

### 1.2 The composite — `src/lib.rs:126-132`

```rust
fn composite(relevance: f32, correctness: f32, lexical: f32, len_quality: f32) -> f32 {
    let score = W_RELEVANCE   * relevance
              + W_CORRECTNESS * correctness
              + W_LEXICAL     * lexical
              + W_LENGTH      * len_quality;
    math::clamp01(score)
}
```

So: **`score = 0.25·cos(Q,A) + 0.50·cos(GT,A) + 0.15·bm25(GT,A) + 0.10·lenq(A)`**, clamped
to [0,1]. Half the weight is `cos(ground_truth, answer)`; a further 0.15 is `bm25(ground_truth,
answer)`. **65% of the score is "how much does the answer resemble the ground-truth text",
split between one embedding-cosine term and one bag-of-words term.** None of the four terms
parses a number, a unit, an identifier, or a boolean verdict.

### 1.3 The four raw signals — `src/lib.rs:110-123`

```rust
let relevance   = math::cosine(q_vec, ma_vec);
let correctness = math::cosine(gt_vec, ma_vec);
let lexical     = bm25::score(ground_truth, miner_answer);
let len_quality = math::sigmoid((miner_answer.len() as f32 - 50.0) / 20.0);
```

`cosine` clamps negatives to 0 and returns 0 for a zero vector (`math.rs:15-34`), so every
signal is in [0,1].

### 1.4 Length "penalty" is actually a verbosity **bonus** — `src/lib.rs:120`

`len_quality = sigmoid((len_chars − 50) / 20)` is **monotonically increasing** in answer
length. It only ever penalises *short* answers; it never penalises long ones (it saturates
at ~1.0, never turns back down). Concretely:

| answer length (chars) | `len_quality` | ×0.10 contribution |
|---|---|---|
| 3  (`"9.8"`)       | 0.087 | 0.009 |
| 6  (`"142.50"`)    | 0.100 | 0.010 |
| 50                 | 0.500 | 0.050 |
| 110                | 0.953 | 0.095 |
| 150+               | 0.993 | 0.099 |

A terse, exactly-correct numeric answer is docked ~0.088 of composite relative to any
120-char paragraph. The README gloss ("penalizes unusual length") is **false to the code** —
there is no upper penalty; the curve rewards verbosity without bound. *(Discrepancy worth
noting for the 30% code-quality axis: the doc claim and the implementation disagree.)*

### 1.5 The `rank_answer` ABI — `src/lib.rs:144-163`

```rust
#[no_mangle]
pub unsafe extern "C" fn rank_answer(
    q_ptr: i32,  q_len: i32,  // question
    gt_ptr: i32, gt_len: i32, // ground truth
    ma_ptr: i32, ma_len: i32, // miner answer
) -> f32 {
    ...
    if miner_answer.trim().is_empty() { return 0.0; }
    ...
}
```

- **Argument order: `(q_ptr, q_len, gt_ptr, gt_len, ma_ptr, ma_len)`** — question, then
  ground_truth, then miner_answer; six `i32` (three ptr/len pairs into WASM linear memory).
- **Return: an `f32` in [0,1]** — NOT an int, NOT scaled. The live `/scores` `score` field is
  this f32 verbatim: `track1-miner/docs/codex-worklog/probe-champion.mjs:134-138` calls
  `Number(rankAnswer(...q, ...g, ...a))` and the recon reproduced reported scores to ~9
  decimals (`converted_answer` → `0.006989836692…` vs reported `0.0069898367`,
  `track1-miner/docs/codex-worklog/2026-08-26-live-scoring-recon.md:63-76`). This also confirms
  the scorer's answer input is `converted_answer` (the protocol's NL conversion), not raw JSON.
- **Empty/whitespace answer short-circuits to 0.0** (`lib.rs:155`). Confirmed live: miners whose
  `converted_answer` is empty score exactly 0 (e.g. `nvd`, `certspotter` below).
- Host writes strings via the module's own `alloc` (`lib.rs:294-301`); `dlmalloc` global
  allocator, `panic → wasm32::unreachable` trap (`allocator.rs`). All float math is `libm`
  (software) for cross-node bit-determinism (`math.rs:1-5`).

Other exports (same ABI family): `rank_answer_cached` (reuses precomputed Q/GT vectors,
identical `composite`, `lib.rs:189-213`), `breakdown_answer` (writes `[relevance, correctness,
lexical, length, composite]` f32[5] to a static buffer, returns its ptr, `lib.rs:229-256`),
`embed`→f32[384] ptr, `cosine_sim`, `bm25_score`, `alloc`, `dealloc`.

---

## 2. Projection vs `real_weights` — the decisive, and UNVERIFIED, question

The default build is **projection mode**; `real_weights` is a non-default Cargo feature
(`Cargo.toml:13-16`, `default = []`). What the feature swaps:

### 2.1 Projection mode (DEFAULT) is NOT semantic at all

`embed.rs:5-14` says it plainly:

> "Uses a deterministic random-projection to convert token IDs to a 384-dim float32 vector.
> This is **NOT semantically meaningful** — two sentences about the same topic will not
> necessarily score high cosine similarity."

The tokenizer hashes each **word** to one id via FNV-1a (`tokenizer.rs:94-97`), and the
embedding is a fixed pseudo-random projection of those ids with a `1/(i+1)` position decay
(`embed.rs:72-99`):

```rust
let col = (id as usize) % PROJ_COLS;                 // PROJ_COLS = 512
let w = lcg_f32(SEED ^ ((d as u64) << 32) ^ (col as u64));
val += w / (i as f32 + 1.0);                          // earlier tokens dominate
```

Consequences an author can exploit or must defend against:

1. **`cos(GT, A)` degenerates to first-word hash-overlap.** Two texts are "similar" only to
   the degree they share the *same words* (same FNV id → same projection column). It is a
   fuzzy, position-weighted bag-of-words match — so in projection mode the 0.50 "semantic
   correctness" term is really a *second lexical term*, and the whole composite is ~lexical +
   length. Numeric/factual correctness is completely invisible.
2. **A high similarity floor from `[CLS]`.** `[CLS]` (id 101) sits at position 0 in every
   input with weight `1/(0+1)=1.0` — the single largest term — and contributes an **identical**
   vector to every embedding. After L2-normalisation all vectors cluster toward that shared
   direction, so even unrelated strings post inflated cosine and the signal's dynamic range is
   compressed. Discrimination is weak and dominated by the first content word (position 1,
   weight 0.5).

### 2.2 `real_weights` mode is a genuine MiniLM forward pass

A from-scratch 6-layer BERT encoder (multi-head attention, post-LN, GELU, position + token-type
embeddings) over the bundled INT8 weights (`embed.rs:158-245`; WordPiece tokenizer with binary
vocab search, `tokenizer.rs:141-215`). This produces real sentence embeddings — but see §3.4:
real semantics still cannot separate antonyms/near-numbers, so the factual blind spot persists,
just more subtly.

### 2.3 Which mode is the *canonical/live* scorer? — **UNVERIFIED**

The repo titles itself "Telegraph's **production** WASM scoring module" (README.md:1-7) yet
ships projection as the **default** and calls it "not for judging real answer quality"
(README.md:40-45). Nothing in the repo states which build is registered on-chain, and I cannot
introspect the champion binaries (other agent's scope). **This must be resolved before we frame
the "improvement over baseline" proof**, because it changes the argument's strength:

- If the canonical baseline is the **default projection** build → mis-ranking is *total and
  trivial* (no semantics whatsoever; §3.1–§3.3 hold with Δ≈0).
- If it is the **`real_weights`** build → mis-ranking is *narrower but still decisive* on
  numbers, units, identifiers, verdicts, and antonyms (§3.4).

Either way our fact-aware thesis wins; the demo fixtures should show **both** modes so the
proof is robust to this unknown. Flagged for `track2/GAPS.md`.

---

## 3. Structural blind spots (analytic, from the quoted formula)

### 3.1 The tokenizer's `len ≥ 2` filter deletes single digits → **numbers vanish from BM25**

`bm25.rs:77-80`:

```rust
fn tokenise(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|s| s.len() >= 2)   // ← drops every single-character token
```

Split is on non-alphanumerics, so a decimal point separates digits. Worked examples:

- `"9.8"` → `["9","8"]` → both length 1 → **filtered to `[]`** → BM25 sees no terms.
- `"3.1"` → `["3","1"]` → **`[]`**. Therefore **`bm25(GT,"CVSS 9.8") == bm25(GT,"CVSS 3.1")`** —
  both reduce to the single term `"cvss"`; the CVSS number, the one decision-relevant fact,
  is **provably invisible to the lexical signal**.
- `"142.50"` → `["142","50"]` → kept (≥2 chars), so *multi*-digit groups survive, but any value
  a decimal point splits into 1-digit pieces (`9.8`, `3.1`, `0.5`, a `7-2` score, `1.2mm`) is
  erased. Coverage of the "numbers matter" intents is thus arbitrary and mostly-blind.

### 3.2 The length curve rewards a verbose wrong answer over a terse right one (§1.4)

Independent of embedding mode. A correct `"$101.03"` (7 chars, len_quality 0.10) concedes
~0.088 composite to any padded paragraph before the semantic terms are even considered.

### 3.3 Half the weight is `cos(GT, answer)`, which measures *resemblance*, not *truth*

"Semantic correctness" is literally cosine to the ground-truth *string*. An answer that
**echoes the ground truth's vocabulary while asserting the opposite fact** (wrong number,
inverted verdict, "unavailable") scores high on this 0.50 term and on the 0.15 BM25 term. This
is the mechanism behind the measured 142× WEATHER refusal inversion (§4).

### 3.4 Even real MiniLM can't separate antonyms or near-numbers

`"valid"` vs `"expired/invalid"`, `"CVSS 9.8"` vs `"CVSS 3.1"`, `"$101.03"` vs `"$412.75"` are
all embedding-*near* (same topic, same sentence frame) yet factually opposite. Sentence
embeddings encode topic/semantics, not numeric magnitude or polarity, so the 0.50 correctness
term barely moves between a right and a wrong answer that share a template — leaving the rank to
be decided by BM25 boilerplate overlap and the length bonus.

---

## 4. Concrete mis-ranking cases (grounded in real questions/ground-truths)

Questions and ground-truths below are **real**, pulled read-only from
`devnode.telegraphprotocol.com/scores?intent=…` on 2026-08-27 (epochs 284–285). The candidate
answers and the per-signal reasoning are **analytic against the baseline formula** (§1); I could
not execute the baseline WASM. Where the *live champion* already exhibits the failure, the
measured receipt is quoted alongside and labelled MEASURED (champion, not baseline).

### Case 1 — CVE_LOOKUP: wrong CVSS ties/beats right CVSS (numbers erased)

- **Q:** "Can you provide the severity and affected versions for CVE-2026-34612?"
- **GT:** "CVE-2026-34612 is a SQL injection vulnerability in Kestra … The severity is critical
  with a **CVSS score of 8.8**, and the affected version is before 1.3.7."
- **A_correct:** "CVE-2026-34612 is a critical SQL injection vulnerability in Kestra; **CVSS 8.8**;
  affected versions before 1.3.7."
- **A_wrong:** "CVE-2026-34612 is a critical SQL injection vulnerability in Kestra; **CVSS 9.9**;
  affected versions before 1.3.7."

Baseline per-signal (the two answers are identical except the digits):
- **BM25:** `"8.8"`→`[]`, `"9.9"`→`[]` (§3.1) → identical term sets → `bm25(GT,A_correct) =
  bm25(GT,A_wrong)` **exactly**.
- **cos(GT,·):** differ only in low-weight digit tokens → equal to ~1e-3 (projection) / very
  close (real).
- **length:** identical strings → identical.
- **Verdict:** composite(A_correct) − composite(A_wrong) ≈ **0**. The baseline cannot rank the
  correct severity above the wrong one; a coin-flip decides.
- **MEASURED (champion, not baseline):** for this exact question the **rank-1** answer
  (`patchsignal-cve`, score 0.012592356) converted to "…with a **CVSS score of 9.9**…" — i.e.
  the live winner states 9.9 against a ground truth of 8.8. The wrong number already wins in
  production.

### Case 2 — CRYPTO_PRICE: a non-answer / wrong price out-ranks the right number

- **Q:** "What is the current price of Solana (SOL) in USD?"
- **GT:** "The current price of Solana (SOL) is approximately **$101.03 USD**, based on the
  latest data available as of August 27, 2026 …"
- **A_correct (terse):** "$101.03" (7 chars).
- **A_wrong (verbose, no price):** "Based on the latest available market data for Solana (SOL)
  priced in US dollars, current pricing information could not be determined at this time." (≈150
  chars.)

Baseline per-signal:
- **length:** A_correct 0.10 vs A_wrong ~0.99 → **+0.089 to the wrong answer** outright.
- **BM25(GT,·):** GT terms include `current price solana sol approximately 101 03 usd … data
  available`. A_correct contributes only `101, 03` (2 matches). A_wrong contributes `current,
  price, solana, sol, usd, data, latest, available` (≈8 matches of GT's high-frequency words) —
  so **BM25 favours the price-free paragraph**.
- **cos(GT,·):** A_wrong is a full sentence sharing GT's framing words → higher cosine than a
  bare `"$101.03"` (which is dominated by the shared `[CLS]` term and 2 tokens).
- **Verdict:** the answer that never states a price out-scores the exactly-correct price on
  **all three** of length, lexical, and correctness. Clean inversion.
- **MEASURED (champion, not baseline):** the epoch-285 **rank-1** answer
  (`optivis-crypto-price`) converted to "The data shows the **absence of information** for both
  Ethereum (ETH) and Solana (SOL) cryptocurrencies." A converted answer that supplies **no
  price at all** took rank 1 (score 1.37e-8 — the whole intent is scoring at noise, so rank is
  decided by token coincidence).

### Case 3 — SSL_VERIFICATION: correct terse verdict barely separated from a tangential report; empty conversion sinks a correct answer

- **Q:** "Analyze the TLS/SSL certificate configuration for api.github.com including certificate
  validity, chain trust, and hostname verification."
- **GT:** "The TLS/SSL certificate configuration for api.github.com appears to be properly
  configured with valid certificates, a trusted chain, and correct hostname verification …"

**MEASURED live band (champion, epoch 285)** — four real answers, ranked, span a **20% window**:

| miner | converted_answer (truncated) | score | rank |
|---|---|---|---|
| `txlens` | "certificate for api.github.com is **valid** and will expire in 33 days, issued by Sectigo Limited." | 0.0082647 | 1 |
| `livecert` | *(empty — raw JSON was correct: `chain_complete:true, days_remaining:33`)* | 0.0074521 | 2 |
| `ssllabs` | "successful test of a GitHub API endpoint with a **grade of A+** and status READY …" | 0.0069353 | 3 |
| `certspotter` | *(empty)* | 0.0 | 4 |

Two baseline-relevant lessons, both reproducible under §1:
- **A correct answer scored ~0 for a conversion artefact:** `livecert`'s raw answer is fully
  correct, but its `converted_answer` is empty → `rank_answer` hits the empty-string
  short-circuit (`lib.rs:155`) and the scorer never sees the facts. Correctness is gated on NL
  conversion, not on the answer.
- **The scorer barely separates a correct verdict from a tangential one:** `ssllabs`'s "A+ grade
  READY" report never uses GT's verdict vocabulary ("valid / trusted chain / hostname") yet
  lands within 16% of rank 1, because it shares the topic words (`github, api, certificate`) and
  is long. Constructed inversion under the baseline: an answer asserting the **wrong** verdict —
  "api.github.com presents a **valid, trusted** certificate with complete chain and correct
  hostname verification" for a host that is actually **expired** — reuses *more* of GT's positive
  boilerplate (`valid, trusted, chain, hostname, verification`) than a correct "the certificate
  is **expired**, validation fails" answer, so BM25 and cosine both tilt toward the confident lie
  (§3.3–§3.4).

### Case 4 (flagship, MEASURED) — WEATHER_FORECAST: a refusal beats the correct forecast 142×

From `track1-miner/docs/codex-worklog/2026-08-26-live-scoring-recon.md:118-141`, against the
exact active champion:

- **Q:** Tokyo, 48 hourly values starting 2026-09-01T06:00Z, temp °C, precip mm.
- Correct 48-hour forecast (truthful, date-aware) → **0.0069898367**.
- A phrase **copying the published ground-truth wording** but claiming the forecast was
  unavailable → **≈0.992** (recon.md:118-121). A truthful full-series candidate that *did*
  reuse GT vocabulary → **0.9963806868** (142.55× the current answer).

This is §3.3 in the wild: the scorer rewards ground-truth-vocabulary echo, so a well-worded
**refusal** out-scores a correct-but-differently-phrased forecast by two orders of magnitude.
(Champion scorer; the baseline's 0.50 `cos(GT,·)` + 0.15 BM25 reproduce the same incentive.)

---

## 5. Submission / dataset / registration recon (task 5)

### 5.1 In `telegraph-wasm-baseline` — what exists vs absent

Complete tracked file list: `Cargo.toml`, `Cargo.lock`, `LICENSE` (MIT), `README.md`,
`build.rs`, `src/{lib,math,bm25,embed,tokenizer,allocator}.rs`,
`scripts/export_minilm_weights.py`, `vocab.txt`, `weights/minilm_l6_v2_q8.bin`, `.gitignore`.

- **PRESENT:** build/run instructions (README.md:38-80), the two build modes, a pointer to a
  separate examples repo — README.md:9-13 references a **`rust-module/` word-overlap example in
  the `wasm-scoring-module` examples repo** and a **`go-tester` CLI** (README.md:64-70) for
  loading a `.wasm` and calling `rank_answer`. Neither repo is included here.
- **ABSENT (⇒ UNVERIFIED in this repo):** any hackathon **submission instructions**; a
  **participating-intents list**; a **labeled evaluation dataset / fixtures**; a
  **canonical-script registration or PR flow**; `CONTRIBUTING`, `.github/`, issue/PR templates,
  or judging notes. None exist in this repo. There is **no** statement of which build
  (projection vs real_weights) is the registered canonical binary.
- The authoritative build/submit flow does exist off-repo — the official docs page
  `docs.telegraphprotocol.com/docs/scoring/build-a-scoring-module` and the rules page — both
  captured in the companion `track2/recon/2026-08-27-track2-scorer-spec.md`. So the flow is not
  globally unknown; it is simply **absent from the baseline repo itself**.

### 5.2 `github.com/telegraphprotocol/telegraph-skills` — NOT hackathon material

Cloned (shallow; some files hit Windows path-length limits but the tree and READMEs landed).
The repo is **OpenClaw** — "a personal AI assistant you run on your own devices" (its
`README.md:1-25`, "EXFOLIATE! EXFOLIATE!", `openclaw/openclaw` branding, Android/macOS/Kotlin/TS
app, ~5,200 files). A grep across its markdown for `canonical script | rank_answer | wasm
scoring | participating intent | telegraph protocol | hackathon` returned **zero hits**. It
contains **none** of: submission instructions, participating-intents list, eval dataset, or
canonical-script flow. Either the name collides with an unrelated project transferred into the
org, or the true skills/submission repo is elsewhere. **The `telegraph-skills` repo is not a
Track 2 source.** (The submission flow itself is covered by the official docs page — §5.1 and
the companion spec — not by this repo.)

### 5.3 Existing local intel already covers the rest

The `track2/` workspace (`ADVANTAGE.md`, `PHASES.md`, `TASKS.md`, `ARCHITECTURE.md`) holds the
verified rubric (50% improvement / 30% robustness / 10% X / 10% adoption), the Canonical-Script
definition, the Tier-A intent list, and the manual-review nature of judging. This analysis does
not duplicate it; it supplies the **baseline internals** that the "Phase A — Recon" plan in
`track2/PHASES.md` was waiting on, and pairs with `track2/recon/2026-08-27-track2-scorer-spec.md`
(champion internals + submission flow).

---

## 6. Bottom line for the 50% "improvement over baseline" axis

The baseline is **one generic resemblance scorer**: `0.25·cos(Q,A) + 0.50·cos(GT,A) +
0.15·bm25(GT,A) + 0.10·verbosity`. It measures how much an answer's *words* look like the
ground truth's words, plus a length bonus. It has three exploitable, demonstrable defects, none
of which require guessing which build is live:

1. **Numbers are second-class or invisible** — decimal values split by `.` lose single digits to
   the `len≥2` filter (`bm25.rs:80`); `cos` treats magnitudes as weak tokens. CVSS/price/score
   correctness is not scored.
2. **Verbosity is rewarded, terseness punished** — the "length penalty" only penalises short
   answers (`lib.rs:120`), so exactly-correct short facts lose ~0.088 composite by construction.
3. **Resemblance ≠ truth** — 65% of the weight rewards echoing GT vocabulary, so refusals,
   inverted verdicts, and wrong numbers that reuse the template out-rank differently-phrased
   correct answers (measured: WEATHER 142×, CVE 9.9-over-8.8, CRYPTO price-absent-at-rank-1).

Our fact-aware scorer — extract typed facts (verdicts, numbers-with-units, identifiers,
timestamps) from GT and answer, compare with typed tolerance, use semantic similarity only as a
prose tie-breaker — beats this on exactly these cases. The proof fixtures should run **both**
projection and `real_weights` builds (§2.3) and include the four real cases above so the
"improvement" is legible to a human reviewer with receipts.

**Unverified / to close (→ `track2/GAPS.md`):** (a) which build is the registered canonical
binary; (b) confirm the Track 2 submission mechanism and participating-intents list against the
official docs/rules (companion spec has the current capture); (c) whether a labeled dataset is
provided (none found in either repo — assume we build the fixture corpus). No wallet, signing,
product-code, or toolchain changes were made; this session cloned two repos to scratch, fetched
read-only `/scores`, and wrote this one doc.
