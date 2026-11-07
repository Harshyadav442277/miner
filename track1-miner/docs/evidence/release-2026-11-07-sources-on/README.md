# Release 2026-11-07 ~18:35 UTC (Nov 8 00:05 IST): barred sources answer again; registration 5123 — `fa4f954`

The owner said "start working on deploy part" (2026-11-07), following "I'm not doing their commercial use. It's on
testnet currency."

| | |
|---|---|
| Build commit | `fa4f954` on branch `claude/n1-v2-ids`. It is `fc041f4`, the gate off with the four intents back, plus three fixes found on the preview (below) |
| Previous production | `3f33508`, `miner-eh2uav8mu` |
| Preview | `fc041f4`: `miner-85631likj`. `fa4f954`: `https://miner-gqwdgerg9-wukong4.vercel.app`, `dpl_8AE9aJntqAMmGF9GzQH4X3gLCrhc` |
| Production | `https://miner-56hisxeau-wukong4.vercel.app`, `dpl_HqN2jr1ddD8frUMXi1esvTtxpA1e`. `promote` answered 409 "already current", and `vercel inspect miner-wine.vercel.app` names this deployment |
| Rollback target | `https://miner-eh2uav8mu-wukong4.vercel.app` (`dpl_5tARoxt3vuzowzZ98skdve4kBtJF`, `3f33508`) |
| Unit | 914/914 |

## What changed for buyers

| Route | Before (`3f33508`) | After (production) |
|---|---|---|
| /ip-geolocate, /headlines, /news-search, /stock-price, and /financial for coins and equities | `not_licensed` refusal | real answers. For example: Apple $342.37 (NasdaqGS); Nvidia news from The Verge, 7 Nov; 142.251.42.174 placed in New Haven by ip-api |
| /web-search, current news | answered from background only | dated news reports |
| /headlines answer | "… are: 1." (the lead sentence stopped at the list number) | the numbered headlines |
| `licensing` block | barred upstreams marked `called: false` | `called` dropped while the gate is off, because they are called |

## Gates

| Gate | Result | Note |
|---|---|---|
| unit + live suite | PASS | |
| verify-deploy | FAIL, then PASS | The check still expected 8.8.8.8 to be refused as `not_licensed`. It now expects `anycast` with Google named. Re-run alone: "ALL CHECKS PASSED" (`verify-deploy-rerun.txt`) |
| param shapes | PASS | |
| intent answers | PASS | Its IP check now proves from the receipt that ip-api answered, instead of pinning Tokyo; Google's geofeed moved that address |
| hostile inputs, upstream health, no-regression (8 identical) | PASS | |

`availability.jsonl`: 38 of 38 routes up, and none refused (before: 6 refusing).

## Registration

The owner signed the update before this deploy. 5122 (registered 04:11 UTC) and 5123 (04:24 UTC) both use the
YAML at `fc041f4` with 39 intents; 5123 is `active` and 4829 and 5122 are `superseded`. `watch.txt`: 5123 `active`,
359 ms, 18:37 UTC.

The repository variable `REGISTRATION_ID` is now 5123 (it was 4829), and so are `tools/mission-matrix.mjs`, the
release skill and the README.

**Gap:** from 04:24 to about 18:35 UTC, registration 5123 claimed IP_GEOLOCATION, NEWS_HEADLINES, NEWS_SEARCH and
STOCK_PRICE while production (`3f33508`) refused all four.

## Not checked

- Rate limits under load: the owner judged the free tiers to be enough. ip-api's free tier is HTTP only.
- Rank effects: the next epochs will show them.
