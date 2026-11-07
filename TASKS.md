# TASKS.md — execution board

Season II (H2): Nov 1 00:00 UTC – **Dec 1 23:59 UTC** 2026, every track (`RULES_SEASON2.md`, re-read
2026-10-29). Goal: miners whose answers are correct, sourced and licensed for paid use. Done and superseded
items were cut on 2026-10-17 and 2026-10-29; they are in `git log -p -- TASKS.md`. One task = one change = one
commit.

## Intent push — by Anjoman's 30-day earnings, started 2026-11-06 (owner: "priortize from the highest one. leave chat completion")

Ranks: devnode epoch 2026, 2026-11-06 12:40 UTC, before the `7301474` release
(`track1-miner/docs/evidence/intent-ranks-2026-11-06/`). Routing pays ranks 1–3 only (70/20/10). Earnings are
Anjoman's estimate for the whole intent (owner's screenshot), not ours. None of these families has a champion
evaluator, and the sanctions scorer ranks a constant metadata file above a real screen (G265), so a correctness
fix scores on the quality rubric but may not move the devnode rank.

| Part | Intent | $/30d | Ours | Leader | Kind of work |
|---|---|---|---|---|---|
| P1 | SANCTIONS_SCREENING_MATCH | 13.35 | 8 / 17, 0.9827 | 0.9999 | code + report |
| P2 | WEB_SEARCH | 8.60 | unscored (0 of 25 scored) | — | code (G207, G250) |
| P3 | RESEARCH_QUERY | 6.12 | 6 / 20, 0.9539 | 0.9996 | side-by-side, code |
| P4 | CORPORATE_REGISTRY_LOOKUP | 3.98 | 7 / 13, 1.0000 | 1.0000 (7-way tie) | none until the tie rule is known (G266) |
| P5 | NEWS_SEARCH | 3.77 | unscored (0 of 18 scored) | — | owner licence decision (G194) |
| P6 | FACT_CHECK | 2.77 | 4 / 17, 0.9746 | 0.9999 | side-by-side, code |
| P7 | CODE_REVIEW | 2.43 | not registered | 1.0000 | new endpoint + `updateMiner` |
| P8 | TEXT_GENERATION | 1.94 | not registered | 0.9981 | new endpoint + `updateMiner` |
| P9 | ACADEMIC_SEARCH | 1.53 | 11 / 17, 0.8762 | 0.9866 | side-by-side, code |
| P10 | REGULATORY_FILING_MONITOR | 1.23 | 13 / 18, 0.8701 | 0.9996 | side-by-side, code |
| P11 | GAS_PRICE | 1.15 | 4 / 27, 0.9339 | 0.9992 | side-by-side, code |

- [x] P1a Screen OFAC's non-SDN Consolidated list (486 parties). Deployed 2026-11-06 as `192aecc`
      (`release-2026-11-06-ofac-nonsdn/`); ABU TEIR (ref 9640) now `match`, was `no_match` (G268).
- [ ] P1c EU and UK lists: too large to read per request (18.6 MB, 16.6 MB). Build a compact name index on a
      schedule and read that. The #1 miner screens UK and EU entities.
- [ ] P1d Owner sends Ahmed the G265 draft (in GAPS G265).
- [ ] Read sanctions epochs after ~16:45 UTC and record the rank change, if any.
- [ ] P2 WEB_SEARCH: fix G207 (wrong Wikipedia article) and G250 (manifest example is a news question).
- [ ] P3, P6, P9, P10, P11: capture 15 questions per intent, our answer next to the top 3, fix the gaps found.
      Gap to rank 3 at epoch 2026: P6 fact check 0.012, P3 research 0.020, P11 gas 0.059, P9 academic 0.107,
      P10 filings 0.123. Re-read after `7301474`, which changed gas and filings answers.
- [ ] P7, P8: add to the one `updateMiner` planned in N1 only if an endpoint passes an audit first. Owner signs.
      2026-11-07: not added. These would be model wrappers, and Groq bars reselling (`n1-new-intents-2026-11-07/`).
      Gap to rank 3 at epoch 2028: P3 research is at rank 3; P6 fact check 0.003; P5 news 0.023; P11 gas 0.039;
      P10 filings 0.084; P9 academic 0.338 after a fall (G274).
- [x] N1 picks (owner: "pick intents which would help us in winning"): add ONCHAIN_METRIC_VERIFY (`/onchain-metric`,
      built `6aebe0f`), TOKEN_TOTAL_SUPPLY_VERIFY and DNS_RECORD_LOOKUP (live since 2026-10-26); drop KEYWORD_EXTRACTION
      and VULNERABILITY_TRIAGE (routes deleted). Not added: FX_NOW (G273), WEATHER_FORECAST_VERIFY (G272), and the
      model wrappers. Evidence: `track1-miner/docs/evidence/n1-new-intents-2026-11-07/`.
- [x] Deploy `6aebe0f`: live in `bee3f6a` (2026-11-06). Rename the N1 YAML to V2 intent ids (G270): `5bef2be`.
- [ ] Owner: validate the N1 YAML on anjoman.ai/dashboard/earn, then sign `updateMiner` for 4829. YAML: the
      pushed `track1-miner/miner.yaml` at `5bef2be` or later, SHA-256 of the committed file
      `0xdb6e08f4b2acb262654779a5dfad2cd8dd78d05509300a3aaa3d9715aa90649a` (re-hash if the file changes). 35 intents. Decide CRYPTO_PRICE (G275) first.
- [ ] Next candidate: ASSET_RESERVE_ATTESTATION (8 builds, completes 2): read and license issuer attestation sources.
- [x] G274: academic search recovered (0.85–0.99 epochs 2030–2036); one-epoch dip.

## Winning push — started 2026-11-04 ~20:30 UTC (Nov 5 IST) (owner: "i give you permission to take action on all of these")

Ordered by rubric points. **Miner weights re-read 2026-11-05:** quality 35, reliability 15, coverage 10, consumption
10, cost/latency 5, docs 5, growth 20. Live ranks on 2026-11-05 (epoch 2017): 35 of 36 intents scored; 1 at rank 1
(STOCK_PRICE, which refuses every request), 8 in the top 3.

**Claude**
- [x] R1 Reliability: availability sweep of all 39 endpoints every 30 minutes on GitHub (`tools/availability.mjs`,
      `uptime` workflow; run history plus artifacts). Capacity: 58 req/s at 20 concurrent callers, 0 errors, on
      `/ssl-check` (`docs/evidence/capacity-2026-11-04/`). LLM routes not load-tested (quota-bound).
- [x] Q1 Quality 35: audit replay 2026-11-04, 154/154 answered; 61 re-checked: 12 pass, 23 partial, 3 fail, 15
      licence refusals. Rows 25, 27, 29, 30 fixed and deployed (`aa110f8`, preflight 7/7). Re-run weekly.
- [x] C2 Consumption: `tools/consumption.mjs` reads the network's own records. Nov 1–4: 385 paid requests from 16
      wallets, 24 ranked-routed, 341 x402 payments verified on Sepolia (`docs/evidence/consumption-2026-11-05/`).
      No wallet is tied to an H2 app yet (G259).
- [x] Q3 Sanctions, from that real traffic (G258): Cyrillic, abbreviations, domains, digits for letters, look-alike
      letters; 3 false positives removed. On the 180 real inputs, unknown 7 → 0, match 85 → 107; unit 885/885.
      `e19df9e` + `853da09`. **Deployed 2026-11-05 ~18:28 UTC** as `4fb477e` (`miner-mztwjxnqa`); record in
      `track1-miner/docs/evidence/release-2026-11-05-sanctions-names/`. Read the sanctions rank after three epochs.
- [x] Q4 FACT_CHECK (G262): fixed in code 2026-11-05. On the 37 real claims, right 7 → 14 and wrong 3 → 0; on 31
      regression claims, wrong 2 → 0 (`docs/evidence/factcheck-real-claims-2026-11-05/`). Unit 903/903.
      **Deployed 2026-11-05 ~21:09 UTC** as `e501a57` (`miner-mzapr28vo`), owner: "Yes, deploy it"; preflight 7/7.
      Read FACT_CHECK_GENERAL after three epochs.
- [ ] C1 Cost/latency 5: `tools/availability-report.mjs` builds the table from the sweeps; publish it once a
      week of sweeps exists (Nov 11). Upstream cost per request is $0 (keyless or free keys).
- [ ] Q2 Near-miss correctness (only where the reference is the true answer): weather temperature, weather
      forecast, corporate registry, gas price. Deploy via the release-miner gates.
- [ ] D1 Docs 5 + growth 20 (now in both tracks): beginner tutorial (network, cost, limits), video script.
- [x] G1 drafts: `docs/OUTREACH.md` (Discord recipe post, X update 1, templates for 2 and 3). Guide updated.
      Evaluator explainer drafts are Codex's (`track2/OUTREACH_S2.md`).
- [ ] N1 One `updateMiner`, now unblocked (G206 closed 2026-11-05: no grace period on update). Ahmed: "submit the
      capabilities you can reliably demonstrate rather than claiming everything".
      - [x] 2026-11-06: cut STOCK_PRICE, NEWS_HEADLINES, NEWS_SEARCH and IP_GEOLOCATION from `miner.yaml`; narrow
        FINANCIAL_DATA to 10-K figures; fix the WEB_SEARCH description (G250). Manifest diff PASS, unit 907/907
        (`track1-miner/docs/evidence/n1-cut-2026-11-06/`). EVENT_OUTCOME kept: its audit passes (GAPS, G275 block).
      - [x] Audit the added intents against sources: DNS and token supply 10/10 (G277). ONCHAIN_METRIC_VERIFY
        still needs its own five.
      - [ ] Owner decides on CRYPTO_PRICE's Bitstamp licence (G275). Decide STORM_ALERT by audit.
      - [ ] After the signature: delete the four retired routes' code and empty `RETIRED` in `test/manifest.test.ts`.
      - Add an intent only if it passes its audit first: TEXT_SUMMARIZATION, IMAGE_CAPTIONING and
        ASSET_RESERVE_ATTESTATION are candidates.
      - Before the owner signs, validate and sandbox-test the YAML on anjoman.ai/dashboard/earn (owner's session).

**Owner (human needed)**
- [x] Questions sent to Ahmed 2026-11-04 UTC; **answered 2026-11-05** (TELEGRAPH_FACTS items 12–17).
- [x] Release the sanctions fix (G258). Owner: "Yes, deploy now"; live 2026-11-05 ~18:28 UTC as `4fb477e`. The
      filings change `bb07266` (G257, G263) was not in it and needs its own yes.
- [ ] Post the Discord message and X update 1 from `docs/OUTREACH.md`. PR #17 is merged and the audit link resolves
      (checked 2026-11-05). Growth is now 20 points in the Miner track too.
- [ ] Ask Ahmed which of the 16 payer wallets in `docs/evidence/consumption-2026-11-05/summary.md` belong to
      registered H2 apps (G259). Tell Claude which are ours (an Anjoman smart wallet, any test calls).
- [x] Check the Vercel plan: **Hobby**, confirmed by API 2026-11-06 (G249).
- [x] G249: stay on Hobby while payments are testnet (owner, 2026-11-06). Revisit when Telegraph moves to mainnet.
- [x] Sign and upload the 144 translation pairs: done, all 144 admitted at epoch 2013 (MEMORY, Codex block).
- [ ] Record the 2–5 minute video from the script.
- [ ] Validate the N1 YAML on anjoman.ai/dashboard/earn, then sign the one `updateMiner`.

## Owner

- [x] G254: deploy the scored-field change. Owner: "Yes, deploy it"; live 2026-11-05 as `3c5e8ff`
      (`miner-5arlzhkv6`), record in `track1-miner/docs/evidence/release-2026-11-05-scored-fields/`.
- [ ] **G255: ask Telegraph (Ahmed)** who wallet `0xbd6f696096cceeaff7406d802ba04500eeaf6976` is (1,673 one-intent
      miners on raw public URLs; registry ranks 1–3), and whether those miners take routed requests.
- [ ] G256: where did the "many requests" figure for these intents come from? Send the page or a screenshot.
- [x] Registered for Season II (owner confirmed 2026-11-01). One registration covers all three tracks.
- [ ] **Before Nov 1:** read the prize-payment terms when they appear: eligible countries (India?) and payout
      methods (G218).
- [ ] Send the organisers the two questions in WINNING.md §8: the grace-period reset (G206, G220) and the
      payment terms (G218).
- [x] `codex/rank1-14-intents` pushed 2026-11-01 (owner: "push branch"), `b85e1ab..823d0ab`, 121 commits.
- [ ] Close the stale uptime issue #13. Updating origin/main to the branch needs a PR.
- [x] `claude/licensed-sources` merged 2026-10-29 (owner: "Merge it"), unit tests 852/852. Not deployed (GAPS
      G230–G234).
- [ ] Archive the idle sessions whose worktrees were detached on 2026-10-29: project improvement strategy,
      Morse repair, miner improvements, high quality wasm. Delete remote `origin/codex/livecert-manifest-19`?
      Remove the 3 detached worktrees in `C:\Users\hyada\tg-deploy\`?
- [x] Deploy the G217 holder fixes: deployed 2026-10-31 with the licence gates (`330f2af`, `miner-h0lnck8v6`).
- [x] ~~G237: register the CRYPTO_PRICE comparator.~~ Withdrawn 2026-10-31 18:40 UTC: FX_NOW is scored with no
      registered comparator, so it would not change scoring (GAPS G237 killed). Do not fund the wallet for it.
- [ ] Ask Telegraph (Ahmed), with the evidence (GAPS G235): "CRYPTO_PRICE_USD reads `onchain.ready: false`,
      'price_usd has no decimals', so no miner is scored in it, while FX_NOW_EUR is. Can the intent get its
      decimals (and CURRENCY_EXCHANGE_CONVERT and STOCK_PRICE_US_EQUITY too, if they have the same note)? And
      WEATHER_CHECK_TEMPERATURE is `ready: true` with a ranking truth source, but unscored: what is missing?"
- [ ] G238: when Telegraph publishes `foundation.json` and the reference executor, say whether Track 2 re-exports
      the LLM_OUTPUT_EVALUATION adapter as a safetensors delta (no retraining) to compete with seed 900002.
- [ ] G217: create a free Blockscout Pro API key at dev.blockscout.com, read its terms, and put it in
      `track1-miner/miner/.env.local` as `BLOCKSCOUT_API_KEY`. Or decline it and keep Base, Arbitrum and Polygon
      holder counts answering `unknown`.
- [ ] G205: yes or no to an availability record from Nov 1 (reliability is 20 of 100 Miner points).
- [ ] G204: decide on WINNING.md A4. Should our own disclosed H2 mission workflow earn related-party
      consumption points (up to 7 of 10)?
- [ ] Pick a licensed news source for web search, news search and headlines (G194: GDELT is unusable):
      Brave Search API (account and key), a paid news API, or Wikipedia's Current Events portal (no search).
- [ ] STOCK_PRICE and the listed-company half of `/financial` (Yahoo, non-commercial): pay for data, or answer
      `not_licensed`. Registration 4829 is frozen for the season (WINNING.md §8), so no intent is dropped.
- [ ] G199: is the public Nominatim API acceptable for an AI-assisted miner under its usage policy, or move to a
      paid geocoder?
- [ ] Sign in to anjoman.ai and check whether Earn lists registration 4829 (Claude does not sign in).
- [ ] Send the G32 report (WINNING.md §9), adapted to V2: the older adapter formats are now refused.
- [ ] Optional: Vercel → Deployment Protection off for previews, so `preflight.mjs` can grade a preview.
- [ ] Optional: `vercel env add OPENALEX_MAILTO production --scope wukong4` (G81's remedy).

## Claude

- [ ] G254: after three epochs scored past 2026-11-05 09:40 UTC, run `tools/epoch-history.mjs` for the sanctions,
      registry and filings intents and compare with `release-2026-11-05-scored-fields/epochs-before.json`.
      Epoch 2019 read 18:13 UTC: filings fell to 11th, 0.8145, with the whole field (GAPS G254); two more to go.
- [x] G257: find the issuer in a filings question that names no `company` (fixed in code 2026-11-05, unit 879/879).
- [x] Deploy the G257 + G263 filings change. Owner: "Yes, deploy it"; live 2026-11-05 ~19:10 UTC as `9b82d08`
      (`miner-f28bzjwiw`), preflight 7/7, record in `track1-miner/docs/evidence/release-2026-11-05-filings-issuer/`.
- [x] G263: count every SEC form, as zk-filing does. Live 2026-11-06 ~16:09 UTC as `7301474` (`miner-qbdf1756n`),
      with the scored field of eleven more intents and current temperature; preflight 7/7.
- [ ] Read the epochs after 2026-11-06 16:09 UTC for filings, temperature, on-chain lookup, SSL and crypto price
      against `release-2026-11-06-scored-fields-all/epochs-before.json` (`tools/epoch-history.mjs`).
- [x] G264: CRYPTO_PRICE_USD scored again from epoch 2028 (rank 10–24).
- [x] Pin the owner's required account (`hyadav42774@gmail.com`) and LiveCert wallet in repository instructions;
      remove conflicting email and alternate-payout guidance (owner instruction, 2026-11-03).

- [x] Mission × intent matrix at build level, and fixtures for the 9 fully-served workflows (2026-10-31,
      `tools/mission-matrix.mjs`, `tools/mission-fixtures.mjs`): 3/9 pass on production.
- [x] Fix G241, G242, G243 (2026-10-31): unit 866/866; every failing step passes on preview `miner-d881p4yiz`.
- [x] G241–G243 deployed 2026-10-31 (`a8abbcf`, `miner-htkhwofwv`): preflight 7/7; workflows 7 pass, 0 fail, 2
      unchecked (SEC).
- [x] Fixtures for the partial workflows (2026-10-31): all 102 builds graded on production `a8abbcf`; full 9/9,
      partial 50/58 (7 fail: G244, G245; 1 honest licence refusal), 15/15 missions with a passing build.
- [x] G245 deployed 2026-11-01 as `130e16c` (`miner-rbjurfgjl`, with the bounded field-list match): preflight 7/7;
      full 9/9, partial 53/58 (4 fail: G244; 1 refused), 15/15 missions.
- [x] G244 decided 2026-11-01 ("Answer ambiguous") and fixed in `e63df93`: unit 871/871.
- [x] `e63df93` deployed 2026-11-01 (`miner-jyh9t9upq`): mission builds full 9/9, partial 57/58 (1 refused);
      preflight 5/7 from badssl.com reachability (G246), not this release.
- [x] G246 (2026-11-01): badssl.com's own server resets ~1/3 of handshakes, from here too; real hosts unaffected.
      Gates retry badssl twice then skip, and grade ssl.com's expired host. Verify-deploy passes, intents 40/40.
- [x] G246 SSL prose fix deployed 2026-11-01 (`5939c49`, `miner-1aoi3y0wt`): preflight 5/7, both failures re-run
      clean (intent answers 40/40; unit + live 997/0/1 after moving the last badssl live test to ssl.com).
- [x] ~~Owner: set `SEC_USER_AGENT`~~ Not needed: SEC accepts the miner's own identity (2026-10-31). Kept as an
      override. Original item: set `SEC_USER_AGENT` when running the fixtures, or accept the two SEC steps
      as unchecked.
- [ ] G207: timeless web search quotes the wrong Wikipedia article (Pride and Prejudice → the zombie film).
      WEB_SEARCH is bought by 7 missions.
- [x] Gates changed to grade `not_licensed` as an honest refusal, and the licence gates, G200 and G217 deployed
      2026-10-31 (`330f2af`): preflight 7/7, intent answers 40/40 (34 answered, 6 refusals).
- [ ] Add the `licensing` field to `docs/openapi.json` (GAPS G230). `latency-targets.mjs` was not re-checked.
- [ ] G236: confirm with `cast` that 4829 is on the Ethereum Sepolia Diamond before any on-chain step.
- [ ] G233: read the CISA KEV and FIRST EPSS terms and record a verdict in `src/sources.ts`.
- [ ] The G200 partials, smallest first: NXDOMAIN wording (SSL, URL_SAFE), the threshold answer for
      "will X reach N°C", product-level FINANCIAL questions.
- [ ] RESEARCH_SYNTHESIS: non-biomedical topics. Synthesis reads only Europe PMC and PubMed, plus two
      hard-coded technical comparisons (`technical-research.ts`).
- [x] Track 2 on V2: `/docs/scoring/*` read 2026-10-31. Comparators: unchanged and not needed for scoring.
      Adapter: must become a safetensors delta (G238).
- [x] LANGUAGE_TRANSLATION_GENERAL material built 2026-11-01 (`track2/material/`): 144 Tatoeba preference pairs,
      all read, every published rule passes. Owner signed and uploaded Nov 5 IST. All 144 confirmed admitted.
- [x] Verified all 144 translation rows eligible after rollover. Bounty #140 reporting remains separate.
- [x] Bounty #140: `/claim` + `/submit` posted 2026-11-07 18:24 UTC; the bot moved it to `status:review`.
- [x] Bounty #167 STOCK_PRICE dropped 2026-11-07: row rejected, intent cut from the YAML, sources barred.
      The claim lapses on its own at 19:17 UTC.
- [x] URL Scan preflight: verified the `URL_SCAN` hybrid family on-chain and replayed the exact `GENERIC` adapter.
- [ ] Compare a URL Scan challenger with the generic adapter and the boolean comparator on unseen miner answers.
      Verify the check-before-opening workflow before preparing registration.
- [ ] Track 2 entry that needs no foundation files: evaluation material for intents LiveCert serves. Truth
      sources for the deterministic ones with none (SSL_VERIFICATION_CERT), and attested preference pairs for a
      judgment family. Claude builds and checks the JSON Lines file; the owner signs the upload (EIP-191). One
      honest contributor only: never extra wallets to reach the 5-contributor minimum.
- [ ] First weekly production audit from Nov 1 (WINNING.md A5). Publish it, failures included.
