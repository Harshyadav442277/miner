# Next session: start-up prompt (written 2026-11-25 ~14:30 UTC / 20:00 IST)

Paste the block below into a new session. Update this file at the end of each session.

```
Project: Telegraph Season II miner "LiveCert", repo Harshyadav442277/miner.
Local folder: C:\Users\hyada\OneDrive\Documents\Work-Related\Hackathons\Telegraph
Goal: win the Miners / Providers track. Final submission 2026-12-01 23:59 UTC (2026-12-02 05:29 IST). Resolve all times in UTC.

Start by reading, in order:
1. CLAUDE.md
2. MEMORY.md (top block)
3. GAPS.md (the two 2026-11-25 blocks; the newer one corrects the older)
4. TASKS.md
5. track1-miner/docs/evidence/release-2026-11-25-xchain-shape/README.md (and epochs-47-55-top.txt beside it)

State as of 2026-11-25 14:30 UTC:
- Production: 1cbd7f4 (miner-a3k2j7mfd, dpl_2iZdZvzi22bdyufsbq6XEp2dUdA8). Main matches production after PR merge.
- Rollback: miner-1hem8iuy0 (cc9a51c).
- Registration 6126 active, manifest f47f018.
- New log fields: `LLM <model> HTTP <status> code=<Groq code> json=<0/1>`; `REVIEW … sha=<8 hex>`; `XCHAIN no_reference ref=<shape> chains=<n> proof=<0/1>`.
- The archiver (C:\Users\hyada\tg-deploy\scores) reads 60 minutes and logs the CLI's error line. It only runs while the PC is awake (G366).
- The main checkout is on Codex's branch codex/rank1-14-intents and holds Codex's uncommitted edits. Work in a worktree branched from origin/main, and don't touch Codex's files.

Next, in order:
1. Re-read epochs 55+ with track1-miner/tools/epoch-history.mjs (it keeps the rank-1 score: judge "another miner scored" by `top`, never by third place).
2. CROSS_CHAIN (G369): read the `XCHAIN ref=` shapes in the archive. If the scorer sends hashes without 0x, read them; fix what the shapes show.
3. CODE_REVIEW (G364): find a `sha=` that got different verdicts and scores. Log which model answered before choosing a fix; a fix that turns `Comment` into another verdict needs the owner (G244).
4. FINANCIAL_DATA (5 epochs lost, top 0.96–0.98) and RESEARCH_QUERY: join scores to archive `lines`; no cause proven yet.
5. G367: any `json=0` 400 codes on /event-outcome, /research, /fact-check, /papers.
6. Fix only causes the logs prove. Test each fix and give it its own commit.
7. Release with the release-miner skill:
   - clean deploy tree under C:\Users\hyada\tg-deploy;
   - unit tests, preview probes, then prod plus `vercel promote`;
   - preflight 7/7 (re-run a failing gate alone before believing it; space intent-answers runs ~2 min apart, a burst trips Groq's per-minute limit);
   - `watch.mjs --registration-id 6126 --base-url https://miner-wine.vercel.app --once`;
   - a release record, PR, then merge.
   - The skill's mentions of registration 4829/5292 and codex/rank1-14-intents are stale. Use 6126 and main.

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
- GAPS numbers: take the next free number above the highest in GAPS.md (G369 on 2026-11-25); two sessions have collided before.

Owner-only items to remind them of:
- one app partner for a Stablecoin pre-payment screening workflow, with an independent reproduction (the biggest scoring gap: no verified app usage);
- a weekly X post tagging Telegraph;
- a news-source decision (G326);
- re-signing the manifest so the research and papers descriptions say a model writes the brief (G348);
- submitting from track1-miner/docs/SUBMISSION_PACK.md.

At the end, update MEMORY.md, GAPS.md, TASKS.md and docs/NEXT_SESSION.md, and merge them.
```
