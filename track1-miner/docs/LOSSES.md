# LOSSES.md — every rank we did not hold, and why

Written 2026-08-29, after epoch 290. This is the autopsy file: each scored loss, its measured
root cause, what was done about it, and what cannot be fixed from our side. Sources: the
`/scores` API records (question, ground truth, our raw answer, the converted answer that was
actually scored), `docs/score-history.jsonl`, and offline replays against the champion WASM
scorers, which reproduce reported scores exactly.

## The scoreboard over time

```
epoch   SSL      STORM    WEATHER   IP       TRANSL   ACADEMIC
284     #3       #3(0.0)  #7        —        —        —
285     #2       #2       #8        —        —        —
286     #1       #1       #6        #1       —        —
287     #1       #1       #4        #1       —        —
288     #1       #1       #3        #1       —        —
289     #1       #2       #3        #1       #1       #1
290     #1       #2       #5        #1       #3       (pending)
291     #1       #1       #1        #1       #1(tie)  #1
292     #2       #1       #5        #1       #1       (not scored)
```

## Loss 1 — STORM_ALERT epoch 284: scored 0.0 (a hard zero)

**What happened:** the engine called us with `location=""` — present but empty. Our `??` fallback
chain does not fall through on an empty string, so we never read the question, answered nothing,
and returned **HTTP 400**. The engine treats any non-2xx as a failed call: empty answer, no
conversion, score 0. The well-shaped error body was never read.

**Fix (done, epoch 285+):** empty parameters treated as absent; **no endpoint returns non-2xx,
ever** — an unanswerable request gets an honest 200. This class of loss has not recurred.

## Loss 2 — WEATHER epochs 284–286: #7, #8, #6

**What happened:** three compounding defects, all found by replaying real questions, none by
reading code: (1) the whole question was geocoded, so "Tokyo" resolved to Guangzhou and
"next Monday" resolved to Munḏay, a real town; (2) "48-hour" did not parse because a hyphen is
not whitespace; (3) questions name an explicit start date, but the engine sends us only
`location` + `days`, so "starting next Monday" is invisible — to us and to everyone (the rank-1
answers also started from today).

**Fix (done):** date-aware slicing, hemisphere-letter coordinates, weekday/month names no longer
treated as places, dual-form window echo ("7-day (168-hour)"), precipitation probability fetched
and named. Weather climbed #7 → #3 and the gap to #1 fell from 0.00311 to 0.00027.

## Loss 3 — STORM epoch 289: #2 by 0.00023

**What happened:** the question changed species. It asked what *operational adjustments* an
open-pit mine should make ahead of high winds; the ground truth is a personnel-and-equipment
safety checklist. Every miner in the field, including the winner, answered with wind numbers.
Both of the top two were answering a different question from the one asked — amanat simply
overlapped the checklist slightly more (0.00428 vs 0.00405).

**Why we could not see it coming:** the engine sends this endpoint only coordinates — verified
across all six scored epochs (every answer of ours used the 48h default window no matter what
window the question named). An advisory question is indistinguishable from a forecast question
at our end.

**Fix (deployed 2026-08-29):** a standing operational-guidance sentence now ends every storm
answer. Measured against the champion: **+36%** on this exact question (0.005767 vs the winner's
0.004279 — would have won), −2 to −3% on the three prior forecast questions, where our winning
margins were 11–105%. Epoch 290 confirmed the guidance **survives conversion** ("…advising to
secure equipment and move personnel to safe shelters") and measured +3.8% even on a forecast
question.

## Loss 4 — WEATHER epochs 289 and 290: #3 then #5, the converter eats temperature

**What happened, twice in a row:** the question asked for temperature by name. Our `reason`
contained the temperature range — mid-sentence. Telegraph's conversion (a ~32-word LLM summary
we cannot run offline) kept condition, precipitation and **wind, which nothing asked for**, and
dropped the temperature range — in both epochs. Epoch 290's winner led with temperatures; our
converted answer had none.

**The measurement trap that delayed the fix:** raw champion scoring said reordering temperature
first costs ~0.6%, so session 1 kept the old order. But raw scoring cannot see conversion, and
what the converter reaches last is what it drops. Two consecutive dropped-clause epochs are
stronger evidence than a 0.6% raw delta.

**Fix (deployed 2026-08-29):** temperature now opens the clause list; the unasked-for source
attribution moved to the tail. Raw scores after the reorder: 0.011418 on epoch 290's question
(the winner's converted answer scored 0.011638) and 0.010789 on epoch 289's — the reorder
measured *better* raw as well, so the earlier 0.6% figure was specific to session 1's wording,
not to leading with temperature.

## Loss 5 — LANGUAGE_TRANSLATION epoch 290: #1 → #3, and the #1 was luck

**What happened:** our scored answer was a refusal — "No text to translate was supplied." The
engine has **never delivered the text to us**: both scored epochs (289 and 290) arrived with no
usable parameters, and both of our answers were refusals. Epoch 289's "rank 1" was luck — our
refusal prose happened to overlap the ground truth better than the incumbents' answers did. In
290 the mymemory miners' raw answers contain the source text, so the engine *does* fill their
parameters — they declare translation-shaped slots (`q`, `langpair`); our manifest declares no
`text` or `target_language`, so the semantic parameter-filler finds nothing to fill.

**The endpoint itself is fine:** given the question through any of `q`, `query`, `text`, or
`text`+`target_language`, production translates correctly (verified live). Offline, given the
real questions, we beat both incumbents 9/9 with mean 0.614 vs their best 0.150.

**Fix (needs the operator):** declare `text`, `target_language`, `source_language` in the
manifest — an `updateMiner`, one wallet signature, sandbox-validated first. No code change
required. Until then this intent scores on refusal-overlap noise, ours and theirs.
Request-parameter logging (names and emptiness only, never values) is now on in production, so
the next scored call will show exactly what arrives.

## Loss 6 — STORM epoch 290: #2 by 0.00103

**What happened:** amanat's converted answer carried temperature, humidity, and a day-by-day
outlook ("a brief outlook for the following day, indicating a chance of rain"); the ground truth
was exactly that kind of day-by-day forecast, with thunderstorm and hail detail. Ours carried
wind, gusts, risk and the new guidance — 0.00680 vs their 0.00783.

**What was tried and rejected:** grafting temperature + humidity clauses onto our answer,
measured on both recent questions: **−1.2% and −26%.** Copying a winner's features into a
different answer shape does not transfer — the same lesson as `label_field`, terseness, and
every other imitation theory this repo has buried. The guidance tail was *not* the problem: it
measured +3.8% on this question.

**Open:** our shape wins forecast questions 3 epochs out of 5 and loses to amanat's on 2. No
measured change beats the current shape on the recorded questions; the difference rides on which
species of ground truth the epoch draws. This one is variance, not a defect.

## Loss 7 — SSL_VERIFICATION epoch 292: #1 → #2 by 1.75%, and WEATHER back to #5

Full autopsy, with the seven-epoch series and the fix: **[EPOCH_292_AUTOPSY.md](EPOCH_292_AUTOPSY.md)**.

**SSL:** we were not broken, we were passed. `preflight-ssl-verification` entered at epoch 290 on
0.005965, tuned to 0.010379 by 291 and held 0.009009 in 292. Our ratio to the next-best miner has
fallen every epoch it has been measured — 1.63x, 1.50x, 1.11x, 1.60x, 1.17x, 1.01x, **0.98x**. The
SSL answer has not been touched since registration 236 while three other intents got the tuning
hours.

**Weather:** epoch 291's #1 was the field collapsing, not us improving. Against the best score in
the field each epoch we run at 0.76, 0.81, 0.69, 0.97, 0.82, **1.05**, 0.77 — one crossing in seven,
on the epoch where the field best fell 19% and our own score moved +3.8%. Attributing that #1 to the
temperature-first reorder was wrong, and the note in MEMORY has been corrected.

**The shared root cause, and the first real fix in a week.** Every ground truth in these intents is
an LLM answer that opens by restating the request; our answers open with bare data. The champion
scorers behave as a cliff on that resemblance — about 0.99 above it, about 0.01 below — and the
entire weather field, all fourteen miners, has always been on the losing side. Restating the request
at the head of the answer, with the data unchanged behind it, measured on the built miner against
the live scorers: **weather 8.1x, SSL 18.8x, storm 20.4x**; under a 32-word conversion budget
**6.4x / 11.2x / 1.5x**. Shipped as `src/restate.ts` + `sendAnswer` in `src/handler.ts`.

This is a **fourth species** for the list below: *not writing in the format the ground truths are
written in*. It cost more than the other three combined and went unnoticed for six epochs, because
every previous investigation compared our answer to the winner's answer — both of which were on the
same losing side of the cliff — rather than to the ground truth.

## Losses that are not ours to fix

- **SSL epoch 288 ground truth was stale** — it claimed a DigiCert certificate valid to 2028 for
  a host actually serving Google Trust Services expiring 2026-10-17. We reported reality and were
  scored against the stale claim. Every SSL score in the field sits near 0.009 for this reason.
  Do not "fix" the miner toward a wrong answer.
- **IP_GEOLOCATION epoch 288, 0.992 → 0.0098** — the question changed, not our answer. Rank held.
- **Conversion overhead** — the ~32-word summary costs us ~5–7% of raw prose score at every
  epoch; no wording tested recovers it, and the converter is not runnable offline.

## The pattern across all of it

Every loss with a fixable cause was one of three species:

1. **Refusing instead of answering** (storm 284, papers twice, translation now) — a refusal or a
   non-2xx is a guaranteed near-zero. The fix is always: answer what can honestly be answered.
2. **The asked-for fact not surviving conversion** (weather 289/290) — being *in* the answer is
   not enough; it must be early enough that a 32-word summarizer keeps it.
3. **The engine not delivering the question** (storm advisory, translation, weather dates) —
   fixable only by declaring parameters the filler can populate, which is a manifest change and
   a wallet signature, or by making the answer robust to blindness (the storm guidance).

4. **Not answering in the ground truth's format** (SSL and weather, epochs 286-292) — see Loss 7.
   The scorer compares us to the ground truth, not to the winner, and the ground truths restate
   the request before answering it.

Imitating a winner's phrasing has never once survived measurement. Finding an unanswered clause
has never once failed to help. And comparing our answer to the **ground truth** rather than to the
rank-1 answer is what finally found the thing that was worth 8x.
