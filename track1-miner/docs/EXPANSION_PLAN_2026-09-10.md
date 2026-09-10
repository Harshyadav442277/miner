# Expansion plan — beyond 22 intents, no generative intents

Written 2026-09-10 ~12:10 UTC. Every number below was read live from the node
this session, not remembered. Operator instruction: add more intents, and do not
add CHAT_COMPLETION or any chatbot-shaped intent.

**Status, same day: all four recommended intents are built, deployed and gated.**
SPORTS_SCORE, TOKEN_HOLDER_COUNT, RESEARCH_QUERY and TEXT_AUTHENTICITY_CHECK answer
on production. 461 tests pass, preflight is 7/7, and 26 of 26 declared intents answer
correctly. **None of the seven pending intents is registered** — that needs one wallet
signature, prepared in [REGISTRATION_UPDATE.md](REGISTRATION_UPDATE.md). The operator
read section 3 and chose to enter TEXT_AUTHENTICITY_CHECK; the disclosure is in the
README and in GAPS G95. Provider limits found by probing a preview are in G96.

---

## 0. Two facts that frame everything

**The manifest is three intents ahead of the network.** `track1-miner/miner.yaml`
declares 22 intents. Registration **1378** is `active` on the **19**-intent hash
`8d62ebe0…c94d874`. `GAS_PRICE`, `FINANCIAL_DATA` and `FRAUD_DETECTION` are
deployed and answering on production, and the network does not route to them,
because `docs/REGISTRATION_UPDATE.md` is prepared and **unsigned**. Building more
intents does not change that; only a wallet signature does.

**Nothing added now changes the hackathon score.** Track 1 closed 2026-08-31
23:59 UTC and the judged record was measured at epoch 298. What further intents
buy is live network standing and Track 3 routing weight, which is a real goal but
a different one. This is stated once here so no later document implies otherwise.

## 1. The candidate universe, measured today

```
canonical intents on chain                              108
  ... with a champion scorer (/api/wasm)                 45
  ... already declared by us (miner.yaml)                22
  ... reachable expansion remaining                      23
```

The 63 intents with no champion scorer are not open ground. Without a scorer
nothing is ever scored, so there is no rank to take. Re-verified this session:
`/api/wasm?intent=EMAIL_SECURITY` and 62 others still return `{"count":0}`.

Of the 23 reachable, **13 are excluded before any measurement**:

| Excluded | Intents | Why |
|---|---|---|
| Generative / chatbot (**your rule**) | CHAT_COMPLETION, LANGUAGE_GENERATION, TEXT_GENERATION, TASK_COMPLETION, AGENT_TASK, WEB_SEARCH, RESEARCH_SYNTHESIS | The task is "produce good text about this". Needs a deployed inference provider, which is also the thing you ruled out. |
| Image / video models | DEEPFAKE_DETECTION, IMAGE_VERIFICATION, VIDEO_VERIFICATION, MEDIA_AUTHENTICITY_CHECK, CONTENT_MODERATION | Needs media models at runtime. None is provisioned. |
| Paid access | TWITTER_SEARCH | Needs paid X API access. |

**Ten candidates remain.**

## 2. What the ten actually look like right now

The ordering principle that matters is **not** whether the scorer can cross to
1.0. It is whether we can beat the current leader, because judging normalises our
score by the best score in the intent. We already hold ACADEMIC_SEARCH at a ratio
of 1.000 with a leader of 0.0109. A field sitting in the noise band is a cheap
rank 1, not a dead intent.

Champion modules for all ten were fetched this session and their live top scores
read from `/scores`, four epochs each:

| intent | miners | e321 top | e320 top | e319 top | e318 top | all-time | endpoint |
|---|---:|---:|---:|---:|---:|---:|---|
| **SPORTS_SCORE** | 3 | 2.9e-12 | 8.2e-12 | 9.8e-12 | 1.0e-11 | 0.588 | `/game-result` exists |
| **TEXT_AUTHENTICITY_CHECK** | **0** | no rows | no rows | no rows | no rows | never scored | `/ai-detect` exists |
| **TOKEN_HOLDER_COUNT** | 5 | 4.4e-12 | 7.1e-12 | 3.2e-12 | 2.7e-12 | 0.0122 | new, needs an indexer |
| **RESEARCH_QUERY** | 7 | 0.0147 | 0.0180 | 0.0153 | 0.0124 | 0.0311 | OpenAlex + news, wired |
| **CONTENT_VERIFICATION** | 1 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | `/fact-check` machinery |
| **STOCK_PRICE** | 5 | 2.0e-13 | 1.0e-13 | **0.999995** | 1.0e-13 | 0.999998 | `/financial` exists |
| **CRYPTO_PRICE** | 14 | **0.999999** | 9.8e-11 | 3.0e-34 | 6.6e-27 | 0.999999 | `/financial` exists |
| URL_SCAN | 10 | **0.927** | 9.9e-6 | **0.963** | 5.1e-6 | 0.999 | new |
| TEXT_CLASSIFICATION | 3 | 0.0 | 0.0 | 0.0171 | **0.833** | 1.000 | new |
| SENTIMENT_ANALYSIS | 2 | **1.000000** | 0.0 | 0.0 | **1.000000** | 1.000 | new |

Read the table as three groups.

**The four beatable fields.** SPORTS_SCORE, TOKEN_HOLDER_COUNT, RESEARCH_QUERY and
TEXT_AUTHENTICITY_CHECK have no competitor scoring above the noise in any recent
epoch. Beating 3e-12 does not require crossing a cliff, only answering honestly
and specifically. SPORTS_SCORE is the strongest of the four: its all-time best of
0.588 proves the scorer does reward real answers, and `/game-result` already
carries the ESPN and TheSportsDB providers.

**The three contested fields.** STOCK_PRICE, CRYPTO_PRICE and URL_SCAN each have
somebody crossing to ~0.93 or better in at least one recent epoch. Entering those
means beating a real answer, and the first two are the volatile-number lottery
that G92 already warned about twice.

**The three with a scorer that will not pay.** CONTENT_VERIFICATION has scored
exactly 0.0 for its single miner in 62 consecutive rows, so there is no evidence
any answer scores at all. SENTIMENT_ANALYSIS is binary and its leader matches
exactly. TEXT_CLASSIFICATION needs real semantics, which was the reason it was
rejected and which has not changed.

**Four champions rotated since the earlier rejections were written**, so those
rejections are stale for SPORTS_SCORE (now 3045), STOCK_PRICE (now 3166),
CRYPTO_PRICE (now 3170) and CONTENT_VERIFICATION (now 2062). URL_SCAN (220),
TEXT_CLASSIFICATION (687) and SENTIMENT_ANALYSIS (646) are unchanged, so their
rejections still stand on the original evidence.

## 3. One thing that is your decision, not mine

`TEXT_AUTHENTICITY_CHECK` has **zero miners**, and its champion scorer is
registration **1882**, whose `author_address` is
`0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e` — our own fee address, from our
Track 2 submission. Entering it would make us the only miner in an intent whose
scorer we wrote.

Three things are true about that and all three should be said plainly:

- It breaks no rule I can find, and Track 2 was an open competition that anyone
  could enter.
- The same situation already exists and was never flagged: `CURRENCY_EXCHANGE`'s
  champion is registration **2945**, also authored by our address, in an
  eight-miner field we have served since 2026-09-09.
- At zero competitors it reads differently from eight. The 2026-09-04 lesson was
  to ask the organizers before doing anything that sits near the protocol's own
  judgement, rather than to discover afterwards that it read as gaming.

Recommendation: either ask in Discord first, or enter it and disclose it in the
README. Do not enter it silently.

## 4. Phases

### Phase 1 — measure, before writing any answer code

**Recommended set: SPORTS_SCORE, TOKEN_HOLDER_COUNT, RESEARCH_QUERY, and
TEXT_AUTHENTICITY_CHECK if you clear section 3.** Those are the four fields where
no competitor is scoring above the noise.

All ten champion modules are already fetched into `track2/harness/champions/`.
Benching needs authored ground truths in `candidate-corpus.json`, which exist
only for TEXT_CLASSIFICATION, WEB_SEARCH, URL_SCAN and GAS_PRICE, so corpus
entries come first: several answer shapes and several ground-truth registers per
case, so a shape that only wins against one authored phrasing cannot look
general. Run `candidate-bench.mjs --verify` first on each, so a champion that has
been replaced shows up before any number is trusted.

The bar an intent must clear:

> Judging normalises our score by the best score in the intent, so what has to be
> beaten is the leader, not the cliff. An intent whose whole field sits at 1e-12
> is winnable by answering honestly. An intent whose leader is at 0.93 has to be
> beaten on the merits. An intent where every row is exactly 0.0 pays nothing,
> because the ratio has no numerator.

### Phase 2 — build only what cleared the bar

Existing-endpoint intents first, because a second intent on a gated endpoint
costs one manifest line and a prose shape rather than a new upstream. Do not
build a contested or a never-paying intent to make the count look bigger; that is
the "never add features merely because they are easy" rule, and G92 is already
the record of taking that trade twice.

### Phase 3 — gates, in this order and no other

1. `npm test` full suite, plus new regression tests for every case fixed.
2. Deploy a **preview** and probe it with `npx vercel curl`. G84: ESPN answers
   this laptop and returns 403 to Vercel's egress, so a local pass proves nothing.
3. `--prod`, then `vercel promote <url>`. G70: after a rollback, production is
   pinned and `--prod` alone does not move the alias.
4. `node tools/preflight.mjs` — 7/7 or roll back.
5. `tools/intent-answers.mjs` — every declared intent answering correctly.

### Phase 4 — one signature, not two

Fold the new intents into a single `updateMiner`. It creates a new registration
id that supersedes 1378 everywhere, so `REGISTRATION_ID`, the watcher and every
lookup move with it.

**Sequencing recommendation:** sign the prepared 19→22 update **now** rather than
waiting for this batch. Those three are finished and idle, every scored epoch
they sit unregistered is wasted, and a second `updateMiner` later is routine — we
have done seven.

## 5. Failure list, ranked by how likely it is to go wrong

1. **The volatile-number trap, taken twice already.** STOCK_PRICE and CRYPTO_PRICE
   are the same shape G92 warned about for GAS_PRICE: a tolerance of about one
   part in a thousand on a quantity that moves. CRYPTO_PRICE's leader sits at
   0.999999 with 14 miners, which means somebody is matching a moving number
   exactly and we would be guessing at the same window.
2. **Every bench number is a proxy.** G24: `/scores` has published no `question`,
   `ground_truth` or `converted_answer` since 2026-08-30. Every ground truth we
   bench against is one we wrote.
3. **The deployment is not the laptop.** G84. SPORTS_SCORE inherits GAME_RESULT's
   ESPN egress problem directly.
4. **Breadth cuts both ways.** G59 is still open. Under the sum reading more
   intents is strictly better; under the average reading a weak intent drags.
5. **Each new endpoint is another upstream whose uptime the organizers made ours.**
   Seven endpoints in and the `uptime` tripwire already goes red on other
   people's rate limits.

## 6. What this plan explicitly does not do

- No CHAT_COMPLETION, LANGUAGE_GENERATION, TEXT_GENERATION, TASK_COMPLETION,
  AGENT_TASK, WEB_SEARCH or RESEARCH_SYNTHESIS, per the operator's instruction.
- No inference provider, no API credential, no spending decision.
- No wallet action of any kind. Claude prepares and validates; the operator signs.
