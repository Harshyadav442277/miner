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

### Recon in flight (two Opus agents, launched 2026-08-27)

- **Agent A** — champion repo `zkasuran/telegraph-salience-scorer`, `/api/wasm` registry shape,
  scorer submission/registration flow, scoring docs → writes
  `track2/recon/2026-08-27-track2-scorer-spec.md`.
- **Agent B** — official baseline source: exact formula/weights, precise `rank_answer` ABI,
  projection-vs-real_weights, local Rust toolchain check, concrete mis-ranking scenarios for
  Tier A intents, submission instructions in the org repos → writes
  `track2/recon/2026-08-27-baseline-analysis.md`.

**Repo reorg landed mid-session 2026-08-27 (user's, staged not committed):** `miner/`, `tools/`,
and track-1 docs → `track1-miner/`; `app/` → `track3-certwatch/`. Old `docs/codex-worklog/…`
paths in earlier notes now live under `track1-miner/docs/codex-worklog/…`.

### Next actions

1. Read both agent reports; close [GAPS.md](GAPS.md) G1–G5.
2. Lock [ARCHITECTURE.md](ARCHITECTURE.md) A-decisions (generic fact-aware vs per-intent; target
   portfolio) — currently PENDING markers.
3. Delegate Phase C build to Opus per [PHASES.md](PHASES.md); fixtures + harness first.
4. Draft the Track 2 X thread (10% of score) once there is a real finding to show.

## Key numbers

| | |
|---|---|
| **Track 2 closes** | **2026-08-31** (same day as Track 1) |
| Must stay operational until | 2026-09-07 (through Track 3) |
| Prize | $1,000 pool — $500 / $300 / $200, per **script**, manual core-team review |
| Rubric | 50 baseline-improvement / 30 robustness+quality / 10 X / 10 adoption |
