# SIGN — current list

Paste the link, set the intent, check the hash, sign. Top of each section first.

Before each one: **reload the console page** and confirm the intent chip, or it registers against
the wrong intent's fixtures.

---

## 1. FRAUD_DETECTION — bar 0.9985664

**fraud_detection_v2_tight** — predicted **0.99997**

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/fraud_detection_v2_tight.wasm
```

hash `46efedee789ff5e9bb0ad3b82029abb6904333a16cd4ca6ad4d489074d282ca9`

**fraud_detection_v2_safe** — only if the one above is rejected. Predicted 0.99988

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/fraud_detection_v2_safe.wasm
```

hash `1ecf3c814d0cdc13273e27e8d7e56ec9822cc1567a152b03d29da7e5da1ace92`

---

## 2. LANGUAGE_TRANSLATION — bar 0.79502594

**language_translation_v2_tight** — predicted **0.7996**

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/language_translation_v2_tight.wasm
```

hash `3694580ebc840db928f5f72ce44ef003b3309c68e6f36593ec081ef4e5b26644`

**language_translation_v2_safe** — only if the one above is rejected. Predicted 0.7986

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/language_translation_v2_safe.wasm
```

hash `8b7b55eb61b7b9c7c150191be0e578239a45a4f88cc3e49dcbba1c86d42cd957`

**language_translation_v2_t070** — long shot. 0.866 if it works, rejected if not

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/language_translation_v2_t070.wasm
```

hash `71aeda7be3c6f8864c644a08735ea0352a7dc911f5b9edd6bc0066fbdeecd735`

**language_translation_v2_t075** — long shot, same idea

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/language_translation_v2_t075.wasm
```

hash `542fa83159c6051e8ca49d22eee7870ad92da4141912f9ddd91b29c42595a379`

---

## 3. TEXT_AUTHENTICITY_CHECK — bar 0.6663348

**text_authenticity_v2** — predicted **0.66665**. Thin margin; the base can do no better

```text
https://raw.githubusercontent.com/Harshyadav442277/miner/72474bd7514735b53b823bdab390c9721219bd18/track2/calibration/dist/text_authenticity_v2.wasm
```

hash `eec7bc00a5131dfb4152c0ca3b4b54eabc9ed05092a5b4d014e3fe1453a50588`

---

## After each one

Send back `candidate_margin`, `candidate_wins` and `champion_margin`. A rejected registration is
the only instrument that reads the real fixtures, and its numbers set the next threshold.

Method and evidence: [calibration/STEP_CALIBRATION.md](calibration/STEP_CALIBRATION.md).
Older lists: [REGISTRATION.md](REGISTRATION.md).
