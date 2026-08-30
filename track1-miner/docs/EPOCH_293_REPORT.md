# Epoch 293 — the restatement fix measured live, and what is left

**Written 2026-08-30.** Epoch 293 is the first epoch scored after the restatement change deployed.
It is the measurement the whole of [EPOCH_292_AUTOPSY.md](EPOCH_292_AUTOPSY.md) was predicting.

## 1. The scoreboard

```
intent                 rank  our score      leader / runner-up              gap
SSL_VERIFICATION        #1   1.0418e-2      ssllabs        8.2891e-3      +25.7%
STORM_ALERT             #1   1.0336e-2      txlens         1.0189e-2       +1.4%
AI_TEXT_DETECTION       #1   2.0789e-10     veritarach     1.7040e-10     +22.0%
WEATHER_FORECAST        #2   1.0407e-2      weatherapi     1.0429e-2       -0.21%
IP_GEOLOCATION          #2   9.9253e-1      preflight      9.9344e-1       -0.09%
LANGUAGE_TRANSLATION    #3   0.0            (all four miners scored 0.0)      —
ACADEMIC_SEARCH          —   not scored this epoch
```

Three firsts, and two seconds lost by **0.21%** and **0.09%** respectively. Those are not ties —
they are losses — but they are losses by margins far inside the noise of a single question draw.

## 2. The restatement fix worked

Our score as a fraction of the best score in the field, per epoch:

```
intent               ep289   ep290   ep291   ep292   ep293
SSL_VERIFICATION     1.599   1.174   1.010   0.983   1.257
STORM_ALERT          0.947   0.868   1.400   1.007   1.014
WEATHER_FORECAST     0.973   0.817   1.052   0.774   0.998
IP_GEOLOCATION         —       —       —     1.657   0.999
```

- **SSL_VERIFICATION** went from 0.983 (losing) to **1.257** — rank 1 recovered, and by the widest
  margin since epoch 289.
- **WEATHER_FORECAST** went from 0.774 to **0.998**, and from **#5 of 14 to #2 of 14**. That is the
  single largest movement the miner has ever made in that intent.
- **STORM_ALERT** held rank 1.
- **AI_TEXT_DETECTION** won rank 1 on its debut epoch, hours after being registered.

The offline prediction was weather 8.1x, SSL 18.8x, storm 20.4x on raw prose, and 6.4x / 11.2x /
1.5x under a 32-word conversion budget. The live movement is smaller than the raw numbers and
broadly consistent with the conversion-budget column, which is the honest way to read it: **the
converter absorbs most of the raw gain, and what survives was still enough to flip SSL and to move
weather 3 places.** GAPS G25 can be closed on the sign of the effect, though not on its magnitude.

## 3. LANGUAGE_TRANSLATION — the whole field scores zero, and it is not our bug

This is the one that went badly, and it is worth separating two different problems.

### 3a. The systemic problem: 41% of all epochs are all-zero for everyone

Every scored epoch in this intent, whole field:

```
all-zero epochs: 14 of 34 (41%)

293 YES   292 no    291 YES   290 no    289 no    288 YES   287 no    286 YES
285 YES   284 YES   283 no    282 no    281 YES   280 no    279 YES   278 YES
277 YES   276 YES   275 YES   274 no    273 no    272 no    271 no    270 YES
269 no    268 no    267 no    266 no    265 no    264 no    263 no    262 no
261 no    260 YES
```

In those 14 epochs **not one miner scored above zero** — including `mymemory-translate` and
`test-mymemory-translate`, which are specialist translation miners named after the API they wrap.
The pattern starts at epoch 260, long before this miner entered the intent at epoch 289.

An exact 0.0 for every miner simultaneously is the signature of an **empty scored answer**, not of
bad answers. A bad answer scores small-but-nonzero: our own answer measures ~1e-4 offline against
the current champion scorer, never 0.0. Zero across an entire field means the text being scored
was empty for everyone, which points at the question or the conversion step rather than at any
miner.

This is the basis for reporting it to the organizers. See §6.

### 3b. Our own problem: the champion scorer changed and our answer shape went stale

Separately, and fixably: **the LANGUAGE_TRANSLATION champion scorer is now registration 1885
(`c2_r1cut.wasm`)**, replacing the one the answer was tuned against. This is the second time a
scorer change has invalidated tuning in this repo — CVE_LOOKUP was the first.

`src/translate.ts` returned the **bare translation** and nothing else, and its header argued for
exactly that: the ground truths were bare translations, so prose would bury the compared part.
Under the new scorer that is false. Measured on three real-shaped questions:

```
answer shape                                            mean        crossed
bare translation (what was deployed)                    8.5322e-5     0/3
"The translation of X into L is Y." + restatement
  + provenance                                          3.3318e-1     1/3
```

**A 3,905x improvement**, measured end-to-end against production, and it takes one of the three
questions from no-crossing to a full 1.0. Shipped.

**One variant was measured, beat that, and was rejected.** Appending "This is the standard
rendering used in everyday speech, and it is the form a native speaker would most commonly reach
for in this context" scored 0.666 and crossed 2/3. It is not shippable: it asserts something we
cannot substantiate about a machine translation from MyMemory, and the extra crossing came
precisely from that unverifiable clause happening to match the hidden reference's wording. Writing
sentences we cannot stand behind in order to match a reference we cannot see is the line between
tuning an answer and gaming a scorer. The honest version keeps ~3,900x of the ~7,500x available.

## 4. WEATHER_FORECAST — lost by 0.21%, and wording is exhausted

We are at 1.0407e-2 against weatherapi's 1.0429e-2. Both sit in the scorer's **miss band** — neither
crossed the cliff on this epoch's question, so the ordering between them is close to noise.

Eight restatement variants were swept against the live champion on the 12-question bench:

```
variant                        mean(full)  crossed    mean(32w)  crossed
A deployed (live now)            0.748611    9/12      0.583689    7/12
C verbatim question + answer     0.830538   10/12      0.502232    6/12
E cleaned question + answer      0.830371   10/12      0.583872    7/12
B bare answer, no restatement    0.338217    4/12      0.255328    3/12
H question echoed alone          0.665920    8/12      0.502162    6/12
```

C and E beat the deployed shape by ~11% on raw prose and cross one more question — but **at the
32-word conversion budget, which is what the node actually scores, E and A are identical**
(0.583872 against 0.583689) and C is materially worse. Since the converter is the real scorer, the
raw-prose advantage is not expected to survive, and switching costs readability: E drops the
"Here is" opener and produces "provide a 7-day weather forecast for Tokyo. A 7-day (168-hour)…".

**Nothing was changed.** The honest read is that weather wording is exhausted; the remaining 0.21%
is question-draw luck in a 14-miner field. The gain already banked — #5 to #2 — is the real result.

## 5. IP_GEOLOCATION — lost by 0.09%, in a saturated band

The whole intent moved into the scorer's **hit band** this epoch: we scored 0.99253, preflight
0.99344, txlens 0.99165. Everyone crossed the cliff, so this is a fine-margin race with almost no
headroom.

Measured against the live champion (reg 630) over three cases:

```
answer shape                              mean
deployed                                  0.9957800
+ autonomous-system caveat                0.9965800   (+0.08%)
+ explicit anycast note                   0.9983321   (+0.26%)  <- REJECTED
```

The anycast note scored best and was **rejected**: it is only true of public DNS resolvers, and
asserting it for every address would be wrong. The autonomous-system caveat is true of every IP,
is the caveat a user of this answer actually needs, and was shipped. At +0.08% against a 0.09%
deficit it is roughly the size of the gap — which makes it a coin flip, not a fix. Recorded as
such.

## 6. Should the all-zero epochs be reported to the organizers?

**Yes**, and the case is strong because it is not a complaint about our own score.

The facts to give them, all independently checkable from the public API:

- **14 of 34 scored epochs in LANGUAGE_TRANSLATION are all-zero for every miner** — 260, 270,
  275–279, 281, 284–286, 288, 291, 293.
- It affects **specialist translation miners** (`mymemory-translate`, `test-mymemory-translate`)
  identically, so it is not one implementation's bug.
- It **predates our entry** to the intent by roughly 30 epochs.
- An exact 0.0 across an entire field is the signature of an **empty scored answer**. Our endpoint
  demonstrably returns real translations on demand, and its answers measure ~1e-4 against the
  current champion scorer — small, but never 0.0.
- The likeliest mechanisms are that the question arrived carrying no translatable text, or that
  the conversion step produced nothing for anyone. **We cannot distinguish them from outside**,
  because `/scores` no longer exposes `question`, `ground_truth` or `converted_answer` (GAPS G24).

The ask is specific and cheap for them to answer: *for an all-zero epoch such as 293, was the
question delivered with translatable text, and was a converted answer produced?* That single answer
tells every miner in the intent whether to fix their code or wait.

Worth noting alongside it: **ACADEMIC_SEARCH was not scored at all in epoch 293**, which the
operator has already reported and which keeps recurring.

## 7. State after this round

Deployed and verified: `verify-deploy` **ALL CHECKS PASSED**, 122/122 tests, all seven routes 200.
Registration **334** active with seven intents.

Changed this round: `src/translate.ts` (answer shape, 3,905x) and `src/geo.ts` (autonomous-system
caveat, +0.08%). Weather deliberately unchanged.
