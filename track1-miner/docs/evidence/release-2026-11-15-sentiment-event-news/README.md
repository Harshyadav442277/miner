# Release 2026-11-15: sentiment label by the model, event outcome without a market, news-search brief

Owner's brief of 2026-11-15 00:30 UTC (build, commit, push, PR, merge and deploy authorised). Build `69afe87`.

| | |
|---|---|
| Production | `https://miner-9l26rqk6f-wukong4.vercel.app` (`dpl_4pisNXVPK9JYMbhv7fzUx8VSkkjY`), aliased to `miner-wine.vercel.app` (promote answered 409 "already the current production deployment") |
| Earlier deploys this session | preview `miner-k3w8czp3d` (`4324884`); production `miner-oy2mkeyj8` (`4324884`), superseded before any probe by `69afe87` (the security-review fix) |
| Rollback target | `miner-l8m0zwpq7` (`b18ca59`); before it `miner-59jvnyk6w` (`697a41c`) |
| Registration | 5232 `active`, unchanged. No YAML change |
| Env | unchanged. `GROQ_API_KEY` is Production-only, so the preview could probe only the keyless paths |

## Why

Epoch 2093 (source: `https://devnode.telegraphprotocol.com/api/miners`, slug `livecert`):

| Intent | Score | Rank | Best in field |
|---|---|---|---|
| EVENT_OUTCOME_RESOLUTION_GENERAL | 0.0032 | 12 of 35 | chainsight-oracle 0.725 |
| SENTIMENT_ANALYSIS_GENERAL | 0.5446 | 15 of 21 | 0.996 |
| NEWS_SEARCH_GENERAL | 0.7293 | 14 of 19 | 1.000 |

The scored fields (`/engine/v1/intents/<id>`, read 2026-11-15): EVENT_OUTCOME `resolved_yes` (a null scores as
wrong); SENTIMENT `sentiment` (Positive | Negative | Neutral | Mixed, reward model); NEWS_SEARCH `brief` (one plain
sentence of at most 80 characters, reward model). Before this build, production answered:

- event outcome only from a matching Polymarket or Manifold market: all four probes `no_market_found`, `resolved_yes` null;
- sentiment from the word list, plus a 250 ms model call that rarely answered from Vercel;
- the news brief as the top headline with its publisher ("SpaceX Starship Launch (TelegraphHerald.com)").

## What changed

- `prose-phrase.ts` (`1a2b026`): the model chooses the sentiment label. One JSON call (`phrase`, `json: true`,
  300 tokens, 2.5 s), the passage sent as a JSON value with control characters stripped and capped at 2,000
  characters. The label must be exactly one of the four; anything else returns the word-list answer unchanged.
  The word list's words stay in the fields and in the reason ("Word-list evidence: ... (word-list reading: X)").
  Confidence: the lexicon's (at least 0.8) when both agree, 0.7 when they differ.
- `eventoutcome.ts` (`4324884`, hardened in `be493af`): when no market matches, (1) "Did X win Y?" is answered
  Yes or No from Y's recorded winner on Wikidata (`verdict: resolved`, `venue: Wikidata`, confidence 0.8; a
  partial name match is not settled), read beside the market search; (2) otherwise the model is asked, with
  today's date, for yes, no or unresolved (`verdict: recalled`, confidence 0.6, `source` "language model recall
  ..."), never for a year after this one and never for "who won". The reason says the answer is a record or
  model recall, not a settled market. `intent-fields.ts` sets `resolved_yes` and `outcome` for `recalled` too.
- `newssearch.ts` (`4324884`): the model writes `brief` from the top three headlines and their publishers (JSON
  data), one whole sentence of at most 80 characters; over 80 is cut at a clause by `clauseBrief`, an ellipsis or
  fewer than four words is refused, and the mapper then serves the top headline as before.
- `llm.ts`: `parseObject` moved here from `genai.ts` (re-exported there) and `dataValue` added, so `/sentiment`
  does not import `genai.ts`'s Wikidata and endoflife helpers. `sources.ts`: `/event-outcome` adds `groq`;
  `/news-search` adds `endoflife`, `groq`, `wikidata` (the import graph over-counts through `genai.ts`).
- Security review of `4324884` (automated, 2026-11-15) found two issues, both fixed in `be493af` before the
  production build was probed: the handler cached event answers on the first 300 characters while the model read
  600 (now both read `MAX_QUESTION` = 300), and the did-X-win regex ran on unbounded input with an unbounded prefix
  (now capped, one line, bounded groups; a 40,000-character input returns in under 200 ms in the unit test).

## Gates

| Gate | Result |
|---|---|
| Typecheck | `npx tsc --noEmit -p .` clean in the deploy tree at `69afe87` |
| Unit | 1004/1004 in the deploy tree at `69afe87` (989 before; 15 new) |
| Preview probes | `miner-k3w8czp3d` (`4324884`): Super Bowl LIX answered No from Wikidata Q91157899; the others keyless, as before |
| Production probes | `probes-before.txt` (`b18ca59`) and `probes-after.txt` (`69afe87`) |
| Preflight | `preflight.txt` |

## Before and after (production, one request each)

| Probe | Before | After |
|---|---|---|
| Did the Kansas City Chiefs win Super Bowl LIX? | no_market_found, null | resolved No (Wikidata), `resolved_yes` false |
| Did Max Verstappen win the 2024 F1 World Championship? | no_market_found, null | no_market_found, null: Wikidata Q113628886 has no winner claim, and the model answered unresolved |
| Did Oppenheimer win Best Picture at the 2024 Oscars? | no_market_found, null | recalled Yes (model), `resolved_yes` true, confidence 0.6 |
| Will the Fed cut rates at its December 2027 meeting? | no_market_found, null | no_market_found, null; the model is not asked |
| Tesla shares slumped 12% ... | Negative (word list) | Negative (model; word list agrees) |
| The central bank held interest rates at 4.5% ... | Neutral (word list) | Neutral (model) |
| Great camera, but the battery dies ... | Mixed (the old fast call answered) | Mixed (model; word list read negative) |
| News: SpaceX Starship launch | "SpaceX Starship Launch (TelegraphHerald.com)" | "SpaceX Starship landed, caught by launch tower arms." |
| News: Nvidia earnings | "Nvidia CEO's Exit Clouds KOSPI Outlook as Earnings Loom (Seoul Economic Daily)" | "Nvidia earnings are imminent, affecting market outlook and investor sentiment." |

## Not verified

- The score effect: it needs the next epochs (G300).
- Latency: `/sentiment` took 0.63 to 1.13 s and `/news-search` about 1.0 s in these probes, against the site's
  SENTIMENT target of under 300 ms (G301).
- Model recall can be wrong with confidence; the 0.6 and the reason say so, but no measurement of its accuracy on
  real node questions exists (G302).
- What the node actually sends to these routes is unseen (G282).
