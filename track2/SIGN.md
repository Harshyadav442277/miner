# SIGN — full links

## Registry status as of 2026-08-30 14:30Z (sweep of /api/wasm, all listed intents)

**Held (8), do not touch:** TEXT_AUTHENTICITY_CHECK 1882 · LANGUAGE_TRANSLATION 1996 (w1,
0.79999983, 1.7e-7 under the 0.8 ceiling) · CVE_LOOKUP 1993 (w2) · CRYPTO_PRICE 1994 ·
TASK_COMPLETION 1930 (m45) · TOKEN_HOLDER_COUNT 2017 (m45) · CONTENT_VERIFICATION 2020 (m45) ·
LANGUAGE_GENERATION 2010 (m45).

**Pending mid-eval (7):** CONTENT_MODERATION 2003, TEXT_GENERATION 2006, TELEGRAPH_KNOWLEDGE
2007, IMAGE_VERIFICATION 2008, RESEARCH_QUERY 2009, WEATHER_CHECK 2016, AGENT_TASK 2011 — all
m45 rungs. Six evals today ran 10.7–14.0 minutes and died on the 10-minute budget, so expect
some of these to fail on time, not on scoring. **Do not fire retries while these are queued** —
queue depth is what pushes evals over budget. One signature at a time, verdict first.

**Time-budget rejects — measured ABOVE the recomputed bar, retry with fresh bytes when the queue
is empty:** FRAUD_DETECTION 1995 (0.9999982 vs bar 0.99903214 — `fraud_detection_v5d` below is
still unsigned) · ACADEMIC_SEARCH 1999 (0.7971219 vs 0.7380757 — v3 rung below) ·
WEATHER_FORECAST 2023 (0.90904945 vs 0.90107095 — fresh `weather_forecast_r2` at commit
`b258753`) · SSL_VERIFICATION 2018 (0.9229354 vs 0.9140895 — v3 rung) · IP_GEOLOCATION 2022
(0.9229675 vs 0.91367656 — fresh `ip_geolocation_r2` at `b258753`).

**Real-traffic (Spearman) rejects — do NOT sign same-family rungs, they die the same way:**
GAS_PRICE 1914 (0.9995, 15/15, above bar — killed by tie-collapse/base mismatch on live rows) ·
NEWS_SEARCH 2021 (0.9997, 12/12, same) · STORM_ALERT 1997 (0.9332 vs 0.9224, same — and 1997
already wrapped the current champion, so the death is f32 ties on live rows; needs wider bands,
a rebuild, not a re-sign). GAS `m70` below is same-family: skip it.

**Separation rejects:** GAME_RESULT 1915 (0.4722 vs bar 0.560523) · URL_SCAN 1918 (0.9343 vs
0.94808555) · WEB_SEARCH 1929 (0.46991 vs bar 0.48149985 — fresh t-ladder
`web_search_t65/t80/t92` at commit `5546390`) · CHAT_COMPLETION 1998 (tied the bar exactly at
0.89914936 — margin must be strictly greater; v3 rung is a fresh chance).

**Burned rungs (bytes bound on chain, wallet will refuse):** fraud_detection_v5c=1912,
language_translation_v4b=1913, gas_price_m45=1914, game_result_m45=1915, url_scan_m45=1918,
cve_lookup_m45=1923, crypto_price_m45=1927, storm_alert_m45=1928, web_search_m45=1929, and every
m45 listed as held/pending/rejected above. The LANGUAGE_TRANSLATION `s067–s080` rungs remain
unsigned — free upside on a slot we already hold (a rejection cannot cost us reg 1996); fire
only after the retry queue drains.

Bars in the section headers below are from ~05:00Z and have drifted; the recomputed bars in this
block (from today's eval blocks) are the real ones. Reload the console and re-check before each
signature as always.

---

Reload the console page before each one and confirm the intent chip. Check the hash. Sign.

**Never re-sign a file that already has a registration id** — those bytes are bound on chain and the wallet will refuse. Use the other rung for that intent instead.

**No embedded intent** — the console chip alone decides where these land: `gas_price_*`, `game_result_*`, `fraud_detection_v5*`.

A rejection saying **"exceeded its time budget"** is not a scoring failure; sign the other rung.

## FRAUD_DETECTION — bar 0.9985664 (the v2 file is bound by reg 1880; these are fresh bytes)

**fraud_detection_v5c** — 0.99989

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/fraud_detection_v5c.wasm
```

hash `cb1c9638eb519b54e78704ac95414b95acb28dc37612b7fa4e3de73a90a41e28`

**fraud_detection_v5d** — 0.99990

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/fraud_detection_v5d.wasm
```

hash `d19653d268957db76e898340d7330b48421d8af3360f5ae51716c58191812ea7`

## LANGUAGE_TRANSLATION — bar 0.79987115 (v4b chases the 0.8 ceiling; s0xx hunt a 13th pair, worth ~0.867)

**language_translation_v4b** — 0.79997

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_translation_v4b.wasm
```

hash `ccee37687f1d74f56776a20690ffd41c202d34e92315dfbb5e8f4e99996146db`

**language_translation_s067** — 0.867 or reject

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_translation_s067.wasm
```

hash `1baa3f9ff24703e40bc82ca313531a0a87a930b145ab27d1aba99a1ef3b4d113`

**language_translation_s070** — 0.867 or reject

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_translation_s070.wasm
```

hash `81b9174996fb64155f0ac65317abe1b090cdcbd286e0ac77ab8349d687335e95`

**language_translation_s073** — 0.867 or reject

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_translation_s073.wasm
```

hash `2c3ddd3b8893b6c98b483bbb499ad8235555652f05b5d866adfd28d2bc524cae`

**language_translation_s076** — 0.867 or reject

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_translation_s076.wasm
```

hash `892783c0532c685749efcd4d2b16e89b587bb8ea576e6f0f7941bae613d59a67`

**language_translation_s080** — 0.867 or reject

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_translation_s080.wasm
```

hash `f70dd144cf012662bd234f28418adaae53504e57866c7e5aff8cd805ba8cc0cc`

## GAS_PRICE — bar 0.9723055 (threshold 0.10 measured 0.8076 at reg 1901, so these go higher)

**gas_price_m45** — ~0.97

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/gas_price_m45.wasm
```

hash `1bb762fe8c970f0edee30e884d28134698df1593a1277c52f654d875b357eeaa`

**gas_price_m70** — ~0.99

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/gas_price_m70.wasm
```

hash `47bb2d784add77db14a65b5d3f8e8f0ba9372559bd4b8ff5b2fc5ade11abef49`

## Everything else — sign the m45 rung first, the v3 rung only if m45 is rejected

**game_result_m45** — GAME_RESULT, bar 0.696804

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/game_result_m45.wasm
```

hash `76f4186ce7978f23e268f2fb181e17d53b4bb6a2872ee3e450dea8c2365f06ce`

**game_result_v3** — GAME_RESULT, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/game_result_v3.wasm
```

hash `c8ba0eea3206cc842584f6cc2dbf2749c59cf4a860a095f90dacacc4812032be`

**url_scan_m45** — URL_SCAN, bar 0.948086

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/url_scan_m45.wasm
```

hash `49aa24f8082e2ffa1755aefb250209ab5e1653b0049565c61e13ccf5198dc744`

**url_scan_v3** — URL_SCAN, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/url_scan_v3.wasm
```

hash `bbc2a7422be8ae601e3374bfb8e5bb6818acdb099a5181ac9736d58bb77c3751`

**cve_lookup_m45** — CVE_LOOKUP, bar 0.972868

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/cve_lookup_m45.wasm
```

hash `b5467a89a86af079a1d25e6a75a19c3ec57f78c2c13e460ef14f5d7c7018e58a`

**cve_lookup_v3** — CVE_LOOKUP, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/cve_lookup_v3.wasm
```

hash `e2cc66fa1625e65705cb93e502feeea0f1c031e8661c389cb103197982efd2a2`

**crypto_price_m45** — CRYPTO_PRICE, bar 0.712698

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/crypto_price_m45.wasm
```

hash `8708661806f3793c7894aa996d4a578292397949ef6f52d709689efeb9ed3ce9`

**crypto_price_v3** — CRYPTO_PRICE, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/crypto_price_v3.wasm
```

hash `7499d2e251373d7fc6cbde4df93f1ffc0ee735bf5f044c05f67b38b9a9a70103`

**storm_alert_m45** — STORM_ALERT, bar 0.937198

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/storm_alert_m45.wasm
```

hash `919244446b51d78a83ecc276602377ad87827a93ffae8b8c5a6347855f53f888`

**storm_alert_v3** — STORM_ALERT, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/storm_alert_v3.wasm
```

hash `a633bb31183207be1bf85bbe555a1763d9d2a592273020cc23a3d964fa05c719`

**task_completion_m45** — TASK_COMPLETION, bar 0.954073

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/task_completion_m45.wasm
```

hash `7784e58585639f4ae2adf6207bc588f1a8a5ac8c72b174e23b71e8b35dc15f90`

**task_completion_v3** — TASK_COMPLETION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/task_completion_v3.wasm
```

hash `17b5a79361502586f992e7b9c4687b316c169feaafa71e08e128046e2e042cda`

**web_search_m45** — WEB_SEARCH, bar 0.883655

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/web_search_m45.wasm
```

hash `e8258e9730e3bd81b99b0b86f8f0c58944739ab95de9cf29dc448efb6b9a87d2`

**web_search_v3** — WEB_SEARCH, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/web_search_v3.wasm
```

hash `e153df4a5b2e36474e0d3330f06ebabdab8575e6e99b8f3177110cbe6f1b6f83`

**academic_search_m45** — ACADEMIC_SEARCH, bar 0.701042

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/academic_search_m45.wasm
```

hash `37d4a74c40c932b5c67e5e9e505fdd23cfac23154cf44fedce6afb788d8f5c47`

**academic_search_v3** — ACADEMIC_SEARCH, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/academic_search_v3.wasm
```

hash `5f2a233ede9c9cf373a6cbd9d12f9b77dbd93da134919bd07a46d1bb393c9e66`

**content_moderation_m45** — CONTENT_MODERATION, bar 0.970443

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/content_moderation_m45.wasm
```

hash `96274475e7aa98dfd1a1a176679fe74ac085f094ee6dcdf291834dcb36828be8`

**content_moderation_v3** — CONTENT_MODERATION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/content_moderation_v3.wasm
```

hash `3673120c1ddbf6e5a1c263d7f4079ab93732dcdd68c509e4e50d971816025fe0`

**text_generation_m45** — TEXT_GENERATION, bar 0.970443

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/text_generation_m45.wasm
```

hash `f4107d22d03a7c27f286f255c55913e7b1e1732ac46a581e0d68ec2313258a48`

**text_generation_v3** — TEXT_GENERATION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/text_generation_v3.wasm
```

hash `c29947eca2cddb2c893a4165bd24732e78322383399689c8429cd06501d8f249`

**telegraph_knowledge_m45** — TELEGRAPH_KNOWLEDGE, bar 0.970443

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/telegraph_knowledge_m45.wasm
```

hash `e06f039a5b7b92f79a139fb99b85c18d9a725ec844cbc8752a66140a2e598ba4`

**telegraph_knowledge_v3** — TELEGRAPH_KNOWLEDGE, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/telegraph_knowledge_v3.wasm
```

hash `532e6e555b5883c9d934f1f6dc863ed1639bff9784a78e8c0c96fce4ce255bf1`

**image_verification_m45** — IMAGE_VERIFICATION, bar 0.970443

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/image_verification_m45.wasm
```

hash `cd70f5a37675a44922530e02169e4cfd444fc5ea0b8b6d06fc9d706e9d791048`

**image_verification_v3** — IMAGE_VERIFICATION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/image_verification_v3.wasm
```

hash `a493a75fe00164b6570aa49c25febf8cab3dd29c618a1fb6323303189d9780aa`

**research_query_m45** — RESEARCH_QUERY, bar 0.990008

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/research_query_m45.wasm
```

hash `d91e15d454962f3934487f5ccb6805534a865d37d32a2633d731ffd0a45e4745`

**research_query_v3** — RESEARCH_QUERY, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/research_query_v3.wasm
```

hash `60a869c34dd68badb4f748715506620e07fcdc1060c0c9e9b099e8b867e9e3f2`

**weather_check_m45** — WEATHER_CHECK, bar 0.981686

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/weather_check_m45.wasm
```

hash `f9c4efb7c8b3c965a4dfc0f56279e5165781519fd0869a21548ad288cfd84831`

**weather_check_v3** — WEATHER_CHECK, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/weather_check_v3.wasm
```

hash `3c2e6d53a1b390e5b57f09f93fe5c1a199576b7fe39cd7817b98b8902c6227a7`

**token_holder_count_m45** — TOKEN_HOLDER_COUNT, bar 0.989908

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/token_holder_count_m45.wasm
```

hash `f4c22c02bfea9b8f670889e17aa9762e99aaf96ab1749e21bfadb05bf0eaa2dc`

**token_holder_count_v3** — TOKEN_HOLDER_COUNT, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/token_holder_count_v3.wasm
```

hash `af42b0b805d8d3bc92c80f8510eda1d9300ed93dd0d43b08327b8988ed9eeaf3`

**content_verification_m45** — CONTENT_VERIFICATION, bar 0.990414

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/content_verification_m45.wasm
```

hash `6fd0e0a4c18edb8cc81446ba9a4cad550bf50ac50eeae3fbefd6304b7a68bcf6`

**content_verification_v3** — CONTENT_VERIFICATION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/content_verification_v3.wasm
```

hash `ae07231c53a3edc96695cb6414dad42c7ff32a5cf281cafc7d37d872df3474c7`

**news_search_m45** — NEWS_SEARCH, bar 0.990486

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/news_search_m45.wasm
```

hash `27fa21e5b62d011c5decc6f2cc1b2a8abd8948ba409042171e3e4b0eb0105f03`

**news_search_v3** — NEWS_SEARCH, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/news_search_v3.wasm
```

hash `89d45e29f170e9f43a4a07c3d177717421f73fb9ec789534875175250fb27dd3`

**weather_forecast_m45** — WEATHER_FORECAST, bar 0.990566

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/weather_forecast_m45.wasm
```

hash `711e441b0760d48f35f35b4f5da9249b823082016118830487b720f38b9a5f1f`

**weather_forecast_v3** — WEATHER_FORECAST, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/weather_forecast_v3.wasm
```

hash `46bb77599b38a449c58449ca09e5861f5758a59cce8a15ec4c8b93d8c84a1f96`

**chat_completion_m45** — CHAT_COMPLETION, bar 0.899149

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/chat_completion_m45.wasm
```

hash `81d436e41613450dd179075a27d674af8aab3411b6e05831303ba40bac81d3e2`

**chat_completion_v3** — CHAT_COMPLETION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/chat_completion_v3.wasm
```

hash `9273df6996ee4b00aaa866184dc0a3cefb418af51ff8c6e96c46ffe8cc5e54cd`

**language_generation_m45** — LANGUAGE_GENERATION, bar 0.914006

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_generation_m45.wasm
```

hash `995faf70e8d68b0f98a0b4b7486b448e82b6f73558a4f3d02527c425357e0f7d`

**language_generation_v3** — LANGUAGE_GENERATION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/language_generation_v3.wasm
```

hash `77117d96fa3e3c013db84743b9ad765d67896da3f78754aeca8d2588a25bd961`

**ssl_verification_m45** — SSL_VERIFICATION, bar 0.923542

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/ssl_verification_m45.wasm
```

hash `0424bab7e4446cde7b877a1adfc82f3329083b33cbde1ab216683ec5c355a325`

**ssl_verification_v3** — SSL_VERIFICATION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/ssl_verification_v3.wasm
```

hash `6795b18ddaa7e664aca742f75b1e575bd272c657e847319893554b6669d864c6`

**ip_geolocation_m45** — IP_GEOLOCATION, bar 0.924526

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/ip_geolocation_m45.wasm
```

hash `8ed3df43cbd261fbd82d11266d993b5b01381ac54778ca61591093b4ceda9842`

**ip_geolocation_v3** — IP_GEOLOCATION, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/ip_geolocation_v3.wasm
```

hash `35a34c1dac887a58e5840618d951ce6ae9ff756607489cb6ee13306c10e25ea8`

**agent_task_m45** — AGENT_TASK, bar 0.887931

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/agent_task_m45.wasm
```

hash `a1c5ab49fde5da6f6bbf134b0974bbce55641229cd76575e5dfc4d0a48a12785`

**agent_task_v3** — AGENT_TASK, alternate

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/97b47b489937614319859d0b139ee563e9494c87/track2/calibration/dist/agent_task_v3.wasm
```

hash `64379dbb547a00da93a7e5dd60d7b5f849b08df2a06359999ba79bc6ec4af904`

## Screened and dropped

- **FACT_CHECK** — `fact_s01` emits only 0.0 and 1.0, already an exact binariser at 13 of 15.
- **TEXT_CLASSIFICATION, DEEPFAKE_DETECTION, AI_TEXT_DETECTION** — champions at margin 1.000000.
- **STOCK_PRICE, TVL_LOOKUP** — champion binaries are IPFS-pinned, not in the MIT repository.

## Already held

- **TEXT_AUTHENTICITY_CHECK**, registration 1882, margin 0.66666603 against a ceiling of 0.6666667.

## Do not register again

`crypto_price.wasm`, `tvl_lookup.wasm`, `onchain_tx_lookup.wasm` (registrations 1877-1879) — our own hand-built scorer ranks 13-14 of 15 pairs where the champion ranks 15, and ordering is checked before margin.

## After each one

Send back `candidate_margin`, `candidate_wins`, `comparable_cases` and `champion_margin`.

Method: [calibration/STEP_CALIBRATION.md](calibration/STEP_CALIBRATION.md).
