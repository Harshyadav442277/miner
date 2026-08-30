# GAPS — Track 2 honesty ledger

## G22 — the step thresholds above the swept range are extrapolations

For LANGUAGE_TRANSLATION the on-chain sweep covers thresholds 0.35 to 0.65 and shows exactly one
extra fixture pair separated per 0.10 step. The 0.75 / 0.85 / 0.92 / 0.97 rungs assume that trend
continues. It cannot continue past the *lowest good answer's* score: a threshold above it turns
that pair into a near-tie and costs about 0.066 of margin. Nothing offline can locate that point —
only a registration reads the real fixtures. The ladder is signed from the middle outward for that
reason, and a rejected rung still returns its margin, which locates the boundary.

For FRAUD_DETECTION and CVE_LOOKUP the *existence* of a threshold that separates 14 and 15 pairs
respectively is proved from the base's own uncalibrated margin, not assumed. Its *location* is not:
0.80 / 0.88 and 0.30 / 0.50 / 0.75 are placements, not measurements.

## G23 — the calibration portfolio is derivative work, not original scoring research

Every artifact in `calibration/dist/` is another team's MIT-licensed registration with one appended
function. Attribution and the upstream licence are recorded, and the transform is our own analysis
and code. But on the Track 2 rubric's "improvement over the Canonical Script" axis this is
calibration, not a scorer: the original work in this repository is `scorer/`. Do not present the
two as the same thing, and do not let champion slots won this way stand in for the 50% axis on
their own.

## G24 — predicted margins are not node margins

Every number in `calibration/STEP_CALIBRATION.md` under "predicted" comes from an arithmetic model
of the node's margin formula fitted to published evaluations of the same base. The CVE_LOOKUP
affine fit reproduces a held-out point to seven decimals, which is strong; the threshold
predictions carry the uncertainty in G22. None of them has been observed on the node.

## G25 — we hold the canonical scorer on an intent our own miner serves (2026-08-30)

Registration 1996 (ours) is the champion scorer for LANGUAGE_TRANSLATION, and livecert (miner
registration 334, ours) mines LANGUAGE_TRANSLATION at rank 2. Promoted champions score live epochs, so our
scorer now grades our own miner. The organizers allow this with full disclosure; the defense is
structural — 1996 is a strictly increasing recalibration of the incumbent, machine-checked, so it
cannot rank livecert differently than the incumbent would.

The honest residual: a monotone map preserves rank but changes *absolute* score spacing, and
anything computed from score ratios rather than ranks (normalized-performance-style metrics) can
move in either direction. Whether reg 1996's bands help or hurt livecert's normalized
LANGUAGE_TRANSLATION score has **not been measured**. Mitigations: disclosed in
[SUBMISSION.md](SUBMISSION.md) §6 with a standing offer to deregister the overlapping slot if the
core team prefers; the X disclosure refresh (X_THREAD.md T2-17) covers it. The same exposure will
apply to any retry that promotes on SSL_VERIFICATION, IP_GEOLOCATION, WEATHER_FORECAST,
STORM_ALERT or ACADEMIC_SEARCH — all mined by livecert.

What we do not know or have not verified. Status: `OPEN` · `CHECKING` · `CLOSED (answer)`.

---

## Blocking

### G14 · Frozen TAC release identity — `CLOSED (hosted bytes verified)` — 2026-08-29
The frozen local artifact is 30,011 B with SHA-256
`8d8d690628d2cfcd52359f1bb1bfcd882456fc1198b80237ad74c1276a4ae8fe` and local Keccak-256
`8599d78b039870628b67bb8e855cd6f93fc337eb0e569d786d16fa13036e9938`.
The final pre-publication red team found a general negation-semantics defect outside the public
corpus; the repaired artifact moves that unseen probe from 10/20 to 20/20 strict wins while
retaining 256/256 public TAC wins and the 144/144 content-verification holdout.
The OpenSSL Keccak path was validated by reproducing champion reg 850's on-chain hash. GitHub CI
then exposed OS-specific source-path bytes in the otherwise identical Windows/Linux builds. The
tracked Cargo remap fixes that release flaw. The exact cross-platform candidate was published at
commit `409911f351b4778555ac5bb03c9a6d6bba69ae58`; Linux CI rebuilt it byte-for-byte, and a fresh
GitHub release download reproduced 30,011 bytes and both hashes above. The `867fd15` and `25ff808`
URLs/hashes remain superseded. Residual user gate: the website's VERIFY & HASH display must show
the same Keccak before signing.
GitHub source updates do not update an existing on-chain byte hash; changed WASM needs a new
registration.

### G15 · Community adoption evidence — `CHECKING (one verified downstream fork)` — 2026-08-29
The public repository has one external fork, `shreshth006/telegraph-factscore`, with nine
downstream commits and measured IP-geolocation changes. This is stronger than a star or untouched
fork and legitimately demonstrates reuse of the shared scorer kernel. It does **not** prove the
fork ran the current TAC benchmark, validate this registration artifact, or make every downstream
claim correct. No issue, testimonial, or TAC result is claimed. A structured benchmark-report
issue form lowers the friction for additional genuine evidence without manufacturing it.

### G1 · Submission mechanism — `CLOSED (protocol path), small residual` — 2026-08-27
On-chain `registerWasm(wasmHash, wasmUrl, intent)` on the Diamond — **keccak256** of the hosted
bytes (NOT sha256 like the miner YAML), public URL ≤ 32 MB, gas-only, no bond, returns a
`registrationId`; reversible via `deregisterEntity(registrationId, 2)`. Console path:
`integrate.telegraphprotocol.com` does hash+tx in one flow. **User sends; Claude prepares.**
Source: `recon/2026-08-27-track2-scorer-spec.md` §6. **Residual CLOSED 2026-08-27 (organizer
answer via user):** the required submission is the on-chain `registerWasm` **plus the required
public X post(s)** — no form; the review team will request additional evaluation material itself
if needed (keep the proof pack ready to hand over). The empty
`telegraph-hackathon-submissions` repo stays on watch but is not a required artifact.
**keccak-by-recompute CLOSED 2026-08-28:** the spec recon's one unverified assertion (registry
`wasm_hash` = keccak256 of the hosted bytes, asserted from docs, skipped as a 24 MB download) is
now verified: `tn_t70.wasm` (reg 850) downloaded and its keccak256 matches the registry's
`wasm_hash` exactly. Our `text_authenticity.wasm` keccak256 is pinned in REGISTRATION.md for the
console cross-check.

### G2 · Which intents "participate" — `OPEN, softened`
The live registry accepts scorers for all 45 canonical intents (1220 registrations, 36 authors),
so protocol-side everything participates. The rules' "each participating Intent" may only gesture
at the canonical set. Residual ambiguity accepted; targets chosen from live-registry economics
instead (see MEMORY.md).

### G3 · What the *current* Canonical Script per intent is — `CLOSED` — 2026-08-27
**The live champions from `zkasuran/telegraph-salience-scorer` — one author holds `is_champion`
on ALL 45 intents** (registry snapshot 2026-08-27). The org's `telegraph-wasm-baseline` is the
tutorial/default fallback, not the live bar. "Improvement over the current Canonical Script"
therefore means beating the salience champion — ideally literally, via the promotion gate.
Snapshot margins: WEATHER_FORECAST champion margin **~0.5065** (weakest, 67 entries, Spearman
0.813 on 21 rows), SSL_VERIFICATION 0.5363-champion vs 0.8994-incumbent-candidate, STORM_ALERT
0.9704/0.9900 (hardest). **Margins are benchmark-relative and drift — measure live before
acting** (`recon/2026-08-27-track2-scorer-spec.md` §5, §7).

## Important

### G4 · Are multiple submissions per author allowed? — `OPEN`
Prizes are per script ("Top 3 scripts win"). If multiple entries are allowed, a portfolio of
per-intent scripts is multiple lottery tickets under one manual review; if not, one script must
carry everything. Changes ARCHITECTURE A6.

### G5 · The node's promotion gate — `CLOSED (mechanism + all constants)` — 2026-08-27
Fully recovered (`recon/2026-08-27-node-gate-analysis.md`) from a redacted-then-restored
`telegraph-docs` page in git history + 1,033 live rejection strings, two sources agreeing on every
number. Constants: stddev **>0.05**, self-match **≥max(0.75, incumbent)**, Spearman **≥0.60**
(skipped <2 miners), margin **strictly > champion** AND **≥0.15**, wins **≥** champion (ties OK),
whole-gate **<10 min** (3 attempts). Corrected a wrong public doc: margin is strict `>`, not `≥`.
The real node is closed-source Go (`AnomalyFi/Telegraph`); `telegraph-subnet` was a dead end
(abandoned Bittensor repo). See ARCHITECTURE A8.

### G11 · Fixture CONTENTS are unrecoverable — `OPEN (accepted, mitigated)` · **the residual risk**
The ~15 per-intent benchmark fixtures live only inside the closed Go node; no endpoint serves
them and they rotate (weather bar swung 0.53→0.99 in 48 h). We therefore optimize against a
**proxy corpus** built from real `/scores` traffic — which §3.1 argues is plausibly the fixtures'
actual source, but this is inference. Mitigations: (1) build the proxy from the same distribution;
(2) register at a champion_margin local low (timing lever); (3) a real registration is gas-only
and reversible, so the on-chain gate is the final, cheap confirmation. This is the single most
likely way an excellent scorer still fails to promote.

### G6 · Local Rust/WASM toolchain — `CLOSED (installed and proven)` — 2026-08-27
rustup 1.29.0 / rustc 1.98.0 / cargo 1.98.0 / wasm-tools 1.258.0 via winget; MSVC host linker
verified; `wasm32-unknown-unknown` target added. Proof build: a `#![no_std]` ABI-skeleton crate
(`scratchpad/abi_probe`) compiling to a **274-byte** wasm with **0 imports**, passing Node checks
(blank→0.0, unicode OK, bump allocator sane). Gotchas recorded for the build: (1)
`C:\Users\hyada\.cargo\bin` was added to the **User** PATH — shells opened before the install
can't see it, so build steps should prepend it or use full paths; (2) use
`core::ptr::addr_of_mut!(HEAP)` (edition-2024 denies `static_mut_refs`); (3) `alloc` returns 0 on
exhaustion and `rank_answer` treats `ma_len <= 0` as blank rather than trapping — a deliberate
choice to keep malformed host calls at 0.0 instead of a hung `loop {}` panic handler.

### G12 · The binding constraints are self-match and Spearman, not margin — `CLOSED (measured)` — 2026-08-27
Harness validation over real challenger records: challengers with **better margins** than the
incumbent still failed on (a) the self-match **ratchet** — incumbents self-match at exactly 1.0
(exact-match short-circuit), so 0.9933 was a rejection — and (b) Spearman (a 0.284 seen). Design
consequences (relayed to the scorer build): normalized exact match MUST return exactly 1.0; and
anti-parrot defense must be answered-ness, **not** question-overlap penalty — measured across 554
rows, question-overlap correlates *negatively* (−0.258) with champion score; the parrot effect is
positional (prefix), so penalizing overlap would destroy Spearman for nothing.

### G13 · The generic build LOSES on SSL_VERIFICATION — `OPEN (measured, not explained)` — 2026-08-27
Generic build vs champion reg 631: **fails the gate** — wins 16/29 vs 17/29, Spearman **−0.2222**
over 18 real answers (a near-inverse ranking of live traffic). Margin still beats the incumbent
(0.655 vs 0.474), so the loss is in *ordering real answers*, not in separating good from bad on
fixtures. Unresolved which cause dominates: (a) the SSL champion captures something fact-precision
misses, or (b) SSL has no per-intent extractor, so chain/SAN/expiry facts are invisible to us.
**Do not register SSL.** Recorded in the scorer README as a published limitation — a submission
that shows where it loses is more credible than one that claims universal superiority.

### G9 · Spearman-agreement tension — `OPEN but bounded` — sharpened 2026-08-27
Threshold is **0.60** (not high), gated on **≥2 distinct miners** (row count is irrelevant; a
single-miner intent skips it entirely). The tension is real — we deliberately disagree with the
champion on the parrot/refusal cases — but bounded: a scorer that ranks the broad mass of answers
similarly (correct high, garbage low) and diverges on only a handful of adversarial rows keeps a
rank correlation well above 0.60 over ~15 rows; the champion itself only scored 0.81. Two escape
hatches: **IP_GEOLOCATION is single-miner → no Spearman**; and the harness computes our candidate's
Spearman vs the live champion over real `/scores` rows per intent before any registration. Where it
can't clear 0.60 while fixing the pathologies, prefer a single-miner intent.

### G10 · Authoring a scorer for an intent we also mine — `CLOSED (allowed with disclosure)` — 2026-08-27
**Organizer answer (via user, Discord):** operating a Track 1 miner "does not by itself prevent"
registering a Track 2 module for the same intent, **provided the relationship is fully disclosed
and the module is evaluated independently and consistently**; they explicitly called our
general-correctness approach and score-our-own-miner-down tests "aligned with that principle,"
and will flag the overlap for transparent review. Binding consequences: (1) **disclosure is
mandatory** — in the required X post(s) and the scorer README (T-E.4); (2) mined intents
(STORM_ALERT first) are now legitimate registration targets; (3) the our-style-wrong fixture
class is no longer optional hygiene — it is the evidence the review was promised. Residual kept:
confirm at registration which intents the live registration is actively scored on
(`/api/miners/<registrationId>`, never by slug).

### G7 · What "remain live and operational throughout Track 3" means for a script — `OPEN`
For miners it means uptime. For a submitted scorer it presumably means the script stays
registered/available (repo public, registration intact) through Sep 7. Verify during Phase E and
record the exact obligation.

## Standing

### G8 · The mid-window entry risk — `OPEN (accepted)`
Track 2 opened Aug 17; we enter Aug 27. Competitors may have 10 days of X history (10% axis) and
established scripts. Mitigation: the 50% axis is where the weight is, our evidence is stronger,
and insight-led posts can compress reach into days. Accepted as the cost of the pivot.

---

## G13 — our TAC corpus is anti-correlated with the node's (ROOT CAUSE, 2026-08-29)

`TEXT_AUTHENTICITY_CHECK` reports `miner_count: 0` and `/scores` returns zero records, so no live
traffic exists and every TAC fixture we own was written by us. The champion scores **33/256 (13%)**
on our corpus and **14/15 (93%)** on the node's. Two days of tuning ran against a corpus built to
break the incumbent, which is the opposite of the one being judged. Registrations 1671 (9/15) and
1673 (8/15) are the cost.

**Standing rule from now on:** a corpus is admissible only if the champion scores ~14/15 on it.

## G14 — the 18-case development corpus was authored while reading its ground truth

`scratchpad/diag/tac-cases.mjs` was hand-written to the canonical intent definition, but the good
and bad answers were composed with the ground truth visible. That is exactly the trap root
CLAUDE.md rule 3 names. Consequence: `bm25(GT, answer)` separating **18/18** is partly an artefact
of the good answers reusing ground-truth vocabulary, and must not be quoted as a property of the
intent.

What *is* externally anchored, because neither number was available to the author while writing:
the champion reproduces 0.7135 here against 0.65861213 live, and our v1.2 reproduces 0.2739 here
against 0.2702413 live. That makes it a usable development corpus and not a proof corpus.
Mitigation is T-F.5: a held-out set built by the inverse rule.

## G15 — we do not know the shape of the node's 15 curated fixtures

Zero traffic means they are organizer-authored and unobtainable. Every claim about "what the
fixtures look like" is inference from the 86-entry rejection record, not observation. The
inference that the champion binarises (~0.996 / ~0.010, with roughly a third of correct answers
dumped to ~0.010) is arithmetic consistent with its 14/15 at margin 0.6586, and matches its
measured behaviour on our 18 cases — but it remains inference. Two questions are with the
organizers to close this.

## G16 — TVL_LOOKUP cannot be validated offline (2026-08-29)

`/scores?intent=TVL_LOOKUP` returns 150 rows, but only 82 carry a
`converted_answer`, and none of those is an answer whose quantity matches its
ground truth within 0.5%. So no clean good/bad pair can be built, and the
`TVL_LOOKUP-factswap.json` corpus is **empty**.

`dist/tvl_lookup.wasm` therefore ships the same `headline_quantity_profile` as
STOCK_PRICE with **no intent-specific measurement behind it**. It passes the
Stage-1 verifier and all 85 unit tests, and the profile is principled, but no
claim may be made that it beats the TVL champion. Registering it is a cheap
probe for the node's own numbers, not a validated candidate — and that is the
only honest way to describe it.

Related: TVL registrations 1587 and 1681 both errored with
`miner_answer too large` on a 10 MB raw payload from miner `optivis-tvl` after
otherwise beating the champion. The harness now truncates every text at the
host's documented 128 KiB `MaxTextBytes` cap so a corpus row can never hand a
module more than the node would.

## G17 — the STOCK_PRICE corpus is 16 cases, and real traffic has no clean pairs

Every recorded STOCK_PRICE answer is slightly stale — the ground truth says
491.54 and the miners say 491.71 — because the price moves between the ground
truth being written and the answer being served. So the REAL-NUMERIC corpus
holds only 6 usable cases and its labels separate "less stale" from "more
stale", not right from wrong. The champion's own margin there is 0.074 against
the 0.6147 it earns on the node's fixtures, which by the G13 acceptance test
means recorded traffic alone is **not** representative of what Stage 2 asks.

The FACT-SWAP corpus (16 cases) is the one measurements are quoted from. Its
good side is verbatim recorded miner prose and its bad side is the same prose
with only the headline quantity rescaled, so exactly one objective thing differs
per pair. That is legitimate for an intent whose whole question is a number, but
it is still a corpus we constructed, and the champion scores 0.074 on it rather
than 0.6147 — so it models the *ordering* question well and the *absolute
margin* question poorly. **Do not quote 0.1435 as a prediction of our node
margin.** The defensible claim is the ratio: we roughly double the champion's
separation on identical inputs, holding its case-win rate.

## G18 — the first corpus that passes its own acceptance test (2026-08-29)

`harness/build-gt-vs-real.mjs` pairs the ground truth's own assertion against
recorded miner answers that state a different quantity. Neither side is authored
by us: the good side is the organizers' ground truth, the bad side is verbatim
miner prose that is objectively wrong against it.

It exists because `build-factswap.mjs` found nothing for TVL_LOOKUP — **no
recorded TVL answer agrees with its ground truth at all.** The truth says $12.5
billion while miners say $17.1B, $29.29B and $14.4B, because they measure
different chains and sources. Every recorded answer is wrong, so a builder that
needs a correct recorded answer correctly produced an empty corpus.

Against the G13 acceptance test — a corpus is admissible only if the champion
reproduces its live behaviour on it:

| intent | champion live | champion here | delta | verdict |
|---|---|---|---|---|
| TVL_LOOKUP | 0.634025, 13/14 | 0.612070, 19/20 | **0.022** | admissible |
| ONCHAIN_TX_LOOKUP | 0.660399, 9/9 | 0.553594, 9/9 | 0.107 | admissible |
| STOCK_PRICE | 0.614703, 15/15 | 0.818382, 7/7 | 0.204 | weak — 7 cases only |
| CRYPTO_PRICE | 0.629564, 14/15 | 0.196033, 4/5 | 0.434 | weak — 5 cases only |

**TVL_LOOKUP is the first corpus in this project where the champion reproduces
both its live margin and its live win rate.** Every earlier corpus failed this
badly, which is what registrations 1671 and 1673 paid for.

Our results on it: 20/20 cases, 69/69 pairs, margin 0.968154, against the
champion's 19/20, 67/69 and 0.612070. If that transfers, it clears the 0.634025
bar and the 13/14 win requirement with room. The honest caveat remains that a
corpus resembling the fixtures is not the fixtures.

## G19 — a pure restatement of the question still scores ~1.0 (accepted, measured)

`scratchpad` probe, TVL_LOOKUP: the answer *"You are asking about the current
total value locked in the Aave V3 protocol on the Ethereum chain as of August 29,
2026."* scores **0.999973**. It states no quantity at all; its only figures are
the date, and those match the ground truth's date exactly, so the numeric channel
reports perfect agreement about nothing while prose overlap carries precision to
0.996.

This is the same class of defect our own project was founded on exposing in the
incumbent, so it is not comfortable to leave open. It is left open because the
fix was built, measured, and cost more than it saved:

| variant | TVL gt-vs-real |
|---|---|
| shipped (scale words only) | **20/20, margin 0.957407** |
| + calendar figures excluded from the numeric channel | 13/20, margin 0.375687 |
| + missing-quantity penalty only | 16/20, margin 0.433633 |

Excluding calendar figures removes agreement mass that correct answers
legitimately earn, and the missing-quantity penalty fires on correct answers that
state their figure outside the sentence it inspects. Eight measured cases is too
much to pay for one synthetic exposure, so the exposure is recorded instead.

**What would actually fix it:** identifying the ground truth's *headline* figure
by role and requiring an answer to address that specific figure, rather than any
figure. The role machinery for it already exists (`tokens::role_overlap`); wiring
it to the answeredness gate is the open task.

## G20 — the finance suffix form `$12.5B` is not recognised

`$12.5 billion`, `$12,500,000,000` and `12,500,000,000 dollars` are now all one
quantity (`scale_words`, plus a currency-word exemption from the foreign-unit
penalty). `$12.5B` still scores **0.000002** against a truth of `$12.5 billion`.

Single-letter magnitudes were implemented and then removed: reading `m` as
*million* broke unit normalisation outright, scoring `5 m/s` and `18 km/h` as
different quantities and failing the Stage-1 equivalence check. Recognising `B`
safely needs the suffix consumed during number parsing, where the neighbouring
bytes are still visible, not in a post-pass.
