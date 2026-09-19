# Manifest comparison — the five `request-shapes` intents

Every competitor manifest below was read from its `yaml_url` in
`https://devnode.telegraphprotocol.com/api/miners` on 2026-09-19.
**No change was made to `track1-miner/miner.yaml`.** These are proposals with
the reason, and every one is second-order: the code fix in this lane already
reads the spellings a schema change would have prevented, and registration is
effectively immutable.

## What the field declares, against what we declare

| intent | livecert (reg 1408) | the competitors' spellings |
|---|---|---|
| GAME_RESULT | `team1`, `team2`, `query` | `sportwire-game-result`: **`team` (singular)**, `league`, `question`. `game-nhl-score`, `game-football-data`: no parameters at all — they dump a whole scoreboard. |
| CURRENCY_EXCHANGE | `from`, `to`, `amount`, `query` | `fxex-frankfurter`, `-jpy`, `-hist`: **`base` + `symbols`**, both `required`. `fxex-erapi-usd`: `base` as a **path** parameter. |
| TVL_LOOKUP | `address`, `protocol`, `chain`, `query` | `tvlwire-oracle`: `protocol` + `chain` (`param_map`). Same names as ours. |
| URL_SCAN | `url`, `query` | `netwire-url-scan`, `preflight`: `url`. `proofgate`: `url` in a POST body, `question` optional. Same name as ours. |
| WEATHER_CHECK | `location`, `lat`, `lon`, `days`, `hours`, `query` | `wx-openmeteo`, `open-meteo-wx`: `latitude` + `longitude`, both `required`. Both already read. (`weatherapi` and `openweathermap` publish their `yaml_url` on `http://127.0.0.1:8099`, which is not reachable from here, so their spellings are unread.) |

Only two rows carry a spelling we did not read, and both were confirmed against
production rather than inferred (see `*/shapes.txt`).

## The two changes I would propose

### 1. GAME_RESULT — declare a single `team`

`sportwire-game-result` declares `team` singular with the worked example "Who
won the Knicks game?", and crossed at 0.984 in epoch 342 while we scored 2.2e-3.
A request-builder that has seen that schema writes `team`. Ours declares only a
pair, so a one-team question had nowhere to go.

```yaml
# endpoints[] -> /game-result -> params.query.optional
  - name: team
    type: string
    intents: ["*"]
    description: >-
      One team, when the question asks about that team's own last game rather
      than a named fixture, e.g. Yankees. Use team1 and team2 instead when the
      question names both sides.
  - name: league
    type: string
    enum: [nba, wnba, nfl, mlb, nhl, epl, laliga, bundesliga, seriea, ligue1, ucl, uel, mls]
    description: >-
      The competition, when the question names one. Only needed to tell apart a
      club name that exists in more than one league, such as Rangers.
```

### 2. CURRENCY_EXCHANGE — name `symbols` as an accepted spelling of `to`

Three miners in this intent's field declare `base` + `symbols` as **required**,
which is the Frankfurter API's own vocabulary. We read `base` and not `symbols`,
so `base=USD&symbols=JPY` answered with the USD/EUR rate — the wrong pair, at
0.000000 against the right answer under champion reg2945.

```yaml
# endpoints[] -> /convert -> params.query.optional
  - name: to
    type: string
    intents: ["*"]
    description: >-
      ISO 4217 code of the currency being converted to, e.g. EUR. Also accepted
      as `symbols` or `quote`, and as a currency name such as "yen". Read from
      the question when absent.
```

## Declared but unread, and read but undeclared

- **Read, not declared.** `/tvl` reads `project`, `name`, `network` and (now)
  `slug`; `/convert` reads `from_currency`, `base`, `quote`, `target` and the
  rest of the family; `/url-scan` reads `link`, `domain`, `host` and (now)
  `website`, `target`, `target_url`, `site`, `page`; `/game-result` reads
  `home`, `away`, `team_a`/`team_b` and (now) `team_1`/`team_2`, `teamA`/`teamB`,
  `home_team`/`away_team`, `teams`, `match`, `fixture`, `event`, `team`, `club`.
  None of these is a promise the manifest makes, so reading them cannot mislead
  the engine; they exist because the engine writes them anyway.
- **Declared, not read.** None found in these five endpoints. `/weather-forecast`
  declares `location`, `lat`, `lon`, `days`, `hours`, `query` and the route reads
  all six.
- **The top-level `input_schema`** declares `query, q, domain, location, latitude,
  longitude, lat, lon, hours, forecast_hours, days, forecast_days, topic, ip,
  text, target_language, source_language` — and none of `team1`, `team2`, `from`,
  `to`, `amount`, `protocol`, `address`, `chain` or `url`, although each endpoint's
  own `params` block declares them. The same contradiction the ONCHAIN lane
  recorded for `hash` and `chain` applies to all five of these intents.
