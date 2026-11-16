# WEATHER_FORECAST_VERIFY holdout: freeze note (written 2026-11-16, before any answer to these queries was read)

Family `WEATHER_FORECAST_VERIFY_GENERAL`, class judgment, read live 2026-11-16 from
`/engine/v1/intents/WEATHER_FORECAST_VERIFY_GENERAL`. Request: `location`, `date` (a past date). Only `temp_max_c`
(recorded high, degrees Celsius) is scored.

## Truth sources (checked 2026-11-16)

| Source | Role | Licence, as stated on its own page |
|---|---|---|
| GHCN-Daily TMAX, NOAA Open Data Dissemination bucket (`noaa-ghcn-pds`, `csv.gz/by_station`) | primary | AWS Registry of Open Data, noaa-ghcn: "NOAA data disseminated through NODD is made available under the Creative Commons 1.0 Universal Public Domain Dedication (CC0-1.0) license" |
| Open-Meteo archive (ERA5), `archive-api.open-meteo.com` | cross-check of labels only, never training data | open-meteo.com/en/terms: "You accept to the CC-BY 4.0 licence"; the free API is for non-commercial use only |
| Open-Meteo geocoder (GeoNames data) | coordinates of the named place | geonames.org/about.html: "This work is licensed under a Creative Commons Attribution 4.0 License"; Open-Meteo's geocoding page asks for the line "Location data based on GeoNames" and marks the API non-commercial |

Station rule: from the geocoder's coordinates, stations with a TMAX inventory covering the year, within 25 km,
elevation within 150 m of the geocoded elevation (when both known), nearest first, at most 5; the first with an
unflagged TMAX (Q_FLAG blank) on that date supplies the value.

## Queries

Seeded (`make_queries.py`, seed 20261116). Hand-written place lists (`places.py`) over seven climate groups, one group of
qualified ambiguous names ("Paris, Texas, United States") and 42 bare names shared by several places ("Springfield").
Up to 3 random dates per place between 2019-01-01 and 2026-09-30. A query is drawn only when ground truth exists (a GHCN
station value and an ERA5 value within 3.0 degC of each other, at least one candidate place for bare names). That is a
filter on truth, not on any miner answer. The question text is the same template for all:
`What was the high temperature in <place> on <date>?`, sent with structured `params` `location` and `date`.
Pilot places (Reykjavik, Nairobi, Denver) and pilot dates are excluded.

Drawn: 678 queries from 243 places (304 listed; 61 skipped: 12 the geocoder could not match, 48 with no date that had
consistent truth, 1 bare name with one candidate; `truth.json` lists them). By group: temperate 122, ambiguous bare
names 121, disambiguated 109, continental 106, tropical 75, arid 72, cold or high 54, mediterranean 19. By year 2019 to 2026:
87, 84, 82, 107, 101, 101, 75, 41. All 12 months are present (45 to 72 each). `truth.json` holds the truth per candidate
place (written before capture; no miner answer read).

## Label rule (fixed before labelling)

For an answer with a numeric `temp_max_c = a`, and for each candidate place with both truths (GHCN `g`, ERA5 `e`):

- **right**: `|a-g| <= 1.5` and `|a-e| <= 1.5` for at least one candidate;
- **wrong**: every candidate has both truths and `|a-g| >= 3.0` and `|a-e| >= 3.0` for every candidate;
- otherwise **dropped** (near miss, or truth sources disagree).

Answers with no numeric `temp_max_c` (null, absent, a text-only answer), transport errors, non-200 responses, non-JSON
bodies and error pages are **report-only** (`report_only.json`), never gated. Our own miner (`livecert`) is never a side.
Miners that share one backend (`zk-wxrecord`, `zk-wxobs`, `chainsight-oracle`: identical values in the pilot) count as one.
`counterproof-weather-verify` is owned by the champion's author (`0x8d1a7ca0...`): a pair using it is flagged
`champion_author_service`.

Wrong kinds, from the nearest deviation `d`: `unit_fahrenheit`, `out_of_range` (outside -90..60), `near_wrong` (d < 8),
`far_wrong` (d < 20), `gross_wrong`.

## One pair per query

`chosen` is a right answer, `rejected` a wrong answer, each picked by lowest `sha256("wfv-holdout-v1|<query id>|<role>|<slug>")`.
No model score is used. Prompt: the question text. Answer: the response fields `location, date, temp_max_c, temp_min_c,
precipitation_mm, condition` found in the body, as compact JSON in that key order (a missing key is omitted). Rendered by
the harness as `### Task:\n{prompt}\n\n### Answer:\n{answer}`.

Unverified: how the node renders a structured request and a response into `prompt` and `answer` (GAPS G67 is not in this
repository). A raw-body variant and a `location:`/`date:` prompt variant are measured as report-only sensitivity checks.
