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
| **The converter is a ~32-word budget** (measured 2026-08-28) | Highest of all | **Yes — directly** | **Hold until Sept 1** |

The converter finding is the newest and probably the most valuable: `converted_answer` lands at
~32 words whatever you send, so anything past that is summarised away by a model you do not
control. It cost us a measured 0.992 → 0.0097 on one SSL row. Every miner in the network is losing
score to this and none of them appear to know. Publishing it on the 28th hands eleven weather
miners a direct scoring improvement during the exact window that decides the 75%.

The offline-scorer loop is how we went #3/#3 → #1/#1/#1 in three epochs. It converts a 9-hour
feedback cycle into seconds. Handing that to eleven weather miners on Aug 28 is handing them our
iteration speed during the exact window that decides the performance term. It is also our best
piece of content — so it becomes the flagship for the Track 3 window and the final write-up, on
**Sept 1**, when publishing it costs us nothing.

Everything below is measured and true. Do not post a number that has not happened.

## 4. The flagship — 280 characters per post, and post 1 has to stand alone

**Every post below is under X's 280-character limit** (counts noted). The earlier drafts ran to
412 characters and would have been rejected or silently truncated. If the account has Premium the
limit is 25,000, but do not rely on it — long posts collapse behind "show more", which costs the
scroll-stopping first line.

**The consequence of §1 that matters most:** if the X term is scored on the single
highest-engagement *post*, a thread does not pool its engagement — impressions decay steeply after
post 1, so **post 1 is effectively the scored unit.** That changes the shape: post 1 must be a
complete, quotable finding that works with nothing after it. The rest is supporting evidence for
people who want it, and it is what makes replies happen.

So: write post 1 as if it were the only post. Post it. Then reply to yourself with 1–6.

---

**POST 1 — standalone. This is the one being scored.** (279 chars)

> Declaring your upstream's rate limit in a @Telegraphprotoc miner YAML throttles your ENTIRE miner — not just that endpoint.
>
> I nearly shipped a 5-per-30s quota across 3 intents I'm #1 in.
>
> The docs: "Counts are node-wide per miner."
>
> There is no endpoint scope on a limitation. 🧵

**1/** (216 chars)

> I added a CVE endpoint. Its upstream (NIST NVD) allows 5 requests per 30s, so I declared that honestly:
>
> limitations:
>  - property: rate
>    value_num: 5
>    window_seconds: 30
>
> Looks like good citizenship. It isn't.

**2/** (257 chars)

> A limitation entry's fields are: code, message, param, property, value_bytes, value_num, operator, window_seconds.
>
> Note what's missing — anything naming an endpoint.
>
> So the quota belongs to one upstream, but the ceiling applies to everything you serve.

**3/** (235 chars)

> That would have taken SSL_VERIFICATION, STORM_ALERT and IP_GEOLOCATION — all three of them #1 — down to 0.167 requests/second.
>
> In the same week I need demand to prove eligibility.
>
> Caught it in review. Dropped the endpoint instead.

**4/** (253 chars)

> The part nobody seems to know: declaring nothing doesn't mean unlimited.
>
> "A miner that declares no rate limit still gets one. The node applies a default backstop of 600 calls/minute per miner."
>
> Tunable via MINER_DEFAULT_RATE_PER_MIN. 0 disables it.

**5/** (277 chars)

> Two more that cost me real score:
>
> · Never return a non-2xx. The engine stores an empty answer and the scorer never reads your body. A 400 is a guaranteed 0.
>
> · The engine only sends params you declare in input_schema — never the raw question, unless you declare q or query.

**6/** (264 chars)

> I built coordinate parsing that never ran. A lat/lon question arrived as location="" and my miner answered "no location provided".
>
> Scored 0.0.
>
> Fixing these took me from #3 to #1 in three intents in three epochs.
>
> explorer.telegraphprotocol.com/miners/livecert

---

**Before posting**

- `@Telegraphprotoc` is in **post 1** — rule 03 requires update posts to be tagged, and post 1 is
  the one that has to carry the score on its own.
- Re-count if you edit. A post that runs long gets cut, and the cut lands on your last line.
- Check the explorer link renders a preview card before you commit to it.
- No hashtag spam. `#hackathon #tech #trending` on the Aug 27 post did not help — 71 impressions
  was the worst of the three.
- Do **not** claim IP_GEOLOCATION is prize-eligible. It has 2 miners and needs 3. If asked, say so
  plainly — that honesty is itself the recruiting pitch in
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
