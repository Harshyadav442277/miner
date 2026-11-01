# G207: wrong Wikipedia article in quoted answers (2026-10-24)

Twenty timeless questions were asked through `webSearch()` on the WEB_SEARCH and QUESTION_ANSWERING
path (`src/qa.ts`), against live Wikipedia. The answers were graded by hand against the articles.

| Run | File | Correct | Partial | Wrong |
|---|---|---:|---:|---:|
| No model, `84e0bd4` (production code) | `no-model-before.txt` | 11 | 1 | 8 |
| No model, branch | `no-model-after.txt` | 18 | 2 | 0 |
| Model (Groq), branch | `model-branch-vs-production.txt` | 20 | 0 | 0 |
| Model (Groq), production `miner-wine.vercel.app`, same minutes | same file | 17 | 0 | 3 |

- **Wrong before:** Pride and Prejudice, capital of Australia, capital of Canada, tallest mountain,
  Romeo and Juliet, The Four Seasons, boiling point and first person on the Moon. Mona Lisa was partial.
- **Partial after:** boiling point quotes the definition without 100 °C. The Moon question quotes Apollo 11
  ("first landed humans on the Moon") without naming Armstrong.
- **Production's three wrong answers** were quoted fallbacks: the Four Seasons band, the *Boiling Point*
  film and *A Walk on the Moon*. The model reply was rejected or unavailable, so the quoting path ran.
  Not established: whether this run's own load on the shared Groq key caused those fallbacks. The local run
  uses the same key.
- **Not covered:** the WEB_SEARCH questions that reach the news path, supplied-context questions, and any
  question set beyond these 20. These are 20 hand-picked questions, not a sample of routed traffic.

Reproduce from `track1-miner/miner`, after `npx tsc -p tsconfig.test.json`:

```bash
node ../docs/evidence/g207-2026-10-24/no-model.mjs "$PWD/dist-test"
node ../docs/evidence/g207-2026-10-24/model-vs-production.mjs "$PWD/dist-test" <path to .env.local>
```

The second script reads `GROQ_API_KEY` from the env file and never prints it.
