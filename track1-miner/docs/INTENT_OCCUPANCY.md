# INTENT_OCCUPANCY.md — how the intent was chosen

Sources, captured **2026-08-26**:
- `GET /engine/v1/intents` → 45 canonical intents with per-intent miner counts
- [Intents doc](https://docs.telegraphprotocol.com/docs/using/intents) → scoring tier per intent
- `GET /engine/v1/intents/<INTENT>/miners` → the incumbents themselves

Routing pays **70/20/10 to ranks 1/2/3 and nothing to 4th**, so this decision matters more
than implementation quality. Re-capture before committing — the canonical set changes on-chain.

---

## The two axes

**Occupancy** — how many miners already serve the intent.

**Scoring tier** — how answers are judged:

| Tier | Judged by | Implication |
|---|---|---|
| **A — Deterministic** | WASM exact match | One right answer. Correctness is provable and fully in our control. |
| **B — LLM-Judge** | LLM context + WASM | Open-ended. Score depends on a language model's read of quality. Higher variance, less controllable. |

**Tier A is strictly better for winning rank 1.** We can be exactly right on demand; we cannot
guarantee an LLM judge agrees with us.

## Tier A intents, by occupancy

```
 1  IP_GEOLOCATION   DEEPFAKE_DETECTION   VIDEO_VERIFICATION   MEDIA_AUTHENTICITY_CHECK
 2  CVE_LOOKUP   SPORTS_SCORE   GAME_RESULT   IMAGE_VERIFICATION
 3  SSL_VERIFICATION   CURRENCY_EXCHANGE   STORM_ALERT
 4  STOCK_PRICE   TOKEN_HOLDER_COUNT
 6  GAS_PRICE   TVL_LOOKUP   WALLET_BALANCE_CHECK
 7  CRYPTO_PRICE   FINANCIAL_DATA   URL_SCAN
 8  WEATHER_CHECK
 9  WEATHER_FORECAST
10  ONCHAIN_TX_LOOKUP
11  FRAUD_DETECTION
```

The four media-authenticity intents sit at 1–2 miners but need real ML models — out of reach in
a 12-day window. That leaves `IP_GEOLOCATION`, `CVE_LOOKUP`, and `SSL_VERIFICATION`.

## The three empty intents are all Tier B

| Intent | Miners | Tier | Why it is empty |
|---|---|---|---|
| `RESEARCH_SYNTHESIS` | 0 | **B** | Multi-source retrieval + LLM synthesis. Real per-call cost. |
| `TEXT_AUTHENTICITY_CHECK` | 0 | **B** | Adjacent to `AI_TEXT_DETECTION`; people take the neighbour. |
| `TWITTER_SEARCH` | 0 | **B** | X API paywalled at ~$100+/mo. |

`TEXT_AUTHENTICITY_CHECK` was the front-runner on occupancy alone. The tier data killed it:
zero competition judged by an LLM is worth less than third place judged by exact match, because
the first is a coin-flip we cannot influence and the second is a problem we can simply solve.

## Decision: `SSL_VERIFICATION`

Tier A, 3 incumbents, and **all three have a specific, exploitable weakness**:

| # | Miner | `base_url` | Weakness |
|---|---|---|---|
| 9002 | **TxLens** | `…onrender.com` | ~~Render cold starts~~ — **this was wrong, see [MARKET_DATA.md](MARKET_DATA.md)**. Measured 675ms cold / 324ms warm; ~20s spot checks keep it permanently warm. It also does a real TLS handshake. A stronger competitor than assessed. |
| 10 | **certspotter-cert-verification** | `api.certspotter.com` | Answers from **certificate-transparency logs** — what was *issued*, not what is *deployed*. Wrong whenever a host still serves an old cert. |
| 227 | **ssllabs** | `api.ssllabs.com/api/v3` | A full **Qualys SSL Labs assessment takes 60–120s** on an uncached host, plus strict rate limits. Catastrophic against 20s spot checks. |

Ours answers with a **live TLS handshake** in ~80ms, with **no upstream API at all** for the TLS
path — so no third-party rate limit or outage can trigger a Routing Revocation against us.
See [../miner/README.md](../miner/README.md).

**Superseded in part:** demand data (see [MARKET_DATA.md](MARKET_DATA.md)) later showed
`SSL_VERIFICATION` has only 17 lifetime requests against `STORM_ALERT`'s 334. The miner now serves
**both** intents from one deployment, because an intent with no demand cannot clear the ≥100
Track 3 request guardrail no matter how well we rank.

Two further reasons it fits Tier A exact-match scoring:

- **Ground truth is objectively checkable.** A certificate's issuer, expiry, and chain validity
  are facts anyone can independently confirm — no judgement call for a scorer to get wrong.
- **A terse answer scores better.** The reference scoring module computes word overlap as
  *matched ÷ total words in the miner's answer*, so extra words the ground truth lacks **dilute
  the score**. Our `reason` field is one factual sentence by design. SSL Labs returning a full
  grade report is actively penalised by that arithmetic.

## Rejected, with reasons

- **`WEATHER_CHECK` / `WEATHER_FORECAST`** (8/9) — the docs' own `example-miner.yaml` wraps a
  weather API and tells newcomers to register it as-is. Most contested on the board, as predicted.
- **`ONCHAIN_TX_LOOKUP`** (10) — suggested earlier for fitting existing blockchain experience;
  tied second-most crowded. Domain familiarity pointed straight at the worst corner of the board.
  Every crypto-adjacent intent (`GAS_PRICE` 6, `TVL_LOOKUP` 6, `WALLET_BALANCE_CHECK` 6,
  `CRYPTO_PRICE` 7) is where crypto-native entrants cluster.
- **`IP_GEOLOCATION`** (1, Tier A) — the tempting one. Rejected because geolocation ground truth
  is **provider-dependent**: MaxMind, IPinfo and ip-api disagree on city for the same IP, so
  "exact match" scoring is a lottery against whichever database the scorer used. Certificate
  facts have no such ambiguity.
- **`CVE_LOOKUP`** (2, Tier A) — genuinely viable, and the second choice. Slightly worse because
  it needs the NVD upstream, whose rate limits become our revocation risk.
