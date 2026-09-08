# Why livecert is not rank 1 in every intent — and what was done about it

Written 2026-09-08 ~10:00 UTC, the first day of Winner Selection (Sep 8–18). Every number here is
either read live from the node today, taken from `score-history.jsonl` (the CI record of every epoch
since 284), or reproduced from the GAPS entry it cites. Nothing is remembered.

## 1. The short answer

Rank 1 in all thirteen intents is not reachable by any miner on this network, and no miner holds it.
Each intent is scored once per nine-hour epoch on one hidden question by a champion WASM that is a
cliff: ~0.99 when the node's ~32-word conversion of the answer resembles the epoch's ground truth,
~1e-9 to 1e-11 when it does not. Rank inside an epoch is therefore decided by one question we cannot
see (the feed stopped publishing questions and ground truths on 2026-08-30, GAPS G24), and it falls
into one of three regimes:

- **Saturated** (SSL, IP, WALLET): three to five miners all cross the cliff within 0.3% of each other,
  and rank is whichever converted prose happens to echo that epoch's wording. Our judged ratio there is
  ≥ 0.997 whatever the rank.
- **Noise band** (TRANSLATION, AI_TEXT, ACADEMIC, NEWS, WEATHER_FORECAST): nobody crosses, everyone is
  at 1e-10–0.01, and rank is a lexical tie-break on an unseen question. ACADEMIC has never crossed in
  30 epochs (G42). Every wording sweep this project ran in these bands lost or was contradicted live
  (G40, G62).
- **Cliff lottery** (STORM, WEATHER_CHECK, FACT_CHECK, TELEGRAPH_KNOWLEDGE, CONTENT_EXTRACTION): some
  epochs one miner crosses at 0.99 and the rest sit at ~0. Which answer flavour crosses is decided by
  the question. We crossed STORM in 312, WEATHER_CHECK in 309 and 315, FACT_CHECK in 308 and 312,
  TELEGRAPH_KNOWLEDGE in 309, CONTENT in 310/311/313/314; rivals crossed the others.

The one lever with a known sign is the fourth regime, **coverage and correctness defects we own**: a
refusal or a wrong extraction scores ~0 with certainty, an answer at least can cross. Six of those
were found, fixed, tested and deployed today (§5). They cannot be measured against ground truths, so
the honest expectation is fewer certain zeros, not a predicted rank change.

## 2. What is judged, and where we stand today

The rules page says "75 points — Normalized Performance = your average Canonical Score ÷ the highest
average score in your intent" and "Top 3 Miners with the highest **total** normalized scores across all
intents"; the organizer said on 2026-08-29 that cross-intent aggregation is an **average whose exact
formula is TBD** (docs/JUDGING.md, GAPS G59, G61). Which epochs are included is unpublished. Both
readings are shown below, computed from `/api/miners` at epoch 315 (scored 2026-09-08 04:45 UTC) over
all 341 scored miners, with each intent normalized by its epoch leader.

| by SUM of normalized ratios | intents | sum | avg | rank-1s |
|---|---|---|---|---|
| chainsight-oracle | 14 | 11.23 | 0.80 | 4 |
| txlens | 14 | 10.74 | 0.77 | 3 |
| **livecert** | **13** | **10.30** | **0.79** | **2** |
| preflight-ssl-verification | 10 | 7.89 | 0.79 | 3 |
| kriterion-pramagraph | 10 | 3.97 | 0.40 | 0 |

By **average** among miners with three or more intents, livecert is 6th: single-purpose miners such
as groq-llama31-instant-miner (3 intents, 1.00) and litellm (3, 0.98) sit above every wide miner, and
chainsight-oracle (0.80) is one place above us. The two rivals ahead of us on the sum are ahead by
breadth, not by ratio: both declare 14 intents to our 13. Adding a fourteenth needs an `updateMiner`,
which mints a new registration id and would orphan the submitted one; it was not done.

Epochs 298 and 308 were recorded in MEMORY.md as livecert first by sum (10.13 and 10.59); those were
computed by the sessions of the day and are not re-verifiable from the history file, which stores only
our scores and each intent's leader. Today's third place is measured.

## 3. The scoreboard

Epoch 315, our row against the leader (score, not ratio):

| intent | our rank | ours | leader | leader score | note |
|---|---|---|---|---|---|
| SSL_VERIFICATION | 4 | 0.99277 | preflight | 0.99460 | 4 miners within 0.2% |
| STORM_ALERT | 4 | 0.00793 | chainsight | 0.00851 | 7 miners, nobody crossed |
| WEATHER_FORECAST | 11 | 0.00035 | onlookout | 0.00053 | 14 miners, all sub-cliff |
| IP_GEOLOCATION | 5 | 0.99553 | txlens | 0.99825 | 5 miners within 0.3% |
| LANGUAGE_TRANSLATION | 1 | 2.9e-10 | livecert | — | three rivals at 0 |
| ACADEMIC_SEARCH | 2 | 0.01091 | scholarwire | 0.01114 | never crossed by anyone |
| AI_TEXT_DETECTION | 2 | 2.16e-10 | caliber | 2.81e-10 | noise band |
| CONTENT_EXTRACTION | 2 | 0 | netwire | 0 | whole field 0 this epoch |
| NEWS_HEADLINES | 2 | 0.00699 | newswire | 0.00750 | noise band |
| WALLET_BALANCE_CHECK | 3 | 0.9999993 | agentfeed | 0.9999998 | saturated |
| WEATHER_CHECK | 1 | 0.99931 | livecert | — | crossed; rivals at 0.0157 |
| FACT_CHECK | 2 | 3.568e-9 | qarinah | 3.582e-9 | noise band, 0.4% apart |
| TELEGRAPH_KNOWLEDGE | 2 | 1.4e-11 | telegraph-chatbot | 3.6e-10 | both sub-cliff |

The last eight epochs (rank, then ratio = ours ÷ leader; 0 when the leader is also 0):

```
intent                 308      309      310      311      312      313      314      315
SSL_VERIFICATION      #1 1.00  #1 1.00  #3 .999  #4 .009  #2 .968  #2 .010  #3 .897  #4 .998
STORM_ALERT           #1 1.00  #3 .069  #3 .901  #1 1.00  #1 1.00  #5 .008  #4 .009  #4 .931
WEATHER_FORECAST      #4 .914  #2 .987  #1 1.00  #1 1.00  #1 1.00  #1 1.00  #8 .840  #11 .661
IP_GEOLOCATION        #3 .996  #2 1.00  #1 1.00  #1 1.00  #1 1.00  #1 1.00  #3 .999  #5 .997
LANGUAGE_TRANSLATION  #1 1.00  #1 1.00  #1 1.00  #4 .531  #3 .513  #4 .531  #1 1.00  #1 1.00
ACADEMIC_SEARCH       #3 .956  #3 .958  #2 .984  #2 .724  #2 .876  #1 1.00  #1 1.00  #2 .980
AI_TEXT_DETECTION     #1 1.00  #3 .778  #2 .946  #2 .884  #2 .840  #2 .884  #2 .884  #2 .768
CONTENT_EXTRACTION    #3 0     #2 0     #1 1.00  #1 1.00  #3 0     #1 1.00  #1 1.00  #2 0
NEWS_HEADLINES        #1 1.00  #1 1.00  #1 1.00  #1 1.00  #1 1.00  #1 1.00  #1 1.00  #2 .933
WALLET_BALANCE_CHECK  #7 .680  #7 .857  #7 0     #5 0     #4 1.00  #3 1.00  #3 1.00  #3 1.00
WEATHER_CHECK         #4 .991  #1 1.00  #7 .100  #4 .975  #5 .050  #8 .747  #5 .057  #1 1.00
FACT_CHECK            #1 1.00  #2 .648  #2 0     #2 0     #1 1.00  #3 .966  #3 .959  #2 .996
TELEGRAPH_KNOWLEDGE   #2 .054  #1 1.00  #1 1.00  #1 1.00  #2 .031  #2 0     #2 0     #2 .039
sum                   10.59    10.30    9.93     9.12     9.28     9.15     9.65     10.30
rank-1 count          6        5        6        6        5        5        4        2
```

The sum is flat while the rank-1 count fell from six to two. That is the saturated intents changing
hands at the third decimal (SSL, IP, WALLET) and the noise bands reshuffling — not a regression in
what the miner answers. Note that this table averages per-epoch ratios, which is not the published
ratio-of-averages; on cliff distributions the two can differ.

## 4. Why, intent by intent

**Structural, no honest lever (nine intents).**

- *SSL* — four answers above the cliff within 0.2%. The two 0.01 epochs (311, 313) are the
  unreachable-host ground truth rotating between a "tutorial" flavour and a "cannot analyze" flavour;
  G54 and G62 measured the two as mutually exclusive at every prefix length. Ceiling reached.
- *IP* — five answers above the cliff within 0.3%; a service-versus-operator wording sweep and a
  restatement variant both measured as losses (G41, G54). Ceiling reached.
- *WALLET* — three answers at 0.99999x; the champion has rotated six times and our answers beat the
  best recorded answer on 13 of 16 real questions under the current one (G72).
- *ACADEMIC* — 0.0109 vs 0.0111; nobody has ever crossed in this intent; ten shape variants lost (G40,
  G42). The papers are past the converter's budget; the restatement is what scores.
- *WEATHER_FORECAST* — fourteen miners between 0.0003 and 0.0005; four of five failing ground truths
  are literal "I can't provide" refusals, which we will not imitate (G55, Rule 04).
- *TRANSLATION*, *AI_TEXT*, *NEWS*, *FACT_CHECK* — sub-cliff bands where ordering is a lexical
  tie-break on a hidden question; no ground truths exist to measure a change against, and every
  unmeasured wording change this project shipped was contradicted live at least once (G62).

**Lottery on the question, with one measured cause each (three intents).**

- *STORM* — crossed once in eight epochs (312) after the lean payload shipped on 2026-09-05 (G75) and
  the UTC-offset fix on 2026-09-06 (G76). Rivals crossed 313 and 314. No refusal remains: 178 of 209
  routed questions answer and every refusal is a correct one (MEMORY 2026-09-05).
- *WEATHER_CHECK* — #1 at 0.9993 this epoch on the current 24-hour behaviour. The open suggestion to
  answer "current weather" questions with a one-hour window (G63-P1) was declined today for exactly
  that reason: it would trade a measured crossing for an unmeasured one on a shared endpoint.
- *TELEGRAPH_KNOWLEDGE* — 1.0 when the fixture question is inside our fact table, ~1e-11 when it is
  not. 97% of the questions the Daemon routes here are open-domain ("Will Vance call for war with
  Iran?") and stay refused on purpose; there is no LLM behind this miner and inventing answers is the
  failure it refuses everywhere (G71). Coverage of on-topic questions was widened today (§5).

**CONTENT_EXTRACTION** deserves its own line: the scorer is binary and in four of eight epochs the
whole field scored 0, so the fixture asks something no miner handles. The two shapes we knew we
mishandled (G69) are fixed today; whether they are the fixture's shapes cannot be known from outside.

## 5. What was fixed today

All six were reproduced on production before the change, are pinned by tests (208 unit tests, from
199), and were deployed after a preview probe of all twelve endpoints. Manifest untouched, so
registration 402 and its hash are unchanged and no `updateMiner` was needed.

| # | defect | before (production, 2026-09-08 08:30 UTC) | after |
|---|---|---|---|
| G69 | `/extract` day-month-year dates | "12 March 2026 … 30 April 2026" → "March 20, April 20" | "March 12, 2026, April 30, 2026" |
| G69 | `/extract` payload with its own colon | "Contact sales@acme.com or call 415-555-0100. Docs: …" → only the URL | email, phone and URL |
| new | `/extract` bare area codes | "415-555-0100" → "555-0100" | whole number; "dates" (plural) now a date request |
| G68 | `/headlines` subject outside the 13-word list | "semiconductors" → MLB scores and a hospital shooting | the declared `topic` verbatim, else the phrase after about/on |
| G77 | `/fact-check` article choice | "10% of their brains" → *Flight of the Navigator*; "boils at 100 degrees Celsius" → *Anders Celsius* | stemmed and numeric overlap picks the myth and boiling-point articles |
| G71 | `/telegraph` coverage | direct calls, MCP server, WebSocket, x402 verification, reference apps, validators, docs all unserved | seven entries from docs/TELEGRAPH_FACTS.md, guarded by a Telegraph-context test so off-topic questions stay refused |
| G78 | `preflight.mjs` on a protected preview | graded Vercel's login page, reported 2/7 | refuses with the reason; proven against a real protected preview |

The Telegraph-knowledge change was checked for route theft by running the committed table and the
new one over 96 questions: nothing moved off a specific existing entry, 13 questions moved from the
generic catch-all to a subject-specific answer, one refusal became an answer, and all 22 off-topic
questions stayed refused. Those 96 routes are now a test.

Honest expectation: NEWS is #1 in seven of eight epochs and FACT_CHECK is 0.4% off the lead in a
1e-9 band, so those two fixes are for real callers rather than for rank. CONTENT and TELEGRAPH are
where a refusal-to-answer flip can move a 0 to a 1.0 — if the fixture asks what we fixed.

Deployment: preview `miner-ghztjnbfp` probed through `vercel curl` on all twelve endpoints and the
fixed shapes, then production `miner-o50wpiyof` (the alias moved on its own; `promote` reported it
already current). Preflight against production ran 6/7 on the first pass — the single miss was the
untouched `/papers` route returning zero papers while OpenAlex shed load after the live suite (the
G34/G43 pattern) — and the failing gate re-run alone passed every check with five papers and a
341 ms median. Registration 402 `active`, hash unchanged. Rollback `miner-3d806mm3e` was held and
not needed. Full record: GAPS G79.

## 6. Considered and deliberately not changed

- **WEATHER_CHECK current-conditions window (G63-P1)** — declined, see §4.
- **Lean payloads for NEWS, CONTENT, AI_TEXT, FACT_CHECK, TELEGRAPH_KNOWLEDGE** — the projection that
  measured +26% to +360% on five other intents (G56, G75) has a favourable prior here, but no
  ground-truth bench exists for these six intents, three of them are #1 or at 1.0, and an unmeasured
  shape change on a scored surface is the pattern G62 records being wrong. Recorded, not shipped.
- **A fourteenth intent** — the only thing that would close the sum gap to the two miners ahead; it
  needs a new registration and would orphan the submitted id.
- **Answering open-domain TELEGRAPH_KNOWLEDGE questions** — would need an LLM; refused on honesty.
- **Wording changes in SSL, IP, STORM, ACADEMIC, WALLET** — each has a measured ceiling entry.
- **Logging question values in production** — `LOG_QUERY` records parameter names only, by design.
  Logging values for one epoch would show which fixture questions score 0, but it changes a stated
  privacy property and is the operator's decision (TASKS TA.8), not this session's.

## 7. Only the operator can do these

1. Post the X series (docs/X_POSTS.md) — 25% of the Track 1 score, still unposted as far as this repo
   knows.
2. Vercel project settings → Deployment Protection: turning Vercel Authentication off for preview
   deployments would let `preflight.mjs` grade a preview directly; today previews are probed through
   `vercel curl` and the gates run against production with a rollback held.
3. Delete the retired CertWatch Vercel project (G64) and decide on the public rival-copy repo (G65).

## 8. Removed today

`payers.mjs` (root scratch), `docs/CODEX_REVIEW_PROMPT.md`, `track1-miner/REGISTRATION_UPDATE.md`,
`track1-miner/docs/ADD_THREE_INTENTS.md`, `tools/pretune-intents.mjs`, `tools/bench-champion.mjs`,
`tools/ssl_bench.json` (byte-identical to `bench/ssl_bench.json`), and twelve one-off bench sweeps
whose conclusions are in GAPS and whose candidate wordings no longer exist. The dated epoch reports
and audits stay where they are; git history keeps everything. Nothing under `track2/` was touched.

## 9. Sources and reproduction

- `track1-miner/docs/score-history.jsonl` — every epoch since 284, our scores and each leader.
- `https://devnode.telegraphprotocol.com/api/miners` — per-miner scores for the latest epoch; the
  §2 table is `sum(score / leader)` per miner over that epoch.
- `https://explorer.telegraphprotocol.com/api/scores?intent=X` — the §3 leaderboards.
- `tools/replay-intents.mjs` — replays the questions the network routes and reports refusals.
- GAPS G40–G78 for every measurement cited; G79 for today's deployment record.
