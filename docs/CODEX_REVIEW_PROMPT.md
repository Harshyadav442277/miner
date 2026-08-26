# Prompt for an independent review

Copy everything below the line into Codex (or any reviewing model) with the repo attached.

---

You are reviewing a competition entry. Be adversarial. I want to find what's wrong before the
judges do, not be told it looks good.

## Context

This is a **miner** for the Telegraph protocol — an API marketplace where autonomous agents buy
answers. It is entered in Telegraph Hackathon Season I, Track 1, which **closes 2026-08-31**.
It is already deployed and registered on-chain (registrationId 225, `activation_status: active`).

Repo: https://github.com/Harshyadav442277/miner
Live: https://miner-wine.vercel.app
Explorer: https://explorer.telegraphprotocol.com/miners/livecert

**How winning works — this drives everything:**

- Score = **75% normalized performance + 25% X engagement**.
- Normalized performance = our average score ÷ **the best score in our intent**. The top miner in
  an intent automatically gets the full 75, so *rank 1 in any intent is worth the same as rank 1
  in a hard one*.
- Routing pays **70/20/10 to ranks 1/2/3 and nothing to 4th**.
- Validators **spot-check every ~20 seconds**; a score >20% below our leaderboard score triggers an
  immediate **Routing Revocation**.
- Scoring runs in a WASM module given three plain strings — `question`, `ground_truth`,
  `miner_answer` — returning 0..1. The reference implementation scores
  `matched ÷ total words in the miner's answer`, so **verbose answers are penalised**.
- **Eligibility guardrail:** an intent needs ≥3 active miners **and ≥100 real requests from Track 3
  applications** or it wins nothing regardless of rank.

We serve three intents: `SSL_VERIFICATION` (Tier A, deterministic), `STORM_ALERT` (Tier A),
`WEATHER_FORECAST` (Tier A). Read `docs/TELEGRAPH_FACTS.md`, `docs/INTENT_OCCUPANCY.md`,
`docs/JUDGING.md` and `GAPS.md` first — they contain the verified protocol facts and the
reasoning behind every decision.

## What I want you to attack, in priority order

**1. Will we actually score well?**
`src/ssl.ts`, `src/storm.ts`, `src/forecast.ts` produce the answers. The `reason` field is
deliberately one terse factual sentence because of the word-overlap arithmetic above. Is that
reasoning correct? Would different phrasing score better against a plausible ground truth? Is
`semantics.signal_mapping.label_field: verdict` in `miner.yaml` the right choice — should it point
somewhere else, and does our vocabulary (`valid` / `expired` / `self_signed` / `hostname_mismatch`
/ `untrusted` / `unreachable` / `not_yet_valid`) match what a scorer would treat as correct?

**2. Input robustness — our biggest known unknown.**
Telegraph's engine classifies a natural-language question and calls us. We do **not** know the
exact call shape it constructs, because `/engine/v1/ask` is payment-gated and we have never
observed a real one (`GAPS.md` G15). `src/extract.ts` defensively extracts a hostname or place
name from a raw sentence. **Try to break it.** What input shapes would still return HTTP 400 or a
wrong answer? Consider: POST bodies instead of query strings, JSON payloads, different parameter
names, punycode/IDN domains, IPv6, ports, wildcards, subdomains, non-English place names,
coordinates in other formats, multiple entities in one question, adversarial or injected input.

**3. Correctness of the TLS logic.**
`src/ssl.ts` performs a live handshake and grades the certificate. Is the verdict precedence right
(expired > not_yet_valid > self_signed > hostname_mismatch > untrusted)? We distinguish a
self-signed *leaf* (`DEPTH_ZERO_SELF_SIGNED_CERT` → `self_signed`) from a self-signed *root*
(`SELF_SIGNED_CERT_IN_CHAIN` → `untrusted`) — is that the distinction a scorer expects? What about
revoked certificates, OCSP, CT compliance, expiring-soon, weak keys, TLS version, SNI edge cases?

**4. Reliability under a 20-second spot-check cadence.**
It is a Vercel serverless function with zero runtime dependencies and a 60s in-memory cache. Where
are the failure modes? Cold starts, concurrency, the cache being per-instance and therefore mostly
useless across a serverless fleet, an 8s handshake timeout, Open-Meteo rate limits or outages
(`storm-alert` and `weather-forecast` depend on it — `ssl-check` has no upstream at all).

**5. Anything that would embarrass us.**
Security holes (we accept arbitrary hostnames and connect to them — SSRF against internal ranges?),
resource exhaustion, misleading claims in the README or docs, or a bug that only shows under load.

## Ground rules

- **Be concrete.** "Consider adding validation" is useless. Give the input, the expected output,
  the actual output, and the file and line.
- **Rank by impact on winning**, not by code tidiness. A style nit that doesn't move the score is
  noise; a 400 on a scorable question is critical.
- **Say when I'm wrong about the protocol.** Every claim in `docs/TELEGRAPH_FACTS.md` cites a
  source and a date. If any is misread, that matters more than any code defect.
- **Don't rewrite it.** Tell me what's broken and why; I'll decide the fix.
- If you think the whole strategy is wrong — wrong intents, wrong differentiator, wrong
  architecture — say so plainly and argue it. `docs/INTENT_OCCUPANCY.md` has the reasoning and the
  live occupancy data it was based on. That reasoning has already been wrong once: I initially
  recommended `ONCHAIN_TX_LOOKUP` before the data showed it was the second-most crowded intent
  on the board.

## Known open items — don't just rediscover these

`GAPS.md` tracks them. In particular: G13 (the ≥100 Track 3 request guardrail, our single biggest
risk to winning anything), G14 (tests depend on live external hosts, so CI is flaky), G15 (the
engine's real call shape is unverified). Tell me something these don't already cover.
