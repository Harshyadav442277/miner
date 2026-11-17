# YAML ready for signature, 2026-11-17

Prepared and checked by Claude on the owner's "take care of everything by yourself". **Validating on Anjoman
(`/dashboard/earn`, needs the wallet) and signing are the owner's.** Nothing here was sent on-chain.

## What to sign

| | |
|---|---|
| YAML URL (pinned) | `https://raw.githubusercontent.com/Harshyadav442277/miner/6499779a48506fadaef3987c7478efdd93859201/track1-miner/miner.yaml` |
| SHA-256 | `0xbf9dd57448d1b5fd1ebaf7ca6c9bc9aaa672bd9e7a6dd9fd6e22edc3c0e53bab` |
| Size | 96,994 bytes, LF, no CR byte; the served file and `git show 6499779:track1-miner/miner.yaml` have the same hash |
| Supported intents | 44, unchanged |
| Fee address, min price | unchanged (`0xdAd2…A39e`, 10,000) |
| Replaces | registration 5292, YAML `04c0e9f`, SHA-256 `0x3cf18081…5fb13d` |

**Size:** 96,994 bytes is above the largest size known to validate (96,353, registration 5292) and below the smallest
refused (103,086). The repo's guard is 97,000. If Anjoman refuses it for size, nothing is lost: that refusal comes
before signing.

## What changed against `04c0e9f` (`manifest-diff.txt`: PASS)

1. **G328.** The restored 5292 record warns that four node-required params have no field on our endpoint. All four
   are now declared as optional params, and the routes already read them:
   - `fields` on `/extract`
   - `subject` on `/fraud-check`
   - `token` on `/token-holders` (since `6499779` the route takes a contract address passed as `token`)
   - `categories` on `/classify`

   Input mappings were added for CONTENT_EXTRACTION, FRAUD_DETECTION and TOKEN_HOLDER_COUNT.
2. **LANGUAGE_TRANSLATION** also maps `translation`, the translated text alone. The docs say an unmapped field is
   "reported missing".
3. **`/sec-filings` description:** a name that matches no SEC registrant is counted in the US Federal Register.
4. Two descriptions shortened to stay under the size guard.

No intent removed. EVENT_OUTCOME and URL_SCAN_VERDICT stay: their answers are honest, not wrong. Each field scores
near its own median (EVENT_OUTCOME field median 0.002; URL_SCAN_VERDICT field ~0.54).

## Checks

| Check | Result |
|---|---|
| Unit tests at `6499779` | 1052/1052, including the YAML size guard and the mapping-vs-endpoint tests |
| Manifest diff vs `04c0e9f` | PASS, with `--allow-added-params` naming exactly the four params |
| Pinned URL | HTTP 200, 96,994 bytes, same SHA-256 |

## Steps for the owner

1. Open `https://anjoman.ai/dashboard/earn`, paste the pinned URL, and run its validation and sandbox. Sign only on
   a clean result.
2. Sign with the LiveCert wallet only (AGENTS.md).
3. Expect a new registration id. Scores restart under it, but the node's scores are already at epoch 0 since the
   Nov 17 rebuild.

After signing, Claude looks the new registration up by id, then updates `REGISTRATION_ID`, the release skill,
mission-matrix and README, and merges the branch.

## Not verified

- Whether Anjoman accepts 96,994 bytes.
- Whether declaring the four params changes their scores. The node says it "maps it" already.
- The translation output mapping's effect.
