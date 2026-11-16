# YAML ready for signature, 2026-11-16

Owner, 2026-11-16: "Yes, prepare the YAML". Prepared and checked by Claude; **validating on Anjoman and signing are
the owner's**. Nothing here has been sent on-chain.

## What to sign

| | |
|---|---|
| YAML URL (pinned) | `https://raw.githubusercontent.com/Harshyadav442277/miner/04c0e9f2aef9b205e78bcd18b783e87c21b86635/track1-miner/miner.yaml` |
| SHA-256 | `0x3cf18081c9fdc90be769ebe46851184d82fa6352ea4b26e3942dcb2f2f5fb13d` |
| Size | 96,353 bytes, LF line endings, no CR byte |
| Hash checked | from `git show 04c0e9f:track1-miner/miner.yaml` and from the URL above: byte-identical |
| Supported intents | 44 (the registered 43 plus SECURITY_REVIEW_GENERAL) |
| Fee address | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` (the LiveCert wallet in CLAUDE.md; unchanged) |
| Min price | 10,000 (unchanged) |
| Replaces | registration 5232, YAML `494b135`, SHA-256 `0x661625a3…b045` |

**Size is above the largest file known to validate.** 93,175 bytes and 95,023 bytes (the YAML of registration 5232)
validated; 103,086 bytes was refused as too large (`miner/test/intent-mapping.test.ts`). 96,353 is between them. If
Anjoman refuses it for size, say so and the descriptions will be trimmed; that refusal happens before signing and
costs nothing.

## Steps for the owner

1. Validate the URL above on Anjoman. Sign only on a clean result.
2. Sign with the LiveCert wallet. Never another account or signer (AGENTS.md).
3. Send the new registration id. Expect a new id, as 5152 became 5232 on 14 November, with scoring starting
   again under it.

After the owner signs, Claude will look up the registration by its id, not the slug, and confirm it is active.
Then Claude updates the `REGISTRATION_ID` repository variable, MEMORY and the release skill, and watches the next
epochs.

## What changed against `494b135`

`manifest-diff.txt`: identity unchanged (id 4433, slug, protocol, base_url, auth, rate limit); every registered
endpoint and all 43 intents kept; one new endpoint; two optional params added on purpose.

1. **New endpoint `/security-review`** for SECURITY_REVIEW_GENERAL (live since `a118570`; 10/10 on labelled targets).
2. **Optional params the routes already read:** `chain` on `/wallet-balance` (WALLET_BALANCE's node input is
   required, and wallet questions on other chains could not carry it); `period` on `/sec-filings`.
3. **`intent_mapping.input` for 14 intents**, naming the node's input that fills our param:
   - Differently named: ACADEMIC_SEARCH `topic`←`query`; CONTENT_EXTRACTION `text`←`content`; ONCHAIN_TX_LOOKUP
     `hash`←`tx_hash`; RESEARCH_QUERY and RESEARCH_SYNTHESIS `query`←`question`; STOCK_PRICE `symbol`←`ticker`.
   - Same name, previously unmapped: WALLET_BALANCE `address`, `chain`; ONCHAIN_TX_LOOKUP, GAS_PRICE and
     TOKEN_HOLDER_COUNT `chain`; EVENT_OUTCOME `event`; SENTIMENT `text`; REGULATORY_FILING `period`; NEWS_SEARCH
     `query`; LANGUAGE_TRANSLATION `text`, `target_language`.
   - No param was changed from optional to required. The docs say a failed required param sends the request to a
     fallback miner, while a failed optional one is dropped.
4. **SENTIMENT outputs `score` and `reason`** beside `sentiment`. This is an experiment on the weakest scored
   intent (0.6751 in epoch 2105); the docs say an unmapped field is "reported missing".
5. **Descriptions brought up to date:**
   - EVENT_OUTCOME: Wikidata and dated model recall (G308).
   - Sentiment: the label is chosen by a model.
   - Fact-check: the seven verdicts and the knowledge basis.
   - Storm: `risk_level`, total precipitation, the window asked for.
   - News search: the model-written brief, and headlines must name the subject.
   - Gas: the 12 chains.
   - Top level: 44 intents and where a model is used.

## Checks run

| Check | Result |
|---|---|
| Unit tests | 1038/1038 at `fa9b231` (YAML) and on `04c0e9f` with the live suite (`npm test`), after one re-run |
| Mapping probes | `mapping-probes.txt`: production called with exactly the params each mapping sends; 16/16 answered with every mapped field |
| Manifest diff | `manifest-diff.txt`: PASS with `--allow-added-params=/wallet-balance:chain,/sec-filings:period` |
| Intent ids | `canonical-intents.json`: 44/44 in the devnode intent catalog; 44/44 families canonical on the Base Sepolia Diamond (block 59,584,938). The Diamond holds families only since V2 (`docs/TELEGRAPH_FACTS.md`, 2026-11-16) |
| Preflight on production | `preflight.txt` |

## Not verified

- Whether Anjoman accepts 96,353 bytes.
- Whether the node uses `intent_mapping.input` at all: the docs say nodes with `INTENT_MAPPING_ENABLED` off ignore
  it.
- The score effect of any change here, which needs epochs under the new registration.
