# X_THREAD.md — Track 2 post series (user posts, tag @Telegraphprotoc)

The 10% X axis scores quality, consistency, reach. Post 1 is the required submission artifact
(with disclosure); 2–4 are the consistency cadence — one per day through Aug 31 works. All
insight-led: findings other builders want, not status updates.

---

## Post 1 — the submission post (required; post at registration time)

> Built an evaluation script for @Telegraphprotoc Track 2. The finding that motivated it: the
> current canonical scorer can't tell whether a miner answered. A contentless restatement of the
> question scores 0.993; a real answer with correct data scores 0.008 — measured against the
> exact on-chain WASM, 16 of 24 probes inverted, reproducible from public score records.
>
> Our module scores what an answer asserts — figures, identifiers, units, verdicts — against the
> ground truth. Wrong CVSS: 0.23. Wrong wind speed: 0.002. Same speed in km/h vs m/s: equal.
> 17.9 KB no_std Rust, ~10s of the gate's 600s budget, full source + corpus + proof public:
> github.com/Harshyadav442277/telegraph-factscore
>
> Disclosure: I also operate the Track 1 miner livecert (reg 225). The module encodes general
> correctness — its public test suite scores livecert's own answer style DOWN when factually
> wrong — and the overlap was proactively disclosed to the organizers for transparent review.

## Post 2 — the red-team story (the 30% robustness axis, in public)

> Before registering our @Telegraphprotoc Track 2 scorer we ran an adversarial review against
> ourselves: 19,734-call fuzz plus a gaming suite. It found 6 critical bugs — including
> "CVSS 1.0" scoring identical to "CVSS 10" (punctuation-blind normalization) and fake units
> ("47 bananas") beating honest wrong ones 65×.
>
> All six are fixed with before/after receipts in the repo. The attacks that FAILED are the
> interesting part: number-spraying loses, identifier near-misses are caught, unit arithmetic
> holds. If you're writing a scorer: attack it before the network does. Our harness + corpus are
> public so you can.

## Post 3 — the gate finding (the deepest technical insight of the series)

> A structural finding from @Telegraphprotoc Track 2: the scorer promotion gate requires ≥0.60
> Spearman agreement with the incumbent champion's ranking of real traffic. On STORM_ALERT the
> incumbent rewards question-echoes (contentless echo: 0.99). We swept 72 builds: once your
> scorer refuses to reward parroting, agreement ceilings at 0.593. You cannot both fix the
> incumbent's failure mode and agree with it.
>
> The agreement gate entrenches whatever the champion already rewards. Full sweep data in the
> repo. Fix suggestion: gate agreement on fixtures with verified ground truths, not on the
> incumbent's own scores.

## Post 4 — the kit release (the 10% adoption axis)

> Released for @Telegraphprotoc Track 2 authors: an offline harness that reproduces the node's
> scorer promotion gate — Stage-1 structural traps, margin/wins/self-match/Spearman, validated
> to 6 significant figures against live node scores — plus a 269-fixture corpus (recorded
> traffic + adversarial classes: fact-swaps, refusals, parrots, unit tricks).
>
> Test your module against the real champion binaries before spending a transaction:
> github.com/Harshyadav442277/telegraph-factscore — zero dependencies, one command. If it finds
> a hole in ours, even better: file an issue.
