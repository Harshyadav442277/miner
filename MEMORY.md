# MEMORY.md — session continuity

## 2026-11-05 ~10:05 UTC (15:35 IST): CURRENT — Ahmed answered; real paid traffic read; sanctions fix ready, not deployed

- **Production (probed 10:03 UTC):** Cyrillic names still answer `no_subject` and "Tesla, Inc." reads `matched: true` there.
- **Production:** `3c5e8ff` (`miner-5arlzhkv6`), the scored-fields release of the parallel session (block below),
  not this session's work; rollback `miner-iwc9rd2yv` (`aa110f8`). PR #17 merged into main (`2b5a9a1`, CI green).
- **Ahmed, 2026-11-05** (TELEGRAPH_FACTS 12–17):
  - no grace period on `updateMiner` (G206 closed; the docs still show one, G261);
  - claim only what passes its tests;
  - latency and price are not tie-breakers;
  - consumption evidence must tell paid requests from test traffic.
- **Rules re-read live 2026-11-05:** the Miner rubric is now 35/15/10/10/5/5 **+ growth 20** (RULES_SEASON2.md,
  WINNING.md header).
- **Network records** (`tools/consumption.mjs`, `docs/evidence/consumption-2026-11-05/`):
  - 385 paid requests to `livecert` Nov 1–4, from 16 wallets;
  - 24 ranked-routed; 341 x402 payments verified on Sepolia;
  - no wallet tied to an H2 app (G259).
- **The real callers found defects:**
  - FACT_CHECK wrong on common facts (G262, open, next);
  - sanctions misses on Cyrillic, abbreviated and domain forms (G258, fixed in code: `e19df9e`, then `853da09` after
    a security review).
- **Merged `codex/rank1-14-intents` twice** (`3df11ef`, then the release record `86a7bce`). The parallel session
  holds G254–G257. This session's entries are G258–G262 (fact-check is G262).
- **Verified:**
  - unit 885/885 in `C:/Users/hyada/tg-deploy/m3df11ef` (`3df11ef` plus `853da09`'s files; `86a7bce` changes no
    miner source);
  - the replay of 180 real sanctions inputs against the live lists: unknown 7 → 0, match 85 → 107
    (`docs/evidence/sanctions-real-inputs-2026-11-05/`).
- **Blocked on the owner:** a yes to release G258.
  - **Trade-off:** it changes sanctions answers while G254's three-epoch read of the sanctions rank is still open, so
    that read can no longer separate the two changes. Registry and filings stay clean.
  - **After the yes:**
    1. fast-forward `codex/rank1-14-intents` to this branch's tip;
    2. make a fresh deploy tree at that commit;
    3. run the release-miner skill (rollback target `miner-5arlzhkv6`).
- **Next (Claude):** G262 fact-check fix, then N1 (one `updateMiner`: cut STOCK_PRICE, NEWS_HEADLINES, NEWS_SEARCH,
  IP_GEOLOCATION and EVENT_OUTCOME; fix the descriptions; audit any addition first).
- **Owner:**
  - the release yes for G258;
  - post Discord and X update 1 (the links resolve now);
  - ask Ahmed which payer wallets are H2 apps, and say which are ours;
  - check the Vercel plan (G249).

## 2026-11-05 ~10:00 UTC (15:30 IST): scored fields LIVE as `3c5e8ff`; measuring (G254)

- Owner asked to "add" SANCTIONS_SCREENING_MATCH, CORPORATE_REGISTRY_LOOKUP and REGULATORY_FILING_MONITOR (`_GENERAL`)
  for their demand. They were already served and registered on 4829; only the top 3 per intent get routed requests.
  Fix: answers carry each intent's scored field (`matched`, `active`, `filing_count`). Owner: "Yes, deploy it".
- **Deployed** `3c5e8ff` as `miner-5arlzhkv6` (`dpl_6irxTNbbNRkgny3gXiyyMcMxLJ6T`) ~09:39 UTC; rollback
  `miner-iwc9rd2yv` (`aa110f8`). Preflight 4/7 first run, 6/7 after re-running alone; the last failure is a local
  OpenAlex live test (G231). 4829 active. Record: `track1-miner/docs/evidence/release-2026-11-05-scored-fields/`.
- `claude/screening-registry-intents-f6ab6b` was rebased onto `ca3742f`; its gaps renumbered G254–G256 (the
  winning push took G248–G253). `codex/rank1-14-intents` fast-forwarded; nothing pushed, nothing signed.
- Next (Claude): once three epochs scored after 09:40 UTC exist, run `node track1-miner/tools/epoch-history.mjs
  <out.json> SANCTIONS_SCREENING_MATCH_GENERAL CORPORATE_REGISTRY_LOOKUP_GENERAL REGULATORY_FILING_MONITOR_GENERAL`
  and compare with `epochs-before.json`. G257: the filings route needs `company`; a question alone often misses.
- Owner: G255 (ask Ahmed who wallet `0xbd6f…6976` is), G256 (source of the demand figure), G231 (OpenAlex key).

## 2026-11-04 ~21:20 UTC (Nov 5 02:50 IST): winning push started; `aa110f8` LIVE

- Owner: "i give you permission to take action on all of these … whenever you need my human involved, lmk".
  Ahmed was messaged by the owner (6 questions: grace period, 4 unscored intents, tie-breaks, judging, receipts,
  sandbox). Board: TASKS.md "Winning push".
- **Uptime record ON** from 2026-11-04 ~21:10 UTC: `uptime` workflow every 30 min on main (PR #16, `3d354e6`),
  `tools/availability.mjs`, artifacts kept 90 days. First run all green.
- **Capacity:** 58 req/s at 20 callers, 0 errors, `/ssl-check` (`docs/evidence/capacity-2026-11-04/`).
- **Audit replay:** 154/154 answered; 61 re-checked rows: 12 pass, 23 partial, 3 fail, 15 licence refusals
  (`docs/evidence/audit-replay-2026-11-04/`). Devnode ranks STOCK_PRICE 1st while we refuse every stock request.
- **Deployed** `aa110f8` (fixes rows 25, 27, 29, 30) as `miner-iwc9rd2yv`, preflight 7/7; rollback `miner-1aoi3y0wt`.
- Since: availability report tool; guide corrected; outreach drafts (`docs/OUTREACH.md`); GAPS G248–G253 (STOCK_PRICE
  ranked 1st while refusing; Vercel plan unknown, Hobby bars commercial use). PR #17 open, CI pending, not merged.
- Next (Claude): merge PR #17 when CI is green; N1 intent prototypes (summarisation, task-execution quality,
  image captioning, asset reserve) with audits; tutorial and video script (D1); Nov 11 weekly audit + report.
- Owner: post Discord + X update 1 after #17 merges; check the Vercel plan (G249); Ahmed's answers pending.

## 2026-11-04 ~20:30 UTC (Nov 5 IST): Evaluator rubric reconciled on `claude/winning-tracks-overview-3f735a`

- Owner: "Yes, update both". `RULES_SEASON2.md` gets the 2026-11-01 Evaluator rubric (cherry-pick of `6b09093`);
  `WINNING.md` moves to validity 40, integrity 15, reproducibility 10, coverage 10, docs 5, growth 20 (D17 added).
- Rubric-only change. `codex/sanctions-benchmark-v7` (48 commits ahead of main, no PR) carries its own fuller
  WINNING.md rewrite with sanctions status; expect overlapping hunks when it merges. Live Rules page not re-read today.

## 2026-11-05 IST: translation material admitted

- Owner signed and uploaded 144 `LANGUAGE_TRANSLATION_GENERAL` pairs. Anjoman reported 144 stored,
  zero duplicates and zero refused. Public wallet readback confirms all 144 admitted at epoch 2013.
  Eligibility is pending. The pool has one submitter, zero eligible submitters and a five-contributor minimum.

## 2026-11-05 IST: translation signature ready; URL Scan leads the evaluator shortlist

- Restored the translation file's LF bytes from the checkout's CRLF representation. All 144 rows pass the
  local checker and SHA-256 matches the upload runbook. The devnode returned zero rows for the owner wallet.
  Owner signs the Sepolia EIP-191 upload using the fixed identity in AGENTS.md.
- Public registry and pool scan across 196 intent and family IDs: Web Search has 1 of 5 eligible contributors.
  URL Scan has 5, 65 eligible rows, and generic fallback. Sanctions has 8 contributors under the `_GENERAL`
  child and no dedicated champion, but our candidate still lacks baseline-beating evidence. See TASKS and GAPS.

## 2026-11-03: required account and LiveCert wallet pinned

- Owner: "for this repo - use only hyadav42774@gmail.com and the wallet which is connected with livecert only".
- Fixed email: `hyadav42774@gmail.com`; fixed LiveCert wallet:
  `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` (already identified in the root and Track 1 READMEs).
- [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) require identity verification before authenticated
  actions and forbid fallback accounts, signers or payout wallets. This overrides older email guidance.
- Account guidance and the signing runbook were aligned. No external account links or wallet state changed.

## 2026-11-01 ~20:30 UTC (Nov 2 02:00 IST): main merged; translation material ready to sign

- **main merged** via PR #14 (owner: "merge it then"), `7e8c747`; branch and main in step. Deploys nothing.
- **Ahmed (Discord):** the unranked-intents issue is being resolved on Telegraph's side; meanwhile contribute
  evaluation material via the bounties. Bond USDC comes from the anjoman.ai faucet.
- **Built:** `track2/material/` — 144 Tatoeba preference pairs for LANGUAGE_TRANSLATION_GENERAL (empty pool, 21
  miners, bounty #140), all read, rules pass. **Waiting on the owner** to upload and sign (README there), then
  `/claim` and `/submit` on #140. Not measured against a baseline yet (G247).

## 2026-11-01 ~11:55 UTC (17:25 IST): `5939c49` LIVE (SSL prose, G246)

Owner: "Yes, deploy it". Release: track1-miner/docs/evidence/release-2026-11-01-ssl-prose/.

- **Production** `miner-1aoi3y0wt` (`5939c49`). Rollback `miner-jyh9t9upq` (`e63df93`). Watch `active`, 657 ms.
- Preflight 5/7, both failures re-run clean: intent answers 40/40 (a transient `/macro` upstream read), unit + live
  997/0/1 after the last badssl live test moved to ssl.com's expired host (follow-up commit, test only).
- Deploy tree detached at `5939c49` with that test change applied. Nothing signed.
- **Pushed** `codex/rank1-14-intents` to origin 2026-11-01 ~18:55 UTC (owner: "push branch"), up to `823d0ab`.
  Owner confirmed the Season II registration is done. Ahmed message drafted in chat (G235 scoring blockers).

## 2026-11-01 ~11:25 UTC (16:55 IST): G246 explained; gates fixed; SSL prose fix deployed later as `5939c49`

Owner: "Yes, investigate".

- **G246 cause:** badssl.com's one server (104.154.89.105) resets ~1/3 of TLS handshakes from anywhere (7/20
  from this machine); ssl.com's expired host 20/20. Not Vercel, not our code.
- **Gates:** verify-deploy and intent-answers retry badssl twice then SKIP, and grade `expired-rsa-dv.ssl.com`.
  On production 11:19 UTC: verify-deploy ALL PASSED (2 SKIPs), intent answers 40/40. Takes effect without a deploy.
- **`ssl.ts` prose fix** (untrusted answer contradicted itself; lowercase chain sentence): unit 871/871, live
  locally on 5 verdicts. **Not deployed — needs the owner's yes.** Deploy tree has it applied, uncommitted, on `e63df93`.
- Production unchanged: `miner-jyh9t9upq` (`e63df93`). Not pushed; nothing signed.

## 2026-11-01 ~09:45 UTC (15:15 IST): `e63df93` LIVE (G244); mission builds 9/9 + 57/58

Owner: "Answer ambiguous", "Yes, deploy it". Release: track1-miner/docs/evidence/release-2026-11-01-classify-ambiguous/.

- **Production** `miner-jyh9t9upq` (`e63df93`). Rollback `miner-rbjurfgjl` (`130e16c`). Cold classify call →
  ambiguous (was a wrong label); warm → hardware fault. Watch `active`, 369 ms.
- **Mission builds:** full 9/9; partial 57 pass, 0 fail, 1 refused (STOCK_PRICE); 15/15 missions.
- **Preflight 5/7 (G246):** badssl.com hosts `unreachable` from Vercel, also on the previous deployment; intent
  answers 40/40 when re-run alone. Re-check before the next release.
- Deploy tree detached at `e63df93`. Not pushed; nothing signed.

## 2026-11-01 ~08:15 UTC (13:45 IST): `130e16c` LIVE; mission builds full 9/9, partial 53/58

Owner: "Yes, deploy it". Release record: track1-miner/docs/evidence/release-2026-11-01-extraction/.

- **Production** `miner-rbjurfgjl` (`130e16c`: G245 extraction + bounded field-list match from the security
  review). Rollback `miner-htkhwofwv` (`a8abbcf`). Preflight 7/7; watch `active`, 376 ms.
- **Mission builds:** full 9/9; partial 53 pass, 4 fail (all G244 classification), 1 refused (STOCK_PRICE); 15/15.
- **G244** recurs on every fresh deployment's first classify call. Owner chose "Answer ambiguous": fixed in
  `e63df93` (unit 871/871), **not on production**; previews have no model key, so only production shows it.
- **H2 is open** (since Nov 1 00:00 UTC). Not pushed; nothing signed. Deploy tree detached at `e63df93`.

## 2026-10-31 ~19:50 UTC (01:20 IST Nov 1): all 102 mission builds graded; G245 fixed on a preview

Owner: "Partial workflow tests".

- **Production `a8abbcf`:** full builds 9/9 (SEC now cross-checked under the miner's own identity); partial builds
  50/58 on LiveCert's part; **15/15 missions** have a passing build. Evidence `fixtures-all-a8abbcf.json`.
- **G245 extraction** (invoice number never read; 3 builds) fixed in code, unit 869/869, preview `miner-ipk9a60l8`
  checked. **Not on production: the owner's yes covered `a8abbcf` only.**
- **G244 classification** (4 builds): intermittent model deadline miss; owner's trade-off, not changed.
- Tools: `tools/mission-steps.mjs` (steps, references, FAMILY_STEPS), `tools/mission-fixtures.mjs` (runner).

## 2026-10-31 ~19:30 UTC (01:00 IST Nov 1): G241–G243 fixes LIVE on production; workflows 7/9, 0 fail

Owner: "Yes, deploy it". Release record: track1-miner/docs/evidence/release-2026-10-31-mission-fixes/.

- **Production** `miner-htkhwofwv` (`a8abbcf`), alias miner-wine.vercel.app. Rollback `miner-h0lnck8v6` (`330f2af`).
- **Verified:** unit 866/866; preflight 7/7; watch `active`, 380 ms; mission workflows **7 pass, 0 fail, 2 unchecked**
  (SEC steps need `SEC_USER_AGENT`). Before: 3 pass, 4 fail.
- **Not pushed; nothing signed.** Deploy tree `C:\Users\hyada\tg-deploy\mc75190b` is detached at `a8abbcf`.
- **Next, Claude:** fixtures for the partial workflows (S1); E1 truth-source experiment brief; S3 client recipes.
- **Next, owner:** H2 registration before Nov 1 00:00 UTC; Ahmed question (TASKS); push yes.

## 2026-10-31 ~19:00 UTC (00:30 IST Nov 1): strategy rewritten; workflow fixtures 3/9 on production (superseded above)

Owner: "yes start. building. but before create a plan, asymmetrical strategies … use leverage over others".

- **WINNING.md §4 rewritten** (S1–S9) and **§4b experiments** (E1–E6) with kill rules. Leverage refused: extra
  wallets, own traffic as demand, scorers that know our miner.
- **Matrix:** 102 example builds; all 15 missions touched; **9 builds buy only families we serve**.
  TASK_EXECUTION_QUALITY and LLM_OUTPUT_EVALUATION (ranked today) are each the one missing family in 3 builds (S5).
- **Fixtures on production:** 3/9 workflows pass, 4 fail (G241 fact-check, G242 sentiment, G243 election
  phrasing), 2 unchecked (SEC). Evidence `track1-miner/docs/evidence/missions-2026-10-31/`.
- **G241–G243 fixed in code** (owner: "Yes, fix them"): unit 866/866; local fixtures plus preview `miner-d881p4yiz` show every failing step passing. **Not on production**: deploy needs the owner's yes, then re-run the fixtures on production. Deploy tree `C:Usershyada	g-deploymc75190b` is at `5a3dba0` plus the fix files (detached).

## 2026-10-31 ~18:50 UTC (00:20 IST Nov 1): CURRENT — docs re-read; comparator registration withdrawn

Owner: "update the documentation again, because Telegraph have updated them … what's the status … I want to
participate in all the tracks; apps and agents I will take care of later".

- **Docs re-read:** all 37 anjoman.ai/docs pages (25 updated Oct 30–31) and /rules with every tab. Facts:
  docs/TELEGRAPH_FACTS.md top section. Rules substance unchanged; prize-payment terms still unpublished (G218).
- **G237 killed:** FX_NOW is scored with no registered comparator. The CRYPTO_PRICE registration is withdrawn
  (track2/SIGN_S2.md top). Do not fund the wallet for it.
- **G235 revised:** judgment/hybrid intents need a canonical adapter and 5 pool contributors (ours: none, 0–1);
  CRYPTO_PRICE_USD's intent is `ready: false` ("no decimals"); WEATHER_CHECK_TEMPERATURE's cause is unknown. The
  question to Telegraph in TASKS is rewritten.
- **Adapters are now safetensors LoRA deltas (G238):** ours can be re-exported without retraining once Telegraph
  publishes `foundation.json` and the reference executor.
- **Epochs are 1 hour** since this afternoon (G239).
- **4829:** `active`, 36 intents, unchanged. Miner production `330f2af`, unchanged this session.
- **Not done:** G236 `cast` check (`cast` not installed). Nothing pushed, signed or registered.
- **Next, the owner's:** register for H2 before Nov 1 00:00 UTC (05:30 IST); send the TASKS question to Ahmed;
  say yes to the push; choose licensed news and stock sources.
- **Next, Claude's:** mission × intent matrix and fixtures (Nov 1–13); evaluation material for our intents
  (owner signs uploads); G207; `licensing` in openapi.json; first weekly audit.

## 2026-10-31 ~17:00 UTC (22:30 IST): CURRENT — CRYPTO_PRICE comparator ready; owner funds and signs

Owner: "Yes, pick a family". Details: [track2/MEMORY.md](track2/MEMORY.md), runbook [track2/SIGN_S2.md](track2/SIGN_S2.md).

- Picked CRYPTO_PRICE. Its evaluator is our existing, verified comparator (keccak `0x30dd31e3…cd9a3`).
- Runnable endpoint live: `https://livecert-comparator.vercel.app/CRYPTO_PRICE/runnable` (new Vercel project
  `livecert-comparator`). Tests 6/6, live 600/600.
- The wallet `0xdAd2…A39e` has 0 Sepolia ETH and 0 MACHINA: fund, approve, simulate, register (owner).
- G237: that a live comparator makes the family scored is a hypothesis. The draft question to Telegraph is in TASKS.

## 2026-10-31 ~16:15 UTC (21:45 IST): CURRENT — licence gates LIVE on production; not pushed, nothing signed

Owner: "i dont see livecert listed on rankings. update our miner and make it ready for the hackathon".

- **Why LiveCert is not on the rankings (G235):** on V2 only families with an evaluator are scored. 71 of 1,875
  registrations are scored, all in 7 families; none of our 36 families has an evaluator, so no miner at all is
  ranked in them. 4829 is `active`, the watch is green. Nothing in the miner changes this.
- **V2 moved to Ethereum Sepolia (G236):** Diamond `0x3624…b99b`. RULES_SEASON2, README and WINNING corrected.
- **Released `330f2af`** (licence gates, G200 qualifier, G217 holders, plus two fixes found on the preview:
  off-topic `/stock-price` questions get `no_subject` before the licence refusal; "What's the news on X" no longer
  leaves "'s" in the subject). Production `miner-h0lnck8v6`; rollback `miner-6kvt9zv2p` (`4af4ebd`).
- **Gates changed** to grade an honest `not_licensed` as correct; upstream-health no longer probes the nine
  sources production stopped calling, and probes MET Norway + Nominatim through production.
- **Verified:** unit 854/854; preflight 7/7 exit 0; intent answers 40/40 (34 answered, 6 honest refusals);
  watch `activation=active`. Evidence: `track1-miner/docs/evidence/release-2026-10-31-licence-gates/`.
- **Live consequence:** STOCK_PRICE, NEWS_HEADLINES, NEWS_SEARCH refuse everything; WEB_SEARCH loses current
  news; IP_GEOLOCATION answers reserved ranges only; FINANCIAL_DATA answers SEC figures only. Licensed sources
  are the owner's call (TASKS).
- **Branches:** `codex/rank1-14-intents` fast-forwarded to the docs commit after `330f2af`; not pushed.
  Deploy tree `C:\Users\hyada\tg-deploy\mc75190b` (detached, `npm ci` done).
- **Next, the owner's:** register for H2 before Nov 1 00:00 UTC (05:30 IST) if not done; G235 decision; push.

## 2026-10-29 ~18:00 UTC (23:30 IST): licensed-sources MERGED (deployed 2026-10-31, above)

Owner: "Merge it" (claude/licensed-sources).

- **Code conflicts resolved by keeping both sides:**
  - `handler.ts`: the receipt envelope plus the `licensing` field;
  - `currency.ts`: the 10-minute ECB hold plus the Frankfurter fallback;
  - `geo.ts`: DNS read-notes plus the licence gates.
- **Gaps renumbered:** the branch's G208–G212 collided with codex's, so they are now **G230–G234**. The docs
  session holds G221/G222 and was told G230–G234 are taken.
- **Ledger brought up to date with codex's routes:**
  - `/dns`, `/token-supply`, `/keywords` and `/vuln-triage` added;
  - CISA KEV and FIRST EPSS registered as unread (G233);
  - URLhaus removed;
  - a new test fails when an endpoint lacks a ledger entry.
- **Holders test rewritten** for the gated path: unlisted symbols go through Blockscout search, never GeckoTerminal.
- **Verified:** unit tests 852/852 and `tsc --noEmit` clean, from a clean `dist-test`. Not deployed.
- **Behaviour on the next deploy:**
  - `/stock-price`, `/headlines` and `/news-search` refuse everything;
  - `/ip-geolocate` answers reserved ranges only;
  - `/financial` answers SEC figures only;
  - `/event-outcome` searches Polymarket only;
  - unlisted holder symbols are likely `unknown` from Vercel.

  The release gates still expect the old answers: update them first (TASKS).
- **Branch `claude/licensed-sources` deleted** after the merge; it is in the 2026-10-29 bundle. Its worktree
  `winners-github-repo-88c231` (idle session "Winner's GitHub repo") is detached.

## 2026-10-29 ~17:30 UTC (23:00 IST): branches merged and pruned (licensed-sources merged since, above)

Owner: "merge or fix branches as well so things dont get complicated. remove useless branches"

- **Backup first:** `C:\Users\hyada\telegraph-backups\branches-2026-10-29.bundle` (`--all`, verified; every one of
  the 18 refs in `refs-2026-10-29.txt` is in it at its old commit). Restore a branch with
  `git fetch <bundle> refs/heads/<name>:refs/heads/<name>`.
- **Merged into `codex/rank1-14-intents`:**
  - `main` (`b5bc712`): 63 scheduled score commits plus c90e4b9. The tree is unchanged; this branch already had
    `uptime.yml` byte for byte, and its academic deploy check supersedes main's.
  - `claude/miner-s2-conformance` (`db17364`): the G200 RESEARCH_QUERY qualifier fix. **Not deployed.**
  - `claude/wasm-track-2-quality-e21db3` (`0684fa1`): comparators, pair generators, adapter recipe, `SIGN_S2.md`.
    The track2 ledgers keep G28–G32 under the V2 entry and G33; Season I log dropped.
- **Verified:** unit tests 822/822 (was 816; +6 qualifier tests) and `tsc --noEmit` clean, on `0684fa1` in worktree
  `gallant-allen-3589e4`. Not run on Vercel; nothing deployed.
- **Deleted, all contained in codex or patch-equivalent:**
  - `claude/g208-intent-swap`, `claude/miner-s2-conformance`, `claude/wasm-track-2-quality-e21db3`,
    `claude/miner-s2-improve`;
  - the five branches parked at c90e4b9 (`morse-repair-dbb423`, `miner-improvements-0de1a5`,
    `project-improvement-strategy-5ff8d8`, `winners-github-repo-88c231`, `youthful-nightingale-1c5936`).
  - Their idle sessions' clean worktrees were **detached, not removed**: project-improvement-strategy,
    morse-repair, youthful-nightingale and wasm-track-2-quality. Archiving those sessions removes the folders.
- **Kept:**
  - `claude/licensed-sources` (owner decision, TASKS);
  - `claude/hackathon-rules-docs-update-0eb075` (the live session's worktree);
  - `claude/gallant-allen-3589e4` (this session's worktree).
  - Local `main` was fast-forwarded to codex. **origin/main is untouched:** updating it needs a PR and the owner's
    yes.
- **licensed-sources, trial merge then aborted:** 5 conflicts, 3 in code. Each side added something the other
  lacks:
  - `handler.ts`: receipts against the `licensing` field;
  - `currency.ts`: the 10-minute ECB hold against the Frankfurter fallback;
  - `geo.ts`: `noteRead` against `permitted`.

  Merging it makes `/stock-price`, `/headlines` and `/news-search` refuse every request. It bars GeckoTerminal,
  which `/token-holders` still falls back to, as well as ip-api, ipwho.is, IPinfo, Yahoo, Nasdaq, CoinGecko,
  Google News and Manifold.
- **Not done, owner's call:**
  - delete remote `origin/codex/livecert-manifest-19` (Season I);
  - remove the 3 detached deploy worktrees in `C:\Users\hyada\tg-deploy\` (check node_modules links first);
  - archive the idle sessions above.

## 2026-10-29 ~17:00 UTC (22:30 IST): Season II rules re-read; V2 docs moved to anjoman.ai; docs updated

Owner: "new hackathon has appeared. update the rules what is required. https://anjoman.ai/ new website as well.
update all the documentation. remove non useful things"

- **Branch `claude/hackathon-rules-docs-update-0eb075`**, moved to `codex/rank1-14-intents` @ `af568e1` before any edit.
  `main` was 223 commits behind, and this branch had no commits of its own. Docs only, no code. Committed as
  `62e4e9c` and fast-forwarded onto `codex/rank1-14-intents` on the owner's yes. Not pushed: 14 commits ahead
  of origin. Not deployed, and there is nothing to deploy.
- **The rules changed (read 2026-10-29, `RULES_SEASON2.md`):**
  - the final deadline is **Dec 1 23:59 UTC** for every track (no longer Dec 20);
  - judging runs Dec 2–8, with provisional results from Dec 9;
  - prizes: $7,000 main, plus $3,000 for separate December challenges with their own rules;
  - /judging returns 404, and the pages agree, so G203 is closed;
  - starting early is allowed; event evidence must come from the event period.
- **New site:** anjoman.ai is Telegraph's consumer front end and the new home of the V2 docs (also at
  docs.telegraphprotocol.com). Its dashboard needs the owner's sign-in.
- **V2 facts that touch us:**
  - intents are families, so register `X_SUFFIX` / `X_GENERAL`, never a prefix;
  - spot checks run about hourly per intent;
  - evaluators: float WASM adapters only, `registerWasm(..., prefix, ..., runnableUrl)`.
- **Registration 4829:** `active` on V2 with 36 suffixed intents. All 36 families are on the site's 134-intent
  catalogue (G208 closed). Its `registered_at` reads 2026-10-25 00:48 UTC (G220).
- **New gaps:** G218 prize-payment terms unpublished; G219 USDC vs MACHINA wording; G220 grace period after
  the import.
- **Removed:** superseded MEMORY entries for 2026-10-14 → 2026-10-25 17:30 and 2026-10-26 10:50/12:30 (their
  facts are in GAPS; `git log -p -- MEMORY.md`); done and past-dated TASKS items.
- **Next, the owner's:**
  - register before Nov 1 00:00 UTC (05:30 IST);
  - read the payment terms;
  - send the two WINNING.md §8 questions;
  - push;
  - deploy G217.

## 2026-10-27 ~18:45 UTC (28-10 00:15 IST): CURRENT — G217 holder fixes COMMITTED; not deployed, not pushed

Owner: "Yes: change the outage verdict to unknown and make /token-holders use KNOWN_TOKENS before GeckoTerminal,
with tests, committed locally. Don't deploy yet."

- **Done:**
  - Holder-count outages answer `unknown`, not `not_found`. A partial outage with no chain named does too, and
    names the chains that did not answer.
  - `/token-holders` reads `KNOWN_TOKENS` first. The table moved to `src/known-tokens.ts`, shared with
    `/token-supply`.
- **Verified:**
  - Unit tests 816/816.
  - Local build against live upstreams: `evidence/g217-holder-sources-2026-10-27/local-probes.json`.
  - The gate's outage check (`upstream_unavailable` plus the "index outage" sentence) still holds.
- **Not verified:** on Vercel. No deploy, by instruction.
- **Next:**
  - Owner: deploy on a yes; use the release-miner skill, preview first.
  - Owner: the Blockscout Pro key (TASKS Owner).
  - Owner: push `codex/rank1-14-intents`.

## 2026-10-27 ~15:45 UTC (21:15 IST): G217 investigated; no code changed

Owner: "Investigate G217 … propose a second holder-count source with measured agreement before changing anything."

- **From Vercel's egress:** Blockscout's Base, Arbitrum and Polygon hosts return 403; Ethereum and Optimism return
  200. Read from production receipts.
- **Candidates measured on 26 tokens:**
  - GeckoTerminal is fast to reach but unreliable and disagrees (−9% to +20%);
  - Ethplorer's freekey is for development only;
  - Routescan was already ruled out.
- **Recommended:** a free Blockscout Pro API key, which keeps the same index on all chains. The owner creates it.
- **Two small fixes proposed and not made:**
  - the outage verdict `not_found` should be `unknown`;
  - `/token-holders` should use `KNOWN_TOKENS` before GeckoTerminal.
- Evidence: `track1-miner/docs/evidence/g217-holder-sources-2026-10-27/`; GAPS G217.

## 2026-10-27 ~14:55 UTC (20:25 IST): CURRENT — G213 release LIVE on production; not pushed, not registered

- **Owner's yes, 2026-10-27:** "deploy codex/rank1-14-intents at 4af4ebd (preview first, then production), run the
  gates and re-measure token-supply latency. Don't push or sign."
- **Production:** `miner-6kvt9zv2p` (`4af4ebd`). Rollback target `miner-9ozpb4kgh`.
- **Gates at baseline:**
  - unit + live PASS;
  - intent answers 39/40 (the IP Tokyo pin);
  - upstream health: the two known failures;
  - registration 4829 active.

  Evidence: `track1-miner/docs/evidence/release-2026-10-27-g213/`.
- **Token supply on production:**
  - table symbols 8/8 within 500 ms (83–277 ms);
  - addresses 137–162 ms;
  - symbols outside the table 657–731 ms.
- **New: G217.** TOKEN_HOLDER_COUNT (registered) answers "index did not answer" on production, because Blockscout is
  not answering. This predates the release.
- **Next, all the owner's:**
  1. push;
  2. send the Ahmed message and the G32 report;
  3. the G205 choice;
  4. publishing the named field results;
  5. whether to fix G217 with a second holder index.

## 2026-10-27 ~14:10 UTC (19:40 IST): the 2026-10-26 recommendations worked through (superseded above)

Owner: "complete this work", referring to the recommendations of 2026-10-26: the six ideas and the tools.

**Status of each:**

1. **G208 intent swap.** Live since 2026-10-26. G213 is fixed in code (`11f6306`):
   - a verified table of 21 token contracts;
   - the Polygon `polygon_pos_` resolver bug, which also affected `/token-holders`.

   **Not deployed.** Push, console validation (G212) and signing (G206) are the owner's.
2. **Validators as the uptime record: not possible for free (G205).**
   - Vercel logs keep about 1 h, and only invocations that printed something.
   - Vercel metrics need Observability Plus, a paid Pro feature.
   - Devnode and the explorer publish no liveness history.

   The owner picks: the uptime workflow, Vercel Pro, or a store.
3. **Replayable receipts: `tools/verify-answer.mjs`** (`2cb4049`, hardened `7f60ec2`).
   - It runs on the caller's machine, not as a miner endpoint, to avoid SSRF.
   - Documented in `docs/INTEGRATE_LIVECERT.md`.
   - `/vuln-triage` receipts now name a KEV catalog held in memory.
4. **Field check: `tools/field-check.py`** (`d8fa299`). Evidence: `field-check-2026-10-27/`.
   - Service endpoints that pass: DNS 3/5, token supply 2/5, triage 2/9. LiveCert passes all three.
   - Raw public APIs registered as endpoints pass 1 of 22.
   - **Named results stay outside the repo** (`C:\Users\hyada\tg-deploy\field-2026-10-27\`). Publishing them is the
     owner's call.
5. **MCP server: closed.** Telegraph already ships Telegraph-MCP (TELEGRAPH_FACTS 2026-10-27).
6. **G32 report: drafted in WINNING.md §9, not sent.** It asks whether v2 reuses the converter.

**Tools:**
- `.claude/skills/release-miner/SKILL.md` is written.
- Vercel MCP: used for the metrics check above.
- Playwright demo video: **not started.** It is low urgency; submission is in December.

**Commits on `claude/g208-intent-swap`:** `11f6306`, `2cb4049`, `7f60ec2`, `d8fa299`, plus this record. The main
branch is fast-forwarded and **not pushed**.

**Next, all the owner's:**
- a yes to deploy `11f6306`+ (G213 and the Polygon fix) and measure;
- a yes to push;
- send the Ahmed message (G206, G208, G212) and the G32 report;
- the G205 choice;
- whether to publish the named field results.

## 2026-10-26 ~05:20 UTC (10:50 IST): CURRENT — item 2, answer receipts, DEPLOYED and pushed

- Production `miner-mz9gh2afy`, rollback `miner-l5taibkkl`.
- All 36 intents carry receipts on production, with no secret-like values.
- Gates are at baseline after `no-regression.mjs` learned to ignore `receipt`.
- Evidence: `track1-miner/docs/evidence/release-2026-10-26-receipts/`.
- **Owner said "keep working, give prompt to yourself"** (2026-10-26). Self-set order:
  1. item 3, calibrated confidence, from labelled answers;
  2. item 5, nightly self-check;
  3. item 6, OpenAPI spec.

  Build, test and commit each locally. Pause only for deploy, push, keys or `updateMiner`.

- **The confidence rule and OpenAPI are DEPLOYED and pushed (2026-10-26 ~05:47 UTC):** production `miner-ccy6bq1ee`,
  rollback `miner-mz9gh2afy`, gates at baseline. Evidence: `release-2026-10-26-confidence/`.
- **Item 3, confidence (now deployed):**
  - On the Oct 21 audit, answers at confidence 1.0 were right only 72% of the time; Brier score 0.210.
  - Confidence is a fixed level per intent, not a per-answer judgement.
  - Too few labels to re-tune per intent. One rule was written down instead: 1.0 only for a direct
    authoritative read. Under it, translation is now 0.9 and academic topic search 0.8.
  - Evidence: `track1-miner/docs/evidence/calibration-2026-10-26/`.
  - The real fix is a fresh graded set of at least 10 per intent on current production.

- **Item 5, nightly self-check: blocked on the owner.** A scheduled job against production is like the `uptime`
  workflow the owner turned off (G205).
- **Item 6, OpenAPI (committed, not deployed; it is a repo doc):** `docs/openapi.json`, 35 operations, generated by
  `tools/openapi.py`.
  - Every field production returns is documented: 0 undocumented on the re-check.
  - Found G211: the registered `output_schema` omits 101 returned fields.

- **G200, RESEARCH_QUERY (committed, NOT deployed):**
  - `src/research.ts` now searches the name together with the question's qualifier.
  - It requires the qualifier in a trial's title or conditions (with a small clinical-synonym map).
  - Drug codes go first; bare company words are dropped.
  - Concept papers need every word.
  - A state's political decision is declined.
  - Replay of 100 questions (`tools/research-replay.mjs`): the 3 audit fails are fixed, 47 leads changed
    (read by hand), 4 still weak. Unit tests 804/804.

### Earlier the same morning

- **Every answer now ends with a `receipt`:** the upstream requests actually made, with credentials redacted, the
  status, the time, `from_cache` and the deployment. Code: `src/receipt.ts`.
  - `fetch` is wrapped once and each request runs in its own AsyncLocalStorage context.
  - TLS, DNS, the redirect walk and Quad9's HTTP/2 queries are noted by their modules.
- **Checked locally on all 36 intents:** every one has a receipt and none holds a secret-like value.
  Unit tests 798/798. Evidence: `track1-miner/docs/evidence/receipts-2026-10-26/`. The receipt is documented in
  `docs/INTEGRATE_LIVECERT.md`.
- **Next:**
  1. The owner's yes to land and deploy, then re-run `tools/receipt-check.mjs` against production.
  2. Item 3, calibrated confidence.

## 2026-10-25 ~18:00 UTC (23:30 IST): Ahmed answered — miners carry over to v2; listed-intents question pending

- **Registration 4829 carries over to v2** with no re-registration (TELEGRAPH_FACTS item 10).
- **On unlisted intents (G208), Ahmed said "let us check".** Pending; nothing is re-registered until the answer.
- **G206 (does an update restart the grace period?) is still unanswered.**

## Durable facts (true across sessions; re-verify protocol facts against live docs)

**Identity.**
- Required account: `hyadav42774@gmail.com` only (owner instruction, 2026-11-03; supersedes older signup
  email guidance). X: `@hyadav42774`.
- Miner, fee and Track 2 script wallet: `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Wallet operations
  are the owner's: Claude drafts and validates, the owner signs.
- Chain: Base Sepolia testnet, Diamond `0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8` (V2 docs, 2026-10-27).
  Season II rules: `RULES_SEASON2.md` (re-read 2026-10-29). Protocol docs: anjoman.ai/docs.

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

**Older history** (Season I sessions, Aug 26 – Oct 13) was cut on 2026-10-17, and Oct 14 – Oct 25 was cut on
2026-10-29, to keep this file short: `git log -p -- MEMORY.md`.
