# TASKS.md — execution board

Season II: 1 Nov – 1 Dec 2026 (`RULES_SEASON2.md`). Goal: miners whose answers are correct, sourced and
licensed for paid use. Season I's board (149 done items, all Season I epoch and rank targets) was cut on
2026-10-17: `git log -p -- TASKS.md`. One task = one change = one commit.

## Owner

- [ ] Register for Season II with `harsh.2024a@vitstudent.ac.in` before 1 Nov.
- [ ] Decide the data licences (GAPS G189): MET Norway for weather and storm, GDELT for news, drop or pay for
      STOCK_PRICE, Nominatim for reverse geocoding, Groq for translation.
- [ ] Allow `vercel` for Bash in Claude Code settings, or run deploys yourself.
- [ ] Optional: Vercel → Deployment Protection off for previews, so `preflight.mjs` can grade a preview.
- [ ] Optional: `vercel env add OPENALEX_MAILTO production --scope wukong4` (G81's remedy).

## Claude

- [ ] Deploy the 36-intent build (`updateMiner` is mined): clean worktree at HEAD, preview, `--prod`,
      `vercel promote` if pinned, then `preflight.mjs` and `intent-answers.mjs`. Record the new registrationId.
- [ ] Correctness audit of every intent against real routed questions and the primary source; fix or remove
      any intent that cannot be answered correctly.
- [ ] After the licence decision: swap the sources. met.no has no gusts or precipitation probability, so say
      what the forecast no longer carries.
- [ ] SENTIMENT: sarcastic praise reads negative (G139).
- [ ] RESEARCH_QUERY / RESEARCH_SYNTHESIS: route by domain instead of one academic index.
- [ ] Re-read the Season II Miner rules when published; update `RULES_SEASON2.md` and SEASON2_PLAN.
