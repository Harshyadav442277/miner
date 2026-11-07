# Release 2026-11-06 ~22:50 UTC (Nov 7 04:20 IST): quality fixes from the audit replay — `bee3f6a`

Owner, 2026-11-06: "take all the required actions, required for winning. focus on improving quality of present
intents as well." Read as the yes for this release.

| | |
|---|---|
| Build commit | `bee3f6a` on `codex/rank1-14-intents` (fast-forward from `claude/hackathon-quality-focus-2e9d6e`) |
| Preview | `https://miner-r7mg81mq0-wukong4.vercel.app` (a first preview of `33bec31`, `miner-n7eqef41f`, was rejected: see below) |
| Production | `https://miner-beo9nyatq-wukong4.vercel.app`, `dpl_BzBqpAUR5YJTNwdp78YFaGekwGe2`; alias `miner-wine.vercel.app` moved (promote 409 = already current) |
| Rollback target | `miner-p429gtksx-wukong4.vercel.app` (`192aecc`) |
| Unit tests | 914/914 in the deploy tree `C:\Users\hyada\tg-deploy\mbee3f6a` |
| Registration | 4829 `active`, 473 ms (`watch.txt`). Unchanged: nothing signed |

## What changed for buyers (each from a row of `../audit-replay-2026-11-04/` or a live probe)

| Route | Before | After (production, `prod-probes.txt`) |
|---|---|---|
| /ssl-check, a name that does not exist | an openssl how-to | "amaz0n-login.ru does not resolve in DNS, so it serves no certificate." (confirmed with a direct DNS query; Vercel's lookup says EBUSY) |
| /weather-forecast, a threshold question | the day's whole range | "No: the forecast high for Riyadh over the next 24 hours is 31.7°C, below 40°C." |
| /company-registry, address and state asked | status first, address third sentence | address and state of incorporation first |
| /financial, a figure it cannot give | named in a later sentence | named in the first sentence, with the reason |
| /financial, one product's sales | company revenue, unannounced | says product sales are not in filed figures before giving company revenue (G200) |
| /extract, counted goods | "No quantities" for 1,200 units, 35 pallets, 4.5 tonnes | all three (G252) |
| /fraud-check, an empty unused address | "elevated risk" | `no_indicators`, "no history to judge either way"; every risk lead names its reason |
| /event-outcome, finished event with no market | "no market found" | the winner recorded on the event's Wikidata item (CC0), with the item link; Super Bowl LX: Seattle Seahawks |
| /event-outcome, a market winner | "Spain won." | "Spain won, according to the settled Polymarket market …" |
| outage messages | named the whole question as the place (G251) | name only a parsed subject |
| /onchain-metric | not deployed | Codex's `6aebe0f`, now served; not registered until the updateMiner is signed |

**Tried and withdrawn:** classifying a topic question with no labels against a default news-section set. On the
`33bec31` preview it labelled "NASA confirms water ice on the Moon" as environment, so it was reverted
(`preview-probes-33bec31-rejected.txt`); such a question is still refused with a request for labels.

## Gates

| Gate | Result | Note |
|---|---|---|
| unit + live suite | PASS | |
| verify-deploy | PASS | |
| param shapes | PASS | |
| intent answers | 38/39 on re-run | First run failed on coverage: the 4 retired intents still had checks. `tools/manifest.mjs` now names them in `RETIRED_INTENTS` (they stay registered and served until the signature). Re-run: MACRO_ECONOMIC_INDICATOR failed because markets.newyorkfed.org redirected every API call to `/errors/500` at 22:55 UTC; the rollback target gives the same answer, so it is upstream, not this release |
| hostile inputs | PASS | |
| upstream health | PASS | |
| no-regression | PASS (8 identical) | |

Files: `preflight.txt`, `intent-answers-rerun.txt`, `watch.txt`, `preview-probes.txt`, `prod-probes.txt`.
