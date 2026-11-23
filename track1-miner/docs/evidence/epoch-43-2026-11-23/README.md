# Epoch 43 (2026-11-23, scored 09:54–10:19 UTC): what was read and what changed

Source: `GET https://devnode.telegraphprotocol.com/api/miners` and `/scores?intent=…`, read 2026-11-23 ~10:25 UTC.
LiveCert, catalogue id 4433, production `5f28505` (`dpl_9pMfgpRecB1Cn116wHV5v8noi9wg`).

## LiveCert in epoch 43 (six intents scored)

| Intent | Score | Rank / field | Top |
|---|---|---|---|
| CURRENCY_EXCHANGE_CONVERT | 0.9967 | 3 / 17 | 0.9967 |
| SSL_VERIFICATION_CERT | 1.0 | 3 / 8 | 1.0 |
| STOCK_PRICE_US_EQUITY | 0.463 | 3 / 11 | 0.463 (nine-way tie) |
| CONTENT_EXTRACTION_GENERAL | **0** | 9 / 22 | 0.9989 (a1-preflight); 19 of 22 at 0 |
| WEATHER_CHECK_TEMPERATURE | 0.6583 | 13 / 17 | 1.0 (wx-openmeteo) |
| CRYPTO_PRICE_USD | 0.551 | 30 / 52 | 0.59 |

## CONTENT_EXTRACTION_GENERAL

- History for us: epoch 38 0, 39 0.9993, 41 0.9895, 42 0, 43 0. Epochs 38 and 39 ran on the same deploy, so the
  route passes or fails by test input.
- The scoring call (09:58:51 UTC) sent `fields` and `text`; their values are not logged and the capture store is
  off on production (no `KV_REST_*` variable), so the input is unknown.
- The `brief` schema (lifecycle restarted 2026-11-22 22:09 UTC): "The values the request asks for, as name: value
  pairs, at most 80 characters in all."
- Probe on production with `merchant, date, total`: brief `merchant: Acme Supplies Ltd; date: March 12, 2026`.
  The total was dropped, and its value was "$1,284.50, payable by 11 April 2026". The leader answered the same
  probe from patterns first and a model for the rest (its own `method` field).
- Coverage probe: 15 short texts with field names outside our patterns (`gate`, `blood type`, `CEO`,
  `servings`, `sentiment`…). The patterns found about 20 of 55 fields. "company: Dec" was wrong, and one text got
  "No structured values could be extracted" as its brief.

Changes, on branch `PR/epoch-43-miner-improvements-5d425b`:

1. `7e5a86f`: every requested field is briefed (long values are cut before a field is dropped); a money field
   is the amount; field names come from `fields` as sent; the mapper keeps the route's brief.
2. `5dc18fc`: a model reads the fields. A value counts only when every word and number in it appears in the
   text; judgement fields (sentiment, tone, category, language) are allowed up to four words. Without a model,
   the patterns answer as before. `/extract` lists Groq in the sources ledger.
3. `7277e16`: a month abbreviation is no longer read as a company.

Not verified: the model path runs only with `GROQ_API_KEY` (production only). Score effect unmeasured.

## WEATHER_CHECK_TEMPERATURE: no change

Comparator adapter r15 (question keys London, Karachi, Tokyo; tolerance 20 bps). We serve the nearest METAR
(integer °C); at 10:26 UTC that gave London 7, Karachi 31 and Tokyo 14, against Open-Meteo's 5.7, 30.7 and
10.3. Epochs 30–43: LiveCert beat wx-openmeteo in 6 epochs, tied in 2 and lost in 6 (means 0.764 and 0.786).
The leader changes between epochs (G330), so one epoch is no reason to switch sources.
