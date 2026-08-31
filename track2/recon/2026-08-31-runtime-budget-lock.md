# The promotion gate excludes the incumbent scorer family from six intents

**Date:** 2026-08-31 · **Source:** `https://devnode.telegraphprotocol.com/api/wasm`, 2,650-entry
sweep, plus 73 of our own registrations and their rejection strings. **Reproduce:**
`calibration/screen-registry.mjs` (ceiling screen) and `harness/time-base.mjs` (per-call cost).

## The finding

The gate gives a candidate ten minutes to score the fixture set. The champion module on most
intents is a ~24 MB sentence-transformer. On **six intents that family cannot finish in ten
minutes** — not once, in fourteen attempts. Because a calibration derivative inherits its base's
runtime, **those six intents cannot be improved by anyone building on the incumbent**, including
the incumbent.

| intent | 24 MB attempts | completed the gate | timed out | observed elapsed |
|---|---:|---:|---:|---|
| ACADEMIC_SEARCH | 3 | **0** | 3 | 13m37s, 13m48s, 11m26s |
| IP_GEOLOCATION | 3 | **0** | 3 | 13m38s, 13m35s, 14m2s |
| WEATHER_FORECAST | 3 | **0** | 3 | 12m6s, 10m41s, 10m33s |
| SSL_VERIFICATION | 2 | **0** | 2 | 13m10s, 11m4s |
| WEATHER_CHECK | 2 | **0** | 2 | 17m1s, 15m54s |
| WEB_SEARCH | 1 | **0** | 1 | 14m38s |

On the other twenty-one intents the same 24 MB family completes routinely — ten of our own 24 MB
registrations reached a verdict on CONTENT_MODERATION, CONTENT_VERIFICATION, IMAGE_VERIFICATION,
LANGUAGE_GENERATION, TASK_COMPLETION, TELEGRAPH_KNOWLEDGE, TEXT_AUTHENTICITY_CHECK,
TEXT_GENERATION, TOKEN_HOLDER_COUNT and FRAUD_DETECTION. This is not a broken evaluator. It is a
fixed budget that six corpora happen to exceed.

## It is module cost, not queue load

We assumed for two days that the timeouts tracked evaluation queue depth. They do not. Across our
73 registrations, split by artifact size:

| artifact | reached a verdict | **timed out** | rejected on score |
|---|---:|---:|---:|
| >= 24 MB | 10 | **19** | 25 |
| < 5 MB | 9 | **0** | 19 |

**Zero timeouts in twenty-eight small-module registrations.** Timeouts also occurred at 04:20Z
against an empty queue and at 18:34Z against a 200-deep one, and the six intents above failed
under both.

Measured cost per `rank_answer` call, V8, **on distinct rows**. Re-scoring a single row
understates this badly: the modules cache their ground-truth embedding, so twenty identical calls
pay for one. The gate never repeats a row, so `harness/time-base.mjs` does not either.

| module | bytes | instantiate | short answer | 30 KB answer |
|---|---:|---:|---:|---:|
| `fraud_detection_r3` (24 MB base) | 23,987,708 | 995 ms | **1,136 ms** | **3,327 ms** |
| `weather_forecast_r3` (24 MB base) | 23,989,278 | 1,512 ms | **1,165 ms** | **3,228 ms** |
| `ssl_verification_r3` (24 MB base) | 23,989,278 | 1,301 ms | **1,136 ms** | **3,221 ms** |
| `tvl_lookup_r3` (1 MB base) | 1,039,717 | 3 ms | **0.1 ms** | **1.2 ms** |
| `gas_price_r3` (10 KB base) | 10,087 | 1 ms | **~0.0 ms** | **~0.0 ms** |
| `scorer/dist/academic_search_b4` (**ours**) | 33,211 | 7 ms | **0.1 ms** | **1.2 ms** |

Instantiation is negligible — about a second for 24 MB. The cost is per call, and the transformer
family is roughly **11,000x more expensive per short call** than a 1 MB base, and 2,700x at 30 KB.

The budget arithmetic then closes. Fifteen fixture pairs is thirty calls: 34 s of short answers,
98 s of 30 KB ones. Add the historical rows the gate replays — 47 on WEATHER_CHECK, 124 on
WEB_SEARCH — at 1.1 to 3.3 s each, and the total crosses ten minutes on precisely the intents
whose corpora are long. V8 is a JIT; a slower host runtime moves the line further in. Every intent
in the first table has long corpus text, many historical rows, or both.

## Why this matters to the protocol, not only to us

1. **Six intents are frozen.** Their champions were promoted before the corpora grew. No
   derivative of those champions can be evaluated today, so their scoring quality can no longer be
   contested by the family that is best at it. WEATHER_FORECAST sits at margin **0.53020585**, the
   weakest champion on the board, and is unreachable for this reason.
2. **The budget silently selects for small modules**, independently of evaluation quality. A
   candidate is rejected for what its base costs, and the rejection reads "time budget", which an
   author naturally reads as bad luck. We retried fourteen times before measuring it.
3. **The fix is cheap.** Scale the budget with corpus size, or report per-row cost in the
   rejection so an author can tell a slow module from an unlucky one.

## What it changed for us

We stopped signing 24 MB derivatives on those six intents. The only module that can finish the
gate there is a small one, and the only small original scorer on the network is
[`../scorer/`](../scorer/) at 31 KB — 0.1 ms per call, four orders of magnitude inside the budget.
That is the sole remaining route into those intents.

It is not a free one. Our scorer is a near-exact binariser (good answers 0.9993 to 1.0, wrong
answers 0.0000 to 0.0070 on the probe corpus), so calibration cannot help it: its margin per
separated pair is already maximal. Every rejection it has taken was **ordering** — 14 of 15
fixture pairs against an incumbent taking 15 of 15 (registrations 1377, 1728), and 13 of 15 on
TVL_LOOKUP (1878) and FACT_CHECK (1731). That one-to-two-pair gap is genuine scorer quality, not
calibration, and it is recorded as an open gap rather than rounded off.
