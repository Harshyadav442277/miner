# MEMORY.md — session continuity

## 2026-10-25 ~17:30 UTC (23:00 IST): CURRENT — intent conformance; latency fixes on a branch, not deployed

Owner: "start working on them. one by one". The list:
1. conformance against the site's Intents page;
2. answer receipts;
3. calibrated confidence;
4. a second model provider;
5. nightly self-grading with our comparators;
6. an OpenAPI spec.

**Branch `claude/miner-s2-conformance`**, in worktree `youthful-nightingale-1c5936`, cut from `bc91008`. Not
merged, not pushed, not deployed.

- **`eaa1b8c`: step 1, the conformance check.** `tools/site-intents.mjs` reads the site's 93-intent table.
  Evidence: `track1-miner/docs/evidence/conformance-2026-10-25/`.
  - **Only 13 of our 36 intents are on the page (G208).** WEB_SEARCH, FACT_CHECK and FINANCIAL_DATA are not.
  - Listed siblings our code already performs: ONCHAIN_METRIC_VERIFY, VULNERABILITY_TRIAGE, FX_NOW,
    DNS_RECORD_LOOKUP and others.
  - Question for the organisers: are unlisted intents judged or routed?
- **`cd33a6c`: G209 sentiment and classification latency.**
  - `llm.ts` has a `fast` path: qwen3.8-27b with reasoning off, one attempt.
  - The Season I scorer-register prompts were replaced with plain ones.
  - Sentiment went from 21/24 at a p50 of 700 ms to **23/24 at 164 ms** (target < 300 ms).
  - Classification p90 is 329 ms (target < 400 ms). Its guard on asserting labels is kept on purpose.
- **`3f5a813`: FX holds the daily ECB table for 10 minutes** (it was fetched per request).
- **Sanctions' 3.35 s on a cold instance is the owner's call:** a scheduled warm-up ping or a snapshot.
- **Unit tests 795/795.**
- **Blocked:** item 4, a second model provider, needs a key that the owner creates (Gemini free tier is
  allowed). Not built: it could not be verified live without one.
- **Next:**
  1. The owner's yes to land the branch on `codex/rank1-14-intents` and deploy it.
  2. Re-measure production latency with fresh questions (`tools/latency-targets.mjs`; edit the questions).
  3. Item 2, answer receipts.

## 2026-10-24 ~08:30 UTC (14:00 IST): CURRENT — G207 fixed on a branch; not deployed, not merged

Owner: "keep improving miner".
- **Branch `claude/miner-s2-improve`** in worktree `.claude/worktrees/youthful-nightingale-1c5936`, cut from
  `84e0bd4`. The session's original branch sat at stale `origin/main`. Not pushed, not merged into
  `codex/rank1-14-intents`.
- **G207 is fixed in `src/qa.ts`** (shared by WEB_SEARCH and QUESTION_ANSWERING). With no model, the 20 test
  questions went from 11 correct, 1 partial, 8 wrong to 18 correct, 2 partial, 0 wrong. With the model, the
  branch got 20/20 and production 17/20 in the same run. Unit tests 791/791. Details are in GAPS G207 and
  `track1-miner/docs/evidence/g207-2026-10-24/`.
- **Lesson:** a change to which sources are retrieved alters what the model reads. Compare the model path
  against production (`model-vs-production.mjs`) before shipping any retrieval change.
- **G200, ACADEMIC_SEARCH part, also fixed on the branch:**
  - a named paper ("the paper 'Attention Is All You Need'") is looked up by its title alone;
  - "do academic search for X" now searches X;
  - checked against live OpenAlex; unit tests 793/793.

  The federated-learning question is still open.
- **Landed 2026-10-24 on the owner's yes** as `fd68dc0` and `21dc8fa` on `codex/rank1-14-intents`. The tree
  is identical to the worktree's `4d6847f`. Main-tree unit tests: 793/793. **Not pushed.**
- **DEPLOYED 2026-10-24 ~10:35 UTC** on the owner's "run those cmds by your own self":
  - production `miner-e2999tb2p`, built from `8d121e9`; the alias moved without a promote;
  - rollback target `miner-n9d4aoxw8`;
  - gates pass, apart from the misses already on record;
  - preflight's 3/7 was badssl latency plus this machine being unable to reach `api.met.no`.

  Evidence: `track1-miner/docs/evidence/release-2026-10-24/`.
- **PUSHED 2026-10-24** on the owner's yes: `76e6926..fac877b` to `origin/codex/rank1-14-intents`.
  - The push authenticated as **Harshyadav442277** through an inline credential helper.
  - At push time gh's *active* account was `0xsaroj001`. git's github.com helper is
    `gh auth git-credential`, so a plain `git push` would have authenticated as the wrong account.
  - **The owner has since switched the active account to `Harshyadav442277`** (checked with `gh api user`,
    2026-10-24). Plain `git push` is correct again.
  - `0xsaroj001` stays logged in, so check `gh auth status` before any push.
- **Next:** the rest of G200, RESEARCH_QUERY's dropped qualifier (99 routed questions).
- **Still pending from Oct 23:** the G206 choice between A and B. Option A's sign window closes
  **Oct 24 23:59 UTC (Oct 25 05:29 IST)**. Also pending: Season II registration and the organiser message.

## 2026-10-23 ~14:30 UTC (20:00 IST): CURRENT — Season I cleanup done; folder 1 GB → 177 MB

Owner: "yes cleanup. we dont want what doesnt help us in season 2."
- **Worktrees:** removed `admiring-golick`, `loving-elbakyan` and `status-check-fixes`, all clean and
  merged. Only the Track 2 worktree remains, and it has no links into the main tree (checked).
- **Branches:** 33 Season I local branches deleted after a verified backup at
  `C:\Users\hyada\telegraph-backups\season1-branches-2026-10-23.bundle`. All 33 heads matched; restore one
  with `git fetch <bundle> <branch>:<branch>`. Left: `main`, `codex/rank1-14-intents` and
  `claude/wasm-track-2-quality-e21db3`. Remote branches are untouched on purpose: a registered artifact may
  be pinned to a commit that only a remote branch keeps.
- **track2, 673 MB → 24 MB:**
  - deleted the Season I `rank_answer` stack: `scorer`, `scorer-v2`, `harness` with its 618 MB of
    champions, `fixtures`, `recon`, `release`, `PROOF.md`, `FIXTURES.md`, `vendor-baseline.sh` and the
    registry-screening script;
  - kept registration 1882's artifact (rule 5: still the TEXT_AUTHENTICITY_CHECK champion);
  - CI now runs only the miner job;
  - track2 `README`, `ARCHITECTURE` and `CLAUDE.md` rewritten for Season II.
- **Docs:**
  - deleted `SIGNING.md`, `REGISTRATION_UPDATE.md`, `docs/X_POSTS.md`, `docs/BUILD_IN_PUBLIC.md` (said
    posting is 25% of the score, which is false in Season II) and the stale `miner/README.md`;
  - removed four Season I event sections from `TELEGRAPH_FACTS.md`;
  - root `ARCHITECTURE.md` rewritten to the decisions still in effect.
- **Incident:** the forced worktree removal also emptied the main tree's `track1-miner/miner/node_modules`.
  The cause is inferred: the session worktrees probably linked to it. `npm ci` restored it; typecheck is
  clean and unit tests are 787/787. A memory note was added.
- **Not pushed:** these commits wait for the owner's yes. Origin is at `76e6926`.

## 2026-10-23 ~13:50 UTC (19:20 IST): CURRENT — audit fixes LIVE on production; branch pushed

Owner: "deploy the audit fixes and push" (2026-10-23).
- **Merged** `claude/correctness-audit-2026-10-21` as `22284c0`. Only GAPS and MEMORY conflicted, and both
  sides were kept. Unit tests 787/787.
- **Production `miner-n9d4aoxw8`**, built from `22284c0` in a clean worktree at
  `C:\Users\hyada\tg-deploy\m22284c0`. The alias moved without a promote. Rollback target is
  `miner-q5qepqluk`. Preview was `miner-qazd6wyp9`.
- **Gates:** verify-deploy, param shapes, hostile inputs and no-regression all PASS. Intent answers 35/36, the
  known IP Tokyo pin. Upstream health shows the known ip-api and merkle 429. Watch on 4829:
  `endpoint=ok activation=active`.
- **One stale live test was fixed** (8.8.8.8 is now anycast). The full suite then gave 911 pass, 0 fail,
  1 skipped. Evidence: `track1-miner/docs/evidence/release-2026-10-23/`.
- **New defect G207:** timeless web-search questions quote the wrong Wikipedia article. It is the next fix,
  because WEB_SEARCH is bought by 7 missions.
- **Still pending:** the Oct 24 choice between A and B (G206), registration, the organiser message, and the
  Track 2 release push (factscore repo, operator).

## 2026-10-23 ~13:45 UTC (19:15 IST): CURRENT — no new intents; prize stack planned (WINNING §9)

Owner asked: should we add intents, how do we win several prizes, and for a prompt to keep improving.
- **Mission map, re-counted from the 15 live mission pages.** Our intents touch **15/15** missions. The
  Track 2 modules (`SIGN_S2.md` intents) also touch 15/15. Evidence:
  `track1-miner/docs/evidence/missions-2026-10-23/`.
- **Decision: add no intents now.** The add-rule and the ranked candidates are in WINNING §9:
  ASSET_RESERVE_ATTESTATION, then WEATHER_FORECAST_VERIFY, and only if G206 resolves "no reset".
- **WINNING §9 prize stack:** six prizes, $2,600. The December technical candidate is Track 2 G32 (the kit
  packages a different ModernBERT from the one it trains); reporting it needs the owner's yes.
- **Track 2 branch (read, not changed here):** the adapter scores 96.6% as the node computes it,
  `verify_wide` PASS. Release commit `d82ff64` awaits the operator's push.
- **Still pending:** the Oct 24 choice between A and B (G206), registration, the organiser message, and the
  deploy and push.

## 2026-10-22 ~17:45 UTC (23:15 IST): CURRENT — Season I tooling deleted; rewards and to-do recorded

Owner: "yes delete the season 1 tooling" and "telegraph has also published season 2 hackathon rewards and what
we need to do exactly".
- **Deleted.** `d9ce93e` removed 68 files (8,270 lines): the WINNING §6 tooling list. References now point at
  git history. Typecheck clean; unit tests 771/771.
- **Rewards and to-do are on /rules.** No separate rewards page exists: /rewards, /prizes and similar return
  404. Recorded in `RULES_SEASON2.md`:
  - the prize split;
  - the conflicts across pages: home says $15,000, /rules says $10,000; the dates; the track numbering;
  - the docs' network rewards: routing 70/20/10, a 7-day grace period, spot-check revocation, earnings
    paid in MACHINA.
- **WINNING.md §8** is the dated checklist through submission, with the organiser message drafted (not
  sent).
- **Time-critical (G206).** It is unknown whether `updateMiner` restarts the 7-day grace period. The owner
  chooses by **Oct 24**:
  - A: sign the update by Oct 24 23:59 UTC;
  - B: freeze registration 4829 for the season.

## 2026-10-22 ~17:20 UTC (22:50 IST): Season II rubric published; WINNING.md is the goal file

Owner asked for: what else can be removed from Track 1; a goal file for winning Tracks 1 and 2; and a Season I
Track 1 post-mortem.
- **Rules published.** The Miner and Evaluator rubrics, prizes and award order are on /rules. Their tab
  text was read from the page bundle and recorded in `RULES_SEASON2.md`:
  - Miner: quality 35 (minimum 24), reliability 20, coverage 15, consumption 10, cost and latency 10, docs 10.
  - Evaluator: validity 40 (minimum 28), integrity 20, reproducibility 15, coverage 20, docs 5.
  - ≥ 70/100 to win anything. No points for raw volume or for registered intents.
- **Deadline conflict (G203).** /rules says Dec 20 23:59 UTC; /timeline says 1 Dec. We plan to 1 Dec.
- **New files.**
  - `WINNING.md`: decisions D1–D16 with their rubric line, asymmetric bets A1–A8, improvements by points
    at stake, the removal list (§6) and the evidence table (§7).
  - `track1-miner/docs/S1_LESSONS.md`: why we lost Season I, and lessons L1–L12.
- **Removal answer (WINNING §6).** The Season I tooling below was **deleted on the owner's yes** in a
  separate commit; unit tests passed 771/771 after it. The intent removals still wait for the `updateMiner`.
  - Intents: NEWS_HEADLINES, IP_GEOLOCATION, STOCK_PRICE, and RESEARCH_QUERY unless fixed by Nov 1.
    These go in the next `updateMiner`.
  - Season I tooling: `sign-update.sh`, `onchain-shape-bench.mjs` with `candidate-corpus.json`,
    `replay-corpus.mjs` with `corpus.json`, `score-history.jsonl`, `opportunity-scan.mjs`, and three
    superseded evidence folders.
  - Source: all 79 modules are reachable and no export is unused.
- **Checked live at 16:50 UTC:** registration 4829 `active` with 36 intents; production `/ssl-check` 200 in
  1.1 s; `/api/evalpool/status` 404.
- **Owner decisions added:** G203, G204 (related-party consumption against override 2), G205 (availability
  record) and the §6 cuts. They are in TASKS.md.
- **Unchanged and still pending:** the deploy of the audit branch and the places table, which carries the
  G201 sanctions alias fix; push; the licence decisions.

## 2026-10-21 ~19:30 UTC (22-10 01:00 IST): CURRENT — correctness audit done, 17 fixes committed, NOT deployed

Brief from the parent session: audit every intent against routed questions and the primary source; fix or log.
- **Branch `claude/correctness-audit-2026-10-21`** (worktree `admiring-golick-3474ab`), based on
  `codex/rank1-14-intents` @ `89448f0`; 17 code commits `220463a`…`a0b2847` + one docs commit. NOT pushed,
  NOT deployed. Unit **787/787** (771 before).
- **Audit:** 36 intents, 154 questions, production 110 pass / 17 partial / 27 fail; 22 fails fixed, 5 logged
  (G200). Evidence: `track1-miner/docs/evidence/correctness-audit-2026-10-21/` (`table.md` is the table).
- **Worst finding, G201:** production SANCTIONS answered "Rosneft" `no_match` — the OFAC alias file had not
  loaded and the alias-less list was cached as complete. Fixed in `220463a`; production still affected.
- **Other fixes:** fact-check "reported" sentences never support; SEC fiscal-year / this-month windows;
  registry possessive; event side-award markets; binary classification labels; weather written date and
  weekend; gas base-fee floor and misroute decline; FX misroute decline; entity extraction; crypto thin book;
  market cap; anycast IPs; Node LTS; timeless web-search via /answer; headlines "for X"; storm precip label.
- **Not run:** live suite, preview, deploy gates. `no-regression.mjs` will differ on `/ip-geolocate` by
  design (G202). **Next:** owner's yes to deploy this branch (it includes the places table), then push.
- **Trap, twice this session:** heredoc/python edits of regex source failed on escapes (caught, nothing
  written). Use Edit for any line with a backslash.

## 2026-10-21 ~07:45 UTC (13:15 IST): CURRENT — places table committed, NOT deployed

Owner: "what's the status. fix whatever is left" (2026-10-20).
- **Live, checked 2026-10-20/21:** registration 4829 `active`, `rejection_reason` null; production
  `/ssl-check` HTTP 200 in 1.0 s. Production is still `miner-q5qepqluk` per the 10-18 record (not re-inspected).
  The `uptime` workflow is `disabled_manually` since 2026-10-01 (owner's request); issue #13 from that day is stale.
- **Season II Miner rules still unpublished** at 2026-10-21 06:30 UTC (/rules, /judging).
- **Committed** (on `claude/status-check-fixes-cc2bc5`, based on `26f9bc7`; NOT pushed, NOT deployed):
  `7b07e8a` Season II root + Track 1 READMEs; `afda450` places table (G196), OSM credit in weather answers
  (G198), `NOMINATIM_URL` (G199); `75695fd` GAPS/TASKS. Unit **771/771** (761 before + 10). Offline: 80/99
  routed weather questions resolve from the table with no Nominatim call.
- **Not run:** live suite, preview, any deploy gate against the new code.
- **Next:** owner's yes to deploy (preview → `vercel curl` the weather routes → `--prod` → preflight), then to
  push. Regenerate the table with `node track1-miner/tools/build-places.mjs` (Wikidata 504s are common; the
  per-type queries fetch ids first for that reason).
- **Owner decisions added:** G199 (Nominatim policy for AI-assisted code / paid geocoder). Unchanged: news
  source, STOCK_PRICE licence, the next `updateMiner` (G195 strings).
- **Trap, again:** a heredoc ate `\s` in an edit to `storm.ts` (`/s+/`); caught by reading the diff. Use Edit.

## 2026-10-18 ~08:25 UTC (13:55 IST): CURRENT — licensed weather and translation LIVE on production

Owner: "proceed as per your recommendations" (2026-10-18).
- **Production `miner-q5qepqluk`**, built from `1d1969e` in a clean worktree (alias moved by itself). Rollback
  target `miner-8jdiuqzv4` (36-intent build, pre-swap). Gates against production, run singly: verify-deploy
  PASS, param shapes 54/54, hostile inputs pass, no-regression 8 identical, intent answers 35/36 (known IP pin);
  watch 4829 `endpoint=ok activation=active`. Translation answers live through Groq ("Bonjour", "Hola").
  Evidence: `release-2026-10-18/gates-1d1969e.txt`.
- **Not run:** the local unit+live suite. Nominatim was returning 429 to this machine after the parallel live
  run (G196); do not re-run live weather tests from here until it answers again.
- `1d1969e` also fixed a busy geocoder being answered as "No resolvable location" (now an outage).
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
