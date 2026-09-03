# TELEGRAPH_FACTS.md — verified protocol facts

**Rule: verify against live docs, never memory.** Every fact below carries a source and a
verification date. Re-verify anything older than a few days — the canonical intent set and
contract parameters change on-chain.

Verified **2026-08-26** against https://docs.telegraphprotocol.com (docs updated 2026-08-20).

---

## Organizer answers — Discord, 2026-08-30 (via the user)

1. **Third-party APIs are allowed** — build your own or integrate any external one — but the
   participant is "responsible for making sure your integrated api is uninterrupted, and
   reliable." Upstream reliability (Open-Meteo, OpenAlex, geolocation feeds…) is our obligation,
   not an excuse.
2. **The exact submission deadline is posted in the Discord `#announcements` channel.** The
   rules page gives only "Aug 17 – Aug 31" with no hour. Not yet transcribed here — whoever
   reads `#announcements` next should paste the exact wording and timestamp into this section.
3. **Continued building is allowed and encouraged — "all of this is permissionless."** Code and
   registrations may keep improving during and after the track windows; Track 3 agents "need a
   reliable, best api and intelligence to make decisions."
4. **Rankings persist after the hackathon, and Track 3 traffic is judged.** Agent requests are
   routed only to the higher-ranked intelligence, "and those requests will be counted when
   submissions are being judged." Consequences: rank held at the moment Track 3 opens (Aug 31)
   compounds into routed — and therefore judged — traffic; this routing is what feeds the
   ≥100-real-requests eligibility guardrail; and reliability through Sep 7 is part of the judged
   record, not passive uptime.

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

First **7 days** after activation: all grace-period miners **share 5% of routed traffic equally**.
Your grace-period score sets your opening leaderboard position.

**"Unranked" was wrong and is struck (G58, 2026-08-31).** The grace period throttles routed
traffic; it does not withhold scoring or ranking. `txlens` registered `2026-08-31T13:34:43Z` and
was scored across 13 intents with two rank-1s ~40 minutes later, in the same epoch's pass.
`preflight-ssl-verification` registered Aug 30 20:06Z and held five rank-1s the next epoch. The
operative rule is **a registration lands in the next epoch's scoring pass** — do not plan around a
7-day ranking blackout, because there isn't one.

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

## Consumer surfaces beyond the auto-routed ask (read 2026-09-03)

Sources: the console's Integrate Out page (`integrate.telegraphprotocol.com/integrate`) and the
three docs pages it links — [Paying with x402](https://docs.telegraphprotocol.com/docs/using/x402-inference)
(updated 2026-08-13), [WebSocket Signal Subscriptions](https://docs.telegraphprotocol.com/docs/using/websocket-signals)
(updated 2026-08-20), [MCP Server](https://docs.telegraphprotocol.com/docs/using/mcp-server)
(updated 2026-08-13), plus the [Telegraph-MCP](https://github.com/telegraphprotocol/Telegraph-MCP)
README. Read, not exercised: no paid call has been made against any of them. The auto-routed
ask and its 402 were already recorded above; the MCP server was noted in the 2026-08-26 strategy
review. Everything else here was missing from this repo until 2026-09-03.

**1. Call a specific miner — `POST /engine/v1/ask/:id`.** The path value is the miner's numeric
`id` from `/api/miners`, i.e. **4433** for LiveCert, not the registration id. Body
`{ "method", "endpoint", "payload" }` — the upstream verb, our own path (`/ssl-check`, ...), and the
payload forwarded as body or query params. It is x402-gated like the routed ask: the docs' example
is a 402 whose challenge reads "Payment required for direct subnet inference". The node runs the
same pre-request validation as the routed path but **halts** instead of falling back, because the
caller named the miner; `"acknowledge_warnings": true` forces it through. Response shape:
`{ miner_id, miner_name, result, cost_usd, duration_ms, signal_hash }`.
**Track 3 consequence:** a direct call reaches LiveCert regardless of rank, but the G13 guardrail
counts *intent* demand and only the routed path classifies to an intent. Whether direct calls
count is unknown — do not assume they do.

**2. Payment mechanics worth knowing.** Price = miner floor (`min_price_usdc`, 6-decimal units,
`10000` = $0.01) × a demand multiplier from 24-hour intent volume; the `amount` in the decoded
`PAYMENT-REQUIRED` header is authoritative, the body's `price` string is not enough to sign with.
`payTo` is per node — read it from the challenge. Base Sepolia **or Solana Devnet** USDC. **Failed
calls are never charged.** Every paid call yields a `signal_hash`; `GET /engine/v1/signal/{hash}`
returns the signal, the result and the hashed payload for independent verification. Free
discovery: `GET /api/miners?intent=…&status=…&limit=…`, `GET /miner-dispatcher/openapi.json`.
The x402 client needs Node ≥ 20 (WebCrypto); on Node 18 payments fail with
`Crypto API not available`.

**3. WebSocket — `wss://devnode.telegraphprotocol.com/engine/ws`** (the console prints the bare
`ws://13.237.89.59:7044/engine/ws`; same node). Anonymous connections get only `list_subnets` and
`ping`, and the server sends a `connected` greeting first — match replies on `type`, not arrival
order. Everything else needs `?wallet_address=0x…` plus a `personal_sign` challenge/response
within 15 s, **and ≥ $1.00 USDC deposited in escrow** via `EscrowFacet.depositUSDC()` on the
Diamond. Actions: `subscribe` / `unsubscribe` / `list_subscriptions` (one subscription per wallet;
`intents[]`, required `spend_limit_usdc` per session, optional `category`, `min_interest`,
`max_per_hour`), `ask`, `ask_direct` (same semantics as the HTTP pair, and the docs say **no x402
charge at the WebSocket layer** and no deduction from the spend limit), `ping`. Pushed signals
come from the **Daemon's 3-hour cycle** (collectors → LLM router → miner mesh) and are settled
against escrow per signal at the intent's price; hitting the session spend limit cancels the
subscription and closes the socket. Signals arrive in batches, not continuously.

**4. Telegraph MCP server** — a local Node ≥ 20 process, npm `telegraph-protocol-mcp`, on the MCP
Registry as `io.github.telegraphprotocol/telegraph`. Env: `TELEGRAPH_NODE_URL`,
`TELEGRAPH_ENGINE_URL` (`…/engine`), `TELEGRAPH_DAEMON_URL` (`…/daemon`) — one host, path
prefixes — plus a burner `TELEGRAPH_EVM_PRIVATE_KEY`. Tools: free node/daemon reads
(`tg_node_list_subnets`, `tg_daemon_questions` with category/source/since_hours filters),
`tg_engine_ask` (routed, paid), `tg_engine_ask_subnet` (direct, paid), and **one auto-generated
tool per miner endpoint**, refreshed every 5 minutes from `/api/miners`: name
`tg_<slug>_<path>` with `/` and `-` → `_`, so LiveCert appears as `tg_livecert_ssl_check`,
`tg_livecert_storm_alert`, `tg_livecert_weather_forecast`, … to every MCP client with no work on
our side. Building our own MCP layer duplicates this.

**5. The console's boilerplate apps** (TruthWire, TrustFilter, ScholarGuard, ReviewReward,
SuperSignal, AdGuard) all live in one monorepo,
`github.com/telegraphprotocol/telegraph-truthwire`, one folder each — a different repo from the
`telegraph-usecases` one listed under Source pages. Five have live apps on
`*.telegraphprotocol.com`; AdGuard's is "coming soon".

None of this affects Track 1, which is closed and frozen. It is input for Morse
(`../telegraph-morse`): record there which path it uses (routed vs direct vs WebSocket `ask`),
whether the WebSocket's unpaid `ask` is something the rules count, and the escrow prerequisite.


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

## Track 1 deadline — RESOLVED (verified 2026-09-01, rules page)

Track 1 and Track 2 ran **Aug 17 – Aug 31, 2026**; Track 3 runs Aug 31 – Sep 7; Winner Selection
Sep 8–18; announcement Sep 19–25. The home-page "SEP 7 23:59 UTC SUBMISSIONS CLOSE" countdown is
the **Track 3** deadline, not Track 1's. Source: https://hackathon.telegraphprotocol.com/rules,
read 2026-09-01 local (= 2026-08-31 UTC). Consequences: what matters post-close is the miner
staying LIVE and ranked through Track 3, whose routed requests are counted in judging.

**Two conclusions first drawn here were wrong, and cost most of the remaining window before they
were caught (2026-08-31 ~21:00Z).**

1. **"Track 1 has closed" was a timezone error.** The close is Aug 31 **23:59 UTC**. This file was
   written at 02:16 local (IST, UTC+5:30) on Sep 1, which is **20:46 UTC on Aug 31** — nearly three
   hours *before* the deadline, not after it. Always resolve the deadline in UTC against `date -u`,
   never against the local date the environment reports.
2. **"A new registration's ~7-day unranked grace period would outlast Winner Selection" is false.**
   See G58: registrations are scored in the next epoch's pass, same day. The grace period is a
   traffic-share throttle.

What survives: the Aug 17 – Aug 31 dates themselves, which the rules page confirms verbatim.

## Rival: preflight-ssl-verification is public — github.com/shreshth006/Preflight

Registered 2026-08-30T20:06Z, runs a six-hour Claude autopilot, and iterates fast. On 2026-08-31
every commit targeted URL_SCAN (not an intent we serve); no SSL/IP/wallet answer changes were
committed the day of the close. Their wallet caveat-first past-dated shape is what G55's reorder
matched. Endpoint watchdog stays the ground truth for deploys.

## Submitting is a SEPARATE step from registering (verified 2026-08-31 ~21:45Z)

`https://submissions.telegraphprotocol.com` — tabs for Track 1 (Miner), Track 2 (WASM), Track 3
(coming soon). Track 1 takes an **X username**, then one or more rows of **miner ID + its YAML
config file**, and a wallet **SIGN & SUBMIT**. Deadline shown in-page: **Mon, 31 Aug 2026 23:59:59
UTC**, matching the rules page.

**Being registered on-chain and ranked does not enter you.** A miner can be active, scoring and
holding rank 1 and still not be submitted. This was found with about two hours left.

- **"Miner ID" is the on-chain registration id** (402), not the `id:` field inside the YAML (4433).
  `/api/miners/4433` does not resolve; `/api/miners/402` does.
- **Upload `track1-miner/miner.yaml`** — the file whose bytes hash to the registered `yaml_hash`.
  The root-level `SUBMIT-THIS-miner.yaml` is a stale 10-intent snapshot (22,807 bytes,
  `0x78932fb1...`) kept from the 389 registration. Its name is a trap; do not upload it.
- A re-`updateMiner` mints a new registration id, which would make an already-submitted id stale.
  Submit only after the registration you intend to be judged on is `active`.

## This machine's IPv6 path to raw.githubusercontent.com hangs (2026-08-31)

`curl` to `raw.githubusercontent.com` takes **~15.1s to connect** over the default stack and
**0.036s with `-4`**, reproducibly. `github.com`, Vercel and devnode are all sub-100ms. It is a
local IPv6 problem, not GitHub and not the manifest. Use `curl -4` here before concluding a host is
slow — a 15-second hang measured from this machine says nothing about what Telegraph's node sees.
