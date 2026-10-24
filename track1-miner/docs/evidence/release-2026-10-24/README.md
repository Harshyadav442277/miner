# Release 2026-10-24: G207 and G200 (academic) fixes on production

- **Build:** `8d121e9` on `codex/rank1-14-intents`. Its code commits are `fd68dc0` (G207, `src/qa.ts`) and
  `21dc8fa` (G200 academic search, `src/papers.ts`). `8d121e9` itself only changes MEMORY.md.
- **Deployed from:** a clean worktree at `C:\Users\hyada\tg-deploy\m8d121e9`. It held only the `.vercel` link:
  no `.env.local`, no build output.
- **Preview:** `miner-qofu599bo`. Seven routes probed with `npx vercel curl` (`preview-probes.txt`). All seven
  are correct; the preview has no Groq key, so this exercises the quoting fallback.
- **Production:** `miner-e2999tb2p` (`dpl_6bHka3JVSZrBXfrca9gUB6HxgWQk`), 2026-10-24 ~10:35 UTC. The
  `miner-wine.vercel.app` alias moved without a promote. The public alias answers the new title lookup.
- **Rollback target:** `miner-n9d4aoxw8` (`dpl_AmpABW4noEWRPjvEP7QsXRorZN4s`), built from `22284c0`.

## Gates, against production

| Gate | Result | Note |
|---|---|---|
| verify-deploy | PASS | |
| param shapes | PASS, 54/54 | |
| hostile inputs | PASS, 162/162 | |
| no-regression | PASS, 8 identical | |
| intent answers | 35/36 | The known IP Tokyo pin, the same miss as every release since 2026-10-14 |
| upstream health | 2 FAIL | Both known: the ip-api primary (Tokyo pin) and the merkle failover RPC answering 429 |
| watch.mjs, registration 4829 | `endpoint=ok activation=active` | 10:38 UTC |
| preflight | 3/7 | Re-run below. The failures were transient, or caused by this machine's network |

What preflight's failures were, re-run alone:

- **verify-deploy and SSL intent:** `wrong.host.badssl.com` timed out at 8.3 s inside preflight. Re-run:
  `hostname_mismatch` in 4.5 s, then 0.3 s. verify-deploy re-run passes (`verify-deploy-rerun.txt`), and
  intent answers are back to 35/36 (`intent-answers-rerun.txt`).
- **Unit and live suite:** three STORM live tests aborted at 16 s; re-run alone, four did (`storm-rerun.txt`).
  - From this machine, `api.met.no` does not answer: IPv4 timed out at 20 s, and IPv6 has no route.
  - Production answered a London storm question from MET Norway in 0.35 s at 10:49 UTC.
  - So these four failures say nothing about the deploy. Neither changed file is in the storm path.

**Not verified here:**
- the live STORM tests from a machine that can reach MET Norway;
- the 154-question audit, which has not been re-run.
