# TASKS.md — execution board

Season II: 1 Nov – 1 Dec 2026 (`RULES_SEASON2.md`). Goal: miners whose answers are correct, sourced and
licensed for paid use. Season I's board (149 done items, all Season I epoch and rank targets) was cut on
2026-10-17: `git log -p -- TASKS.md`. One task = one change = one commit.

## Owner

- [ ] Register for Season II with `harsh.2024a@vitstudent.ac.in` before 1 Nov.
- [ ] Pick a licensed news source for web search, news search and headlines (G194: GDELT is unusable):
      Brave Search API (account and key), a paid news API, or Wikipedia's Current Events portal (no search).
- [ ] STOCK_PRICE and the listed-company half of `/financial` (Yahoo, non-commercial): pay for data, or
      refuse as `not_licensed` and drop the intent in the next `updateMiner`.
- [ ] Sign one `updateMiner` once the above are settled: fix the weather claims MET Norway cannot meet (G195),
      the news source named in two endpoint descriptions, and any dropped intent.
- [ ] G199: is the public Nominatim API acceptable for an AI-assisted miner under its usage policy, or move to a
      paid geocoder?
- [ ] Say yes to pushing `codex/rank1-14-intents` (14+ local commits ahead of origin on 2026-10-21) and to
      closing the stale uptime issue #13 (opened 2026-10-01; the miner answers and the schedule is off).
- [ ] Optional: Vercel → Deployment Protection off for previews, so `preflight.mjs` can grade a preview.
- [ ] Optional: `vercel env add OPENALEX_MAILTO production --scope wukong4` (G81's remedy).

## Claude

- [x] Deploy the 36-intent build — production `miner-8jdiuqzv4`, then `miner-q5qepqluk` (2026-10-18).
- [x] Weather, storm and geocoding off Open-Meteo/BigDataCloud onto MET Norway and Nominatim (`e86a0f4`).
- [x] Translation off the unofficial Google endpoint and MyMemory onto Groq (`329254b`).
- [x] A built-in table of the most-asked places from Wikidata (CC0), so common cities skip Nominatim (G196).
      Committed 2026-10-21, **not deployed**; with it, OSM credit in weather answers (G198) and
      `NOMINATIM_URL` (G199).
- [ ] Deploy the places-table build (preview → production → gates), on the owner's yes.
- [ ] Correctness audit of every intent against real routed questions and the primary source; fix or remove
      any intent that cannot be answered correctly.
- [x] SENTIMENT: sarcastic praise reads negative (G139). Already shipped; production 2026-10-21 06:35 UTC
      answered "Oh great, the update broke everything again…" `negative`, compound −0.6705.
- [ ] RESEARCH_SYNTHESIS: non-biomedical topics. RESEARCH_QUERY already routes by domain (ClinicalTrials.gov
      + Europe PMC, a technical path, Wikipedia); synthesis reads only Europe PMC and PubMed plus two hard-coded
      technical comparisons (`technical-research.ts`).
- [x] Rewrite the root README.md and track1-miner/README.md for Season II (2026-10-21).
- [ ] Re-read the Season II Miner rules when published; update `RULES_SEASON2.md` and SEASON2_PLAN.
      Still unpublished at 2026-10-21 06:30 UTC (/rules and /judging: "will be published separately").
