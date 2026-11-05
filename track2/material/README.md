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

1. Sign in at https://anjoman.ai/dashboard/eval and verify `hyadav42774@gmail.com` and the connected LiveCert
   wallet `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` before proceeding. The signer is credited with the rows.
2. Add material under exactly `LANGUAGE_TRANSLATION_GENERAL`, upload `out/LANGUAGE_TRANSLATION_GENERAL.jsonl`, and
   sign the `Telegraph eval-pool submission v1` EIP-191 message. Check the intent, body SHA-256 above,
   and Sepolia chain ID `11155111`. No fee or bond.
3. Check the rows: `curl -s "https://devnode.telegraphprotocol.com/api/evalpool/submissions/mine?submitter=<address>&intent_id=LANGUAGE_TRANSLATION_GENERAL"`.
   Check the receipt and confirm how many rows progress from `admitted` to `eligible` after an epoch rollover.
4. On bounty #140, use `/claim`, then `/submit <address> — <verified eligible count> preference pairs ...`
   once the rows are eligible.

The pool uses an intent's questions only once 5 different contributors have material in it. One honest
contributor: never extra wallets to reach that number.
