# CLAUDE.md — Telegraph miner operating rules

**Goal (Season II, 1 Nov – 1 Dec 2026):** a Telegraph miner whose answers are correct, sourced and
licensed for paid use, so apps buying through Telegraph get the best answer for each intent we serve.
Season II apps must route through Telegraph, which sends each request to the highest-ranked miner for
its intent — measured quality is how demand arrives. Rules: [RULES_SEASON2.md](RULES_SEASON2.md); the
Miner and Evaluator rubrics were published by 2026-10-22, and the two official pages disagree on the final
deadline (1 Dec or Dec 20, G203). Resolve every deadline in UTC with `date -u`.

**Season I is over and judged.** Track 2's WASM scorer is in [track2/](track2/CLAUDE.md); Track 3's app,
Morse, is the separate repo `../telegraph-morse`. **Not this project:** the Midnight / NightSeal hackathon.

## Docs — read at session start, keep current

- [MEMORY.md](MEMORY.md) — session continuity. **Read FIRST**, update at session end.
- [WINNING.md](WINNING.md) — **the goal file**: how we win the Miner and Evaluator tracks, against the
  published rubric. Every plan and review answers to it.
- [track1-miner/docs/SEASON2_PLAN.md](track1-miner/docs/SEASON2_PLAN.md) — Season II goal, portfolio, next actions.
- [ARCHITECTURE.md](ARCHITECTURE.md) — decisions A1–A10. Conform, or update it before deviating.
- [TASKS.md](TASKS.md) — execution board. One task = one change = one commit.
- [GAPS.md](GAPS.md) — honesty ledger. Feeds the README's Assumptions & Limitations.
- [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) — verified protocol facts, with sources+dates.
- X posts: one useful progress update per active week, tagging Telegraph (WINNING.md §8). The Season II
  rules encourage it but do not score it.

## Hard rules

1. **Claude never touches the wallet.** No connecting, no signing, no sending transactions, no
   entering credentials or seed phrases. Claude prepares and validates; the **user** clicks.
2. **Never commit secrets.** No API key, seed, or private key in any tracked file — including the
   miner YAML, which is public, pinned to IPFS, and hashed on-chain. `.env` is gitignored from the
   first commit.
3. **Sandbox-validate before every on-chain send.** No `registerMiner` / `updateMiner` without a
   clean run at `integrate.telegraphprotocol.com` first. Registration is effectively immutable and
   a rejection releases the slug to anyone.
4. **Verify protocol facts against live docs**, never memory — https://docs.telegraphprotocol.com.
   The canonical intent set changes on-chain. Record what was checked, and when, in
   docs/TELEGRAPH_FACTS.md.
5. **Look up registrations by `registrationId`, never by slug.** By-slug returns whoever currently
   serves that slug, which may not be us.
6. **Commit messages describe the change and nothing else** — no attribution or generated-by lines
   of any kind.

## Useful commands

```bash
# per-intent miner counts — the input to the intent decision
curl https://devnode.telegraphprotocol.com/engine/v1/intents

# current miner catalog — check a numeric id is unused before claiming it
curl https://devnode.telegraphprotocol.com/api/miners

# our registration's health
curl -s https://devnode.telegraphprotocol.com/api/miners/<registrationId> \
  | jq '.miner | {activation_status, rejection_reason, retrying}'

# canonical-intent check — one bad string reverts the whole registration
cast call "$DIAMOND" "isCanonicalIntent(string)(bool)" "WEATHER_CHECK" --rpc-url "$RPC"
cast call "$DIAMOND" "getCanonicalIntents()(string[])" --rpc-url "$RPC"

# Deploy the miner. NOT `git push` — that deploys nothing (G22).
# Read GAPS G70 first: a redeploy 404'd every endpoint on 2026-09-04, and after a
# `vercel rollback` production is PINNED — `--prod` alone does not move the alias.
cd track1-miner/miner && npx vercel --scope wukong4 --yes            # preview first, always
npx vercel curl "<preview-url>/ssl-check?query=github.com" --scope wukong4
npx vercel --prod --scope wukong4 --yes && npx vercel promote <url> --scope wukong4
node ../tools/preflight.mjs                                          # 7/7 or roll back

# YAML hash for registration — SHA-256, NOT keccak256.
# PowerShell is the default shell here and has no sha256sum:
#   (Get-FileHash track1-miner/miner.yaml -Algorithm SHA256).Hash.ToLower()
sha256sum track1-miner/miner.yaml | awk '{print "0x"$1}'   # Git Bash only
```

## Standing orders

1. Session start: read MEMORY.md → ARCHITECTURE.md → top unchecked TASKS.md item.
2. Prefer deletion to addition. Boring, explicit code. Files under ~300 lines.
3. Anything unverified goes in GAPS.md rather than being rounded off to "fine."
4. Session end: update MEMORY.md, GAPS.md, TASKS.md; commit.
