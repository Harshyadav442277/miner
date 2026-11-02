# Evaluation material (Season II Evaluators track)

Rows for Telegraph's evaluation pool, built from public human-made data, never model-written. Rules:
[contribute-evaluation-data](https://anjoman.ai/docs/scoring/contribute-evaluation-data) (read 2026-11-01).
Facts and pool counts: [../../docs/TELEGRAPH_FACTS.md](../../docs/TELEGRAPH_FACTS.md).

| Intent | Builder | Source | Bounty |
|---|---|---|---|
| `LANGUAGE_TRANSLATION_GENERAL` | `build-translation.mjs` | Tatoeba human translations, CC BY 2.0 FR / CC0 | [#140](https://github.com/telegraphprotocol/bounties/issues/140) |

## Build and check

```bash
node track2/material/build-translation.mjs 30        # 30 rows per language x 5 languages
node track2/material/check-rows.mjs track2/material/out/LANGUAGE_TRANSLATION_GENERAL.jsonl LANGUAGE_TRANSLATION_GENERAL
```

`check-rows.mjs` applies the published row rules (lengths, distinct answers, label kinds, an http(s) source
link) and a stricter near-duplicate check (fails at 80% prompt similarity; the node rejects at 85%). It prints the
body's SHA-256: the file uploaded must be exactly that file.

Each row's worse answer is a real human translation of a sentence that means something else (a flipped
negation, another number, person or subject, or a different sentence on the same topic), or the right sentence
in the wrong language. `out/translation-review.txt` lists every row's two English sentences for a human check
before signing. `out/translation-attribution.tsv` credits every Tatoeba sentence used.

## Current file

`out/LANGUAGE_TRANSLATION_GENERAL.jsonl`, built 2026-11-01: **144 rows**, 30 per language less 6 removed on
review, body SHA-256 `35071c64c2f101411f0104b291f534b78168e176d6f3baf5e960084c7c51df26`. All 150 pairs were read;
6 near-misses meant nearly the same as the source ("which materials absorb water" vs "what are the materials
that absorb water"), so their "worse" label was not safe and they were dropped. The builder is random, so a
rebuild makes a different set that needs the same read.

**Conflict of interest, disclosed:** LiveCert (registration 4829) also serves this intent. Ranking-half rows are
asked of every miner, ours included. LiveCert is never tuned on these rows, and its own answers are not used
as either answer.

## Upload (the owner signs; Claude never touches the key)

1. Sign in at https://anjoman.ai/dashboard/eval with the contributor wallet, a burner per the root CLAUDE.md
   (its address is credited with the rows).
2. Add material under exactly `LANGUAGE_TRANSLATION_GENERAL`, upload `out/LANGUAGE_TRANSLATION_GENERAL.jsonl`, and
   sign the EIP-191 message the page shows. No fee or bond.
3. Check the rows: `curl -s "https://devnode.telegraphprotocol.com/api/evalpool/submissions/mine?submitter=<address>&intent_id=LANGUAGE_TRANSLATION_GENERAL"`.
   Every row should reach `admitted`, then `eligible` at the next epoch rollover (epochs are 1 hour).
4. On bounty #140: `/claim`, then `/submit <address> — 150 preference pairs ...` once the rows are eligible.

The pool uses an intent's questions only once 5 different contributors have material in it. One honest
contributor: never extra wallets to reach that number.
