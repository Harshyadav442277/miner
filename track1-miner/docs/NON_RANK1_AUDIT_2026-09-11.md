# Audit: the intents where we are not rank 1

Written 2026-09-11. Every number is read live from the node this session, at
**complete epoch 323**, across 26 registered intents on registration **1379**.
Nothing here is remembered and no rank is predicted.

> **This is not the judged record.** Track 1 is judged on epoch 298. Epoch 323 is
> the current operating picture, which is what you improve against. The two are
> different questions and this document answers the second one.

---

## 1. The board

Sixteen of 26 intents are not rank 1. `ratio` is our score over the field's best,
which is the quantity judging normalises on. `crossings` counts how many scored
rows in the visible history exceeded 0.5, which is what tells you whether the
intent has a reachable ceiling at all.

| intent | rank | miners | ratio | ours | leader | crossings / rows |
|---|---:|---:|---:|---:|---:|---:|
| SPORTS_SCORE | 4 | 4 | 0.000 | 0 | 2.2e-12 | 0 / 24 |
| FINANCIAL_DATA | 5 | 9 | 0.000 | 7.2e-27 | 2.9e-19 | 0 / 66 |
| ONCHAIN_TX_LOOKUP | 5 | 13 | **0.012** | 0.012053 | 0.995352 | **4 / 101** |
| WEATHER_CHECK | 7 | 12 | **0.026** | 0.015270 | 0.577403 | **3 / 78** |
| TVL_LOOKUP | 5 | 11 | 0.033 | 0.006088 | 0.182778 | 0 / 75 |
| CURRENCY_EXCHANGE | 4 | 8 | 0.045 | 2.0e-7 | 4.4e-6 | 0 / 61 |
| GAS_PRICE | 4 | 10 | 0.394 | 6.1e-12 | 1.6e-11 | 0 / 74 |
| RESEARCH_QUERY | 2 | 8 | 0.405 | 0.004710 | 0.011628 | 0 / 58 |
| FRAUD_DETECTION | 4 | 17 | 0.470 | 4.5e-14 | 9.6e-14 | 5 / 130 |
| LANGUAGE_TRANSLATION | 4 | 4 | 0.510 | 2.4e-10 | 4.8e-10 | 0 / 32 |
| ACADEMIC_SEARCH | 4 | 6 | 0.664 | 0.006713 | 0.010108 | 0 / 48 |
| AI_TEXT_DETECTION | 2 | 4 | 0.768 | 2.2e-10 | 2.8e-10 | 0 / 32 |
| WEATHER_FORECAST | 2 | 15 | 0.853 | 4.3e-4 | 5.0e-4 | 0 / 99 |
| CVE_LOOKUP | 2 | 6 | 0.922 | 7.9e-12 | 8.6e-12 | 6 / 45 |
| IP_GEOLOCATION | 3 | 6 | 0.998 | 0.995618 | 0.997130 | **37 / 41** |
| WALLET_BALANCE_CHECK | 6 | 10 | **1.000** | 0.999999 | 1.000000 | 18 / 70 |

## 2. The ratio column lies about most of these

Twelve of the sixteen sit in fields where **nobody has ever crossed**: zero rows
above 0.5 across the whole visible history. In those, both our score and the
leader's are third-decimal or exponential noise, the ordering reshuffles every
epoch on which hidden question the daemon happened to ask, and a "ratio of 0.394"
describes 6.1e-12 against 1.6e-11. Engineering does not move that. It is a
lottery over question selection.

So the sixteen sort into four groups, and only one of them is work.

### Group A — a real loss in a crossable field. **Two intents. This is the work.**

| intent | what the number means |
|---|---|
| **ONCHAIN_TX_LOOKUP** | The field crosses (4 of 101 rows above 0.5) and the leader is at **0.995** while we sit at **0.012**. That is not noise: 0.012 is the partial-receipt band this repo measured in G88, and the leader is on the other side of the cliff. The single largest recoverable gap on the board. |
| **WEATHER_CHECK** | Crossable (3 of 78), leader at **0.577**, us at **0.015**, rank 7 of 12. Same shape: somebody is answering a question we are answering differently. |

### Group B — decided at a decimal we cannot control. **Two intents. Leave them.**

| intent | what the number means |
|---|---|
| **WALLET_BALANCE_CHECK** | Ratio **1.000** and rank **6**. Ten miners are tied at the top and the order is set at the seventh decimal. We are not losing this; we are inside a tie. G72 already measured that our live answers beat the best recorded answer on 13 of 16 real questions. |
| **IP_GEOLOCATION** | Ratio **0.998**, rank 3, in the one genuinely crossable field on this board (37 of 41 rows cross). We are 0.15% behind. There is no defect to find at that margin. |

### Group C — noise-band fields. **Ten intents. Not engineering targets.**

SPORTS_SCORE, FINANCIAL_DATA, TVL_LOOKUP, CURRENCY_EXCHANGE, GAS_PRICE,
RESEARCH_QUERY, LANGUAGE_TRANSLATION, ACADEMIC_SEARCH, AI_TEXT_DETECTION,
WEATHER_FORECAST.

Zero crossings in every one. GAS_PRICE and FINANCIAL_DATA were entered against
the evidence and G92 records why; nothing has changed. TVL_LOOKUP is the one
worth watching, because its scorer is a **gradient** rather than a cliff, so
being better does score better there even without crossing.

### Group D — coverage gaps that are invisible in the ratio

The board above cannot see a refusal, because a refusal is one score in one
epoch. The routed-question replay can. Against production today:

| intent | answered | note |
|---|---|---|
| **FRAUD_DETECTION** | **2 / 17** | Every one of the 15 refusals has no address, URL or message in it, so the endpoint has nothing to check and returns `unknown`. |
| **FINANCIAL_DATA** | 7 / 14 | Speculative "will X happen" wording with no ticker or contract. |
| CVE_LOOKUP | 8 / 21 → **fixed today** | Six were year and severity surveys the endpoint refused by design. Now answered. |
| GAME_RESULT | 0 / 1 | One routed question, too small a sample to act on. |
| TELEGRAPH_KNOWLEDGE | 5 / 30 | **Correctly refusing.** The 25 are misroutes such as "Will Ukraine win the war?". Answering them would be the defect. |

A refusal scores in the 1e-11 band where an answer can cross, so Group D is worth
more than Group C even though Group C looks worse on the board.

## 3. What to do, in order

1. **ONCHAIN_TX_LOOKUP.** Find why we land at 0.012 while a competitor crosses at
   0.995. The band is diagnostic: 0.012 is the partial-receipt shape, so the
   question is which receipt field we are failing to carry. Highest value on the
   board.
2. **FRAUD_DETECTION coverage.** Fifteen refusals from one cause. The honest fix
   is to answer on what can be established and name what cannot, rather than
   refusing outright. It must not become speculation: the intent asks for a
   likelihood, and inventing one would be the thing A5 forbids.
3. **WEATHER_CHECK.** A leader at 0.577 in a crossable field, us at 0.015.
4. **FINANCIAL_DATA coverage**, same shape as 2 and same constraint.
5. **Nothing for Groups B and C.** Chasing a 0.15% gap or a 6.1e-12 field spends
   hours to move a number that reshuffles on its own next epoch.

## 4. Honest limits on this audit

- **Epoch 323 is one epoch.** One hidden question per intent decides each row, so
  a single epoch's rank is a noisy read of anything except the crossable fields.
- **`crossings / rows` is over the visible history only**, which is what
  `/scores` returns in the pages read here, not the whole record since epoch 1.
- **No ground truths.** G24 still holds: `/scores` has published no `question`,
  `ground_truth` or `converted_answer` since 2026-08-30, so nothing here explains
  *why* a leader crossed, only that they did.
- **Nothing in section 3 is a prediction.** Each item is a gap with a measured
  size, not a claim that closing it takes rank 1.
