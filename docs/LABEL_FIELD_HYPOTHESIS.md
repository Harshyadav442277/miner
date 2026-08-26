# LABEL_FIELD_HYPOTHESIS.md

**Status: unproven.** Recorded because it is the strongest available lead, not because it is
established. I was confidently wrong about scoring once today already
([EPOCH_284.md](EPOCH_284.md)), so this is written to be falsifiable rather than persuasive.

---

## The observation

`semantics.signal_mapping.label_field` names the field a scorer reads as the miner's primary
answer. Across epoch 284:

**`STORM_ALERT`** — the only miner that scored anything maps `label_field` to a prose sentence.
Both miners mapping it to a short category scored exactly zero, as did we.

| rank | miner | `label_field` | score |
|---|---|---|---|
| 1 | `amanat-weather-risk` | **`summary`** (a sentence) | 0.00651 |
| 2 | `skywire-storm-alert` | `level` (a word) | 0.0 |
| 3 | **`livecert`** | `verdict` (a word) | **0.0** |
| 4 | `bittensor-sn18-zeus` | — | 0.0 |

**`WEATHER_FORECAST`** — every miner above us uses a richer label field than ours.

| rank | miner | `label_field` | score |
|---|---|---|---|
| 1 | `verity-weather-forecast` | `answer` | 0.00992 |
| 2 | `weatherapi` | `current` | 0.00961 |
| 3 | `skywire-forecast` | `summary` | 0.00889 |
| 7 | **`livecert`** | `verdict` (a word) | 0.00699 |

## The counter-evidence, which is real

**`SSL_VERIFICATION` breaks the pattern.** `txlens` ranks 1 with `label_field: status` — a short
category, exactly the shape the hypothesis says should score badly.

| rank | miner | `label_field` | score |
|---|---|---|---|
| 1 | `txlens` | `status` (a word) | 0.00601 |
| 2 | `ssllabs` | `host` (a hostname!) | 0.00486 |
| 3 | **`livecert`** | `verdict` | 0.00449 |
| 4 | `certspotter` | `has_valid_cert` (a boolean) | 0.0 |

`ssllabs` ranking 2 with `label_field: host` — which is not an answer to anything — argues the
label may matter less than assumed, or that SSL scoring is noisy. Note `SSL_VERIFICATION` had
**zero real questions in 72 hours**, so its scores likely come from few synthetic probes and should
carry less weight than storm, which has 15 real ones.

## What would settle it

Point `label_field` at `reason` (our prose sentence) instead of `verdict`, mirroring
`amanat-weather-risk` exactly — the one configuration demonstrably scoring in the intent with real
traffic. Keep `verdict` in the response body; only the mapping changes.

**Cost:** this requires a YAML change and therefore `updateMiner`, which issues a new
`registrationId` and `intentId` and may reset grace-period state. Codex advised against changing
the registration until the organisers clarify cross-intent aggregation, and that advice still
stands for *adding intents*. This is a narrower change with a specific, testable rationale.

**Cheaper test first:** wait for epoch 285. If `STORM_ALERT` moves off zero with no config change,
the zero was stale fixes rather than the label mapping, and this hypothesis is dead. That costs
nothing but time and is the honest next step.

## Falsification

- Epoch 285 shows storm > 0 with no change → hypothesis dead; the earlier fixes were the cause.
- Storm stays 0 across 285 and 286 → the label mapping becomes the leading explanation.
- We change the mapping and nothing improves → wrong, and we spent an `updateMiner` to learn it.
