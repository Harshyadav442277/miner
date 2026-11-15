# QUESTION_ANSWERING holdout inputs

A frozen evaluation set for a QUESTION_ANSWERING answer-ranking model, made of answers we did not write.
Fixed seed 20261115 everywhere; every output is byte-identical on rerun (checked by hashing). Stdlib only.
Downloads and raw files live outside OneDrive in `C:\Users\hyada\tg-eval\data\qa_holdout\`.

## Files

| File | What |
|---|---|
| `common.py` | download (curl, IPv4), sha256, deterministic JSON writer, normalisation and whole-token matching |
| `build_queries.py` | NQ-open dev -> filtered -> 120 seeded questions: `queries.json`, `queries.gold.json`, `queries.manifest.json` |
| `build_benchmarks.py` | 150 TruthfulQA + 150 HaluEval QA pairs: `benchmarks.jsonl`, `benchmarks.manifest.json`, `benchmark_questions.txt` |
| `label.py` | capture -> `labels.jsonl` + `review.tsv` (no model); `label.py pairs` -> `holdout_miners.jsonl` |
| `test_holdout.py` | unit tests |
| `queries.freeze.json` | written by `harness/freeze.py --queries`; never overwritten |

`benchmark_questions.txt` lists every benchmark question and every NQ query, lower-cased and accent-stripped, one per
line, so training data can exclude them.

## Commands, in order

Run from this folder, except the harness steps.

```
python build_queries.py
python build_benchmarks.py
python -m unittest
# freeze the queries BEFORE capturing any miner answer (from the worktree root):
python track2/harness/freeze.py track2/adapter/question_answering/holdout/queries.json --queries \
  --family QUESTION_ANSWERING --sources "NQ-open dev (see queries.manifest.json)" \
  --note "frozen before any miner answer was requested"
# capture (harness/capture.py), then:
python label.py <capture_dir> --gold queries.gold.json --out <labels_dir>
# a human fills the `verdict` column of <labels_dir>/review.tsv: incorrect | correct | skip
python label.py pairs <labels_dir>/labels.jsonl --review <labels_dir>/review.tsv --capture <capture_dir> --out holdout_miners.jsonl
# then merge benchmarks.jsonl + holdout_miners.jsonl and freeze the pairs file with harness/freeze.py
```

## Labelling rules (label.py)

- Answer text: a JSON object body gives the first non-empty string among `answer`, `summary`, `result`, `text`,
  `response`; otherwise the whole body. Non-200, empty body or an error object -> `unusable`.
- `correct`: a gold answer's normalised form (lower case, no accents, no punctuation, no articles) appears as a
  whole-token sequence in the normalised answer ("paris" does not match "comparison").
- `needs_review`: everything else. Never auto-labelled incorrect.
- `no_answer`: `"found": false`, `"verdict": "not_found"`, or refusal phrases ("could not find", "not found",
  "unable to", ...). Structured no-answer wins over a gold match; a gold match wins over a refusal phrase.
- Bodies starting with `<` (XML/HTML pages) can never be auto-`correct`; they go to `needs_review`.
- Slugs `zk-qa-claims`, `zk-qa-proof`, `zk-qa-source`, `textwire-question-answering` are one system `zk-text`; one
  response per (system, query), from the first slug in sorted order with a usable response.
- Pairs: chosen = `correct` (or human `correct`); rejected = human `incorrect` on a `needs_review` row (kind
  `wrong_answer`) or a `no_answer` row the human did not mark `skip`/`correct` (kind `no_answer`). Unreviewed
  `needs_review` rows are never used. Each combination from two different systems gives a `body` row (raw bodies
  cut to 6,000 characters) and a `text` row. `related_party` is true when a `livecert` response is on either side.

## Licences (read from each repository's own files; see the manifests)

- NQ-open: the repository-root `LICENSE` is Apache License 2.0; `nq_open/LICENSE` does not exist (404);
  `nq_open/README.md` says all Natural Questions data is released under CC BY-SA 3.0. The README names the
  data, so treat the questions and gold answers as CC BY-SA 3.0 (attribution, share-alike). The two statements
  differ in scope; no file reconciles them.
- TruthfulQA: `LICENSE` is Apache License 2.0.
- HaluEval: `LICENSE` is MIT License (copyright RUCAIBox).

## Limits

- Gold lists are incomplete, so a correct answer can land in `needs_review`; a human must review those rows.
  A wrong answer that happens to contain a gold string is labelled `correct` (e.g. a year in a wrong sentence).
- Some NQ questions have vague or yes/no style gold ("Typically, no", "a bank"); the filter checks length, not
  quality. Spot-check `queries.json` before relying on every row.
- Benchmark answers are short and bare; miner bodies are long JSON or prose. The two halves test different
  things and are reported separately by `format` and `source`.
- HaluEval's wrong answers were machine-written by its authors, not by us. In our sample the right answer is
  almost always the shorter one, so a "prefer shorter" baseline scores very high on that half (see
  `benchmarks.manifest.json`); it cannot stand alone as evidence of quality.
- TruthfulQA rows are misconception checks where `chosen` is often longer; neither benchmark half resembles
  paid miner output.
- Time-sensitivity is a keyword filter; some stale answers may remain.
