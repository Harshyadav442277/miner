# Frozen benches and the measurement harnesses that still run

`../../GAPS.md` **G24** stopped the `/scores` feed returning `question`,
`ground_truth` and `converted_answer`, so these files **cannot be refreshed**.
They are a snapshot taken before that, and they are the only way left to measure
an answer change against a real scorer for the intents they cover.

| file | what |
|---|---|
| `acad_bench.json` | 22 real recorded ACADEMIC_SEARCH questions + ground truths |
| `ssl_bench.json` | 12 real recorded SSL_VERIFICATION questions + ground truths |
| `ip_bench.json` | 21 real recorded IP_GEOLOCATION questions + ground truths |
| `bench_WALLET_BALANCE_CHECK.json` | 13 real recorded WALLET_BALANCE_CHECK questions + ground truths |
| `../tools/storm_bench.json`, `../tools/wf_bench.json` | 12-row STORM_ALERT and WEATHER_FORECAST benches |
| `baseline.mjs` | scores production's current answers on ACADEMIC and SSL; also the champion-currency check |
| `recovered-bench.mjs` | scores production against the 1,056 recovered receipts (SSL, IP, WALLET) — the largest real corpus, G49/G62 |
| `payload_shape.mjs` | measures the lean-payload projection under each intent's live champion (G56, G75) |
| `acad_shape.mjs` | the ACADEMIC payload-dilution measurement behind the lean `academicAnswer` (G40) |
| `storm_ucomp.mjs` | the wind-component sentence measurement that was rejected (G74) |

The one-off variant sweeps that used to sit beside these (`acad_sweep*`, `ssl_sweep`,
`ssl_lead_sweep`, `geo_restate`, `wallet_*`, `nopapers`, `h2h_preflight`) were removed on
2026-09-08: every one of their conclusions is recorded in GAPS (G40, G42, G45, G46, G54, G55) and
the candidate wordings they compared no longer exist in the code. They remain in git history.

No bench exists for TRANSLATION, CONTENT, NEWS, FACT_CHECK, TELEGRAPH_KNOWLEDGE or AI_TEXT — the
recovered receipts do not cover them — so shape changes on those intents cannot be measured here.

The champion WASMs are **not** committed: they are ~24 MB each and are not ours
to redistribute. Fetch them from `/api/wasm?intent=…` and place them beside these scripts
under the names each script expects.

## Two rules these scripts encode

**Score through `track2/harness/wasm-abi.mjs` `loadScorer`, never a naive
loader.** The champion WASMs use a bump allocator that wraps silently when many
answers are scored in one instance, and a naive loader returns corrupted,
run-order-dependent numbers.

**`clip32` / `flat32` is the column that decides.** Telegraph converts the whole payload
into roughly 32 words and scores that, so the raw mean regularly disagrees with
live results while the clipped column tracks them. Even so, a twelve-row bench is a filter
for obviously bad changes, not evidence that a change wins; only a scored epoch is (G62).

## Champion currency

The node exposes no scorer endpoint, so there is no direct way to ask which
module is active. `baseline.mjs` checks it indirectly: if production's answers
still score what the last audit recorded, the scorer is behaving as it did.
A large unexplained divergence means **stop** — re-identify the active scorer
before measuring anything. A stale champion is what made an earlier CVE_LOOKUP
figure of 0.24 meaningless.
