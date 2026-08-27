# MEMORY.md — Track 2 session continuity

**Read this first every Track 2 session.** Update at session end.

---

## Where things stand — 2026-08-27

**Day 1 of the Track 2 pivot.** User directive: go for **rank 1 in Track 2 (Script Authors)**;
Fable orchestrates/plans, Opus 5 executes (all security-domain work on Opus). Track 1's miner
stays live and untouched. **~4 days to the Aug 31 close.**

### Verified — the Track 2 rubric (2026-08-27)

Source: https://hackathon.telegraphprotocol.com/rules → "Judging Criteria" → **Track 2 tab**
(behind a tab click; plain text dumps show only Track 1's criteria).

| Weight | Criterion |
|---|---|
| **50%** | Improvement over Baseline — "how accurately and effectively the script evaluates Miner outputs vs the current Canonical Script" |
| **30%** | Robustness & Code Quality — "clean code structure, proper handling of edge cases, and adherence to WASM/sandbox constraints" |
| **10%** | Engagement & Updates on X — tag `@Telegraphprotoc` |
| **10%** | Community Engagement & Adoption — "mentions, feedback, and actual adoption of your script by others" |

> "For each Intent, the protocol has one official evaluation script called the **Canonical
> Script** … participants submit improved evaluation scripts, reviewed against the current
> Canonical Script … The current Canonical Script for each participating Intent will be shared in
> the official hackathon repository before the hackathon starts. … Winners are determined through
> a **focused manual review by the core team**."

Consequences: (1) not an automated benchmark race — humans review, so the **legible proof of
improvement is as much of the product as the code**; (2) "each *participating* Intent" implies a
subset — which intents participate is GAPS G2; (3) top 3 **scripts** win $500/$300/$200.

### Verified — the official baseline (2026-08-27)

`github.com/telegraphprotocol/telegraph-wasm-baseline` (Rust → `wasm32-unknown-unknown`).
**One generic scorer**: MiniLM-L6-v2 quantized embeddings (bundled weights + BERT tokenizer),
combining semantic relevance cosine(question, answer), semantic correctness cosine(ground_truth,
answer), BM25 lexical overlap, and a length penalty. Exports `rank_answer`, `breakdown_answer`,
`embed`, `cosine_sim`, `bm25_score`, `alloc`, `dealloc`. "Projection" (default) vs `real_weights`
build modes. Full source read: Opus agent in flight.

### Verified — intent catalog (2026-08-27)

hackathon.telegraphprotocol.com/supported-intents: **40 intents — 18 Tier A "WASM Exact Match"
deterministic, 22 Tier B "LLM Context + WASM"**. Tier A: STOCK_PRICE, CRYPTO_PRICE,
FINANCIAL_DATA, CURRENCY_EXCHANGE, WALLET_BALANCE_CHECK, GAS_PRICE, TOKEN_HOLDER_COUNT,
TVL_LOOKUP, ONCHAIN_TX_LOOKUP, WEATHER_CHECK, STORM_ALERT, WEATHER_FORECAST, SPORTS_SCORE,
GAME_RESULT, SSL_VERIFICATION, CVE_LOOKUP, IP_GEOLOCATION, URL_SCAN.

### Inherited Track 1 assets that are the edge (see ADVANTAGE.md)

- `track1-miner/docs/codex-worklog/probe-champion.mjs` — offline harness that runs any champion WASM
  (`alloc`/`rank_answer` ABI) and reproduces live scores exactly from `converted_answer`.
- Champion registry knowledge: `/api/wasm?intent=…` — SSL reg 631 `SSL_VERIFICATION.wasm`, storm
  reg 453 `storm_rpen.wasm`, weather reg 636 `wf_mini.wasm`; source repo
  `zkasuran/telegraph-salience-scorer`.
- Real scored records (`/scores?intent=…`) with question / ground_truth / miner_answer /
  converted_answer / score — measured baseline mis-rankings incl. a refusal scoring 0.99 vs a
  correct forecast at 0.007.
- Deep Tier A domain code in `miner/src/` (TLS handshake, storm/weather temporal parsing, CVE,
  geolocation).

### Recon LANDED — 2026-08-27 (read these before designing anything)

- **`recon/2026-08-27-track2-scorer-spec.md`** (Agent A): the full authoritative spec — ABI
  (`rank_answer(q,gt,ma) → f32 [0,1]`, blank→0.0, freestanding `wasm32-unknown-unknown`, no
  imports, ≤32 MB), submission (`registerWasm(keccak256, url, intent)` on the Diamond or the
  integrate console; gas-only, reversible via `deregisterEntity(id, 2)`), the two-stage promotion
  gate (self-match ≥0.75, stddev floor, wins ≥ champion, margin ≥ champion + absolute floor,
  Spearman on real traffic when history exists), and the landscape: **zkasuran holds champion on
  all 45 intents** with one salience scorer tuned per intent (~700 builds; MIT, source public,
  build tooling private). Weakest slot: WEATHER_FORECAST margin ~0.5065.
- **`recon/2026-08-27-baseline-analysis.md`** (Agent B): org baseline =
  `0.25·cos(Q,A) + 0.50·cos(GT,A) + 0.15·bm25(GT,A) + 0.10·lenq(A)` — 65% resemblance-to-GT-text;
  **BM25 drops single-digit tokens so "CVSS 9.8" ≡ "CVSS 3.1" exactly**; the "length penalty" is
  a verbosity **bonus**; default "projection" embeddings are non-semantic hashes. Live receipts:
  CVE rank-1 asserts 9.9 vs GT 8.8; CRYPTO_PRICE rank-1 gives **no price** and wins.
- **`../fable_review_audit.md` §2** (peer audit session, MEASURED offline n=27, not
  live-validated): the champion is a **cliff, not a gradient** — GT-opening echo at 16 words
  scores 0.011, at 17 words 0.992; one synonym swap collapses it; **a contentless question-echo
  scores 0.9933, identical to a real answer**. The scorer cannot tell answered from unanswered.
  This is the definitive 50%-axis exhibit AND the hole our scorer must provably close.
- **`recon/2026-08-27-node-gate-analysis.md`** (Agent C) — **the whole gate recovered.** Constants
  (all pinned, two sources): stddev **>0.05**, self-match **≥max(0.75,incumbent)**, Spearman
  **≥0.60** (skipped <2 miners), margin **strictly > champion** AND **≥0.15** (docs wrongly say ≥),
  wins **≥** champion, whole gate **<10 min**. Scored text is `converted_answer` (flat, "The data…",
  2.25× shorter than GT) → **score precision-of-answer, not recall-of-truth**; empty answers (~47%)
  and content-filter refusals → ~0. Bar **drifts with fixture rotation** → timing registration is a
  lever. Current champion_margin bars: IP_GEOLOCATION 0.992 (single miner, no Spearman), STORM 0.859
  (lowest), SSL 0.913, CVE 0.933, WEATHER 0.989 (Spearman on). Fixture CONTENTS unrecoverable (G11).
- **Target locked (ARCHITECTURE A6):** 1) IP_GEOLOCATION (no Spearman, not mined → no conflict; high
  bar), 2) STORM_ALERT (lowest bar; Spearman + mined), 3) SSL. Decide final by live poll at
  registration. One generic scorer tuned per intent; register on several soft targets.
- **Toolchain**: INSTALLED and proven 2026-08-27 (rustc 1.98, wasm32-unknown-unknown, wasm-tools;
  274-byte ABI proof wasm, 0 imports, Node-verified). Build gotchas in GAPS G6 — PATH freshness,
  `addr_of_mut!`, non-trapping alloc. Seed crate: scratchpad `abi_probe`.

**Repo state:** the user's per-track reorg is committed and pushed (`938002a`); an earlier sweep
committed track2/ docs, so track2/ is tracked — commit scoped (`git add track2 …`), never `-A`
(the Track 1 session's blanket adds have swept unrelated files three times; boundaries agreed
with telegraph-60 and the read-only audit session telegraph-fd; `fable_review_audit.md` at root
is the audit session's file — never stage it).

### Next actions

1. Agent C report → close G5 (benchmark/floors/converter) if found.
2. Lock ARCHITECTURE A6 target portfolio: WEATHER_FORECAST is the weakest champion slot but is
   mined by livecert (G10 conflict question) and has 21 Spearman rows (G9); zero-history thin
   intents (CVE_LOOKUP, IP_GEOLOCATION…) skip the traffic gate and minimize conflict — leading
   candidates for first registration.
3. Phase B build (Opus): gate-proxy harness (Stage 1 + Stage 2 emulation + Spearman proxy over
   real `/scores` rows) + fixture corpus per [FIXTURES.md](FIXTURES.md).
4. Phase C build (Opus): the scorer itself, once toolchain lands.
5. **User actions queued**: two Discord questions — (a) Track 2 ranking formula (champion slots?
   margins? stacking?), (b) is a scorer for an intent you also mine acceptable with disclosure?
   Plus the X thread once there's a finding to show (drafts to come from us).

## Key numbers

| | |
|---|---|
| **Track 2 closes** | **2026-08-31** (same day as Track 1) |
| Must stay operational until | 2026-09-07 (through Track 3) |
| Prize | $1,000 pool — $500 / $300 / $200, per **script**, manual core-team review |
| Rubric | 50 baseline-improvement / 30 robustness+quality / 10 X / 10 adoption |
