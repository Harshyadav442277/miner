# FIXTURES.md — evaluation corpus spec

The corpus is the proof. The harness runs the Canonical Script and our candidate over these
fixtures; **pairwise ranking accuracy per fixture class** is the improvement metric the 50% axis
is argued with. Build spec for T-B.1/T-B.2; design rationale lives here so the corpus stays
honest.

---

## Record shape

```json
{
  "intent": "SSL_VERIFICATION",
  "question": "…",
  "ground_truth": "…",
  "answers": [
    { "id": "correct-terse", "text": "…", "quality": 1.0, "note": "all decisive facts right" },
    { "id": "fact-swap-expiry", "text": "…", "quality": 0.0, "note": "expiry date wrong, else identical" }
  ],
  "pairs": [["correct-terse", "fact-swap-expiry"]],
  "provenance": { "source": "synthetic | scores-api", "url": "…", "epoch": 284, "captured": "2026-08-27" }
}
```

Every ordered pair means: a correct scorer ranks the first strictly above the second. A scorer's
class accuracy = fraction of pairs ordered correctly. Also record **discrimination**: the score
spread across a fixture's answers — a scorer that gives everything ~the same value ranks pairs by
noise and must be caught even when it luckily orders them.

## Fixture classes

1. **REAL** — recorded traffic from public `/scores` records: actual question, ground truth, and
   the miner answers that were actually scored (with their live scores kept as metadata, not as
   truth). Provenance pinned. Never edited. This class is what makes the proof credible to a
   manual reviewer.
2. **FACT-SWAP** — a correct answer duplicated with one decisive fact changed (number, verdict,
   identifier, date). Embedding cosine barely moves; a fact-aware scorer must invert the order.
   The core demonstration of the thesis.
3. **REFUSAL** — *corrected 2026-08-27 by harness validation:* in 554 recorded rows, zero cases
   of a refusal **answer** outscoring a correct one — the earlier archetype was inverted. In real
   traffic the refusal is the **ground truth** (8/15 weather GTs are hedged/refusal-shaped; 40 of
   58 sub-0.02 rows), and against such a GT a contentless question-echo earns 0.99. The class
   therefore splits: (a) GT carries decisive data + answer is a refusal → refusal must score near
   zero; (b) GT is itself refusal-shaped → a hedged answer is *correct* and must score high,
   while a contentless echo must not outscore it. Both directions carry fixtures.
4. **STUFFING** — question vocabulary + intent keywords concatenated with no decisive facts (or
   hedged ranges covering every outcome). Must lose to any factually correct answer.
5. **CONTRADICTION** — contains both the right and a wrong value for the same fact. Must not beat
   a clean correct answer; hedging both sides is not knowledge.
6. **FORMAT-EQUIVALENCE** — the same facts as (a) JSON, (b) full prose, (c) one terse sentence.
   Constraint class: scores must be near-equal (tolerance recorded in the harness). This is also
   the fairness/legitimacy exhibit (ARCHITECTURE A4).
7. **UNIT/FORM** — same fact, different surface: km/h vs m/s, 0.55 vs 55%, ISO timestamp vs prose
   date, `39.6438° N, 104.8669° W` vs signed decimals. Must count as correct. (Track 1 measured
   real traffic carrying hemisphere letters, mangled `Â°`, and U+FFFD.)
8. **TEMPORAL** — point-vs-window semantics: the value at hour 44 vs the 44-hour maximum; a
   forecast for the requested start date vs "next N hours from now". Right value for the wrong
   time is a wrong answer.
9. **LENGTH** — correct-terse vs correct-verbose (near-equal; at most a mild style delta), and
   wrong-terse vs correct-verbose (correct wins regardless of length). Probes the baseline's
   length penalty rewarding brevity over truth.
10. **OUR-STYLE-WRONG** — a livecert-shaped answer (verdict/confidence/reason fields, our prose
    style) with wrong facts vs a competitor-shaped answer (e.g., bare JSON record, grade-report
    style) with right facts. The wrong one must lose. This class is the anti-fingerprint proof
    that the scorer favors facts, not our miner.

## Decisive facts per target intent (extraction schema, first cut)

| Intent | Decisive facts |
|---|---|
| SSL_VERIFICATION | verdict (valid/expired/self-signed/mismatch/untrusted/unreachable), expiry date, issuer, hostname-match, chain completeness, SANs |
| STORM_ALERT | wind speed, gusts, precipitation, risk in [0,1], time mode (point/window) + valid_at/window, coordinates echoed |
| WEATHER_FORECAST | place, requested start + horizon, temperature range, precipitation, variables asked for |
| CVE_LOOKUP | CVE id, severity word, CVSS score, affected versions |
| IP_GEOLOCATION | IP echoed, country/region/city, ISP/org, coordinates |
| STOCK_PRICE / CRYPTO_PRICE / CURRENCY_EXCHANGE | symbol/pair, numeric value, currency/unit, as-of time |

Numeric comparison is typed: absolute epsilon for bounded scores (risk), relative bands for
prices/speeds, calendar-aware parsing for dates, unit normalization before comparison.

## Honesty rules (bind the corpus, not just the code)

- REAL fixtures are never edited; provenance (URL, epoch, capture date) committed beside them.
- Synthetic answers are **generated by script** from a fact schema wherever possible, not
  hand-typed against a visible ground truth — Track 1's measurement trap (hand-written candidates
  leak the ground truth and inflate scores) applies to fixtures too.
- Every synthetic fixture carries a one-line rationale naming the baseline failure it probes.
- Class sizes per intent: ~10 REAL + ~15 synthetic spread across classes 2–10. Enough to argue
  with, small enough to review by hand.
- The corpus ships in the public kit (ADVANTAGE: the 10% adoption play) — other authors testing
  their scorers against it is adoption *and* scrutiny we invite deliberately.
