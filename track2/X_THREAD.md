# X_THREAD.md — Track 2 posts (user posts, tag @Telegraphprotoc)

**Every post below is verified ≤280 characters** (URLs counted as X counts them: 23 chars).
Figures re-verified 2026-08-28 against the final build: 23.2KB module, 348-fixture corpus
(both were stale from an earlier build; the substitutions are same-length, so counts hold).
Post them exactly as written; adding a word may push one over. Character counts in brackets.

Post 1 is the required submission artifact — post 1a/1b/1c as a single thread (reply chain), and
the disclosure in 1c is mandatory per the organizers' answer. Posts 2–4 are the consistency
cadence, one per day through Aug 31.

---

## POST 1 — the submission thread (post all three as a reply chain)

**1a** [271]

```
@Telegraphprotoc Track 2 finding: the canonical scorer cannot tell whether a miner answered.

Contentless restatement of the question: 0.993
Real answer carrying correct data: 0.008

A 124x inversion. Measured against the on-chain WASM. 16 of 24 probes ordered backwards.
```

**1b** [252] — reply to 1a

```
So I wrote one that scores what an answer asserts - figures, identifiers, units, verdicts - against the ground truth.

Wrong CVSS: 0.23
Wrong wind speed: 0.002
18 km/h vs 5 m/s: identical

23.2KB no_std Rust, zero imports, ~10s of the gate 600s budget.
```

**1c** [260] — reply to 1b · **contains the mandatory disclosure**

```
Source, 348-fixture corpus, offline gate harness, full measured proof:
github.com/Harshyadav442277/telegraph-factscore

Disclosure: I also operate the Track 1 miner livecert (reg 225). My test suite scores my own miner style DOWN when factually wrong. Overlap disclosed to organizers.
```

## POST 2 — the red-team story [278] · robustness axis

```
Before registering my @Telegraphprotoc Track 2 scorer I red-teamed it. A 19,734-call fuzz + gaming suite found 6 critical bugs in my own module.

Worst: "CVSS 1.0" scored identical to "CVSS 10". Fake units ("47 bananas") beat honest-wrong ones 65x.

All fixed, receipts in repo.
```

## POST 3 — the gate finding [268] · the sharpest technical insight

> **Rewritten 2026-08-27.** The earlier draft claimed agreement "ceilings at 0.593" — true of the
> pre-entity-swap build, **falsified** by the fixed one, which measures 0.6005 and passes. The
> tension is real; the wall is not absolute. Never post the old version.

```
@Telegraphprotoc scorer promotion needs 0.60+ Spearman agreement with the incumbent.

But on STORM_ALERT the incumbent rewards contentless question-echoes. Refusing to reward them costs agreement: 72 builds, best 0.593.

An unrelated bugfix pushed it to 0.6005. Passes by 0.0005.
```

## POST 4 — the kit release [263] · adoption axis

```
Released for @Telegraphprotoc Track 2 authors: an offline harness reproducing the node promotion gate (validated to 6 sig figs against live scores) + a 348-fixture corpus.

Test your module against the real champions before spending a tx.

github.com/Harshyadav442277/telegraph-factscore
```

---

## If you have X Premium

Premium raises the limit to 25,000 characters, so 1a+1b+1c can be **one** post — just concatenate
them with blank lines between. The disclosure paragraph must still appear.
