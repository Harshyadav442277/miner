# CLAUDE.md — Track 2 (Script Author) operating rules

**Goal:** submit the winning Track 2 evaluation script(s) — **rank 1** — by **2026-08-31**, and
keep them live and operational through **2026-09-07**.

Track 1's miner (registration 225, `livecert`) stays live and untouched. Nothing in Track 2 work
may break it — it shares this repo.

## Docs — read at session start, keep current

- [MEMORY.md](MEMORY.md) — session continuity. **Read FIRST**, update at session end.
- [ARCHITECTURE.md](ARCHITECTURE.md) — design decisions. Conform, or update it before deviating.
- [TASKS.md](TASKS.md) — execution board. One task = one change = one commit.
- [GAPS.md](GAPS.md) — honesty ledger. Unverified things live here, not rounded to "fine."
- [ADVANTAGE.md](ADVANTAGE.md) — the asymmetric edge, mapped to the judging rubric.
- [PHASES.md](PHASES.md) — phase plan with exit criteria.
- [FIXTURES.md](FIXTURES.md) — evaluation corpus spec; the proof for the 50% axis is built here.

## Division of labor (user directive, 2026-08-27)

- **Fable = orchestrator and planner.** Verifies rules and facts, plans, delegates, reviews.
- **Opus 5 = execution and troubleshooting.** All builds run on Opus agents — and **all
  security-domain work** (SSL / CVE / URL-scan logic) runs on Opus, never in the Fable session.

## Hard rules

1. Wallet, signing, and secrets rules inherit from the root [CLAUDE.md](../CLAUDE.md) unchanged.
2. **No miner fingerprints in any scorer.** A submitted script encodes *general* intent
   correctness — no slug, wallet, field-name, schema, or phrasing match that favors (or disfavors)
   `livecert`. Rule 04 ("artificial inflation … or gaming") is a disqualifier; fixtures must show
   our own miner's answer style scored DOWN when factually wrong.
3. **Measure before claiming.** Every "improves on the Canonical Script" claim comes from the
   offline harness on pinned binaries and fixtures — never from theory. Track 1's measurement trap
   applies: never hand-write a candidate answer while reading its ground truth.
4. **Verify hackathon/protocol facts against live sources**, and record source + date in
   [MEMORY.md](MEMORY.md) or [GAPS.md](GAPS.md). The Track 2 judging tab is hidden behind a tab
   click on the rules page — text dumps show only Track 1.
5. Boring, explicit code. Files under ~300 lines. Commit messages describe the change and nothing
   else.
