# YAML ready for signature, 2026-11-18 (replaces the 2026-11-17 sheet)

Prepared by Claude after epoch 8. **Validating on Anjoman `/dashboard/earn` and signing are the owner's.** Nothing here
was sent on-chain.

## Why now

- **Epoch 8 (scored up to 2026-11-18 08:13 UTC):** four on-chain intents scored exactly 0. Each had about 0.93–1.0
  on Nov 16. They are ONCHAIN_METRIC_VERIFY (7 missions), TOKEN_TOTAL_SUPPLY_VERIFY (3), CROSS_CHAIN_STATE_VERIFY (3)
  and TOKEN_HOLDER_COUNT.
- **What the node sent:** the two archived ONCHAIN_METRIC calls before its score (07:41 and 07:42 UTC) carried no
  params at all.
- **What scored well:** the intents whose inputs `04c0e9f` maps did well; FINANCIAL_DATA (`symbol ← asset`) is
  rank 1.
- **Inference (one epoch, not confirmed by the organisers):** since the Nov 17 rebuild the node does not fill
  unmapped params. This YAML maps the inputs those intents need.
- **The Nov 17 signature (registration 5301, tx `0xbfb7a37b…8b36`) never reached the node** (GAPS G334). The node
  still serves `04c0e9f` as 5292. Registrations sent after it by other teams (5310–5326) are indexed normally.

## What to sign

| | |
|---|---|
| YAML URL (pinned) | `https://raw.githubusercontent.com/Harshyadav442277/miner/f47f018e4461c93c60c8ca498d3c2a4d75c872f9/track1-miner/miner.yaml` |
| SHA-256 | `0xbad6049cee6aa314fb1c502ae66025813569a56a158c787f9652e92447452037` |
| Size | 96,988 bytes, LF; served bytes and `git show f47f018:track1-miner/miner.yaml` hash the same |
| Intents | 44, unchanged; fee address and min price unchanged |

## What changed against `04c0e9f` (the YAML the node serves; `manifest-diff.txt`: PASS)

1. **New in this sheet:**
   - ONCHAIN_METRIC maps `address`, `block`, `chain` and `metric`, and `/onchain-metric` declares `metric`. Since
     `1c2a564` the route reads it: `metric=balance` with an address returns the native balance.
   - TOKEN_TOTAL_SUPPLY maps `token`.
2. **Carried from the Nov 17 sheet** (the YAML in 5301):
   - G328 params `fields`, `subject`, `token`, `categories`;
   - TOKEN_HOLDER `token`;
   - translation `translation`;
   - the Federal Register line in `/sec-filings`.
3. **Added 2026-11-18 ~10:00 UTC (`f47f018`):** each intent's required input is mapped explicitly where our endpoint
   declares the same name: CHAT `message`, CODE_REVIEW `code`, FACT_CHECK `claim`, TEXT_GENERATION `prompt`,
   URL_SAFE `url`, WEB_SEARCH `query`. Audit of all 44 intents: every required input is now mapped, except
   NEWS_HEADLINES `topic` and TEXT_CLASSIFICATION `text`/`categories`. Those two have no mapping block, and adding
   one would require listing every output. `/fraud-check`'s description is tightened to fit.
4. `/tx-lookup` description: a sentence that repeated its field list is removed, and the base-fee clause is
   shortened. This is to stay under the 97,000-byte guard.

CROSS_CHAIN_STATE_VERIFY defines no request params, so there is nothing to map. Its 0 is not addressed here.

## Checks

| Check | Result |
|---|---|
| Unit tests at `f47f018` | 1055/1055 (YAML size guard, mapping-vs-endpoint, manifest tests) |
| Manifest diff vs `04c0e9f` | PASS, `--allow-added-params` naming exactly the five params |
| Pinned URL | HTTP 200, 96,982 bytes, same SHA-256 |
| Routes behind the new mappings | Live on production since `1c2a564`: `/onchain-metric?address=…&block=21000000&chain=ethereum&metric=balance` → 1,146.64 ETH, `verified` |

## Steps for the owner

1. `https://anjoman.ai/dashboard/earn`, LiveCert wallet only. Paste the pinned URL, check the SHA-256 shown, and
   run validation and the sandbox. Sign only on a clean result.
2. Expect a new registration id.

Claude then finds it on-chain from the wallet's transaction and on the node by id, updates `REGISTRATION_ID`, the
release skill, mission-matrix and README, and watches the next epoch for the four intents.

## Not verified

- Whether this registration indexes: 5301 did not.
- That missing input mappings caused the zeros. One epoch, and two archived calls.
- Anjoman's size limit for 96,988 bytes.
- Registration needs a $4.25 test-USDC bond; the account had $4.1002 on 2026-11-18, with the faucet locked about 23.5 h. 96,353 was accepted, and the Nov 17 file of 96,994 was signed, so it passed
  the dashboard's checks.
