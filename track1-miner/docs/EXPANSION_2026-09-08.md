# Expansion round 2 — what the candidate scorers actually reward

Measured 2026-09-08, against the champion WASM each intent is scored by today. Every number below
was produced locally by `track1-miner/tools/candidate-bench.mjs` through
`track2/harness/wasm-abi.mjs` `loadScorer`, or read live from the node. Nothing is remembered and
nothing is carried over from the first expansion round.

**What this is not.** `/scores` has published no `question`, `ground_truth` or `converted_answer`
since 2026-08-30 (GAPS G24), and `explorer…/api/daemon/api/questions` has been returning HTTP 522
all day. So for these ten candidate intents there is **no corpus of real questions and no real
ground truths at all**. Every ground truth below is one I wrote myself to be factually correct, and
every score is therefore a **proxy**: it measures "how does this scorer treat this answer against a
plausible ground truth", not "what would we have scored last epoch". Where a conclusion depends on
that distinction it is flagged. The one thing that is *not* a proxy is §1, which reproduces the live
score distribution and is what justifies trusting the scorer copy at all.

## 1. The scorer copies are behaving as the live ones do

`otx_reg642.wasm` is still the ONCHAIN_TX_LOOKUP champion (reg 642, confirmed live from
`/api/wasm`). Run locally it produces:

```
complete, exactly correct receipt      0.9999
incomplete or slightly wrong receipt   0.006 - 0.015
```

The live leaderboard for the last six epochs:

```
 e316 top=0.9954  rest 0.0145..0
 e315 top=0.0145  rest 0.0141..0.0032
 e314 top=0.9952  rest 0.0115..0
 e313 top=0.9950  rest 0.0135..0
 e312 top=0.9950  rest 0.0141..0
 e311 top=0.9959  rest 0.0110..0
```

Same two bands, same values. This is the champion-currency check `bench/README.md` requires, and it
passes: the module held locally behaves as the one scoring the network. It also identifies what the
0.01 band *is* — it is not "nearly right", it is the score for an answer that is incomplete or wrong
in one field.

## 2. The finding that reorders the whole queue: static facts vs volatile numbers

Numeric tolerance was measured directly by holding the ground truth fixed and moving our number.

**GAS_PRICE** (`gpf_1e4.wasm`, reg 3119), ground truth "approximately 12.4 Gwei":

```
our answer      deviation     score
12.4  Gwei         0.0%       0.9999976
12.41 Gwei         0.1%       0.9999955
12.5  Gwei         0.8%       1.27e-11
12.6  Gwei         1.6%       1.27e-11
13.0  Gwei         4.8%       1.22e-11
24.8  Gwei       100.0%       1.21e-11
```

**CURRENCY_EXCHANGE** (`currency_exchange_r7.wasm`, reg 2945), ground truth "85.20 EUR, rate 0.8520":

```
85.20 EUR        0.00%        1.0
85.25 EUR        0.06%        2.22e-7
85.50 EUR        0.35%        2.21e-7
90.00 EUR        5.63%        2.70e-7
```

**The tolerance is roughly one part in a thousand, and outside it the score falls by eleven orders
of magnitude.** These scorers are not degenerate — a *correct* answer scores 0.99999. They are
exact-match tests on a number.

That single measurement explains the entire live picture for these intents. Nine GAS_PRICE miners
all sit at 5e-12 to 3e-11, and no miner has crossed once in twelve epochs, because gas price moves
every block and no miner's snapshot equals the ground truth's snapshot to the displayed decimal.
The same holds for CRYPTO_PRICE (14 miners, leader 5.6e-28), FINANCIAL_DATA (8 miners, 6.5e-20) and
STOCK_PRICE. **Rank in those intents is decided by numeric coincidence, not by engineering**, and
no amount of provider quality changes that. Registering there buys a coin flip.

The mirror image is ONCHAIN_TX_LOOKUP, where the facts are a **mined receipt and therefore
immutable**: read the chain correctly and your number *is* the ground truth's number. That is why
exactly one miner crosses at 0.995 each epoch while eleven sit at 0.01 — and it is a gap that
correctness closes.

So the ordering principle for this round is **not** miner count and **not** incumbent weakness:

> An intent is winnable by engineering when its answer is a fact that does not change between our
> read and the scorer's. It is a lottery when the answer is a number that moves.

## 3. Per-candidate measurements

### ONCHAIN_TX_LOOKUP — strongest candidate (12 miners)

Ground truth: a complete receipt. Our candidate shapes:

```
full receipt, every field correct        0.99985
same, digits unformatted (21000 vs 21,000; 4730207)   0.99945   <- formatting-tolerant
gas used off by one (21001)              0.0148
status only ("succeeded")                0.0085
status + gas, no value/block/addresses   0.0119
wrong status ("reverted")                0.0110
bare JSON {"status":…,"gas_used":…}      0.0072
"not found"                              0.0059
```

Completeness and exactness both matter; formatting does not. The eleven miners in the 0.01 band are
returning partial receipts. We already read EVM state correctly for WALLET_BALANCE_CHECK, where we
score 0.9999993 live — the same "immutable on-chain fact, read correctly" pattern, on RPC plumbing
that exists in `miner/src/wallet.ts`.

### CVE_LOOKUP — strong candidate (5 miners)

Static records, so the volatility problem does not apply. `cvz_1e06.wasm` is a hard binary: 1.0 or
~1e-11, nothing between. Crossing requires carrying the ground truth's **distinctive content**, not
its phrasing — a paraphrase that keeps the canonical tokens crosses, and one that spells the numbers
out in words ("ten out of ten", "releases 5.6.0 and 5.6.1") does not:

```
answer                                    vs terse GT   verbose GT   chatty GT   hedged GT
dense: severity + CVSS + versions + nature   1.0000       1.0000       1.3e-11     1.0000
canonical tokens, no "nature" clause         1.0000       1.3e-11      1.0000      1.0000
severity only                                1.0000       1.2e-11      9.9e-12     1.5e-11
versions only                                1.4e-11      1.3e-11      1.3e-11     1.2e-11
numbers spelled as words                     6.5e-12      7.4e-12      8.7e-12     6.3e-12
wrong facts                                  1.1e-11      9.4e-12      9.1e-12     9.9e-12
honest "no record retrieved"                 8.3e-12      9.7e-12      8.0e-12     7.1e-12
```

**No single answer crosses all four ground-truth registers** — which is the measured form of the
"cliff lottery", and it is why CVE crossing rotates between miners in 35% of epochs. The lever we
do control is fact *density*: the answer carrying severity, CVSS score, affected versions and the
nature of the flaw crosses three of four registers, and every sparser shape crosses fewer. Density
is bounded by the ~32-word conversion budget, so the target is the most distinct true facts per
word, not the longest answer.

There is also a concrete incumbent gap. `secwire-cve-lookup` (the strongest of the four real CVE
miners) returns NVD's record with `earliest_affected_version: null` and `fixed_versions: []` for
CVE-2024-3094 — the affected-versions half of the canonical description is unresolved, and the
version numbers exist only inside the prose description. `nvd` is the NIST API registered directly
as a miner (`base_url: https://services.nvd.nist.gov/rest/json/cves/2.0`), so it returns raw JSON
with no prose at all and scores ~1e-11 accordingly. Resolving CPE ranges into stated affected
versions is the differentiator, and it is the half the question asks for.

### CURRENCY_EXCHANGE — one narrow angle, not the obvious one (7 miners)

Live rates cannot be matched (§2). But the canonical description's own example is *"100 USD in EUR
right now"*, and the special case worth testing is that **daily reference rates do not move**: the
ECB publishes one rate per currency per day. If a ground truth is generated from a reference rate
rather than a trading quote, every source that uses that reference agrees exactly, and the
exact-match requirement becomes satisfiable instead of impossible. That is a testable hypothesis,
not a result — it is the next thing to measure, and it is the only reason this intent is still on
the list.

Note `optivis-crypto-price` leads this intent at ~1e-6 while the rest sit at 4e-8 to 2e-7 — an order
of magnitude above the field but still eleven orders below a crossing. Whatever it does is a lexical
edge inside the losing band, not a solution.

### GAS_PRICE — recommend dropping (9 miners)

Measured as unwinnable in §2: zero crossings by any of nine miners in twelve epochs, tolerance ~0.1%
on a quantity that changes every twelve seconds. The scorer would reward a correct answer at
0.9999976; the network structurally cannot deliver one. Ranking here is a coin flip on ties — epochs
315 and 316 both show three- and four-way exact ties at 5.7e-12 and 5.3e-12, with the rank order
inside a tie changing between epochs. Recommend replacing it in the queue with ONCHAIN_TX_LOOKUP
and CVE_LOOKUP work, and revisiting only if a ground truth ever shows a *rounded* gas figure.

## 4. Revised queue

| # | intent | miners | regime | why |
|---|---|---|---:|---|
| 1 | ONCHAIN_TX_LOOKUP | 12 | immutable | receipts don't move; 11 of 12 miners return partial ones; RPC plumbing already exists |
| 2 | CVE_LOOKUP | 5 | static | binary cliff, crossed by fact density; incumbents leave affected versions unresolved |
| 3 | TVL_LOOKUP | 10 | **gradient** | the only candidate whose scorer gives partial credit (0.0002–0.21), so improvement is measurable rather than all-or-nothing |
| 4 | NEWS_SEARCH | 5 | semi-static | 70% of epochs someone crosses; articles are static once published |
| 5 | GAME_RESULT | 3 | static | completed fixtures don't move — but see the SPORTS_SCORE precedent below |
| — | RESEARCH_SYNTHESIS | 4 | rare | 3% crossing in 29 epochs; needs real multi-source synthesis to be worth anything |
| — | WEB_SEARCH | 11 | rare | 40% crossing but the question space is unbounded |
| ✗ | GAS_PRICE | 9 | volatile | §2 — unwinnable by engineering |
| ✗ | CRYPTO_PRICE | 14 | volatile | leader 5.6e-28; same failure as gas |
| ✗ | FINANCIAL_DATA | 8 | volatile | leader 6.5e-20 |
| ✗ | STOCK_PRICE | 5 | volatile | plus market-hours staleness |
| ✗ | SPORTS_SCORE | 3 | volatile | live scores, and the 2026-08 precedent: a free source returned the wrong fixture and the intent was dropped rather than answer confidently wrong |
| ✗ | SENTIMENT_ANALYSIS | 2 | rejected | already built, measured and deleted on 2026-08-30 (EXPANSION_TARGETS.md §5): `sa_pure.wasm` is binary and requires reproducing the ground truth. Not to be revisited without a materially different approach. |

## 5. What is still unmeasured, and must not be claimed

- **No real question or ground-truth corpus exists for any candidate intent.** All ground truths
  above are authored. A shape that wins here is a shape that is *plausibly* right, not one that is
  known to have scored.
- The conversion step cannot be run offline. Scores are computed on our answer text directly, and on
  a 32-word clip of it; the node scores an LLM summary of the **whole payload**
  (`CONVERTER_MODEL.md` §1), which no local harness reproduces.
- Tie-break order among equal scores is unexplained. CVE epochs 312, 313 and 316 all show three- and
  four-way exact ties at 1.0, and the order inside them changes between epochs, so "rank 1" in a
  tied intent is not fully under our control even when we cross.
- The scorer itself can be replaced: champions are competitively registered, and four of the fifteen
  candidate champions were registered in the last week (regs 3029, 3030, 3119, 3165, 3166, 3170).
  Every measurement here has a shelf life and must be re-run before it is relied on again.
