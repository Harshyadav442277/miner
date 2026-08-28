# PRD.md — Telegraph Hackathon, Season I / H1

**Status:** scope frozen 2026-08-26. Intent decided: `SSL_VERIFICATION`.
**Deadline:** **Track 1 closes 2026-08-31** (~5 days from 2026-08-26). The Sep 7 12:00 UTC
countdown on the landing page is Track 3's close, not ours. The miner must nonetheless stay live
and operational through **2026-09-07** — that is a rule, not just a scoring input.
**Track:** 1 — Miner, plus a **Track 3 application** added to scope 2026-08-26 for eligibility
reasons (see below). Track 2 remains out of scope.

---

## Goal

Register and operate a Telegraph miner that reaches **rank 1 in its intent** by the end of H1,
and can show a real track record of served requests.

Rank matters more than it sounds. Routing is **70 / 20 / 10** to ranks 1/2/3 and **nothing to
4th**. This is not a leaderboard for pride — position *is* the revenue, and it is the primary
judging criterion.

## Why we can win

Three structural advantages, all from [TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md):

1. **A miner is declarative.** `base_url` points at an upstream API; Telegraph proxies to it. A
   valid miner can be pure YAML with no code. The build cost of *entering* is near zero, so our
   time goes into choosing well and operating reliably rather than into plumbing.
2. **The docs ship a weather example** and tell newcomers to "register it as-is." Most of the
   300+ registrants will land on weather. Every intent they crowd is one we should avoid, and
   every intent they ignore is a 70% slot sitting unclaimed.
3. **Scoring rewards reliability, which is buyable.** Spot checks run every ~20s and a 20% score
   drop triggers immediate Routing Revocation. Most hobby registrations will sit on sleepy free
   tiers and get revoked. Simply *staying up* is a competitive edge.

## Success criteria

| # | Criterion | Measure |
|---|---|---|
| S1 | Miner is live | `activation_status: active` at `/api/miners/<registrationId>` |
| S2 | Survives grace period | 7 days, zero Routing Revocations |
| S3 | Rank 1 in its intent | Explorer leaderboard — worth the **full 75 performance points** |
| S4 | Demonstrable traffic | Non-trivial served-request count |
| S5 | X engagement | **25% of the total score.** Tagged `@Telegraphprotoc`. See [docs/BUILD_IN_PUBLIC.md](docs/BUILD_IN_PUBLIC.md) |
| S6 | Intent stays eligible | ≥100 real Track 3 requests to `SSL_VERIFICATION` — see [docs/JUDGING.md](docs/JUDGING.md) |

S1, S5 and S6 are must-haves — S6 because no amount of performance rescues an ineligible intent.
S2–S4 are the competitive layer.

## In scope

- **One** miner, one intent, registered on Base Sepolia
- Miner YAML meeting the strict schema, pinned to IPFS via the web console
- Sandbox validation before spending gas
- A hosted endpoint **only if** the chosen intent needs logic no upstream API provides
- Uptime and latency monitoring against the ~20s spot-check cadence
- Public build log on X across the build window

## Non-goals

Deliberately excluded to protect the deadline:

- **Track 2 (Script Author).** Different skill, separate submission. Revisit for H2 in October.
- ~~**Track 3 (Applications).**~~ **Reversed 2026-08-26.** The rules impose an eligibility
  guardrail: an intent needs ≥3 active miners **and ≥100 real requests from Track 3 applications**
  to be eligible for cash prizes. We cannot rank our way out of an ineligible intent, and nobody
  else is obliged to build against `SSL_VERIFICATION`. A genuine Track 3 app that consumes it is
  now the mitigation — and competes for a second $2,000 pool. Track 3 runs Aug 31–Sep 7, exactly
  when Track 1 closes, so the windows do not collide. See [docs/JUDGING.md](docs/JUDGING.md).
- **Multiple miners.** Spreading across intents splits attention; 70/20/10 rewards depth.
- **`on_chain` block.** ERC-8183 job targeting is optional and unnecessary for ranking. Ship without.
- **Mainnet.** H1 is Base Sepolia testnet only.
- **Custom scoring, validator node, MACHINA economics.** Not our layer.

## Constraints

- **Registration is on-chain and immutable in practice.** Mistakes cost an `updateMiner` tx and a
  new `registrationId` + `intentId`. Validate in the sandbox first, every time.
- **A rejected registration releases its slug immediately** — someone else can take the name.
- **`min_price_usdc` floor** is $0.01 minimum. Changeable via `updateMiner` but not for free.
- **Wallet operations are the user's.** Claude does not connect wallets, sign, or send
  transactions. See [CLAUDE.md](CLAUDE.md).

## Open decisions

**D1 — Which intent? — CLOSED: `SSL_VERIFICATION`**
Full reasoning in [track1-miner/docs/INTENT_OCCUPANCY.md](track1-miner/docs/INTENT_OCCUPANCY.md). In short: it is
**Tier A (deterministic, WASM exact match)**, has only **3 incumbents**, and each of the three has
a specific weakness — one on Render with cold starts, one answering from certificate-transparency
logs rather than the live server, one running 60–120s Qualys assessments against a 20s spot-check
cadence. Certificate facts are objectively checkable, so Tier A scoring is a problem we can simply
solve rather than a judgement we must hope goes our way.

The zero-occupancy intents were all Tier B (LLM-judged) and were rejected for it: zero competition
under a judge we cannot influence is worth less than third place under exact match.

**D2 — Host our own endpoint? — CLOSED: yes.**
Reading a peer certificate needs a live TLS handshake (`tls.connect` + `getPeerCertificate`), which
no free upstream provides in the form this intent wants. Building it also removes every third-party
dependency, so no upstream rate limit or outage can trigger a Routing Revocation against us.
Implementation in [track1-miner/miner/](track1-miner/miner/) — Node, zero runtime dependencies.

**D3 — Slug and numeric `id`. — CLOSED**
`slug: livecert`, `id: 4433`. Both verified free against the live catalog of 89 miners on
2026-08-26 (4433 for the alternate-TLS port; memorable and on-theme). Deliberately *not* named in
the existing `*wire` family (chainwire, skywire, gaswire, tvlwire, scorewire) to avoid reading as
a clone of another operator's fleet.

**D4 — Fee address.**
Which EVM wallet receives MACHINA. Can be the registering wallet or a separate cold address.
User's call; no payouts on testnet, so low stakes for H1.
