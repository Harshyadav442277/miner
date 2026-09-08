# Free inference for the LLM-backed intents — investigated 2026-09-08

Asked: can a free inference provider serve the intents that need a language model
at request time, without provisioning a paid key?

**Answer: no, and the reason is not cost. It is that an unreliable model backend
is worse than no backend, because inconsistency is exactly what triggers Routing
Revocation — and revocation removes the whole miner from the routing table, not
just the failing intent.**

## What the LLM-backed intents are worth

These are the reliably crossable intents on the network, measured over every
scored epoch:

| intent | miners | epochs crossed | leader (latest) |
|---|---:|---:|---:|
| AGENT_TASK | 7 | **58/58** | 0.9513 |
| LANGUAGE_GENERATION | 12 | **34/34** | 0.9987 |
| TASK_COMPLETION | 11 | **36/37** | 1.0000 |
| TEXT_GENERATION | 4 | 89/144 | 0.9965 |
| WEB_SEARCH | 11 | 29/48 | 0.9999 |
| CHAT_COMPLETION | 13 | 1/1 | 1.0000 |

Six intents, plus TEXT_CLASSIFICATION and RESEARCH_SYNTHESIS which are also
model-shaped. That is what reaching "10–15 additional intents" would take.

## No keyless inference exists

Probed directly, 2026-09-08:

```
Cloudflare Workers AI     404  needs account id + API token
HuggingFace Inference     401  needs a token
Groq                      401  "Invalid API Key"
OpenRouter (model list)   200  the catalogue is public; inference needs a key
```

OpenRouter publishes **19 `:free` models** of 429, several with large context
windows. So "free" is available — but it means *free tier with an account and a
key*, never anonymous.

## Why a free tier is the wrong tool here, specifically

The constraint is in this repo's own verified protocol facts
([TELEGRAPH_FACTS.md](TELEGRAPH_FACTS.md), "Spot checks and revocation"):

> Validators spot-check **roughly every 20 seconds** … If a spot check score
> drops **more than 20%** below the leaderboard score: immediate **Routing
> Revocation**, removed from the routing table, traffic redistributed … no new
> traffic until the next epoch tournament re-scores you.
>
> **Sleeping free tiers with cold starts will read as failures.**

Three things follow, and the third is the one that decides it.

1. **The budget is 11 seconds.** `vercel.json` caps the function at 15 s and the
   application watchdog answers at 11 s. A free-tier queue or a cold start
   routinely exceeds that, and the honest timeout answer scores at the floor.
2. **Free tiers are rate-limited per minute and per day.** Spot checks every
   ~20 s are up to 4,320 requests a day per endpoint before any real traffic.
   Even with the existing 60 s cache absorbing repeats, a daily cap is reached
   long before the day is.
3. **Inconsistency is the failure mode that revocation punishes.** A backend
   that answers well most of the time and refuses when rate-limited produces
   exactly the pattern the rule describes — a spot check far below the
   leaderboard score. Being *consistently* mediocre in an intent is safe;
   being *intermittently excellent* is not. And revocation is described as
   removal from the routing table, which puts the **thirteen intents we already
   hold** at risk to chase six we do not.

That last point inverts the trade. The downside is not "the new endpoints score
badly" — it is "the new endpoints take the existing ones down with them".

## What would actually work

A paid provider with predictable latency, plus defensive engineering:

- a hard per-request timeout well inside the 11 s watchdog,
- the existing 60 s cache, keyed so spot checks hit it,
- a hard daily call budget that fails **closed** to a fast, honest answer rather
  than to a slow timeout,
- and — most importantly — **shipped one intent at a time**, watching the spot
  check behaviour for a full epoch before adding the next.

Cost is genuinely small. At Haiku-class pricing and ~500 input / 200 output
tokens, a request is on the order of $0.0015. The uncertainty is not the unit
price, it is the call volume: routed traffic is ~150/day across all 45 intents
(measured 2026-09-06), but spot-check volume is the unknown that decides the
bill. That is worth instrumenting on one endpoint before committing to six.

## Recommendation

Do not use a free tier for a registered miner's endpoints. Either:

- **provision a paid key with a spend cap** and roll out one LLM-backed intent
  first, instrumented, before adding more; or
- **stop the expansion at the six shipped today**, which are the intents
  buildable well from free, reliable, keyless sources.

Either is defensible. What is not defensible is putting thirteen working intents
behind a rate-limited free endpoint.
