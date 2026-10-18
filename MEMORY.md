# MEMORY.md — session continuity

## 2026-10-18 ~08:10 UTC (13:40 IST): CURRENT — 36-intent build LIVE; weather and translation licence swaps committed

Owner: "proceed as per your recommendations" (2026-10-18).
- **Deployed:** `a556f00` as production `miner-8jdiuqzv4` (~07:26 UTC; the alias moved by itself, no promote).
  All declared endpoints answered on the preview; `/tvl` and `/telegraph` now 404. Preflight 5/7 gates and
  intent answers 35/36: the two failing gates are the known ip-api Tokyo pin and the merkle failover RPC's
  429, both also on record for the Oct 14 build. Rollback target: `miner-ntd40dbx9`.
  Evidence: `track1-miner/docs/evidence/release-2026-10-18/`.
- **Registration is 4829** (active, 36 intents, yaml_hash `0x84dd…6680`), found by scanning ids for our wallet.
  Repo variable `REGISTRATION_ID` moved 2750 → 4829; `watch.mjs` once: `endpoint=ok activation=active`.
- **Licence swaps (G189):** weather/storm/geocoding → MET Norway + Nominatim (`e86a0f4`), translation → Groq
  (`329254b`). Unit 760/760; live storm tests 15/15; local intent gate 35/36; 20/21 routed translations.
- **Not swapped, owner decision:** news and web search (GDELT tested unusable, G194) and stock prices (Yahoo).
- **Next `updateMiner` must fix:** the Google News naming, and the weather claims MET cannot meet (G195).

## 2026-10-17 07:50 UTC (13:20 IST): 36-intent updateMiner MINED; removal code NOT yet deployed (superseded above)

Checked live 07:46–07:50 UTC:
- **The owner's updateMiner landed.** Registration 2750 is `superseded` (updated 2026-10-16 09:59:30 UTC).
  The catalog row for wallet `0xdad2…a39e` (slug `livecert`, catalog id `4433`) is `active`, registered
  2026-10-16 09:59:29 UTC, `yaml_url` = the commit-pinned `2e8d1cf…/track1-miner/miner.yaml` (hosted bytes hash
  `0x84dd…6680`, checked 2026-10-16), 36 intents, none of the seven removed ones.
- **Trap:** `/api/miners/4433` returns a DIFFERENT miner (verifywire, wallet `0x8b22…`). Catalog id ≠
  registration id; the new registrationId is not yet recorded. Find it before using `watch.mjs`.
- **Production is still `miner-ntd40dbx9`** (built 2026-10-14 from `b3558d5`, `vercel inspect`): it still
  answers `/tvl`, `/game-result`, `/telegraph`, `/ai-detect`. Harmless (extra routes), but the order
  sign → mined → deploy is now at **deploy**: release `61c0dd1` (code = `2e8d1cf`), from a clean worktree.
- Epoch 418: 35 intents scored, 7 at rank 1 (CONTENT_EXTRACTION, NEWS_SEARCH, QUESTION_ANSWERING,
  SANCTIONS 0.68, CVE, SENTIMENT, TOKEN_HOLDER); 9 at ≥ 0.5.
- Licensing decision (G189, below) still pending.
- **Cleanup 2026-10-17 (owner: "remove the deadcode … useless data"):** `cbeb504`, `87bace6`, `61814af` deleted
  755 Season I rank files and cut MEMORY/GAPS/TASKS to Season II; unit 738/738 after. Committed, **not pushed**.
  Never-committed leftovers (the rank1-2026-09-10 evidence, 95 fixture reports, two wrapper builds, a
  duplicate SSL champion) went to the Windows Recycle Bin on 2026-10-18; `cargo clean` freed 620 MB.
  `track2/harness/champions` (618 MB, gitignored incumbents) kept for Evaluator comparisons.
- **Seven Season I agent worktrees removed 2026-10-18** (~15 GB, Sep 16–19 rank lanes; their work had already
  landed on the branch). Each one's uncommitted state is on a local branch `archive/agent-<id>` (not pushed);
  re-create one with `git worktree add <path> archive/agent-<id>`.
- **Keep-only pass 2026-10-18 (owner: "keep what can be used for season 2 in any track"):** removed track2's
  calibration wrappers (2.2 GB), its S1 submission/task/X docs, SIGN.md, REGISTRATION.md, root PRD.md/SETUP.md. Kept
  scorer, harness, fixtures, recon, release, `calibration/screen-registry.mjs` and registration 1882's pinned artifact.
  CI probes moved to `track2/release/probe-*.mjs`; all 7 CI scorer steps pass locally.

## 2026-10-14 ~09:50 UTC (15:20 IST): 7 intents removed (committed, NOT pushed, NOT deployed); licensing decision pending

The owner said "if you find any intent to be not beneficial, you can remove it as well. i want quality".

**Removed** (`17a05c3`, `3aa5086`, `2e8d1cf`, `1fe27bd`): TVL_LOOKUP, TELEGRAPH_KNOWLEDGE,
AI_TEXT_DETECTION, TEXT_AUTHENTICITY_CHECK, CONTENT_VERIFICATION, GAME_RESULT and SPORTS_SCORE, plus
event-outcome's hard-coded 2022 World Cup patch. 4,200+ lines deleted.

The manifest is now **36 intents on 35 endpoints**:
- `manifest-diff` PASS with `--allow-removed=…`, which is new: unnamed removals still fail. Run it with
  `MSYS_NO_PATHCONV=1` in Git Bash, or `/tvl` gets rewritten into a Windows path.
- Validator: `valid: true`, 35/35 endpoints answered (`integrate-validate-36-intents.json`).
- Hash of HEAD's miner.yaml: `0x84dd6ed3ec0719e17fc0c2b7d0f3c9bf2ce432d97a1358d36c875d3c0a9e6680`.
- Unit 738/738. Local gate 35/36 (the IP Tokyo pin, local only), param-shapes 54/54, hostile 162/162.

**Do NOT deploy this code before the new `updateMiner` is mined.** Production `miner-ntd40dbx9` still
serves the removed routes, which registration 2750 still declares; deploying first would 404 them for
live callers. Order: sign → mined → deploy.

**The old values for f95305d (43 intents) are superseded. Do not sign them.**

**Update 2026-10-16 09:25 UTC: pushed on the owner's "upload everything".** origin
`codex/rank1-14-intents` = `36d3301` (was `c4b3f4c`; no secrets, no trailers). Hosted YAML for the new
`updateMiner`: `https://raw.githubusercontent.com/Harshyadav442277/miner/2e8d1cfd418dab47694e2fd5d2f8f4c0fee6f5cc/track1-miner/miner.yaml`,
SHA-256 of the fetched bytes `0x84dd6ed3ec0719e17fc0c2b7d0f3c9bf2ce432d97a1358d36c875d3c0a9e6680` = the local
file. Deploy NOT done, on purpose: still sign → mined → deploy.

**Pending owner decision (GAPS G189 update):**
- Open-Meteo (weather and storm), Google News RSS (web search and news) and Yahoo (stock prices) forbid
  commercial use.
- BigDataCloud is client-only; MyMemory bars resale; URLhaus "may require" a subscription.
- Options were put to the owner: pay for Open-Meteo or move to MET Norway; move news to GDELT; drop
  STOCK_PRICE or pay for data; translate with Groq; use Nominatim for reverse geocoding.

**Authorisation:**
- Given: remove low-value intents; push (2026-10-16, done).
- Not given: deploying them before the `updateMiner` is mined, signing, or spending money on data plans.

## 2026-10-14 05:35 UTC (11:05 IST): CURRENT STATE — Season II build ON PRODUCTION; updateMiner NOT done

**Production `miner-ntd40dbx9`** (alias miner-wine.vercel.app), built from `b3558d5`. Rollback target is
`miner-q67fqthj7`. Branch `codex/rank1-14-intents` is **not pushed** and is ~50 commits ahead of origin. The
tree is clean apart from this file.

**Verified:**
- Preflight against production: 42/43 intents. The miss is the known IP Tokyo pin.
- param-shapes 57/57, hostile 180/180, verify-deploy PASS, no-regression PASS.
- The two remaining preflight failures are this machine's network (badssl.com unreachable) and a 429 from
  the merkle failover RPC.
- Unit 818/818. Live suite 951/953 locally (badssl).
- All eight integration-guide recipes answered on production.

Evidence: `track1-miner/docs/evidence/season2-release-2026-10-14/`.

**Built this session (one commit each, no attribution trailers):**
- The answer envelope (`answer` first, `checked_at`).
- Value fields on ten routes.
- Seven mission intents via `src/mission-routes.ts`: `/sanctions-screen`, `/company-registry`,
  `/sec-filings`, `/transfer-verify`, `/macro`, `/url-reputation` (+Quad9 in url-scan) and `/answer`.
- Six security-review findings fixed.
- DefiLlama protocol and chain TVL refused as `not_licensed` (G186 closed; deregistering TVL_LOOKUP is
  the owner's call).
- The manifest: 43 intents, description rewritten, `manifest-diff` PASS against the registered
  `94bbb04`.
- Integration guide rewritten. GAPS G189–G193.
- Plan status: SEASON2_PLAN "Next actions".

**Update 05:50 UTC — manifest ready to sign, validator green.**
- Every endpoint description now opens with example questions and the fields it returns. All 61
  examples were answered by production (`manifest-examples.txt`).
- `manifest-diff` PASS against the registered `94bbb04`: 36 → 43 intents.
- `POST integrate.telegraphprotocol.com/api/validate`: `valid: true`, 42/42 endpoints answered, no key
  stored (`integrate-validate.json`).
- Six Season II X drafts are in `docs/X_POSTS.md` §6, not posted. Recipes are in
  `docs/INTEGRATE_LIVECERT.md`. Facts are in TELEGRAPH_FACTS (last section).

**Pushed 2026-10-14 ~06:00 UTC on the owner's "yes push it":** `94220f1..f95305d`, fast-forward to
origin/codex/rank1-14-intents. Pre-push checks: no tracked secret files, no key patterns in the diff,
0 attribution trailers, every commit authored by Harshyadav442277. The hosted YAML at the pinned commit
returned HTTP 200, 91,173 bytes, SHA-256 `4bc7011c…60ef0`, **identical** to the validated bytes.

**Next action (owner):**
1. Sign `updateMiner` in the console with:
   - YAML URL `https://raw.githubusercontent.com/Harshyadav442277/miner/f95305d15043e17fea2707f084d0967346298ead/track1-miner/miner.yaml`
   - hash `0x4bc7011c38d29fd4b96532f4e189b18b7a3335bcfd6203cd6b24e72bfab60ef0`
   - REQUIRES API KEY off.
2. After it is mined (Claude's job):
   - Find the new registration id (it replaces 2750; ids are sparse).
   - Move the `REGISTRATION_ID` repo variable and the tool defaults.
   - Run `watch.mjs` (`--once` goes last).
3. Owner decisions:
   - Deregister TVL_LOOKUP or keep its token scope (G186).
   - G189: the data-source terms are unread (Yahoo, CoinGecko and others).
   - Post the X drafts.
   - Send the organiser questions drafted in `S1_LOSS_ANALYSIS_2026-10-11.md`.

**Authorisation:**
- Given ("do the leftover work"): build, commit, deploy preview and production.
- Given ("yes push it", 2026-10-14): push `codex/rank1-14-intents` to origin, done.
- Not given: `updateMiner`, sending X posts or organiser messages, deregistering TVL_LOOKUP.

**Traps this session:** inline `node -e`/python heredocs eat `\b` and `\s` (use Write/Edit for regexes),
and `grep -P` fails silently here (see memory note).

## Durable facts (true across sessions; re-verify protocol facts against live docs)

**Identity.**
- Hackathon signup: `harsh.2024a@vitstudent.ac.in`. X: `@hyadav42774`.
- Miner, fee and Track 2 script wallet: `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Wallet operations
  are the owner's: Claude drafts and validates, the owner signs.
- Season I chain: Base Sepolia, Diamond `0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8`. Season II apps
  settle on Sepolia; the miner rules were unpublished on 2026-10-17 (`RULES_SEASON2.md`).

**Registration.**
- Look up by registrationId, never by slug. The catalog's `id` is not a registrationId either
  (`/api/miners/4433` is someone else's miner).
- Sandbox-validate at integrate.telegraphprotocol.com first; a rejection releases the slug.
- The YAML is served from a commit-pinned raw GitHub URL, so push before signing. The registered hash is
  the SHA-256 of the hosted bytes.

**Deploy (read GAPS G70).**
- Only from a clean `git worktree` at the release commit: `vercel deploy` uploads the working directory.
- Preview first, then `--prod`. After a `vercel rollback` the alias is pinned and `--prod` does not move it:
  run `vercel promote <url>`. Then `preflight.mjs`.
- Deploy new code only after a registration change it depends on is mined.

**Working here.**
- The tree is shared between sessions: commit with explicit pathspecs, never `git add -A`.
- Git Bash: run `manifest-diff.mjs` with `MSYS_NO_PATHCONV=1`; use `curl -4` (IPv6 hangs); files are CRLF.
- `tools/watch.mjs`: `--once` goes last. The explorer feed labels miners by display name; use
  `routing.subnet_id`. `git worktree remove` can hit a Windows lock; run `git worktree prune` after.

**Elsewhere.** Track 2 (WASM scorer): `track2/`. Track 3 app Morse: `../telegraph-morse`, its own repo.
The Midnight / NightSeal hackathon is a different, unrelated project.

**Older history** (Season I sessions, Aug 26 – Oct 13) was cut on 2026-10-17 to keep this file short:
`git log -p -- MEMORY.md`.
