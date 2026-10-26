# Release 2026-10-26 (second): the confidence rule on production

- **Build:** `c0ac9cd` on `codex/rank1-14-intents`. It carries:
  - `bad18e6`: translation 0.9, academic topic search 0.8, 1.0 kept for direct authoritative reads;
  - `c0ac9cd`: `docs/openapi.json`, a repo document that changes nothing served.
- **Deployed from:** a clean worktree at `C:\Users\hyada\tg-deploy\mc0ac9cd` that held only the `.vercel` link.
- **Preview:** `miner-hdfp25ufp`. A topic search returned 0.8, the exact-title "Deep Residual Learning for Image
  Recognition" 1.0 and SSL 1.0, each with a receipt.
- **Production:** `miner-ccy6bq1ee` (`dpl_2a1LqwVBJrqfdyrWY58uaK4kVf3J`), 2026-10-26 ~05:47 UTC, aliased to
  `miner-wine.vercel.app`.
- **Rollback target:** `miner-mz9gh2afy` (`dpl_9vhibCZGDxQGAXPo5wQ4tFWdpvYL`).

## Gates

| Gate | Result | Note |
|---|---|---|
| verify-deploy | PASS | |
| param shapes | PASS, 54/54 | |
| hostile inputs | PASS, 162/162 | |
| no-regression | PASS, 8 identical | |
| intent answers | 35/36 | The known IP Tokyo pin |
| upstream health | 2 FAIL | Both known: the ip-api primary and the merkle RPC answering 429 |
| watch.mjs, registration 4829 | `endpoint=ok activation=active` | 05:48 UTC |

On production, a Spanish translation was answered "La biblioteca cierra a las seis." at confidence 0.9
(`translate-confidence.txt`).
