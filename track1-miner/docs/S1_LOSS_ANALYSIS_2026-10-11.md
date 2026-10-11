# Why LiveCert placed outside the Season I Track 1 top 3

Written 2026-10-10 ~19:30 UTC (2026-10-11 01:00 IST). Every number below was pulled from the public node
and explorer APIs in this session. Derived outputs, page snapshots and the scripts that produced them
are in [evidence/s1-loss-2026-10-11/](evidence/s1-loss-2026-10-11/). The raw pulls (44,826 score rows,
129,023 feed rows) are not kept. `pull-epochs.mjs` and `pull-feed.mjs` regenerate them.

## Result

| Place | Miner | Score | Intents at close | First scored |
|---|---|---:|---:|---|
| 1 | TXlens (`txlens`) | 97.9 | 14 | epoch 270, Aug 24 |
| 2 | Chainsight Oracle (`chainsight-oracle`) | 86.9 | 14 | epoch 266, Aug 22 |
| 3 | Oathcast Weather (`oathcast-weather`) | 85.4 | 1 | epoch 190, Aug 16 |
| — | LiveCert (`livecert`) | not placed | 13 | epoch 284, **Aug 26** |

Source: https://hackathon.telegraphprotocol.com/winners (fetched 2026-10-10). The page gives one total
per miner. It does not publish the breakdown or the formula.

The winners' own answers, code and judging-window traffic are examined in
[S1_WINNERS_TEARDOWN_2026-10-11.md](S1_WINNERS_TEARDOWN_2026-10-11.md).

## Short answer

**Being first by normalized sum at epoch 298 was not what got judged, and the published totals cannot
be rebuilt from any public number.** The Season I page lists five miner criteria. Ranking is one. The
other four are apps built on the miner, total requests served, X progress posts, and X engagement and
reach. The reviewers wrote a qualitative blurb for each winner, and Oathcast's 3rd place matches no
metric. So the score was a judgement made by reviewers, with the numbers as inputs. Each winner beat us
clearly on at least one input. We led clearly on none of them across the whole event.

1. **Ranking was not where we lost.** On every reconstruction (§2), LiveCert's performance is never
   meaningfully below TXlens's, and it is far above Oathcast's. Epoch 298 alone is our single best window. Across any span
   of epochs, Chainsight is level with us or ahead.
2. **We started nine days late.** LiveCert was scored in **15 of the 105** Track 1 epochs (first on
   Aug 26). Oathcast was live before day 1, Chainsight from Aug 22, TXlens from Aug 24. A one-epoch
   snapshot hides that gap. Anything averaged over the event does not.
3. **Demand moved to others once apps were built (§3).** In Track 1 we served more requests than all
   three winners combined. In Track 3, TXlens served about twice our distinct questions. Truvian
   Shield, Track 3's 2nd place, names **ChainSight (302)** as the miner behind two of its four checks.
   No winning app names LiveCert. Demand explains part of the TXlens gap and some of Chainsight's, and
   none of Oathcast's.
4. **X reach.** Today @sireadell (TXlens) has 5,469 followers, @fexx_off (Oathcast) 572 and we have 132
   (§3b). Oathcast placed 3rd with no requests at all during the event and a median rank of 6.
   Whatever carried it is not on chain, so X and the reviewers' reading of the miner are the remaining
   candidates. Chainsight placed 2nd with 7 followers, so X was not decisive on its own either.
5. **What the reviewers read described a different miner (§5).** Each winner's blurb restates its own
   manifest. TXlens's restates its `/check-tx` endpoint field by field. Our manifest description,
   registered and shown on our explorer page, still describes the August three-endpoint
   certificate-and-weather service, under the name "LiveCert Operational Signals". It says nothing
   about the other 33 intents. Our answers are one prose string tuned for the scorer. Theirs list
   fields an app can use.

## Evidence

### 1. What was judged

The Season I archive (https://hackathon.telegraphprotocol.com/season-1, fetched 2026-10-10) lists the
Miner Track judging criteria as:

- Telegraph ranking and performance
- Number of applications built on your Miner
- Total requests served
- Progress updates posted on X
- Engagement and reach on those posts

The same page says miners are judged on actual demand as well as benchmark performance. The
rules-page formula recorded in [docs/JUDGING.md](../../docs/JUDGING.md) was 75 points of normalized
performance plus 25 of X. The organiser's 2026-08-29 clarification said the cross-intent aggregate
would be "an average across all intents", with the formula left to judging. The project then optimised
normalized **sum** at a **single epoch**. Neither is the measure the published criteria describe.

### 2. Ranking, reconstructed four ways

From every score row for epochs 1–345 (`/scores?epoch=N`, 44,826 rows). For each miner and intent:
mean score over the window, divided by the best mean in that intent. Then the mean across that
miner's intents × 75 (the "average across intents" reading) and the plain sum.

| Window | Missing epochs | LiveCert | TXlens | Chainsight | Oathcast |
|---|---|---:|---:|---:|---:|
| Epoch 298 only | — | **58.4** (sum 10.13, #1) | 39.3 (7.34) | 41.6 (7.77) | 0.5 |
| Track 1, Aug 17–31 | ignored | 30.3 (5.25) | 28.6 (5.34) | 37.8 (7.05) | 29.4 |
| Track 1, Aug 17–31 | count as 0 | 25.8 (4.47) | 24.8 (4.64) | **47.1** (8.79) | 29.4 |
| Through Sep 7 | ignored | **47.4** (8.22) | 35.6 (6.65) | 44.5 (8.30) | 29.4 |
| Through Sep 7 | count as 0 | 33.4 (5.79) | 29.7 (5.54) | **47.5** (8.87) | 29.4 |

Cells are mean ratio × 75, with the sum of ratios in brackets.

- **Epoch 298 is the single most flattering window for us.** The "#1 at epoch 298" belief came from
  this row. In every multi-epoch window, Chainsight's sum is level with ours or ahead.
- **TXlens's performance is never meaningfully above ours.** It is below us by mean in every
  reading, by up to 19 points. Its only leads are by sum in the Track 1 window, by 0.09 and 0.17. It still scored
  97.9. Oathcast
  never passes 29.4/75, yet it scored 85.4. So the published totals cannot be rebuilt from ranking,
  and something else carried most of the weight.
- Under the "average across intents" reading, single-intent miners leading a quiet intent take a full
  75. Breadth lowers the average. In the Track 1 window LiveCert is 43rd of 132 by mean, while it is
  5th by sum.

Per-intent rank-1 counts, Aug 17–Sep 7: TXlens's headline intent, ONCHAIN_TX_LOOKUP, was rank 1 in 7
of 45 epochs (median rank 3). Oathcast's WEATHER_FORECAST was rank 1 in 18 of 119 (median rank 6).
LiveCert was rank 1 in LANGUAGE_TRANSLATION 19/27, NEWS_HEADLINES 16/20, SSL 15/32, STORM 15/32,
CONTENT_EXTRACTION 12/20 and IP 12/30.

### 3. Requests served

Lifetime `total_requests_served` from `/api/miners`, as of 2026-10-10 19:20 UTC. This is the number
on each miner's explorer page:

| Miner | Requests served | Rank of 1,907 |
|---|---:|---:|
| TXlens | 3,714 | 1 |
| Chainsight Oracle | 3,271 | 3 |
| LiveCert | 2,239 | 5 |
| Oathcast Weather | 19 | 119 |

Successful requests by window, from the explorer feed: 129,023 rows, Aug 15 – Sep 29, every row with
`status: success` attributed by `routing.subnet_id`. "Routed" means the network's own daemon picked the
miner. "Direct" means a caller addressed the miner itself. Rank is among all miners serving in that
window.

| Window | LiveCert | TXlens | Chainsight | Oathcast |
|---|---:|---:|---:|---:|
| Track 1, Aug 17–31 | **151** (#8; 12 routed) | 9 (#39) | 37 (#16) | 0 |
| Track 3, Aug 31–Sep 7 | 810 (#10; 48 routed) | 1,792 (#8) | **9,195** (#1) | 0 |
| — distinct question texts | 377 | **749** | 407 | 0 |
| Judging, Sep 8–28 | 980 (#4) | 1,830 (#3) | **2,427** (#1) | 17 |

- **In Track 1 we served more than all three winners combined.** That volume did not carry over.
- **In Track 3, when apps were being built, TXlens served about twice our distinct questions.**
  Chainsight's lead is mostly one burst: 8,347 calls to `/wcheck` on Sep 5–7, with only 407 distinct
  texts. In the same days skywire, weatherapi, isobar and openweathermap each served about 8,000
  weather calls. The caller was not identified. Those four did
  not place, so raw volume alone did not win.
- The catalog's lifetime count and the feed disagree for Chainsight (3,271 against 11,658 successes),
  so the explorer number probably excludes some calls. Which count the reviewers used is unknown.
- **Oathcast served nothing at all in Track 1 or Track 3.** Volume does not explain its place.

### 3b. X reach (followers today, not during the event)

Read from each public profile page on 2026-10-10 ~19:35 UTC, logged out. These are today's counts, so
they show reach only roughly. Posts and engagement during Aug 17–Sep 7 were not measured.

| Account | Miner | Place | Followers |
|---|---|---:|---:|
| @sireadell | TXlens | 1 | 5,469 |
| @shadrakbsh | Chainsight | 2 | 7 |
| @fexx_off | Oathcast | 3 | 572 |
| @hyadav42774 | LiveCert | — | 132 |

Our own Telegraph posts are visible logged out (counts read 2026-10-10 ~19:50 UTC):

| Date | Post | Replies | Reposts | Likes | Views |
|---|---|---:|---:|---:|---:|
| Aug 26 (pinned) | a miner can be pure YAML; `base_url` points at the upstream | 13 | 11 | 14 | 1.1K |
| Sep 6 | Morse is on the official MCP registry | 4 | 5 | 9 | 184 |
| Sep 7 | Dossier: one message becomes up to eight miner questions | 6 | 6 | 11 | 196 |

The profile reports 126 posts in total. Posts about unrelated projects sit between the Telegraph ones,
so a reviewer scrolling the account sees a mixed feed. When logged out, X shows only each winner's
latest post. Their activity during Aug 17–Sep 7 could not be read here.

Read with the other tables, each winner had at least one input where it clearly led us:

- **TXlens:** the most requests served, plus about 40× our reach.
- **Chainsight:** the best multi-epoch ranking, the third-most requests and a winning app built on it,
  with almost no X presence.
- **Oathcast:** about 4× our followers, with near-zero requests and a weak rank. It is the one placing
  the measurable inputs do not explain, so reviewer judgement or X engagement must have carried it.

LiveCert led none of them on any input except the last few epochs' ranking.

### 4. Apps built on the miner

- **Truvian Shield** (Track 3, 2nd) names its miners on https://truvian.xyz: ChainSight · 302 answers
  CRYPTO_PRICE and TVL_LOOKUP (alongside FinWire · 7322), and its own Truvian miner answers the
  transaction check. Its `/api/stats` showed 29 Telegraph requests on 2026-10-10.
- The Scam Shield and ProofPact bundles do not name LiveCert, TXlens, Chainsight or Oathcast by slug.
  Each contains the string "302" once, which may be an HTTP status code. Not counted as evidence.
- Our own Track 3 app, Morse, was built on LiveCert. It did not place. Whether reviewers count an app
  by the miner's own author is unknown. Override 2 of this folder says we should not count it.

### 5. What the reviewers read

| Miner | Published blurb | Its manifest |
|---|---|---|
| TXlens | confirmed / reverted / pending / not-found, sender, recipient, value in wei and ETH, block, receipt, decoded method | the `/check-tx` description lists exactly those fields |
| Chainsight | prices, market cap and volume, DeFi TVL, FX, gas, wallet balances, Ethereum/Base tx lookups | the top-level description, same list in the same order |
| Oathcast | serves WEATHER_FORECAST through ranked routing | one endpoint, one intent, a tight description |
| LiveCert | — | top-level `description` still describes `/ssl-check`, `/storm-alert` and `/weather-forecast` only (`miner.yaml` lines 7–19; unchanged since 2026-08-27, and still in the registered manifest pinned at `94bbb04`) |

The reviewers summarised whatever each manifest said it was. Ours said it was a three-endpoint
certificate-and-weather service.

The payloads differ the same way. Measured live on 2026-10-10 ~19:37 UTC with the same transaction hash:

| Miner | Fields returned |
|---|---|
| TXlens `/check-tx` | `status`, `from`, `to`, `value_wei`, `value_eth`, `block_number`, `block_hash`, `receipt_status`, `method`, `canonical`, `confidence`, plus a prose `summary`/`answer` |
| Chainsight `/price?symbol=ETH` | `price_usd`, `market_cap_usd`, `change_24h_pct`, `circulating_supply`, `source`, plus a prose `signal` |
| LiveCert `/tx-lookup` | `verdict`, `confidence`, and one prose `reason` holding the sender, recipient, value and block |

We stripped fields because the converter summarises every one of them
([CONVERTER_MODEL.md](CONVERTER_MODEL.md)), so lean prose scored better. The two winners kept fields
and prose together and still ranked; TXlens was rank 1 in ONCHAIN_TX_LOOKUP at epoch 298. The
trade-off cost us usability for apps, and the winners show it was not needed to rank.

### 6. Answers real callers get (last 7 days, for Season II)

312 LiveCert answers in the explorer feed (`/api/daemon/api/questions?order=desc&since_hours=168`,
pulled 2026-10-10 19:20 UTC). All returned HTTP 200. **47%** were app calls asking "Is there an
active storm alert or severe weather warning for <city> right now?" A further **32%** asked for a
24-hour forecast. Both answers open by pasting the question back, e.g. "Regarding is there an active
storm alert … right now:". The storm answer never says yes or no, and at risk grade "none" it still
advises operational adjustments. The forecast names "Lagos, 100242, Nigeria". That reproduces on production at ~19:55 UTC with
`GET /weather-forecast?location=Lagos%20Nigeria&hours=24`, with or without `query=`. The postcode
comes from the `location` parameter. Feed example: row `876e64db-0e38-4e7f-9fc3-320cc1c8f7dc`,
2026-10-10 13:07 UTC, one of 14 such rows in 7 days. The question echo is the restatement
from `src/restate.ts`, which was measured to raise scorer similarity. To an app developer it reads as
a bug. Handed to the code session (it owns `src/`).

## Where Season II demand will come from

Season II runs 1 Nov – 1 Dec 2026. Every app must be built for one of fifteen commercial missions and
must buy through Telegraph (https://hackathon.telegraphprotocol.com/rules and /tracks, fetched
2026-10-10). Each mission page names the intents its example builds buy. Counting the fifteen pages
gives 66 distinct intents:

| Missions buying it | Intent | Do we serve it? |
|---:|---|---|
| 7 | WEB_SEARCH | yes |
| 5 | CORPORATE_REGISTRY_LOOKUP | no (19 active miners) |
| 5 | QUESTION_ANSWERING | no (9) |
| 5 | SANCTIONS_SCREENING_MATCH | no (13) |
| 4 | FACT_CHECK | yes |
| 4 | FINANCIAL_DATA | yes |
| 4 | REGULATORY_FILING_MONITOR | no (13) |
| 4 | ASSET_RESERVE_ATTESTATION | no (20) |
| 4 | CHAT_COMPLETION | no (19), and generative |
| 3 | MACRO_ECONOMIC_INDICATOR, ONCHAIN_METRIC_VERIFY, WASH_TRADING_DETECTION, WEATHER_FORECAST_VERIFY, … | no |

**23 of our 36 intents are bought by no mission.** That includes every Season I flagship: SSL, STORM,
IP, WEATHER_FORECAST, ACADEMIC, NEWS_HEADLINES, AI_TEXT and TELEGRAPH_KNOWLEDGE. Of the 13 intents
scored at epoch 298, only FACT_CHECK (4), CONTENT_EXTRACTION (2), WEATHER_CHECK (2) and
LANGUAGE_TRANSLATION (1) appear. If Season II judges miners on demand again, our best-ranked intents
will get none from the missions.

## What to do differently in Season II

Miner judging rules for Season II are "published separately" and were not out on 2026-10-10. Re-read
them on the day they appear, and do not assume Season I's weights.

1. **Be registered and live before 1 Nov.** The timeline has miners pick their intents in Nov 1–7. We
   lost nine of fifteen days in Season I.
2. **Point the miner at mission demand.** Lead with WEB_SEARCH, FACT_CHECK and FINANCIAL_DATA, which we
   already serve and missions buy. Consider one of the five-mission intents we lack:
   CORPORATE_REGISTRY_LOOKUP, SANCTIONS_SCREENING_MATCH or REGULATORY_FILING_MONITOR. Check each one
   against the keyless and no-generative rules before building.
3. **Make answers usable by an app.** Keep the prose, add the fields: status, values, source, observed
   time. TXlens and Chainsight did both and still ranked. Write the manifest description the way
   TXlens wrote `/check-tx`, so the reviewer's summary describes the real miner.
4. **Get apps built on it.** Read the example builds for the missions that buy our intents, publish a
   recipe for exactly those calls, and support the teams that pick them up in the Nov 15–21 office
   hours. Apps built and requests served were two of the five Season I criteria.
5. **Fix what callers see before chasing scorer similarity.** The storm and forecast echo answers are
   79% of the traffic we serve today (§6).
6. **Keep the explorer page true.** Update the manifest `name` and `description` whenever the intent
   set changes. That page is what the reviewers open.
7. **Post on X from week one**, at a steady cadence of real findings, and reply under builders' posts.
   TXlens had 40× our reach. Oathcast placed with no requests at all.

## Close the unknowns before 1 Nov: ask the organisers

Only the organisers can settle the gaps below. Draft for the operator to send on Discord, or to
whoever answered the 2026-08-28/29 clarifications. Not sent.

> Hi team. Two questions before Season II.
> 1. Could you share how LiveCert (miner `livecert`, id 4433) scored in Season I Track 1, broken down
>    by criterion: ranking, apps built, requests served, and X? We'd like to know where we fell short.
> 2. For Season II miners:
>    - Will the same criteria apply, and with what weights?
>    - Is ranking taken across the whole season or at a closing epoch?
>    - For a miner serving many intents, is performance averaged over all of them or taken from its
>      best ones?
>    - Do requests from an app built by the miner's own author count towards "requests served"?

## Unverified, and why

| Claim | State |
|---|---|
| The exact Season I formula and weights | Not published. The totals cannot be rebuilt from on-chain ranking, so other inputs carried weight. Their split is unknown. |
| Our X engagement compared with the winners' | Measured: our three visible Telegraph posts and every account's follower count today (§3b). Not measured: the winners' posts during Aug 17–Sep 7, because logged-out X shows only their latest post. Compare those by hand while logged in. |
| Whether reviewers discounted self-generated volume or an author's own app | Unknown. |
| Whether the per-intent eligibility rule (≥3 miners and ≥100 Track 3 requests) was applied | Unknown. Not mentioned on the winners page. |
| Window-scoped request counts | From the explorer feed. Rows are paged by offset, deduplicated by id, with a 10-row overlap between pages. A few rows may be missing at page joins. |

## Re-running

```bash
# scores per epoch (all intents), paged by 500
curl -s "https://devnode.telegraphprotocol.com/scores?epoch=298&limit=500&offset=0"
# lifetime requests served, per miner
curl -s https://devnode.telegraphprotocol.com/api/miners      # field: total_requests_served
# feed rows, oldest first; routing.subnet_id is the stable miner id
curl -s "https://explorer.telegraphprotocol.com/api/daemon/api/questions?sort=recent&order=asc&since_hours=1360&limit=50&offset=0"
```
