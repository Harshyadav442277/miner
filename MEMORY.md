# MEMORY.md — session continuity

## 2026-11-24 ~02:10 UTC (07:40 IST): CURRENT — `66d5ecb` LIVE (`miner-g5zcew03d`); no answer changed

- Production `dpl_2d2r1xgMJxRbAkbt6NDc6yZKYg5k`. Preflight 7/7, watch 6126 active. Rollback: `miner-3udefsmw1`
  (`8a631d5`). Evidence: `track1-miner/docs/evidence/release-2026-11-24-review-logging/`.
- The request archive now keeps each invocation's REQ and RES (G362 fixed; installed in `tg-deploy\scores`, 65-minute
  lookback). Code reviews and audits log `REVIEW stated= problem= served= top=`.
- No zero's cause was proven: CODE_REVIEW answered `Comment` on its one logged scored call (G364); the others have no
  RES line. Epoch 47 began ~01:58 UTC.
- Next: after epoch 47, join each zero's scored_at to the archive's `lines`; then fix what they show (G363, G364, G361).
- Archive rows: `lines` is every log line; `around.mjs`-style joins need `MSYS_NO_PATHCONV=1` for `/route` arguments.

## 2026-11-23 ~23:30 UTC (2026-11-24 05:00 IST): CURRENT — `8a631d5` LIVE (`miner-3udefsmw1`); main = production

- Owner: "take the decision as per your recommendation. all i want is to win". PR #56 (the other session's `36e4e13`)
  and #57 merged. Production `dpl_iBtj3VqNELw7JMhhLRQqpSJeN82K`; 44/44 intent answers with the updated gate; watch active.
  Rollback: `miner-1by7eu4j6` (`36e4e13`). Evidence: `track1-miner/docs/evidence/release-2026-11-24-transient-zeros/`.
- SUBMISSION_PACK.md facts corrected: registration 6126, the licence-gate wording (LICENCE_GATE unset in Production),
  and the paid-usage figures Codex verified. The owner submits by Dec 1 23:59 UTC (Dec 2 05:29 IST).
- Next: read epochs 47+; RESEARCH_QUERY, EVENT_OUTCOME and CODE_REVIEW zeros need their RES lines (the archiver keeps
  few, G362); news source decision (G326) is the owner's.
- Start-up prompt for the next session: `docs/NEXT_SESSION.md`.


## 2026-11-23 ~12:50 UTC (18:20 IST): CURRENT — `36e4e13` LIVE (`miner-1by7eu4j6`); PR #56 open, not merged

- Owner: "highly focus on chat completion, event outcome, web general, research query" and "deploy everything
  alongside". Production `dpl_GZ6oFR8b4ZxgnCVbM5AJS2g2eTt8`. Gates 7/7 (intent answers re-run after a Blockscout
  500), watch 6126 active. Rollback: `miner-mqhxx9oil` (`40b698f`). Evidence: `track1-miner/docs/evidence/release-2026-11-23-four-intents/`.
- Changed: research outage briefs; answers lead with the direct sentence; web model brief (labelled, dated);
  event stage and Fed matching; chat brief label and bare verdict; G358.
- Open: G359–G361 (Pectra-type recent facts, research latency, event zeros unexplained).
- Next: read the four intents in the next two epochs; merge PR #56.

## 2026-11-23 ~12:00 UTC (17:30 IST): CURRENT — `40b698f` LIVE (`miner-mqhxx9oil`); PR #56 open, not merged

- Production `dpl_AE3WL7EfDNqp7LYPLYJSiQrnd9Af` from `40b698f` (PR #56 head), owner's yes. Preflight 7/7, watch
  6126 active. Rollback: `miner-pd9clrct7` (`5f28505`). Evidence: `track1-miner/docs/evidence/release-2026-11-23-extraction/`.
- Live: CONTENT_EXTRACTION briefs every field, and a model reads fields the patterns miss, kept only when the text bears
  them out. Checked on production (G355 closed).
- Open: G358 (the fitter cuts "Senior Data Engineer" before trying tighter separators). Merge PR #56 after CI.
- Next: read CONTENT_EXTRACTION in the next two epochs.
- vercel.cmd drops everything after the first `&` in a URL: call the CLI through `node …\vercel\dist\vc.js`.

## 2026-11-23 ~11:00 UTC (16:30 IST): CURRENT — `5f28505` still LIVE; epoch 43 fixes on a branch, not deployed

- Epoch 43: CONTENT_EXTRACTION 0 (top 0.999), WEATHER_CHECK 0.658, CRYPTO_PRICE 0.551 (rank 30 of 52; the top
  score is 0.59). CURRENCY, SSL and STOCK are at rank 3. Record: `track1-miner/docs/evidence/epoch-43-2026-11-23/`.
- Branch `PR/epoch-43-miner-improvements-5d425b`: `7e5a86f`, `5dc18fc`, `7277e16` (extraction brief, a grounded
  model extraction, months not companies). Unit 1084/1084. The model path is untested until production (G355).
- Weather is left as is: the reference changes between epochs (GAPS 2026-11-23 block).
- Next: owner's yes to deploy, then the G355 probe and the next two CONTENT_EXTRACTION epochs.

## 2026-11-22 ~19:45 UTC (2026-11-23 01:15 IST): CURRENT — `5f28505` LIVE (`miner-pd9clrct7`); PRs #53, #54 merged

- Production `dpl_9pMfgpRecB1Cn116wHV5v8noi9wg` from main `5f28505`. Preflight 7/7, watch active. Rollback:
  `miner-bk9insot7` (`8ef874f`). Evidence: `track1-miner/docs/evidence/release-2026-11-23-remaining-gaps/`.
- Changed: ONCHAIN_METRIC reads any `metric` spelling; market cap from SEC diluted shares when Nasdaq fails;
  documentation answers pick the passage the question asks about; the SEC-only registry answer is held to the jurisdiction.
- Next: read epochs 40+ (GAPS 2026-11-22 blocks). Codex's Stablecoin workflow plan needs the owner and an app partner.


## 2026-11-22 ~19:20 UTC (2026-11-23 00:50 IST): CURRENT — `8ef874f` LIVE (`miner-bk9insot7`); PRs #50, #51 merged

- Production `dpl_BfJXp7P13QwEgh7fD1hUtaCo6ozS` from main `8ef874f`. Preflight 7/7 after one flaky live test re-ran clean;
  watch active. Rollback: `miner-ge5ejbder` (`76b11a1`). Evidence: `track1-miner/docs/evidence/release-2026-11-23-zero-causes/`.
- Changed: research briefs for every verdict (no study found: labelled general knowledge); security review of a
  target named or described in words; registry enforces the jurisdiction; filings read ISO ranges and named months;
  logs keep only verdict words and short asset names.
- Codex's reply to the review: `docs/CODEX_AUDIT_2026-11-22_RESPONSE.md` on `codex/rank1-14-intents` (not on main). Its
  lead plan is a Stablecoin pre-payment screening workflow with an independent reproduction (owner and app partner).
- Next: read epochs 40+ for SYNTHESIS, SECURITY_REVIEW, FINANCIAL, REGISTRY, FILING (GAPS G345, G350-G353).


## 2026-11-22 ~14:15 UTC (19:45 IST): CURRENT — `76b11a1` LIVE (`miner-ge5ejbder`); PR #47 merged

- Production `dpl_GZSboFBsNoGF8sMYTzv9GEvX4Qke`, from main `76b11a1`. Preflight 7/7, watch active. Rollback:
  `miner-lefeghzyl` (`4f1f852`). Evidence: `track1-miner/docs/evidence/release-2026-11-22-epoch-fixes/`.
- What changed: FINANCIAL_DATA market caps (coins under rate limits, multi-class companies, ticker collisions); a
  model-written answer `brief` for research, synthesis and papers; clause-cut briefs elsewhere; REQ values and RES lines.
- Next: read the next FINANCIAL REQ/RES lines and the epoch scores (TASKS.md 2026-11-22 block, GAPS G345–G349).
- This record is on branch `PR/release-record-76b11a1` (docs only), pushed for a PR.


## 2026-11-22 ~09:30 UTC (15:00 IST): CURRENT — `4f1f852` LIVE (`miner-lefeghzyl`); PR #47 open, not merged

- Production `dpl_B4dRAz1D6s2yoevNoty1Uz1fR8eh`, owner's yes. Preflight 7/7, watch active. Rollback: `miner-n0lo5k8w7`.
  Evidence: `track1-miner/docs/evidence/release-2026-11-22-audit-fixes/`.
- Next: merge PR #47; read ONCHAIN_METRIC and WEB_SEARCH in the next epoch; G343 (Arbitrum on Vercel).
- The release-miner skill is stale: step 1 names `codex/rank1-14-intents` and step 7 registration 4829. This
  release shipped from the PR branch and watched 6126.

## 2026-11-22 ~09:15 UTC (14:45 IST): Codex audit reviewed; fixes on `PR/audit-fixes-2026-11-22`

- **Branch:** `PR/audit-fixes-2026-11-22` from `main` `b48749a`: `2685fe8` (ONCHAIN_METRIC tx_count, G342),
  `a29e0dd` (block value follows the asked figure), `7e03413` (Web Search timeless sources), `3b92017` (nonce questions in words). Unit 1059/1059; live web-search test passes.
  Archived request shapes replayed on a local server (balance, tx_count, polygon, arbitrum, prose nonce): all answer (G342–G344).
- **Production:** not touched this session. The newest deploy log in `C:\Users\hyada\tg-deploy` is `prod-deploy-3543649.log`;
  the live revision was not re-checked. Next: owner's yes to deploy the branch (release-miner skill),
  then read the next ONCHAIN_METRIC epoch.
- **Open:** Arbitrum archive state (G343). Audit items not acted on are listed in G344.

## 2026-11-19 ~09:15 UTC: CURRENT — Groq key replaced by the owner; production `miner-6q1l1vpb4` (`fdba94e`)

- All model-backed routes verified on production (G338 fixed). Next: RESEARCH_SYNTHESIS search (G341); sign
  `f47f018` after the faucet; read the next epoch.

## 2026-11-19 ~08:30 UTC (14:00 IST): CURRENT — `fdba94e` LIVE; Groq key dead (G338); 44 intents active again

- **Production:** `fdba94e` (`dpl_AM6rwiWNe4uJX5MtvkvrasJ6VH9z`, `miner-ek944oseb`): `1c2a564` plus one log line for
  LLM refusals. Rollback: `miner-ngeicaq66` (`1c2a564`). Unit 1055/1055.
- **Registration:** the catalog lists livecert active on `6499779` (44 intents) since 2026-11-18 10:01 UTC (G337
  resolved).
- **Epoch 14:** 14 intents at 0. Model-backed ones are from the dead Groq key (G338); the others are in G339.
  Rank 1: CONTENT_EXTRACTION, NEWS_HEADLINES, STOCK_PRICE.
- **Owner:**
  1. New Groq key into Vercel Production `GROQ_API_KEY` (Sensitive); then Claude redeploys and verifies.
  2. Sign `f47f018` after the faucet.

## 2026-11-18 ~09:10 UTC (14:40 IST): CURRENT — ALERT: node serves LiveCert as 5358 with 4 intents (G337)

- A node import at 08:35–08:41 UTC created 5352 and 5358 for our wallet from Season-1 IPFS YAMLs, with no on-chain
  event.
  - 5358 is active with 4 intents (SSL, STORM, WEATHER_FORECAST, IP_GEOLOCATION). 5292 (44 intents) is superseded.
  - Evidence and organiser note: `track1-miner/docs/evidence/import-overwrite-2026-11-18/README.md`.
- **Owner:**
  1. Sign `yaml-for-signature-2026-11-18` (pinned `f47f018`, `0xbad6049c…452037`, 44 intents; bond $4.25 test USDC, balance $4.1002, faucet ~08:30 UTC Nov 19) on Anjoman
     `/dashboard/earn`.
  2. Send the organiser note.
- **After signing:** find the id on-chain (`minerlogs.mjs`-style scan: Diamond events with topic2 = our wallet) and
  on the node. Then set `REGISTRATION_ID` and update the release skill, mission-matrix and README.
- `main` = `3b4dc90` (PR 40) matches production `1c2a564`; its `miner.yaml` is the `ac8d59e` YAML.

## 2026-11-18 ~09:30 UTC (15:00 IST): CURRENT — `1c2a564` LIVE; serving as 5292; YAML `ac8d59e` ready to sign

- **Production:** `1c2a564`, `miner-ngeicaq66` (`dpl_Cp6AhS1YnvcaYgJ8Z474m6CeyJgh`). **Rollback:** `miner-bb4rttgjq`
  (`4cb5924`). Unit 1055/1055. Contains the FINANCIAL_DATA fix (G333) and the ONCHAIN_METRIC `metric` param (G335).
- **Epoch 8:**
  - FINANCIAL_DATA rank 1 (0.9938); EVENT_OUTCOME 0.987; WEATHER_CHECK 0.625; translation 0.92.
  - Four on-chain intents at 0 (G335); GAS and REGULATORY at 0 for the whole field.
  - Table: `track1-miner/docs/evidence/track1-diagnosis-2026-11-17/epoch8-table.json`.
- **Owner to sign:** `track1-miner/docs/evidence/yaml-for-signature-2026-11-18/README.md`. Pinned at `f47f018`,
  SHA-256 `0xbad6049c…452037`, 96,988 bytes. It adds input mappings for ONCHAIN_METRIC and TOKEN_TOTAL_SUPPLY to
  the Nov 17 changes.
- **Registration:** 5301 (signed Nov 17) is still not on the node (G334). The node serves `04c0e9f` as 5292.
  `REGISTRATION_ID` stays 5292 until a new id is on the node.
- **Branch:** `PR/financial-market-cap-2026-11-17` holds `4cb5924`, `1c2a564` and `ac8d59e`. It is merged by PR, so
  `main` matches production.

## 2026-11-17 ~17:00 UTC (22:30 IST): CURRENT — `4cb5924` LIVE; 5301 signed but not indexed; serving as 5292

- **Production:** `4cb5924`, `miner-bb4rttgjq` (`dpl_AuZPKbjHRVwW5qygrzcCv6QRx8Y3`). **Rollback:** `miner-fudhplzsd`
  (`6499779`). Unit 1054/1054. Fix: FINANCIAL_DATA stocks now carry `market_cap_usd`, and names in `symbol`
  resolve (G333).
- **Registration:** the owner signed the `6499779` YAML at 11:14 UTC.
  - On-chain it is registration **5301**: tx `0xbfb7a37b…8b36`, success, our wallet and hash.
  - The node's 5301 is another team's imported record, so ours is not indexed (G334). LiveCert serves as 5292
    (YAML `04c0e9f`, active).
  - Organiser note drafted in `track1-miner/docs/evidence/registration-5301-2026-11-17/README.md` (owner sends).
  - **Do not re-sign** before they answer.
  - Keep `REGISTRATION_ID` = 5292 until the node lists 5301 for livecert.
- **Epoch 3 (14:47–14:52 UTC):** CVE 0.6667 (nine-way tie), WEATHER_CHECK 0.4833, GAS and REGULATORY 0 (whole
  field), three intents at 1.0. Saved in `track1-diagnosis-2026-11-17/epoch3/`.
- **Capture gap:** the PC slept 13:30–16:00 UTC and epoch 3's requests were lost (G311).

## 2026-11-17 ~11:15 UTC (16:45 IST): CURRENT — `6499779` LIVE; registration 5292 active; YAML ready for signature

- **Owner (2026-11-17):** "please take care of everything by yourself … end to end". Claude still never signs,
  posts or touches the wallet.
- **Production:** `6499779`, `miner-fudhplzsd` (`dpl_67J8yxpsi6TWDyHzpBSaxAi3gJ4C`). **Rollback:** `miner-6ptphl0o0`
  (`77970b0`), then `miner-om2pymy89` (`dd95ab6`). Record: `track1-miner/docs/evidence/release-2026-11-17-cve-metar/`.
  Unit 1052/1052.
- **Fixed today:**
  - CVE reports NVD's own score first (CVE-2025-0108: 8.8 → 9.1, G329).
  - The current temperature comes from the nearest METAR (G330).
  - `/token-holders` reads an address passed as `token`.
- **Registration 5292:** active since the node's rebuild restored it at 09:51 UTC; the node's scores are at epoch 0.
- **YAML to sign:** `track1-miner/docs/evidence/yaml-for-signature-2026-11-17/README.md`.
  - Pinned at `6499779`, SHA-256 `0xbf9dd574…53bab`, 96,994 bytes, 44 intents.
  - Changes: the G328 params, the `translation` output, the `/sec-filings` description.
  - The owner validates on Anjoman `/dashboard/earn` and signs. After that, update `REGISTRATION_ID` everywhere.
- **Request capture is live:** `record.cmd` runs `archive-requests.mjs` every 30 min into
  `C:\Users\hyada\tg-deploy\scores\requests.jsonl` (G323 closed).
- **Next:** TASKS.md "Handoff 2026-11-17 ~11:00 UTC".

## 2026-11-17 ~10:10 UTC (15:40 IST): CURRENT — registration 5292 RESTORED; `main` = PR 36 merge (`37f2a77`)

- **5292 is back** since 09:51:48 UTC: active, same wallet, hash `3cf18081…` and 44 intents. `watch.mjs` reports
  active, so the `uptime` alerts clear on their own (never disabled). Not re-registered; nothing signed.
- Evidence and the timeline: `track1-miner/docs/evidence/devnode-reindex-2026-11-17/README.md`. LiveCert was out of the
  node for at least 2 h 20 min (07:30–09:51 UTC). Every score is at epoch 0.
- **Owner:** the organiser message there is optional now. It documents the outage under rules §10.02.
- **New, G328:** the restored record warns of four node-required params with no field on our endpoint (fields,
  subject, token, categories). Add them to the batched YAML.
- **Next:** first epoch scored under the rebuilt node. The local recorder and `scores` record it; then run
  `intent-table.mjs` into `track1-diagnosis-2026-11-17/after/`.

## 2026-11-17 ~08:55 UTC (14:25 IST): CURRENT — PR 33 merged (`main` = `f84ec04`); LiveCert NOT registered on the devnode

- **Merged:** PR 33 on the owner's "merge the prs"; `main` now matches production (`dd95ab6` code). PR 9 is not merged:
  it only adds `on_chain.request` to `miner.yaml`, which the docs say jobs no longer read, and it would change the
  signed YAML. Closing it is the owner's call.
- **Email "miner failed" = issue 34**, opened by `scores` at 08:25 UTC. Fixed in `87d939c`: the recorder exits 0
  when the node holds no score for any miner. Green on `main`: run 44050361817. Issue 34 is closed with the cause.
- **Still failing on purpose:** `uptime` → `watch.mjs --registration-id 5292` exits 1 (404). That is true:
  - at 08:47 UTC 5292 is still missing, and the replay has stayed stuck at 5201 since 07:30;
  - the catalog grows only by new registrations (1,465, a bulk registrant `0x8b22…`);
  - all scores on the node are at epoch 0, so re-registering loses no score history;
  - the `livecert` slug is unclaimed.
- **~09:20 UTC: do NOT re-register.** The owner said "Re-register now"; the chain and the docs say it is not needed.
  - **On-chain, 5292 is intact.** Ethereum Sepolia, Diamond `0x3624EB01…eb99b`: tx
    `0x8ebe1d47ca227789fd38f3509845dfa33a7a50dbc489afddfb0241140a46f5db`, block 12,148,994. It is from the LiveCert
    wallet and carries YAML hash `3cf18081…`. Three events have topic1 = 5292, and there is no later event for 5292
    up to block 12,153,446 (`eth_getLogs`, publicnode).
  - **The docs** (miner-registration, updated Nov 1) say: nodes "rebuild from on-chain state" and re-fetch every YAML.
    After a chain move the admin imports existing miners "with the same id and owner. You do not have to register
    again", and registration reopens only when the import closes.
  - Re-registering would create a new id and supersede 5292 for nothing.
  - **Next:** the owner asks the organisers why the node's rebuild stopped at 5201 (draft below, with the tx hash).
    Re-check `GET /api/miners/5292`.
  - Anjoman's `/dashboard/validate` is now a "Become a validator" sign-up page. YAML validation runs inside
    `/dashboard/earn`, which needs a wallet.

## 2026-11-17 ~07:35 UTC (13:05 IST): `dd95ab6` LIVE; devnode re-indexing, 5292 not yet back (G325)

- **Production:** `dd95ab6`, `miner-om2pymy89` (`dpl_2vxUyxsXF9Cbs2ryb9uDxNZUqYGm`). **Rollback:** `miner-7bx1moszs`
  (`14b6d98`), then `miner-hns8y07yw` (`04c0e9f`). Unit 1045/1045 at `dd95ab6`.
- **Fixed:** the Federal Register answer said "X is not an SEC registrant" for brand names of registrants (Google,
  Meta). It now says no registrant matched by name, at confidence 0.7.
- **Network (G325):** from ~06:31 UTC the devnode rebuilt its catalog; at 07:33 UTC there were no scores (epoch 0),
  1,455 miners, and 5292 answered 404. Registrations are coming back in id order: 5200 at 07:30.
  - 08:00 UTC: the replay halted at registration 5201 (07:30:39); nothing from 5202 to 5300 is back. So 5292 is
    **pending, not dropped**. **Do not re-sign** until the replay passes 5292 or the organisers answer. A new
    signature means a new id, and scoring starts again.
  - The `uptime` workflow may open an alarm issue on the 404; that alarm is accurate.
  - If it stays stuck, ask the organisers. Draft for the owner to send:
    > Hi team, since about 06:31 UTC on Nov 17 the devnode catalog has been rebuilding: scores show epoch 0, and
    > registrations came back in id order until 5201 (07:30 UTC), then stopped. Our registration 5292 (`livecert`)
    > is intact on Sepolia: tx 0x8ebe1d47ca227789fd38f3509845dfa33a7a50dbc489afddfb0241140a46f5db, YAML hash
    > 3cf18081…, no later deregistration. But `GET /api/miners/5292` answers "miner registration not found". Will the
    > rebuild resume past 5201, or should registrations above it be re-sent?
  - Look it up by registration id. Catalog id 4433 now returns another miner.
- **Branch is unmerged:** production runs `PR/livecert-miner-track1-cec6be`; `main` still says `04c0e9f`. Merge the
  PR before any deploy from `main`, or that deploy reverts the Federal Register path and the request logging.

## 2026-11-16 ~19:00 UTC (Nov 17 00:30 IST): `14b6d98` LIVE; registration **5292** active (owner signed `04c0e9f`)

- **Branch:** `PR/livecert-miner-track1-cec6be` (worktree `.claude/worktrees/livecert-miner-track1-cec6be`), cut from
  `origin/main` `70374df`. `claude/n1-v2-ids` is fully merged (0 ahead, 67 behind `main`), so current work is `main`.
  `tg-deploy/m-nonsdn` still holds another session's uncommitted edits; untouched.
- **Registration 5292:** active, YAML `04c0e9f`, SHA-256 `3cf18081…5fb13d`, 44 intents, registered 18:16:14 UTC; 5232
  superseded. The `REGISTRATION_ID` repo variable is 5292; the release skill, mission-matrix and README are updated.
- **Production:** `14b6d98`, `miner-7bx1moszs` (`dpl_4HCYvTJQV28vZ5pdEpq1CtovBYDh`). **Rollback:** `miner-hns8y07yw`
  (`04c0e9f`). Record: `track1-miner/docs/evidence/release-2026-11-16-federal-register/`. Unit 1045/1045. Preflight 6/7;
  the failing live test (MET Norway closed the socket) passes when re-run alone. Deploy tree
  `C:/Users/hyada/tg-deploy/med32fa0` at `14b6d98`.
- **Changed:**
  - REGULATORY_FILING counts US Federal Register documents for an entity that is not an SEC registrant.
  - The request log carries the values of `__path`, `chain`, `record_type`, `type`, `period`, `form`,
    `target_language` and `window_hours`.
- **Diagnosis:** `track1-miner/docs/evidence/track1-diagnosis-2026-11-17/README.md`.
  - Before-table from the saved leaderboards, and the decisions.
  - Availability 99.76% over 45 sweeps; capacity 10 callers, 0 errors.
  - Of the brief's "14 unscored", only three lack a LiveCert score: DNS (dormant since 2019), WEB_SEARCH (dormant
    since 2097) and REGULATORY_FILING.
- **Owner steps:**
  - Append this line to `C:\Users\hyada\tg-deploy\scores\record.cmd`. The permission check refused it to Claude
    twice; the script is already copied there.
    `"C:\Program Files\nodejs\node.exe" --no-deprecation "C:\Users\hyada\tg-deploy\scores\archive-requests.mjs" "C:\Users\hyada\tg-deploy\scores\requests.jsonl" >> "C:\Users\hyada\tg-deploy\scores\record.log" 2>&1`
  - Post OUTREACH.md §5.
  - Confirm the bounties repo is starred.
- **Next:** TASKS.md "Handoff 2026-11-16 ~19:00 UTC". No YAML change is pending; removals are batched for one later
  signature.

## 2026-11-16 ~14:45 UTC (20:15 IST): CURRENT — `04c0e9f` LIVE; YAML READY FOR THE OWNER TO SIGN

- **To sign (owner):** `https://raw.githubusercontent.com/Harshyadav442277/miner/04c0e9f2aef9b205e78bcd18b783e87c21b86635/track1-miner/miner.yaml`,
  SHA-256 `0x3cf18081c9fdc90be769ebe46851184d82fa6352ea4b26e3942dcb2f2f5fb13d`, 96,353 bytes, 44 intents. Validate on
  Anjoman first. Sheet: `track1-miner/docs/evidence/yaml-for-signature-2026-11-16/README.md`. Registration 5232 stays
  active until then.
- **Production:** `04c0e9f`, `miner-hns8y07yw` (`dpl_FFxTiE7cY9ZBr2f69kBubPSdxeco`). **Rollback:** `miner-5vd4jwu4e`
  (`a118570`). Gas: 12 chains, chain ids, no Ethereum substitution for unknown chains.
- **Epoch 2105:** CHAT 0.9962 rank 1; FACT_CHECK 0.9974; GAS 0 (cause unknown, G310); EVENT 0.0008 (sports results,
  G317); drops in SENTIMENT, CVE, TRANSLATION, TOKEN_HOLDER (G318).
- **After the signature:** look the registration up by id, set `REGISTRATION_ID` (`gh variable set`), update MEMORY and
  the release skill, watch the next epochs. The local recorder keys on the slug, so it keeps working.

## 2026-11-16 ~11:00 UTC (16:30 IST): CURRENT — `a118570` LIVE; `/security-review` served, not yet registered

- **Production:** `a118570`, `miner-5vd4jwu4e` (`dpl_9DbYac9otZFY7eA6BXPoeS6zTKzC`). **Rollback:** `miner-8s4mxzd6g`
  (`95b8c03`). Record: `track1-miner/docs/evidence/release-2026-11-16-security-review/`. Unit 1037/1037.
- `/security-review` (OSV, headers, model) live: 10/10 on labelled production probes. `miner.yaml` on `main` declares
  it (owner said "commit and deploy"); registration 5232 still points at `494b135`, so SECURITY_REVIEW needs the
  owner to validate on Anjoman and sign. That signature should also carry G305 and G308.
- Chat briefs name every item asked for and end with a mark; 17/18 on the burst probe. Sanctions unchanged (tie).
- **Next:** read CHAT, GAS, EVENT, SENTIMENT in epochs 2104+ (local recorder every 30 min); prepare the YAML for
  signature (SHA-256 of `main`'s `miner.yaml` at the merge commit) once G305/G308 are folded in.

## 2026-11-16 ~10:00 UTC (15:30 IST): CURRENT — `95b8c03` LIVE; chat budget fixed; SECURITY_REVIEW built, parked

- **Production:** `95b8c03`, `miner-8s4mxzd6g` (`dpl_86UMLg8FutFqQTebhmvjpmdXF25R`). **Rollback:** `miner-2yrp4fuh8`
  (`f3ba9f4`). Record: `track1-miner/docs/evidence/release-2026-11-16-chat-budget/`. Unit 1024/1024.
- Chat burst 11/18 → 17/18 valid (G313). SECURITY_REVIEW route parked as a patch (G314):
  `C:\Users\hyada\tg-deploy\patches\security-review-2026-11-16.patch`; needs the owner's yes to commit the YAML
  change, then a signed registration. Crypto XMR/KAS unsourced (G315). Sanctions is a tie at 0.9994 (G316).
- **Owner decisions pending:** (1) commit the SECURITY_REVIEW YAML change; (2) move sentiment word evidence out of
  `reason`; (3) Upstash store for request capture (G282).

## 2026-11-16 ~08:30 UTC (14:00 IST): CURRENT — `f3ba9f4` LIVE; FACT_CHECK 0.9871 rank 4, STORM 0.9633 rank 7

- **Production:** `f3ba9f4`, `miner-2yrp4fuh8` (`dpl_C34UEGsqutYsi7deeVKCpaAgXpdm`). **Rollback:** `miner-712vfn5wr`
  (`7182410`). Record: `track1-miner/docs/evidence/release-2026-11-16-consistency-gas/`. Unit 1020/1020.
- **Measured (epoch 2103):** FACT_CHECK 0.8432 → 0.9871 (rank 11 → 4); STORM 0.8835 → 0.9633 (12 → 7); SENTIMENT
  0.7632 (rank 14); NEWS 0.9176. GAS_PRICE 0 → cache cut to 5 s (G310), unscored yet.
- **Score capture:** Windows task "LiveCert score recorder" every 30 min (registered 08:59 UTC, first run exit 0)
  writes `C:\Users\hyada\tg-deploy\scores\` (score-history.jsonl, leaderboards\, record.log); only while the
  machine is on. Backup: `scores.yml` (six tries an hour + after uptime; gaps up to 5.6 h).
- **Next:** read GAS_PRICE, EVENT_OUTCOME, SENTIMENT in epochs 2104–2106. SENTIMENT (rank 14, median 0.957) is the
  largest gap left after CVE (G303, needs capture G282).

## 2026-11-15 ~18:05 UTC (23:35 IST): CURRENT — `7182410` LIVE; fact-check rating, paper-fraud fix, hourly scores

- Owner: "yes add it" (hourly score recorder), "keep focus on the quality of miner".
- **Production:** `7182410`, `miner-712vfn5wr` (`dpl_6njMDuDGKqj19C55AjRB6xeHJMTa`). **Rollback:** `miner-9l26rqk6f`
  (`69afe87`). Unit 1014/1014, preflight 7/7. Record: `track1-miner/docs/evidence/release-2026-11-15-fact-check-rating/`.
- `scores.yml` on `main` (PR 25): hourly at :23, history in the `score-history` artifact. Only the 17:08 dispatch had
  run by 17:59; check that scheduled runs start and keep earlier rows.
- Post-69afe87 scores for SENTIMENT/NEWS/EVENT were lost (G300). CVE gap undiagnosable without inputs (G303, G282).
- YAML: matches the registration byte for byte; EVENT_OUTCOME description is stale (G308), batch with G305.
- **Next:** read `score-history` after epochs 2100–2102 for FACT_CHECK (0.8432), SENTIMENT, NEWS, EVENT; owner:
  Upstash store for capture (G282), which would settle CVE.

## 2026-11-15 ~01:00 UTC (06:30 IST): CURRENT — `69afe87` LIVE; sentiment, event outcome and news brief changed

- Owner's brief 00:30 UTC: fix the three lowest of epoch 2093 (EVENT_OUTCOME 0.0032 rank 12/35, SENTIMENT 0.5446
  15/21, NEWS_SEARCH 0.7293 14/19); build, commit, push, PR, merge and deploy authorised. Worked in worktree
  `livecert-miner-optimization-08caa3`, branch `PR/livecert-miner-optimization-08caa3` (the brief named the
  `da4453` worktree; this one was at the same `df537c7`).
- **Production:** `69afe87`, `https://miner-9l26rqk6f-wukong4.vercel.app` (`dpl_4pisNXVPK9JYMbhv7fzUx8VSkkjY`).
  **Rollback target:** `miner-l8m0zwpq7` (`b18ca59`). Record: `track1-miner/docs/evidence/release-2026-11-15-sentiment-event-news/`.
  Unit 1004/1004, tsc clean, preflight **7/7** (run 00:44–00:51 UTC, `preflight.txt`).
- **Changed:** SENTIMENT label chosen by the model (JSON, 2.5 s, word list as fallback and evidence). EVENT_OUTCOME
  with no market: "Did X win Y?" from Wikidata's recorded winner, else dated model recall (`verdict: recalled`,
  confidence 0.6, never a future year); mapper sets `resolved_yes` for both. NEWS_SEARCH `brief` written by the
  model from the top three headlines. Security-review fixes in `be493af` (cache key vs question length, bounded regex).
- Registration 5232 unchanged; no YAML change. Deploy tree `C:/Users/hyada/tg-deploy/md8b68aa` detached at `69afe87`.
- **Next:**
  1. After 2–3 epochs: EVENT_OUTCOME, SENTIMENT, NEWS_SEARCH against 0.0032 / 0.5446 / 0.7293 (G300); CHAT_COMPLETION
     against 0.9303 (watch only).
  2. If latency counts, `/sentiment` now takes ~0.6–1.1 s (G301).
  3. Not acted on: CVE plateau (G303), CRYPTO_PRICE CoinGecko fallback (G304), YAML input mappings for the owner's
     next signature (G305). F1 seasons lack P1346 on Wikidata (G302).
  4. Owner: NVD key, Upstash store for capture (G282), close PR 9, growth posts.

## 2026-11-14 ~17:30 UTC (23:00 IST): CURRENT — `b18ca59` LIVE, preflight 7/7; registration 5232 scored

- Owner 17:05 UTC: gave an OpenAlex key, NVD key pending, "take decision on your own".
- **Production:** `b18ca59`, `https://miner-l8m0zwpq7-wukong4.vercel.app` (`dpl_H4cUuqxXrwbyfazpjjCLod5DbpQz`).
  **Rollback target:** `miner-59jvnyk6w` (`697a41c`). Record:
  `track1-miner/docs/evidence/release-2026-11-14-cve-mirror-crypto/`. Unit 989/989, preflight **7/7**.
- `OPENALEX_API_KEY` is set in Vercel Production; `/papers` returns OpenAlex results again. No `NVD_API_KEY` yet:
  when it arrives, add it to Production and redeploy (the mirror is then skipped).
- **G287 closed:** epoch 2091 scored 5232 on 19 intents; CURRENCY, MACRO and CORPORATE_REGISTRY 1.0000, rank 1.
- **Fixed from epoch 2091's low scores:** CVE (0.7017, rank 6): NVD record read from the fkie-cad mirror, NVD's
  own score preferred. CRYPTO_PRICE (0.7650, rank 17): dead Bitstamp markets no longer quoted (APT was 87% off).
- **Still low in epoch 2091, not touched:** EVENT_OUTCOME 0.0043 (rank 10/34), NEWS_SEARCH 0.7590 (11/19),
  SENTIMENT 0.7705 (15/21), STORM_ALERT 0.9020 (11/19), WEATHER 0.3083 (rank 1, whole field low).
- Deploy tree: `C:/Users/hyada/tg-deploy/md8b68aa` (detached at `b18ca59`). Vercel MCP runtime logs answer 403;
  `vercel logs` shows parameter names only, never values, so the node's inputs stay unseen without capture (G282).
- **Next:**
  1. After the next epochs: CVE_LOOKUP_CVSS and CRYPTO_PRICE_USD scores for 5232; CHAT_COMPLETION, SANCTIONS and
     WEB_SEARCH when they are first scored (rank script: read `/api/miners`, slug livecert, latest epoch).
  2. EVENT_OUTCOME at 0.0043 is the worst scored intent: find the mapped field and what the node sends.
  3. NEWS_SEARCH and SENTIMENT (both ~0.76); then RESEARCH_QUERY (G293), registry short names (G292).
  4. Owner: NVD key, Upstash store for capture (G282), close PR 9, growth posts.

## 2026-11-14 ~15:30 UTC (21:00 IST): CURRENT — `697a41c` LIVE; registration 5232; `main` is current

- Owner: "i have uploaded the yaml file. deploy everything, merge the PRs … focus on top 2 intents in phase 1".
- **Production:** `697a41c`, `https://miner-59jvnyk6w-wukong4.vercel.app` (`dpl_HKnZTdQNemjFBLNLK3mUbHyTTHdk`).
  **Rollback target:** `miner-mo41ngruw` (`a59ead4`). Record: `track1-miner/docs/evidence/release-2026-11-14-unscored-fix-chat/`.
  Unit 987/987. Preflight 5/7: the two failures are NVD and OpenAlex not answering Vercel (G296), not this release.
- **Registration 5232** `active` (YAML `494b135`, signed 14:44 UTC); repo variable `REGISTRATION_ID` = 5232;
  mission-matrix, the release skill and the README updated.
- **Code:** PR 20 merged this branch into `main` (`c931b27`); later commits go in by a second PR (see git log).
  Deploy trees: `C:/Users/hyada/tg-deploy/ma59ead4` and `md8b68aa` (now at `697a41c`). `tg-deploy/m-nonsdn` holds
  another session's uncommitted edits and is behind `main`.
- **Sanctions index:** workflow on `main`, dispatched and green; 5 lists, 33,767 parties, EU read (G283, G284 closed).
- **Phase 1 (top two intents) shipped:** CHAT_COMPLETION: date in the prompt, brief always a whole sentence,
  current office holders and releases read from Wikidata and endoflife.date. SANCTIONS: all five lists again,
  `name` required and mapped in the YAML. Replay of the 180 real inputs: 109 match, 68 no_match, 3 possible.
- **Next:**
  1. Read `/api/miners` after 2–3 epochs: is 5232 scored on CVE, CURRENCY, CRYPTO_PRICE, CORPORATE_REGISTRY,
     SANCTIONS (G287)? Compare CHAT_COMPLETION with 0.9718, rank 5 (epoch 2087, registration 5152).
  2. Owner: a free `NVD_API_KEY` and an OpenAlex key or mailto in Vercel (G296); the Upstash store for request
     capture (G282); close PR 9 (obsolete); growth posts.
  3. Phase 2 candidates: RESEARCH_QUERY (G293), company-registry short names (G292), token holders off Ethereum
     (G291), LIQUIDITY_DEPTH and WASH_TRADING (G294).

## 2026-11-14 ~10:05 UTC (15:35 IST): repo audit on `PR/miner-provider-optimization-da4453` — two fixes NOT deployed

- Branch = `claude/n1-v2-ids` (`05de417`) merged in, plus: the CVE fallback fix (`40f4795`, G288), the cleanup
  (`e94bd1d`: 222 uncited evidence files deleted, `docs/openapi.json` regenerated to 42 paths, counts corrected in
  README, ARCHITECTURE, INTEGRATE, OUTREACH) and the WEB_SEARCH brief fix (G289). Unit 982/982 in a replica at
  `C:/Users/hyada/tg-deploy/replica-da4453` (node_modules is a junction to m-nonsdn's; remove with `rmdir`, never `rm -rf`).
- Another session has uncommitted edits in `tg-deploy/m-nonsdn` (MEMORY.md, track1 README, mission-matrix, release
  skill: 5135 → 5152). Its 2026-11-14 09:20 UTC block is the current production and rank record; not duplicated here.
- Production unchanged: `b455022`. Nothing deployed, signed or pushed to `main`.
- Findings: G287 (13 intents unscored, cause unknown), G288, G289, G290. Sanctions index stale since Nov 12.
- Not touched: `track1-miner/README.md` (still says 36/42 intents and V1 names; the other session is editing it),
  MEMORY/GAPS/TASKS history, `track2/`.
- **YAML to sign (prepared 2026-11-14 ~11:30 UTC, owner said "Yes, prepare YAML"):** `miner.yaml` at `494b135`,
  SHA-256 `0x661625a3ae214362b612ded6d93684dbf1ab7a605a23b0851a2b046702a8b045`, 95,023 bytes, 43 intents.
  URL `https://raw.githubusercontent.com/Harshyadav442277/miner/494b135ecd6330fde759ba5f7577b6f74112f707/track1-miner/miner.yaml`.
  It marks the spec's params `required` on ten endpoints, adds `intent_mapping.<ID>.input` for 14 intents (syntax
  read from anjoman.ai/docs/miners/yaml-config that day) and a `jurisdiction` param on `/company-registry`.
  manifest-diff flags that added param only. Why: G287. **Deploy this branch first, then validate on Anjoman, then
  sign**; the signature issues a new registration id (update the repo variable, mission-matrix, release skill, README).
  Unverified until an epoch after signing scores CVE, CURRENCY, CRYPTO_PRICE and CORPORATE_REGISTRY again.
- Also on the branch since the block above: web search answers coin-price and who-won questions from their own
  routes (`d8d3210`); code review and contract audit refuse a request with no code (`552de49`). Unit 982/982.
- Next: owner's yes to deploy this branch; merge `sanctions-index.yml` to `main` and dispatch it; set `NVD_API_KEY`.

## 2026-11-09 ~00:40 UTC (06:10 IST): CURRENT — HANDOFF. `b455022` LIVE; registration 5135; next session starts here

**Where things are**
- **Production:** `b455022`, `https://miner-o6dy8wc6k-wukong4.vercel.app` (`dpl_CdAHxAMJdsQteSiaSmtkC5zhFnpR`),
  aliased to miner-wine.vercel.app. **Rollback target:** `miner-ic5zvq5es` (`eb09b0a`).
  Record: `track1-miner/docs/evidence/release-2026-11-09-index-mapping-capture/`.
- **Code:** branch `claude/n1-v2-ids`, pushed. Working tree outside OneDrive: `C:/Users/hyada/tg-deploy/m-nonsdn`
  (has `node_modules` and `.vercel`; deploy from `track1-miner/miner`). The main checkout's
  `codex/rank1-14-intents` is behind this branch, and Codex has uncommitted Track 2 edits there: don't touch them.
  - Old worktrees `tg-deploy/fixC`, `fixD`, `fixE` and `fixF` are merged and can be removed with
    `git worktree remove` (check first that they hold no unique work).
- **Registration:** **5135** is active (42 intents, YAML at `8b6e4d3`, signed 2026-11-07 19:52 UTC); catalog id 4433.
  The repo variable `REGISTRATION_ID` is 5135. Check: `node track1-miner/tools/watch.mjs --registration-id 5135
  --base-url https://miner-wine.vercel.app --once`.
- **Ranks, epoch 2044 (19:18 UTC Nov 8):** top 3 in 14 of 26 scored.
  - 1st: CODE_REVIEW (1.0), CVE, TOKEN_HOLDER, ONCHAIN_TX, CORPORATE_REGISTRY, CURRENCY.
  - 3rd: RESEARCH_QUERY.
  - SANCTIONS fell from 3rd to 4th (0.9978), cause unknown. TEXT_GENERATION fell 0.98 → 0.85.
  - Read new epochs with the snippet in `track1-miner/docs/evidence/release-2026-11-08-agent-fixes/`
    (`ranks-epoch2044.txt` shows the shape).

**What this stretch shipped (Nov 7–9)**
- Schema fields per intent (`src/intent-fields.ts`), with the `brief` regression fixed.
- Fixes across 22 intents, from four agents. CHAT_COMPLETION, CODE_REVIEW and TEXT_GENERATION run on Groq
  (`src/genai.ts`, `src/llm.ts`). The new `/contract-audit` route serves SMART_CONTRACT_AUDIT.
- Web search's direct answer.
- **Prebuilt sanctions index** (OFAC SDN, non-SDN, UN and UK; 0.75–1.9 s on production).
- **intent_mapping** (38 intents, 128 fields).
- **Request capture** (`src/capture.ts`, `tools/capture-pull.mjs`).
- Tools: `tools/schema-sweep.mjs` checks every answer against the node's schemas.

**Owner actions pending (none done yet)**
1. **Sign the 43-intent YAML** on anjoman.ai/dashboard/earn (registration 5135):
   - URL `https://raw.githubusercontent.com/Harshyadav442277/miner/15ecfd65dc247f265ef6a62a6784c733ee3f4290/track1-miner/miner.yaml`
   - SHA-256 `0xb721afd72f117de397a04f991ebf13b7fbb694d9f1d2c7507d390d9c1d3b7b5a`
   - Fee address `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`; min price 10000.
   - Adds intent_mapping, SMART_CONTRACT_AUDIT and macro `year`. manifest-diff flags /macro CHANGED for that
     optional param only.
   - The signature issues a NEW registration id: find it by scanning `/api/miners/<id>` for the wallet, then set
     the repo variable, `tools/mission-matrix.mjs`, the release skill and the README.
2. **Merge `.github/workflows/sanctions-index.yml` into `main`** (it is on `claude/n1-v2-ids`) and dispatch it once.
   Otherwise the index goes stale after **2026-11-12 00:03 UTC** and the miner falls back to slow direct
   downloads. Fallback before that: rebuild by hand (`node track1-miner/tools/build-sanctions-index.mjs --out
   <dir>` then push the two files to orphan branch `sanctions-data`; see the release record).
3. **Add a free Upstash Redis store** in Vercel (project `miner` → Storage), so request capture starts (G282).
4. Optional keys for more capacity and quality: a Gemini or OpenRouter key (second model provider), a Brave Search
   key (grounded web search), a Blockscout PRO key (token holders on Base, Arbitrum and Polygon).
5. Growth (20 points): 3+ public progress posts on separate dates; a Discord post to app teams. Submission
   (video, summary) is due Dec 1 23:59 UTC.

**Open work, in order (owner's focus: SANCTIONS, CHAT_COMPLETION, WEB_SEARCH, CODE_REVIEW)**
1. Read the epochs after 00:19 UTC Nov 9. Did sanctions recover with the index (3rd/4th)? Did TEXT_GENERATION's
   drop come from the new brief or title?
2. WEB_SEARCH: the `currentfacts.ts` Wikidata branch returns `sources: []`. Make `currentFact()` return the
   holder's Wikidata URL. Also consider a grounded search index (option 5 of the plan).
3. CHAT and CODE_REVIEW: a multi-provider model router (Groq + Cloudflare Workers AI + Gemini) and a
   second-pass check; static checks plus the model for code review and contract audit.
4. SANCTIONS: EU list (G283); use request capture once on to see which names are scored.
5. Gaps from the intent_mapping audit: storm `peak_gust_kmh` null, weather `precipitation_probability_pct` null,
   event outcome (2022 World Cup: no winner).
6. Flaky gates: the ONCHAIN_METRIC check fails when Blockscout doesn't answer; the paperfraud live test "a generic
   title is not matched" fails on Crossref data. Make both tolerant of upstream outages.

## 2026-11-09 ~00:15 UTC (05:45 IST): CURRENT — three big moves merged on `claude/n1-v2-ids` (`4e385e1`), NOT deployed

- **Merged and pushed:**
  - **Request capture:** `src/capture.ts` and `tools/capture-pull.mjs`. Off until the owner adds an Upstash store
    in Vercel (G282).
  - **`intent_mapping`:** 38 intents, 128 fields, every scored field mapped. Syntax from anjoman.ai/docs
    yaml-config.
  - **Prebuilt sanctions index:** OFAC SDN, non-SDN, UN and UK in one file; EU returned HTTP 500 (G283).
  - **Fixes:** research counts its trials as sources; web search cites the Wikipedia article it quotes.
  - Unit 976/976.
- **Sanctions index data:** branch `sanctions-data` (`c1311f9`) published by hand. Built 2026-11-09 00:03 UTC,
  27,476 parties, SHA-256 `ec5d7412…`.
  - The loader ignores an index older than 72 h, so it falls back to direct reads after Nov 12 00:03 UTC unless
    it is rebuilt.
  - The daily rebuild needs `.github/workflows/sanctions-index.yml` merged to `main` (owner's yes), then one
    dispatch (G284).
- **Preview `miner-qezkjslds`:** answered from the index. Hezbollah matched (score 1) through the UK alias;
  cold 2.2 s, warm about 1.1 s, both including `vercel curl` overhead from India.
- **Production:** still `eb09b0a` (`miner-ic5zvq5es`).
- **To sign after deploy:** YAML at `4e385e1`, SHA-256
  `0xb721afd72f117de397a04f991ebf13b7fbb694d9f1d2c7507d390d9c1d3b7b5a`, 43 intents. It adds intent_mapping,
  SMART_CONTRACT_AUDIT and macro's `year`. manifest-diff flags `/macro` CHANGED for that added param only.

## 2026-11-08 ~19:20 UTC (Nov 9 00:50 IST): CURRENT — `a2f911e` LIVE (4-agent fixes, 22 intents); 43-intent YAML to sign

- **Production:** `a2f911e`, `miner-4hs6cb5jh` (`dpl_ABhFVKcsHHwJiqKgG38CJBSnVpRM`).
  - **Rollback target:** `miner-7bo22h7r8` (`1f43311`).
  - Record: `track1-miner/docs/evidence/release-2026-11-08-agent-fixes/`.
  - The `brief` regression from `1f43311` is fixed.
  - New `/contract-audit` route.
  - Unit 959/959; gates 7/7 after a live gas-test fix (`61f1046`).
- **Owner to sign:** YAML at `61f1046`, SHA-256 `0x700aca973e3afec3bd33e51684e9cbb927fdc502e260be8bf4b3932a778e7f66`,
  43 intents (adds SMART_CONTRACT_AUDIT_GENERAL; `/macro` gains `year`). Registration 5135 is active until then.
- **Open:**
  - Web search's direct answer did not fire live for "Who won the 2026 FIFA World Cup?".
  - Token holders on Base/Arbitrum/Polygon need a Blockscout PRO key (owner).
  - UK sanctions list not added.
- Worktrees `tg-deploy/fixC` and `fixD` (branches `claude/fix-drops`, `claude/fix-nearmiss`) are merged and can be removed.

## 2026-11-07 ~21:45 UTC (Nov 8 03:15 IST): CURRENT — schema fields LIVE (`1f43311`); registration **5135** (42 intents)

- **Production:** `1f43311`, `miner-7bo22h7r8` (`dpl_9WvUyyb7o9uBqYpsXLSDz5dXjzTU`).
  - Every answer carries its intent's format-version-3 fields (`src/intent-fields.ts`).
  - The schema's enum words replace ours where they conflict; ours are kept in `verdict_detail`.
  - Schema sweep: 25 ok / 6 probe artefacts, against 11 / 22 before.
  - **Rollback target:** `miner-l6uql9dui` (`8b6e4d3`).
  - Record: `track1-miner/docs/evidence/release-2026-11-07-schema-fields/`.
- **Registration 5135 is active** (signed 19:52 UTC, YAML at `8b6e4d3`, 42 intents). The repository variable, the
  tools and the release skill follow it.
- **Ranks, epoch 2036:** top 3 in 11 of 32. Within 0.003 of third: URL scan, SSL, sanctions, text classification
  and onchain metric.
- **Next:**
  - Read the epochs after 21:40 UTC for the effect of the schema fields.
  - Then the near-misses: sanctions (EU/UK lists, P1c) and text classification.
  - Run `tools/schema-sweep.mjs` after any schema change on the node.

## 2026-11-07 ~19:20 UTC (Nov 8 00:50 IST): CURRENT — chat, code review and writing LIVE (`8b6e4d3`); 42-intent YAML ready to sign

- **Production:** `8b6e4d3`, `miner-l6uql9dui` (`dpl_HZoxe8XB3iU2m1tWkXu1wGNejeHZ`).
  - `/chat`, `/code-review` and `/generate` answer through Groq: Canberra right, both planted bugs found, a
    60-word target met.
  - **Rollback target:** `miner-56hisxeau` (`fa4f954`).
  - Record: `track1-miner/docs/evidence/release-2026-11-07-genai/`.
- **Sign next:** YAML at `8b6e4d3`, SHA-256 `0xc6515778bf0c27843f9d223d0b195ec9efa88a0f9f4985fe29bdc9230cdbaaca`,
  42 intents. The manifest diff against 5123 passes. Registration 5123 is active (39 intents).
- **Field:** CODE_REVIEW has only 2 of 12 miners scoring above 0, so rank 3 is open. CHAT's top 4 are RSS-feed
  wrappers. TEXT_GENERATION's top five are 0.999–0.993.
- **G281:** Routescan intermittently omits `transactionsCount`; one live test flaked.
- `GROQ_API_KEY` is Production-only and Sensitive: model routes cannot be tested on a preview unless the owner
  adds it to Preview.

## 2026-11-07 ~18:40 UTC (Nov 8 00:10 IST): CURRENT — `fa4f954` LIVE; registration is now **5123**

- **Production:** `fa4f954`, `miner-56hisxeau` (`dpl_HqN2jr1ddD8frUMXi1esvTtxpA1e`).
  - Every source answers (licence gate off; owner: testnet).
  - IP geolocation, headlines, news search and stock price are real again.
  - Gates 7/7 after updating one stale check; 38/38 routes up, 0 refused.
  - **Rollback target:** `miner-eh2uav8mu` (`3f33508`).
  - Record: `track1-miner/docs/evidence/release-2026-11-07-sources-on/`.
- **Registration 5123 is active.** The owner signed the 39-intent YAML at `fc041f4` (04:24 UTC); 4829 and 5122
  are superseded. The repository variable `REGISTRATION_ID` is now 5123.
  - Watch it with `watch.mjs --registration-id 5123 …`.
  - The catalog id is still 4433.
- **Next (owner's plan, "go in all of them"):** Phase 1, new routes for CHAT_COMPLETION, CODE_REVIEW and
  TEXT_GENERATION on Groq, then a second `updateMiner` for 42 intents. Phase 2 closes the gaps in sanctions, fact
  check, research, web search and filings.

## 2026-11-07 ~04:00 UTC (09:30 IST): CURRENT — barred sources ON again; N1 YAML is 39 intents (`fc041f4`)

- Owner: "I'm not doing their commercial use. It's on testnet currency. I'm just participating in a hackathon."
  RULES_SEASON2 has no data-licence rule, so `permitted()` (src/sources.ts) now calls barred sources unless
  `LICENCE_GATE=on`. The ledger stays as a record of each source's terms.
- IP_GEOLOCATION, NEWS_HEADLINES, NEWS_SEARCH and STOCK_PRICE_US_EQUITY are back in `miner.yaml`.
  - Unit 914/914; manifest diff PASS (36 -> 39); all 39 canonical.
  - Local gate 37/39. Failures are environment only: translation needs production's Groq key, and ip-api is
    unreachable from this machine (HTTP 000).
- **NOT DEPLOYED.** Production is still `3f33508`, which refuses those four. Deploy `fc041f4` before signing, so
  the four answer when the update lands.
- **Hash to sign is now `0xfc08c9ac530e9c7425ae7ca289e17fd46b2350be86567f67404e4e9b2219580c`** (YAML at
  `fc041f4`). The `0xdb6e…` hash recorded earlier is stale.

## 2026-11-07 ~03:30 UTC (09:00 IST): CURRENT — `3f33508` LIVE (threshold regex fix); PR #18 open

- Owner: "Yes, deploy it" for `3f33508`, the fix for the push security review's ReDoS finding in `src/threshold.ts`.
- **Production:** `3f33508`, `https://miner-eh2uav8mu-wukong4.vercel.app` (`dpl_5tARoxt3vuzowzZ98skdve4kBtJF`).
  **Rollback target:** `miner-beo9nyatq` (`bee3f6a`). Record: `track1-miner/docs/evidence/release-2026-11-07-threshold-redos/`.
  - Unit 914/914.
  - Preflight 6/7 on the first run; intent answers re-run alone 39/39.
  - 4829 `active`; 34/34 routes up.
- **Uptime alarm (issue #19, G280):** a false alarm. `main`'s stale YAML probes `/keywords` and `/vuln-triage`, which
  were deleted on purpose. It clears when PR #18 merges `codex/rank1-14-intents` into `main`. That merge needs the
  owner's yes (default branch). Close #19 after it.
- **N1 YAML:** V2 ids, verified 03:00 UTC.
  - The SHA-256 is `0xdb6e08…649a` both from git and from raw GitHub.
  - All 35 ids are canonical on devnode.
  - The keyless validator is gone (G212), so the owner validates on Anjoman and signs.
## 2026-11-07 IST: URL Scan generic baseline measured

- The `URL_SCAN` hybrid family is on-chain. `URL_SCAN_VERDICT` has eight ranked miners at epoch 2030 and
  resolves to `GENERIC` 900005. The exact generic delta got 8/16 controlled pairs in the kit runtime,
  including 3/8 verdict flips and 5/8 wrong-URL pairs. No challenger measured or signed. Evidence is in
  `track2/adapter/url_scan/`.
- All 144 translation rows now read `eligible` under the LiveCert wallet.

## 2026-11-07 ~02:50 UTC (08:20 IST): CURRENT — N1 YAML on V2 ids (`5bef2be`); ready for the owner to validate

- Owner: "Yes, rename to V2". `miner.yaml` lists the node's canonical V2 ids (G270 fixed). Unit 914/914, manifest
  diff PASS, intent answers 39/39 on production. Production unchanged (`bee3f6a`).
- To sign: the pushed YAML at `5bef2be` or later, SHA-256 `0xdb6e08f4b2acb262654779a5dfad2cd8dd78d05509300a3aaa3d9715aa90649a`.
- Next: owner decides CRYPTO_PRICE (G275), validates on anjoman.ai/dashboard/earn, signs `updateMiner`; then delete
  the retired routes and empty `RETIRED` / `RETIRED_INTENTS`. Claude: EVENT_OUTCOME after three epochs (G278).

## 2026-11-06 ~22:58 UTC (Nov 7 04:28 IST): CURRENT — quality release `bee3f6a` LIVE; N1 YAML cut, not signed

- Owner: "take all the required actions, required for winning. focus on improving quality of present intents".
- **Production:** `bee3f6a`, `miner-beo9nyatq` (`dpl_BzBqpAUR5YJTNwdp78YFaGekwGe2`). **Rollback:** `miner-p429gtksx`
  (`192aecc`). Record: `track1-miner/docs/evidence/release-2026-11-06-quality-fixes/`. Unit 914/914; gates 6/7, the
  seventh 38/39 with the NY Fed upstream down (G279); 4829 `active`.
- Also live: Codex's `/onchain-metric` (`6aebe0f`), served but not registered.
- **N1 YAML** (`miner.yaml` at `bee3f6a`): 35 intents — cuts STOCK_PRICE, NEWS_HEADLINES, NEWS_SEARCH, IP_GEOLOCATION;
  adds DNS_RECORD_LOOKUP, TOKEN_TOTAL_SUPPLY_VERIFY, ONCHAIN_METRIC_VERIFY. Manifest diff PASS. Codex's G270 (V2
  `_GENERAL` ids) still blocks validation. Not signed.
- GAPS numbering: Codex took G269–G274 the same hour; this branch's became G275–G277. Check the top before numbering.
- Next: read EVENT_OUTCOME after three epochs (G278); rename the YAML to V2 ids (G270); owner decides CRYPTO_PRICE's
  licence (G275), then validates on anjoman.ai/dashboard/earn and signs.

## 2026-11-06 ~22:15 UTC (Nov 7 03:45 IST): CURRENT — N1 intent picks; `/onchain-metric` built, NOT deployed

- Owner: "keep improving. and let's add more intents", then "pick intents which would help us in winning".
- **Branch `claude/n1-new-intents`** (deploy tree `C:/Users/hyada/tg-deploy/m-nonsdn`), on `cee126e`:
  - `6aebe0f`: adds ONCHAIN_METRIC_VERIFY at `/onchain-metric`; deletes the `/keywords` and `/vuln-triage` routes.
  - The docs commit after it.
  - Unit 906/906. Live local reads match Blockscout. Not pushed, not deployed.
- **Production unchanged:** `192aecc` (`miner-p429gtksx`), 4829 `active` 21:38 UTC.
- **Picks:**
  - Added: ONCHAIN_METRIC, plus TOKEN_TOTAL_SUPPLY and DNS (both already live).
  - Dropped: KEYWORD_EXTRACTION and VULNERABILITY_TRIAGE.
  - Reasons per intent: `track1-miner/docs/evidence/n1-new-intents-2026-11-07/`.
  - **G269:** ONCHAIN_METRIC's top 3 answer the block-gas question wrongly, so its ranks may not follow correctness.
- **Ranks, epoch 2028:**
  - Research is at rank 3.
  - Fact check is 0.003 from rank 3.
  - Academic search fell to 0.636 (G274).
  - Sanctions has not been re-scored since epoch 2026.
- **Next:**
  - Owner's yes to deploy `6aebe0f`.
  - G270: rename to V2 intent ids.
  - Validate on Anjoman; the owner signs.
  - Then G274, P6 and ASSET_RESERVE.

## 2026-11-06 ~22:15 UTC (Nov 7 03:45 IST): CURRENT — N1 cut prepared on `claude/hackathon-quality-focus-2e9d6e`; not signed

- Trigger: Ahmed's Discord DM to the owner (2026-11-06): quality over quantity; intents a miner cannot deliver
  "won't qualify for those claims". Rules re-read live ~22:00 UTC: unchanged since the 2026-11-05 read.
- Branch fast-forwarded to local `codex/rank1-14-intents` (`cee126e`, 4 commits ahead of origin), then:
  `miner.yaml` drops STOCK_PRICE, NEWS_HEADLINES, NEWS_SEARCH, IP_GEOLOCATION; FINANCIAL_DATA and WEB_SEARCH
  descriptions now match the code. Manifest diff PASS, unit 907/907. Evidence: `track1-miner/docs/evidence/n1-cut-2026-11-06/`.
- Production unchanged (`192aecc`). Nothing deployed or signed.
- Next (Claude): sourced audit of the 4 added intents (G277). Owner: CRYPTO_PRICE licence (G275), then sandbox
  the YAML and sign `updateMiner`. After the signature, delete the retired routes' code.

## 2026-11-06 ~16:50 UTC (22:20 IST): CURRENT — OFAC non-SDN list LIVE as `192aecc`; intent push P1–P11

- Owner: "divide the task in parts and improve in these intents. priortize from the highest one. leave chat
  completion" (Anjoman's 11 highest-earning intents), then "Yes, deploy it". Board: TASKS.md "Intent push".
- **Production:** `192aecc`, `https://miner-p429gtksx-wukong4.vercel.app` (`dpl_6JPiQ4ErcYzrrmQMRmSg9mWd1dgJ`).
  **Rollback target:** `miner-qbdf1756n` (`7301474`). Record: `track1-miner/docs/evidence/release-2026-11-06-ofac-nonsdn/`.
  Unit 907/907; preview 6 routes; production ABU TEIR (ref 9640) `match` (was `no_match`, G268); 4829 `active`.
  Preflight 6/7 first run; the sanctions gate expected exactly two lists. Gate updated to require all three and
  the ABU TEIR match; re-run alone 40/40.
- **G265:** sanctions ranks 2–3 (`san-os-*`) return constant OpenSanctions metadata and outrank our screen. The
  draft for Ahmed is in GAPS G265; the owner sends it.
- Session branch `claude/task-breakdown-prioritize-e2b048` holds the same work on the old `main` base
  (`76823a5`, `9b63f23`, G254–G257 numbering); superseded by this line. Not pushed.
- Next: read sanctions epochs after 16:48 UTC; P1c EU/UK name index; side-by-side captures for P6, P3, P11.

## 2026-11-06 ~16:25 UTC (21:55 IST): every intent's scored field LIVE as `7301474`

- Owner: "dont worry about outreach. and about other things, take required actions" (2026-11-05), then "Try
  again" (2026-11-06). Outreach is off the list for Claude.
- **Production:** `7301474`, `https://miner-qbdf1756n-wukong4.vercel.app` (`dpl_GpEmJonx142NQZfeGTHNeVcNqGyt`),
  aliased ~16:09 UTC. **Rollback target:** `miner-mzapr28vo` (`e501a57`). Record:
  `track1-miner/docs/evidence/release-2026-11-06-scored-fields-all/`. Unit 906/906, preview 15/15, preflight
  **7/7 first run**, 4829 `active` (16:15 UTC).
- Shipped: eleven intents now name their scored field (audit: `docs/evidence/scored-fields-2026-11-05/`); a plain
  temperature question gets the current reading; `filing_count` counts every form (Apple 91 = zk-filing's 91).
- Checked: Vercel plan is **Hobby** (G249, owner decision); prize-payment terms still unpublished (G218).
- The commit-time security review failed on HTTP 429; a manual review of `7301474` found nothing. The push review
  runs on the next push.
- Next: read epochs after 16:09 UTC (TASKS); G264 crypto price unscored since epoch 2021; N1 `updateMiner` prep.

## 2026-11-05 ~21:20 UTC (Nov 6 02:50 IST): FACT_CHECK fix G262 LIVE as `e501a57`

- **Production:** `e501a57`, `https://miner-mzapr28vo-wukong4.vercel.app` (`dpl_3rEwsNuVz6tkfnjQ4p5KAUy2qQJw`),
  aliased ~21:09 UTC. Owner: "Yes, deploy it". **Rollback target:** `miner-f28bzjwiw` (`9b82d08`). Miner diff
  against it: the fact-check files only. Record: `track1-miner/docs/evidence/release-2026-11-05-factcheck/`.
- Verified: unit 903/903 in the deploy tree; preview 9/9; production 9/9 (Venus unverified, Eiffel-Berlin compound
  contradicted, Kilimanjaro 5895 m, Golden Gate 1937, Curie 1903 supported); preflight **7/7 first run**; 4829
  `active` (21:17 UTC). The branch tip's miner code equals production's (`15d2829`).
- Next: read FACT_CHECK_GENERAL after three epochs past 21:09 UTC (`tools/epoch-history.mjs`).

## 2026-11-05 ~20:35 UTC (Nov 6 02:05 IST): FACT_CHECK fix G262 committed (deployed ~21:09, block above)

- Owner: "Yes, fix G262", then "Yes, finish and commit". Built on `claude/winning-tracks-overview-3f735a` on top of
  `2065195`: new `src/factevent.ts`, changes in `factsubject.ts`, `factarticle.ts`, `factcheck.ts`, `factwords.ts`;
  tests `test/factevent.test.ts`; replay tool `tools/factcheck-replay.mjs`.
- Verified 2026-11-05 20:24–20:27 UTC against live Wikipedia (`docs/evidence/factcheck-real-claims-2026-11-05/`):
  37 real paid claims right 7 → 14, wrong 3 → 0; 31 regression claims right 19 → 17, wrong 2 → 0. Unit 903/903 and
  live fact-check tests 5/5 in `C:/Users/hyada/tg-deploy/fc-dev` (a dev tree outside OneDrive, at `9b82d08` plus
  these files).
- Production is still the block below (`9b82d08`), whose fact-check code equals `4fb477e`'s, so production still
  gives the "before" answers. Deploying the tip changes FACT_CHECK only against `9b82d08` (`git diff 9b82d08` on
  `track1-miner/miner/src` = the fact files).
- Next: owner yes/no to deploy G262 (release-miner skill; rollback `miner-f28bzjwiw`). Remaining G262 gaps are in
  GAPS.

## 2026-11-05 ~19:20 UTC (Nov 6 00:50 IST): filings fix G257/G263 LIVE as `9b82d08`

- **Production:** `9b82d08`, `https://miner-f28bzjwiw-wukong4.vercel.app` (`dpl_BmcKxGSMKRuwAcY6P22sBzhvojD6`),
  aliased ~19:10 UTC. Owner: "Yes, deploy it". **Rollback target:** `miner-mztwjxnqa` (`4fb477e`, the sanctions
  release). Miner diff against it: `filings.ts`, `mission-routes.ts` and their tests. Record:
  `track1-miner/docs/evidence/release-2026-11-05-filings-issuer/`.
- Verified: unit 887/887 in the deploy tree; preview 9/9; preflight **7/7 first run**; 4829 `active` (19:16 UTC);
  production finds Apple (13), Microsoft 8-Ks (8), `entity=Tesla&period=last 12 months` (15), and sends
  `filing_count: null` for Ozempic and for a no-period "latest 10-Q" question.
- Epochs at ~19:18 UTC: filings not scored since 2019 (0.8145); sanctions 9th 0.9859 at 2021 (first after the
  sanctions release); registry 4th 0.9962 at 2021.
- **Pushed** `codex/rank1-14-intents` `2a02d88..099e742` (36 commits) at ~19:40 UTC. Owner: "Yes, push it". Checked
  first: account `Harshyadav442277`, no tracked `.env`, no secret-like strings, no attribution lines. **PR #18**
  (branch → `main`, owner: "Yes, open a PR") opened 20:25 UTC: mergeable, clean, Auto-fix on, not merged.
- Next: read the next filings epochs with `tools/epoch-history.mjs` (G263); then Q4 FACT_CHECK (G262).

## 2026-11-05 ~18:35 UTC (Nov 6 00:05 IST): sanctions fix G258 LIVE as `4fb477e`; filings fix still pending

- **Production:** `4fb477e`, `https://miner-mztwjxnqa-wukong4.vercel.app` (`dpl_HdLrLG7mb9pdfMPFDzF2PMSavUtv`),
  aliased to `miner-wine.vercel.app` at ~18:28 UTC. Owner: "Yes, deploy now" (G258 only). **Rollback target:**
  `miner-5arlzhkv6` (`3c5e8ff`). Record: `track1-miner/docs/evidence/release-2026-11-05-sanctions-names/`.
- Verified on production: 9/9 sanctions probes as expected ("Сбербанк" match, "Tesla, Inc." no_match, "AEZA Grp",
  "suex.io", "Gr1nex" match, "Hamaz" possible, Arabic `unsupported_script`), registry and ssl-check unchanged;
  registration 4829 `active` (18:31 UTC). Preflight 5/7, then 7/7 after re-running the two OpenAlex
  gates alone (paperfraud live test, ACADEMIC_SEARCH; untouched by this release).
- **Not in this release:** `bb07266` (G257 issuer, G263 null counts), the block below. Deploying the branch tip now
  ships the filings change alone against `4fb477e`, so the filings read stays separable; it needs its own yes.
- Next: read sanctions, registry and filings after three epochs past 18:28 UTC
  (`tools/epoch-history.mjs`); then Q4 FACT_CHECK (G262).

## 2026-11-05 ~18:20 UTC (23:50 IST): G257 filings fix built, NOT deployed; filings fell at epoch 2019

- Owner: "Yes, fix G257". Built on `claude/screening-registry-intents-f6ab6b`: the filings route finds the issuer
  in a question alone, reads the intent's `entity`/`period`, reads quarter/year windows, and sends `filing_count:
  null` (not 0, not an all-history count) when the issuer is not in EDGAR or no period was read. Unit 879/879;
  local probes against live EDGAR in `track1-miner/docs/evidence/filings-issuer-2026-11-05/`. Rebased onto
  `4fb477e`, which also carries the parallel session's undeployed sanctions fix (G258): one deploy of the tip ships
  both. The filings change touches only `filings.ts` and `mission-routes.ts`, so the filings read stays separable.
- **Epoch 2019** (first after the `3c5e8ff` deploy): registry 3rd (0.9979, a routed slot), sanctions 12th (0.997,
  in range), filings 11th (0.8145, far below 0.976–0.980). Every filings miner fell that epoch; the deploy's share
  is not known (GAPS G254, G263). Production was then `3c5e8ff` (`miner-5arlzhkv6`); since ~18:28 UTC it is
  `4fb477e` (block above).
- Next: owner yes/no to deploying the G257 + G263 change (TASKS); then read two more epochs with
  `tools/epoch-history.mjs`. If filings stays low after both, consider removing `filing_count` and deciding the
  all-forms question (G263) from the numbers, not from this guess.

## 2026-11-05 ~10:05 UTC (15:35 IST): Ahmed answered; real paid traffic read; sanctions fix ready, not deployed

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
