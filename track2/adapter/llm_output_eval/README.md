# LLM_OUTPUT_EVALUATION evaluator adapter: training pairs

`LLM_OUTPUT_EVALUATION` is a judgment intent: "judge a generative model's output for factual fidelity,
citation support and hallucination". The organiser's kit can package it; it cannot package FACT_CHECK
(see [../../GAPS.md](../../GAPS.md) G29). This folder uses the FACT_CHECK method one level up. The
question gives a model's statement and the source it cites. The miner's answer is an evaluation of that
statement.

Everything the evaluator needs is in the prompt, so the task is reading two texts against each other, not
recalling facts. That is a better fit for a 150M-parameter reward model than open-world fact checking.

## What a pair teaches

**Statements:**

- A statement is **faithful** when it is a FEVER SUPPORTS claim.
- It is **contradicted** when it is a FEVER REFUTES claim, or a SUPPORTS claim whose number or date was edited
  away from the source.
- The two classes are balanced 50/50 in every split, so "always say hallucination" is worth nothing.

**Evaluations:** the chosen evaluation gets the verdict and the detail right. The rejected one uses the same
template and is wrong in one way:

| kind | rejected evaluation |
|---|---|
| `flip` | the opposite verdict |
| `fabricate` | the opposite verdict, with a specific misreading. Either it invents a discrepancy the source does not have, or it says a hallucinated value "matches". |
| `misquote` | the right verdict, with the wrong detail. Either the discrepancy is reported back to front, or the evaluation "matches" a value that appears nowhere. |

Every evaluation names the statement it judges. Without that, the first build reused generic reasons: only
55.6% of rejected answers were unique, and 49.6% of held-out negatives had appeared in training. The kit's
gate refused it.

## Build

```bash
python -B -I build_eval_pairs.py --fever <fever_gold/train.jsonl> --out <dir> --train 6000 --val 800 --test 800
# from the kit root, with the kit venv:
python -m wide_runtime.train_adapter --intent LLM_OUTPUT_EVALUATION --data <dir>/train.jsonl \
  --val-data <dir>/val.jsonl --test-data <dir>/test.jsonl --batch-size 8 --grad-accum 2
```

The generator reuses `../fact_check` (FEVER loading, edits, and the split by article), with seed 11.

## Data gate, 2026-10-22

| check | value | limit |
|---|---|---|
| unique negatives | 100.0% | ≥ 80% |
| largest single negative | 0.0% | ≤ 2% |
| length shortcut | 51.0% | ≤ 65% |
| held-out leak | 0.0% | ≤ 10% |
| surface probe | 52.8% | ≤ 65% (50% means no tell) |

**Kinds per split:**

| split | flip | fabricate | misquote | faithful / contradicted |
|---|---|---|---|---|
| train | 2589 | 1691 | 1720 | 2973 / 3027 |
| val | 351 | 219 | 230 | 395 / 405 |
| test | 337 | 212 | 251 | 424 / 376 |

## Limits

- The data covers factual fidelity against one cited sentence. The intent also names tone, safety and
  multi-source citation support, which none of these pairs teach.
- All statements and sources come from Wikipedia via FEVER.

Source, licence and integrity rules are the same as [../fact_check/README.md](../fact_check/README.md): FEVER,
CC BY-SA 3.0. None of these pairs goes to the evaluation pool.
