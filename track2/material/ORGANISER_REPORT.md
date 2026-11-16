# Draft report to the Telegraph team (NOT SENT; the owner sends it)

Where to send it: the owner's choice. Options are the Telegraph Discord's builder channel, or an issue on
github.com/telegraphprotocol/bounties if the owner prefers a public record. Everything below was read from public
devnode endpoints on 2026-11-16 at 18:19 UTC, with plain GETs only.

---

**Subject: two devnode scoring issues: comparator registrations stuck on "no published snapshot", and two
deterministic intents unranked since epoch 2019/2032**

Hi team, here are two things we found while measuring evaluators for Season II. Each comes with the request that
shows it. We may be misreading the design; if so, a pointer to the right doc would help.

### 1. 45 comparator registrations in 30 families wait on a snapshot that exists under the `_GENERAL` id

`GET /api/wasm` lists 45 live registrations whose eval reason is, for example:

> awaiting_compatible_material: no public material to ask API_HEALTH_CHECK's runnable URL about yet: eval-pool: no
> published snapshot

For 28 of those 30 families, the pool has a published snapshot under the intent id and none under the family id:

| `GET /api/evalpool/status?intent_id=` | active snapshot rows |
|---|---|
| `CORPORATE_REGISTRY_LOOKUP` | none |
| `CORPORATE_REGISTRY_LOOKUP_GENERAL` | 982 (published 2026-11-14) |
| `MACRO_ECONOMIC_INDICATOR` | none |
| `MACRO_ECONOMIC_INDICATOR_GENERAL` | 530 |
| `DNS_RECORD_LOOKUP` / `_GENERAL` | none / 300 |

The other 25 follow the same pattern. CVE_LOOKUP and PACKAGE_STATUS have no pool under either id.

The registrations were re-evaluated at 2026-11-16 15:45 UTC and are still pending. build-a-scoring-module says a
comparator is asked "100 cases out of its correctness battery", and that a pending registration "is re-evaluated when
a snapshot is published". **Our reading:** the comparator path looks up the snapshot by family id, while material is
stored under the `_GENERAL` intent id. Is that intended? Our registrations #273–#278 are among those waiting. So are
other authors' (for example #101, #150, #223, #359).

### 2. DNS_RECORD_LOOKUP_GENERAL and VALIDATOR_PERFORMANCE_VERIFY_GENERAL are not being scored

In `GET /api/miners`, the latest scores for both intents are old, while the newest epoch elsewhere is 2107:

| Intent | Last scored epoch |
|---|---|
| DNS_RECORD_LOOKUP_GENERAL | 2019 (2026-11-05) |
| VALIDATOR_PERFORMANCE_VERIFY_GENERAL | 2032 |

The last tables look as if the reference itself was wrong:

- **DNS, epoch 2019:** guardwire-dns-record-lookup scored 0.99 and the dns.google wrappers about 0.92. The Cloudflare,
  DNS.SB, NextDNS, AdGuard, AliDNS and RethinkDNS wrappers all scored 0. In our own capture of 300 names those
  resolvers agree with each other.
- **Validator, epoch 2032:** val-llama-pools (a DeFiLlama yields wrapper) scored 0.99. The miners that read the
  beacon state, truth-validator-publicnode and truth-validator-chainsafe, scored 0.38. The scored field is a
  validator's effective balance in gwei, which only a beacon node holds.

The docs say an intent with no readable reference "is not ranked that epoch". **We are contributing neutral truth
sources for both:** DNS.SB and NextDNS DoH, and the PublicNode Beacon REST API. Disclosure: our miner LiveCert (#4433)
serves DNS_RECORD_LOOKUP. Could you check why these two intents stopped being scored, and whether an existing truth
source in their pools is returning a wrong value?

### 3. A data-quality note for EMAIL_SECURITY_GENERAL (no action needed from you)

On 300 frozen queries, `telegraph-verity-intelligence` answered `lookup_ok: true` for 61 names whose DNS status is
NXDOMAIN, and HTTP 422 for every underscore name (`_dmarc`, `_domainkey`). The schema defines `lookup_ok` as
Status 0. We report it so the provider can fix it.

Thanks. LiveCert (`0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`)
