# JUDGING.md — how Track 1 is actually scored

Published source: https://hackathon.telegraphprotocol.com/rules — re-read **2026-08-29**.
Organizer clarification supplied directly by the operator on **2026-08-29**.

Three findings here contradict earlier assumptions. All three change the plan.

---

## 1. Track 1 closes **Aug 31**, not Sep 7

| Track | Window |
|---|---|
| **Track 1 — Miners** | **Aug 17 – Aug 31** (15 days) |
| Track 2 — Script Authors | Aug 17 – Aug 31 |
| Track 3 — Applications | **Aug 31 – Sep 7** |
| Winner selection | Sep 8 – Sep 18 |
| Announcement | Sep 19 – Sep 25 |

Sep 7 12:00 UTC — the countdown on the landing page — is when **Track 3** closes, not our track.

**We have ~5 days, not ~12.**

And separately: *"Miners and Script Authors must remain live and operational throughout Track 3."*
So the miner must keep serving until **Sep 7** even though building stops Aug 31. Uptime is a
rule, not just a scoring input.

## 2. Per-intent scoring is published; final cross-intent aggregation is not

Every miner is scored out of 100:

```
75 pts  Normalized Performance  =  your average Canonical Score
                                   ─────────────────────────────
                                   highest average score in YOUR intent

25 pts  Engagement & Updates on X  (quality, consistency, reach; tag @Telegraphprotoc)
```

**The best miner in every intent automatically gets the full 75 within that intent.** Leaderboards
are per-intent and independent — *"Miners solving completely different tasks do not affect your
ranking."*

The organizer clarified on 2026-08-29 that Track 1 winner judging will use an **average across all
intents**, but that the exact formula will only be finalized during judging. Therefore the former
claim that one quiet-intent rank 1 alone maxes the entire performance component is withdrawn. The
published intradomain normalization is still the per-intent input; the cross-intent denominator,
eligibility treatment, and averaging details remain unfinalized.

**X is 25% of the score.** Not a tiebreaker — a quarter of the total, from a standing start.

## 3. The eligibility guardrail — the biggest risk we have

> An Intent must have at least **3 active Miners** and receive at least **100 real requests from
> Track 3 applications** to be eligible for global cash prizes.

Both conditions apply to **our intent**, not to us.

| Condition | `SSL_VERIFICATION` status |
|---|---|
| ≥3 active miners | **Met** — 3 incumbents, 4 once we register |
| ≥100 real Track 3 requests | **Unknown and outside our control** |

We can be rank 1 with a perfect score and win nothing if no Track 3 application happens to check
SSL certificates. Performance does not rescue an ineligible intent.

**The mitigation is to build a Track 3 application ourselves that genuinely consumes
`SSL_VERIFICATION`.** That serves three purposes at once: it protects our intent's eligibility, it
competes for a second $2,000 prize pool, and Track 3 opens exactly when Track 1 closes, so the
windows do not collide.

To be explicit about the line: rule 04 forbids *"artificial inflation of metrics or gaming the
system."* The mitigation is a **real, useful application** that has an honest reason to check
certificates — a TLS expiry monitor is a genuine product, not a request generator. Anything that
exists only to manufacture 100 calls would be gaming, and is out of bounds.

## Prizes

| Track | Pool | 1st | 2nd | 3rd |
|---|---|---|---|---|
| Miner | $2,000 | $1,000 | $600 | $400 |
| Script Author | $1,000 | $500 | $300 | $200 |
| Application | $2,000 | $1,000 | $600 | $400 |

Top 3 miners **by total normalized score across all intents** take the Miner pool.

Treat that published wording together with the organizer's later clarification: the aggregate will
be an average across intents, but its exact implementation is still TBD. Do not present a locally
reconstructed formula as final.

## Other binding rules

- All participants **must join the official Discord**, and *"staying active is expected."* (Done.)
- Updates used for judging must be **publicly posted on X and tagged** `@Telegraphprotoc`.
- Track 3 apps must use **real** miners — simulated or mocked data is disqualifying.
- Artificial metric inflation is disqualifying.

## What the organisers say they want

> "We are not looking for the best demo. We are looking for real evidence that the quality
> flywheel works."

The organizer also stressed that the hackathon reward is only the cold-start incentive. In normal
operation, agent requests route toward top-ranked miners; ranking first in more intents should
therefore increase the range of demand and per-query revenue available to the miner. Track 1 should
optimize for durable service quality, uptime, and useful intent coverage—not a one-time prize only.

They name "surface-level integrations" as what will *not* stand out. The stated high-value areas
are on-chain intelligence pipelines, autonomous agents, multi-intent combinations, confidence
threshold experiments, signal-quality work, and real-time streaming. Worth reading as guidance for
the Track 3 application, where creativity is scored.
