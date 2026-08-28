# Telegraph Hackathon — Season I

One repository, three tracks, one shared body of protocol knowledge.

**Deadline:** Track 1 and Track 2 close **2026-08-31**. Track 3 runs Aug 31 – Sep 7.
Miners must stay live and operational through **2026-09-07** — that is a rule, not just scoring.

---

## Who is working where

| Folder | Track | Owner | State |
|---|---|---|---|
| [`track1-miner/`](track1-miner/) | **1 — Miner** | Track 1 agent | **live**, registration 236, 4 intents registered / 9 built |
| [`track2/`](track2/) | **2 — Scoring module** | Track 2 agent | active build |
| [`track3-certwatch/`](track3-certwatch/) | **3 — Application** | Track 1 agent | deployed, not funded |
| [`docs/`](docs/) | shared | everyone | protocol facts, rules, social |

**Do not edit another track's folder.** Everything a track owns lives inside its folder; anything
shared lives in `docs/` at the root.

## The shared documents — read these first, whichever track you are on

| File | Why it matters |
|---|---|
| [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) | Verified protocol mechanics, each with a source and a date. Re-verify before trusting anything older than a few days. |
| [docs/JUDGING.md](docs/JUDGING.md) | **75% performance + 25% X engagement.** The eligibility guardrail. Track dates. |
| [docs/X_POSTS.md](docs/X_POSTS.md) | 25% of every track's score. Drafts, and how to actually get reach. |
| [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) | What has to be true before the deadline. |
| [MEMORY.md](MEMORY.md) | Session continuity. **Read first, update at session end.** |
| [CLAUDE.md](CLAUDE.md) | Operating rules. Wallet safety, secrets, validation-before-send. |

## Facts that apply to every track

- **Epochs are 9 hours.** Scoring lands about three times a day. The landing-page ticker counts down
  in minutes and misleads. Do not poll for a score after deploying — build an offline loop instead.
- **Any non-2xx from a miner scores 0.** The engine records `upstream error`, stores an empty
  answer, and the scorer never sees the body. Return 200 with an honest "could not determine".
- **The engine sends only the parameters a miner declares** in `input_schema`, never the raw
  question, unless you declare `q`/`query`. This cost Track 1 two epochs.
- **The champion scorers are public, commit-pinned WASM.** `/api/wasm` lists them; `/scores` gives
  real questions with ground truths and the exact converted answer that was scored. You can
  reproduce any score offline in seconds.
- **Judging is 75/25.** The X half is the one most likely to be neglected and it is worth a quarter.

## Scoreboard, epoch 288 (2026-08-28)

```
STORM_ALERT         #1 of 5     0.01061   <-- rank 1
IP_GEOLOCATION      #1 of 2     0.00976   <-- rank 1
SSL_VERIFICATION    #1 of 4     0.00935   <-- rank 1
WEATHER_FORECAST    #3 of 11    0.00678   (amanat-weather-risk 0.00989)
```

Rank 1 in three intents for three consecutive epochs (286, 287, 288), from #3/#3/#7 in epoch 284.

Two honest caveats, because rank is not the same as a prize. `IP_GEOLOCATION` has **2 miners and
needs 3** to be prize-eligible, and **no intent has any Track 3 requests** toward the 100-request
floor, because Track 3 has not opened. See
[track1-miner/docs/ELIGIBILITY.md](track1-miner/docs/ELIGIBILITY.md).

Live: https://explorer.telegraphprotocol.com/miners/livecert

## Workflow

1. **Session start** — read `MEMORY.md`, then your track's `MEMORY`/`TASKS`.
2. **Verify protocol facts against live docs, never memory.** The canonical intent set changes
   on-chain. Record what you checked and when.
3. **Measure, do not theorise.** Six scoring theories were tested in this repo and four were wrong.
   Every real gain came from replaying actual paid questions.
4. **Wallet actions are the operator's.** No agent connects a wallet, signs, or sends a transaction.
   Prepare and validate; the human clicks.
5. **Session end** — update `MEMORY.md`, `GAPS.md`, `TASKS.md`; commit.

## Git hygiene in a shared repo

Agents write into this repo concurrently, some of them incrementally in the background.

- **Stage explicit paths. Never `git add -A` or `git commit -a`.** A blanket add captures another
  agent's half-written files — that has already happened once here, sweeping Track 2's in-progress
  planning docs into a Track 1 commit.
- **`fable_review_audit.md` belongs to the read-only audit session.** Leave it unstaged.
- **Fetch before assuming you are behind.** `git fetch` then `git log HEAD..origin/main` shows
  another agent's work without touching your working tree, which matters when someone else has a
  file open mid-write.

## Automation

| Workflow | Cadence | Does |
|---|---|---|
| `ci.yml` | on push | typecheck + tests for track1-miner and track3-certwatch |
| `uptime.yml` | hourly | polls the miner, records each new epoch's scores to `track1-miner/docs/score-history.jsonl` |
| `certwatch.yml` | 6-hourly | CertWatch sweep — inert until `EVM_PRIVATE_KEY` is set |

GitHub throttles scheduled workflows; a `*/10` cron actually ran every 2–3 hours, so these are
hourly and honest about it.
