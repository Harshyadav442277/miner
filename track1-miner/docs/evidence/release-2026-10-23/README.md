# Release 2026-10-23: the correctness-audit fixes on production

- **Build:** `22284c0`, the merge of `claude/correctness-audit-2026-10-21`: 17 code commits, which include the
  places table already on the branch.
- **Deployed from:** a clean worktree at `C:\Users\hyada\tg-deploy\m22284c0`. It held no `.env.local` and no
  build output.
- **Preview:** `miner-qazd6wyp9`. Ten routes probed with `npx vercel curl` (`preview-probes.txt`).
- **Production:** `miner-n9d4aoxw8` (`dpl_AmpABW4noEWRPjvEP7QsXRorZN4s`), created 2026-10-23 13:32 UTC. The
  `miner-wine.vercel.app` alias moved to it without a promote. Public `/ip-geolocate?ip=8.8.8.8` returned
  `anycast`.
- **Rollback target:** `miner-q5qepqluk`, the previous production build (from `1d1969e`).

## Gates

| Gate | Result | Note |
|---|---|---|
| verify-deploy | PASS | |
| param shapes | PASS | |
| hostile inputs | PASS | |
| no-regression | PASS | |
| intent answers | 35/36 | The IP Tokyo pin: ip-api.com, the primary, does not answer as expected from this machine. The same miss appears in every release since 2026-10-14 |
| upstream health | FAIL | The ip-api primary as above, and the merkle failover RPC answering 429; both are on record for the Oct 14 and Oct 18 builds |
| unit + live suite (in preflight) | FAIL, then fixed | One live test still asserted the Season I one-sentence wording for 8.8.8.8, which `a1a8957` deliberately answers as anycast. The test now holds the anycast answer for 8.8.8.8 and the one-sentence rule on 128.101.101.101 |
| unit + live suite, re-run after the test fix | **911 pass, 0 fail, 1 skipped (912)** | Local run against live upstreams, 2026-10-23 ~13:40 UTC |
| watch.mjs, registration 4829 | `endpoint=ok activation=active` | 13:44 UTC |

`preflight-production.txt` holds the full preflight output.

## Found on the preview, shipped anyway (G207)

- **Timeless web-search questions now answer from Wikipedia, but the article choice is weak:**
  - "Who wrote Pride and Prejudice?" quoted the *Pride and Prejudice and Zombies (film)* article (it does name
    Jane Austen);
  - "What is the capital of Australia?" quoted the ACT article without naming Canberra;
  - the Mona Lisa and telephone questions were answered correctly.
- **Production before this release was worse on the same question:** it gave a film-news headline and "Pride is
  an emotion".
- **Shipped because:** the release is a net gain, including the sanctions alias fix (G201) and the fact-check
  verdict.
