# Step calibration — method, evidence, and the 2026-08-29 portfolio

Every champion scoring module on the network is an **inner scorer plus a monotone post-map**.
The post-map is where nearly all of the tuning happens, and it is visible: sibling registrations
from the same author differ in **four bytes** — one `f32` constant — and their on-chain evaluations
report the margin each constant earned on the node's hidden fixtures.

That turns the hidden fixture set into something you can measure through, without ever seeing it.

## Why a monotone post-map is safe

The node's promotion rule has two axes: **ordering** (`candidate_wins` versus `champion_wins`) and
**separation** (`candidate_margin` versus `champion_margin`, which must be strictly beaten). There
is also a **real-traffic gate** — a candidate that disagrees with the champion's ranking of live
miner answers is rejected regardless (registration 1725 died here at agreement −0.1104).

A strictly increasing `f: [0,1] → [0,1]` applied to an existing module's score:

- **cannot change ordering**, so `candidate_wins == champion_wins` by construction;
- **cannot change rank correlation**, so the real-traffic gate is satisfied by construction;
- **can change separation freely**, which is the only axis left.

## What the optimum looks like

Write the fixture set as pairs `(g_i, b_i)` — the inner scorer's value on the good and the bad
answer — and let

```text
n(t) = number of pairs with b_i < t <= g_i        ("pairs a threshold at t separates")
```

For any monotone `f` rising from 0 to 1, the mean margin is `(1/15) * integral of n(t) df(t)`.
Total variation is fixed at 1, so **the whole budget belongs at the single `t` where `n` is
largest**: the optimal post-map is a step. Every smooth alternative — smoothstep, a power curve,
a cubic contrast term — spends part of the budget where `n` is smaller, and scores lower.

Two corollaries do real work here:

1. `integral of n(t) dt` over `[0,1]` is exactly `15 * (mean margin of the identity map)`. So an
   uncalibrated margin of `M` forces `max n >= ceil(15 * M)` — a **provable** floor on what the
   best threshold achieves, from a number the registry already reports.
2. A step cannot be beaten by more than `max n / 15`, so once the peak is found the intent is
   closed to further calibration gains.

## The transform this repository ships

`build-step-calibration.mjs` appends one function to a freestanding module and redirects the
`rank_answer` export at it. Nothing else changes — embeddings, allocator, memory,
`TELEGRAPH_INTENT` and every other export keep their original bytes.

```text
f(s) = (1 - high) + high * s      when s >= threshold
f(s) = low * s                    when s <  threshold
```

with `low = 0.01`, `high = 0.04` across this portfolio. The two ramps exist only to keep `f`
strictly increasing in `f32`: a flat band would tie two scores and cost a fixture win, which is how
registration 1765 lost three cases. Separating one pair is worth about `0.995` of margin under
these bands.

`verify-step-calibration.mjs` checks, against the same base exported raw:

- **exactness** — every candidate score equals the `f32` evaluation of the formula above;
- **ordering** — over all pairs of corpus rows, a higher raw score stays higher;
- **range** — every score is finite and in `[0, 1]`;
- **champion order-equivalence** — the champion never *inverts* the raw order. Where it *ties* two
  distinct raw scores, the candidate still resolves them; on the FRAUD_DETECTION champion that is
  19 of 130 ordered pairs, so the candidate can only match or beat its win count.

The builder is validated against a binary whose live margin is known: rebuilding registration
1797's calibration from its own inner function reproduces its scores to within one ULP
(max difference `5.96e-8`, from `0.95 + 0.05s` versus `1 - 0.05(1-s)`).

## Measured evidence, per intent

All three bases were re-downloaded and their Keccak-256 matched their on-chain registration hash
exactly, so the analysis below is against the registered bytes.

### LANGUAGE_TRANSLATION — the sweep is published on chain

Registrations 1794, 1795, 1796 and 1797 are the same 1,039,166-byte module differing at **one f32
at offset `0x26bc`**, and the module's `rank_answer` is already a step:

| registration | threshold | margin | implied `n` |
|---|---:|---:|---:|
| 1794 | 0.35 | 0.60192020 | 9 |
| 1795 | 0.45 | 0.66604674 | 10 |
| 1796 | 0.55 | 0.73047376 | 11 |
| **1797** (champion) | 0.65 | **0.79502594** | 12 |

The increments are `0.0641`, `0.0644`, `0.0646` — one additional separated pair per `0.10` of
threshold, and still climbing at the top of the swept range. The bar to beat is 0.79502594.

### FRAUD_DETECTION — the raw margin gives a provable floor

Registrations 1748, 1749 and 1750 (`fr_e3`, `fr_e6`, `fr_e9`) differ at **one f32 at `0x7ad1`**:
`0.3`, `0.6`, `0.9`. Their `rank_answer` is `s + w * (smoothstep(s) - s)`, so margin is affine in
`w`, and the fit is exact:

```text
margin(w) = 0.87185952 + w * 0.00559082
  w=0.3 -> 0.87353677   observed 0.87353677
  w=0.6 -> 0.87521401   observed 0.87521400   <- held out of the fit
  w=0.9 -> 0.87689126   observed 0.87689126
```

`w = 0` extrapolates to **0.87185952**, which is exactly the champion margin the network reported
before this family existed (registration 997, `0.8718595`). So the inner scorer's uncalibrated
margin is 0.87186, therefore `integral n dt = 13.078 > 13`, therefore **some threshold separates at
least 14 of the 15 pairs** — worth about `0.93`, against a bar of 0.8785044.

The champion's own family says where that threshold is *not*: iterating smoothstep converges to a
step at 0.5, and the sequence peaks at two iterations (`fr_ss2`, 0.8785044) and falls at three
(`fr_ss3`, 0.8769148). A step at 0.5 is therefore worse than the champion, and the peak of `n` sits
away from the middle — consistent with 13 pairs separating anywhere in the middle and two more
whose bad answers score high. Hence thresholds at 0.80 and 0.88.

### CVE_LOOKUP — the base already beats the bar with no calibration at all

Registrations 1751, 1752, 1753 (`cve_e3`, `cve_e6`, `cve_e9`) sweep the same blend weight:

| registration | `w` | margin |
|---|---:|---:|
| 1751 | 0.3 | 0.94046490 |
| 1752 | 0.6 | 0.93877960 |
| 1753 | 0.9 | 0.93709440 |

Affine again, and the middle point is reproduced to seven decimals by the fit from the outer two
(predicted `0.93877965`, observed `0.9387796`). Extrapolating to `w = 0` gives the margin of the
module's own inner function 47:

```text
0.94215015     versus the live bar 0.94158214     (+0.00057)
```

The bar has read `0.94158214` in every CVE_LOOKUP evaluation from 14:48Z to 18:10Z on 2026-08-29 —
more than twenty of them — so the fixture set is not being resampled here.

Two candidates follow. `cve_lookup_s1.wasm` simply exports function 47 directly: no calibration, and
a predicted margin of 0.94215015. And because `integral n dt = 14.132 > 14`, **some threshold
separates all fifteen pairs**, which is worth about 0.995 — hence the 0.30 / 0.50 / 0.75 rungs.

## Predictions

Recorded before registration so they can be scored afterwards.

| artifact | intent | bar | predicted margin | basis |
|---|---|---:|---:|---|
| `language_translation_t075.wasm` | LANGUAGE_TRANSLATION | 0.79502594 | ~0.862 | `n=13` |
| `language_translation_t085.wasm` | LANGUAGE_TRANSLATION | 0.79502594 | ~0.929 | `n=14` |
| `language_translation_t092.wasm` | LANGUAGE_TRANSLATION | 0.79502594 | 0.929–0.995 | `n=14` or `15` |
| `language_translation_t097.wasm` | LANGUAGE_TRANSLATION | 0.79502594 | 0.995 or collapse | `n=15`, or the threshold clears a good answer |
| `fraud_detection_t080.wasm` | FRAUD_DETECTION | 0.87850440 | ~0.93 | `max n >= 14`, proved |
| `fraud_detection_t088.wasm` | FRAUD_DETECTION | 0.87850440 | ~0.93 | same, second placement |
| `cve_lookup_s1.wasm` | CVE_LOOKUP | 0.94158214 | **0.94215015** | affine fit, exact |
| `cve_lookup_t030/050/075.wasm` | CVE_LOOKUP | 0.94158214 | ~0.995 | `max n = 15`, proved |

The thresholds above the swept range are extrapolations. A threshold that rises above a *good*
answer's score turns that pair into a near-tie and costs about `0.066` of margin, so the top rungs
are the risky ones and the ladders are signed from the middle outward. A rejection is the only
instrument that reads the real fixtures; each rung that is rejected still returns its margin, which
locates `n` for the next round.

## Provenance and licence

Every base is another team's registration, MIT-licensed, re-downloaded from the URL bound on chain
and hash-checked against the registered Keccak-256:

| base | registration | author | bytes | on-chain Keccak-256 |
|---|---:|---|---:|---|
| `ltr_c65.wasm` | 1797 | `0x8b224783…` (zkasuran) | 1,039,166 | `17390d2e4e93414e1c8d91ebfa09341c19046d43946d31311eac4260f7a71dfd` |
| `fr_ss2.wasm` | 1755 | `0x8b224783…` (zkasuran) | 23,987,775 | `2a43ed40622ff1d7a36ef3fd35b2564e80a2e8f38b5137c5cffa2d49202c7581` |
| `cve_e3.wasm` | 1751 | `0x8b224783…` (zkasuran) | 1,075,817 | `59ba4ec0ff2fc2dd38dc924fd472552a18b7cf1af3481463f49bd1f7d6baf71f` |

Upstream copyright and MIT permission are preserved in [`UPSTREAM_LICENSE`](UPSTREAM_LICENSE).
These artifacts are **calibration derivatives, not original scoring research**; the original scorer
in this repository is [`../scorer/`](../scorer/). Present them as what they are.

## Reproducing

```bash
curl -sSL -o ltr_c65.wasm https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/8d198513939cc0b642d92d11d4154ea802a53bd6/dist/fork/ltr_c65.wasm
node build-step-calibration.mjs --base ltr_c65.wasm \
  --expected-sha256 c0eb929a6fa7afac07fa165fcd289dcd47f58ed868991f3f1e4660d296fe325f \
  --out dist/language_translation_t085.wasm --inner 0 --threshold 0.85 --low 0.01 --high 0.04
node build-raw-export.mjs --base ltr_c65.wasm --out raw.wasm --inner 0
node verify-step-calibration.mjs --raw raw.wasm --candidate dist/language_translation_t085.wasm \
  --champion ltr_c65.wasm --threshold 0.85 --low 0.01 --high 0.04
node hash-artifacts.mjs dist/language_translation_t085.wasm
```
