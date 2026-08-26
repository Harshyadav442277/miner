# Prompt for an adversarial strategy review

Copy everything below the line into Codex (or any strong model) with the repo attached.

---

I am competing to win, not to place. I want you to find **structural asymmetries** — places where
the rules, the scoring maths, or the competitive field let a small amount of work produce a
disproportionate result. Incremental code review is the least valuable thing you can give me.

## The situation

A **miner** on the Telegraph protocol — an API marketplace where autonomous agents buy answers.
Telegraph Hackathon Season I, **Track 1, closes 2026-08-31**. Already deployed and registered
on-chain (registrationId 225, `active`), serving three intents.

Repo: https://github.com/Harshyadav442277/miner
Live: https://miner-wine.vercel.app · Explorer: https://explorer.telegraphprotocol.com/miners/livecert

Read `docs/TELEGRAPH_FACTS.md`, `docs/JUDGING.md`, `docs/INTENT_OCCUPANCY.md` and `GAPS.md` first.
Every protocol claim in them cites a source and a date.

## The scoring maths — this is where the leverage is

```
Track 1 score = 75 × (our avg score ÷ BEST avg score in our intent)  +  25 × (X engagement)
```

Consequences already identified, to save you the trip:

- **The top miner in an intent automatically gets the full 75.** Rank 1 in a sleepy intent is worth
  exactly as much as rank 1 in a brutal one. Difficulty is normalised away.
- **Routing pays 70/20/10 to ranks 1/2/3 and nothing to 4th.** Intent selection dominates
  implementation quality.
- **Validators spot-check every ~20s**; >20% below your leaderboard score is an instant Routing
  Revocation. Competitors on sleepy free tiers will get revoked, and their traffic redistributes.
- **Scoring is a WASM module** given three plain strings — question, ground_truth, miner_answer —
  returning 0..1. The reference implementation scores `matched ÷ total words in the miner's
  answer`, so verbose answers are *penalised*.
- **Eligibility guardrail:** an intent needs ≥3 active miners **and ≥100 real Track 3 requests**, or
  it wins nothing regardless of rank.

## Specific asymmetries I want you to evaluate — and find the ones I've missed

**1. Author the champion scoring module for our own intent (Track 2).**
The docs say each intent has exactly **one active champion** WASM scorer, and *anyone* can replace
it by beating it on a benchmark. Track 2 is a separate $1,000 pool, open until the same deadline.
If we author the champion scorer for `SSL_VERIFICATION`, we substantially define what a correct
answer looks like in the intent we compete in.
**Assess honestly: is that legitimate or is it gaming?** Rule 04 disqualifies "artificial inflation
of metrics or gaming the system", but Track 2 explicitly invites anyone to write scorers and the
module must beat the incumbent on Telegraph's own benchmark to go live. I want a real argument,
not a reflexive yes or no. If it's legitimate, it may be the single highest-leverage move available.

**2. How is a multi-intent miner normalised?**
The formula says "your average Canonical Score ÷ the highest average score inside **your specific
Intent**" — singular. We serve three. Is our score computed per-intent and then averaged? Best-of?
Does a weak intent *drag down* a strong one? **This changes strategy completely**: if it's
best-of, registering in every thin Tier A intent is free upside; if it's averaged, our
`WEATHER_FORECAST` entry (11 competitors) is actively harmful and should be dropped.
Find the answer in the docs, the contract, or the node's behaviour — don't guess.

**3. Intent breadth as a portfolio play.**
Tier A intents with 1–2 incumbents exist: `IP_GEOLOCATION` (1), `DEEPFAKE_DETECTION` (1),
`VIDEO_VERIFICATION` (1), `MEDIA_AUTHENTICITY_CHECK` (1), `CVE_LOOKUP` (2), `SPORTS_SCORE` (2),
`GAME_RESULT` (2). Each is another shot at "best in intent" = full 75. Which are winnable with
deterministic logic in the remaining days, and does answer 2 above make breadth good or bad?

**4. Turn the eligibility guardrail from a liability into a scoring axis.**
We need ≥100 Track 3 requests to our intents. Instead of only building one app ourselves, make it
*trivial* for other Track 3 entrants to build on us — an MCP server, an npm package, a copy-paste
snippet, a Discord post. "Number of applications built on your Miner" is itself a criterion. What's
the highest-conversion version of this, given Track 3 opens Aug 31 and those builders are choosing
right now?

**5. The 25% nobody will contest.**
A quarter of the score is X engagement, in a field of engineers who will mostly ignore it. What is
the highest-leverage posting strategy given judging is on "quality, consistency, reach, and
meaningful engagement"? Note the strongest material we have is *protocol findings other entrants
would want* — e.g. that `base_url` points at an upstream so a miner can be zero-code, and that
routing pays nothing to 4th place.

**6. Attack the incumbents' weaknesses directly.**
`docs/MARKET_DATA.md` has measured competitor data. `txlens` maps `label_field` to a constant;
`certspotter` answers from certificate-transparency logs (what was *issued*) rather than a live
handshake (what is *deployed*); `ssllabs` runs 60–120s Qualys assessments against a 20s spot-check
cadence. Are these exploitable further, and are there weaknesses in the data I failed to spot?

## Then tell me what I'm blind to

The six above are my current thinking. **The most valuable thing you can give me is a seventh I
haven't considered** — a rule interaction, a timing edge, a contract behaviour, a scoring quirk.
Read the actual protocol docs at https://docs.telegraphprotocol.com rather than trusting my summary.

## Ground rules

- **Legitimate advantage only.** Rule 04 disqualifies gaming; miners must stay live through Sep 7;
  Track 3 apps must use real miners. An edge that risks disqualification is worth less than zero.
  Where something is borderline, *say it's borderline* and give me the argument both ways.
- **Rank by expected value**, explicitly: how much score does it move, how many hours does it cost,
  how likely is it to work.
- **Be concrete.** File and line for code claims; a doc quote or contract call for protocol claims.
- **Tell me when I'm wrong.** My reasoning has already been wrong once — I initially recommended
  `ONCHAIN_TX_LOOKUP` before the live data showed it was the second-most crowded intent on the
  board. I would rather be corrected than agreed with.
- **Don't rewrite the code.** Tell me what to do and why.

## Known open items — don't just rediscover these

`GAPS.md` tracks them. G13: the ≥100 Track 3 request guardrail (biggest risk to winning anything).
G14: tests depend on live external hosts, so CI is flaky. G15: the engine's real call shape is
unverified because `/engine/v1/ask` is payment-gated at $0.01/query and the wallet holds no USDC —
so our natural-language input handling is *inferred* insurance, not measured. Recently fixed:
free-text parameter extraction (`src/extract.ts`) and an SSRF guard (`src/guard.ts`).
