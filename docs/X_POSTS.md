# X_POSTS.md — drafts

**25% of the Track 1 score.** Tag `@Telegraphprotoc`. Judged on *"quality, consistency, reach, and
meaningful engagement"*.

The first attempt got ~11 impressions. That is what a cold account looks like, not a content
problem. Two things change it: **post findings other builders need**, and **reply on posts that
already have an audience** — Telegraph's own, and other entrants' — rather than broadcasting.

Everything below is measured and true. Do not post a number that has not happened.

---

## Ready now — each one is a real gotcha

### 1. The engine only sends parameters you declare

> Spent a day building natural-language parsing for my @Telegraphprotoc miner. Coordinates, dates,
> unit thresholds. None of it ran.
>
> The engine fills the params you declare in `input_schema` and drops the rest of the question.
> Declare `location` only, and a question naming latitude/longitude arrives as an empty string.
>
> Rank 1 in weather declares `q`. Rank 1 in storm declares `lat`/`lon`. Check what the leaders
> declare before you build a parser.

### 2. Returning 4xx scores you zero

> A @Telegraphprotoc miner returning HTTP 400 gets a guaranteed 0 for that question.
>
> The engine records `upstream error`, stores an empty answer, and the scorer never sees the body —
> however well-shaped your error JSON is.
>
> Mine 400'd on a param the engine sent as an empty string. Scored 0. Now every unanswerable
> request returns 200 with an honest "could not determine".

### 3. You can run the real scorer offline

> You don't have to guess how @Telegraphprotoc scores you.
>
> `/api/wasm` lists each intent's champion scorer as a commit-pinned WASM. `/scores` gives you real
> questions, ground truths, and the exact converted answer that was scored.
>
> Download both, run them locally, and you get an answer in seconds instead of waiting 9 hours for
> the next epoch.

### 4. Echo the identifiers the question used

> Measured on @Telegraphprotoc: a question asked about "latitude 37.7749, longitude -122.4194".
>
> My miner reverse-geocoded it and answered "San Francisco". Score 0.0068.
> Answering "latitude 37.7749, longitude -122.4194 near San Francisco" — same data — scored 0.0135.
>
> Resolving an identifier is not the same as answering about it. 2x for one clause.

### 5. Five theories, five wrong

> Things I believed about @Telegraphprotoc scoring that measurement killed:
>
> · terse answers beat verbose ones — wrong
> · `label_field` drives the score — wrong, rank 1 maps it to a constant "ok"
> · there's a response size limit — wrong, one miner converts 52KB fine
> · a hand-written test candidate is a valid measurement — wrong, it leaks the ground truth
> · declaring `q` in your schema gets you the question text — wrong, weather still arrives as
>   `location` + `days` and nothing else
>
> Every real gain came from answering more of what was actually asked.

### 6. Epochs are 9 hours, not minutes

> The @Telegraphprotoc epoch ticker counts down in minutes, so I assumed fast feedback.
>
> Epochs are 9 hours. Scoring lands ~3x a day, and only a handful of epochs remain before the
> Aug 31 close — any `updateMiner` costs you a chunk of them.
>
> Build your feedback loop offline: the champion scorer WASMs are public and reproduce reported
> scores exactly. Seconds per iteration instead of 9 hours. Don't poll the leaderboard.

---

## Milestone + eligibility — post these now, a day apart

### 7. Result post — rank 1 in three intents

> Two days of measuring instead of guessing, and my @Telegraphprotoc miner livecert went from
> #3 / #3 / #7 in its first scored epoch to **#1 in three intents**: IP_GEOLOCATION (0.992),
> SSL_VERIFICATION, STORM_ALERT.
>
> No model, no API keys. A live TLS handshake, one weather API, and one rule that survived every
> measurement: answer every clause the question asks, in the question's own terms.
>
> The two big unlocks: declare your input params (the engine drops everything you don't), and
> never return a 4xx — an error body scores a literal zero.

### 8. The recruitment post — eligibility work, not marketing

> My @Telegraphprotoc miner is #1 in IP_GEOLOCATION at 0.992 — and it might be worth exactly $0.
>
> Prize eligibility needs ≥3 active miners per intent. IP_GEOLOCATION has 2.
>
> So, genuinely: if you're still picking a Track 1 intent, there's an open podium slot here, and
> your registration alone makes the intent payable for both of us. Come compete with me.
>
> Track 3 builders — same math: an intent also needs 100+ real requests from applications before
> anyone gets paid. Geolocation, SSL checks and storm alerts are live and answering.

---

## How to actually get reach

- **Reply, don't broadcast.** Replies on `@Telegraphprotoc`'s posts and on other entrants' posts
  reach an existing audience. A standalone post from a new account reaches nobody.
- **Answer questions in the hackathon Discord**, then post the answer. People who were helped engage.
- **One post per finding, spaced out.** Consistency is named in the criteria; six posts in an hour
  reads as a dump.
- **Reply to everyone who responds.** "Meaningful engagement" is in the rules.

## Rules

- Verified claims only. Every number above came from a measurement in this repo.
- Never post a key, seed, or `.env` contents. Crop screenshots.
- Tag `@Telegraphprotoc` every time — required for judging.
