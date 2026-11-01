# TASKS.md — execution board

Season II (H2): Nov 1 00:00 UTC – **Dec 1 23:59 UTC** 2026, every track (`RULES_SEASON2.md`, re-read
2026-10-29). Goal: miners whose answers are correct, sourced and licensed for paid use. Done and superseded
items were cut on 2026-10-17 and 2026-10-29; they are in `git log -p -- TASKS.md`. One task = one change = one
commit.

## Owner

- [ ] **Before Nov 1 00:00 UTC (05:30 IST):** register for Season II with `harsh.2024a@vitstudent.ac.in`, if not
      already done. One registration covers all three tracks.
- [ ] **Before Nov 1:** read the prize-payment terms when they appear: eligible countries (India?) and payout
      methods (G218).
- [ ] Send the organisers the two questions in WINNING.md §8: the grace-period reset (G206, G220) and the
      payment terms (G218).
- [ ] Say yes to pushing `codex/rank1-14-intents`, about 100 commits ahead of origin on 2026-10-29 after the
      branch merges. Reviewers reproduce from the public repo. Also close the stale uptime issue #13. Updating
      origin/main to it needs a PR.
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
- [ ] Owner: yes to deploying `e63df93` (G244); then Claude re-runs preflight and the mission builds on production.
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
- [ ] Track 2 entry that needs no foundation files: evaluation material for intents LiveCert serves. Truth
      sources for the deterministic ones with none (SSL_VERIFICATION_CERT), and attested preference pairs for a
      judgment family. Claude builds and checks the JSON Lines file; the owner signs the upload (EIP-191). One
      honest contributor only: never extra wallets to reach the 5-contributor minimum.
- [ ] First weekly production audit from Nov 1 (WINNING.md A5). Publish it, failures included.
