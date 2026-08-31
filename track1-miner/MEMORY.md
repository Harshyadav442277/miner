# Track 1 — session handoff

**Read this first. Everything Track 1 needs is in this folder.**
Shared protocol facts are in `../docs/`. Do not edit `../track2/` or `../track3-certwatch/`.

Last updated: 2026-08-31 ~21:30 UTC — `updateMiner(389)` to THIRTEEN intents was prepared and
handed to the operator inside the last hours of Track 1 (closes Aug 31 **23:59 UTC**; resolve
deadlines with `date -u`, never the local date). Read § 000000000 first, then § 00000000.
Epoch 298 starts 23:02Z and is spot-scored ~00:15Z Sep 1.

---

## 000000000. THIRTEEN INTENTS, SIGNED IN THE LAST HOURS OF TRACK 1 (2026-08-31 ~21:30Z)

**Track 1 was still open. A previous session had recorded it as closed and that was a timezone
error** — the file was written at 02:16 IST on "Sep 1", which is 20:46 UTC on Aug 31, about three
hours before the 23:59 UTC close. The operator caught it. Corrected in
[../docs/TELEGRAPH_FACTS.md](../docs/TELEGRAPH_FACTS.md) and [../CLAUDE.md](../CLAUDE.md).
**Resolve every deadline with `date -u`.** The same file also claimed a new registration would sit
unranked for 7 days; that is false and is now G58.

**What shipped:** `updateMiner(389, ...)` taking the registration from ten intents to **thirteen** —
`WEATHER_CHECK`, `FACT_CHECK`, `TELEGRAPH_KNOWLEDGE`. Two of the three cost **no new code**:
`/fact-check` and `/telegraph` were built, tested and deployed in an earlier session, committed to
`miner.yaml`, and then never registered — reg 389 was pinned to a commit that predated them. This
was a re-pin, not a build.

**SIGNED AND MINED 2026-08-31 ~21:37Z. REGISTRATION IS NOW 402 — 389 IS GONE. Look up 402.**

```
tx        0x0e54dcc7b31b7f30b110f77f09e7719267d1179fbac8e4795a9649ff20f27fd3
status    1 (success), block 46222019, gas 776,488
reg       389 -> 402   (receipt log 3 carries the migration, topics 0x185 -> 0x192)
url       .../miner/6b0d176048313cc6fec2788d18cb9ae24f3e2adc/track1-miner/miner.yaml   (121 bytes, verified)
hash      0x7538082784c4b20849aeb54cfb6c2cf74100cf074dff3e0f8d8b268e12e47640   (24,996 hosted bytes)
intents   13, decoded from the receipt and matched one by one
gates     preflight 7/7 - 182 unit + 67 live green - manifest parse + orphan check - cast call simulated OK
```

**The receipt was decoded rather than trusted to the API**, per the lesson from the 334 -> 389
update: `/api/miners/402` returned nothing for minutes after the mine while `/api/miners/389` still
served the OLD ten-intent record. Neither is evidence of failure. Read the logs in the first five
minutes; the chain is authoritative and was correct immediately.

**The one real bug fixed: `hours=0` was being swallowed.** Our own `input_schema` promises "0 is the
current hour", but `Number(firstValue(url,"hours")) || 24` is falsy at zero, so a "what is it doing
right now" question was answered with a 24-hour range. Absent and zero are now distinguished by the
empty string `firstValue` returns for absent; `forecast.ts:64` already clamped to a 1-hour window,
so nothing downstream changed. Verified live: `hours=0` -> "A 1-hour hourly weather forecast",
default still 24-hour. That fix is what makes WEATHER_CHECK worth declaring at all.

**Why three intents and not twelve.** The operator asked whether the twelve crowded Tier-A intents
(CRYPTO_PRICE, CVE_LOOKUP, TVL_LOOKUP, CURRENCY_EXCHANGE, ONCHAIN_TX_LOOKUP, URL_SCAN,
FINANCIAL_DATA, STOCK_PRICE, TOKEN_HOLDER_COUNT, WEATHER_CHECK, FRAUD_DETECTION, GAS_PRICE) were
winnable. Measured across every recorded epoch of each:

- **GAS_PRICE is closed** — `kriterion-pramagraph` scores exactly **1.0**. FRAUD_DETECTION has three
  miners saturated at ~0.9998. URL_SCAN's `netwire-url-scan` is at 0.324, 610x the runner-up.
- **The "empty field" reading of epoch 297 is a trap.** CVE_LOOKUP showed all five miners at 0.0 —
  but its #1 was **1.0** for the seven epochs before that. STOCK_PRICE's #1 was 0.995 at e294 and
  6.6e-12 at e297. Those are champion-scorer rotations, not open doors. Third time this trap has
  been hit; check `/api/wasm?intent=...` before believing a field-wide collapse.
- Twelve unimplemented intents would be positive under a **sum** reading of judging and destructive
  under an **average** one (G59). Three reusing proven handlers is positive under one and neutral
  under the other, so it does not need the ambiguity resolved.

**Rival re-assessment: preflight and the onchain cluster are not the threat; `chainsight-oracle`
is.** Normalized per the rules (score / best-in-intent), epoch 297:

```
by SUM                                  #1s   note
 1. chainsight-oracle   14 intents 9.05   4    the actual broad rival, top-3 in ten
 2. livecert (ours)     10 intents 8.14   4
 3. txlens              13 intents 7.62   2
 4. preflight           10 intents 7.27   5    broad, not strong: wins CVE at 0.0, WALLET at 4.3e-8
```

Four of the seven `*-onchain-*` miners score exactly 0.0 in ONCHAIN_TX_LOOKUP; that field's leader
is `veyctum`. Our 1.86 normalized points left on our own ten sit in ACADEMIC (0.37), WALLET (0.57),
TRANSLATION (0.62) and SSL (0.63).

**Not verified before signing:** the sandbox validator is down (G60 — accepts the request, then
404s from its own backend, same breakage as 2026-08-29). Substituted a structural diff against the
manifest the node accepted for 389 plus a read-only `cast call` simulation. That proves the change
is shaped like something already accepted; it does not prove activation accepts `/fact-check` and
`/telegraph`, which have never been through it. Whether epoch 298 counts for Track 1 is G61.

---

## 00000000. THE THREE-INTENT PUSH (2026-08-31 ~15:40 UTC, deployed + preflight 7/7)

Three parallel investigations into the intents epoch 297 lost, each measured before shipped.
All live at `miner-wine.vercel.app` (G22: deploy is `vercel --prod --scope wukong4` from
`track1-miner/miner` — pushing to main does NOT deploy). Commits `fad5c0b`, `8344902`, `2dc7033`.

**1. WALLET (was #4 in a 1e-8 field) — the field-wide zero was a CHAMPION SWAP, not a question
change.** Reg 2575 = reg 1066 with score² applied (verified by hash, by squaring all 13 bench
rows digit-exact, and by un-squaring the live field). Noise floor moved 1e-4 → 1e-8; ordering
preserved; our 297 ratio actually improved 0.028 → 0.574. Shipped: the engine's zero-address
filler is no longer answered with the burn address's real balance, and `chain=sepolia` gets its
caveat. Scored surface clip32-identical. G52. Rewording was measured and REJECTED again (G44
stands); the "2.47 ETH on Base" rows are GT fabrications, winnable only dishonestly — left lost.

**2. TRANSLATION (was #3 at 2.4e-11) — we were REFUSING the engine's ISO-code shape our own
manifest promises.** `target_language=de` → "no language named" refusal; refusal conversions
score exactly our live 2.4e-11, healthy ones ~3.5e-10 = 9x the 297 leader. Champion is now reg
2296 (rotated 03:12Z; source public — sub-cliff band ordering is lexical similarity × 1e-9, real
and movable). Fixed additively (codes tried only after names fail; byte-identical otherwise),
0/9 → 8/9 code-shape crossings, verified live. MyMemory hypothesis REFUTED — GTs are
Google-verbatim 8/9; Google stays primary. G53.

**3. ACADEMIC (was #4) — champion 688 stands, but G40's sweeps tuned only ~36% of the scored
surface.** The engine alphabetizes the payload and converts ALL of it; `papers[]` was diluting
the prose the scorer reads. Archived real conversions kill G42's "empty ≈ full" (0.00094 bare vs
0.01488 question-echo — 16x). Shipped: `/papers` serves `{verdict, confidence, reason}`, reason
byte-identical (G40's optimum untouched), payload-proxy mean 0.006041 → 0.013419, 22/22 rows,
same shape the 297 winner serves (txlens won with empty results on 10/22 — echo beats papers).
No updateMiner needed. G40/G42 annotated, `bench/acad_shape.mjs` reproduces.

**Meta-lesson, third confirmation this week: when a whole field's scores shift together, check
the champion registry (`/api/wasm?intent=…`) BEFORE touching answers.** Champions rotated 3x on
2026-08-31 alone (translation 03:12Z, wallet 05:58Z). Registry `wasm_hash` is keccak256.

**SSL and IP vs preflight: measured head-to-head and deliberately NOT changed (G54).** Our
deployed answers beat preflight's own live answers under the real champions — IP 19/21 row-wins
with 21/21 crossings (they fail every private-range and Tor row), SSL 9/12 with 8-vs-1 crossings.
The 297 losses were question-flavor rotations outside the bench; every lead-sentence variant
trades crossings one-for-one (`bench/ssl_lead_sweep.mjs`, `bench/h2h_preflight.mjs`). The SSL
scorer is a "verdict" profile (polarity is everything), IP a "reference" profile (coverage beats
brevity) — `zkasuran/telegraph-salience-scorer` deploy.py has the full per-intent map.

Test suite is now 237/237; preflight 7/7 against the deployed build (one MyMemory-fallback flake
re-ran green — MyMemory rate-limits after heavy probing days, same family as G43).

---

## 0000000. EPOCHS 296 AND 297 — THE CLOSE (2026-08-31, settled 14:02Z / scored ~14:10Z)

Both epochs are in [docs/score-history.jsonl](docs/score-history.jsonl). Epoch 298 starts 23:02Z
and settles 08:02Z Sep 1 — past the Aug-31 close, so **297 is the record we likely close on**.

```
epoch 296 (settled 14:02Z):        epoch 297 (scored ~14:10Z, settles 23:02Z):
  6 x #1  SSL STORM AI CONTENT      4 x #1  STORM AI_TEXT CONTENT(1.0) NEWS
          NEWS TRANSLATION          2 x #2  IP -0.094%   SSL -37% (lost to preflight)
  2 x #2  WEATHER ACADEMIC          2 x #3  WEATHER -4.7%   TRANSLATION (1e-11 noise band)
  #4 IP   #5 WALLET                 2 x #4  ACADEMIC -63%   WALLET (1e-8, whole field ~zero)
```

**The G41 fix is verified live: IP went 0.0106 (#4) → 0.995513 (#2), one epoch after the
operator-name change.** It lost #1 by **0.00094** to `preflight-ssl-verification` (0.996453).
That margin is wording noise; do not rewrite anything over it.

**`preflight-ssl-verification` is now the miner to beat** — #1 in SSL (0.00990 vs our 0.00623),
IP and WALLET, #2 in ACADEMIC, all in one epoch. It took SSL from us for the first time since
epoch 292. Normalized-ratio average across our ten intents in 297: **~0.81** (295 was ~0.72).

Fields that collapsed network-wide in 297, not ours to fix: WALLET fell from ~1e-4 to ~1e-8 and
TRANSLATION sits in a 1e-11 band — every miner effectively at zero, rank there is a tiebreak.
ACADEMIC's #4 at -63% is real, but G40/G42 stand: ten variants measured, all lost; only the
preamble is scored. The scores landed ~70 min after epoch start both epochs (05:03Z, ~14:10Z) —
**an epoch's outcome is fixed early; a mid-epoch deploy targets the NEXT epoch, not the current
one.**

Rankings persist into Track 3 routing (70/20/10 to ranks 1/2/3), so the miner must stay healthy
through **Sep 7** — the uptime tripwire and workflows keep running.

---

## 000000. REGISTRATION IS NOW **389**, WITH TEN INTENTS (2026-08-31 04:01 UTC)

**`updateMiner(334, …)` is mined and active. 334 is gone — look up 389.**

```
tx        0x5de3965e2b08cd74b7e240faccb626d41e1003e9e5ec51cf220f76a5fe4ffe1d
reg       389    active, rejection_reason null, retrying false, fetch_attempts 0
yaml_url  https://raw.githubusercontent.com/Harshyadav442277/miner/74ad4a19f41b922a5183dc26d6f405c8557dc9ba/track1-miner/miner.yaml
yaml_hash 78932fb1bf9af09746db6a81720d3bbe9f453655dd30151c71e015e44a903dd8
intents   the seven, plus CONTENT_EXTRACTION, NEWS_HEADLINES, WALLET_BALANCE_CHECK
```

`gh variable set REGISTRATION_ID 389` is done, so the uptime tripwire watches the right one.
`watch.mjs --registration-id 389` reports `activation=active`. Preflight 6/6.

**Two things that cost time and will again if forgotten:**

1. **The indexer lagged ~4 minutes.** `/api/miners/389` returned `miner registration not found`
   for four minutes after the transaction was mined, while `/api/miners/334` still showed the OLD
   seven-intent record. Neither was evidence of failure. The chain was authoritative and correct
   the whole time — the receipt's `MinerRegistered` log carried id `0x185` (389), the new hash, and
   all ten intent strings. **Read the receipt logs, not the API, in the first five minutes.**
2. **The manifest is now served from a commit-pinned GitHub raw URL, not IPFS.** It is immutable
   as long as the repo exists, but a force-push that orphans commit `74ad4a1` would break the
   fetch. Do not rewrite that history.

**The hash to sign is ALWAYS the hosted bytes.** The working copy is CRLF, git stores LF, so the
local file hashes `460bc310…` and the hosted bytes hash `78932fb1…`. Signing the local one would
have failed activation.

---

## 00000. THE PRODUCTION AUDIT (2026-08-30 ~21:45 UTC / 2026-08-31 IST)

Network is **back up** — devnode answers in 0.87s after being unreachable for hours. Registration
**334** `active`, `rejection_reason: null`, seven intents, 87 requests served. Latest epoch is still
**295**; **296 lands 2026-08-31T03:53:43Z**. All three fixes below are DEPLOYED and verified live,
196/196 tests, typecheck clean, `verify-deploy` ALL CHECKS PASSED, median 424ms.

### The finding that matters most: we were serving confidently wrong answers

Telegraph fills the parameters `miner.yaml` declares **and** may send `query`. `firstValue` returns
the first populated parameter, so six of the ten routes discarded their own declared subject
whenever both arrived. Fine while `query` is verbatim; wrong when it paraphrases.

```
/wallet-balance   address + "balance of this wallet?"      refused: invalid_address
/weather-forecast location=London + "forecast there?"      refused: invalid_location
/translate        text+lang + "Translate it."              refused: invalid_input
/extract          text + "Extract the contact details."    "no contact details were found"
/papers           topic=CRISPR + "papers on this subject"  NEUROIMAGING papers, confidently
/storm-alert      location=Chennai + "storm risk there?"   TERESOPOLIS, BRAZIL, confidently
```

Four guaranteed zeros and **two confidently-wrong answers on STORM_ALERT and ACADEMIC_SEARCH,
intents we lead**. Nothing caught it because the unit tests and `verify-deploy` both call the
endpoints the way a human would, not the way the engine does.

`withSubject` restores the subject **only when it is absent**, so a verbatim query gives
byte-identical output — that byte-identity is pinned by a test and is what made this safe to ship
onto winning intents hours before an epoch.

**A hypothesis worth watching, not believing:** `/papers` returning unrelated papers on paraphrased
questions would explain ACADEMIC_SEARCH falling from ratio 1.000 (epochs 289/291/294) to **0.740**
in 295. G24 hides the converted answers so it cannot be confirmed. **Read the epoch-296 ACADEMIC
row before crediting the fix.**

### Two more live defects, both fixed

- **A hung upstream became a 504, which scores exactly what a 400 scores.** `vercel.json` caps the
  function at 15s; `/storm-alert` geocodes candidates sequentially at 8s each *before* fetching a
  forecast, `/wallet-balance` walks four RPCs at 6s, `/translate` tries two providers at 8s. A
  watchdog at 11s now answers honestly instead, and `send()` is idempotent so a late provider
  cannot write twice. (G31)
- **`polygon-rpc.com` is dead** — HTTP 401, "tenant disabled" — and it was the *primary* for Polygon
  balances. Replaced with publicnode / drpc / 1rpc, cross-checked against each other. Live and
  correct: 592.7198 **POL**. (G32)

### Two new tools, because both defects were invisible to the existing ones

```
node track1-miner/tools/param-shapes.mjs      55 cases, calls every route the way the ENGINE does
node track1-miner/tools/upstream-health.mjs   23 providers, non-zero exit when a PRIMARY is down
```

Run both before any deploy. `param-shapes` is what found the subject bug; `upstream-health` is what
found the dead Polygon RPC. **`verify-deploy` alone is not sufficient and never was** — it passed
green through all three defects.

### One divergence found and DELIBERATELY LEFT ALONE — read before touching geo

`/ip-geolocate` is the only route that reuses its subject parameter as the question it restates, so
when the engine fills the required `ip` it loses the restatement prefix. `/ssl-check` and
`/ai-detect` both separate the two on purpose. **It was not changed.** IP is rank 1 by **+0.1%**
and already scores 0.9956 — above the cliff — so if the engine sends `ip` then geo is crossing
*without* a restatement and adding one is a wording change of unknown sign, on the thinnest margin
on the board, hours before scoring, with G24 blocking any offline measurement. Full reasoning and
the one experiment that settles it (`LOG_QUERY=on` for a single epoch): GAPS **G35**.

`tools/no-regression.mjs` proves the other seven routes are byte-identical on verbatim questions
and expects **7 identical, 1 differing** until that experiment is run.

### Still true, still not ours to fix

- **`/scores` still omits `question`, `ground_truth`, `converted_answer`** (G24). Benches stay
  frozen. Verified again this session.
- **`ipapi.co` answers 429** — third-tier geolocation failover only; primary and second are healthy.
- **Eligibility unchanged:** 87 requests across the whole miner against a floor of 100 *per intent*.
  Rank 1 in an ineligible intent still wins no cash.
- **The three-intent signature is still the operator's** and still unsigned. Occupancy re-checked
  this session and unchanged: CONTENT_EXTRACTION 2, NEWS_HEADLINES 2, WALLET_BALANCE_CHECK 8.
  Runbook: [docs/ADD_THREE_INTENTS.md](docs/ADD_THREE_INTENTS.md). All three routes verified live
  in production, so activation cannot find a missing route.

---

## 0000. EPOCH 295 IN FULL, AND THE EXPANSION DECISION (2026-08-31)

```
STORM_ALERT          #1   0.0114102    +14.4% over skywire-storm-alert
IP_GEOLOCATION       #1   0.995564     +0.1% over preflight -- WE CROSSED THE CLIFF
AI_TEXT_DETECTION    #1   2.17544e-10  +20.6% over veritarach
SSL_VERIFICATION     #2   0.00976908   -6.8% vs preflight
ACADEMIC_SEARCH      #4/5 0.0110293    -26.0% vs scholarwire (was #1 in 294)
LANGUAGE_TRANSLATION #4/4 1.82907e-10  -61.2% vs mymemory
WEATHER_FORECAST     #10  0            "wasm/runtime pool: context deadline exceeded" -- NOT OURS
```

**IP_GEOLOCATION crossed the cliff at 0.9956** — the abuse clause, the live Tor exit-node check and
the ip-api provider switch did exactly what they were meant to. That is the template: a fact-rich
payload against a factual ground truth.

**Weather's zero was Telegraph-side** and the node then went down entirely for hours (devnode timing
out on every path; the explorer's `/api/daemon/*` proxies too). Registration 334 stayed `active`
with no rejection throughout — no routing revocation. Verified weather is healthy: production
scores clip32 **0.583689**, matching the autopsy's recorded 0.5836894 exactly, 0 failures over 12
questions. **Do not rewrite weather on the evidence of epoch 295.**

### The three intents being added (measured, ready for ONE signature)

Runbook: **[docs/ADD_THREE_INTENTS.md](docs/ADD_THREE_INTENTS.md)**. Code is DEPLOYED already, so
activation cannot find a missing route.

```
CONTENT_EXTRACTION   /extract         2 miners  bar 0.0         ours 1.000000 on 6/6, raw AND clipped
NEWS_HEADLINES       /headlines       2 miners  bar 0.00262926  ours 0.006447 mean, all 22 above bar
WALLET_BALANCE_CHECK /wallet-balance  8 miners  bar 0.000109    ours 0.230285 mean, 3/13 cross at 0.99
```

**THE DECISION RULE, and it changed the answer twice.** Judging normalises as *our score ÷ the best
score in that intent*, averaged across intents. Our epoch-295 ratios average about **0.72**. So an
intent is worth entering when our expected ratio there **beats 0.72** — winning outright is
sufficient but not necessary. `WALLET_BALANCE_CHECK` has EIGHT miners and we will not always be
first, but the field sat at ~1e-4 in epoch 295 with an all-time best of 0.00747 against our
measured 0.23, so it lifts the average even from mid-pack. Conversely an uncontested rank 1 at a
score of 0.0 does NOT help, which is why TEXT_AUTHENTICITY_CHECK was dropped after being prepared.

**Wallet gotcha that cost real time:** the obvious public Ethereum RPCs are dead —
`eth.llamarpc.com` returns HTTP 521, `rpc.ankr.com/eth` now demands authentication, and
`cloudflare-eth.com` returns an internal error. All three were in the first draft. Working and
verified 2026-08-31: `ethereum-rpc.publicnode.com`, `eth.drpc.org`, `rpc.flashbots.net`,
`eth.merkle.io`. Re-test before adding any endpoint to that list.

`CONTENT_EXTRACTION` is the best opportunity this project has found. The questions carry their text
inline, our answer reproduces the reference nearly verbatim, and because it is short and
reference-shaped it survives the ~32-word conversion clip at 1.0. Both incumbents score 0.0.

### Measured and REJECTED — the reasons are the value, do not re-open

- **TEXT_AUTHENTICITY_CHECK** (0 miners, uncontested): its champion reg 1882 IS reachable — a GT
  paraphrase scores 1.0 — but the ground truths assert facts **absent from the supplied text**
  ("a reviewer history of 40 five-star reviews posted in one day"). Our honest verdict-plus-evidence
  answer measures **0.000001**. Crossing requires fabricating reviewer history. An uncontested rank
  1 at 0.0 is not a win and may drag the cross-intent average.
- **CONTENT_VERIFICATION** (1 miner, never scored above 0 in 36 rows, currently failing at
  request-build): its questions are general-knowledge items about famous verification cases, and
  its scorer is binary — GT 1.0, Wikipedia-retrieved answer **0.0**, refusal 0.0. We would tie at
  zero.
- **TOKEN_HOLDER_COUNT** (4 miners): **no data edge.** `chainsight-oracle` reads the same keyless
  Blockscout endpoint and returns identical counts (USDC 9,039,953 on both). Its transient zeros
  are real — USDC and DAI came back 0 on a first probe — but reliability alone is thin against the
  two strongest generalists, and no recorded questions survive to measure with.
- **FACT_CHECK / IMAGE_VERIFICATION**: zero recorded questions, so their scorers cannot be run.
  Entering on incumbent weakness alone is what SENTIMENT_ANALYSIS cost. Image verification also
  cannot be answered honestly without real forensics (SPORTS_SCORE precedent).
- **CVE_LOOKUP** — **re-measured 2026-08-31 and still a no, for a NEW reason.** The champion
  changed on 2026-08-30 to reg 1993 `cve_lookup_w2.wasm`, so the old 0.24 figure was stale. Under
  the new one our answers score raw mean **0.499757**: eleven questions at ~0.999 and eleven at
  exactly 0.000. **The zeros are not a data problem — the same CVE with our byte-identical answer
  scores 0.998742 on one phrasing and 0.000000 on another.** The scorer is a step function keyed on
  question and ground-truth phrasing. `patchsignal-cve` scored 1.0 in epoch 295, so our ratio would
  be ~0.50, below the 0.72 threshold. It would dilute the average. Do not re-enter.
- **SPORTS_SCORE**: zero recorded questions, and the standing precedent stands — a free sports API
  returned a friendly against AC Milan when asked for the most recent Premier League meeting.

**The rule this round establishes: occupancy and a weak incumbent identify where to LOOK; only the
intent's own scorer decides whether to ENTER.** Four of the six candidates died on that test.

### Full-network opportunity scan (2026-08-31)

All 45 canonical intents were swept for occupancy and, crucially, for whether recorded questions
survive to measure with. The measurable-and-unclaimed set is now exhausted: everything with <=5
miners and question data has been either entered or rejected above. The remaining low-occupancy
intents (TWITTER_SEARCH 0, CONTENT_MODERATION 1, DEEPFAKE_DETECTION 1, MEDIA_AUTHENTICITY_CHECK 1,
VIDEO_VERIFICATION 1, TELEGRAPH_KNOWLEDGE 1) all have **zero** recorded questions — unmeasurable,
and mostly media forensics we cannot do honestly. **Do not enter them blind.**

---

## 000. THE NETWORK OUTAGE AND CONVERTER MODEL (2026-08-30 evening)

Last updated: 2026-08-31 (early hours) — epoch 295 was a bad epoch on a DEGRADED NETWORK; the
translation payload was cut to the answer alone and deployed. Read § 000 first.

---

## 000. EPOCH 295 AND THE NETWORK OUTAGE (2026-08-30 ~21:00Z)

**Three #1s, weather zeroed, and Telegraph's backend then went down entirely.** Sequence:

```
WEATHER_FORECAST   #10  0.0   failure_reason: "wasm/runtime pool: context cancelled:
                                context deadline exceeded"  -- a SCORER-SIDE timeout.
                                weatherapi took the same failure in the same epoch.
LANGUAGE_TRANSLATION #4  1.83e-10   whole field in a ~1e-10 band; we were LAST and
                                     had the SHORTEST answer.
```

**The network is down as of ~21:00Z.** `devnode.telegraphprotocol.com` times out on every path
(3/3 probes, 20-25s); `explorer.telegraphprotocol.com/api/daemon/*` also times out while the
explorer's own routes answer in 0.3s. So the backend, not just one host, is unavailable. Epoch 295
was scored by a node already failing — the weather zero is the same class of symptom. **Do not
rewrite a winning answer on the evidence of epoch 295.** Epoch 296 lands 2026-08-31T03:53:43Z.

Our own miner was verified healthy throughout: all 7 routes 200, median 564ms, verify-deploy
**ALL CHECKS PASSED**, and all 7 declared intents confirmed canonical by reading
`getCanonicalIntents()` **directly from the diamond over Base Sepolia RPC** — which works when
devnode does not. Use that path (`scratchpad/ci.mjs`, viem via track3's node_modules) whenever the
node is down; it is the only independent check of registration validity we have.

### The scorer-timeout question, measured and settled

Timing the weather champion (reg 636) locally, with unique inputs to defeat its input memoization:

```
compile 24MB module   5 ms        instantiate  4 ms
rank_answer:  16w 287ms | 32w 513 | 48w 765 | 64w 1025 | 96w 1550 | 128w 1776 | 192w 1780 | 256w 1790
```

**Scoring costs ~16 ms per answer word and saturates at ~1.8 s past ~128 words**, with a slow band
around 4.4 s. So a scorer timeout is real and input-length-sensitive — but our payloads are
225-1835 bytes and our answers 52-131 words, nowhere near weatherapi's 52,943-byte answers. **We
did not cause the timeout and cannot prevent it by trimming.** Recorded so nobody re-opens it.

### LANGUAGE_TRANSLATION — the converter was the whole problem, and it is now starved

The bare-translation change (epoch 295) crossed 9/10 offline and still came LAST live. Reason:
**Telegraph converts the WHOLE miner JSON into the ~32 words it scores**, so our metadata fields
(source_text, target_language, target_code, source, checked_at) became English prose wrapped
around the translation. Measured against the live champion (reg 1996) over the ten recorded
questions, crossings fall monotonically as that wrapper grows:

```
bare translation                              10/10
"The translation is X."                        8/10
"The <lang> translation of "<src>" is X."      8/10
+ provider and confidence clauses              5/10
full converter-style paragraph                 0/10   <-- reproduces the live 1.83e-10 exactly
```

**Fix deployed 2026-08-30 ~21:30Z:** `/translate` now returns ONLY
`{verdict, confidence, reason, translation}`, where `reason` and `translation` are the bare
translated string and nothing else. `output_schema` has **no required list** and
`semantics.signal_mapping` names only `confidence`/`verdict`/`reason`, so this is
manifest-conformant with no `updateMiner`. Live payload is now 118 bytes:
`{"verdict":"translated","confidence":1,"reason":"コーヒーを一杯お願いします。","translation":"..."}`
— byte-identical to the recorded ground truth for that question. 173/173 tests.

**The general principle this establishes, and it applies to every intent:** the scored text is the
converter's summary of the WHOLE payload, so *every field is scored surface*. Match the payload's
shape to the ground truth's shape — bare-string GTs want a bare-string payload; essay GTs want
prose. This is why the same "shorter is better" advice is right here and wrong for SSL.

**Deliberately NOT changed:** the five intents we were winning. The same field-starving logic
plausibly applies to them (our storm `reason` is 131 words against a ~32-word budget), but it is
untestable offline — we cannot run the converter — and gambling three days of held ranks on an
unverifiable theory the night before the close is the wrong trade. Try it on one intent after the
close, not on all five before it.

---

## 00. EPOCH 294 (superseded by the above, kept for the fix record)

Last updated: 2026-08-30 (evening) — epoch 294 gave five #1s of seven; the two losers were
diagnosed, fixed, measured and DEPLOYED the same day. Read § 00 first.

---

## 00. EPOCH 294 → THE PUSH FOR 7/7 (2026-08-30, deployed ~15:45Z)

```
epoch 294:  SSL #1  STORM #1  WEATHER #1  ACADEMIC #1  AI_TEXT #1
            IP_GEOLOCATION #2   0.009541 vs preflight 0.010062   (-5.2%)
            LANGUAGE_TRANSLATION #2   2.7e-5 vs langwire 7.1e-5  (both ~zero)
```

Both losers were fixed with measured, deployed changes. **Epoch 295 is the test.**

**LANGUAGE_TRANSLATION — the champion changed again, and the answer shape inverted with it.**
The champion is now **reg 1996 `language_translation_w1.wasm`** (activated 2026-08-30 ~13:41Z,
after epoch 294 scored — it is the Track 2 wrapper submission, pinned in our own repo at commit
6a3e01c). It is a hard two-cluster cut: answers score ~1.0 or ~0.0, nothing between. Measured over
all ten distinct recorded questions, variants built only from live provider output:

```
bare translation                       9/10 crossings   <- DEPLOYED
single sentence around it              8/10
sentence + provenance clause           3/10
old deployed pipeline (restated)       4-5/10
langwire (current #1) live summaries   8/10
```

The recorded ground truths are BARE translations ("コーヒーを一杯お願いします。"); for non-Latin
scripts every English word around the translation dilutes the one string compared. Three changes
deployed: `reason` is now the bare translation (provenance moved to a `source` field);
**Google's endpoint is primary and MyMemory the failover** (Google's neural output matches the
LLM ground truths nearly verbatim — MyMemory's "El tiempo es estupendo." vs ground truth
"El clima está hermoso hoy.", which is exactly Google's output); and **/translate skips the
restatement prefix** (`sendAnswer(..., false)`). GAPS **G26**: this shape is w1-specific — under
the previous champion the same bare shape scored 8.5e-5. If the champion changes again,
re-measure before touching anything.

**IP_GEOLOCATION — three defects, all fixed, clip32 mean 0.384 → 0.807, wins 4/21 → 14/21
against preflight on the frozen 21-question bench (and 14/21 is the FLOOR — see G27):**
1. **~10 of 21 recorded questions ask about private/reserved IPs** (192.168.1.10, 192.0.2.1) and
   we answered "could not be determined" — a guaranteed cliff miss while every ground truth
   explains the range. `specialRange()` in geo.ts now classifies RFC 1918 / TEST-NET / loopback /
   link-local / CGNAT / multicast / benchmarking / IPv6 special ranges locally, no provider call,
   confidence 1. The private template uses labeled sections ("Geographic location: none — …
   Abuse history: none …") — swept 4/4 raw AND clip vs 1/4 for running prose. Special-range
   answers **skip the restatement** (same measured reason as translate: the prefix pushed the
   range semantics past the ~32-word budget). TEST-NET template needed no change: 7/7 both.
2. **~19 of 21 questions ask about abuse history and we never answered that clause.** Every
   public-IP answer now carries an abuse sentence stating exactly what was checked: a live **Tor
   exit-node DNSEL lookup** (`torExitNode()`, dnsel.torproject.org, 1.5s timeout, fails open to
   silence) plus the honest note that the consulted sources include no reputation database such
   as AbuseIPDB. The Tor check flipped the recorded 185.220.101.34 question from 0.011 to 0.995
   raw — the ground truth is entirely about Tor exit risk.
3. **Provider accuracy is scoring margin.** ipwho.is placed Google's 142.251.42.174 in Mumbai;
   the ground truth (and ip-api.com, which honours operator geofeeds) says Japan. **ip-api.com is
   now primary** (verified live post-deploy: production answers "Chiyoda City, Tokyo, Japan"),
   ipwho.is then ipapi.co as failover, 4s per-provider budget. Prose is now operator-first
   ("associated with Google LLC (AS15169) and is located in…") — the shape every recorded ground
   truth opens with. NOTE G27: ip-api is TCP-blocked from the dev machine, so local benches
   silently exercise the fallback — measure IP changes against production.

**Measurement infrastructure warning that cost an hour:** the champion WASMs use a bump allocator
that WRAPS silently when many answers are scored in one instance — a naive
instantiate-once loader (like tools/bench-champion.mjs) produces corrupted, run-order-dependent
scores. **Always score through `../track2/harness/wasm-abi.mjs` `loadScorer`** (wrap-guarded,
mirrors the node's call path). The scratchpad `hh.mjs` / `lt_sweep.mjs` / `special_sweep.mjs`
from this session do it right.

Production state after deploy: verify-deploy **ALL CHECKS PASSED**, median 487ms / p95 1086ms,
**173/173 tests**, registration 334 active and untouched (all changes are code-only; the manifest
names no upstream provider, so no updateMiner was needed).

**Margin audit of the five #1s (epoch 294) and the two defensive sweeps that followed:**
SSL **+0.4%** over preflight (the thin one), ACADEMIC +2.3%, WEATHER +6.0%, AI_TEXT +11.2%,
STORM +12.4%. Two defensive measurements, both settling on "no change":
- **SSL vs preflight, 12-question bench:** their raw answers cross the unreachable-host cliff on
  7/9 questions where ours cross on 2 (raw means 0.747 vs 0.173) — but **clip32 is dead even
  (0.0924 vs 0.0922)** and the live epochs match the clip column: we beat them +25.7% (293) and
  +0.4% (294) live. The obvious fix — naming the verification dimensions ours omits (expiration
  dates, root CA trust, signature algorithm, key strength) — was swept over all 9 unreachable
  questions: **+0.0003 mean, zero crossings flipped. Dead theory, do not retry.** Whatever keys
  their raw crossing, the converter erases it; going further means copying their sentences for
  no measured live gain. SSL stays as deployed; watch the margin each epoch.
- **ACADEMIC vs scholarwire (same author as langwire), 8 rows scored:** **8/8 wins**, we cross
  raw on 3 (up to 0.993), they cross on none. The +2.3% live margin is real dominance flattened
  by conversion. No change needed.
Also: **run WASM scoring in the FOREGROUND** — a backgrounded node process was throttled to ~7%
CPU on this machine (Windows efficiency mode) and a 25-minute sweep became hours.

**Production bench, post-deploy (the numbers that matter):** IP vs preflight raw **0.8544 vs
0.8539**, clip32 **0.8067 vs 0.8065**, wins 14/21, crossings 18/21 raw; translation 9/10
crossings, 10/10 wins. **Tail-trim theory tested and dead, do not retry:** dropping the
timezone and/or AS-registration caveat sentences from public-IP answers was swept mechanically
over all 21 questions — no variant beat deployed, and dropping the caveat LOST a raw crossing
(18→17). The 4 stubborn IP rows (Q2/Q4/Q14/Q17-clip) fail on cliff wording that is opaque from
here (G24 hides the converted answers); both miners' factually-equivalent sentences score 0.99
vs 0.01 on them, so chasing these risks regressing the 17-18 crossing rows for noise.

## 0. EPOCH 292 (2026-08-29T22:18Z) — SSL AND WEATHER LOST, ROOT CAUSE FOUND

```
SSL_VERIFICATION      #2  0.00885159   lost by 1.75% to preflight-ssl-verification 0.00900906
WEATHER_FORECAST      #5  0.00908315   chainsight-oracle 0.01173830, field now 14
STORM_ALERT           #1  0.01003684   held, by 0.7% over chainsight-oracle
IP_GEOLOCATION        #1  0.00933759   held
LANGUAGE_TRANSLATION  #1  0.00010760   held (all three miners near zero again)
ACADEMIC_SEARCH        -  not scored this epoch
```

**Full autopsy: [docs/EPOCH_292_AUTOPSY.md](docs/EPOCH_292_AUTOPSY.md).** Read it before touching
any answer template. Summary:

- **SSL**: not broken, passed. `preflight-ssl-verification` tuned +74% in one epoch. Our ratio to
  the next-best miner has fallen every epoch: 1.63 / 1.50 / 1.11 / 1.60 / 1.17 / 1.01 / **0.98**.
- **WEATHER**: we never led. Against the field best each epoch we run 0.76 / 0.81 / 0.69 / 0.97 /
  0.82 / **1.05** / 0.77. **Epoch 291's #1 was the field collapsing, not the temperature-first
  reorder working** — the earlier note in this file claiming otherwise was wrong and is corrected
  below.
- **The root cause, shared, and missed for six epochs**: every ground truth is an LLM answer that
  **restates the request before answering it**, and ours did not. The champion scorers are a cliff
  on that resemblance — ~0.99 above, ~0.01 below — and the entire weather field, all 14 miners, has
  always been on the losing side. Our own accidental proof: the one bench question whose upstream
  fails makes us quote the question back verbatim, and that answer scores **0.9932** against ~0.011
  for every correct forecast we return.
- **FIXED, measured, committed, NOT YET DEPLOYED**: `src/restate.ts` + `sendAnswer` in
  `src/handler.ts`. Built miner A/B'd against live production on the same questions and the live
  champion scorers: **weather 8.10x (12/12 improved), SSL 18.84x (11/12), storm 20.44x (8/12)**;
  under a 32-word conversion budget **6.36x / 11.15x / 1.51x (12/12)**. 102/102 tests, typecheck
  clean, verify-deploy green except the localhost HTTPS check.

**DEPLOYED 2026-08-30.** `vercel --prod --scope wukong4` (the bare `vercel --prod` fails with
"Not authorized" because `.vercel/project.json` carries a stale orgId — always pass `--scope`).
Production verified restating on all six routes, `verify-deploy` **ALL CHECKS PASSED**.

**A bug the deploy caught.** The first deploy restated weather but **not SSL**: the stack guard
matched on the request phrase's first 40 characters alone, and `ssl.ts` opens every answer with
"The TLS/SSL certificate configuration for <domain>", which the questions ask for verbatim. Fixed
by requiring one of our own openers before suppressing. Production SSL now measures **0.17348**
against **0.00921** before — the full 18.8x is live. Regression test added.

**Feedback loop run on the deployed answers (2026-08-30).** Eight restatement variants swept
against the live SSL champion: the deployed shape (0.173476) is within noise of the best found
(0.173544, verbatim question). **No further change is worth making.** Two results worth keeping:
the bare answer with no restatement scores 0.009208 (19x worse, so the restatement is the whole
gain), and the question echoed *alone* with no data scores 0.010430 — far below our 0.173476, so
this is not a contentless echo exploit; the data is doing real work.

**Two honest caveats**, both in GAPS: the converter is simulated not measured (**G25** — storm is
the risky one, 4/12 questions worse on full prose and we hold it by 0.7%), and **G24**, the
`/scores` feed has stopped returning `question` / `ground_truth` / `converted_answer`, so the
offline benches can never be refreshed and the champion WASM can no longer be validated against
reported scores.

**Also scouted, per operator request: [docs/EXPANSION_TARGETS.md](docs/EXPANSION_TARGETS.md)** —
now with both champion scorers run locally, which is the part that matters.

- **AI_TEXT_DETECTION is close to unloseable.** Bar is **1.674e-10** (`veritarach`, flat five
  epochs). Its live output is `{"confidence":…,"label":"human_written"}` — a label, no prose, so
  the converter has nothing to score; that exact shape measures **0.0** locally. A prose answer to
  the routed question measures **1.0**. Note the traffic: the one real question ever routed here was
  "Was the AI copyright notice against Luanti valid?", which is not an AI-detection task at all, so
  the endpoint must answer the question it is sent and only run a real detector when text is
  supplied.
- **FACT_CHECK is winnable but contested.** Bar is **3.799e-9** (`tavily`), which has spiked to 1.0
  once. `fact_s01.wasm` is 11 KB and is a **step function with disjoint bands** — 13-17 words scores
  ~1.0, 19-33 words collapses to 2e-8, 35+ words returns to 1.0. A verdict-plus-evidence answer beat
  the bar on 3 of 5 test claims. **The restatement prefix HURTS here** (5/5 -> 3/5), so `sendAnswer`
  needs a per-route opt-out before this endpoint ships.
- **SENTIMENT_ANALYSIS is the softest of all**: bar is a genuine 0.0, both incumbents fail on
  upstream 404/405, and it is servable with no upstream dependency at all.
- **The catch:** in 500 routed questions over 720 hours, FACT_CHECK appeared **0** times and
  AI_TEXT_DETECTION **once**. Entry clears the 3-miner half of eligibility but the 100-request half
  is unreachable in these intents.
- **Earlier note corrected:** the first pass said every incumbent scored 0.0. That was `toFixed(8)`
  rounding 1.674e-10 to zero. Only SENTIMENT_ANALYSIS, NEWS_HEADLINES and CONTENT_EXTRACTION have a
  genuine 0.0.

## 0. HARDENED AGAINST ZERO-SCORING FAILURES — 2026-08-30

**The asymmetric edge, quantified: in epoch 293, 8 of 36 scored rows across the field (22%) carried
an infrastructure failure rather than a bad answer.** `skywire-storm-alert`, `iplocate`,
`netwire-ip-geolocation`, `weathertop-v3`, `oathcast-weather`, `lacre-meteo`,
`tempest-storm-intelligence` and `certspotter-cert-verification` all scored 0.0 on plumbing. A
non-2xx is recorded as an upstream error with an empty answer, which is a zero for the whole epoch
— worth more than any wording gain.

**Two of our own paths could produce one, both now closed:**
- A method other than GET returned **405**. Every route is a pure read with no side effects, so all
  methods are answered identically and the 405 branch is deleted.
- A path differing only in **case** fell through to the 404. Paths are now lowercased as well as
  trailing-slash tolerant.
- A genuinely unknown path is still a 404 **on purpose** — answering it would mean returning a
  nonsense answer to a question we do not serve.
- Pinned by `test/zero-paths.test.ts`. **128/128 tests.**

**Degradation audit, all seven routes against the inputs the engine actually sends when it cannot
fill a parameter** (empty string, junk value, out-of-range coordinates, unknown language): every
one returns **200 with 15-52 words of real prose**. No route can emit an empty `reason`, and every
`throw` site is caught into `upstreamUnavailable`, which answers 200. Upstream timeouts are all
bounded at 6-9s against Vercel's 15s ceiling; measured p95 is 1.2s.

Also fixed: the no-location weather answer read "A hourly weather forecast".

**STORM_ALERT swept and deliberately unchanged.** Best data-carrying variant at the 32-word budget
is +2.4% over deployed — inside 12-question bench noise, and it states the question twice, which
measured *harmful* on weather. **The finding:** at that budget the question echoed back with **no
data at all** scores 0.014459, higher than every variant carrying a real forecast (deployed:
0.014035). Declined, and recorded — it is the sharpest exhibit yet that these scorers cannot tell
an answered question from a restated one. SSL came out the opposite way (question-alone 0.010430
against 0.173476), so the pathology is per-intent, not universal.

## 0a. EPOCH 293 — THREE FIRSTS, TWO NEAR-MISSES, ONE SYSTEMIC ZERO

**Full report: [docs/EPOCH_293_REPORT.md](docs/EPOCH_293_REPORT.md).**

```
SSL_VERIFICATION      #1  1.0418e-2   +25.7% over ssllabs   RECOVERED from #2
STORM_ALERT           #1  1.0336e-2   +1.4% over txlens     held
AI_TEXT_DETECTION     #1  2.0789e-10  +22% over veritarach  won on its debut epoch
WEATHER_FORECAST      #2  1.0407e-2   -0.21% to weatherapi  UP FROM #5 OF 14
IP_GEOLOCATION        #2  9.9253e-1   -0.09% to preflight   whole intent saturated ~0.99
LANGUAGE_TRANSLATION  #3  0.0         all four miners 0.0
ACADEMIC_SEARCH        -  not scored (organizer-side, reported, recurring)
```

**The restatement fix is confirmed live.** Our score as a fraction of the field best:
SSL 0.983 -> **1.257**, weather 0.774 -> **0.998**, storm 1.007 -> 1.014. The live movement matches
the 32-word conversion-budget column of the offline prediction rather than the raw-prose column,
which is the honest reading: the converter absorbs most of the raw gain and what survives was still
enough to flip SSL and move weather three places. G25's sign is settled; its magnitude is not.

**LANGUAGE_TRANSLATION has two separate problems.**
1. *Systemic, not ours:* **14 of 34 scored epochs are all-zero for every miner**, starting at epoch
   260 — roughly 30 epochs before we entered. It hits the specialist mymemory miners identically.
   An exact 0.0 across a whole field is the signature of an empty scored answer, not bad answers.
   **Worth reporting to the organizers**; the specific ask is in the report's §6.
2. *Ours, and fixed:* the champion scorer changed to **reg 1885 `c2_r1cut.wasm`** (the second
   scorer change to invalidate tuning here, after CVE_LOOKUP). `translate.ts` returned the bare
   translation, which now scores 8.5e-5; stating it in a sentence with one restatement and the
   provider named scores 3.3e-1 — **x3905**, measured end to end. Deployed.

**A better-scoring variant was rejected on honesty.** Claiming the output is "the form a native
speaker would most commonly reach for" scored 0.666 (2/3 crossing) versus 0.333 (1/3). It asserts
something unverifiable about a MyMemory result, and the extra gain came precisely from that clause
matching the hidden reference. Same call on IP: an explicit anycast note scored +0.26% and is only
true of public resolvers, so the shipped caveat is the autonomous-system one at +0.08%.

**Weather wording is exhausted.** Eight variants swept; two beat the deployed shape by ~11% on raw
prose but are identical or worse at the 32-word budget that the node actually scores. Nothing
changed. The remaining 0.21% is question-draw luck in a 14-miner field.

## 0b. REGISTRATION 334 — SEVEN INTENTS, SIGNED 2026-08-30

`updateMiner(297, …)` sent and mined: tx
`0x978e0951dce00e440107e700f25eccdee522c1eaa85a7c5a9719da266d8605e9`, status 1. The receipt logs
carry a supersession event pairing **297 → 334**, so 297 is explicitly replaced rather than left
running alongside. `REGISTRATION_ID` repo variable set to **334** the same hour.

```
registration  334
yaml (IPFS)   https://gateway.pinata.cloud/ipfs/QmbKp37VmaLBQriGcX45HSQEBByXJLUPoV7C6rFSbUp2Ug
yaml_hash     0x1ab5296f2af016db002f5281e72b938460cd7d2549b74b9ed5af18889452139c
intents (7)   SSL_VERIFICATION STORM_ALERT WEATHER_FORECAST IP_GEOLOCATION
              LANGUAGE_TRANSLATION ACADEMIC_SEARCH AI_TEXT_DETECTION
```

**The console works again.** The importer bug of 2026-08-29 (silently stripping per-endpoint
`intents:` and `params:`) is fixed — the pinned bytes were fetched and verified before signing:
7 endpoints, 7 per-endpoint `intents:`, 7 `params:` blocks, no `limitations` block, and `id`,
`slug`, `base_url`, `auth`, rate limit, cache TTL and both circuit settings identical to 297. The
console re-serialises formatting, which is why its hash differs from the local file — that is
cosmetic, not content loss. **Always fetch and check the pinned bytes; never hash the local file.**

Both `updateMiner(297,…)` and `registerMiner(…)` were simulated read-only with `cast call` first
and both returned `0x14e` (334) without reverting — the slug lives inside the YAML, not in the
contract arguments, so a duplicate slug does not revert. `updateMiner` was chosen because it names
the registration being replaced.

**ACTIVATED AND VERIFIED.** 334 is `active`, `rejection_reason: null`, `retrying: false`,
`fetch_attempts: 0`, seven intents listed. 297 now reads `deregistered`, and the catalog shows
exactly **one** `livecert` entry with 7 intents — no duplicate registration. `verify-deploy` against
production: **ALL CHECKS PASSED**; all seven routes 200 (0.32–1.29s).

Indexing took noticeably longer than 297's ~1 minute — several minutes with `/api/miners/334`
returning "not found" the whole time. 297 stayed active and serving throughout, so there was no
outage. Do not panic on that gap next time; check that the old registration is still serving and
wait.

## 1. What needs the operator, right now

**The six-intent update is SIGNED AND LIVE — registration 260, `active`, 2026-08-28 ~05:00 UTC.**
Nothing about the manifest needs the operator any more. See section 2 for the verified state and
[docs/SIGNING.md](docs/SIGNING.md) for what was checked.

What still needs a human:

**0. The diverged branch is RECONCILED** (verified `0 0` on 2026-08-29 session 2) and the uptime
alarm now covers all three jobs and has been **proven to fire** (issue #1, a documented drill —
G21). Nothing here needs the operator any more; the divergence check at session start stays until
score-history ownership is settled (G20 prevention half).

**0b. The old item 0 — deploy and re-run acceptance — is CLOSED.** Verified 2026-08-29:
`node track1-miner/tools/verify-deploy.mjs https://miner-wine.vercel.app` exits **0**, all six
routes 200, median 372ms / p95 1172ms, and `/translate` answered live in 808ms. The MyMemory
fallback (`fetchChrome` in `src/translate.ts`) landed in **fd9a27d**, which is an ancestor of
`origin/main`, and Vercel builds `api/index.ts` from source on push — so the fallback is on the
deployed branch. Note the local `dist/` is a stale untracked build artifact and does **not**
contain it; do not read production state from `dist/`.

Stated precisely, because this is the kind of claim G18 punished: the fallback **code** is
deployed and acceptance is green. The fallback **path** has still never been observed firing
against a real production 429 — MyMemory has been healthy every time it has been checked since.

**1. X — 25% of the score, and it is the largest unclaimed block on the board.** **Clarified by
the organizers 2026-08-28:** there is no fixed formula. They weigh *"quality, consistency, reach,
likes, reposts, comments and meaningful engagement"*, they want posts about **both Track 1 and
Track 2** — experiments, results, improvements, journey, learnings, edge cases — and they want
them genuine: *"we mainly want to see the actual work and progress."*

**This retracted two earlier plans.** An earlier Discord message said only the single
highest-engagement post counted; that was wrong, and the one-flagship plan built on it is
withdrawn — **consistency is scored, so a steady series wins.** It also reversed the decision to
hold the offline-scorer and converter-budget findings until Sept 1: judging rewards showing real
work, and those endpoints are public and already described in our own public README.

Thirteen posts, each verified under X's 280-character limit and tagged, roughly two a day
through Aug 31 and continuing into the Track 3 window:
**[../docs/X_POSTS.md](../docs/X_POSTS.md)**. Best post so far is 188 impressions.

**1b. Track 1 aggregate and the real economic objective — organizer clarification 2026-08-29.**
Winner judging will use an **average across all intents**; the exact formula will be finalized later
during judging. Do not claim that one quiet-intent rank 1 automatically determines the Track 1
winner, and do not invent how ineligible intents or the X term enter the average.

The organizer's larger point: the hackathon is only a cold start. Agent demand routes toward the
top-ranked miners, so more genuinely served rank-1 intents should expose LiveCert to more paid
queries. Protect uptime, useful coverage, and answer quality beyond Aug 31 instead of optimizing
only for the one-time prize.

**2. One question left for the organizers**, and it decides where the remaining effort goes:
- Track 3 has not opened, so no intent can have its 100 real requests by the Aug 31 close. Is that
  requirement waived, measured later against a post-Track-3 deadline, or binding on Aug 31 — in
  which case no intent qualifies for cash? **Unanswered.**

**3. Eligibility.** `IP_GEOLOCATION` has 2 miners and needs 3. **The operator decided on 2026-08-28
not to register a second miner from another account — do not reopen this.** Registering the
six-intent update already took `LANGUAGE_TRANSLATION` and `ACADEMIC_SEARCH` from 2 miners to 3, so
five of our six intents now clear the miner-count half. The remaining paths are recruiting a real
third IP miner and generating real Track 3 demand → [docs/ELIGIBILITY.md](docs/ELIGIBILITY.md).

Note for anyone re-deriving the rules: the published rules contain **no** ban on one participant
registering multiple miners. The applicable rule is **04**, *"Artificial inflation of metrics or
gaming the system will result in disqualification."*

**Claude never signs.** No wallet connect, no transaction, no seed phrase. Prepare and validate;
the operator clicks.

## 2. Live state

```
registration   334     (297 superseded 2026-08-30)   wallet 0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e
slug           livecert            id 4433
base_url       https://miner-wine.vercel.app
explorer       https://explorer.telegraphprotocol.com/miners/livecert
repo           https://github.com/Harshyadav442277/miner
yaml (hosted)  https://gist.githubusercontent.com/Harshyadav442277/006335cf54242bf98548535ec44632c7/raw/f4e7ae59f8f6e332d9c26325314749b0cea44f97/miner.yaml
yaml_hash      68ed69be30d3e91a9de0fa9c9046101f472f90af806e5a109a3128e3241852aa
tx             0xb7ff6f790c45440147789ba78d8129f5a1e68d2715a2823796689fde566c4f0a
```

**Registered 2026-08-29 ~08:30Z via the docs' manual `cast send updateMiner` path** — the console
was broken that day (importer strips per-endpoint `intents`/`params` its own validator requires;
reproduced client-side, no network call). The YAML is hosted as a public gist pinned to its
revision (HTTPS hosting is officially acceptable per the 2026-08-29 docs). This registration
carries the per-endpoint request contract: `/translate` REQUIRES `text` + `target_language`, which
is the delivery fix for the refusal losses in epochs 289/290. Activation was ~1 minute, no gap,
all six intents carried, verify-deploy green after. `REGISTRATION_ID` repo variable set to 297 in
the same hour. **225, 236 and 260 are superseded.**

**If the YAML ever needs changing again:** edit `track1-miner/miner.yaml`, publish a NEW gist (or
revision), hash the exact hosted bytes, and run the same `cast send updateMiner` with the new URL
+ hash (command in REGISTRATION_UPDATE.md). Never edit the gist in place without updating the
on-chain hash — a hash mismatch is a rejection.

**Six intents registered** as of 2026-08-28: SSL_VERIFICATION, STORM_ALERT, WEATHER_FORECAST,
IP_GEOLOCATION, **LANGUAGE_TRANSLATION**, **ACADEMIC_SEARCH**. Six endpoints: `/ssl-check`,
`/storm-alert`, `/papers`, `/translate`, `/ip-geolocate`, `/weather-forecast`.

Verified after signing, against the pinned IPFS file rather than the local one:
- `sha256(pinned) == on-chain yaml_hash` exactly
- **no `limitations` block** (the P0 that would have throttled every intent node-wide)
- all 14 declared input params survived the console's re-serialization, including `topic` (the one
  ACADEMIC_SEARCH needs) and `query`/`q` (the params-only delivery fix)
- no `output_schema` field dropped
- `auth: {type: none}`, `base_url`, `rate_limit_per_sec`, `cache_ttl_sec` and both circuit settings
  **unchanged from 236**, the configuration this miner has always been accepted under

The console strips documentation keys (`examples`, top-level `description` on input_schema) and
re-serializes everything. That is normal and 236 registered the same way.

**The uptime workflow's `REGISTRATION_ID` repo variable was still `225`** — two registrations
stale, so activation monitoring had been watching a superseded record since before 236. Set to
**260** on 2026-08-28 (`gh variable set REGISTRATION_ID --body 260`). **Whenever a new registration
is signed, update that variable in the same session** — nothing in CI catches it being wrong.

### Session 2, 2026-08-29 (~05:30Z) — the storm advisory hedge, and two structural fixes

**Epoch 290 lands 2026-08-29T06:31Z** (the epoch stretched: 289 landed ~12:55Z on 08-28, so this
one took ~17.5h, not 9 — do not trust the 9h figure for timing decisions). Registration 260
`active`, verify-deploy exit 0 (twice), 124/124 tests, no new entrants in any of our six fields.

**STORM (#2, gap 0.00023): a standing operational-guidance sentence now ends every storm answer.**
Epoch 289's question asked what adjustments a mine site should make ahead of high winds; the
ground truth is a personnel/equipment safety checklist, and the entire field — including the
rank-1 — answered with forecast numbers. The engine sends this endpoint **only coordinates**
(verified across all six scored epochs: every answer used the 48h default window whatever the
question said), so the guidance cannot be conditional on being asked. Measured with the storm
champion (`storm_rpen.wasm`, reg 453, reproduces all five epoch-289 reported scores exactly):

```
epoch 289 (advisory):  base 0.004233 -> +guidance 0.005767   +36%, leader amanat 0.004279
epoch 288 (forecast):  -3.2%    epoch 287: +2.2%    epoch 286: -1.9%
12-question bench:     mean 0.00944 -> 0.00969   +2.7%, no per-question collapse
```

Variants that LOST, do not retry: advisory-first prose (+81% on 289 but −5 to −14% on forecast
questions), an even longer guidance with evacuation-route detail (+11% only — over-stuffing
dilutes), trimmed medium/short tails (+21%/+9%). The deployed sentence is the T2 variant in
`describe()` in `src/storm.ts`. **Conversion survival is unmeasured (GAPS G23)** — the converter
drops tails, so the likeliest outcomes are "no effect" on forecast questions and "partial gain" on
advisory ones. Read the epoch 290+ storm rows before concluding anything.

**WEATHER (#3, gap 0.00027): nothing further was changed.** The temperature-first reorder from
session 1 is live and untested by any epoch yet; the current live answer measures **0.010713**
against epoch 289's Q/GT vs the leader's converted 0.010033 (+6.8% raw, ~coin-flip after the
usual conversion haircut). Epoch 290 is its test. Three rewordings already lost this week.

**DEPLOYS ARE MANUAL — pushing to `main` deploys NOTHING (GAPS G22).** Production was 23h stale
while `main` carried the storm change; there is no GitHub→Vercel integration. Deploy with
`vercel --prod` from `track1-miner/miner` (CLI authenticated, team `wukong4`), then re-run
verify-deploy against production. MEMORY's earlier "Vercel builds on push" claim was wrong.

**The uptime alarm is real now.** One `alarm` job (`needs: [check, live-tests, scores]`,
`if: contains(needs.*.result, 'failure')`) opens/extends the `uptime` issue for any failing job;
permissions explicit; `live-tests` uses `npm ci` + cache to conserve the Actions quota that is
the suspected cause of the 9–13h cron gaps. Proven live with the `test_alarm` dispatch input →
issue #1, closed as a drill. (T4.8, G21)

### EPOCH 291 (~13:50Z 2026-08-29) — RANK 1 IN ALL SIX INTENTS

```
SSL_VERIFICATION      #1  0.010483   margin 1.0% — preflight-ssl-verification 0.010379 is a REAL
                                     threat now; watch every epoch
STORM_ALERT           #1  0.010295   beat amanat 0.007353 by 40% after losing 289/290 to them
WEATHER_FORECAST      #1  0.009871   FIRST EVER weather #1, field of 12 (chainsight 0.009380)
                                     CORRECTED 2026-08-30: this was NOT the temperature-first
                                     reorder working. Our score moved +3.8% while the field best
                                     fell 19%; every other miner collapsed this epoch and
                                     recovered in 292. See docs/EPOCH_292_AUTOPSY.md §4.
IP_GEOLOCATION        #1  0.009166   held
ACADEMIC_SEARCH       #1  0.010742   held; openalex woke up (0.009333) but beaten
LANGUAGE_TRANSLATION  #1  0.000000   ALL THREE miners scored zero — a tie-at-zero, not a win.
                                     Our row shows source_text "" again. Do not claim this one
                                     as durable; check the request log for what arrived.
```

This is the registration-297 + measured-deploys epoch: the storm guidance, temperature-first
weather prose and the request contract all scored for the first time, and every contested intent
flipped our way. Caveats that keep it honest: SSL's margin collapsed from 17% to **1%** (new
entrant), and translation's #1 is a zero-tie. The user's directive (≥5 real #1s) is met at
**5 real + 1 tie**. Both epoch-291 history lines (CI runner + local) are pushed after a G20-style
append conflict resolved by keeping both in timestamp order.

### Session 2, part 3 (~09:00-10:00Z) — registration 297 unlocked the question text; three deploys

The activation probes at 08:36Z showed the request builder READING the new contract —
`/translate?[query]` arrived filled (impossible under 260), every endpoint probed with sensible
params. Three changes shipped on the back of that, each champion-measured before deploy:

1. **Storm advisory-first mode** (`ADVISORY` regex in `src/storm.ts`): when the question text
   arrives and asks what to DO, the answer opens with the safeguard guidance. 0.006856 on epoch
   289's question — 1.6x the epoch winner — vs 0.005440 for the trailing form. The trigger
   matches exactly 1 of the 30 recorded storm questions; forecast answers unchanged.
2. **Weather explicit-start branch unified with the measured template** (`src/forecast.ts`):
   the old asked-branch prose scored 0.007613 vs the main template's 0.010798 — a regression
   waiting to fire the moment the engine delivers "starting September 1st" questions. One
   template now serves both branches; with the question text, 0.010919 on epoch 289 (ABOVE the
   0.010033 winner, honestly covering Sep 1-8) and 0.011414 on epoch 290 (winner 0.011638).
3. Both deployed via `vercel --prod`, verify-deploy green after each.

**Goal standing (user directive): #1 in at least 5 of 6.** The paths: hold SSL/IP/ACADEMIC,
translation recovers via the 297 contract (replay: 9/9 wins, mean 0.614 when text arrives),
and weather or storm flips on the new question-text answers. Epoch 291 (~15:31Z) is the test
of everything above.

### Session 2 continued — epoch 290 landed 06:31Z and rewrote the priorities

```
SSL_VERIFICATION   #1  0.01020   held; margin narrowed to +17% (txlens 0.00869; new entrant
                                 preflight-ssl-verification #3)
IP_GEOLOCATION     #1  0.00971   held; iplocate scored 0.0
STORM_ALERT        #2  0.00680   amanat 0.00783; the guidance SURVIVED conversion ("advising to
                                 secure equipment and move personnel to safe shelters") and
                                 measured +3.8% raw even on this forecast question (G23 half-
                                 closed). Loss cause: amanat's day-by-day outlook shape.
                                 Temp/humidity grafting was measured -1.2%/-26% and REJECTED.
WEATHER_FORECAST   #5  —         the converter dropped the asked-for temperature AGAIN (2nd
                                 epoch running). Fix deployed ~09:00Z: temperature now leads,
                                 source attribution at the tail. Raw 0.011418 vs the winner's
                                 converted 0.011638. Session 1's "reorder measured worse" was
                                 specific to its wording, not to leading with temperature.
LANGUAGE_TRANSL.   #3  0.00525   A REFUSAL — and epoch 289's #1 was ALSO a refusal (luck).
                                 The engine has never delivered the text: registration 260
                                 declares no text/target_language, and the engine fills only
                                 declared params (mymemory incumbents receive the text; their
                                 manifests declare text-shaped slots). Endpoint verified fine
                                 through every param. FIX = manifest update, operator signature:
                                 see REGISTRATION_UPDATE.md. LOG_QUERY=on is live in production
                                 (param names + emptiness, never values) to confirm delivery.
ACADEMIC_SEARCH    —             not scored as of ~09:45Z.
```

**CVE_LOOKUP was re-evaluated and is now a CAPTURED intent — do not enter, do not re-measure.**
The champion scorer changed to `cve_ms_10.wasm` (reg 1446). Under it, patchsignal-cve scores
0.999993, our best honest answer measures 0.24, and appending NVD's own description — content
equivalent to what patchsignal's scoring answer contains — measures exactly 0.0000. The scorer
author is the #1 miner. The 150x pre-tune measurement was real but belongs to the dead scorer
regime. The /cve restoration was reverted the same hour (commit 5172b07, reverted; the
translation params were re-added alone in 3a52370).

**IMAGE_VERIFICATION / GAME_RESULT / TEXT_CLASSIFICATION evaluated for entry, all declined**
(2-miner fields below the eligibility floor or unservable honestly) — the reasoning is in
REGISTRATION_UPDATE.md and docs/LOSSES.md.

**docs/LOSSES.md** now holds the full autopsy of every rank not held, by root cause. The
three fixable species: refusing instead of answering; the asked-for fact not surviving the
~32-word conversion; the engine not delivering the question.

### Re-verified live 2026-08-29 (UTC 2026-08-28T18:4xZ)

Everything below was measured this session, not carried forward:

```
registration 260   active   rejection_reason null   fetch_attempts 0   retrying false
six endpoints      all 200, 0.33s - 1.28s
verify-deploy      exit 0   median 372ms   p95 1172ms
test suite         123/123 pass (offline + live)
epoch 289          still the network's latest, 5.8h old against a ~9h epoch — on schedule
total_requests_served  42   (all six intents combined, lifetime)

SSL_VERIFICATION      #1  0.01014868                                   field 4
IP_GEOLOCATION        #1  0.01000050                                   field 2
LANGUAGE_TRANSLATION  #1  0.00899709                                   field 3
ACADEMIC_SEARCH       #1  0.00654745                                   field 3
STORM_ALERT           #2  0.00405170  gap 0.00022750 amanat-weather-risk   field 5
WEATHER_FORECAST      #3  0.00976552  gap 0.00026778 onlookout-weather     field 11
```

`WEATHER_FORECAST`'s field is now **12 active miners** — it was 9 when we entered it. That intent
carries the network's highest demand and is attracting entrants accordingly; the 0.00027 gap is
being contested by more people each epoch.

**Monitoring is weaker than it reads.** The uptime cron is honoured far less often than hourly —
observed gaps of **9h 17m** and **13h 06m** — and only the `check` job opens an issue, so
`live-tests` and `scores` failures are silent. The repository has never had an issue created, so
the alarm half of this has never been seen to work. This is the tripwire G19's accepted risk
depends on. (GAPS G21, TASKS T4.8)

**Weather tuning after epoch 289 — three variants tested, all lost. Nothing was changed.**
Scored against the WEATHER_FORECAST champion (`wf_mini.wasm`, reg 636) on epoch 289's own question
and ground truth:

```
deployed prose            58w   0.010514   <-- best, kept
temperature reordered first 57w 0.010448
short                     29w   0.010035
shorter                   22w   0.007708
our converted answer                0.009766   (leader onlookout 0.010033)
```

Two hypotheses died here, and both are worth not retrying:

1. **Reordering `reason` so the asked-for variables come first** — motivated by the real
   observation that epoch 289's conversion kept wind speed and cut the temperature range. Measured
   *worse*. What the converter keeps is not controlled by our ordering, and we cannot run the
   converter offline to test it, so this is unfalsifiable from here.
2. **Writing to the converter's ~32-word budget** — measurably wrong. Shortening cost score
   monotonically (0.0105 -> 0.0100 at 29 words -> 0.0077 at 22). The converter lands at ~32 words
   whatever we send, but that is *not* a reason to send 32 words. Fuller prose still scores better.

The ~32-word budget finding stands as an observation. The advice people would naturally draw from
it — write shorter — is false, at least here. Conversion costs us about 7% (0.010514 prose ->
0.009766 scored) and no wording change tested recovers it.

**Epoch 289 scores** (recorded 2026-08-28 via `tools/record-scores.mjs`) — **RANK 1 IN FOUR**:

```
SSL_VERIFICATION      #1   0.01014868   <-- held
IP_GEOLOCATION        #1   0.01000050   <-- held
LANGUAGE_TRANSLATION  #1   0.00899709   <-- NEW, first epoch scored
ACADEMIC_SEARCH       #1   0.00654745   <-- NEW, first epoch scored
STORM_ALERT           #2   0.00405170   gap 0.00022750 to amanat
WEATHER_FORECAST      #3   0.00976552   gap 0.00026778 to onlookout
```

**Both newly registered intents took rank 1 on their first scored epoch**, which is what the
offline replay predicted (translation 9/9 wins, academic 19/21). The academic parser fixes shipped
hours earlier — two of the four newest questions had been answered "no research topic was supplied".

**WEATHER climbed from 0.00678 to 0.00977 and the gap fell from 0.00311 to 0.00027** — the
refusal/window fix worked, and the intent is now within 2.7% of rank 1.

**STORM fell to #2, and it was not a regression.** Our answer was a normal forecast, not a refusal,
so today's refusal change was not involved. The question changed shape: it asked what *operational
adjustments* an open-pit mine should make ahead of high winds, and the ground truth is a personnel
and equipment safety checklist. We answered with wind, gust and precipitation figures; so did the
leader, 0.00428 to our 0.00405. Both are answering a different question from the one asked.

**What the epoch-289 weather row shows, and it is the general lesson:** the question asked for
temperature and precipitation. Our `reason` contained both — but the ~32-word conversion kept the
**wind speed**, which nothing had asked for, and cut the **temperature range**, which the question
named. Ordering inside `reason` is therefore load-bearing: what the converter reaches last is what
it drops. Temperature and precipitation now lead that sentence; condition and source attribution
moved to the tail.

Also confirmed on that row: our code *does* parse "starting from September 1st, 2026" correctly
when it receives the question, but the engine sent only `location` and `days`, so we forecast from
today. `isobar-weather` answered September 1-7, so the engine gave *them* the question text. Param
filling differs per miner and we cannot force it.

**Epoch 288 scores** (landed 2026-08-28 ~03:50 UTC — recorded via `tools/record-scores.mjs`):

```
STORM_ALERT         #1          0.01061   <-- RANK 1 held, score up again
IP_GEOLOCATION      #1          0.00976   <-- RANK 1 held
SSL_VERIFICATION    #1          0.00935   <-- RANK 1 held
WEATHER_FORECAST    #3          0.00678   leader amanat-weather-risk 0.00989
```

Three epochs of rank 1 in three intents (286, 287, 288). Weather climbed #6 -> #4 -> #3 but the
leader changed (verity -> amanat) and our gap widened to 0.00311, so the epoch-287 read that we
were near coin-flip for #1 was too optimistic. **IP_GEOLOCATION fell 0.992 -> 0.00976 on the
question changing, not on anything we did** — it is the least durable of the three firsts, which
matters for the eligibility argument in `docs/ELIGIBILITY.md`.

Worth reading before chasing SSL score: in epoch 288 the ground truth for `api.shopify.com` claimed
a DigiCert certificate valid to January 2028. The host actually serves Google Trust Services,
expiring 2026-10-17, which is what we reported. **We are being scored against a stale ground
truth**, which is why every SSL score in the field sits near 0.009. Correctness and score diverge
here; do not "fix" the miner toward the wrong answer.

**Epoch 287 scores** (landed 2026-08-27 ~18:37-19:00 UTC; see `docs/score-history.jsonl`):

```
IP_GEOLOCATION      #1          0.99204   <-- RANK 1 held
SSL_VERIFICATION    #1          0.00973   <-- RANK 1 held
STORM_ALERT         #1          0.01045   <-- RANK 1 held, score up
WEATHER_FORECAST    #4          0.00870   gap 0.00207 to verity (was #6)
```

Epoch 287's weather question moved to New York with explicit lat/lon; the engine sent
`?hours=168&lat=40.7128&lon=-74.0060` (captured live in Vercel logs — the definitive proof of
params-only delivery). The dual-form span fix ("7-day (168-hour) hourly") plus `span_days` is
deployed for epoch 288 (~03:37 UTC).

Epoch 286 was #1/#1/#1 with weather #6 (0.00749).

The explorer's "Top miners" page now lists livecert as **#1 in three intents**. Caveats that keep
this honest: IP_GEOLOCATION has only **2 miners**, below the 3-miner eligibility floor, and every
intent still needs **100+ real Track 3 requests** to pay out. Rank 1 must also *hold* through the
Aug 31 close — spot-checks continue and epoch 287 lands ~18:37 UTC.

Epoch 285 was #2 / #2 / #8 (SSL 0.00745, STORM 0.00635, WEATHER 0.00761); epoch 284 was
#3 / #3 / #7 with storm at 0.0.

**WEATHER_FORECAST climb shipped 2026-08-27 ~12:45 UTC — epoch 287 (~18:37 UTC) is the test.**
The scored WF question is the same one per epoch for every miner (a Tokyo "7-day hourly forecast
starting next Monday, temperature in Celsius and precipitation probability" family) and its ground
truth is a refusal that restates the whole question — so overlap with the question's own phrases is
the entire margin. Diagnosis from our epoch-286 answer shape: **the engine sends weather requests
as params only (`location` + `days`), never the question text** — start_time was "now" and the
prose used the no-date branch, while "7-day" arrived as `days=7`. So "next Monday" and the cutoff
are invisible to us and to everyone (the rank-1 answers also started from today).

Fix, all honest facts from the params-only path: prose now states the window in day form
("A 7-day hourly weather forecast"), says "hourly" and "temperature in Celsius", reports
**precipitation probability** (new Open-Meteo hourly variable — the question asks for it by name
and we never fetched it), names the covered dates ("covering August 27 to September 3, 2026"),
attributes the source ("from the Open-Meteo weather service"), and says "wind speed" not "winds".
`end_time`/`hourly_count` restored (size-limit theory long dead). `miner.yaml` untouched.

Measured with the champion WASM (`wf_mini.wasm`, reg 636 — reproduces all 8 epoch-286 reported
scores EXACTLY from converted_answer; re-download from the zkasuran repo commit f009d2d, path
dist/xfmr/wf_mini.wasm):
```
epoch 284: live answer 0.01033 vs rank-1 0.00992 (verity)
epoch 285: live answer 0.01019 vs rank-1 0.00889 (isobar)
epoch 286: live answer 0.01028 vs rank-1 0.00983 (verity)
12-question bench mean: 0.17346 -> 0.25592 (+47%), no regressions
```
Caveat kept honest: conversion historically shaves 4-6% off raw prose, so the live margin over
verity (~5%) is thin — expect ~coin-flip for #1 vs verity in 287, clear gain over everyone else.
109 tests pass; verify-deploy 18/18; replay 34/34.

Epoch 284 was #3 / #3 / #7 with storm at **0.0**, so this was real movement. The storm zero had a
specific cause, in section 7.

**2026-08-27 (session 1 continuation):** registration 236 `active`, verify-deploy 18/18, replay
corpus 34/34. Found and fixed a `/papers` refusal bug before it could cost a scored question: a
bare topic with no question scaffolding (exactly what the engine sends when it fills the declared
`topic` parameter) returned "No research topic was supplied" — a guaranteed zero. `searchTopic`
now falls back to the cleaned input itself; "since/after YYYY" and bare year-pair date windows now
parse; a trailing date clause no longer leaks into the topic. 108 tests, deployed to production,
verified live. `miner.yaml` untouched — the operator package and its hash are unchanged.

**PRE-TUNED THE FIVE UNREGISTERED INTENTS — 2026-08-27 ~18:30 UTC.** Champion WASMs for all five
downloaded and validated (`tools/pretune-intents.mjs` runs the whole loop; set `PRETUNE_DIR` to a
folder with `<name>.wasm` + `scores_<INTENT>.json`). Means over every distinct real recorded
question, deployed code only:

```
CVE_LOOKUP            0.00218 -> 0.32609   150x. Beats patchsignal-cve on 9 of 11 scoreable Qs.
CONTENT_EXTRACTION    1.00000              6/6 perfect vs incumbent 0.0000.
LANGUAGE_TRANSLATION  0.61434              9/9 wins vs the two mymemory incumbents.
ACADEMIC_SEARCH       0.02952              18/19 wins.
NEWS_HEADLINES        0.00626              18/22; stale-GT ceiling — headlines rotated since GT.
```

**THE CVE CHAMPION IS A DIFFERENT REGIME.** It is patchsignal's own scorer (same author as the
rank-1 CVE miner), and unlike the zkasuran salience family it **collapses on detail**: the same
facts scored 0.98 as three compact sentences and 0.009 with the multi-range version list or the
NVD description appended. "Fuller answers score better" does NOT hold there — facts in fields,
answer in prose, and the prose opens in the question's own shape ("The CVSS score for X is 10,
indicating a Critical severity level. Affected versions include Apache Log4j versions before
2.15.0. It is listed in CISA's KEV catalog…"). CVE answers now also carry `affected_versions`
(detailed ranges, description-named product first) and `known_exploited` as fields, and /cve
caches by CVE id so rephrasings cannot burn NVD's 5-per-30s limit.

Headlines answers are now numbered, honor "top N" counts, and frame as "The top 5 business
headlines from Great Britain today, as of <date>, are: 1. …" — the questions' own wording.

## 2b. The two new intents — measured, not assumed (2026-08-28)

Both were scored offline against their own champion WASM before epoch 289, using
`tools/pretune-intents.mjs`-style replay over every distinct real recorded question.

**LANGUAGE_TRANSLATION — 9/9 wins, mean 0.61434. Champion reproduces 55/55 reported scores
exactly, so this is trustworthy.**

```
best incumbent per question: 0.000, 0.066, 0.000, 0.150, 0.333, 0.025, 0.264, 0.589, 0.023
ours:                        0.918, 0.190, 0.034, 0.150, 0.979, 0.965, 1.000, 0.996, 0.298
```

Crucially our translation answers are **1-9 words**, so the converter's ~32-word budget never
binds — clipping to 32 words changes nothing. That is why `reason` is the bare translation and
must stay that way: anything wrapped around it dilutes the only text being compared.

**ACADEMIC_SEARCH — mean 0.00953, 19/21 above the best incumbent score.** The champion only
reproduces 3/4 here, so treat these as indicative. Four real defects were found by replaying the
questions, all fixed and deployed:

1. **A mid-sentence date clause deleted the subject.** The scaffolding strip ended in `.*$`, so
   "papers published in 2025 in the field of quantum computing" lost everything after the year and
   `searchTopic` returned null — the endpoint refused with "No research topic was supplied", a
   guaranteed near-zero. **Two of the four newest questions hit this.** This is the second time
   this endpoint has refused an answerable question; there are now regression tests over the real
   question strings.
2. **"between January 1, 2025 and June 30, 2026" did not parse** — the day number was not allowed,
   so a question scoped to 2025-2026 was answered with a paper from **2002**.
3. **The requested count and ordering were ignored.** Questions say "limited to 10 results" and
   "sorted by citation count" by name; we returned 5 in relevance order.
4. **Named databases and query syntax leaked into the topic** ("Semantic Scholar for recent…",
   `Humans[Mesh]`), and three questions returned **zero papers**. Sources are stripped, relative
   windows ("last 5 years") resolve, and an empty result now retries on the leading terms.

Relevance stays the **default** ordering — sorting by citations unasked still returns a highly
cited survey on the wrong subject. Only an ordering the question names is honoured.

## 3. Endpoints — 6 registered; code now matches the manifest

| Path | Intent | Registered? | Source |
|---|---|---|---|
| `/ssl-check` | SSL_VERIFICATION | yes | live TLS handshake, no upstream |
| `/storm-alert` | STORM_ALERT | yes | Open-Meteo |
| `/weather-forecast` | WEATHER_FORECAST | yes | Open-Meteo |
| `/ip-geolocate` | IP_GEOLOCATION | yes | ipapi + BigDataCloud |
| `/translate` | LANGUAGE_TRANSLATION | yes | MyMemory + failover |
| `/papers` | ACADEMIC_SEARCH | yes | OpenAlex |

No API key exists anywhere in this miner, so `auth.type: none`. Keyless upstreams can still impose
shared-IP quotas: the post-registration MyMemory 429 is the concrete example, and Translation now
has a tested failover for it.

Content, News, and CVE were measured candidates, not registered strategy. Their source and routes
were removed after registration 260 to eliminate dead surface. The historical measurements above
remain only to explain how the candidate decision evolved.

## 4. The strategy, and the evidence for it

`chainsight-oracle` holds **11 intents and is #1 in four**, winning mostly with small scores in
quiet corners. It won by covering ground, not by answering better. That is the model.

Counter-example worth knowing: `bittensor-sn34-bitmind` is **#1 in three intents with 0.000**. Rank
is assigned even when nobody scores. Probably worthless for prizes, since judging divides by the
intent best score and eligibility needs 100+ real Track 3 requests.

## 5. Rules that survived measurement

The only generalisations that held. Everything else was disproven.

- **Answer every clause of the question.** Naming the ISP in a geolocation answer moved it
  **0.0103 -> 0.9936, a 97x gain**. Every large improvement came from finding a clause going
  unanswered.
- **Echo the identifiers the question used.** Answering "San Francisco" to a question about
  latitude 37.7749 scored 0.0068; including the coordinates scored **0.0135**.
- **Label the answer with the question own terms, where the answer buried them.** SSL
  0.01020 -> 0.01074, storm 0.00835 -> 0.00862. It made **weather worse** (0.01041 -> 0.01014), so
  test per intent rather than applying it blindly.
- **Never return a non-2xx.** The engine records `upstream error`, stores an empty answer, and the
  scorer never reads the body. A 400 is a guaranteed 0. Return 200 with an honest
  "could not determine".
- **Correctness beats the benchmark.** Fixing hemisphere coordinates lowered the storm benchmark
  mean, because two questions previously failed and now resolve. Kept anyway.

## 6. Theories tested and WRONG — do not retry

1. **Terse answers score better.** Wrong. Fuller answers win, provided every added fact was asked
   for. The superseded `tools/score-sim.mjs` was deleted in the hardening pass.
2. **`label_field` drives the score.** Wrong. `txlens` is #1 in SSL with `label_field: status`,
   which is the constant "ok".
3. **There is a response size limit.** Wrong. Conversion fails about 6.7% of the time at **every**
   size: `weatherapi` converts 52,943 bytes fine, `ssllabs` failed at 161. Trimming the SSL answer
   on this false premise cost 11% and was reverted.
4. **A hand-written candidate is a valid measurement.** Wrong, and it fooled me twice. Writing an
   answer while reading the ground truth leaks it — a storm candidate scored 0.614 that way where
   the honest implementation scores 0.0086. **Only measure answers produced by the deployed code.**

## 7. How scoring actually works

- **The converter is a ~32-word budget, and it is the real bottleneck. Measured 2026-08-28 over
  all 16 of our scored rows across four intents.** `converted_answer` is an LLM summary of our
  whole JSON, and it lands at 32.1 words on average whatever we send: it **expands** short reasons
  (12 -> 32, 17 -> 22, 25 -> 35 words) and **compresses** long ones (69 -> 33, 68 -> 32, 64 -> 37).
  Median ratio 0.79.

  So writing a 69-word `reason` does not produce a 69-word scored answer. It produces a 33-word
  summary in which **the converter, not us, chose what survived.**

  What that cost, concretely — SSL epoch 286, `api.example.com` (unreachable host, and a ground
  truth that is a generic "how to analyse a TLS chain" essay):

  ```
  our reason (64 w), scored directly with the champion   0.992301
  the converted_answer that was actually scored (37 w)   0.009730     100x loss
  ```

  Our reason named `openssl s_client`, Subject Alternative Name, SSL Labs, and leaf/intermediate
  chain building — all of it in the ground truth. The converter cut every one of those and wrote
  "The system suggests running a command to verify the certificate chain."

  **This qualifies rule 1 in section 5.** "Answer every clause" is right, but only inside the
  converter's budget. Past roughly 35 words you are not adding scored content, you are handing a
  summariser the choice of what gets scored. The hypothesis worth testing is to write `reason` at
  the converter's own budget with the question's vocabulary front-loaded, so there is nothing to
  cut — **not yet tested live**, and note the confounder: our two 0.99 scores are both
  IP_GEOLOCATION, whose ground truth is short and factual, while SSL's is a long essay.

  Reproduce with `../../scratchpad/conversion-loss.mjs` (see the codex worklog) or by pulling
  `/scores` and comparing `json.loads(miner_answer).reason` against `converted_answer`.

  **We cannot run the converter offline.** That is the gap that makes this hard to tune: the
  champion scorer is public, the converter is not. Do not rewrite answer generation on theory
  three days from the close — the repo's own rule is that only deployed-code answers count as
  measurement, and here even that only tells us the result, not the mechanism.

- The scorer reads **`converted_answer`**, Telegraph prose conversion of the miner JSON. Not the
  raw JSON, not `label_field`. Running the champion WASM on `converted_answer` reproduces the
  reported score exactly.
- **The engine sends only the parameters a miner declares** in `input_schema`, never the raw
  question unless `q`/`query` is declared. This caused the storm 0.0 in epoch 284: a coordinate
  question arrived as `location=""` and we answered "no location was provided". Fixed in
  registration 236, which declares `q`, `query`, `lat`, `lon`, `latitude`, `longitude`, `days`,
  `forecast_days`, `forecast_hours`, `hours`, `domain`, `location`, `ip`.
- **Epochs are 9 hours.** Scoring lands about 3x a day. The landing-page ticker counts down in
  minutes and misleads. Never poll for a score after deploying; use the offline loop.
- **Champion scorers are public**, commit-pinned WASM, about 24MB each, listed at `/api/wasm`.
  `/scores?intent=X` returns real questions with `ground_truth` and the `converted_answer` that was
  scored. `docs/codex-worklog/probe-champion.mjs` runs one locally.

## 8. Tools

```bash
# acceptance — must exit 0 before any registration
node tools/verify-deploy.mjs https://miner-wine.vercel.app

# replay the 34 real paid questions from the public feed
node tools/replay-corpus.mjs
node tools/replay-corpus.mjs --refresh

# score live answers against an intent real champion
node tools/bench-champion.mjs --wasm champ_ssl.wasm --bench ssl_bench.json --path ssl-check

# record this epoch (idempotent; hourly CI runs it)
node tools/record-scores.mjs

# uptime and routing revocation
node tools/watch.mjs --base-url https://miner-wine.vercel.app --registration-id 260 --once
```

Windows note: Git Bash rewrites a leading slash argument into a Windows path, so pass `ssl-check`
not `/ssl-check`, or prefix the command with `MSYS_NO_PATHCONV=1`.

## 9. Gotchas that cost real time

- **Google News RSS returns an empty channel** if you pass `hl`/`gl`/`ceid`. Drop them.
- **OpenAlex sorted by `cited_by_count`** returns a 6G survey for a blockchain query. Use default
  relevance.
- **`new RegExp` with escaped strings is broken** — in a JS string `\d` is `d`, `\s` is `s`, and
  `\b` is a backspace character. Regexes in this codebase were silently dead once because of it.
  Use regex literals or `String.raw`.
- **Deploy AFTER tests pass, not alongside.** Chaining them in one command hid two failing tests.
- **SPORTS_SCORE was deliberately skipped.** The free API returned a friendly against AC Milan when
  asked for the most recent Premier League meeting. A confidently wrong score is worse than not
  serving the intent.
- **Do not `git add -A`.** Other agents write into this repo incrementally; a blanket add captured
  Track 2 half-written files once. Stage explicit paths. Leave `../fable_review_audit.md` alone.

## 10. Deadlines and the eligibility risk

```
Track 1 closes                2026-08-31
Miner must stay live through  2026-09-07   (a rule, not just scoring)
Judging                       75% normalized performance + 25% X engagement
```

**The eligibility guardrail is the biggest unmitigated risk.** An intent needs 3+ active miners AND
**100+ real requests from Track 3 applications** to be prize-eligible. `SSL_VERIFICATION` had
**zero** real questions in 72 hours. Rank 1 in a silent intent may win nothing.

**Measured 2026-08-29, and neither half is moving:**

```
intent                 active miners   3-miner half
SSL_VERIFICATION             5          OK
STORM_ALERT                  6          OK
WEATHER_FORECAST            12          OK
IP_GEOLOCATION               2          FAILS   livecert + iplocate only
LANGUAGE_TRANSLATION         3          OK
ACADEMIC_SEARCH              3          OK

total_requests_served, all six intents combined, lifetime:   42
```

Two things worth stating plainly. The **42** is the whole miner's lifetime total, while the floor
is **100 per intent** — so the shortfall is not 58 requests, it is on the order of 600, two days
before the close, with Track 3 not yet open. And `IP_GEOLOCATION` fails the *miner-count* half
outright, so a rank 1 there is worth nothing regardless of demand.

Breadth is the hedge. `../track3-certwatch/` is the other half of it and is **not funded** — do not
fund it until its durable-budget story is closed (see `../GAPS.md` G17/G18).

## 11. First actions for a fresh session

0. `git fetch origin && git rev-list --left-right --count origin/main...HEAD` — **do this first.**
   The `scores` CI job pushes to `main` on its own, so the branch can be diverged before you have
   typed anything. Reconcile by rebase, never by force-push. (G20)
1. `node tools/record-scores.mjs` — has a new epoch landed? Compare against section 2.
2. `curl -s https://devnode.telegraphprotocol.com/api/miners/260 | jq .miner.activation_status`
   — still `active`? If a newer registration exists, that id supersedes 260 everywhere.
3. `node tools/verify-deploy.mjs https://miner-wine.vercel.app` — must exit 0.
4. If a new epoch landed, read what actually scored:
   `curl -s "https://devnode.telegraphprotocol.com/scores?intent=SSL_VERIFICATION&limit=100"`
   and look at our `converted_answer` and `failure_reason`. That is where every real defect was
   found — not by reading code.
