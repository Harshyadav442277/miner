# LiveCert — Telegraph Hackathon Season II

A Telegraph miner and its evaluators, from wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.
Season II runs 1 Nov – 1 Dec 2026 ([RULES_SEASON2.md](RULES_SEASON2.md)). The Miner and Evaluator
tracks' rules were still unpublished when last checked, 2026-10-21 06:30 UTC.

| Track | What | Start here |
|---|---|---|
| **Miner** | LiveCert: 36 intents, registration **4829**, <https://miner-wine.vercel.app> | [`track1-miner/README.md`](track1-miner/README.md) |
| **Evaluators** | Deterministic `no_std` WASM scorers that check typed facts — figures, units, identifiers, verdicts — rather than wording | [`track2/README.md`](track2/README.md) |
| **Apps & Agents** | Morse, a Telegram front end to the network (Season I), in its own repository | [`telegraph-morse`](https://github.com/Harshyadav442277/telegraph-morse) |

X: [`@hyadav42774`](https://x.com/hyadav42774)

## The miner in one paragraph

Season II apps may not call a miner directly: Telegraph routes each request to the highest-ranked
miner for its intent, so answer quality is how demand arrives. LiveCert's answers lead with the
answer, name the primary source it was read from, carry `checked_at`, and report an outage or a
limit as one instead of guessing. Each source's terms were read for commercial use; the ones still
open are listed in the [Track 1 README](track1-miner/README.md#sources-and-licences) and in
[GAPS.md](GAPS.md).

## Where things are

| | |
|---|---|
| Plan and next actions | [track1-miner/docs/SEASON2_PLAN.md](track1-miner/docs/SEASON2_PLAN.md) |
| Calling the miner | [docs/INTEGRATE_LIVECERT.md](docs/INTEGRATE_LIVECERT.md) |
| Protocol facts, with sources and dates | [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) |
| Known gaps and limits | [GAPS.md](GAPS.md) |
| Session state | [MEMORY.md](MEMORY.md) · [TASKS.md](TASKS.md) |

Season I (Aug–Sep 2026) is judged and over. Its rank tables, submission briefs and calibration
experiments were removed from the tree on 2026-10-17/18 and remain in git history.
