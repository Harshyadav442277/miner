# GAPS.md — Track 2 honesty ledger

What we do not know or have not verified. Status: `OPEN` · `CHECKING` · `CLOSED (answer)`.

---

## Blocking

### G14 · Frozen TAC release identity — `CLOSED (hosted bytes verified)` — 2026-08-29
The frozen local artifact is 25,887 B with SHA-256
`e7bb15f12e55aa5a0cb8fa30f5d2d5a21a3027d026b207d3d8563d2ae2ae52b6` and local Keccak-256
`bdd3fea5deb7ce2a48663aa7ec63d5a295ade30c4c2bb2d3254031cb04cdca0f`.
The final pre-publication red team found a general negation-semantics defect outside the public
corpus; the repaired artifact moves that unseen probe from 10/20 to 20/20 strict wins while
retaining 256/256 public TAC wins and the 144/144 content-verification holdout.
The OpenSSL Keccak path was validated by reproducing champion reg 850's on-chain hash. The exact
candidate was published at commit `25ff8089d4d3f1cfcc639115e14464d7d6313cc1`; a fresh raw GitHub
download reproduced 25,887 bytes, the SHA-256 above and the Keccak above. The pinned `867fd15`
URL/hash describe the weaker old binary and remain superseded. Residual user gate: the website's
VERIFY & HASH display must show the same Keccak before signing.
GitHub source updates do not update an existing on-chain byte hash; changed WASM needs a new
registration.

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
