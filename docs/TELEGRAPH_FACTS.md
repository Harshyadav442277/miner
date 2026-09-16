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

## Organizer answer — Discord, 2026-09-04 ~14:50 UTC (via the user, to Morse's questions)

Asked whether a "check my miner's endpoints" tool would be useful, and how a Track 3 app could
reach all three top-ranked miners to compare answers, an organizer answered both together:

5. **Do not build tooling that duplicates the protocol.** The explorer "already caters to all of
   this" and "has all the data". Checking or re-ranking miners from an app is "building a router
   for our direct miners, which is already handled by Telegraph".
6. **Paying N miners per request is uneconomic and reads as spam.** Finding the best miner is
   "what the whole protocol is designed to do"; an app that pays several miners per question to
   re-derive it "doesn't work economically for the end user" and "would be spamming".
7. **What they want from Track 3 is adoption of an app or agent built on Telegraph.** The part of
   Morse they called good was "extending Telegraph into Telegram". Consequences recorded in the
   Morse repo (GAPS G32): its podium, automatic second opinion and consensus report were retired
   the same day, and the miner-check idea was dropped before it was built.

## Organizer answer — Discord, 2026-09-07 ~23:19 UTC (via the user, on standing watches)

The user reported field research to the CTO: friends and CS students who relay sports scores, storm
warnings and token prices by hand into Telegram and WhatsApp groups all day. What they asked for was
not a bot to question but a bot to instruct once — "watch India vs Australia" — that posts on change
and on the final result, then stops. The design put up for a ruling was deliberately bounded: a human
starts each watch, every watch has an end, one routed call per check on a slow cadence, a per-person
cap, an `/unwatch`, and the subscriber recorded on every call in the public ledger. The same research
reported, unprompted and uncontradicted, that users keep asking for **more intents**.

8. **A standing watch a human explicitly subscribed to counts as organic demand** — "Yes, it will
   count." This answers the question the 2026-09-04 pivot left open, where re-ranking and paying
   several miners per question were called spam (items 5–6). Bounded, human-initiated, attributed
   repetition is not in that category. It removes the reason the capped-watch stretch item in the
   Morse repo's `PHASES.md` was never built; see that repo's GAPS G37.
9. **The WebSocket subscription is their macro version of the same idea** — "we already have some
   version of it on macro level, you can look into our websockets subscription where answers and
   questions are sold to agents, on which they can make decisions." Mechanics are in "Consumer
   surfaces" below. Three things it does not give a group chat: you subscribe to an *intent*, not a
   subject, so a watch on one cricket match means taking every `GAME_RESULT` signal and filtering;
   there is **one subscription per wallet**, and chat users hold no wallets; and the daemon's
   3-hour push cadence is far too slow for a live score, where polling the miner directly wins.
   What does transfer is the **billing shape** — escrow, a per-session spend limit, an hourly cap,
   and automatic cancellation when the budget is exhausted. That is the safety model a watch needs
   and it already exists.

Replied 2026-09-09 ~21:29 UTC, committing to build on the WebSocket subscription rather than beside
it, and to test the bots in Telegram and WhatsApp groups after the judging window and report back.
Answered "awesome". One question was deliberately **not** asked and is still open: whether many
named watches fanned out under one bot-held wallet is acceptable, or whether each watch must resolve
to its own wallet and escrow. Ask it once there is a test result to attach to it.

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

## The 70/20/10 split governs a small minority of traffic (measured 2026-09-06)

**Rank buys share of `daemon` traffic only, and `daemon` traffic is ~1.6% of the total.** Paged the
question feed (`explorer.telegraphprotocol.com/api/daemon/api/questions`, `limit` caps at 100, so
page with `offset`) over the 8 hours to 2026-09-06 05:41Z — 3,000 rows:

| Type | Rows | Who decides the miner |
|---|---|---|
| `direct` | 2,952 | **the caller**, by miner id — rank is irrelevant |
| `daemon` (routed) | 48 | the router, by the 70/20/10 rank share |

Across our thirteen intents in that window: **237 requests, livecert received 2.** We were rank 1
in IP_GEOLOCATION and CONTENT_EXTRACTION and received **none** of theirs, because every one was a
`direct` call addressed to somebody else.

| Intent | Total | livecert | Recipient |
|---|---|---|---|
| STORM_ALERT | 137 | 2 | `skywire-storm-alert` 122, `finwire-financial-data` 12 |
| WEATHER_FORECAST | 80 | 0 | `skywire-forecast` 80 |
| ACADEMIC_SEARCH | 7 | 0 | `scholarwire-academic-search` 7 |
| CONTENT_EXTRACTION | 6 | 0 | `netwire-content-extraction` 6 |
| LANGUAGE_TRANSLATION | 5 | 0 | `langwire-translation` 5 |
| IP_GEOLOCATION | 1 | 0 | `netwire-ip-geolocation` 1 |

The recipients are a family — `skywire-`, `netwire-`, `langwire-`, `scholarwire-`, `finwire-` —
one operator running single-purpose miners and driving their own direct volume to them.

Of the 48 genuinely routed requests, **none** fell in an intent we lead: RESEARCH_QUERY 23,
ACADEMIC_SEARCH 7, CVE_LOOKUP 2, STOCK_PRICE 2, then singles. Routed volume network-wide is on the
order of **150 requests/day across all 45 canonical intents**.

**What this changes.** "Rank 1 takes 70%" is still true and still worth pursuing — it is what the
leaderboard and the judged record measure. But it is not a lever on request *volume*: 70% of a
150/day pie split 45 ways is not what the busy miners are living on. Two distinct goals, and they
need different work:

- **Rank** — beat the cliff in the intents where we sit at 4+ and therefore earn *nothing* routed.
  At epoch 310 that is WEATHER_CHECK (#7, ratio 0.0996) and WALLET_BALANCE_CHECK (#7, 0.0000).
- **Volume** — something has to call `POST /engine/v1/ask/4433` directly. No change to miner code
  can produce this. Morse is the only direct caller we control.

This also sharpens the reading at the end of "Consumer surfaces": the organizers' own Track 3
examples bypass routing, and the feed now shows the whole network does too, by 60 to 1.

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
subscription and closes the socket. Signals arrive in batches, not continuously. **Do not build on the free ask.** An unpaid ask on the socket, when the same call over HTTP is x402-gated, reads as an oversight rather than a policy; assume it will be closed.

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

**6. There is a third path, and it is the one the organizers' own apps use.** Every reference app in
`telegraph-usecases` (AdGuard, TruthWire, ScholarGuard, ReviewRadar, TrustFilter) calls the node's
**miner dispatcher directly** — `POST {node}/subnet-dispatcher/v1/<minerId>/<endpoint>` (older
name; the spec now says `miner-dispatcher`) — with an x402 fetch wrapper, hard-coded to miner ids
32, 34, 101 and 102. None of them touches `/engine/v1/ask` or routing at all. The node publishes
the whole surface as OpenAPI at `GET /miner-dispatcher/openapi.json` (270 paths on 2026-09-03), and
**LiveCert is there as twelve operations**, `/v1/4433/ssl-check` … `/v1/4433/ai-detect`, with our
manifest descriptions verbatim. The MCP server discovers miners from
`/miner-dispatcher/integrations` and its `tg_engine_ask_subnet` posts to `/engine/v1/ask/<id>`.
**Guardrail reading this changes:** if the organizers' own Track 3 examples bypass routing, then
"real requests from Track 3 applications" to an intent cannot mean routed requests only — direct
calls to a miner must count toward the intents it serves. Which intent a direct call to a
multi-intent endpoint (our `/weather-forecast` serves two) is credited to is still unknown.
See also GAPS G67 for how the spec renders our parameters.

None of this changes Track 1, which is closed and frozen: the miner is already reachable on all
three paths and inside the MCP server with no action from us. It is input for Morse
(`../telegraph-morse`): call LiveCert by id **4433** when the demand is meant to land on our
intents, use routing when the point is the network picking; note the escrow prerequisite before
touching the WebSocket; and the x402 client needs Node ≥ 20.


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

- **"Miner ID" is the on-chain registration id** (1378 since 2026-09-09; 402 before it), not the
  `id:` field inside the YAML (4433). `/api/miners/4433` does not resolve; `/api/miners/1378` does.
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

## Docs re-check 2026-09-16 (~08:40 UTC) — all 25 pages read; 13 updated 2026-09-08/09

Source: https://docs.telegraphprotocol.com/docs/* fetched with curl and a browser user-agent
(the root answers a 307 loop to curl; the browser pane loads it). Pages updated 2026-09-09:
introduction, miners/{miner-overview, miner-registration, validation-api, yaml-config},
scoring/build-a-scoring-module, troubleshooting, using/{engine-ask, inference-paths, mcp-server,
websocket-signals}; 2026-09-08: using/{intents, erc8183-jobs}. Everything else is August or older.

**What changed, and what it means for this miner**

| Fact | Now (docs) | Live check | Effect on us |
|---|---|---|---|
| Payment for the HTTP ask | Still x402 per call (`PAYMENT-SIGNATURE`; the library handles the 402 challenge). The new page `inference-paths` lists six rails: HTTP ask, ask/{id}, WebSocket ask ($0.01 from escrow per call), WebSocket subscribe (per delivered signal), ERC-8183 job (jobBasePrice, 1 USDC), on-chain miner request (gas only), plus the free Daemon feed | not re-verified | None. "402 changed" is not supported by the docs; the docs added a chooser, not a replacement |
| Scoring tiers | Every intent labelled Tier A (deterministic, "WASM exact match"), Tier B (LLM-Judge: "LLM context + WASM"), or A/B hybrid. Of ours: A = STOCK, CRYPTO, FINANCIAL, CURRENCY, WALLET, GAS, TOKEN_HOLDER, TVL, ONCHAIN, WEATHER_CHECK, STORM, WEATHER_FORECAST, SPORTS, GAME, SSL, CVE, IP, URL_SCAN, FRAUD; B = WEB_SEARCH, NEWS_HEADLINES, NEWS_SEARCH, RESEARCH_SYNTHESIS, RESEARCH_QUERY, ACADEMIC, FACT_CHECK, TELEGRAPH_KNOWLEDGE, SENTIMENT, TEXT_CLASSIFICATION, CONTENT_VERIFICATION, AI_TEXT, TEXT_AUTHENTICITY, CONTENT_EXTRACTION, LANGUAGE_TRANSLATION; hybrid = EVENT_OUTCOME; A = CROSS_CHAIN | consistent with G154/G168: the B-tier references are LLM prose | Tier B leaders are LLMs; keyless prose scores near zero there unless the reference is a short verdict (FACT_CHECK, CONTENT_EXTRACTION still cross) |
| Canonical intents | Page: 108 as of 2026-09-08 (63 added that day) | `/engine/v1/intents`: **134** on chain; **45 champions**, unchanged (G82) | None of the 89 new intents can rank (G118). Ten miners already sit on most of them. Rankable and unserved by us: AGENT_TASK, CHAT_COMPLETION, CONTENT_MODERATION, DEEPFAKE_DETECTION, IMAGE_VERIFICATION, LANGUAGE_GENERATION, MEDIA_AUTHENTICITY_CHECK, TASK_COMPLETION, TEXT_GENERATION, TWITTER_SEARCH (0 miners), VIDEO_VERIFICATION |
| Registration checks | New "request-contract rejections": every endpoint serving an intent must declare `intents:` and a `description:`; `semantics.supported_intents` non-empty; an endpoint intent must be in supported_intents. Warnings: an endpoint without `params` ("the node has to guess your field names — the most common reason an active miner fails the calls it is sent"); a utility endpoint without intents is legal | our 1408 is active and predates the checks | They apply on the NEXT `updateMiner`. Validate at integrate.telegraphprotocol.com first (unchanged rule 3) |
| Activation | Event-driven, "usually within a minute"; not epoch-gated. `unreachable` retries every ~5 min up to 5 times; `rejected` is terminal (fix, then updateMiner); a rejected registration releases its slug immediately | matches G60/G87 | None |
| Validation API | `POST https://integrate.telegraphprotocol.com/api/validate {yaml, api_key, miner_address}` — same checks and messages as the console, no wallet; per-endpoint timeout 30 s on the default node | not run today | Scriptable pre-check for the next update |
| API keys | Stored per slug, bound to the registering wallet; installed via a keccak fingerprint challenge + personal_sign; not in the YAML; not from the environment | n/a (keyless miner) | None |
| Scoring ABI | `rank_answer(q, gt, ma)` → f32; the documented example scores the fraction of the miner answer's words that appear in the ground truth | matches the harness (`track2/harness/wasm-abi.mjs`) and the G153/G168 measurements | Extra words and numbers the reference lacks are what cost score |
| Spot checks | ~every 20 s, keyed on the latest Base L2 block hash; a >20 % drop against the last leaderboard score triggers routing revocation | unchanged from 2026-08 | None |

Not re-read today: protocol/{tokenomics, roles, addresses-and-params}, validators/*, deployment
(dated August or earlier; unchanged since the last check). The intents page is explicitly behind
the chain ("the chain is what actually decides"): 26 intents on chain are not on the page.

## Rules and protocol re-check 2026-09-16 (~09:10 UTC)

**Rules page (https://hackathon.telegraphprotocol.com/rules): unchanged.** The Track 1 tab text
fetched today matches [docs/JUDGING.md](JUDGING.md) (read 2026-08-29/30) word for word: track
windows (Track 1 and 2 Aug 17–31, Track 3 Aug 31–Sep 7, winner selection Sep 8–18, announcement
Sep 19–25), the 75/25 split, "the best Miner in every Intent automatically gets full points", the
guardrail (≥3 active miners and ≥100 real Track 3 requests per intent), the six important rules,
and the prize table ($2,000 / $1,000 / $2,000). Only the Track 1 tab was compared; the Track 2 and
3 tabs are JS-rendered and were not re-clicked. Snapshot:
`track1-miner/docs/evidence/rank1-build-2026-09-16/rules-page-2026-09-16.txt`.

**Landing page:** Season I is a three-hackathon series — H1 $5K (Aug 17–Sep 7, this one),
**H2 $10K "mid October 2026"** ("improve on Hackathon 1, attract more participants, refine Miners
and evaluation scripts"), H3 mainnet "December 2026 onwards, rewards TBD". The page's own miner
judging bullets add "number of applications built on your Miner" and "total requests served" to
ranking and X updates; the rules page's 75/25 formula is the binding one. The static countdown in
the HTML is stale server-rendered text, not a new deadline.

**Protocol pages (protocol/how-it-works, roles, tokenomics, addresses-and-params; all dated
2026-08-12/13): unchanged** against the facts above — 2 % treasury / 98 % TWAP, 100 USDC settlement
minimum, the demand-multiplier table, 70/20/10 routing, 5 % grace share for 7 days, spot checks
~every 20 s with revocation on a >20 % drop, 43/64 governance, jobBasePrice with the same
multiplier table for ERC-8183 jobs, Diamond `0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8`. The
miner-overview page (updated 2026-09-09) repeats the same numbers; it still says a grace-period
miner "doesn't appear on the leaderboard", which G58 disproved by observation.

**YAML schema drift since the "eight keys" note above:** `endpoints[]` now accepts **ten** keys —
the eight listed plus `intents` (required on at least one endpoint) and `params` (recommended; the
request contract by location, `required`/`optional`). Our manifest already declares `intents`,
`description` and `params` on all 35 endpoints, so the new request-contract rejections would pass
on an `updateMiner`; validate at integrate.telegraphprotocol.com first regardless.

## Escrow is the default payment rail (announced on Discord 2026-09-16; docs page dated 2026-09-16)

Source: https://docs.telegraphprotocol.com/docs/using/escrow-inference (not in the docs nav at the
09:00 UTC crawl; snapshot `track1-miner/docs/evidence/rank1-build-2026-09-16/docs-escrow-inference-2026-09-16.txt`).

- **What it is.** A second scheme inside the same x402 challenge: the 402 body's `accepts` array
  now carries `{"scheme":"escrow","network":"eip155:84532","price":"$0.01","payTo":<Diamond>}`
  next to the EVM exact scheme. The caller deposits USDC once (`EscrowFacet.depositUSDC` on the
  Diamond, `0x036C…CF7e` USDC on Base Sepolia), then signs a human-readable EIP-191 message per call
  (wallet lowercased, amount in μUSDC from the template, ≤2-minute validity window, fresh nonce)
  and sends it base64 in `X-PAYMENT` (not `PAYMENT-SIGNATURE`). No facilitator, no per-request
  on-chain transaction; charges settle once per epoch in `submitEpoch`. Receipt in
  `X-PAYMENT-RESPONSE` with `rail: "escrow"`, `receipt_hash`, `epoch_id`, no `tx_hash`.
- **x402 exact is still accepted** — the page calls escrow "the second way to pay"; the
  announcement calls it the default for new integrations and asks existing apps to migrate.
  Announced latency: escrow 2.38 s vs 5.82 s x402 (Base) and 7.01 s (Solana), "varies by miner".
- **Effect on this miner: none.** "Both rails converge on exactly the same aggregator, the same
  merkle root and the same claim path. A miner cannot tell which one paid it." Our earnings path,
  registration, scoring and routing are unchanged. Nothing to deploy.
- **Effect on callers we control.** Morse (`../telegraph-morse`, Track 3) pays miners with x402;
  it keeps working, but the organisers now ask apps to migrate to escrow. That is a change for the
  Morse repo, not this one, and it is logged there, not here.
- Same-day operational notes for a caller: the body field is `query`; a refusal burns the nonce
  only after the signature verifies; `insufficient escrow … available=0` means the signature was
  fine and only funding is missing; withdrawals are timelocked.
