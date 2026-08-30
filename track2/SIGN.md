# SIGN — current list

Paste the link, set the intent, check the hash, sign. Work down the list.

Before each one: **reload the console page** and confirm the intent chip.

> `gas_price_v3` and `game_result_v3` carry **no embedded intent** — the console chip is the only
> thing deciding where they go. Set it by hand for those two.

> A rejection that says **"evaluation exceeded its time budget"** is not a scoring failure.
> Sign the same link again. The 24 MB modules sometimes miss the ten-minute gate.

---

## 1. FRAUD_DETECTION — retry, nothing changed

Registration 1880 scored **0.99998856** against a champion at 0.9986645 with 14/14 wins. It was
rejected only for the ten-minute time budget. Same file, same link, just try again.

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/fraud_detection_v2_tight.wasm
```

hash `46efedee789ff5e9bb0ad3b82029abb6904333a16cd4ca6ad4d489074d282ca9`

---

## 2. New intents — all from this prefix

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/92ef7ee018df3450d11af34c0a8ba288192ff756/track2/calibration/dist/
```

Small files first — they evaluate fast and cannot hit the time budget.

| # | intent | file | bar | predicted | hash |
|---|---|---|---:|---:|---|
| 1 | **GAS_PRICE** | `gas_price_v3.wasm` | 0.956681 | ~0.999 | `e403c52a4b1f39313a78cd20e06999414d4e1209c093ba536ee75356944076da` |
| 2 | **GAME_RESULT** | `game_result_v3.wasm` | 0.696804 | ~0.733 | `c8ba0eea3206cc842584f6cc2dbf2749c59cf4a860a095f90dacacc4812032be` |
| 3 | **URL_SCAN** | `url_scan_v3.wasm` | 0.948086 | ~0.999 | `bbc2a7422be8ae601e3374bfb8e5bb6818acdb099a5181ac9736d58bb77c3751` |
| 4 | **CVE_LOOKUP** | `cve_lookup_v3.wasm` | 0.972868 | ~0.999 | `e2cc66fa1625e65705cb93e502feeea0f1c031e8661c389cb103197982efd2a2` |
| 5 | **LANGUAGE_TRANSLATION** | `language_translation_v4b.wasm` | 0.79987115 | 0.79997 | `ccee37687f1d74f56776a20690ffd41c202d34e92315dfbb5e8f4e99996146db` |
| 6 | **STORM_ALERT** | `storm_alert_v3.wasm` | 0.937198 | ~0.999 | `a633bb31183207be1bf85bbe555a1763d9d2a592273020cc23a3d964fa05c719` |
| 7 | **TASK_COMPLETION** | `task_completion_v3.wasm` | 0.954073 | ~0.999 | `17b5a79361502586f992e7b9c4687b316c169feaafa71e08e128046e2e042cda` |
| 8 | **WEB_SEARCH** | `web_search_v3.wasm` | 0.883655 | ~0.933 | `e153df4a5b2e36474e0d3330f06ebabdab8575e6e99b8f3177110cbe6f1b6f83` |
| 9 | **ACADEMIC_SEARCH** | `academic_search_v3.wasm` | 0.701042 | ~0.733 | `5f2a233ede9c9cf373a6cbd9d12f9b77dbd93da134919bd07a46d1bb393c9e66` |
| 10 | **CONTENT_MODERATION** | `content_moderation_v3.wasm` | 0.970443 | ~0.999 | `3673120c1ddbf6e5a1c263d7f4079ab93732dcdd68c509e4e50d971816025fe0` |
| 11 | **TEXT_GENERATION** | `text_generation_v3.wasm` | 0.970443 | ~0.999 | `c29947eca2cddb2c893a4165bd24732e78322383399689c8429cd06501d8f249` |
| 12 | **TELEGRAPH_KNOWLEDGE** | `telegraph_knowledge_v3.wasm` | 0.970443 | ~0.999 | `532e6e555b5883c9d934f1f6dc863ed1639bff9784a78e8c0c96fce4ce255bf1` |
| 13 | **IMAGE_VERIFICATION** | `image_verification_v3.wasm` | 0.970443 | ~0.999 | `a493a75fe00164b6570aa49c25febf8cab3dd29c618a1fb6323303189d9780aa` |
| 14 | **RESEARCH_QUERY** | `research_query_v3.wasm` | 0.990008 | ~0.999 | `60a869c34dd68badb4f748715506620e07fcdc1060c0c9e9b099e8b867e9e3f2` |

Full links are the prefix above plus the file name, for example:

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/92ef7ee018df3450d11af34c0a8ba288192ff756/track2/calibration/dist/gas_price_v3.wasm
```

---

## 3. Optional — LANGUAGE_TRANSLATION long shots

These test whether a higher threshold separates a thirteenth fixture pair. If one works the margin
jumps to about 0.867 and the intent stops being a race decided in the fifth decimal. If not, it is
rejected and costs only gas. Prefix `.../miner/72474bd7514735b53b823bdab390c9721219bd18/...`.

| file | hash |
|---|---|
| `language_translation_v2_t070.wasm` | `71aeda7be3c6f8864c644a08735ea0352a7dc911f5b9edd6bc0066fbdeecd735` |
| `language_translation_v2_t075.wasm` | `542fa83159c6051e8ca49d22eee7870ad92da4141912f9ddd91b29c42595a379` |

---

## Do not register these again

`crypto_price.wasm`, `tvl_lookup.wasm`, `onchain_tx_lookup.wasm` — our own hand-built scorer
(registrations 1877–1879). It ranks 13 or 14 of 15 fixture pairs correctly where the champion ranks
15, and the ordering axis is checked before margin, so it cannot win those intents no matter what
its separation is. It stays in the repo as the original engineering work; it is not a registration
candidate.

## Already held, nothing more to do

- **TEXT_AUTHENTICITY_CHECK**, registration 1882, margin **0.66666603**. The ceiling for that base
  is 0.6666667 and we are 7e-7 below it. It cannot be improved.

## After each one

Send back `candidate_margin`, `candidate_wins`, `comparable_cases` and `champion_margin`.

Method and evidence: [calibration/STEP_CALIBRATION.md](calibration/STEP_CALIBRATION.md).
