# X_THREAD.md — posts for both tracks

**Every post below is verified ≤280 characters.** Post them as written; adding a word may push one
over. Count in brackets.

## What the organizers actually said (confirmed 2026-08-28, via the user)

> "there's no fixed formula like likes/reposts = x points. we'll look at quality, consistency,
> reach, likes, reposts, comments and meaningful engagement of your updates … you can post about
> both your track 1 and track 2, experiments, results, improvements, journey, learnings, edge
> cases you faced, etc … just make sure to tag @Telegraphprotoc and keep them genuine, we mainly
> want to see the actual work and progress"

Four things follow, and they reshape the plan:

1. **Both tracks count.** Track 1 has the wins (three #1 slots); Track 2 has the findings.
2. **Consistency is named.** A steady cadence beats one big thread. Space these out.
3. **Journey, learnings and edge cases are explicitly wanted** — so the rejection, the bug we
   shipped and caught, and the failed assumptions are *assets*, not things to hide.
4. **Genuine over polished.** No thread-bro voice, no fake milestones. Measured numbers only.

**Already posted:** a thread on the account with ~200 engagements. This file is the follow-on
cadence, not a replacement.

---

## TRACK 1 — the wins and the debugging

**T1-1** [243] · the result

```
Track 1 update: livecert is #1 in SSL_VERIFICATION, STORM_ALERT and IP_GEOLOCATION on @Telegraphprotoc.

The thing that moved the needle was not better data. It was answering every clause the question actually asked, in the question own terms.
```

**T1-2** [264] · the lesson others will hit

```
Debugging a miner on @Telegraphprotoc taught me something blunt: any non-2xx is a zero.

Our storm endpoint got called with location="" and returned 400. The engine stores an empty answer, the scorer sees nothing, score 0.

An honest 200 beats a well-shaped error.
```

**T1-3** [280] · edge cases

```
Edge cases that cost real score on @Telegraphprotoc, all found by replaying actual paid questions:

- "39.6438 N, 104.8669 W" read as positive -> answered for China, not Colorado
- "next Monday" geocoded to Munday, a real town
- "48-hour" did not parse: a hyphen is not whitespace
```

## TRACK 2 — the journey, in order

**T2-1** [270] · the finding that started it

```
Switched to Track 2 on @Telegraphprotoc: writing the WASM module that grades miner answers.

First finding, measured against the live on-chain scorer: a contentless restatement of the question scores 0.993. A real answer with correct data scores 0.008.

124x, backwards.
```

**T2-2** [237] · what I built

```
So I wrote a 25,887-byte no_std scorer that grades what an answer asserts - verdicts, figures, identifiers and units - against the truth.

Wrong AI verdict: ~0
Wrong CVSS: 0.03
18 km/h vs 5 m/s: same claim

Zero imports. @Telegraphprotoc
```

**T2-3** [268] · the rejection

```
Registered it on @Telegraphprotoc. Rejected.

14 of 15 fixture cases vs the champion 15 of 15. Lost by one.

The rejection was worth more than a pass: it returned the node measurement of my module on its hidden fixtures. First real calibration I could not get offline.
```

**T2-4** [277] · being wrong in public

```
What the rejection taught me, @Telegraphprotoc:

My corpus said the champion scored 0.438. The node measured it at 0.992.

Mine was full of adversarial cases where it fails. The real gate uses clean good-vs-bad pairs, where it is near perfect.

I optimised for the wrong thing.
```

**T2-5** [268] · attacking my own work

```
Before re-registering I attacked my own scorer. 19,734-call fuzz plus a gaming suite.

Found 6 critical bugs in my own code. Worst: "CVSS 1.0" scored identical to "CVSS 10" because the normaliser stripped punctuation.

All fixed, receipts in the repo. @Telegraphprotoc
```

**T2-6** [277] · the bug that nearly shipped

```
The one that nearly shipped, @Telegraphprotoc:

Ground truth said Mountain View. An answer saying Berlin - one word changed - scored a perfect 1.0000. Tied a verbatim-correct answer.

My fixtures never tested a single-entity swap. Found it by probing the hosted binary instead.
```

**T2-7** [266] · the structural finding, part 1

```
Structural finding on @Telegraphprotoc Track 2, and I think it matters.

Promotion needs 0.60+ rank agreement with the incumbent. But I measured that incumbent scoring a wrong answer at 0.99.

Ground truth Tokyo. Answer "Mumbai, India". Champion 0.9918. Mine 0.0855.
```

**T2-8** [271] · part 2 — reply to T2-7

```
Which means: to pass the agreement gate I would have to score Mumbai like Tokyo.

Agreeing with a scorer and correcting it are the same axis, pointed opposite ways. On every intent with 2+ miners, the gate protects the incumbent errors.

I did not do it. @Telegraphprotoc
```

**T2-9** [275] · the sharpest single measurement

```
Measured the AI-text-detection champion on its own domain, @Telegraphprotoc.

Flip "AI-generated" to "human-written" - one word, rest identical - and it scores the WRONG verdict 0.9999.

Its separation margin is negative: -0.165. It prefers the wrong answer 219 times in 240.
```

**T2-10** [278] · the giveaway, which also earns the adoption criterion

```
Open-sourced my @Telegraphprotoc Track 2 benchmark: 256 pairs plus 20 held-out negation checks, one command, no install.

It catches verdict flips, model swaps and confidence errors before a registration transaction.

MIT. Failures welcome.

Test before you spend a transaction.
```

Attach the repo link to T2-10: `github.com/Harshyadav442277/telegraph-factscore`

**T2-11** [256] · independent review found what our own corpus missed

```
An independent review found 2 holes in my Track 2 scorer: AI did not equal machine-generated, and Paris-to-Berlin at sentence start was nearly free.

Fixed both generally. Final TAC corpus: 256/256, margin 0.974. External fuzz: 0 failures. @Telegraphprotoc
```

**T2-12** [266] · frozen release identity

```
Release frozen: 25,887-byte no_std WASM, zero imports, deterministic, under 1 millisecond at 128 KiB.

It catches a one-word AI verdict flip that the live champion scores 0.9999 wrong.

Proof + hashes: github.com/Harshyadav442277/telegraph-factscore @Telegraphprotoc
```

**T2-13** [278] · genuine adoption invitation

```
Telegraph script authors: test any AI-authenticity WASM on 256 public pairs—no incumbent, install, network or transaction:

node harness/check-tac.mjs dist/your.wasm

Open an issue with results. Failures welcome.

github.com/Harshyadav442277/telegraph-factscore @Telegraphprotoc
```

**T2-14** [265] · the final held-out red team

```
Last red-team before registering found our scorer inverted negation: truth "not original" gave wrong "original" 0.9979 and correct "copied" 0.000007.

Fixed semantics, not the fixture: unseen negation set 10/20 → 20/20. Public corpus stays 256/256. @Telegraphprotoc
```

**T2-15** [268] · mandatory overlap disclosure

```
Disclosure for @Telegraphprotoc review: I also operate Track 1 miner livecert (registration 225).

The Track 2 scorer contains no miner slug, wallet or response fingerprint. It applies the same public semantic checks to every answer. The overlap is stated in the repo.
```

**T2-17** [278] · disclosure refresh — POST THIS ONE (2026-08-30: supersedes T2-15's
registration number — livecert re-registered, now registration 389 (334 as of 2026-08-30, superseded
2026-08-31; check the live id before posting) — and covers the held scorer slots,
which T2-15 predates; the LANGUAGE_TRANSLATION overlap is live and must be disclosed before
judging, not after)

```
Disclosure update for @Telegraphprotoc: my Track 2 modules now hold scorer slots incl. LANGUAGE_TRANSLATION, an intent my Track 1 miner livecert serves. Each is a strictly increasing recalibration of the incumbent scorer - it cannot re-rank any miner. Method public in the repo.
```

**T2-16** [264] · genuine adoption receipt

```
Adoption receipt: an external fork is 9 commits ahead, adapting my fact-aware scorer kernel to IP geolocation with measured tests.

That is real code reuse, not independent validation of my TAC artifact.

github.com/shreshth006/telegraph-factscore @Telegraphprotoc
```

---

## Suggested order and pacing

Consistency is explicitly scored, so spread these rather than dumping them.

| when | post | why |
|---|---|---|
| immediately after the repository update | T2-14 | strongest held-out failure and measured repair |
| reply to T2-14 | T2-12 | exact current release, proof and hashes |
| reply to T2-12 | T2-15 | mandatory Track 1/Track 2 overlap disclosure |
| reply to T2-15 | T2-13 | asks for real use; replies/issues become adoption evidence only if they happen |
| next | T2-16 | links the first genuine downstream development trail without overstating it |
| next | T2-11 | independent criticism and the earlier measured fix |
| after that | T2-10 | the broader giveaway; recruits harness users for the 10% adoption criterion |
| now | T1-1 | a concrete win, good reach |
| +3h | T2-9 | the sharpest measurement in the whole project |
| +1d | T2-7 → T2-8 as a reply chain | the structural argument, needs two posts |
| +1d | T2-3 → T2-4 | the rejection and being wrong in public |
| +2d | T2-5 → T2-6 | self-attack and the bug that nearly shipped |
| spare | T1-2, T1-3, T2-1, T2-2 | fillers, any order |

**Reply to anyone who engages.** "Comments and meaningful engagement" is named in the criteria,
and a real back-and-forth about a measurement is worth more than another broadcast.

**Do not claim a champion slot until one is actually held.** Every number above is measured and
holds up; the moment one doesn't, the whole account is worth less.
