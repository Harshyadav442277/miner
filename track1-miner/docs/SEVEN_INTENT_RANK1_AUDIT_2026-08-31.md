# Track 1 seven-intent rank-1 audit

> **Superseded 2026-08-31.** This audit describes registration **334** and seven intents. The live
> registration is now **389** with **ten** — CONTENT_EXTRACTION, NEWS_HEADLINES and
> WALLET_BALANCE_CHECK were added. Its per-intent findings still stand; its registration id, intent
> count and "epoch-295 go/no-go" section do not. Current state: `track1-miner/MEMORY.md` § 000000.

- **Audit time:** 2026-08-30 18:43 UTC / 2026-08-31 00:13 IST
- **Miner:** `livecert`
- **Registration:** `334`
- **Owner:** `0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e`
- **Production:** <https://miner-wine.vercel.app>
**Authoritative sources:** [registration 334](https://devnode.telegraphprotocol.com/api/miners/334), [miner catalog](https://devnode.telegraphprotocol.com/api/miners), [official rules](https://hackathon.telegraphprotocol.com/rules)

## Executive verdict

We cannot honestly guarantee future rank 1: Telegraph scores on its own epoch schedule, competitors
can change, and the two newest fixes have not yet received a network score. The strongest supported
position is:

- Epoch 294: **5 of 7 intents are rank 1**.
- `IP_GEOLOCATION` and `LANGUAGE_TRANSLATION` were diagnosed, improved, deployed, and re-benchmarked
  after epoch 294. **Epoch 295 is the authoritative acceptance test.**
- Translation now has a large frozen-bench advantage. IP has only a very small mean advantage and
  remains the least certain of the two pending flips.
- Of the current firsts, `SSL_VERIFICATION` is the most fragile: its live lead is only 0.40% and its
  frozen clip-32 bench is effectively tied with the challenger.
- Registration 334 is active, unrejected, owned by the expected wallet, and lists exactly the seven
  intended intents. The pinned IPFS manifest hash is
  `1ab5296f2af016db002f5281e72b938460cd7d2549b74b9ed5af18889452139c`.
- All seven intents clear the official **three-active-miner** guardrail today. The separate
  **100 real Track 3 requests per intent** guardrail is not demonstrated by the public catalog;
  `livecert` currently shows 87 total requests across the whole miner, not per-intent Track 3 usage.

## Authoritative epoch-294 leaderboard

The latest public score remains epoch 294. Links below are the public score feeds used for the
snapshot.

| Intent | LiveCert | Nearest relevant competitor | Relative position | Active miners | Decision |
|---|---:|---:|---:|---:|---|
| [`SSL_VERIFICATION`](https://devnode.telegraphprotocol.com/scores?intent=SSL_VERIFICATION&limit=200) | **#1 · 0.007920371** | preflight · 0.007888676 | **+0.40%** | 5 | Hold; monitor every epoch |
| [`STORM_ALERT`](https://devnode.telegraphprotocol.com/scores?intent=STORM_ALERT&limit=500) | **#1 · 0.012871616** | txlens · 0.011279855 | **+14.11%** | 6 | Hold deployed answer |
| [`WEATHER_FORECAST`](https://devnode.telegraphprotocol.com/scores?intent=WEATHER_FORECAST&limit=1500) | **#1 · 0.009046143** | isobar · 0.008504648 | **+6.37%** | 13 | Hold deployed answer |
| [`IP_GEOLOCATION`](https://devnode.telegraphprotocol.com/scores?intent=IP_GEOLOCATION&limit=200) | #2 · 0.009540788 | preflight · 0.010061990 | **-5.18%** | 4 | Improved after epoch; await 295 |
| [`LANGUAGE_TRANSLATION`](https://devnode.telegraphprotocol.com/scores?intent=LANGUAGE_TRANSLATION&limit=200) | #2 · 0.000027231355 | langwire · 0.000071304414 | **-61.81%** | 4 | Improved after epoch; await 295 |
| [`ACADEMIC_SEARCH`](https://devnode.telegraphprotocol.com/scores?intent=ACADEMIC_SEARCH&limit=200) | **#1 · 0.007203894** | scholarwire · 0.007041354 | **+2.31%** | 5 | Hold; measured head-to-head win |
| [`AI_TEXT_DETECTION`](https://devnode.telegraphprotocol.com/scores?intent=AI_TEXT_DETECTION&limit=200) | **#1 · 2.0664205e-10** | veritarach · 1.8348623e-10 | **+12.62%** | 3 | Hold; preserve prose fallback |

Rank numbers in an epoch can include miners that later became inactive; `Active miners` is counted
from the current catalog, while the score and rank columns reproduce the epoch-294 score rows.

## Per-intent audit and action

### 1. SSL_VERIFICATION — rank 1, but the thinnest defense

**What is working:** the request-restatement fix converted the earlier scorer mismatch into a live
first. The endpoint performs a real TLS handshake, returns 200 for reachable and unreachable
targets, and passed the complete live certificate matrix in this audit.

**Fresh defensive bench:** 12 frozen real questions against `preflight-ssl-verification`, using the
active scorer and the wrap-guarded ABI loader:

```
raw mean:    LiveCert 0.173476  vs preflight 0.747343, wins 3/12
clip32 mean: LiveCert 0.092220  vs preflight 0.092357, wins 4/12
```

The clip-32 means are effectively tied and better match observed live behavior than raw prose. A
prior sweep adding expiration, root trust, signature algorithm, and key-strength wording changed
the mean by only about +0.0003 and flipped no crossings. No speculative answer rewrite is justified.

**Action:** leave production prose unchanged; treat any loss in epoch 295 as the highest-priority
new investigation.

### 2. STORM_ALERT — defended rank 1

**What is working:** the response preserves wind, gust, precipitation, graded risk, the requested
window, and operational guidance. The standing guidance hedge and request restatement survived live
scoring and epoch 294 has a 14.11% lead.

The best later clip-budget candidate was only +2.4% on a 12-question offline bench, duplicated the
question, and was worse on the adjacent weather scorer. That is below the evidence threshold for a
production change.

**Action:** leave unchanged. Reliability is worth more than a noisy wording experiment here.

### 3. WEATHER_FORECAST — rank 1 after the format fix

**What is working:** forecast prose now restates the request in the reference-answer form while
keeping the requested window, hourly Celsius range, precipitation probability, dates, and source
early enough to survive conversion. This moved the miner from #5 in epoch 292 to #1 in epoch 294.

Eight answer variants were already swept. Raw-prose gains disappeared or reversed under the
32-word conversion-budget approximation, so further wording changes would trade a measured first
for an unmeasured theory.

**Action:** leave unchanged and keep the current Open-Meteo degradation path.

### 4. IP_GEOLOCATION — improved after epoch 294; medium-confidence flip

**Defects corrected in commit `8839a0e`:**

1. Private, loopback, TEST-NET, link-local, CGNAT, multicast, benchmarking, and IPv6 special ranges
   are answered definitionally instead of reported as lookup failures.
2. Public-IP answers now address the abuse-history clause with a live Tor DNSEL check and an honest
   disclosure that the consulted sources are not a dedicated reputation database.
3. `ip-api.com` is primary for operator geofeed accuracy, with `ipwho.is` and `ipapi.co` as
   bounded failovers.
4. Operator-first prose and special-range no-restatement behavior match the measured reference
   answer shapes.

**Fresh production head-to-head:** 21 frozen real questions against preflight, active scorer 630:

```
raw mean:    LiveCert 0.854364  vs preflight 0.853941, wins 14/21
clip32 mean: LiveCert 0.806707  vs preflight 0.806506, wins 14/21
```

This is a real improvement over the pre-fix 4/21 win record, but the mean advantage is only 0.02%
under clip-32. Four rows still behave like opaque wording cliffs, and a prior tail-trim sweep lost a
crossing rather than fixing them.

**Action:** keep the deployed fix. Do not perturb it before epoch 295. Confidence: **medium**, not
guaranteed.

### 5. LANGUAGE_TRANSLATION — improved after epoch 294; high-confidence flip

The active champion changed to scorer registration **1996**, owned by the same expected wallet and
pinned at commit `6a3e01c`. It is a sharp two-cluster scorer, and the recorded ground truths are bare
translations.

**Defects corrected in commit `8839a0e`:** Google is primary for higher-fidelity neural output,
MyMemory is the failover, `reason` is the bare translation, provenance moved to `source`, and the
route skips request restatement.

**Fresh production head-to-head:** 10 frozen real questions against `langwire`, active scorer 1996:

```
raw mean:    LiveCert 0.900000  vs langwire 0.000000, wins 10/10
clip32 mean: LiveCert 0.900000  vs langwire 0.000000, wins 10/10
```

**Action:** keep the deployed bare-answer form. Confidence for an epoch-295 flip: **high**, subject
to the known network-wide epochs where every Translation miner receives a zero.

### 6. ACADEMIC_SEARCH — rank 1 with measured defense

The endpoint honors named topics, quoted terms, date ranges, relative windows, requested counts, and
explicit sorting while avoiding prior refusal paths.

**Fresh production head-to-head:** 22 frozen real questions against `scholarwire`, scorer 688:

```
raw mean:    LiveCert 0.179831  vs scholarwire 0.009625, wins 19/22
clip32 mean: LiveCert 0.013329  vs scholarwire 0.012019, wins 21/22
```

The clip-32 advantage is broader than the epoch's 2.31% mean lead suggests. No rewrite is warranted.

**Action:** hold; prioritize avoiding OpenAlex refusals and timeouts.

### 7. AI_TEXT_DETECTION — rank 1; preserve two-shape behavior

The endpoint handles both actual passages and misrouted natural-language questions. That matters
because the only historically observed routed question was not an AI-detection passage. It returns
bounded-confidence, method-labeled prose rather than a label-only object that collapses in the
current scoring pipeline.

The absolute scores are tiny, but rank—not absolute scale—is the published intradomain comparison.
All three active miners clear the miner-count guardrail.

**Action:** leave unchanged. A heavier model would add latency and outage surface without measured
rank benefit under the active scorer 1286.

## Active scorer lock

Every bench in this audit was checked against the current scorer registration for its intent:

| Intent | Active scorer registration | Status |
|---|---:|---|
| SSL_VERIFICATION | 631 | active |
| STORM_ALERT | 453 | active |
| WEATHER_FORECAST | 636 | active |
| IP_GEOLOCATION | 630 | active |
| LANGUAGE_TRANSLATION | 1996 | active |
| ACADEMIC_SEARCH | 688 | active |
| AI_TEXT_DETECTION | 1286 | active |

Translation is the only scorer in this set that changed during the latest tuning window. If any
champion registration changes, its intent must be re-benched before changing production prose.

## Reliability and verification

Current verification evidence:

- Registration 334: `active`, `rejection_reason: null`, `retrying: false`, `fetch_attempts: 0`.
- Production acceptance: **all 20 checks passed**, seven routes return 200, median 376 ms,
  p95/max 1,213 ms during this audit.
- Full local suite with real providers: **173/173 passed**; TypeScript type-check passed.
- One-shot watcher: endpoint `ok` in 361 ms, TLS verdict `valid`, registration `active`.
- The latest scheduled `live-tests` job failed only because a 1 ms real DNS timeout assertion raced
  a cached NXDOMAIN response. Production acceptance, score recording, and the alarm job all passed.
  The test now injects deterministic resolver outcomes; production resolver behavior is unchanged.

This CI test fix must be pushed and a new workflow run must pass before calling monitoring green.
It does not require a production deploy because it changes only resolver test injection and the
test itself; the default production code path is byte-for-byte equivalent in behavior.

## Epoch-295 go/no-go gate

Do not claim 7/7 until all of these are true in the authoritative feed:

1. Epoch is greater than 294 and all seven intents have scored.
2. `livecert` is rank 1 in every row, not merely tied at zero.
3. Registration 334 is still active, unrejected, and owned by the expected wallet.
4. The active scorer registration for each intent is unchanged from the table above, or that intent
   has been re-benched against the replacement.
5. Production acceptance and the scheduled monitoring workflow are green.

Refresh commands from the repository root:

```powershell
node track1-miner/tools/record-scores.mjs
node track1-miner/tools/verify-deploy.mjs https://miner-wine.vercel.app
node track1-miner/tools/watch.mjs --registration-id 334 --base-url https://miner-wine.vercel.app --once
```

## Prize-readiness boundary

The [official rules](https://hackathon.telegraphprotocol.com/rules) make each intent an independent
leaderboard and award 75% for normalized performance plus 25% for X engagement. They also require
at least three active miners **and** at least 100 real Track 3 requests for an intent to be eligible
for global cash prizes. Therefore 7/7 rank 1 would maximize the currently visible performance
position, but it would not by itself prove overall Track 1 victory or cash eligibility.
