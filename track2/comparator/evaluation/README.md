# Comparator evaluation: FX_NOW, CRYPTO_PRICE, WEATHER_CHECK

This is the validity evidence for LiveCert's three registered comparators. They were registered on
2026-11-08 at about 15:29 UTC as #267, #268 and #269, and are `pending`, waiting for a seed epoch.

**Headline result:** ours, the current champions (#263, #261 and #266, by `0x8b224783…`) and the kit's
`ReferenceScore` gave the same score on every case in a frozen adversarial suite of 3,365 cases. That is
the expected honest result, not a win. The docs say a comparator "only sees the two numbers" and that
"there is no 'better' comparator to build". Two exact ports of one rule must agree. What this folder adds
is a measurement that could have failed. Six plausible wrong comparators (mutants) fail it on 3 to 704 cases
each. The suite also found two behaviours of the rule itself, described below.

Raw output: [results-2026-11-08.txt](results-2026-11-08.txt). Every number below comes from that file.

## Rerun everything with one command

```bash
bash track2/comparator/evaluation/run-all.sh     # Git Bash or Linux; node >= 22, go >= 1.26, network
```

The script runs five steps:

1. It regenerates the suite and checks it byte for byte against `suite.sha256`.
2. It downloads the three champions and checks their keccak256 against the registry values.
3. It runs the 234,848-case node-runtime equivalence grid on all six modules.
4. It runs the adversarial suite.
5. It runs the live runnable check.

The module runtime is the node's own, `runtime.NewDeterministicInterruptible` at kit `992f2650` (pinned in
`../verify/go.mod`). Each module is run twice, in two fresh instances, to check that it is deterministic.

## 1. Our registered modules are the bytes we tested

Command: `node live-check-all.mjs`, run 2026-11-08 at about 15:46 UTC.

| family | reg | sha256 of `dist/` = pinned registration URL = runnable GET | runnable POST vs local module |
|---|---|---|---|
| FX_NOW | #267 | `7aa1397d…80cc` (2,287 B), all three equal | 600/600 equal, 0 failed batches |
| CRYPTO_PRICE | #268 | `c72796f2…e11c` (2,293 B), all three equal | 600/600 equal |
| WEATHER_CHECK | #269 | `82f0adda…ec6` (2,294 B), all three equal | 600/600 equal |

- **keccak256** (`go run . hash`): `0xa92fd576…13ca`, `0x30dd31e3…cd9a3` and `0xecc319e9…e535`. These match
  `dist/manifest.json` and the `wasm_hash` in `/api/wasm`.
- **The committed `../../runnable/live-check.js`** (`cd track2/runnable && node live-check.js`, 15:39 UTC)
  printed 600/600 with 0 differing batches for CRYPTO_PRICE and WEATHER_CHECK. It does not cover FX_NOW
  on this branch, because the FX_NOW runnable change (`9483970`) exists only on
  `claude/evaluators-status-a51518`. `live-check-all.mjs` covers all three families.
- **Equivalence grid** (`cd ../verify && go run . <file>`): 234,848 cases, 0 mismatches, 0 bp maximum
  deviation and 0 nondeterministic results, for each of our three files and each of the three champions.

## 2. The champions

The registry is `https://devnode.telegraphprotocol.com/api/wasm`, read 2026-11-08. Each champion was
downloaded from its `wasm_url`, and its keccak256 equals its `wasm_hash`.

| family | champion | bytes | keccak256 | registry `eval` |
|---|---|---|---|---|
| FX_NOW | #263 | 2,354 | `0xc66c240d…fcc8` | comparator gate, 1,120 cases, 0 mismatches, `intent_spec {code:0, tolerance:0}` |
| CRYPTO_PRICE | #261 | 2,366 | `0x23abf049…133c` | same |
| WEATHER_CHECK | #266 | 2,368 | `0xf5dc2abd…c80c` | same |

## 3. The suite

`gen-suite.mjs` builds the suite. It uses a fixed seed (20261108) and gives the same bytes on every run.
The suite was committed in `f23388a`, before any scorer was run on it.

**Truth anchors.** The values were fetched once and frozen in [truth.json](truth.json), with their sources
and licences:

| family | source | licence |
|---|---|---|
| FX_NOW | ECB reference rates, 2026-11-06, and a stale set from 2026-10-01, crossed to USD | not confirmed (see Limits) |
| CRYPTO_PRICE | CoinGecko `simple/price` | API terms; requires "Powered by CoinGecko" |
| WEATHER_CHECK | Open-Meteo `temperature_2m` for six cities | CC BY 4.0 |

**Answer shapes** come from devnode `/engine/v1/intents/<id>`, read 2026-11-08:

- **FX:** `rate`, in units of `{key} per USD`, at 6 decimals. An inverse alias exists.
- **Weather:** `temp_c` at 6 decimals, in the range [−90, 60].
- **Crypto:** `price_usd` has no on-chain decimals (`ready:false`). The suite assumes 6 decimals and adds
  8- and 18-decimal slices.

**Expected scores.** Each case's `expected` is computed in the generator from the rule as the build guide
states it, in exact BigInt arithmetic. It is not taken from any scorer. Its `verdict` is `full`, `partial`
or `zero`.

**Specs.** Each anchor is crossed with seven specs:

- the spec the gate recorded, `(0,0)`, which is Exact;
- one documented or hypothetical spec per family: CRYPTO RelTol 1% and WEATHER AbsTol 2.0 °C (from
  GAPS G237, read on-chain 2026-10-31), and FX RelTol 0.5% (hypothetical);
- five specs from the gate's own battery: AbsTol, RelTol, PassFail, an unknown code and an edge tolerance.

**Failure modes covered:**

- **Every family:** exact; ±1 unit; ×10, ×100 and ×1000; ÷100; sign flipped; zero; i64 max and min, which
  stand in for a broken parse; and, for each spec, the error at the tolerance, just inside the band
  (2·tol−1), the rounding edge (2·tol−0.5 bps, which truncates inside), just outside (2·tol), and far
  outside, above and below, plus seeded jitter.
- **FX:** inverted rate (USD per key); wrong pair (another currency's rate); a stale rate (2026-10-01);
  and 4 decimals read as 6.
- **Crypto:** price in cents; wrong asset; asset per USD; a stale price −3% (synthetic); a 6-decimal value
  on an 8- or 18-decimal scale; and one wei off.
- **Weather:** °F reported as °C; K reported as °C; the wrong city; rounding to a whole degree; −90 °C and
  60 °C; −91 °C, which is outside the range; 0 °C; and a sign crossing at ±0.000001 °C.

**Out of scope, by design.** NaN, empty, non-numeric and embedded-in-text answers never reach a
comparator. The node extracts and scales the number first, so those failure modes belong to the node's
extractor. The comparator can only be tested on the i64 values that result.

## 4. Results

Command: `cd ../verify && go run . suite ../evaluation/suite NAME:FAMILY=<wasm> …`.

| family | n | kit ReferenceScore = expected | ours = expected | champion = expected | ours vs champion | nondeterministic |
|---|---|---|---|---|---|---|
| FX_NOW | 474 | 474 | 474 (#267) | 474 (#263) | 0 differ | 0 / 0 |
| CRYPTO_PRICE | 1,577 | 1,577 | 1,577 (#268) | 1,577 (#261) | 0 differ | 0 / 0 |
| WEATHER_CHECK | 1,314 | 1,310 (4 wrap cases, below) | 1,182, plus 132 refused by the runtime, 0 wrong | 1,182, plus 132 refused, 0 wrong | 0 differ | 0 / 0 |

Disagreements between ours and the champion, by failure mode: none, in any family.

**Can the suite detect a wrong comparator?** Yes. These are the cases where each mutant is wrong:

| mutant (a plausible bug) | FX_NOW | CRYPTO_PRICE | WEATHER_CHECK | where it is caught |
|---|---|---|---|---|
| truth and miner swapped (the docs warn about this) | 104 | 312 | 72 | band edges, decimal shifts, wrong pair |
| RelTol `diff*10000` in saturating i64 | 0 | 62 | 6 | only at 18 decimals and with i64 extremes |
| RelTol rounds instead of truncating | 24 | 53 | 31 | rounding edge, jitter |
| score reaches 0 at tolerance instead of 2·tolerance | 99 | 275 | 152 | at tolerance, inside the band |
| unknown code scores 0 instead of Exact | 3 | 11 | 21 | exact match under code 7 |
| float64 arithmetic | 75 | 144 | 51 | ±1 unit, band edges |

The saturating-i64 mutant passes all of FX_NOW. A 6-decimal FX rate never overflows, so FX alone cannot
detect that bug. This is a limit of the FX slice, not of the module.

### Examples (from the results file)

1. **The truth-0 refusal, WEATHER_CHECK.** The truth is exactly 0 °C (`0`), the miner answers 32 °F as
   °C, and the spec is AbsTol 2 °C. The runtime refuses before the module runs: `truth value is zero;
   ground truth was not resolved`. All 130 truth-0 cases are refused for ours and for the champion alike.
   A city at exactly 0.000000 °C cannot be scored. This is a protocol behaviour, not a module defect.
2. **The i64 wrap, WEATHER_CHECK-1220.** The truth is −1 (−0.000001 °C), the miner is `i64::MAX`, and the
   spec is AbsTol `2000000`. Then |miner − truth| wraps to `i64::MIN`, the reference returns −2305843009213,
   and the runtime treats that negative return as a refusal. Ours and the champion do the same. The
   generator's reading of the docs gives +2305843009213. Both are outside 0–10000. The docs do not say
   whether `window − err` wraps. Four cases are affected.
3. **The swapped mutant, CRYPTO_PRICE-0033.** BTC is 75,973 at 6 decimals and the miner is 1% high under
   RelTol 1%. The expected score is 5000. The swapped mutant gives 5050. Ours, the champion and the
   reference give 5000.
4. **The rounding mutant, CRYPTO_PRICE-0037.** The error is 199.5 bps under RelTol 1%. Truncation keeps it
   inside the band at 50. Rounding pushes it to 0.
5. **The float mutant, FX_NOW-0018.** EUR is 0.895656 and the miner is one unit high under RelTol 0.5%. The
   exact rule gives 10000, because the 0 bps truncates. Float64 gives 9998.

## 5. Defects found in our modules

**None.** On every case, ours equals the kit reference and the champion, and every refusal is the runtime's
own. So nothing was changed in `src/lib.rs`, nothing needs rebuilding or re-registering, and nothing hosted
needs redeploying.

The i64-wrap refusal in example 2 is the reference's behaviour. Changing ours to return 0 there would break
the gate's exact-equality check, and it is reachable only with a miner value of about 9.2e18, far outside
the intent's range of [−90, 60] °C. If Telegraph changes the reference, the module would need rebuilding and
a new registration, which the owner signs.

## Coverage note: thin deterministic intents LiveCert serves

These are the intents in `track1-miner/miner.yaml` whose family has comparator-type (`.wasm`) registrations
in `/api/wasm`, and which have fewer than 5 `eligible_submitters` in
`/api/evalpool/status?intent_id=…`. Both were read 2026-11-08, and the minimum is 5.

| intent | eligible submitters |
|---|---|
| CROSS_CHAIN_STATE_VERIFY_GENERAL | 1 |
| SSL_VERIFICATION_CERT | 1 (1 row) |
| REGULATORY_FILING_MONITOR_GENERAL | 2 |
| FINANCIAL_DATA_GENERAL | 3 |
| GAS_PRICE_GENERAL | 3 |
| MACRO_ECONOMIC_INDICATOR_GENERAL | 3 |
| TOKEN_HOLDER_COUNT_GENERAL | 3 |
| DNS_RECORD_LOOKUP_GENERAL | 4 |
| ONCHAIN_METRIC_VERIFY_GENERAL | 4 |
| WALLET_BALANCE_CHECK_GENERAL | 4 |

FX_NOW_* has 6 to 10 eligible submitters, and CRYPTO_PRICE_USD and WEATHER_CHECK_TEMPERATURE have 5 each,
so they are not thin.

**How the class was decided.** It is inferred from the registration type. The intent detail's `class` was
read only for the three families in this folder.

**Can our truth-source YAMLs be contributed?** Plausibly yes. A `truth_source` row is a "keyless
miner-format YAML" (docs/TELEGRAPH_FACTS.md, from the contribute-evaluation-data page, read 2026-11-01), and
our upstreams are keyless public APIs, so LiveCert's per-intent sources fit that shape. Per the same page,
one truth source is enough for an intent to be scored. The 5-submitter minimum applies to question rows.
So a truth source adds coverage mainly where an intent has none (G237 noted SSL_VERIFICATION_CERT had none
on 2026-10-31). Before contributing, each source's licence must be checked for redistribution and paid
use. Nothing has been prepared or signed.

## Limits

- **"Equal" is the expected result.** An exact port scores identically to an exact incumbent. This is
  evidence of correctness and reach, not of better measurement. The tiebreak value we can claim is the
  suite and the mutant detection, not a score difference.
- **The registered spec is unclear.** The gate recorded `intent_spec {0,0}` (Exact) for all three
  champions. GAPS G237 records different on-chain specs, read 2026-10-31 and not re-read: CRYPTO RelTol 1%
  and WEATHER AbsTol 2.0 °C. The FX tolerance is unknown, so the 0.5% spec is hypothetical. No `cast` is
  installed here, so `getIntentSpec` was not re-read. The suite covers all of these specs.
- **The CRYPTO fixed-point scale is assumed.** The on-chain layout is `ready:false`, with no decimals.
- **Licences.** The ECB reuse terms were not confirmed by fetch. CoinGecko data comes under API terms, not
  an open licence. The truth anchors only set realistic magnitudes, and no verdict depends on their being
  current. The crypto "stale" case is synthetic.
- **The expected scores encode the published rule, which is the same rule the reference implements.** They
  are independent of every scorer's code, but not of the rule. For a comparator, the rule is the only
  defensible ground truth.
- **The runtime behaviour comes from the pinned kit.** The production node may differ. Not verified.
- **No network evidence exists for our modules.** All three are `pending`, so we do not claim Canonical
  status.
