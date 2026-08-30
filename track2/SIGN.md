# SIGN — current list

Reload the console page before each one and confirm the intent chip. Check the hash. Sign.

**Never re-register a file that already has a registration id** — those bytes are bound on chain
and the transaction will not go through. If a candidate is rejected for the *time budget*, use a
fresh-byte variant from the same intent's list below rather than the same file again.

**No embedded intent** (console chip is the only thing deciding): `gas_price_v3`,
`game_result_v3`, `fraud_detection_v5c`, `fraud_detection_v5d`.

All links share this prefix:

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/b107a9d617996b23b91f260909d23443d04af51c/track2/calibration/dist/
```

---

## FRAUD_DETECTION — bar 0.9985664

The v2_tight bytes are already bound by registration 1880, which is why the wallet refuses them.
These two are the same calibration with different band coefficients, so different bytes.

| file | predicted | hash |
|---|---:|---|
| `fraud_detection_v5c.wasm` | 0.99989 | `cb1c9638eb519b54e78704ac95414b95acb28dc37612b7fa4e3de73a90a41e28` |
| `fraud_detection_v5d.wasm` | 0.99990 | `d19653d268957db76e898340d7330b48421d8af3360f5ae51716c58191812ea7` |

## LANGUAGE_TRANSLATION — bar 0.79987115

`v4b` pushes toward the 12-of-15 ceiling of 0.8. The `s0xx` sweep tests whether any threshold
between 0.67 and 0.80 separates a **thirteenth** pair, which is the only way past that ceiling —
if one lands, the margin jumps to about 0.867 and the intent stops being a fifth-decimal race.

| file | threshold | predicted | hash |
|---|---:|---:|---|
| `language_translation_v4b.wasm` | 0.65 | 0.79997 | `ccee37687f1d74f56776a20690ffd41c202d34e92315dfbb5e8f4e99996146db` |
| `language_translation_s067.wasm` | 0.67 | 0.867 or reject | `1baa3f9ff24703e40bc82ca313531a0a87a930b145ab27d1aba99a1ef3b4d113` |
| `language_translation_s070.wasm` | 0.70 | 0.867 or reject | `81b9174996fb64155f0ac65317abe1b090cdcbd286e0ac77ab8349d687335e95` |
| `language_translation_s073.wasm` | 0.73 | 0.867 or reject | `2c3ddd3b8893b6c98b483bbb499ad8235555652f05b5d866adfd28d2bc524cae` |
| `language_translation_s076.wasm` | 0.76 | 0.867 or reject | `892783c0532c685749efcd4d2b16e89b587bb8ea576e6f0f7941bae613d59a67` |
| `language_translation_s080.wasm` | 0.80 | 0.867 or reject | `f70dd144cf012662bd234f28418adaae53504e57866c7e5aff8cd805ba8cc0cc` |

## Batch A — fourteen intents (small files first, they cannot time out)

| intent | file | bar | predicted | hash |
|---|---|---:|---:|---|
| GAS_PRICE | `gas_price_v3.wasm` | 0.956681 | ~0.999 | `e403c52a4b1f39313a78cd20e06999414d4e1209c093ba536ee75356944076da` |
| GAME_RESULT | `game_result_v3.wasm` | 0.696804 | ~0.733 | `c8ba0eea3206cc842584f6cc2dbf2749c59cf4a860a095f90dacacc4812032be` |
| URL_SCAN | `url_scan_v3.wasm` | 0.948086 | ~0.999 | `bbc2a7422be8ae601e3374bfb8e5bb6818acdb099a5181ac9736d58bb77c3751` |
| CVE_LOOKUP | `cve_lookup_v3.wasm` | 0.972868 | ~0.999 | `e2cc66fa1625e65705cb93e502feeea0f1c031e8661c389cb103197982efd2a2` |
| CRYPTO_PRICE | `crypto_price_v3.wasm` | 0.712698 | ~0.733 | `7499d2e251373d7fc6cbde4df93f1ffc0ee735bf5f044c05f67b38b9a9a70103` |
| STORM_ALERT | `storm_alert_v3.wasm` | 0.937198 | ~0.999 | `a633bb31183207be1bf85bbe555a1763d9d2a592273020cc23a3d964fa05c719` |
| TASK_COMPLETION | `task_completion_v3.wasm` | 0.954073 | ~0.999 | `17b5a79361502586f992e7b9c4687b316c169feaafa71e08e128046e2e042cda` |
| WEB_SEARCH | `web_search_v3.wasm` | 0.883655 | ~0.933 | `e153df4a5b2e36474e0d3330f06ebabdab8575e6e99b8f3177110cbe6f1b6f83` |
| ACADEMIC_SEARCH | `academic_search_v3.wasm` | 0.701042 | ~0.733 | `5f2a233ede9c9cf373a6cbd9d12f9b77dbd93da134919bd07a46d1bb393c9e66` |
| CONTENT_MODERATION | `content_moderation_v3.wasm` | 0.970443 | ~0.999 | `3673120c1ddbf6e5a1c263d7f4079ab93732dcdd68c509e4e50d971816025fe0` |
| TEXT_GENERATION | `text_generation_v3.wasm` | 0.970443 | ~0.999 | `c29947eca2cddb2c893a4165bd24732e78322383399689c8429cd06501d8f249` |
| TELEGRAPH_KNOWLEDGE | `telegraph_knowledge_v3.wasm` | 0.970443 | ~0.999 | `532e6e555b5883c9d934f1f6dc863ed1639bff9784a78e8c0c96fce4ce255bf1` |
| IMAGE_VERIFICATION | `image_verification_v3.wasm` | 0.970443 | ~0.999 | `a493a75fe00164b6570aa49c25febf8cab3dd29c618a1fb6323303189d9780aa` |
| RESEARCH_QUERY | `research_query_v3.wasm` | 0.990008 | ~0.999 | `60a869c34dd68badb4f748715506620e07fcdc1060c0c9e9b099e8b867e9e3f2` |

## Batch B — eleven more intents

| intent | file | bar | predicted | hash |
|---|---|---:|---:|---|
| WEATHER_CHECK | `weather_check_v3.wasm` | 0.981686 | ~0.999 | `3c2e6d53a1b390e5b57f09f93fe5c1a199576b7fe39cd7817b98b8902c6227a7` |
| TOKEN_HOLDER_COUNT | `token_holder_count_v3.wasm` | 0.989908 | ~0.999 | `af42b0b805d8d3bc92c80f8510eda1d9300ed93dd0d43b08327b8988ed9eeaf3` |
| CONTENT_VERIFICATION | `content_verification_v3.wasm` | 0.990414 | ~0.999 | `ae07231c53a3edc96695cb6414dad42c7ff32a5cf281cafc7d37d872df3474c7` |
| NEWS_SEARCH | `news_search_v3.wasm` | 0.990486 | ~0.999 | `89d45e29f170e9f43a4a07c3d177717421f73fb9ec789534875175250fb27dd3` |
| WEATHER_FORECAST | `weather_forecast_v3.wasm` | 0.990566 | ~0.999 | `46bb77599b38a449c58449ca09e5861f5758a59cce8a15ec4c8b93d8c84a1f96` |
| CHAT_COMPLETION | `chat_completion_v3.wasm` | 0.899149 | ~0.933 | `9273df6996ee4b00aaa866184dc0a3cefb418af51ff8c6e96c46ffe8cc5e54cd` |
| LANGUAGE_GENERATION | `language_generation_v3.wasm` | 0.914006 | ~0.933 | `77117d96fa3e3c013db84743b9ad765d67896da3f78754aeca8d2588a25bd961` |
| SSL_VERIFICATION | `ssl_verification_v3.wasm` | 0.923542 | ~0.933 | `6795b18ddaa7e664aca742f75b1e575bd272c657e847319893554b6669d864c6` |
| IP_GEOLOCATION | `ip_geolocation_v3.wasm` | 0.924526 | ~0.933 | `35a34c1dac887a58e5840618d951ce6ae9ff756607489cb6ee13306c10e25ea8` |
| AGENT_TASK | `agent_task_v3.wasm` | 0.887931 | ~0.906 | `64379dbb547a00da93a7e5dd60d7b5f849b08df2a06359999ba79bc6ec4af904` |

## Screened and dropped

- **FACT_CHECK** — `fact_s01` emits only 0.0 and 1.0. It is already an exact binariser at 13 of 15
  and no calibration can move it. Its apparent headroom was a rounding artefact.
- **TEXT_CLASSIFICATION, DEEPFAKE_DETECTION, AI_TEXT_DETECTION** — champions at margin 1.000000.
- **STOCK_PRICE, TVL_LOOKUP** — champion binaries are IPFS-pinned and not in the MIT repository, so
  there is no licence to fork from.

## Already held

- **TEXT_AUTHENTICITY_CHECK**, registration 1882, margin 0.66666603 against a ceiling of 0.6666667.

## Do not register again

`crypto_price.wasm`, `tvl_lookup.wasm`, `onchain_tx_lookup.wasm` — our own hand-built scorer
(registrations 1877–1879). It ranks 13–14 of 15 pairs where the champion ranks 15, and ordering is
checked before margin, so it cannot win those intents.

## After each one

Send back `candidate_margin`, `candidate_wins`, `comparable_cases` and `champion_margin`.

Method: [calibration/STEP_CALIBRATION.md](calibration/STEP_CALIBRATION.md).
