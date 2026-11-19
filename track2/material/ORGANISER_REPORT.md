# Draft report to the Telegraph team (NOT SENT; the owner sends it)

Where to send it: the owner's choice. Options are the Telegraph Discord's builder channel, or an issue on
github.com/telegraphprotocol/bounties if the owner prefers a public record. Facts were read from public devnode
endpoints with plain GETs only: §1 on 2026-11-17 at 07:22 UTC, §2–§3 on 2026-11-16 at about 18:19 UTC.

---

**Subject: devnode registry reset on Nov 17, plus two earlier scoring issues (comparators waiting on a snapshot, two
deterministic intents unscored)**

Hi team, here are three things we found while measuring evaluators for Season II. Each comes with the request that
shows it. We may be misreading the design; if so, a pointer to the right doc would help.

### 1. The devnode registry looks reset (2026-11-17 07:22 UTC)

- `GET /api/epoch` returned `current_epoch: 0` (3 h epochs). On Nov 16 the current epoch was 2107.
- `GET /api/wasm` returned `{"count":0,"intents":{}}`. On Nov 16 it held hundreds of registrations, including
  champions such as #315 and #301.
- `GET /api/miners` returned 1,283, then 1,296 entries, each with a `registered_at` of 07:23 UTC that day. On Nov 16
  there were 2,173. `GET /api/miners/4433` now returns `verifywire-fx-now`; on Nov 16, 4433 was our miner LiveCert.
- Eval pools look intact: EMAIL_SECURITY_GENERAL still shows 651 eligible rows.

**Questions:**
- Is this a planned migration?
- Do miners and evaluator modules need to re-register, or will the earlier registrations be restored?
- Will registration ids change for good?
- Do earlier ranking histories count toward Season II judging?

### 2. Before the reset: 45 comparator registrations in 30 families waited on a snapshot under the `_GENERAL` id

On Nov 16, `GET /api/wasm` listed 45 live registrations whose eval reason was, for example:

> awaiting_compatible_material: no public material to ask API_HEALTH_CHECK's runnable URL about yet: eval-pool: no
> published snapshot

For 28 of those 30 families, the pool had a published snapshot under the intent id and none under the family id. For
example, `CORPORATE_REGISTRY_LOOKUP` had none, while `CORPORATE_REGISTRY_LOOKUP_GENERAL` had 982 rows, published
2026-11-14. build-a-scoring-module says a comparator is asked "100 cases out of its correctness battery", and that a
pending registration "is re-evaluated when a snapshot is published".

We first guessed a family-id vs `_GENERAL` lookup mismatch. That guess is contradicted: on 2026-11-19, FX_NOW has no
snapshot under the family id (only `FX_NOW_EUR` etc. have one), yet FX_NOW comparators are evaluated (1,262 cases).
Every family evaluated so far has non-`_GENERAL` intents (FX_NOW_*, CRYPTO_PRICE_USD, WEATHER_CHECK_TEMPERATURE,
CURRENCY_EXCHANGE_CONVERT, SSL_VERIFICATION_CERT, STOCK_PRICE_US_EQUITY); every waiting family's intent is `_GENERAL`.
**Question:** what does a `_GENERAL` deterministic family need before its comparators are evaluated? Our #42–#47
(post-reset ids) are among those waiting.

### 3. Before the reset: two deterministic intents stopped being scored

| Intent | Last scored epoch (as of Nov 16) |
|---|---|
| DNS_RECORD_LOOKUP_GENERAL | 2019 (2026-11-05 11:51 UTC) |
| VALIDATOR_PERFORMANCE_VERIFY_GENERAL | 2032 |

- **DNS, epoch 2019:** the proxy-hosted resolver wrappers and the Cloudflare wrappers scored 0, while the direct
  dns.google wrappers scored 0.90–0.93. That may be call failures rather than a reference error. We cannot tell which.
- **Validator, epoch 2032:** val-llama-pools (a DeFiLlama yields wrapper) scored 0.99, while the beacon-state readers
  scored 0.19–0.38. The scored field is a validator's effective balance in gwei, which only a beacon node holds.

We have prepared neutral truth sources for both: DNS.SB and NextDNS DoH, and the PublicNode Beacon REST API.
**Disclosure:** our miner LiveCert serves DNS_RECORD_LOOKUP, was unscored there, and would be ranked if scoring
resumes. Could you check why these intents stopped being scored, and whether a source in their pools returns wrong
values?

### 4. A data-quality note for EMAIL_SECURITY_GENERAL (no action needed from you)

On 300 frozen queries (direct calls per each miner's YAML, 2026-11-16), `telegraph-verity-intelligence` answered
`lookup_ok: true` for 61 names whose DNS status is NXDOMAIN. It answered HTTP 422 for every underscore name
(`_dmarc`, `_domainkey`). The schema defines `lookup_ok` as Status 0. We report it here first, so the provider can fix
it before anything is published.

Thanks. LiveCert (`0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`)
