# GAPS.md — Track 2 honesty ledger

What we do not know or have not verified. Status: `OPEN` · `CHECKING` · `CLOSED (answer)`.

---

## Blocking

### G1 · Submission mechanism — `CLOSED (protocol path), small residual` — 2026-08-27
On-chain `registerWasm(wasmHash, wasmUrl, intent)` on the Diamond — **keccak256** of the hosted
bytes (NOT sha256 like the miner YAML), public URL ≤ 32 MB, gas-only, no bond, returns a
`registrationId`; reversible via `deregisterEntity(registrationId, 2)`. Console path:
`integrate.telegraphprotocol.com` does hash+tx in one flow. **User sends; Claude prepares.**
Source: `recon/2026-08-27-track2-scorer-spec.md` §6. **Residual:** whether the hackathon judges
additionally want a form/Discord submission artifact — ask organizers (T-E.1).

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

### G5 · The node's built-in benchmark is unpublished — `CHECKING (Opus agent C)` · **highest-leverage unknown**
Stage 2 runs on a **fixed built-in benchmark** (questions with known-good/known-bad answers) whose
contents are not in the docs. If Agent C finds it in `telegraph-subnet` (the likely node source),
we can run the true gate offline and iterate to a guaranteed-pass candidate before any
transaction. If not found: build our gate-proxy from FIXTURES.md + real `/scores` traffic, and
use cheap real registrations as authoritative feedback. Also missing: the absolute margin floor,
stddev floor, Spearman threshold/window — Agent C hunting all of them.

### G6 · Local Rust/WASM toolchain — `CLOSED (absent; install running)` — 2026-08-27
Agent B: no cargo/rustc, no wasm32 target on this machine. An Opus agent is installing rustup +
`wasm32-unknown-unknown` + wasm-tools and proving the pipeline with an ABI-skeleton crate verified
from Node. Until it lands, no local builds.

### G9 · Spearman-agreement tension — `OPEN, design-critical`
To dethrone an incumbent where traffic history exists, a candidate must "broadly agree" (Spearman;
threshold unknown → G5) with the champion's ranking of real answers — but our scorer deliberately
disagrees exactly where the champion is wrong (contentless echo ≈ real answer, parrot over
substance). Feasibility signals: the current WEATHER champion was promoted with `spearman 0.813`
on 21 rows, so ~0.8 sufficed there; and `historical_rows_evaluated: 0` **skips the traffic check
entirely** — SSL had 1 row, STORM 10, WEATHER 21, and thin intents (CVE_LOOKUP, IP_GEOLOCATION…)
likely 0. Mitigation: the harness must compute our candidate's Spearman vs the live champion over
real `/scores` rows per intent BEFORE any registration; where agreement can't clear the bar while
fixing the pathologies, prefer zero-history intents.

### G10 · Authoring a scorer for an intent we also mine — `OPEN, organizer question`
The rules are silent (fable_review_audit.md §8, read 2026-08-27), and the Track 1 session's
breadth expansion means `livecert` now mines many Tier A intents — overlapping most scorer
targets. Posture: general-correctness design, our-style-wrong fixtures, public disclosure, and
**ask the organizers before registering a scorer on a mined intent** (user, Discord). If
unanswered, prefer non-mined intents for the first registration.

### G7 · What "remain live and operational throughout Track 3" means for a script — `OPEN`
For miners it means uptime. For a submitted scorer it presumably means the script stays
registered/available (repo public, registration intact) through Sep 7. Verify during Phase E and
record the exact obligation.

## Standing

### G8 · The mid-window entry risk — `OPEN (accepted)`
Track 2 opened Aug 17; we enter Aug 27. Competitors may have 10 days of X history (10% axis) and
established scripts. Mitigation: the 50% axis is where the weight is, our evidence is stronger,
and insight-led posts can compress reach into days. Accepted as the cost of the pivot.
