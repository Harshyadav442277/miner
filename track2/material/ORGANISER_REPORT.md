# Draft report to the Telegraph team (NOT SENT; the owner sends it)

Rewritten 2026-11-23. The Nov 17 reset questions of the earlier draft were answered by the Nov 18 restore (GAPS G51),
and are in git history.

**Where to send it:** the owner's choice, either the Telegraph Discord builder channel or an issue on
github.com/telegraphprotocol/bounties. Facts were read with plain GETs of `GET /api/wasm` on 2026-11-23 at 10:27 UTC
(epoch 43).

---

**Subject: deterministic `_GENERAL` families: every comparator is refused at the remote check**

Hi team, two things we found while registering evaluators. Each comes with the registry entries that show it. We may
be misreading the design; if so, a pointer to the right doc would help.

### 1. Every comparator in five deterministic `_GENERAL` families is refused at the remote check

In REGULATORY_FILING_MONITOR, CORPORATE_REGISTRY_LOOKUP, LIQUIDITY_DEPTH_VERIFY, GRID_POWER_PRICE and
MINING_HASHPRICE_VERIFY, every comparator registration is rejected before download with:

> its runnable URL refused a public pair: remote executor rejected (status 422)

The second half of the message is the runnable's own reply. Each author's runnable reports a non-integer field:

| Registration | Runnable's reply |
|---|---|
| #42–#46 (ours) | "expected integer ground_truth_value, miner_value and spec [kind, tolerance]" |
| #10, #17, #20, #22, #26 | "not an integer" |
| #56 | "batch[0].ground_truth_value must be an integer (JSON number or decimal string)" |

DNS_RECORD_LOOKUP (#13, #34) and CVE_LOOKUP (#12) look the same.

Meanwhile, adapters in LIQUIDITY_DEPTH_VERIFY and MINING_HASHPRICE_VERIFY reach the step "public pair 0 (chosen)".
That suggests the node sends these families text preference pairs.

build-a-scoring-module describes the comparator request as integer `ground_truth_value`, `miner_value` and `spec`.

**Questions:**
- Which module kind do these families take now?
- If comparators, what do the public pairs look like?

### 2. Identical comparators replace one another

In FX_NOW, CRYPTO_PRICE, WEATHER_CHECK, CURRENCY_EXCHANGE, SSL_VERIFICATION and STOCK_PRICE, each new comparator that
scores 1.0 supersedes the previous one, even though they compute the same rule:
- ours, #139–#144, were replaced by #145–#150;
- on Nov 18–19 the same happened between two other authors.

**Question:** is the latest-wins rotation intended for exact comparators? It makes the champion slot depend only on
registration time.

### 3. A data-quality note for EMAIL_SECURITY_GENERAL (no action needed from you)

On 300 frozen queries on 2026-11-16 (direct calls per each miner's YAML), `telegraph-verity-intelligence`:
- answered `lookup_ok: true` for 61 names whose DNS status is NXDOMAIN;
- answered HTTP 422 for every underscore name (`_dmarc`, `_domainkey`).

The schema defines `lookup_ok` as Status 0. We report it here first, so the provider can fix it before anything is
published.

**Disclosure:** we also run the miner LiveCert. It serves none of the families above except DNS_RECORD_LOOKUP.

Thanks. LiveCert (`0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`)
