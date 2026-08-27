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

### 5. Four theories, four wrong

> Things I believed about @Telegraphprotoc scoring that measurement killed:
>
> · terse answers beat verbose ones — wrong
> · `label_field` drives the score — wrong, rank 1 maps it to a constant "ok"
> · there's a response size limit — wrong, one miner converts 52KB fine
> · a hand-written test candidate is a valid measurement — wrong, it leaks the ground truth
>
> Every real gain came from answering more of what was actually asked.

### 6. Epochs are 9 hours, not minutes

> The @Telegraphprotoc epoch ticker counts down in minutes, so I assumed fast feedback.
>
> Epochs are 9 hours. Scoring lands ~3x a day. Across the whole Track 1 window that's roughly 40
> scoring opportunities, and any `updateMiner` costs you a chunk of the remaining ones.
>
> Build your feedback loop offline. Don't poll the leaderboard.

---

## After the schema update lands

### 7. Result post

> Updated my @Telegraphprotoc miner's `input_schema` to declare `q`, `lat` and `lon`.
>
> Before: coordinate questions arrived with an empty location, dated questions lost "starting next
> Monday".
> After: <the actual numbers>
>
> The parser was never the problem. The declaration was.

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
