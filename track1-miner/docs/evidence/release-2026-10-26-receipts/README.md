# Release 2026-10-26: answer receipts on production

- **Build:** `34f15d1` on `codex/rank1-14-intents` (`src/receipt.ts`, see `../receipts-2026-10-26/`).
- **Deployed from:** a clean worktree at `C:\Users\hyada\tg-deploy\m34f15d1` that held only the `.vercel` link.
- **Preview:** `miner-6cp1rjjl9`. Three routes probed; each receipt named the preview and its real reads.
- **Production:** `miner-mz9gh2afy` (`dpl_9vhibCZGDxQGAXPo5wQ4tFWdpvYL`), 2026-10-26 ~05:18 UTC, aliased to
  `miner-wine.vercel.app`.
- **Rollback target:** `miner-l5taibkkl` (`dpl_qu7A4NBd7wCqZf5LumXotNSjuEYy`).

## Gates

| Gate | Result | Note |
|---|---|---|
| verify-deploy | PASS | |
| param shapes | PASS, 54/54 | |
| hostile inputs | PASS, 162/162 | |
| no-regression | 0 identical then **8 identical** | The receipt differs on every call by design (id, timings, cache flag). With `receipt` added to the tool's per-call fields beside `checked_at`, all 8 are identical (`no-regression-rerun.txt`): the answers did not change |
| intent answers | 35/36 | The known IP Tokyo pin |
| upstream health | 2 FAIL | Both known: the ip-api primary and the merkle RPC answering 429 |
| watch.mjs, registration 4829 | `endpoint=ok activation=active` | 05:19 UTC |

## Receipts on production

`../receipts-2026-10-26/receipts-production.txt` and `.json`:

- `tools/receipt-check.mjs` against `miner-wine.vercel.app` gave all 36 intents a receipt, with no secret-like
  values.
- Every receipt names deployment `miner-mz9gh2afy-wukong4.vercel.app`.
- The zero-read intents match the local run, for the same reasons.
