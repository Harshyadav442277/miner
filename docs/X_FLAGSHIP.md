# X_FLAGSHIP.md — one post to maximise, not a cadence to maintain

Written 2026-08-28. Supersedes the "steady cadence" advice in
[BUILD_IN_PUBLIC.md](BUILD_IN_PUBLIC.md) and [X_POSTS.md](X_POSTS.md) **if** the scoring note in §1
is right.

---

## 1. What changed

From the hackathon Discord, asked directly and answered by `Plex Plural`:

> **Q:** do they measure one single highest engagement post, or the sum of all posts tagging
> @Telegraphprotoc?
> **A:** *"Highest engagement matters."*

Also stated there: engagement is measured by bots/automation, and **your X account must be linked
to your hackathon account** (ours is — confirmed).

**Treat this as strong but unofficial.** It came from a community member in chat, not from the
published rules, which say only *"quality, consistency, reach, and meaningful engagement."* Note
that "consistency" in the official wording pulls the other way — toward a cadence.

**Get it in writing before the 31st.** Ask in the official channel: *"Is the X portion scored on a
single best-performing post or on aggregate engagement across posts?"* A screenshot of an
organizer answering settles how we spend the last three days. Until then, §3 hedges: it costs one
extra post to satisfy both readings.

## 2. The baseline to beat

Current account `@hyadav42774`, 29 posts. Best performers so far:

| Post | Impressions | Likes | Reposts | Replies |
|---|---:|---:|---:|---:|
| "base_url points at the upstream" (Aug 26) | **188** | 8 | 7 | 6 |
| "Subtle line in the docs — Tier A vs Tier B" | 83 | 7 | 6 | — |
| "4th place gets nothing / 70-20-10" (Aug 27) | 71 | 3 | — | — |

**188 impressions is the number to beat.** That is a cold-account number, not a content problem —
the two posts with real reply counts are the two that told builders something that would have cost
them time. That is the format that works. Keep using it.

## 3. What to publish now, and what to hold

We have four genuinely non-obvious findings. They are not equally safe to publish **three days
before the close**, because 75% of the score is performance and some of these are our own edge.

| Finding | Value to others | Helps a rival outscore us? | Publish |
|---|---|---|---|
| `limitations` rate is **node-wide per miner** | Very high — silently throttles everything | No | **Now — flagship** |
| Undeclared miners still get a **600/min backstop** | High — nobody knows this | No | **Now — in the flagship** |
| A 4xx is a guaranteed **0** | High | Barely | **Now** |
| Engine sends **only declared params** | Very high | Somewhat | Now, in the flagship |
| **Run the champion scorer offline** (`/api/wasm` + `/scores`) | Highest of all | **Yes — directly** | **Hold until Sept 1** |

The offline-scorer loop is how we went #3/#3 → #1/#1/#1 in three epochs. It converts a 9-hour
feedback cycle into seconds. Handing that to eleven weather miners on Aug 28 is handing them our
iteration speed during the exact window that decides the performance term. It is also our best
piece of content — so it becomes the flagship for the Track 3 window and the final write-up, on
**Sept 1**, when publishing it costs us nothing.

Everything below is measured and true. Do not post a number that has not happened.

## 4. The flagship — post this one, then push it

A thread. The hook is a near-miss, which travels; the payoff is a rule nobody has read.

> **1/**
> I almost shipped a one-line @Telegraphprotoc config change that would have throttled my entire
> miner to 5 requests per 30 seconds.
>
> Not one endpoint. All of them. Including three I'm currently ranked #1 in.
>
> The docs say why, and I think most multi-intent miners have this wrong 👇

> **2/**
> I added a CVE endpoint. Its upstream (NIST NVD) allows 5 requests per 30s unauthenticated, so I
> declared that honestly in the YAML:
>
> ```yaml
> limitations:
>   - property: rate
>     value_num: 5
>     window_seconds: 30
> ```
>
> Looks like good citizenship. It isn't.

> **3/**
> There is no endpoint scope on a `limitations` entry. The fields are `code`, `message`, `param`,
> `property`, `value_bytes`, `value_num`, `operator`, `window_seconds`.
>
> Note what's missing: anything that says *which endpoint*.
>
> Straight from the YAML config docs:
>
> "Counts are **node-wide per miner**, not per caller: the node holds one upstream account for you,
> so all traffic draws on the same allowance."

> **4/**
> So a quota that belongs to one upstream becomes the ceiling for every intent you serve.
>
> I'd have taken SSL_VERIFICATION, STORM_ALERT and IP_GEOLOCATION — all three of them #1 — down to
> 0.167 requests/second, in the same week I need demand to prove eligibility.
>
> Caught it in review. Dropped the endpoint instead.

> **5/**
> The part nobody seems to know: **declaring nothing doesn't mean unlimited.**
>
> "A miner that declares no rate limit still gets one. The node applies a default backstop of 600
> calls/minute per miner."
>
> Operator-tunable via `MINER_DEFAULT_RATE_PER_MIN`. `0` disables it.

> **6/**
> Two rules I'd give any @Telegraphprotoc miner:
>
> · Declare a rate limit only if you're willing to apply it to your whole miner. Otherwise isolate
>   that upstream in a separate registration.
> · Never return a non-2xx. The engine records `upstream error`, stores an empty answer, and the
>   scorer never reads your body. A 400 is a guaranteed 0 — however well-shaped your error JSON is.

> **7/**
> Third one, which cost me a scored question: **the engine only sends the parameters you declare in
> `input_schema`.** Never the raw question, unless you declare `q` or `query`.
>
> I built coordinate parsing that never ran. A lat/lon question arrived as `location=""` and my
> miner answered "no location provided". Scored 0.0.

> **8/**
> Fixing those took me from #3/#3 to #1 in three intents in three scoring epochs.
>
> Currently #1 in SSL_VERIFICATION, STORM_ALERT and IP_GEOLOCATION as `livecert`.
>
> explorer.telegraphprotocol.com/miners/livecert
>
> Everything above is reproducible from the public feeds. Ask me anything — I'll answer.

**Post-time checklist**

- Tag `@Telegraphprotoc` in tweet 1 (it is what makes it countable) and once more in the last.
- Verify the explorer link renders before posting.
- No hashtag spam. `#hackathon #tech #trending` on the Aug 27 post did not help it — 71 impressions
  was the worst of the three.
- Do **not** claim IP_GEOLOCATION is prize-eligible. It has 2 miners and needs 3. If someone asks,
  say so plainly — that honesty is itself a recruiting pitch for
  [ELIGIBILITY.md](../track1-miner/docs/ELIGIBILITY.md).

## 5. Amplification — where the impressions actually come from

A cold account posting into its own timeline gets ~80 impressions. The three levers that change
that, in order of effect:

1. **Reply under Telegraph's own posts** with the finding, then link the thread. Their audience is
   the audience. One useful reply under a busy post beats five original posts.
2. **Reply to other entrants' miner posts** where the finding applies — anyone showing a
   multi-intent YAML, anyone debugging a zero score. Genuinely helpful, genuinely on-topic.
3. **Post it in the hackathon Discord** with the X link, framed as the finding, not as a request
   for likes. People who found it useful share it.

Then **stay in the replies for the first two hours.** Reply engagement is engagement, and threads
die when the author leaves.

**Do not** buy engagement, run reciprocal like-for-like, or ask for boosts. Our own red lines cover
this and it is detectable.

## 6. Two things to clarify with the organizers

1. **The scoring question in §1** — single best post or aggregate.
2. Plex's last line was *"add the pc portal with your main account to boost profile."* I don't know
   what "pc portal" refers to and I'm not going to guess at something that touches account setup.
   Ask them to spell it out. If it is an official campaign or leaderboard portal, being on it is
   probably free reach and worth doing.

## 7. If the metric turns out to be aggregate after all

The hedge costs one post. Keep the flagship as the centrepiece, and post the remaining
[X_POSTS.md](X_POSTS.md) drafts at roughly one a day through the 31st — they are already written and
each is a real gotcha. Consistency then reads as consistency, and the flagship still carries the
max. Nothing about §3's hold list changes: the offline scorer waits for Sept 1 either way.
