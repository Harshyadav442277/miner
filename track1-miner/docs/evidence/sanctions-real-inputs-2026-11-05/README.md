# Sanctions screening on the inputs paying callers sent — 2026-11-05 (GAPS G255)

**Inputs.** `inputs.json`: the 180 distinct sanctions inputs (`name`, `query`, `wallet`) in the paid requests the
Engine routed to `livecert` between 2026-11-01 and 2026-11-04, read from the public Daemon feed
(`../consumption-2026-11-05/`). `prod` is the verdict production gave at the time. Most come from one wallet
(`0x66fb…4a83`, 287 requests), and read like a robustness benchmark: listed names written in Cyrillic, with
Cyrillic look-alike letters, abbreviated, with digits for letters, as a domain, beside clean companies.

**Runs.** Both on 2026-11-05 ~10:30 UTC, against the same live OFAC SDN and UN editions, with
`node track1-miner/tools/sanctions-replay.mjs <dist-test> inputs.json <out>` (IPv4 first):
- `before.json`: the production tree `aa110f8`.
- `after.json`: the same tree with `src/sanctions-names.ts` and the changes to `src/sanctions.ts` and
  `src/sanctions-lists.ts` (this commit).

| Verdict | Before | After |
|---|---:|---:|
| match | 85 | 107 |
| possible_match | 14 | 4 |
| no_match | 74 | 69 |
| unknown | 7 | 0 |

`changed.md` lists the 30 inputs whose verdict changed:
- **Now matched (23):**
  - Russian in Cyrillic (5): "Сбербанк", "Тинькофф Банк", "Владимир Путин", "оао епк самара", and
    "общество с ограниченнои отвецтвенностю втб форекс".
  - Listed English names spelled in Cyrillic (8): "мотоjен ауто индустрй cомпанй" for MOTOJEN AUTO INDUSTRY
    COMPANY, and seven more.
  - Abbreviations: "AEZA Grp", "Lazarus Grp.", "Hydra Mkt".
  - Domains: "Suex dot io" and "suex.io" (read from the SDN "Website" remark), "Blender dot io".
  - Digits for letters: "Gr1nex", "L4zarus Group".
  - Others: "PAO Sberbank Rossii"; "Vladimir Putin" (an availability blip in the first run).
- **Now a possible match (3):** "Grinex Exchange" and "Cryptex Platform" (a descriptor added to a one-word listed
  name), and "Гарантекс".
- **False positives removed (4):**
  - "Tesla, Inc." (was a possible match with TELA);
  - "Atlassian" (ATLAS);
  - "Boeing Company" (BERING);
  - "Kraken", which was a *match* with KRAKERN LIMITED at 0.971.

Every clean company in the set stays `no_match` (Apple, Stripe, Microsoft, Deel, Walmart, HSBC and the rest), and
so do Tornado Cash (delisted by OFAC in 2025) and Bitzlato (a FinCEN order, not an SDN listing).

**Unit tests:** 878/878 in `C:/Users/hyada/tg-deploy/maa110f8` with the changed files, including the five tests
in `test/sanctions-names.test.ts`.

## Limits

- Correct here means that the closest listed name is the party the input names, read against the live SDN list. These
  are not reference labels from whoever wrote the benchmark.
- Only Cyrillic is romanised. A name in Arabic, Persian or Chinese script still reads as no name at all.
- A one-word name now needs a near-exact spelling: a slip of one or two letters is allowed only in words of 7 or
  8 letters and more. A misspelt short listed name ("Tela") is no longer flagged.
