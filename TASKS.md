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
- [ ] Say yes to pushing `codex/rank1-14-intents` (13 commits ahead of origin on 2026-10-29). Reviewers
      reproduce from the public repo. Also close the stale uptime issue #13.
- [ ] Deploy the G217 holder fixes (`af568e1`), committed and tested, not deployed: use the release-miner skill,
      preview first.
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

- [ ] A mission × intent matrix, with one reproducible fixture for each mission our intents enable (WINNING.md
      §8, Nov 1–13). It earns coverage (15) and is the first delivery-award criterion.
- [ ] G207: timeless web search quotes the wrong Wikipedia article (Pride and Prejudice → the zombie film).
      WEB_SEARCH is bought by 7 missions.
- [ ] RESEARCH_QUERY: require the qualifier as well as the entity in trials and papers (G200, 3 of 4 failed),
      or answer `not_served`.
- [ ] The G200 partials, smallest first: NXDOMAIN wording (SSL, URL_SAFE), the threshold answer for
      "will X reach N°C", product-level FINANCIAL questions.
- [ ] RESEARCH_SYNTHESIS: non-biomedical topics. Synthesis reads only Europe PMC and PubMed, plus two
      hard-coded technical comparisons (`technical-research.ts`).
- [ ] Track 2 on V2: read `/docs/scoring/*` on anjoman.ai, then check the comparators and the adapter against
      the new `registerWasm(hash, url, prefix, feeAddress, runnableUrl)` and the float-adapter-only format.
- [ ] First weekly production audit from Nov 1 (WINNING.md A5). Publish it, failures included.
