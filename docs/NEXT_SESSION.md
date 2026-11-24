# Next session: start-up prompt (written 2026-11-23 ~23:45 UTC / 2026-11-24 05:15 IST)

Paste the block below into a new session. Update this file at the end of each session.

```
Project: Telegraph Season II miner "LiveCert", repo Harshyadav442277/miner.
Local folder: C:\Users\hyada\OneDrive\Documents\Work-Related\Hackathons\Telegraph
Goal: win the Miners / Providers track. Final submission 2026-12-01 23:59 UTC (2026-12-02 05:29 IST). Resolve all times in UTC.

Start by reading, in order:
1. CLAUDE.md
2. MEMORY.md (top block)
3. GAPS.md (2026-11-22 and 2026-11-23 blocks)
4. TASKS.md
5. track1-miner/docs/evidence/release-2026-11-24-transient-zeros/README.md
6. docs/CODEX_AUDIT_2026-11-22_REVIEW.md
7. On branch codex/rank1-14-intents: docs/CODEX_AUDIT_2026-11-22_RESPONSE.md

State as of 2026-11-23 23:30 UTC:
- Production: 8a631d5 (miner-3udefsmw1, dpl_iBtj3VqNELw7JMhhLRQqpSJeN82K). Main matches production; no open PRs.
- Rollback: miner-1by7eu4j6 (36e4e13).
- Registration 6126 active, manifest f47f018. Intent answers 44/44.
- The main checkout is on Codex's branch codex/rank1-14-intents and holds Codex's uncommitted edits. Work in a worktree branched from origin/main, and don't touch Codex's files.

Next, in order:
1. Read epochs 47+ with /scores?intent=<ID>&limit=100 for every intent. List the intents scoring 0 where another miner scored.
2. G362: make track1-miner/tools/archive-requests.mjs keep every line of a log entry, so each REQ has its RES. Then diagnose the persistent zeros (RESEARCH_QUERY, EVENT_OUTCOME, CODE_REVIEW) from what we answered just before each scored_at. For anything within the last hour, use `vercel logs miner-wine.vercel.app --scope wukong4 --since 60m`.
3. Fix only causes the logs prove. Test each fix and give it its own commit.
4. Release with the release-miner skill:
   - clean deploy tree under C:\Users\hyada\tg-deploy;
   - unit tests, preview probes, then prod plus `vercel promote`;
   - preflight 7/7 (re-run a failing gate alone before believing it);
   - `watch.mjs --registration-id 6126 --base-url https://miner-wine.vercel.app --once`;
   - a release record, PR, then merge.
   - The skill's mentions of registration 4829 and codex/rank1-14-intents are stale. Use 6126 and main.

Standing authorisation: the owner said "take the decision as per your recommendation. all i want is to win". Build, commit, push, PR, merge and deploy without asking.

Still ask before:
- any wallet or signing action, which the owner does;
- posting outside the repo;
- deleting anything;
- changing the owner's G244 rule ("answer ambiguous", never guess a classification label).

Rules:
- No Co-Authored-By or "Generated with" lines in any commit or PR. Check every commit with:
  git log -1 --format=%B | grep -iE '^co-authored-by:|generated with \[claude|🤖'
- No secrets in tracked files, logs or output.
- Claims need evidence. Unverified items go in GAPS.md.
- Escaping traps:
  - Write regex-heavy code with the Edit or Write tools; sed and Python heredocs have eaten \b, \s and \n here.
  - The no-control-bytes test catches eaten escapes.
  - Use MSYS_NO_PATHCONV=1 with gh.
- GAPS numbers: take the next free number above the highest in GAPS.md (G362 on 2026-11-23); two sessions have collided before.

Owner-only items to remind them of:
- one app partner for a Stablecoin pre-payment screening workflow, with an independent reproduction (the biggest scoring gap: no verified app usage);
- a weekly X post tagging Telegraph;
- a news-source decision (G326);
- re-signing the manifest so the research and papers descriptions say a model writes the brief (G348);
- submitting from track1-miner/docs/SUBMISSION_PACK.md.

At the end, update MEMORY.md, GAPS.md, TASKS.md and docs/NEXT_SESSION.md, and merge them.
```
