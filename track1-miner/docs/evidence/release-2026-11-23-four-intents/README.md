# Release 2026-11-23: CHAT, EVENT_OUTCOME, WEB_SEARCH, RESEARCH_QUERY (+ G358)

Owner, 2026-11-23: "highly focus on chat completion, event outcome, web general, research query", then "deploy
everything alongside … i want everything to be working".

| | |
|---|---|
| Builds | `4750ad6` (`dpl_3mabDwdeCoq6Eodmc9p1XvZwsGTJ`, `miner-qeqmsqxj7`), then `36e4e13` (`dpl_GZ6oFR8b4ZxgnCVbM5AJS2g2eTt8`, `miner-1by7eu4j6`): **live** |
| Previews | `miner-9q6l0anac` (`4750ad6`), `miner-844oa6k3v` (`36e4e13`) |
| Rollback target | `miner-mqhxx9oil` (`40b698f`), then `miner-pd9clrct7` (`5f28505`) |
| Registration watched | 6126 |

## Standing before (scores per epoch, `/scores?intent=`, read 2026-11-23 ~12:00 UTC)

| Intent | Recent epochs (ours) | Top |
|---|---|---|
| CHAT_COMPLETION_GENERAL | 0.98–1.0, rank 1–4 | about 1.0 |
| EVENT_OUTCOME_RESOLUTION_GENERAL | 0 in 38, 39, 41, 42 | 0.99 (a1-preflight) |
| WEB_SEARCH_GENERAL | 0.05 (39), 0.98 (41), 0.05 (42) | 0.99 |
| RESEARCH_QUERY_GENERAL | 0 (39, 41, 43), 0.5 (42) | 0.98–1.0 |

The scored inputs are not known (values unlogged, capture off). The faults below were found by probing
production (`prod-probes-before.txt`, `probe4.js`). They are candidate causes, not established ones.

## What production did, and what changed

| Route | Before | After (`prod-probes-after.txt`) |
|---|---|---|
| `/research` | Europe PMC 6.5 s > 6 s timeout: brief "Neither the trial registry nor the literature index answered." Answer led with a Phase 1 trial title | outage gets a knowledge brief, labelled in `brief_basis` and the answer; answer leads with the direct sentence |
| `/web-search` | "capital of Australia": a coffee story; "Pectra upgrade date": "being discussed"; brief cut at "(the" | "Canberra is the capital of Australia."; parentheses dropped before cutting; brief written from what was found, else labelled knowledge; today's date in the prompt; never replaces a headline answer to a current question |
| `/event-outcome` | 2024 UCL final settled against a 2024-25 Round of 16 market; "Federal Reserve" matched no market (recall said 25 bp) | stage words must match; Federal Reserve/FOMC read as Fed: settles on the 50+ bps market |
| `/chat` | brief "Answer: …"; Mars question briefed "Uncertain." alone | label dropped; verdict word followed by its reason |
| `/extract` (G358) | "job title: Senior Data" | ";" and "name:value" tried before any value is cut |

Commits: `656ccd8`, `df5e44c`, `fdc332b`, `4750ad6`, `36e4e13`.

## Gates for `36e4e13`

| Gate | Result | Note |
|---|---|---|
| Unit | 1087/1087 | session worktree, same code |
| Preflight | 6/7, then 7/7 | intent answers failed on ONCHAIN_METRIC because `eth.blockscout.com/api/v2/blocks/21000000` answered 500 (checked directly; no on-chain file changed). Re-run alone at 12:45 UTC once Blockscout answered 200: 44/44 (`intent-answers-rerun.txt`) |
| Watch | endpoint ok 376 ms, active | `watch.txt` |
| Model rate limits | 0 `LLM … HTTP` lines, 12:35–12:45 UTC | `vercel logs` |

## Still wrong after the release

- **Pectra:** the brief now says the date "has not been reported yet". Pectra went live in 2025; the model doesn't
  know it, and the headlines don't state it. A real web search would be needed.
- **Fed news:** "latest news on the Federal Reserve interest rate decision" is briefed "The Federal Reserve has
  released its interest rate decision.", which is vague.
- **Research latency:** 7 s when Europe PMC is slow (leaders: 2–6 s).
- **Event zeros:** a1-preflight encodes an open market as we do (`unresolved`, `null`), so encoding is not the cause.
  The cause is still unknown.
- **Scores:** unmeasured. Read these four intents in the next two epochs.
