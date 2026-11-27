# Next session: start-up prompt (written 2026-11-27 ~16:00 UTC / 21:30 IST)

Paste the block below into a new session. Update this file at the end of each session.

```
Project: Telegraph Season II miner "LiveCert", repo Harshyadav442277/miner.
Local folder: C:\Users\hyada\OneDrive\Documents\Work-Related\Hackathons\Telegraph
Goal: win the Miners / Providers track. Final submission 2026-12-01 23:59 UTC (2026-12-02 05:29 IST). Resolve all times in UTC.

Start by reading, in order:
1. CLAUDE.md
2. MEMORY.md (top block)
3. GAPS.md (the 2026-11-27 and 2026-11-26 blocks)
4. TASKS.md
5. track1-miner/docs/evidence/release-2026-11-27-json-room/README.md

State as of 2026-11-26 04:00 UTC:
- Production: 89acf9d (miner-19i4dsbxb, dpl_6kcdtkx4mbfYpUgFK796wpzW5HLf). Main matches production after PR merge.
- Rollback: miner-pymeiko6m (bb6e288).
- Registration 6126 active, manifest f47f018. Repo variable REGISTRATION_ID is 6126.
- Log fields: `LLM <model> HTTP <status> code=<Groq code> json=<0/1>`; `REVIEW … sha=<8 hex> via=<model|cache> salvaged=<0/1>`; `XCHAIN no_reference ref=<shape> chains=<n> proof=<0/1>`.
- Archivers: local (C:\Users\hyada\tg-deploy\scores, only while the PC is awake) and `.github/workflows/requests.yml` (hosted, needs repo secret VERCEL_TOKEN; check whether the owner has added it with `gh secret list`). Merge both by row `id`.
- The main checkout is on Codex's branch codex/rank1-14-intents and holds Codex's uncommitted edits. Work in a worktree branched from origin/main, and don't touch Codex's files.

Next, in order:
1. Re-read epochs 68+ with track1-miner/tools/epoch-history.mjs (judge "another miner scored" by `top`, never by third place). Split each epoch at the 89acf9d release (2026-11-27 ~15:41 UTC).
2. Run `node track1-miner/tools/schema-sweep.mjs https://miner-wine.vercel.app` — it found G370; re-check every SCORED null.
3. CODE_REVIEW (G364): join `sha=` repeats with `via=` and scores; a fix that turns `Comment` into another verdict needs the owner (G244).
4. Still losing (G380): WEB_SEARCH, FINANCIAL, NEWS_SEARCH; re-count json_validate_failed in the archive (G378); FRAUD entity names.
5. G371 needs the owner's decision before any YAML work.
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
- GAPS numbers: take the next free number above the highest in GAPS.md (G380 on 2026-11-27); two sessions have collided before.

Owner-only items to remind them of:
- one app partner for a Stablecoin pre-payment screening workflow, with an independent reproduction (the biggest scoring gap: no verified app usage);
- a weekly X post tagging Telegraph;
- a news-source decision (G326);
- re-signing the manifest so the research and papers descriptions say a model writes the brief (G348);
- submitting from track1-miner/docs/SUBMISSION_PACK.md.

At the end, update MEMORY.md, GAPS.md, TASKS.md and docs/NEXT_SESSION.md, and merge them.
```
