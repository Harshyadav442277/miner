---
name: release-miner
description: Deploy the LiveCert miner (track1-miner/miner) to Vercel production and record the gates. Use when the owner has said yes to a deploy of a given commit; never for push, sign or updateMiner.
---

# Release the miner

Needs the owner's yes for this deploy. A yes covers one commit's release, not later ones.
A deploy is not a push, and neither one is an `updateMiner`.

## Steps

1. **Land and check the commit.** It must be on `codex/rank1-14-intents` in the main checkout, by fast-forward. Unit
   tests must pass on that exact tree: `npm run test:unit` in a worktree at the same commit.
2. **Make a clean deploy tree outside OneDrive.** OneDrive sync locks break builds.

   ```bash
   git -C <main> worktree add --detach C:/Users/hyada/tg-deploy/m<sha> <sha>
   mkdir -p C:/Users/hyada/tg-deploy/m<sha>/track1-miner/miner/.vercel
   cp <main>/track1-miner/miner/.vercel/project.json C:/Users/hyada/tg-deploy/m<sha>/track1-miner/miner/.vercel/
   ```

3. **Deploy a preview first**, from `track1-miner/miner`: `vercel --scope wukong4 --yes`. Find its URL with
   `vercel ls --scope wukong4`.
4. **Probe the preview.** It is behind Vercel auth, so use `vercel curl "<preview>/<route>?..." --scope wukong4`.
   - Probe every changed route and two unchanged ones.
   - Save the output to `C:/Users/hyada/tg-deploy/preview-probes-<sha>.txt`.
5. **Deploy production:** `vercel --prod --scope wukong4 --yes`, then `vercel promote <prod-url> --scope wukong4 --yes`.
   A 409 "already the current production deployment" means the alias moved: good. G70: after a rollback, `--prod`
   alone does not move the alias.
6. **Run the gates.** First `npm ci` in the deploy tree's `track1-miner/miner`; preflight runs `npm test` there.

   ```bash
   node track1-miner/tools/preflight.mjs https://miner-wine.vercel.app
   ```

   - Re-run any failing gate alone before believing it. The badssl live test has flaked once (2026-10-26).
   - **Known baseline, not regressions** (since 2026-10-31, `330f2af`, all 7/7 green):
     - intent answers: six intents are graded as honest `not_licensed` refusals (GAPS G230), not failures;
     - upstream health: the merkle RPC answering 429 is a failover warning only.
   - Anything else failing means fix it, or roll back to the previous production URL with `vercel promote`.
7. **Check the registration:** `node track1-miner/tools/watch.mjs --registration-id 5232 --base-url https://miner-wine.vercel.app --once`.
   `--once` goes last.
8. **Record the release** in `track1-miner/docs/evidence/release-<date>-<topic>/README.md`:
   - the build commit;
   - preview and production URLs and deployment ids;
   - the rollback target;
   - a gate table with notes;
   - copies of `preflight.txt` and `watch.txt`.

   Then update MEMORY.md's top block and commit in a worktree, fast-forwarding the main branch. Not pushed.

## Traps already hit

- **New intents need correctness checks.** `intent-answers.mjs` fails on any declared intent without a check
  (coverage). Add the checks with the code, not after.
- **Latency is measured on production,** with fresh questions: `tools/latency-targets.mjs <site-intents.json> <out>
  <base> <questions.json>`. A repeated question is answered from cache.
- **Files go through the Write tool,** never heredoc patch scripts: heredocs eat backslashes, and Write turns
  `\u2028` into a raw line separator. Check with `od -c` when a regex or escape is involved.
