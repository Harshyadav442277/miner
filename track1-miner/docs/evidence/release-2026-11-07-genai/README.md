# Release 2026-11-07 ~19:15 UTC (Nov 8 00:45 IST): CHAT_COMPLETION, CODE_REVIEW, TEXT_GENERATION — `8b6e4d3`

The owner said "Yes, deploy it" for `4d7a6db`, after I had said I would test the new routes live and fix what the test
found. `8b6e4d3` is that fix: one file, `src/genai.ts`, behind routes no registration routes to yet.

| | |
|---|---|
| Build commits | `4d7a6db` (the three routes plus three rounds of security-review fixes), then `8b6e4d3` (the chat brief). Branch `claude/n1-v2-ids` |
| Previous production | `fa4f954`, `miner-56hisxeau` |
| Previews | `4d7a6db`: `miner-atk1ytn9x` (`dpl_wRtHku7yHdJ9EGzo6rELS1vMdtsL`). `8b6e4d3`: `miner-btl062gj4`. Previews have no `GROQ_API_KEY` (it is Sensitive and Production-only), so the model routes answered `unknown`, as they should |
| Production | `4d7a6db`: `miner-kd999g9lg` (`dpl_BowQHs1QVXzmovRYV18E2w4qE1VS`). Then `8b6e4d3`: **`https://miner-l6uql9dui-wukong4.vercel.app`** (`dpl_HZoxe8XB3iU2m1tWkXu1wGNejeHZ`). Each `promote` answered 409 "already current", and `vercel inspect` confirmed the alias |
| Rollback target | `https://miner-56hisxeau-wukong4.vercel.app` (`dpl_HqN2jr1ddD8frUMXi1esvTtxpA1e`, `fa4f954`) |
| Unit | 923/923 |

## The model routes on production (`prod-probes-*.txt`)

| Route | Question | Answer | Time |
|---|---|---|---|
| /chat | capital of Australia | brief "Canberra"; reply names it | 1.0 s |
| /chat | humans on Mars before 2030? | verdict `Uncertain`; "as of 2024, NASA and SpaceX target the 2030s…" | 1.1 s |
| /chat | explain recursion | brief "Recursion is when a problem solves itself by breaking into smaller copies." (74 characters) | 1.4 s |
| /code-review | planted SQL injection and off-by-one | `Request changes`; critical SQL injection at line 2 and high off-by-one at line 4, each with a fix | 1.0 s |
| /generate | 60-word charger description, mention waterproof | 60 words, includes "waterproof", no preamble | 1.6 s |

Found on `4d7a6db` and fixed in `8b6e4d3`:
- A chat brief over 80 characters was cut on a dangling word ("… smaller copies of.") and led the answer.
- The model wrote "As of my last update in 2023".

## Gates

| Run | Result |
|---|---|
| `4d7a6db` (`preflight-4d7a6db.txt`) | 7/7 on the first run; intent answers includes the three new checks (42 cases) |
| `8b6e4d3` (`preflight-8b6e4d3.txt`) | 6/7: the live test "the Uniswap V2 router's creation transaction matches Blockscout's" failed with "count null implausible". It failed again alone, then passed 3 of 3. Routescan's address record returned `transactionsCount` 90,717,840 when read directly. `src/routescan.ts` is unchanged by this release, and the test passed 9 minutes earlier. Routescan intermittently omits the count (GAPS G281) |

`watch.txt`: registration 5123 is `active`, 377 ms. `availability.jsonl`: 41 of 41 routes up.

## YAML for the next `updateMiner` (42 intents)

- **URL:** `https://raw.githubusercontent.com/Harshyadav442277/miner/8b6e4d3572fbc020bb46077883746c7e613616bf/track1-miner/miner.yaml`
- **SHA-256:** `0xc6515778bf0c27843f9d223d0b195ec9efa88a0f9f4985fe29bdc9230cdbaaca`. The same from git and from the raw URL.
- **Manifest diff against 5123 (`fc041f4`):** PASS, 39 → 42 intents. All 42 are canonical in `/engine/v1/intents`.

## Limits

- Long model calls spend at most 12K tokens a minute and 300K a day per instance (half the free Groq quota), so
  roughly 80–150 answers a day. Past that, these routes answer `unknown`, and the ranked phrasing intents are not
  affected.
- Ranks: none yet. Not registered until the owner signs.
