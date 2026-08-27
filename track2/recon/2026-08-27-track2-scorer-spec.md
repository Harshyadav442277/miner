# Track 2 (Script Authors) — authoritative scoring-module spec — 2026-08-27

How to author, build, submit, and win a Telegraph scoring module. Every claim is
cited to a live source (URL + what it said) or a `file:line`. Unverified items are
labelled **UNVERIFIED**, not rounded to "fine."

Primary sources used this session:

- **Docs — Build a Scoring Module**: `https://docs.telegraphprotocol.com/docs/scoring/build-a-scoring-module`
  (WebFetch 403s on this host; `curl` with a browser User-Agent returns HTTP 200, 176 KB.
  Full extracted text saved offline as `scratchpad/d1.txt`.)
- **Champion source repo**: `github.com/zkasuran/telegraph-salience-scorer` (public, MIT, Rust,
  default branch `master`). The entire scorer is one file, `module/src/lib.rs` (2097 lines).
  Fetched via `gh api`. Local copy: `scratchpad/champ_lib.rs`, `scratchpad/champ_README.md`.
- **Live champion registry**: `https://devnode.telegraphprotocol.com/api/wasm` (full, 1220 entries)
  and `?intent=SSL_VERIFICATION` etc.
- **Rules**: `https://hackathon.telegraphprotocol.com/rules` (HTTP 200 via curl; `scratchpad/rules.txt`).
- **Our head-start harness**: `track1-miner/docs/codex-worklog/probe-champion.mjs`.
- **Our prior notes**: `track1-miner/docs/codex-worklog/2026-08-26-live-scoring-recon.md`, `docs/JUDGING.md`,
  `docs/TELEGRAPH_FACTS.md`.

---

## 0. TL;DR — the five things that decide this

1. **The ABI is tiny and fixed.** A scoring module is a freestanding `wasm32-unknown-unknown`
   binary exporting `alloc`, `dealloc`, `rank_answer`. `rank_answer` takes six `i32`
   (question ptr/len, ground-truth ptr/len, miner-answer ptr/len) and returns one `f32` in
   `[0,1]`. Blank answer must return exactly `0.0`. (docs; `module/src/lib.rs:490-513,2062-2097`)

2. **Registration is permissionless, gas-only, no bond.** On-chain call
   `registerWasm(wasmHash, wasmUrl, intent)` on the Diamond, or the one-click console at
   `integrate.telegraphprotocol.com`. `wasmHash` is **keccak256** (not sha256 — contrast the
   miner YAML which is sha256). (docs "How to submit / register")

3. **THE CRUX — what makes one scorer beat another** is not a vote or a stake. The node runs a
   deterministic **two-stage promotion gate**: Stage 1 structural sanity, Stage 2 "beat the
   current champion" on a **fixed built-in benchmark** by (a) recognizing perfect answers
   (`worst_self_match >= 0.75`), (b) having output variance (`score_stddev` above a floor), and
   (c) separating good from bad **at least as well as the incumbent** — `candidate_wins >=
   champion_wins` AND `candidate_margin >= champion_margin` AND clearing an absolute margin
   floor — plus, when traffic exists, **Spearman rank-agreement with the champion** on real
   answers. (docs "What checks your module must pass"; corroborated verbatim by the champion's
   own source comments, `module/src/lib.rs:26-29,148-168,1935-1939`)

4. **One author already owns the whole board.** `0x8b224783…` (GitHub `zkasuran`) is the active
   champion for **all 45 canonical intents**, with a single generic scorer compiled ~700 times
   with per-intent tuned constants. Beating them is the entire Track 2 problem.

5. **We already have the offline test loop.** `probe-champion.mjs` loads a champion `.wasm` and
   calls the exact node ABI locally; it has been used to reproduce live scores to 6+ decimals.

---

## 1. The ABI / input-output contract (authoritative)

### 1.1 Exports (docs "What your module must contain")

> "Your module needs to expose ('export') three functions … `alloc` … `dealloc` … `rank_answer`."
> "a WASM function can only pass numbers, not strings, so the node needs your module's help
> placing the text in memory first."

### 1.2 `rank_answer` signature and argument order (docs; matches champion source exactly)

Six `i32`, always in this order, returning one `f32` in `[0,1]`:

| Params | Meaning |
|---|---|
| `q_ptr, q_len` | the **question** |
| `gt_ptr, gt_len` | the **ground truth** (correct answer) |
| `ma_ptr, ma_len` | the **miner's answer** (the text being scored) |

Docs: *"The order never changes. Read them as question, then ground_truth, then miner_answer.
Reading them in the wrong order … is the single most common bug: if your miner_answer comes out
empty … your scorer returns 0 for everything and fails registration."*

Docs: *"return a single f32 between 0 and 1, where 0 means 'not a match at all' and 1 means
'perfect answer.' An empty or blank miner answer should always score 0."*

The champion's exported entry point is byte-for-byte this shape
(`module/src/lib.rs:2062-2070`):

```rust
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rank_answer(
    q_ptr: i32, q_len: i32,
    gt_ptr: i32, gt_len: i32,
    ma_ptr: i32, ma_len: i32,
) -> f32 { ... }
```

Its top-of-function branch order (`module/src/lib.rs:2076-2095`):
blank/whitespace answer → `0.0`; empty ground truth → `no_gt_score` (or `0.0`); a normalized
exact match → `1.0`; otherwise `score(q, gt, ma)`.

### 1.3 `alloc` / `dealloc` (docs example ≈ champion, differing only in heap size)

Bump allocator over one fixed static buffer; `dealloc` is a no-op. Docs example uses a **1 MB**
heap; the champion uses **4 MB** (`module/src/lib.rs:486-507`):

```rust
const HEAP_SIZE: usize = 4 * 1024 * 1024;
static mut HEAP: [u8; HEAP_SIZE] = [0u8; HEAP_SIZE];
static mut HEAP_OFFSET: usize = 0;

#[unsafe(no_mangle)]
pub unsafe extern "C" fn alloc(size: i32) -> i32 { /* 4-byte-aligned bump, wraps at HEAP_SIZE */ }
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dealloc(_ptr: i32, _size: i32) {}
```

The champion also exports a 32-byte static `TELEGRAPH_INTENT` naming the intent the build was
tuned for (`module/src/lib.rs:512-513`) — not required by the node, a provenance tag.

### 1.4 Runtime sandbox (docs "What environment does it run in?")

In-process WASM sandbox (the node embeds **wazero**), **no network, no filesystem, no env, no
shared state, fresh memory each call**. Therefore the module must be **freestanding**: no
imports at all.

---

## 2. Build toolchain (authoritative, docs "A simple starting example")

- **Language**: anything compiling to standalone WASM. Docs list **Rust (recommended)**, C/C++
  (Clang wasm target), **TinyGo** (regular Go output is too large), **AssemblyScript**. The
  reference examples and the champion are Rust `#![no_std]`.
- **Cargo**: `[lib] crate-type = ["cdylib"]`.
- **Target**: `wasm32-unknown-unknown` — **not** `wasm32-wasip1`. Docs: *"Do not upload a WASI
  build … a WASI module will fail to instantiate during registration"* (imports like `fd_write`,
  `proc_exit`).
- **Build**: `rustup target add wasm32-unknown-unknown` then
  `cargo build --release --target wasm32-unknown-unknown`.
- **Verify no imports before registering**:
  `wasm-tools print <module>.wasm | grep -c '(import'` → must print `0`.
- **Size limit**: compiled `.wasm` **≤ 32 MB** (`wasmUrl` payload also ≤ 32 MB).

Reference example + tester live in a separate repo the docs name:
`telegraph-examples/wasm-scoring-module/{rust-module, go-tester}` (I did **not** locate/clone
this repo this session — **UNVERIFIED** whether it is public under that exact path; the champion
repo is a different repo and contains only the compiled binaries + `lib.rs`).

---

## 3. The champion's actual scoring algorithm (quoted from source)

Repo description (GitHub API): *"Salience-weighted lexical scoring plus a from-scratch no_std
MiniLM blend, with a wazero harness that runs the node's own promotion gates."*
Module doc-comment (`module/src/lib.rs:1-10`):

> "Scoring in one line: weight each word by how much information it carries, measure precision
> and recall of the miner answer against the ground truth on those weights, cross-check the facts
> that flip an answer from right to wrong (numbers, negation, polar labels), then sharpen the
> contrast."

It is **`no_std`, no allocator, no network, byte-level** (bytes `>= 0x80` treated as word bytes
so CJK/emoji don't trap). Pipeline, in order (function `score`, `module/src/lib.rs:1521-2016`):

**(a) Salience weight per token** — the scorer's namesake (`module/src/lib.rs:892-907`):

```rust
fn weight(tok: &[u8], hash: u32, numeric: bool, proper: bool) -> f32 {
    if numeric { return 3.0; }              // figures dominate
    if is_stopword(hash) { return 0.12; }   // ~150-entry FNV-1a stopword table
    // non-Latin scripts we can't segment:
    // (any byte >= 0x80) -> return 0.5;
    let len = if tok.len() > 12 { 12.0 } else { tok.len() as f32 };
    let mut w = 1.0 + 0.06 * len;           // longer word = slightly more informative
    if proper { w += 1.3; }                 // proper nouns carry the answer
    w
}
```

**(b) Precision** (`:1549-1581`): of the answer's weighted tokens, the fraction present in the
ground truth. Words merely echoed from the question are discounted (`* 0.35`) rather than
counted as inventions; a non-matching content word can earn partial "soft" credit from a MiniLM
cosine (bounded budget). Keyword-stuffing is self-defeating: every extra non-GT word dilutes.

**(c) Recall, two parts** (`:1583-1644`): `r_all` (overall GT coverage) and `k` (only the
**answer-bearing** GT content — GT words the question did **not** already give away). Coverage
that only holds under a **negation the GT does not carry** is counted as contradiction, not
coverage (`contra_w`). Precision is made concave (`p*(2-p)`); recall is combined
**multiplicatively** with a small novelty floor. Final lexical similarity is a **precision-leaning
F-beta**, `F_BETA2 = 0.36` (`:1646-1651`).

**(d) Character + structure signals** (`:1653-1675`): char trigram and bigram set similarity,
content-word bigram adjacency (Dice). Lexical blend:

```
lex_only = clamp01(0.76*lex + 0.20*gram3 + 0.04*gram2)     // W_LEX/W_GRAM3/W_GRAM2, lib.rs:33-35
```

**(e) Optional MiniLM embedding blend** (`:1685-1720`, `#[cfg(feature="minilm")]`): only used
when `W_EMB > 0` — in practice **only the CHAT_COMPLETION build** (`W_EMB=0.45`), where the
incumbent champion is a sentence transformer, so tracking its topical ranking is what the
agreement gate rewards. Structure `0.25*embA + 0.50*embB + 0.25*lex`. Every other intent keeps
`W_EMB=0` and stays purely lexical.

**(f) "Wrong-but-vocabulary-right" penalties** (multiplicative, `:1723-1901`):

| Constant | Fires when | Multiplier |
|---|---|---|
| `M_ORDER` | exact same content words, ~zero shared adjacency ("France is the capital of Paris") | 0.85 |
| `M_ENTITY` | right figure attached to the wrong entity | 0.72 |
| `M_NEGCOV` | coverage that only holds under an uncarried negation | scales down by up to 0.1 |
| `M_LITERAL` | a literal restated with characters transposed (`LS4 1AB` vs `LS1 4AB`) | off (1.0) by default |
| `M_NUM_MISS_BASE` / `M_NUM_WRONG` | GT figure omitted / a different figure asserted | 0.4 floor / ×0.05 |
| polarity axes VERDICT/AUTH/DIR: `M_CONTRA` / `M_TWO_FACED` / `M_SILENT` | verdict backwards / says both / silent | 0.25 / 0.35 / 1.0 |

**(g) Contrast / calibration** (`:1903-2015`): smoothstep `x*x*(3-2x)` and/or step-band
calibrations (`SHARPEN`, `STEP_T/STEP_B`, `TRI_LO/TRI_HI`, `SIGK` logistic). Purpose stated
explicitly (`:1903-1906`): *"Pull confident matches up and near-misses down without flattening
the middle: a scorer whose outputs barely vary is rejected, and one that is all-or-nothing
cannot rank the answers in between."* This is engineered directly against the node's two gates
(see §5).

---

## 4. Per-intent: one generic scorer, parameterized — not 45 algorithms

**Definitive answer to the priority-1 question.** `SSL_VERIFICATION.wasm`, `storm_rpen.wasm`,
`wf_mini.wasm` are **the same source** (`module/src/lib.rs`) compiled with different constants.
Evidence:

- The repo holds exactly **one** source file (`module/src/lib.rs`); everything else under
  `dist/` is a compiled `.wasm`. Repo tree (`gh api …/git/trees/master?recursive=1`): 767 blobs,
  763 of them under `dist/`, 4 non-dist (`.gitignore`, `LICENSE`, `README.md`, `module/src/lib.rs`).
- The tunables block carries this comment (`module/src/lib.rs:26-29`): *"Kept in one block
  because they are swept, not guessed: `tune.py` rewrites this block, rebuilds and scores the
  result against two objectives at once, the benchmark separation the node's Stage 2 measures
  and the rank agreement with the live champion its traffic check measures."*
- `dist/` holds ~700 builds in generation folders (`xfmr/` 688, `reclaim/` 19, `track2*`,
  `subagent/` 4, …). A single intent has many tuned variants, e.g. STORM_ALERT:
  `storm_alert.wasm`, `storm_alert_te.wasm`, `storm_c3.wasm`, `storm_rc.wasm`, `storm_rpen.wasm`.
- Filenames are just tuning labels (`_rpen`, `_mini`, `_c3`, `_t70`, `_pen0`, `_stretch85`…),
  not distinct algorithms. Corroborating fingerprint from the registry: many `_rpen` champions
  (`CONTENT_MODERATION`, `IMAGE_VERIFICATION`, `RESEARCH_QUERY`, `STORM_ALERT`,
  `TELEGRAPH_KNOWLEDGE`, `TEXT_GENERATION`, `WEB_SEARCH`) report the **identical** `eval_score
  0.99000794` — the same code, same tuning family, different intents.

The only genuinely different mode is the **MiniLM transformer path** (`mod minilm`,
`#[cfg(feature="minilm")]`), enabled per-build via `W_EMB` — used for CHAT_COMPLETION.

**UNVERIFIED / GAP**: the build tooling is **not** in the public repo — `tune.py`,
`module/src/minilm.rs`, `Cargo.toml`, `tools/pack_distilled.py`, and the wazero harness are all
referenced in comments but absent from the tree. The exact per-intent constants and the MiniLM
weight tables therefore live **only inside the compiled binaries**. Reproducing a specific
intent's champion means either disassembling its `.wasm` or re-deriving the constants by sweep.

---

## 5. THE CRUX — how a scorer becomes/stays champion

There is **no vote, no stake weighting, no human judging** in the champion-selection mechanism.
It is a deterministic gate the node runs on registration. (docs "What checks your module must
pass"; the champion's source comments describe the same gates from the outside.)

### Stage 1 — structural (docs)
- Loads and exports `rank_answer` (six params) + `alloc` + `dealloc` in the sandbox.
- Empty/whitespace answer returns **exactly 0**.
- **A correct answer scores strictly above an unrelated one** for the same question. The exact
  rejection string is quoted in the docs: `self-match (0.0000) did not beat unrelated
  cross-match (0.0000)`.
- Doesn't crash on adversarial input (tens-of-KB answers, emoji, non-English).

### Stage 2 — beat the current champion (docs, verbatim criteria)
Each intent has **exactly one active champion**. A candidate is promoted only if it clears **all**
of the following on the node's **fixed built-in benchmark** (a set of questions, each with a
known-good and known-bad answer):

1. **Recognizes a perfect answer** — `rank_answer(question, ground_truth, ground_truth) >= 0.75`
   for every benchmark question (reported as `worst_self_match`; must be ≥ 0.75).
2. **Scores actually vary** — `score_stddev` above a small floor (a constant scorer is rejected).
3. **Separates good from bad at least as well as the champion** — all three: order good above bad
   on **at least as many** questions (`candidate_wins >= champion_wins`); **average margin at
   least as large** (`candidate_margin >= champion_margin`); and clear an **absolute margin
   floor**.
4. **When traffic exists** ("several miners with scoring history"): the candidate's **ranking of
   real answers must broadly agree with the champion's** — a **Spearman** rank correlation gate.
   `historical_rows_evaluated` = how many real rows it used (0 when traffic is insufficient).

### The `eval` fields (registry `/api/wasm`) == the docs breakdown, 1:1

| Field | Docs meaning | Gate |
|---|---|---|
| `candidate_margin` | your mean(good − bad) across benchmark — **the headline score** (`eval_score` mirrors it) | maximize |
| `champion_margin` | same, for the incumbent | must be ≤ candidate_margin |
| `candidate_wins` / `champion_wins` | good>bad orderings | candidate ≥ champion |
| `comparable_cases` | benchmark questions both were scored on (denominator) | — |
| `worst_self_match` | lowest perfect-answer self-score | ≥ 0.75 |
| `score_stddev` | spread of scores | above floor |
| `spearman` (present on WEATHER_FORECAST) | rank agreement with champion on real traffic | must broadly agree |
| `historical_rows_evaluated` | rows used by the traffic check | 0 if insufficient |

The champion's source states the same two objectives from the author's side
(`module/src/lib.rs:148-168`): *"The node measures two things. Separation is mean_good − mean_bad
over its fixtures … Agreement is the Spearman correlation of our ranking of real traffic with the
champion's, and every strictly increasing transform of a score has the same ranking, so
agreement is untouched."* And the concrete headroom near the top
(`module/src/lib.rs:1935-1939`): *"A candidate margin of 0.99999994 was rejected against a
champion at 0.999999 while an exact 1.0 passed."*

### Non-obvious but critical: `eval_score` is **not globally comparable across time**
The active WEATHER_FORECAST champion (reg 636, `wf_mini`) has `eval_score 0.530`, yet a
**superseded** entry (reg 442, `wfc_t66`) shows `0.952`. This is not a contradiction: `candidate_margin`
is measured **against whoever was champion at the moment of registration, on the benchmark as it
stood then**, and only over `comparable_cases` (overlapping questions). The benchmark/traffic
evolve, so absolute margins drift. **Consequence for us: the bar to take a slot is the CURRENT
incumbent's margin on the CURRENT benchmark, which you cannot read off these historical numbers —
you learn it by registering, or by reproducing the node's benchmark locally with the wazero
harness.** (Inference from registry data + the `comparable_cases` semantics in docs; the exact
benchmark contents are not published — **UNVERIFIED**.)

---

## 6. Registration / submission flow (authoritative, docs)

### Easy path
Host the `.wasm` at any public URL (IPFS or file host), then submit at
**`integrate.telegraphprotocol.com`** — the platform hashes the file and sends the transaction.

### Direct on-chain path
Single call on the **Diamond** (`0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8`, Base Sepolia —
`docs/TELEGRAPH_FACTS.md:43`):

```solidity
registerWasm(wasmHash, wasmUrl, intent)
```

- `wasmHash` — **keccak256** of the exact hosted bytes. The node re-downloads and re-hashes; a
  mismatch is rejected. **Note the hash-function trap: scorer WASM = keccak256; the miner YAML =
  sha256** (`CLAUDE.md` "YAML hash for registration — SHA-256, NOT keccak256"). Do not cross them.
- `wasmUrl` — public `https://` or `ipfs://`, ≤ 32 MB.
- `intent` — one canonical intent (e.g. `SSL_VERIFICATION`); must be in `getCanonicalIntents()`
  or the call reverts `unsupported intent`.
- Returns a **`registrationId`** — keep it; it's how you query status and deregister. **Look up by
  `registrationId`, never by slug** (`CLAUDE.md` hard rule 5).
- **Cost: gas only. No bond, no fee.** (Registry confirms `bond_amount: 0` on every champion.)

### Constraints and lifecycle (docs)
- Re-registering the **same (address + binary)** while active → `duplicate wasm hash`. A different
  author may register the same public binary. Deregistering frees it.
- Deregister: `deregisterEntity(registrationId, 2)` — the `2` marks a **scoring module** entity
  (vs miner/collector). Only the registering address can. Picked up immediately, no epoch wait.
  If the deregistered module was champion, the intent **falls back to the previous champion**,
  else to Telegraph's built-in default scorer — scoring never gaps.
- States: `pending` → `active` | `rejected` | `superseded` | `deregistered`. `pending` lasts a few
  minutes (download + Stage 2). Every re-registration is another transaction — **test offline
  first**.
- To upgrade, just register a new (different-hash) binary; if it beats the champion it takes over
  automatically. Deregistering the old one is optional tidy-up.

---

## 7. Live registry state (competitive landscape) — snapshot 2026-08-27

`https://devnode.telegraphprotocol.com/api/wasm` → `count: 1220` scorer registrations across the
**45 canonical intents**, from **36 distinct author addresses**.

- **`0x8b224783fe5b3c52b7db0cb9b1754f8812b75287` (GitHub `zkasuran`) is the active `is_champion`
  for ALL 45 intents.** No intent is currently held by anyone else.
- Notable challengers, all currently `superseded` or `rejected`:
  - `0xd4c73e9986c0…` — hosts wasm on its own domain (`scorewire.shadrakbessanh.me`); rank-2 on
    several intents (STORM, WEATHER).
  - `0x98ec4d722048…` — `egbujor-emmanuel/telegraph-url-scan-scorer`; **rejected** on SSL.
  - `0x39d2bae5…` (`PugarHuda/amanat`), `0x7dc9c9d5…` (`oathcast`, hosts on Dropbox).

The three intents our miner serves:

| Intent | Champion reg | Binary (`dist/…`) | `eval_score` (=candidate_margin) | champion_margin | wins | comparable | worst_self | stddev | spearman | hist_rows | entries |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SSL_VERIFICATION | 631 | `subagent/SSL_VERIFICATION.wasm` | 0.8994 | 0.5363 | 11 vs 9 | 11 | 1.0 | 0.477 | — | 1 | 9 |
| STORM_ALERT | 453 | `xfmr/storm_rpen.wasm` | 0.9900 | 0.9704 | 32 vs 32 | 32 | 0.995 | 0.467 | — | 10 | 11 |
| WEATHER_FORECAST | 636 | `xfmr/wf_mini.wasm` | 0.5302 | 0.5065 | 15 vs 14 | 15 | 1.0 | 0.379 | 0.813 | 21 | 67 |

WASM URLs are commit-pinned raw GitHub links, e.g. SSL champion:
`raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/8dcc6b77…/dist/subagent/SSL_VERIFICATION.wasm`
(`wasm_hash 88021c16…`). `wasm_hash` in the registry is the on-chain **keccak256** (repo README
confirms: *"The keccak256 of any file here matches the hash stored in its on-chain
registration"*). I did **not** re-download a 24 MB champion binary to recompute the hash this
session — **UNVERIFIED by recompute**, but asserted identically by two independent sources (docs
+ repo README).

---

## 8. Our head start — `probe-champion.mjs` (exact behavior)

`track1-miner/docs/codex-worklog/probe-champion.mjs` reproduces the node's call path offline, no network. It:

1. Reads a champion `.wasm` and instantiates it **with empty imports**:
   `WebAssembly.instantiate(wasm, {})` (`probe-champion.mjs:120-121`) — proving the module is
   freestanding (matches the "no imports" rule).
2. Pulls exports `{ memory, alloc, rank_answer }` and asserts the ABI, erroring otherwise with
   *"WASM does not expose the Telegraph memory/alloc/rank_answer ABI"* (`:122-125`). (It does not
   use `dealloc`.)
3. Passes strings exactly as the node does (`:127-139`): UTF-8 encode → `alloc(len)` → write bytes
   into `memory.buffer` at the returned pointer → keep `[pointer, length]`. Then
   `rank_answer(...q, ...g, ...a)` where the spread order is **question, ground_truth, answer** —
   the documented order.
4. In `--scores` mode it selects a public score record by miner slug/epoch and, by default,
   scores that record's **`converted_answer`** (`:112-114,151-157`), and also scores the raw
   `miner_answer` and reports `candidate_vs_reported_factor`.

This is why our 2026-08-26 recon (`track1-miner/docs/codex-worklog/2026-08-26-live-scoring-recon.md:63-81`)
could show the reported live score matching the **`converted_answer`** score to ~10 decimals and
**not** the raw `miner_answer` score — i.e. the scorer's real answer input is Telegraph's
natural-language `converted_answer`, not the raw miner JSON. That finding is the key wrinkle for
any Track-2 scorer we author: the thing being scored is the converted prose.

**Practical loop we already own**: download a champion `wasm_url` + a `/scores` response, then
`node track1-miner/docs/codex-worklog/probe-champion.mjs --wasm champ.wasm --scores scores.json --miner
<slug> --epoch <n>` to reproduce/counterfactual scores deterministically. To iterate on *our own*
candidate scorer we additionally need the **wazero go-tester** (docs §Testing) or an equivalent,
because the promotion gate (§5) is what actually decides champion — `probe-champion.mjs` scores
single answers but does not run the benchmark separation / Spearman gates.

---

## 9. What "rank 1 in Track 2" is judged on — and the honest gap

- **Timeline** (rules page): Track 2 (Script Authors) runs **Aug 17 – Aug 31** (15 days). Today
  is 2026-08-27 → **~4 days left**. Script Authors "must remain live and operational throughout
  Track 3" (to Sep 7). Winner selection Sep 8–18.
- **Prize pool** (rules): Script Author Track **$1,000** — 1st **$500**, 2nd $300, 3rd $200.
- **Judging rubric — GAP / UNVERIFIED.** The rules page shows one criteria block —
  **"75% Normalized Performance (within Intent) + 25% Engagement & Updates on X"** — under a
  tabbed `Track 1 | Track 2 | Track 3` header, but **all the explanatory text is miner-specific**
  ("The best **Miner** in every Intent…", "Top 3 **Miners**…"). The page never defines a distinct
  Script-Author performance metric. So the precise basis for ranking Script Authors is **not
  documented**. Reasonable operational proxy: **hold active champion slots** (`is_champion:true`
  on `/api/wasm`), ideally several, with strong `candidate_margin`, plus the 25% X engagement.
  **Recommend asking organizers** (Discord) verbatim: *"For Track 2 Script Authors, how is
  Normalized Performance computed — number of active champion intents held, aggregate/normalized
  `candidate_margin`, or something else — and over what window? Does holding multiple champion
  slots stack?"* Until answered, treat "become and stay champion on ≥1 intent" as the objective.

---

## 10. Strategic implications (for the rank-1 decision)

1. **The whole board is held by one very strong, well-tuned incumbent.** To place in Track 2 we
   must take champion slots from `zkasuran` by clearing Stage 2 — i.e. **≥ their
   `candidate_margin` on the current benchmark, ≥ their wins, `worst_self_match ≥ 0.75`, real
   `score_stddev`, and Spearman-agreeing with them on live traffic.**
2. **Weakest slot to contest = WEATHER_FORECAST** — champion margin only ~0.506 and headline
   `eval_score` 0.530 (vs 0.99 on STORM, 0.90 on SSL). But margins are benchmark-relative and
   drift (§5), so the real bar must be measured, not assumed.
3. **The incumbent source is MIT-licensed and public** (`module/src/lib.rs`). We may legitimately
   study it; the algorithm above is the state of the art to match or beat. The build tooling
   (sweep + MiniLM) is *not* public, so out-separating them means either re-deriving per-intent
   constants or a genuinely better algorithm.
4. **Registration is cheap and reversible** (gas-only, no bond, deregisterable), so the risk of a
   failed candidate is a wasted tx, not a lost slot — but every attempt is an on-chain,
   commit-pinned, publicly-hashed binary. **Sandbox-test with the wazero go-tester before every
   `registerWasm`** (mirrors `CLAUDE.md` hard rule 3 for miners).
5. **We already have the offline scoring harness and confirmed the `converted_answer` input** —
   the missing piece is the benchmark-gate reproduction (wazero harness), not the ABI.

---

## 11. Verification & boundary note

Read-only reconnaissance only. This session did **not** touch any wallet, sign or send any
transaction, or modify miner/app product code or registrations. It created exactly one repo file
(this spec). Temporary downloads (champion `lib.rs`/README, docs/rules HTML) live in the
scratchpad, outside the repo. `cast`/RPC calls were **not** run this session — the Diamond
function signatures (`registerWasm`, `deregisterEntity`, `getCanonicalIntents`) are cited from the
live docs, not from an on-chain probe.

### Open items to verify next
- Track 2 Script-Author ranking formula (ask organizers). **UNVERIFIED.**
- The absolute `candidate_margin` floor value and the exact benchmark contents (not published). **UNVERIFIED.**
- Whether `telegraph-examples/wasm-scoring-module` (reference module + go-tester) is public at that path. **UNVERIFIED — not fetched.**
- keccak256 recompute of a live champion binary vs its registry `wasm_hash` (skipped: 24 MB download). **UNVERIFIED by recompute; asserted by docs+README.**
- The current live incumbent margins may have moved since this snapshot; re-pull `/api/wasm` before acting.
