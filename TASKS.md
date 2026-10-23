# TASKS.md — execution board

Season II: 1 Nov – 1 Dec 2026 (`RULES_SEASON2.md`). Goal: miners whose answers are correct, sourced and
licensed for paid use. Season I's board (149 done items, all Season I epoch and rank targets) was cut on
2026-10-17: `git log -p -- TASKS.md`. One task = one change = one commit.

## Owner

- [ ] Register for Season II with `harsh.2024a@vitstudent.ac.in` before 1 Nov.
- [ ] G203 and G206: send the organisers the four questions drafted in WINNING.md §8 (deadline, prize pool,
      grace-period reset, entering two tracks).
- [ ] **By Oct 24:** choose the `updateMiner` timing (G206). Option A: sign by Oct 24 23:59 UTC with the §6
      cuts. Option B: freeze registration 4829 for the season. See WINNING.md §8.
- [ ] G204: decide on WINNING.md A4. Should our own disclosed H2 mission workflow earn related-party
      consumption points (up to 7 of 10)?
- [ ] G205: yes or no to resuming an availability record from Nov 1 (reliability is 20 of 100 Miner points).
- [x] **Done 2026-10-23 (owner: "yes cleanup. we dont want what doesnt help us in season 2"):** the disk cleanup below, plus Season I-only docs. Branch backup: `C:\Users\hyada\telegraph-backups\season1-branches-2026-10-23.bundle`.
      - Remove the three merged, clean session worktrees `admiring-golick`, `loving-elbakyan` and
        `status-check-fixes` (166 MB).
      - Delete the 40 Season I `rank_answer` champion binaries in `track2/harness/champions` (618 MB,
        gitignored), together with the Season I proof tools that read them, in the Track 2 lane.
      - Bundle the ~30 Season I local branches to one backup file, then delete them.
      - Keep `track2/calibration` (registration 1882 is still the TEXT_AUTHENTICITY_CHECK champion),
        `node_modules` and current evidence.
- [ ] Approve the cuts in WINNING.md §6:
      - Intents, applied in the next `updateMiner`: NEWS_HEADLINES, IP_GEOLOCATION, STOCK_PRICE, and
        RESEARCH_QUERY unless it is fixed by Nov 1.
      - Season I tooling and superseded evidence: done 2026-10-22.
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
- [x] Correctness audit of every intent against real routed questions and the primary source (2026-10-21):
      36 intents, 154 questions, production 110 pass / 17 partial / 27 fail; 22 fails fixed on
      `claude/correctness-audit-2026-10-21` (unit 787/787), 5 logged in G200, no intent recommended for removal.
      Evidence: `track1-miner/docs/evidence/correctness-audit-2026-10-21/`.
- [x] **Done 2026-10-23:** production `miner-n9d4aoxw8` from `22284c0`; evidence in `release-2026-10-23/`. Deploy the audit branch (it contains the places-table build) — preview → production → gates — on the
      owner's yes. The sanctions alias fix matters most (G201). Expect the intended `/ip-geolocate` diff in `no-regression.mjs` (G202).
- [ ] G207: timeless web search quotes the wrong Wikipedia article (Pride and Prejudice → the zombie film). Next, before
      RESEARCH_QUERY: WEB_SEARCH is bought by 7 missions.
- [ ] RESEARCH_QUERY: require the qualifier as well as the entity in trials and papers (G200, 3 of 4 failed).
- [ ] ACADEMIC_SEARCH: answer a title lookup with that paper (G200).
- [ ] The G200 partials, smallest first: NXDOMAIN wording (SSL, URL_SAFE), the threshold answer for
      "will X reach N°C", product-level FINANCIAL questions.
- [x] SENTIMENT: sarcastic praise reads negative (G139). Already shipped; production 2026-10-21 06:35 UTC
      answered "Oh great, the update broke everything again…" `negative`, compound −0.6705.
- [ ] RESEARCH_SYNTHESIS: non-biomedical topics. RESEARCH_QUERY already routes by domain (ClinicalTrials.gov
      + Europe PMC, a technical path, Wikipedia); synthesis reads only Europe PMC and PubMed plus two hard-coded
      technical comparisons (`technical-research.ts`).
- [x] Rewrite the root README.md and track1-miner/README.md for Season II (2026-10-21).
- [ ] Re-read the Season II Miner rules when published; update `RULES_SEASON2.md` and SEASON2_PLAN.
      Still unpublished at 2026-10-21 06:30 UTC (/rules and /judging: "will be published separately").
