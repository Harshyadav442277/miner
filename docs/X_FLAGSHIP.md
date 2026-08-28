# X_FLAGSHIP.md — the posting plan

Rewritten 2026-08-28 after the organizers clarified the scoring. **This supersedes the earlier
"one flagship post" version of this file, which was wrong.**

---

## 1. What the organizers actually said

> "there's no fixed formula like likes/reposts = x points. we'll look at quality, consistency,
> reach, likes, reposts, comments and meaningful engagement of your updates"
>
> "so you can post about both your track 1 and track 2, experiments, results, improvements,
> journey, learnings, edge cases you faced, etc"
>
> "just make sure to tag @Telegraphprotoc in the updates and keep them genuine, we mainly want to
> see the actual work and progress"

Three corrections to what this file used to say:

1. **Consistency is counted.** An earlier Discord message said only the single highest-engagement
   post mattered. That was wrong, and the one-flagship plan built on it is withdrawn. A steady
   series beats one post.
2. **Track 2 is in scope.** The scorer work counts as much as the miner work.
3. **Judging is holistic and human-readable — "we mainly want to see the actual work and
   progress."** Which means the journey, the failures and the edge cases are the content, not
   filler around it. That is genuinely good news: it is what we actually have.

## 2. This also reverses the hold list

The previous version held back the two best findings — running the champion scorer offline, and
the converter's word budget — on the theory that they would help rivals during the last three days.

**Publish them.** The reasoning changed:

- Judging explicitly rewards showing real work. Withholding our best findings costs the exact thing
  being scored.
- The `/api/wasm` and `/scores` endpoints are public and documented, and our own public README
  already describes the offline replay loop. We were "protecting" something already published.
- Three days is not enough time for a rival to find the post, build a replay harness, diagnose
  their answers and redeploy.

What stays true: **do not post a number that has not happened.** Everything below is measured.

## 3. Baseline

`@hyadav42774`, 29 posts. Best so far: **188 impressions, 8 likes, 7 reposts, 6 replies** on the
"base_url points at the upstream" post. The two posts with real reply counts are the two that told
builders something that would have cost them time. That is the format that works.

## 4. The posts

Every one is under X's 280-character limit (counts verified). Tag `@Telegraphprotoc` in each.
Roughly two a day through Aug 31, then keep going through the Track 3 window — updates posted
during Track 3 are still updates.

---

### Aug 28

**P1 — the near-miss** (277)

> Declaring your upstream's rate limit in a @Telegraphprotoc miner YAML throttles your ENTIRE miner — not just that endpoint.
>
> I nearly shipped a 5-per-30s quota across 3 intents I'm #1 in.
>
> The docs: "Counts are node-wide per miner."
>
> There is no endpoint scope on a limitation.

**P2 — the finding I'm most sure of** (273)

> Measured on @Telegraphprotoc: whatever your miner returns, the text that actually gets scored lands at ~32 words. It expands short answers and compresses long ones.
>
> One SSL answer of mine scored 0.99 as raw prose. The summary that got scored: 0.0097.
>
> Write to the budget.

---

### Aug 29

**P3 — the two rules that cost real score** (280)

> Two @Telegraphprotoc rules I learned the expensive way:
>
> · The engine only sends the params you declare in input_schema — never the raw question, unless you declare q or query.
>
> · A non-2xx is a guaranteed 0. The engine stores an empty answer and the scorer never reads your body.

**P4 — the registration edge case** (271)

> A @Telegraphprotoc registration edge case, in case it saves you an hour:
>
> I put twitter: "@handle" in my miner YAML. Valid YAML.
>
> The console re-serialises before validating and drops the quotes. @ can't start a plain scalar, so its own parser rejected the file it wrote.

---

### Aug 30

**P5 — the journey, with numbers** (239)

> @Telegraphprotoc miner progress, epoch 284 → 288:
>
> SSL_VERIFICATION #3 → #1
> STORM_ALERT #3 → #1
> IP_GEOLOCATION → #1
>
> No clever idea behind it. I replayed the real scored questions offline and fixed whatever each answer had left unanswered.

**P6 — an edge case worth the reply thread** (271)

> Replayed 21 real @Telegraphprotoc ACADEMIC_SEARCH questions against the live scorer.
>
> My parser was answering "no topic supplied" on 2 of the 4 newest — a date clause mid-sentence was deleting the subject.
>
> Fixed, now 19/21 beat the field's best. Replay your own answers.

---

### Aug 31

**P7 — Track 2** (265)

> Track 2 on @Telegraphprotoc: wrote a scoring module for TEXT_AUTHENTICITY_CHECK.
>
> On my corpus it separates good answers from bad at margin 0.9634 and 144/144 wins, against the live champion's 0.0915 and 104/144.
>
> Writing the judge is harder than writing the miner.

**P8 — the Track 2 learning** (276)

> Learned the hard way on @Telegraphprotoc Track 2: a scorer that separates answers better can still be rejected.
>
> Promotion also checks agreement with how miners are already ranked. You can beat the champion on margin and still fail the correlation gate.
>
> Two targets, not one.

---

### Track 3 window — keep going

**P9 — what measurement killed** (272)

> Four @Telegraphprotoc scoring beliefs that measurement killed:
>
> · terse beats verbose — wrong
> · label_field drives the score — wrong
> · there's a response size limit — wrong
> · hand-written test answers are valid — wrong, they leak the ground truth
>
> Measure, don't theorise.

**P10 — honesty as content** (260)

> Odd one from @Telegraphprotoc: my miner reported api.shopify.com's cert as Google Trust Services, expiring Oct 2026. The ground truth said DigiCert, valid to 2028.
>
> The host actually serves GTS. We're right; the ground truth is stale.
>
> Kept the correct answer.

---

## 5. How to post them

- **Tag `@Telegraphprotoc` in every one.** Rule 03 requires it, and an untagged post may not be
  counted at all.
- **Re-count characters if you edit.** X truncates, and the cut lands on your last line.
- **Stay in the replies for the first two hours.** Comments are explicitly listed as scored, and
  threads die when the author leaves.
- **Reply under Telegraph's own posts and other entrants' miner posts** where a finding applies.
  That is where the reach comes from — a cold account posting into its own timeline gets ~80
  impressions.
- **No hashtag spam.** `#hackathon #tech #trending` on the Aug 27 post did not help — 71
  impressions, the worst of the three.
- **Do not buy engagement or arrange reciprocal likes.** Rule 04 makes artificial inflation
  disqualifying, and "keep them genuine" was said explicitly.
- **Do not claim IP_GEOLOCATION is prize-eligible.** It has 2 miners and needs 3. If asked, say so
  plainly — see [ELIGIBILITY.md](../track1-miner/docs/ELIGIBILITY.md).

## 6. Still unanswered

Track 3 has not opened, so no intent can have its 100 real Track 3 requests before the Aug 31
close. Whether that guardrail is waived, measured later, or binding is still unknown, and it
decides whether rank 1 converts into anything. Worth asking the same officials who clarified the X
scoring.
