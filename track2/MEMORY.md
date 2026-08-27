# MEMORY.md — Track 2 session continuity

**Read this first every Track 2 session.** Update at session end.

---

## ⇢ HANDOVER — 2026-08-27 23:30 IST · read this before anything else

**Status: REG 1377 REJECTED — and it returned the calibration data we could not get offline.**
Lost on **ordering by one fixture case**: 14 of 15 vs the champion's 15 of 15.

```
VERDICT reg 1377 (2026-08-27 ~23:45 IST)   REJECTED
  candidate_margin  0.87751794      champion_margin  0.99185944
  candidate_wins    14 / 15         champion_wins    15 / 15
  worst_self_match  1.0  PASS       score_stddev     0.4654  PASS
  historical_rows_evaluated  0  →  Spearman SKIPPED (predicted correctly)
  reason: "lost to the current champion on ordering: your scorer ranked the good answer above
           the bad one on fewer fixture cases than the champion (you: 14 of 15, champion: 15 of
           15). Score correct answers above wrong ones more consistently."
```

### THE FINDING THAT CHANGES THE STRATEGY — our proxy corpus mismeasured the incumbent

| | our proxy said | the node measured |
|---|---|---|
| **our** margin | 0.814 | **0.878** (proxy was conservative — fine) |
| **champion's** margin | 0.438 | **0.992** (proxy understated them by 2.3×) |

The node's fixtures are **clean good-vs-bad pairs**, not adversarial ones. On those the incumbent
is near-perfect (0.992, 15/15). Our corpus is full of parrots, entity swaps and refusals — cases
where the incumbent genuinely fails — so it made them look weak (0.438) and flattered our relative
position. **The gate does not test the pathologies our whole thesis is about.**

**Therefore the fix is not "punish wrong answers harder" — we already do. It is "score
correct-but-differently-worded answers closer to 1.0."** Our own measurements show the gap:
verbatim-correct 1.0000 but *reworded*-correct only **0.8785**. A precision-of-answer scorer
charges an answer for prose the ground truth does not restate; the incumbent, being lexically
generous, gives such answers ~1.0. That single behaviour explains both the lost case and the
margin shortfall. **Raise the ceiling for genuinely-correct rewordings without loosening the
wrong-fact penalties, then re-register (gas only).**

The bar to beat is now known exactly: **15/15 wins and margin > 0.99186.**

```
IP_GEOLOCATION   registrationId 1377   status REJECTED   is_champion false
                 tx 0x0c79f0766ed82001…c9286a7a  ·  Base Sepolia
                 wallet 0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e
                 keccak256 0xe427a7f0417a9563eeef53a3bd63a5f139…
                 wasm: telegraph-factscore @ c8ec872 /dist/ip_geolocation.wasm (19,628 B)
                 registered 2026-08-27 23:27:17 IST; incumbent champion is reg 630 (zkasuran)
```

### ★ THE CENTRAL FINDING — the agreement gate requires reproducing the champion's errors

**2026-08-28, measured twice on two intents. This is the project's headline result.**

The post-audit build closed all five failure classes and improved rho — and is still **NO-GO at
rho 0.5934 < 0.60**, *and the gap is not tunable.* All 13 scorable rows are distinct on both
sides, so there are no ties to break. The deficit sits entirely on rows where the **champion
scores a factually wrong answer at ~0.99**:

| ground truth | answer | champion | ours |
|---|---|---|---|
| Google LLC, **Tokyo, Japan** | "located in **Mumbai, India**" | **0.9918** | 0.0855 |
| Google LLC, **United States** | "**Mumbai, India**" | **0.9960** | 0.0156 |
| OpenDNS/Cisco, **Ashburn VA** | "**San Jose, California**" | **0.9920** | 0.0086 |

**Reaching rho ≥ 0.70 means scoring "Mumbai" like "Tokyo."** We did not and will not. STORM_ALERT
has the identical shape (`prose_w` buys Spearman and costs verbose correctness; the two are
directly opposed). So the finding generalises: **on any intent with ≥2 miners, the promotion gate
structurally protects the incumbent by requiring agreement with its factual errors.** A scorer
cannot both fix the errors and agree with them.

This is the submission's centrepiece, and it is *stronger* than a champion slot would have been:
the 50% "improvement over baseline" axis is judged by **manual review**, which does not require
winning the automated gate. We can show measured superiority plus receipts for why the gate
cannot recognise it.

### THE ONE REMAINING REGISTRABLE TARGET (scanned all 45 intents, 2026-08-28)

Spearman is skipped only when an intent has **<2 miners** with scoring history. Of the low-bar
intents, exactly two qualify:

| intent | bar | entries | rows | miners | gate |
|---|---|---|---|---|---|
| **CONTENT_VERIFICATION** | **0.6877** | **3** | 28 | **1** | **SPEARMAN SKIPPED** |
| RESEARCH_SYNTHESIS | 0.7928 | 3 | 1 | 1 | skipped, but ~no history to build on |
| GAS_PRICE / TVL_LOOKUP / STOCK_PRICE / ACADEMIC_SEARCH / GAME_RESULT / LANGUAGE_TRANSLATION | 0.485–0.700 | — | — | 2–7 | applies (blocked by the finding above) |

**CONTENT_VERIFICATION is the only viable registration**: lowest bar among Spearman-free intents,
only 3 competing entries, and 28 rows of real traffic to build against. Caveat: it is Tier B
(LLM-context) and we have no extractor for it, so it needs a new per-intent profile. Codex's TVL
recommendation is superseded — TVL has 7 miners, so it is gated by the finding above.

### ⚠ CODEX AUDIT 2026-08-28 — a claim I made repeatedly was STALE and wrong

`track2/codex_audit.md` (+ `codex_review/field_notes.md`). **IP_GEOLOCATION is NO LONGER
"Spearman-free / structurally safe."** Verified independently: `/scores?intent=IP_GEOLOCATION`
now returns 25 rows across **2 distinct miners** (`iplocate` and — the irony — **`livecert`, our
own Track 1 miner**) over 23 epochs. Two miners ⇒ **the Spearman gate applies.** Codex's fresh
local replay measured rho **0.6573** — passing 0.60, but with only 0.0573 of cushion.

Why I got it wrong: reg 1377's eval showed `historical_rows_evaluated: 0`, and I read that as
"Spearman skipped." Codex's correction is right — we failed on the **wins** check (D3), so the gate
plausibly never reached the traffic check at all. **A zero there proves nothing about
applicability.** Our own miner's breadth expansion into IP_GEOLOCATION is what armed this gate
against our own scorer — a cross-track interaction neither session anticipated.

**Codex verdict: HOLD registration.** Not because the build is bad, but because it still fails
locally-visible cases, and a registration spends scarce public feedback. Five known failure
classes to close first: hemisphere notation vs signed coordinates; country aliases (`UY`);
curly Unicode punctuation (`Shimo'ochiai`); CLEAN-PAIR cases 10/11 (correct paraphrases scoring
far below equivalent forms); and appended unsupported identifiers being too cheap.

Also flagged and now FIXED (2026-08-28): `cargo fmt` failed and `cargo clippy -D warnings` had 4
findings — both clean now, 63 tests pass, all three wasms rebuilt (20,103–20,127 B, 0 imports,
validate OK, ABI verify passes). Still open from the audit: PROOF.md contradicts itself (says
STORM both clears and fails; rho quoted as both 0.5926 and 0.6005) and predates reg 1377 — it
must be regenerated from ONE commit + ONE wasm hash; the CLEAN-PAIR 248/248 headline is
overstated because the generated wrong-answers are mechanically corrupted ("The Iceland. It
address…") rather than fluent minimal counterfactuals; no CI workflow; zero adoption evidence.
**TVL_LOOKUP is the recommended fallback target** — separation bar only ~0.504 vs IP's 0.992 —
but needs a protocol/chain-aware profile, not the generic build.

**Next action (concrete):** rebuild with a higher ceiling for correct rewordings — target
verbatim-correct **and** reworded-correct both ≈1.0, while a wrong city stays ~0.30 and a wrong
figure stays ~0.002. Validate with the *existing* harness (it still guards the anti-gaming
classes), then re-register. Re-registration is a fresh `registerWasm` — a new registrationId,
gas only. Also: **rebuild the proxy corpus to include clean good-vs-bad pairs** so it stops
flattering us; add a fixture class CLEAN-PAIR mirroring what the node actually tests.

**The one thing to check first:**
```bash
curl -s "https://devnode.telegraphprotocol.com/api/wasm?intent=IP_GEOLOCATION" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const r=j.intents.IP_GEOLOCATION;const o=[r.champion,...(r.entries||[])].filter(Boolean).find(e=>String(e.registration_id)==='1377');console.log(o?JSON.stringify({status:o.activation_status,champion:o.is_champion,eval:o.eval,reason:o.rejection_reason},null,1):'not listed')})"
```
Look up by **registrationId 1377**, never by slug or by the console dashboard (it lags 2–3 min).

**Three outcomes and what each means:**
- `active` + `is_champion: true` → **we hold the IP_GEOLOCATION champion slot. That is rank 1.**
  Record the eval block, update REGISTRATION.md's table, and post the result on X.
- `rejected` → read `rejection_reason` + `eval`. Those are the node's numbers on its **hidden**
  fixtures — the calibration we could never get offline (GAPS G11). Feed `candidate_margin` vs
  `champion_margin` back into the tuning loop; re-registering costs only gas.
- still `pending` after ~30 min → the fixture gate has a 10-minute budget and a 3-attempt cap;
  a much longer pending is unusual, re-poll before assuming anything.

**Do NOT press DEREGISTER** in the console unless deliberately withdrawing.

**Second registration is queued but deliberately held:** `STORM_ALERT` (URL in REGISTRATION.md,
same commit). Held until 1377 resolves, because STORM passes our proxy by only 0.0005 on the
Spearman check (0.6005 vs the 0.60 floor) and 1377's verdict is the only evidence of how our proxy
corpus maps to the node's real fixtures. **Do not register SSL_VERIFICATION** — measured loss
(GAPS G13).

**User actions still outstanding:** post the X thread ([X_THREAD.md](X_THREAD.md), 1a→1b→1c, all
verified ≤280 chars, 1c carries the mandatory disclosure). Nothing else.

**For a reviewing agent — where the substance is:**
- [PROOF.md](PROOF.md) — the reviewer-facing measured case (hash-guarded, one-command regenerable
  via `harness/make-proof.mjs`).
- [recon/2026-08-27-node-gate-analysis.md](recon/2026-08-27-node-gate-analysis.md) — the promotion
  gate and every constant, recovered from redacted docs + 1,033 live rejections.
- [recon/2026-08-27-adversarial-review.md](recon/2026-08-27-adversarial-review.md) — our own
  red-team: 6 CRITICAL found and fixed.
- [scorer/README.md](scorer/README.md) — design, honest limitations, disclosure.
- **Known-weak spots to probe if reviewing:** the entity-swap class was a *late* catch (a wrong
  city scored a perfect 1.0000 until the final fix — found by probing the hosted binary, not the
  corpus); IP_GEO REAL-PARROT is 3/8, below the incumbent's 4/8; the SSL generic build loses
  outright (Spearman −0.22). All three are documented, none are hidden.

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

### SCORER v1 BUILT AND GATE-PROXY-PASSING — 2026-08-27

`track2/scorer/` — Rust no_std, 3 builds 13.9 KB / 0 imports / 44 tests. **Independently
verified by Fable rerunning the harness**: IP_GEOLOCATION all applicable gate checks PASS
(margin 0.784 vs champion 0.596 on the same corpus, wins 27/29 vs 22/29, self-match exactly 1.0,
Spearman skipped — single miner); STORM_ALERT passes incl. Spearman 0.632. FACT-SWAP margin
0.458 vs champion 0.004. ~1500× faster than the incumbent (10s of the 600s budget). Honest
tradeoff (in scorer/README + tune.md): STORM sacrifices the anti-parrot exhibit to keep Spearman;
IP_GEO expresses it fully (6/8). **Live bars at poll time: IP_GEO 0.992 (drifted from 0.51!),
STORM 0.859** — the node's hidden fixtures ≠ our corpus (G11); first registration is a
measurement, not a guaranteed win, and a rejection returns the node's official eval numbers.
**→ [REGISTRATION.md](REGISTRATION.md) is the user runbook** (hosting decision, verify-bytes,
console clicks, verdict reading, disclosure text, X draft).

### ADVERSARIAL REVIEW + FIX ROUND — 2026-08-27 (late)

A fresh-eyes Opus review (`recon/2026-08-27-adversarial-review.md`) found **6 CRITICAL / 9 MAJOR**
before any registration: punctuation-blind exact-match ("CVSS 1.0"=="CVSS 10"→1.0), negation
invisible, STORM answered-ness pinned open (`ans_floor 0.75` → echoes beat every real answer,
44× worse than the incumbent), IP saturation (P≥0.80→1.0), unit-faking ("47 bananas" 65× better
than honest-wrong). **All six fixed with before/after receipts** (echo 0.747→0.0058, now 2.9×
better than champion; fake units →0.0005; contradiction 1.0-tie→0.061). Panic handler now traps
(`unreachable`), support graded, ranges parsed, weather openers removed. 19,734-call fuzz stayed
clean throughout.

**THE STORM FINDING (submission narrative, not a defect):** after the anti-gaming fixes, a
72-build sweep proves the storm profile's Spearman vs the incumbent **ceilings at 0.593 < 0.60**
— agreeing with a parrot-rewarding ranking and refusing to reward parrots are structurally
incompatible. The automated agreement gate entrenches the incumbent's failure mode. STORM is
submitted as evidence about the gate; **IP_GEOLOCATION is the registration** (full gate PASS,
margin 0.786 vs 0.596, independently re-verified by Fable).

**Fixed build published**: `telegraph-factscore` commit `f89d380`, hosted bytes verified
(17,884 B). REGISTRATION.md hold lifted — IP_GEOLOCATION only, pinned URL updated. Proof pack
(`track2/PROOF.md`, one-command `harness/make-proof.mjs` with a build-hash guard) regenerating
against the settled build. Kit README for other authors: `harness/README.md` (adoption axis).

### Next actions

1. Agent C report → close G5 (benchmark/floors/converter) if found.
2. Lock ARCHITECTURE A6 target portfolio: WEATHER_FORECAST is the weakest champion slot but is
   mined by livecert (G10 conflict question) and has 21 Spearman rows (G9); zero-history thin
   intents (CVE_LOOKUP, IP_GEOLOCATION…) skip the traffic gate and minimize conflict — leading
   candidates for first registration.
3. Phase B build (Opus): gate-proxy harness (Stage 1 + Stage 2 emulation + Spearman proxy over
   real `/scores` rows) + fixture corpus per [FIXTURES.md](FIXTURES.md).
4. Phase C build (Opus): the scorer itself, once toolchain lands.
5. **ORGANIZER ANSWERS LANDED 2026-08-27 (via user, Discord)** — all three strategy-relevant:
   (a) the 50% axis = **measured performance vs the incumbent/baseline during review**; champion
   slots do NOT auto-stack → depth over breadth, the proof pack is the deliverable;
   (b) submission = **registerWasm + required public X post(s)**, no form; review may request the
   evaluation material → keep the proof pack handover-ready;
   (c) **mined-intent overlap allowed with full disclosure**; our general-correctness +
   score-own-miner-down design explicitly endorsed; they'll flag the overlap for review →
   STORM_ALERT unlocked as primary registration target; disclosure text mandatory in README + X.
   Remaining user actions: the X post(s) (drafts from us once harness numbers land).

## Key numbers

| | |
|---|---|
| **Track 2 closes** | **2026-08-31** (same day as Track 1) |
| Must stay operational until | 2026-09-07 (through Track 3) |
| Prize | $1,000 pool — $500 / $300 / $200, per **script**, manual core-team review |
| Rubric | 50 baseline-improvement / 30 robustness+quality / 10 X / 10 adoption |
