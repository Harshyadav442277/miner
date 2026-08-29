# ADVANTAGE.md — the asymmetric edge, mapped to the rubric

The user's directive is an *unfair asymmetrical advantage over others*. The advantage is real,
and it is legitimate: it is accumulated measurement, not a rules exploit. Rule 04 (gaming)
disqualifies; everything below survives that filter.

---

## What we have that other Track 2 entrants do not

1. **An offline eval loop from day zero.** `track1-miner/docs/codex-worklog/probe-champion.mjs` loads any
   scorer WASM via the live ABI and reproduces reported epoch scores *exactly* from
   `converted_answer`. Everyone else iterates against theory or waits ~9-hour epochs. We measure
   a candidate scorer's behavior in seconds, on pinned binaries.

2. **Receipts of the baseline mis-ranking real traffic.** From Track 1 we hold recorded epochs
   where the canonical scoring gave **0.99 to a refusal** ("cannot provide the forecast") and
   **0.007 to a correct 48-hour forecast**; where correct SSL/storm answers pinned at ~0.006
   indistinguishable from CT-log lookups and error objects. These are exactly the "how accurately
   does the script evaluate miner outputs" failures the **50% axis** measures — sourced from live
   epochs, reproducible with the harness.

3. **Domain code that knows what a correct answer is.** `miner/src/` already implements live TLS
   verdicts, storm point-vs-window temporal semantics, date-aware forecasts, CVE/NVD facts,
   geolocation. A scorer is the same domain knowledge pointed the other way: we extract and
   compare the facts we already know how to produce.

4. **A measured theory of failure.** Track 1 taught us *why* the baseline mis-ranks: embedding
   cosine and BM25 reward vocabulary proximity, not factual agreement — "CVSS 9.8" vs "CVSS 3.1"
   are near in embedding space and opposite in fact. Fact-aware comparison (A3) attacks the root
   cause, and we can demonstrate every claim with a fixture the baseline fails.

5. **Independent evidence without rebuilding somebody else's tool.** The public
   [`telegraph-wasm-check`](https://github.com/neromtoobad/telegraph-wasm-check) project is better
   packaged as a generic adoption utility than our harness. Competing by cloning that surface
   would dilute the submission. We use its pinned commit as an independent runtime/fuzz/memory
   check, then spend our effort on the target-specific semantic corpus and proof it does not have.
   The frozen TAC artifact passes its generic suite with zero hard or soft failures and all 16 of
   our custom cases.

6. **A reviewer path with no abandoned-target noise.** The editing monorepo retains broad
   multi-intent evidence, but the standalone release leads with one intent, one binary, one
   90-second brief, and one focused proof. A read-only release audit rejects extra WASM files,
   stale development documents, leaked local paths, corpus/manifest drift, and hash mismatch.
   This turns packaging from presentation polish into a reproducible invariant.

7. **A held-out semantic failure we found before the node could.** A 20-case probe used unseen
   negated phrasing rather than corpus mutations. It made the green intermediate scorer fail
   10/20—including assigning `original` 0.997858 when the truth said `not original`. The repaired
   scorer passes 20/20 while preserving both public corpora. Publishing that before/after is a
   stronger robustness claim than adding more cases only after implementation.

## Mapping to the rubric

| Axis | How the edge lands |
|---|---|
| 50% improvement over baseline | Side-by-side harness: pairwise ranking accuracy on neutral + adversarial + real-traffic fixtures, baseline vs ours, one command, pinned binaries. Claims carry receipts, not vibes. |
| 30% robustness & code quality | Small, typed, dependency-light Rust; exhaustive edge-case tests (empty answer, huge answer, non-UTF8, stuffing, contradiction, refusal); strict sandbox adherence (no imports, no nondeterminism). |
| 10% X engagement | The Track 1 X playbook (insight-posts over status-posts) applied to genuinely interesting material: "the canonical scorer gives 0.99 to a refusal — here's the fix, reproducible." |
| 10% adoption | Ship the harness + fixture corpus as a reusable kit any script author can run against their own scorer; that is the thing other entrants will actually want. |

## The rank-1 counter-position

Another entrant can win the packaging story with a generic verifier. Our strongest position is
different and harder to copy before the deadline:

1. publish one tiny, reproducible scorer that targets the weakest live semantic blind spot;
2. show the incumbent scoring wrong categorical answers above right ones on pinned bytes;
3. show the fix surviving an external verifier, a native semantic corpus, and a cross-intent
   holdout;
4. make the exact WASM/hash/proof identity immutable and easy to audit; and
5. earn genuine adoption by inviting real authors to run the public corpus and report results.

The last step must be real. No synthetic issues, reciprocal stars, sockpuppets, or tiny
registration spam: those would trade a small engagement gain for Rule-04 disqualification risk.

## The guardrail

The edge stays legitimate only while the scorer is **general**: no miner fingerprints in either
direction, JSON-vs-prose fairness, adversarial fixtures that punish our own miner's answer style
when it is factually wrong, and published source + reasoning. Anything that reads as scoring *for
livecert* rather than *for the intent* converts the advantage into a disqualification. See
ARCHITECTURE A4.
