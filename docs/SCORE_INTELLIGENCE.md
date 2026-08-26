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

The `chainwire` vs `txlens` pair is strong evidence for **(b)**, at least in that intent. Their
`signal_mapping` differs (`label_field: symbol` vs `status`) but that alone is unlikely to explain
0 vs 0.99 — worth determining what else differs, because it is the highest-value unknown we have.

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
