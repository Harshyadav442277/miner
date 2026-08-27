# GAPS.md — Track 2 honesty ledger

What we do not know or have not verified. Status: `OPEN` · `CHECKING` · `CLOSED (answer)`.

---

## Blocking

### G1 · Submission mechanism — `CHECKING (Opus agent A)`
How a Track 2 script is actually submitted: PR to the official repo? on-chain registration like
`registerMiner`? a form? Discord? The rules page names "the official hackathon repository" but
does not link it. Until closed, Phase E is unplannable and everything before it carries schedule
risk.

### G2 · Which intents "participate" — `CHECKING (Opus agents)`
"The current Canonical Script for each **participating** Intent will be shared in the official
hackathon repository" implies a subset. Building for a non-participating intent wastes the window.

### G3 · What the *current* Canonical Script per intent is — `CHECKING (both agents)`
Candidates: the generic `telegraph-wasm-baseline`, or the live champions from
`zkasuran/telegraph-salience-scorer` (`SSL_VERIFICATION.wasm` reg 631, `storm_rpen.wasm` reg 453,
`wf_mini.wasm` reg 636). "Improvement over Baseline" is measured against **the current Canonical
Script** — if that is the champion, the bar is materially higher than the tutorial baseline. The
50% axis cannot be argued until this is closed.

## Important

### G4 · Are multiple submissions per author allowed? — `OPEN`
Prizes are per script ("Top 3 scripts win"). If multiple entries are allowed, a portfolio of
per-intent scripts is multiple lottery tickets under one manual review; if not, one script must
carry everything. Changes ARCHITECTURE A6.

### G5 · Is a labeled evaluation dataset provided? — `CHECKING (Opus agent B)`
If the organizers provide ground-truth fixtures, our corpus must include them; if not, our corpus
IS the evidence and its credibility (real recorded traffic, pinned sources) carries the proof.

### G6 · Local Rust/WASM toolchain — `CHECKING (Opus agent B)`
Whether cargo + `wasm32-unknown-unknown` exist on this machine. If not: install is the first
Phase C task (user may need to approve an installer).

### G7 · What "remain live and operational throughout Track 3" means for a script — `OPEN`
For miners it means uptime. For a submitted scorer it presumably means the script stays
registered/available (repo public, registration intact) through Sep 7. Verify during Phase E and
record the exact obligation.

## Standing

### G8 · The mid-window entry risk — `OPEN (accepted)`
Track 2 opened Aug 17; we enter Aug 27. Competitors may have 10 days of X history (10% axis) and
established scripts. Mitigation: the 50% axis is where the weight is, our evidence is stronger,
and insight-led posts can compress reach into days. Accepted as the cost of the pivot.
