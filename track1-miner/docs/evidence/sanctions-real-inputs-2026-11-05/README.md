# Sanctions screening on the inputs paying callers sent — 2026-11-05 (GAPS G258)

**Inputs.** `inputs.json`: the 180 distinct sanctions inputs (`name`, `query`, `wallet`) in the paid requests the
Engine routed to `livecert` between 2026-11-01 and 2026-11-04, read from the public Daemon feed
(`../consumption-2026-11-05/`). `prod` is the verdict production gave at the time. Most come from one wallet
(`0x66fb…4a83`, 287 requests), and read like a robustness benchmark: listed names written in Cyrillic, with
Cyrillic look-alike letters, abbreviated, with digits for letters, as a domain, beside clean companies.

**Runs.** Both on 2026-11-05 between ~09:50 and ~10:00 UTC, against the same live OFAC SDN and UN editions, with
`node track1-miner/tools/sanctions-replay.mjs <dist-test> inputs.json <out>` (IPv4 first):
- `before.json`: the production tree `aa110f8`.
- `after.json`: the release tree `C:/Users/hyada/tg-deploy/m3df11ef` with `src/sanctions-names.ts` and the
  changes to `src/sanctions.ts` and `src/sanctions-lists.ts`, as revised after the security review below.

| Verdict | Before | After |
|---|---:|---:|
| match | 85 | 107 |
| possible_match | 14 | 5 |
| no_match | 74 | 68 |
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
- **False positives removed (3):** "Tesla, Inc." (was a possible match with TELA), "Atlassian" (ATLAS),
  "Boeing Company" (BERING).
- **Match downgraded to possible match (1):** "Kraken", which was a *match* with KRAKERN LIMITED at 0.971. It is one
  letter off a 6-letter listed word, so it is now flagged for review instead of reported as a match.

Every clean company in the set stays `no_match` (Apple, Stripe, Microsoft, Deel, Walmart, HSBC and the rest), and
so do Tornado Cash (delisted by OFAC in 2025) and Bitzlato (a FinCEN order, not an SDN listing).

**Unit tests:** 885/885 in `C:/Users/hyada/tg-deploy/m3df11ef`, the merged tree, including the eight tests in
`test/sanctions-names.test.ts`.

## Security review, and what changed after it

An automated review of the first commit raised two evasion paths. Both were fixed before release:
- **One-letter evasions of short names.** The first rule cleared any one-word name that was not near-exact, so
  "Hamaz" for HAMAS would have read `no_match`. Now one letter off a word of 5–6 letters stays a possible match;
  only looser spellings, or words of 4 letters or fewer, are not hits.
- **Look-alike letters mixed evenly.** A word was read by sound or by shape according to which script had more
  letters, so a balanced mix ("Gr" + Cyrillic "і" + "n" + Cyrillic "ех") picked the reading that misses. Now every
  subject is scored under both readings and the better one counts. Greek look-alikes are folded too.
- A name in a script that is not read (Arabic, Persian, Chinese) now answers `unsupported_script` instead of "no
  party was named".

## Limits

- Correct here means that the closest listed name is the party the input names, read against the live SDN list. These
  are not reference labels from whoever wrote the benchmark.
- Only Cyrillic is romanised, and Greek look-alikes folded. A name in Arabic, Persian or Chinese script is refused
  as `unsupported_script`. A name mixing such a script with Latin words is screened on its Latin words only.
- A one-word name one letter off a listed word of 4 letters or fewer is not flagged ("Tela" for TELA).
