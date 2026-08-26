# TELEGRAPH_FACTS.md — verified protocol facts

**Rule: verify against live docs, never memory.** Every fact below carries a source and a
verification date. Re-verify anything older than a few days — the canonical intent set and
contract parameters change on-chain.

Verified **2026-08-26** against https://docs.telegraphprotocol.com (docs updated 2026-08-20).

---

## The single most important fact

**`base_url` is the UPSTREAM API you are wrapping — not a server you must write.**

Telegraph is a *declarative* standard. You publish a YAML file describing an existing API;
Telegraph nodes proxy requests to it. A miner can be **pure YAML with zero code**.

> "instead of writing code, you write a YAML file that describes your API"
> — [YAML Configuration](https://docs.telegraphprotocol.com/docs/miners/yaml-config)

You only need to host your own endpoint if you want logic that no upstream API provides.

---

## Registration requirements

| Requirement | Detail |
|---|---|
| Bond / stake | **None.** Registration is permissionless and free. |
| Cost | Gas only, on **Base Sepolia** (testnet) |
| YAML hosting | Public stable URL; IPFS recommended. Must stay reachable while registered. |
| Fee address | Any EVM address for MACHINA payouts |
| Live API | Endpoint must respond when the protocol routes to it |
| Tooling | `cast` (Foundry) for the manual path; the web console does it all otherwise |

**Recommended path:** `integrate.telegraphprotocol.com` validates the YAML, sandbox-tests every
declared endpoint against the real upstream, pins to IPFS, sends `registerMiner`, and stores the
API key. It is *the only path that lets you supply an API key yourself*.

## Contract

```
DIAMOND  0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8   (Base Sepolia)
```

```
registerMiner(string yamlUrl, bytes32 yamlHash, address feeAddress,
              uint256 minPriceUsdc, string[] supportedIntents)
```

- `yamlHash` is **SHA-256 of the raw YAML bytes**, `0x`-prefixed. **Not keccak256.**
- `minPriceUsdc` is 6-decimal USDC; **minimum `10000` = $0.01**. Changeable later via `updateMiner`.
- Every intent must be canonical **exactly and case-sensitively**, or the whole tx reverts with
  `MinerRegistryFacet: unsupported intent`.

Check before spending gas:
```bash
cast call "$DIAMOND" "isCanonicalIntent(string)(bool)" "WEATHER_CHECK" --rpc-url "$RPC"
cast call "$DIAMOND" "getCanonicalIntents()(string[])" --rpc-url "$RPC"
```

## YAML schema

Exactly **six required top-level fields**: `version`, `kind`, `id`, `slug`, `name`, `base_url`.

`additionalProperties: false` at the root and inside `endpoints[]`, `auth`, and
`semantics.signal_mapping`. **An unknown key is a hard rejection, not an ignored field.**

Traps that reject registrations:

- `input_schema` / `output_schema` are **top-level only**. Nesting them under an endpoint —
  the natural guess — fails with `endpoints.0: Additional property input_schema is not allowed`.
- `semantics.signal_mapping` accepts only `confidence_field`, `label_field`, `reason_field`.
  A `type` field is rejected.
- `slug` must match `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `id` must be unused network-wide — requests route on it, so a clash is rejected.
- `endpoints[]` entries accept exactly eight keys: `path`, `external_path`, `method`,
  `description`, `endpoint_base_url`, `content_type`, `multipart_fields`, `param_map`.

## Identity

- **A slug is bound to a wallet.** Only the wallet holding it may register it.
- **API keys never go in the YAML** (it is public, pinned, and hashed on-chain). They are
  installed against the slug *after* registration, via an EIP-191 `personal_sign` challenge.
  The key is bound to the wallet, not the slug — a slug changing hands transfers nothing.

## Economics

Miners earn **only from demand** — there are no protocol emissions.

```
agent pays USDC → 2% treasury → 98% into TWAP escrow
→ dripped into Uniswap V3 over 24h (0.01 USDC at a time, ±30s jitter)
→ MACHINA sent to fee address
```

Minimum **100 USDC** must accumulate before a settlement cycle runs; below that it rolls over.

`Earnings = min_price_usdc × demand_multiplier × 0.98`

| 24h request volume | Multiplier |
|---|---|
| 0 – 999 | 1.0× |
| 1,000 – 9,999 | 1.5× |
| 10,000 – 99,999 | 2.5× |
| 100,000 – 999,999 | 5.0× |
| 1,000,000+ | 10.0× |

## Routing — winner-take-most

| Rank | Share of routed requests |
|---|---|
| 1st | **70%** |
| 2nd | 20% |
| 3rd | 10% |
| 4th+ | **nothing** |

Governance-adjustable; 70/20/10 at genesis. Position is the **Canonical Score** — the
stake-weighted median of validator local scores from the last epoch tournament plus spot checks.

**Strategic consequence: an empty intent is worth far more than a crowded one.** Rank 4 in a
popular category earns zero; rank 1 in a quiet one takes 70%.

## Grace period

First **7 days** after activation: unranked, and all grace-period miners **share 5% of routed
traffic equally**. Your grace-period score sets your opening leaderboard position.

## Spot checks and revocation

Validators spot-check **roughly every 20 seconds**, triggered deterministically by the latest
Base L2 block hash. If a spot check score drops **more than 20%** below the leaderboard score:

- immediate **Routing Revocation**
- removed from the routing table, traffic redistributed
- recorded immutably in the epoch block
- no new traffic until the next epoch tournament re-scores you

**This is the hard operational constraint.** Uptime and latency are not hygiene — they are the
product. Sleeping free tiers with cold starts will read as failures.

## Activation

Nodes activate you on the `MinerRegistered` event, usually **within a minute** — not epoch-gated.

```bash
curl https://devnode.telegraphprotocol.com/api/miners          # the loaded catalog
curl -s https://devnode.telegraphprotocol.com/api/miners/<registrationId> | jq '.miner'
```

Always look up by `registrationId`, never by slug — by-slug returns whoever currently serves it.

| `activation_status` | Meaning | Action |
|---|---|---|
| `active` | Live and routable | none |
| `pending` | Validated, activating | wait seconds |
| `unreachable` | YAML URL didn't answer; retries ~every 5 min, up to 5 | wait |
| `rejected` | **Terminal.** `rejection_reason` says why | fix, then `updateMiner` |
| `superseded` | Newer registration took the slug | use newer id |
| `deregistered` | Withdrawn on-chain | re-register |

A rejection **releases the slug immediately** — someone else can claim it. Fix and resubmit fast.

## Updating

`updateMiner(uint256 oldRegistrationId, ...)` deregisters and re-registers atomically. You get a
**new `registrationId` and a new `intentId`** — anything holding the old `intentId` breaks.
Only the registering address can update or deregister. No admin override.

## Live endpoints

```
https://devnode.telegraphprotocol.com/api/miners          current miner catalog
https://devnode.telegraphprotocol.com/engine/v1/intents   canonical intents + miner counts
```

## Source pages

- [What Miners Do](https://docs.telegraphprotocol.com/docs/miners/miner-overview)
- [YAML Configuration](https://docs.telegraphprotocol.com/docs/miners/yaml-config)
- [Registering as a Miner](https://docs.telegraphprotocol.com/docs/miners/miner-registration)
- [Intents](https://docs.telegraphprotocol.com/docs/using/intents)
- [Build a Scoring Module](https://docs.telegraphprotocol.com/docs/scoring/build-a-scoring-module)
- Repo of examples: https://github.com/telegraphprotocol/telegraph-usecases

---

## Routed queries are payment-gated (verified 2026-08-26)

`POST /engine/v1/ask` returns **HTTP 402** without a payment payload:

```json
{ "error": "payment required",
  "accepts": [{ "scheme":"exact", "price":"$0.01",
                "network":"eip155:84532",
                "payTo":"0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8" }] }
```

**$0.01 USDC per routed request**, on Base Sepolia, paid to the Diamond contract.

Two consequences that matter:

1. **We cannot test end-to-end routing for free.** Verifying that the engine constructs a correct
   call against our YAML costs a real (testnet) payment.
2. **The eligibility guardrail has a price.** An intent needs ≥100 real Track 3 requests to be
   prize-eligible (G13). At $0.01 each that is **~$1.00 of testnet USDC** — trivially cheap, but
   it must actually be spent, and testnet USDC must be obtained from a faucet first.

Base Sepolia USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
Faucet: https://faucet.circle.com


---

## Epochs are 9 hours long (verified 2026-08-26)

```
GET https://explorer.telegraphprotocol.com/api/epoch
{"current_epoch":284,"epoch_duration":"9h0m0s","epoch_duration_seconds":32400, ...}
```

This matters more than it looks, and I wasted several checks not knowing it.

The landing page's epoch ticker counts down in minutes, which reads as though epochs turn
constantly. They do not — **scoring lands roughly three times a day.** So:

- A fix deployed just after an epoch is scored will not show up for up to 9 hours.
- There is no fast feedback loop. Polling for a new score minutes after a change is pointless.
- Across the whole Track 1 window (Aug 17 – Aug 31) there are only ~40 scored epochs total, and we
  registered with ~5 days left — roughly **13 scoring opportunities**.
- Any change that requires `updateMiner` costs a fraction of the remaining feedback cycles, which
  raises the bar for making one on a hypothesis rather than evidence.

Corollary for working method: prefer changes justified by **replaying real paid questions**
(`tools/replay-corpus.mjs`), which gives an answer in seconds, over changes justified by a scoring
theory, which take up to 9 hours to test and have twice been wrong.
