# MARKET_DATA.md — live network data, and what it corrected

Captured **2026-08-26** from `/api/miners?limit=500` (89 miners) and
`/engine/v1/intents`. The `/api/miners` record exposes `total_requests_served`,
`scores`, `signal_mapping` and `activation_status` per miner — the actual competitive
picture, not inference.

Re-capture before acting on any of this.

---

## The finding that changed the plan: demand is wildly uneven

**The entire network has served 1,574 requests.** Weather is most of it.

| Tier-A intent | Requests | Miners | Top score |
|---|---|---|---|
| `WEATHER_FORECAST` | 941 | 9 | 0.0080 |
| `WEATHER_CHECK` | 620 | 8 | 0.7676 |
| **`STORM_ALERT`** | **334** | **3** | **0.0066** |
| `FRAUD_DETECTION` | 91 | 11 | 0.8245 |
| `WALLET_BALANCE_CHECK` | 48 | 6 | 0.9920 |
| `ONCHAIN_TX_LOOKUP` | 46 | 10 | 0.0111 |
| **`SSL_VERIFICATION`** | **17** | **3** | **0.0063** |
| `CVE_LOOKUP` | 5 | 2 | 0.0105 |
| `IP_GEOLOCATION` | 8 | 1 | 0.0000 |

The original intent analysis optimised for **low occupancy**. That was half the picture.
The prize-eligibility guardrail needs **≥100 real Track 3 requests to the intent**, so an intent
with no demand cannot pay out no matter how well we rank.

`SSL_VERIFICATION` has **17 lifetime requests**. Reaching 100 would mean generating essentially
all of it ourselves — which is both fragile and close to the line rule 04 draws.

**`STORM_ALERT` is the same shape of opportunity with 20× the demand:** Tier A, 3 miners, a top
score of 0.0066 (nobody is doing well), and 334 requests already flowing. It is also adjacent to
the weather traffic that dominates the network, so Track 3 apps are more likely to touch it.

**Action taken:** the miner now serves **both** intents from one deployment — `/ssl-check` and
`/storm-alert`. One Fly app, one registration, two eligibility paths. TxLens (rank 1 in several
intents from a single miner) demonstrates the pattern is allowed and effective.

## Live SSL_VERIFICATION leaderboard, epoch 283

| Rank | Slug | Score | Requests served | `signal_mapping` |
|---|---|---|---|---|
| 1 | `txlens` | 0.006276 | — | label=`status`, reason=`summary`, confidence=`confidence` |
| 2 | `ssllabs` | 0.004163 | 5 | label=`host`, reason=`status` |
| 3 | `certspotter-cert-verification` | **0.000000** | 12 | label=`has_valid_cert`, reason=`not_after` |

**The bar is extremely low.** Rank 1 is 0.0063 out of a possible 1.0. Two observations:

- `ssllabs` maps `label_field: host` — the label is then `"github.com"`, not a verdict. That is
  almost certainly why a technically excellent service scores 0.004.
- `txlens` maps `label_field: status`, whose value is `"ok"` — a request status, not a
  certificate verdict. Rank 1 with a mislabelled signal.

Ours maps `label_field: verdict`, whose value is the actual finding (`valid`, `expired`,
`self_signed`…). If the scorer compares that label against ground truth, this is a real edge —
but it is inference about an unpublished scoring module, not a proven fact. See G4.

## A claim of ours that was wrong

We asserted repeatedly — in the intent analysis, the README, and a draft X post — that TxLens was
beatable because **Render cold-starts**. Measured directly:

```
TxLens /ssl-check   cold 675ms   warm 324ms
```

**No cold start.** In hindsight the reason is obvious: validators spot-check every ~20 seconds,
which keeps the instance permanently warm. The spot-check cadence we treated as a threat to
competitors is the thing protecting them.

TxLens also performs a **real TLS handshake** — its response carries `authorized` and
`authorization_error`, which are Node `tls` fields, the same approach as ours. So the
"handshake vs certificate-transparency" differentiator applies to `certspotter`, **not** to TxLens.

TxLens is a better-built competitor than we credited. Its response even carries a `canonical`
field (`"ssl:github.com:valid:35"`) — a compact deterministic string clearly shaped for exact-match
scoring, though notably they do not map it in `signal_mapping`.

Corrected everywhere it appeared. The draft X post making the cold-start claim was rewritten
before it went out.

## What we could not determine

- **`external_path` is not exposed** by `/api/miners`, so a direct call to
  `api.certspotter.com/issuances` returning HTTP 400 does **not** prove their miner is
  misconfigured — Telegraph may forward to `/v1/issuances`. Not claimed as a weakness.
- **No per-intent Track 3 request counter** exists yet, so G13 progress cannot be tracked directly.
- `total_requests_served` is lifetime and includes Daemon traffic; none of it is Track 3 demand,
  since Track 3 opens 2026-08-31.

---

## The scoring picture — why our two intents are the right cells

**83% of all scored entries on the network are below 0.05.** A handful reach 0.99. The spread is
not explained by response shape: `chainsight-oracle` uses one `signal_mapping` across 11 intents
and scores **0.990 in `WALLET_BALANCE_CHECK` and 0.000–0.07 in the other ten**. Whatever the
scorer rewards, it is per-intent question-matching, not a universally "correct" JSON shape.

Every weather-family score, epoch 283:

```
STORM_ALERT        0.0066  bittensor-sn18-zeus      label_field: model
                   0.0058  amanat-weather-risk      label: summary
                   0.0000  skywire-storm-alert      label: level

WEATHER_CHECK      0.7676  weatherapi               label: current
                   0.6374  skywire-weather-check    label: condition
                   0.0184  openweathermap
                   ...five more below 0.017

WEATHER_FORECAST   0.0080  onlookout-weather   ← rank 1 of NINE miners
                   0.0077  skywire-forecast
                   ...all nine below 0.008
```

### The insight that makes this winnable

Judging is **normalized**: `75 pts × (your average score ÷ the best average score in your intent)`.
The best miner in an intent gets the full 75 **regardless of its absolute score**.

So the number that matters is not "can we score well" but "can we beat the incumbent in *this*
intent". Those bars:

| Our intent | Bar to beat for rank 1 |
|---|---|
| `STORM_ALERT` | **0.0066** |
| `SSL_VERIFICATION` | **0.0063** |

Compare `WEATHER_CHECK` (0.768) or `WALLET_BALANCE_CHECK` (0.992), where a real incumbent is
already answering well. **Our two intents have the lowest bars on the board**, and rank 1 in them
is worth exactly as many points as rank 1 in a hard one.

`WEATHER_FORECAST` is instructive: 941 requests, the highest demand on the network, and **nine
miners all scoring under 0.008**. High demand did not attract competent answers. It remains a
candidate if we want a third intent, though nine competitors for a 70/20/10 split is worse odds
than three.

### Who currently holds rank 1 in our intents

- `STORM_ALERT` — `bittensor-sn18-zeus`, at 0.0066, mapping **`label_field: model`**. Its label is
  the *model's name*, not a storm assessment. It holds rank 1 while answering the question with
  metadata.
- `SSL_VERIFICATION` — `txlens`, at 0.0063, mapping `label_field: status` whose value is `"ok"`.

Ours map `label_field: verdict`, whose value is the actual finding (`moderate`, `expired`, …),
with a `reason` sentence carrying the location/domain, the grade, and the numbers behind it.

**Stated honestly:** this is a reasoned bet, not a measured result. The champion scoring modules
are unpublished, and `skywire-storm-alert` maps a sensible `label_field: level` yet scores 0.0000 —
so a sensible mapping is clearly not sufficient on its own. We will not know until we are scored.
After being wrong about cold starts today, that distinction is worth keeping explicit.
