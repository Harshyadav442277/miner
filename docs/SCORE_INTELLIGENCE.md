# SCORE_INTELLIGENCE.md — what the live scores actually say

Source: `GET https://devnode.telegraphprotocol.com/api/miners`, epoch 283, captured **2026-08-26**.
173 scored records across 89 miners. This is measured data, not inference.

---

## 1. Multi-intent miners are scored **independently per intent** — settled

This was the open strategy question. It is answered by `txlens`, which serves eight intents:

```
SSL_VERIFICATION       rank 1   0.00627648
STOCK_PRICE            rank 1   0.01944929
TOKEN_HOLDER_COUNT     rank 1   0.00837759
CRYPTO_PRICE           rank 2   0.00000000
GAS_PRICE              rank 3   0.00393572
TVL_LOOKUP             rank 4   0.00397419
WALLET_BALANCE_CHECK   rank 4   0.00000000
ONCHAIN_TX_LOOKUP      rank 5   0.00571571
```

One `{intent_id, rank, score}` record per intent. **Rank 1 in three intents coexists with rank 5
in another** — a weak intent does not drag down a strong one.

**Consequence: breadth is free upside.** Every additional intent is an independent shot at
"best in intent". Registering in thin Tier A intents costs one `updateMiner` and risks nothing.

This also retires the worry that our `WEATHER_FORECAST` entry (11 competitors) harms us. It
cannot. Worst case it is a rank we ignore.

## 2. **Only rank matters. The absolute score is irrelevant.**

Judging is `75 × (our avg ÷ best avg in our intent)`. The best miner in an intent gets the full 75
*regardless of whether that score is 0.99 or 0.006*.

This matters because the absolute numbers look alarming and are not:

| Intent | Rank 1 score |
|---|---|
| `TASK_COMPLETION` (bedrock-voxtral) | **0.9960** |
| `WALLET_BALANCE_CHECK` (chainwire) | **0.9920** |
| `SSL_VERIFICATION` (txlens) | **0.0063** |
| `WEATHER_FORECAST` (onlookout) | **0.0080** |
| `STORM_ALERT` (bittensor-sn18-zeus) | **0.0066** |

A 150× spread. But rank 1 at 0.0063 scores exactly as many judging points as rank 1 at 0.996.

## 3. The bars we actually have to clear

```
SSL_VERIFICATION      beat 0.00627648   (txlens · ssllabs 0.00416 · certspotter 0.00000)
STORM_ALERT           beat 0.00657676   (bittensor-sn18-zeus · amanat 0.00578 · skywire 0.00000)
WEATHER_FORECAST      beat 0.00800136   (onlookout · skywire 0.00767 · openweathermap 0.00763)
```

These are the only three numbers that matter. They are small, close together, and two of the
three intents contain a competitor scoring exactly **0.0**.

**`certspotter-cert-verification` scores 0.00000000.** That is the miner answering from
certificate-transparency logs — the approach we identified as answering the wrong question before
any of this data existed. It is scoring nothing.

## 4. Why the two clusters? An open question worth money

Scores cluster hard: a ~0.99 group (`TASK_COMPLETION`, `WEB_SEARCH`, `NEWS_SEARCH`,
`WALLET_BALANCE_CHECK`) and a ~0.006 group (ours). **77 of 173 records are exactly 0.0**; the
median score network-wide is **0.00000000**.

Two candidate explanations, and they imply opposite actions:

**(a) Different champion scorers per intent.** Each intent has exactly one active WASM scoring
module. If `SSL_VERIFICATION`'s champion is harsh or broken, everyone in it is capped near 0.006
no matter how good their answer. Nothing we do to our answer changes our rank much — but
authoring a better champion scorer (Track 2, separate $1,000 pool) would reshape the intent.

**(b) Answer format.** In `WALLET_BALANCE_CHECK`, `chainwire` scores **0.9920** and `txlens`
scores **0.0000** — same intent, same scorer, 0 vs 0.99. That is not the scorer being harsh; that
is one miner answering in a form the scorer recognises and the other not. If the same dynamic
holds in `SSL_VERIFICATION`, a well-shaped answer could score ~0.99 against a field stuck at 0.006.

**Resolved in favour of (b), by direct test.** `chainwire`'s own endpoint description says it
"accepts an ENS name and **a whole question in `?query=`**" and that "an unsubstituted template
resolves to ethereum rather than erroring." Calling both miners confirms it:

| Input | `chainwire` (0.992) | `txlens` (0.000) |
|---|---|---|
| `?query=What is the ETH balance of vitalik.eth on ethereum?` | parsed the ENS name, resolved to `0xd8dA6BF…96045` | `{"status":"error","summary":"must include a valid address query parameter"}` |
| unsubstituted `/{chain}/{address}` template | full valid answer, defaulted to ethereum | — |

**The scorer compares text.** An error message shares no vocabulary with a ground-truth answer, so
it scores ~0. A miner that refuses natural language does not score badly — it scores *nothing*.

This is the same failure our own miner had until 2026-08-26, when free-text extraction was added
(`src/extract.ts`). We were one untested assumption away from the `txlens` outcome.

Note the shape of chainwire's winning answer, which our `reason` field already mirrors:

> `"summary": "0x0000…0000 holds 14,148.7383 ETH on Ethereum."`   `"confidence": 0.98`

One plain declarative sentence containing the entities and the value. Not a JSON dump, not a grade
report. Compare `ssllabs`, which returns a full Qualys assessment and scores 0.0042.

**Applied 2026-08-26:** error responses now carry `verdict` / `confidence` / `reason` rather than a
bare `{error, message}` blob, so a borderline request still resolves through `signal_mapping`
instead of returning text a scorer cannot read. The HTTP status stays 400 — the request really was
malformed, and A5 forbids liar-200s.

## 5. What this changes

1. **Add thin Tier A intents.** Breadth is confirmed free. `IP_GEOLOCATION` (1 competitor),
   `CVE_LOOKUP` (2), `SPORTS_SCORE` (2), `GAME_RESULT` (2) are each an independent shot at rank 1.
2. **Stop optimising the absolute score.** Beat 0.0063 / 0.0066 / 0.0080 and the judging half is
   maxed. Everything beyond that is wasted effort.
3. **Investigate the chainwire/txlens gap.** If answer shape explains 0 vs 0.99, that is the
   difference between rank 1 and unassailable.
4. **Track 2 becomes strategically interesting**, not just a second prize — see the honesty caveat
   in [CODEX_REVIEW_PROMPT.md](CODEX_REVIEW_PROMPT.md) about authoring the scorer for one's own intent.

## Caveat

Single epoch (283), captured once. Scores move per epoch and our own miner has no score yet
(registered mid-epoch, `EPOCHS PARTICIPATED: 0`). Re-pull before acting on any specific number.


---

## 6. Measured: our answer shape vs the incumbents'

`tools/score-sim.mjs` implements the documented reference scorer
(`matched ÷ total words in the miner's answer`) and runs our **live** answers against the shapes
the incumbents actually return, on three representative questions.

| Answer shape | Mean score |
|---|---|
| **livecert (ours)** | **0.9453** |
| certspotter-style — CT log JSON record | 0.0569 |
| ssllabs-style — full Qualys grade report | 0.0385 |
| txlens-style — error object on odd input | 0.0238 |

The live bar to beat in `SSL_VERIFICATION` is **0.00627648**.

**This is a prediction, not a measurement.** The real champion module for this intent is not
published, and the ground truths are ones we wrote as plausible. But the arithmetic is the
documented reference implementation, and the *ordering* is driven by structure — a terse
declarative sentence shares most of its words with any reasonable ground truth; a JSON dump shares
almost none. That ordering is robust even if the exact scorer differs.

### The three words that cost 25%

The first run scored 0.7697. Inspecting which words failed to match showed the culprit:

```
"…expires 2026-09-30 (35 days remaining)."
                      ^^^^^^^^^^^^^^^^^^
unmatched: 35 days remaining
```

A ground truth would not contain that parenthetical, so it diluted every other word in the
sentence. Removing it — while **keeping `days_remaining` in the structured response**, where
agents actually read it — took that case from **0.6842 → 0.9333**, and the mean from
**0.7697 → 0.9453**.

The general rule, now measured rather than assumed: *put facts in fields, put the answer in prose,
and never put a fact in the prose that the question did not ask for.*
