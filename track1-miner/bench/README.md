# Frozen benches and answer-shape sweeps

`../../GAPS.md` **G24** stopped the `/scores` feed returning `question`,
`ground_truth` and `converted_answer`, so these files **cannot be refreshed**.
They are a snapshot taken before that, and they are the only way left to measure
an answer change against a real scorer.

| file | what |
|---|---|
| `acad_bench.json` | 22 real recorded ACADEMIC_SEARCH questions + ground truths |
| `ssl_bench.json` | 12 real recorded SSL_VERIFICATION questions + ground truths |
| `baseline.mjs` | scores production's current answers; also the champion-currency check |
| `acad_sweep.mjs`, `acad_sweep2.mjs` | ACADEMIC shape sweeps — **all variants lost** |
| `ssl_sweep.mjs` | SSL shape sweep — found the 7.2x reordering |

The champion WASMs are **not** committed: they are ~24 MB each and are not ours
to redistribute. Fetch `champ_acad_688.wasm` and `champ_ssl_631.wasm` and place
them beside these scripts.

## Two rules these scripts encode

**Score through `track2/harness/wasm-abi.mjs` `loadScorer`, never a naive
loader.** The champion WASMs use a bump allocator that wraps silently when many
answers are scored in one instance, and a naive loader returns corrupted,
run-order-dependent numbers.

**`clip32` is the column that decides.** Telegraph converts the whole payload
into roughly 32 words and scores that, so the raw mean regularly disagrees with
live results while clip32 tracks them.

## Champion currency

The node exposes no scorer endpoint, so there is no direct way to ask which
module is active. `baseline.mjs` checks it indirectly: if production's answers
still score what the last audit recorded, the scorer is behaving as it did.
A large unexplained divergence means **stop** — re-identify the active scorer
before measuring anything. A stale champion is what made an earlier CVE_LOOKUP
figure of 0.24 meaningless.
