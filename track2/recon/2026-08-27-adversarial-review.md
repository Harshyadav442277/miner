# Adversarial review — `track2/scorer` (T-D.2)

**Date:** 2026-08-27 · **Reviewer:** fresh-eyes adversarial pass, did not build the module ·
**Scope:** `track2/scorer/dist/{generic,ip_geolocation,storm_alert}.wasm` (read-only on `src/`),
scored through the canonical six-`i32` ABI from Node. Champion binaries
`ipgeo_reg630.wasm` / `storm_rpen_reg453.wasm` used for comparison.

**Verdict: do not register as-is.** Six CRITICAL findings, nine MAJOR, five MINOR. Three of the
critical findings are the *exact* failure class the README accuses the incumbent of, and one of
them (STORM_ALERT parroting) is **44× worse in our module than in the champion we are replacing**.
Every number below is measured, not argued.

Attacks that failed are listed at the end, one line each.

---

## How to reproduce

All findings run against the shipped `dist/*.wasm` through the same call path the node uses.
A minimal harness (`atk.mjs`, put it anywhere outside the repo):

```js
import { readFile } from "node:fs/promises";
const E = new TextEncoder();
export async function load(p) {
  const m = await WebAssembly.compile(await readFile(p));
  let i = new WebAssembly.Instance(m, {}), used = 0;
  const put = (b) => { if (!b.length) return [0,0];
    const ptr = Number(i.exports.alloc(b.length));
    new Uint8Array(i.exports.memory.buffer, ptr, b.length).set(b); used += b.length+8; return [ptr,b.length]; };
  return {
    score: (q,gt,a) => { if (used > 4e5) { i = new WebAssembly.Instance(m,{}); used = 0; }
      return Number(i.exports.rank_answer(...put(E.encode(q)),...put(E.encode(gt)),...put(E.encode(a)))); },
    breakdown: (q,gt,a) => { if (used > 4e5) { i = new WebAssembly.Instance(m,{}); used = 0; }
      const o = Number(i.exports.alloc(20)); used += 28;
      i.exports.breakdown_answer(...put(E.encode(q)),...put(E.encode(gt)),...put(E.encode(a)), o);
      const f = new Float32Array(i.exports.memory.buffer.slice(o,o+20));
      return { precision:f[0], fact:f[1], answered:f[2], raw:f[3], final:f[4] }; },
  };
}
const D = "track2/scorer/dist";
export const ip = await load(`${D}/ip_geolocation.wasm`);
export const storm = await load(`${D}/storm_alert.wasm`);
export const gen = await load(`${D}/generic.wasm`);
```

---

# CRITICAL

## C1 · `normalized_equal` is punctuation-blind, so a wrong answer returns **exactly 1.0**

`bytes.rs::normalized_equal` (lines 123–141) skips every non-word byte on both sides before
comparing. Digits are word bytes; `.` `,` `-` are not. Two strings that differ **only** in where
the decimal point, the dotted-quad separators or the thousands comma sit are therefore "an exact
match", and `lib.rs::rank_slices` short-circuits them to a literal `1.0` before any scoring runs.

```js
ip.score("What is the CVSS score for CVE-2021-44228?",
         "The CVSS score is 10.",
         "The CVSS score is 1.0")                     // -> 1.0000
```

| ground truth | answer | truth value | score (all 3 builds) |
|---|---|---|---|
| `The IP address is 192.168.1.10.` | `The IP address is 192.168.11.0` | different host | **1.0000** |
| `The server IP is 10.0.0.1, located in Frankfurt.` | `The server IP is 1.0.0.01, located in Frankfurt.` | different host | **1.0000** |
| `The temperature is 23.1 C.` | `The temperature is 231 C` | 10× wrong | **1.0000** |
| `Sustained winds of 5.9 m/s are expected.` | `Sustained winds of 59 m/s are expected` | 10× wrong | **1.0000** |
| `Coordinates are 37.7749, -122.4194.` | `Coordinates are 37.7749, 122.4194` | wrong hemisphere | **1.0000** |
| `The CVSS score is 10.` | `The CVSS score is 1.0` | wrong severity | **1.0000** |
| `There were 1,000 reports.` | `There were 10.00 reports` | 100× wrong | **1.0000** |
| `The record is CVE-2021-44228.` | `The record is CVE-20-2144228` | wrong id | **1.0000** |

`CVSS 10` vs `CVSS 1.0` is not a contrived string — it is a routine LLM formatting variant. The
module's own unit test *asserts* this behaviour as correct (`bytes.rs:229`:
`assert!(normalized_equal(b"The IP is 1.2.3.4.", b"the ip is 1234"))`), so the 44-test suite can
never catch it.

The self-match ratchet needs `rank_answer(q,gt,gt) == 1.0` exactly; it does **not** need
punctuation-insensitive equality. Folding case is enough; folding separators is what buys the bug.

## C2 · Negation is invisible — a flat contradiction ties the correct answer at 1.0000

`not` / `no` are stopwords (`tokens.rs:98–99`, `w_stop = 0.05`). Nothing else in the pipeline reads
polarity, so a sentence and its negation differ by one 0.05-weight token out of a ~15-token pool.

```js
ip.score("Where is the IP 8.8.8.8?", "The IP 8.8.8.8 is located in Germany.",
         "The IP 8.8.8.8 is not located in Germany.")     // -> 1.0000  (positive: 1.0000)
ip.score("Is the IP a proxy?", "The IP address is a known proxy and is flagged for abuse.",
         "The IP address is not a known proxy and is not flagged for abuse.") // -> 1.0000
```

| build | correct | negated | result |
|---|---|---|---|
| ip_geolocation | 1.0000 | **1.0000** | tie |
| ip_geolocation (proxy/abuse) | 1.0000 | **1.0000** | tie |
| storm_alert | 1.0000 | **0.9998** | tie |

Measured on a realistic row from the a2 battery, a negated full answer scored **1.0000** — the same
as the honest correct answer and above the honest-wrong answer (0.1959). The champion shares this
hole (0.9961), so it is not a differentiator we can claim; it is a hole we reproduce.

`ARCHITECTURE` lists CONTRADICTION as a fixture class scoring 1/1. That class contains one hand-
picked pair; it does not test polarity flips on supported content.

## C3 · STORM_ALERT pays a miner **more** for parroting the question than for answering

`profile.rs:220` sets `ans_floor = 0.75` on the storm build, which pins the answered-ness gate open.
Combined with `prose_w = 0.7`, a mechanically generated question echo scores as follows — the echo
is produced from the **question only**, with no lookup and no data:

```js
const echo = q => "The data shows " + q.replace(/\?/g,"")
  .replace(/^(Can you|Could you|Is there|Are|What|Which|How|Do|Does|Please)\b\s*/i,"");
```

| corpus | honest good | honest bad | **question echo** | champion's echo |
|---|---|---|---|---|
| `synth/STORM_ALERT` (17 q) | 0.9643 | 0.3394 | **0.7474** | **0.0170** |
| `real/STORM_ALERT` (13 q) | live answers 0.0299 | — | **0.6414** (max 0.8438) | — |
| `probe/STORM_ALERT` (8 q) | — | 0.4773 | **0.6134** | — |

Two consequences, both quantified:

1. **The echo takes rank 1 on real traffic.** Per-row, on all 13 recorded `real/STORM_ALERT`
   questions the echo outscores *every* recorded miner answer — often by two orders of magnitude
   (`echo=0.8438 / bestLive=0.0007`, `echo=0.8422 / bestLive=0.0090`, `echo=0.8170 /
   bestLive=0.0033`). A miner that never queries a weather API and simply restates the prompt wins
   the intent under our own scorer.
2. **The incentive gradient points away from answering.** On the synth corpus, EV(specific answer)
   = `p·0.9643 + (1−p)·0.3394`; EV(echo) = 0.7474 flat. Break-even at **p = 0.653**. Any miner
   below ~65 % factual accuracy maximises its score by refusing to assert anything. That is a
   scoring module that pays for silence.

The README records this as "REAL-PARROT 0/8 on STORM", framed as a Spearman trade. That framing
understates it by an order of magnitude: on the same synthetic rows the incumbent scores the echo
**0.0170** and we score it **0.7474** — we are **44× more parrot-friendly than the champion the
whole submission is built to replace**. `ARCHITECTURE:58` names the champion's 0.9933 echo as the
headline exhibit; a reviewer who runs the echo through our storm build will see 0.84 and stop
reading.

Note the IP build does **not** have this problem (echo 0.0007–0.0033). The defect is one constant.

## C4 · IP_GEOLOCATION saturates at precision 0.80 — one fact in five may be wrong for free

`profile.rs:172` sets `ss_hi = 0.88` on the IP build, and `score.rs:122` applies concave shaping
`shaped(P) = 1.5P − 0.5P²`. Solving `shaped(P) = 0.88` gives **P = 0.800 exactly**: with
`fact = ans = 1`, *any* precision at or above 0.80 maps to a literal 1.0.

Controlled sweep (ten equal-weight proper nouns, `n` of them replaced with unsupported ones):

| decisive facts wrong | precision | raw | **score** |
|---|---|---|---|
| 0/10 | 1.0000 | 1.0000 | 1.0000 |
| 1/10 | 0.9271 | 0.9609 | **1.0000** |
| 2/10 | 0.8508 | 0.9143 | **1.0000** |
| 3/10 | 0.7775 | 0.8640 | 0.9990 |
| 5/10 | 0.6250 | 0.7422 | 0.9312 |

And the resulting ordering inversion, on one row, one scorer call each:

```
0.9597   3 of 5 facts WRONG   (wrong country, wrong region, wrong city; right ASN + coords)
0.8329   fully CORRECT but verbose and appropriately hedged
```

A three-fact lie outranks a wholly true answer by **+0.127**. Mechanism: precision-of-answer with
no recall term means every *true* clause the ground truth does not happen to restate is scored as
unsupported and dilutes the denominator, while replacing a fact with a lie costs only that fact's
weight against a ceiling that is already saturated.

**25 % of the fixture pool ties at the ceiling**: over all 75 IP_GEOLOCATION answers in
`real ∪ synth ∪ probe`, 19 score exactly 1.0 and only 46 distinct values exist. Ties are what
`GAPS G12` identifies as the thing that kills Spearman; the IP build is only safe from that because
Spearman is skipped at one miner. If a second miner ever registers on IP_GEOLOCATION, check C fails
on tie mass alone.

## C5 · One fixed, ground-truth-blind sentence outranks every recorded miner answer

A single hard-coded string per intent, written from the intent's field list — the same words the
question asks for — with no lookup, no data, and no knowledge of any ground truth:

```
IP_GEOLOCATION: "The data shows the country, region, city, latitude, longitude, coordinates, ISP,
organisation, autonomous system network, hosting provider, timezone, postal code, continent and
address associated with this IP address, including its allocation, registry, abuse contact and
reported activity."
```

Swept over every question in `real ∪ synth ∪ probe`:

| intent | mean attack score | outranks **every** real answer on |
|---|---|---|
| IP_GEOLOCATION | 0.1688 | **9 / 36 questions** |
| STORM_ALERT | 0.3257 | **14 / 38 questions** |

Two of those wins are perfect scores on **real recorded traffic**:

```
real/ip_geolocation-real-05 : attack=1.0000   best real miner answer=0.0284
real/ip_geolocation-real-11 : attack=1.0000   best real miner answer=0.8846
real/ip_geolocation-real-07 : attack=0.5430   best real miner answer=0.0020
```

Breakdown on real-05: `P=0.8125 fact=1.0000 ans=1.0000` — 81 % of the blob's generic field names
appear somewhere in a long ground truth, `P` clears the 0.80 saturation point from C4, and the
answered-ness gate opens because those words are novel relative to the question. A contentless
keyword list is scored a perfect answer.

The README's proof table reports `STUFFING … all 1.0` (i.e. the class is ranked correctly). That
class contains **one** hand-picked blob. A second blob from the same class, written GT-blind,
scores 1.0000 on live rows. The class-based proof does not generalise — see M8.

## C6 · Stripping or faking a unit beats stating the wrong one, by 65×

`facts.rs::value_agreement` has a `one_united` branch (lines 56–65) that returns
`max(raw, converted)` whenever exactly one side names a unit. The unit table (`units.rs:90–147`) is
51 entries; anything outside it — `hPa`, `K`, `kelvin`, `mb`, `inHg`, `mi`, `kg`, or pure nonsense
— yields `U_NONE`, so the figure becomes unitless and is then compared against **every**
ground-truth figure in **every** dimension, taking the best.

```
GT: "Sustained wind reaches 47 km/h."     (storm build)
  47 km/h    (correct)                    -> 1.0000   fact=1.0000
  47 (bare)                               -> 1.0000   fact=1.0000
  47 hPa     (unknown unit, a pressure)   -> 0.9779   fact=1.0000
  47 kelvin  (unknown unit)               -> 0.9719   fact=1.0000
  47 bananas (nonsense unit)              -> 0.9698   fact=1.0000
  47 m/s     (real unit, WRONG value)     -> 0.0150   fact=0.0370
```

An answer asserting a **pressure of 47 hPa** in response to a wind-speed question scores 0.98,
while an answer asserting a wind speed that is merely wrong scores 0.015 — a **65× advantage for
asserting a category error over asserting a wrong value**. Same effect on temperature: `23.1 K`
(≈ −250 °C) scores 0.9520 against a ground truth of `23.1 C`, identical to the correct `73.6 F`.

This is directly gameable and requires no knowledge of the ground truth: **emit figures bare or in
an exotic unit** and every digit you guess right free-matches whatever the ground truth happens to
state, in any dimension, while every digit you guess wrong is neutral (`None` → unverifiable)
rather than penalised. It defeats README claim 1 ("a temperature is never a near-miss for a wind
speed") — it is, whenever the unit is not one of the 51.

---

# MAJOR

## M1 · The panic handler is an infinite loop: a bug becomes a node **hang**, not a trap

`lib.rs:206–210`:

```rust
#[cfg(all(target_arch = "wasm32", not(test)))]
#[panic_handler]
fn panic_handler(_: &core::panic::PanicInfo) -> ! { loop {} }
```

Confirmed in the shipped binary — `wasm-tools print dist/ip_geolocation.wasm` function 0 is
literally `loop; br 0; end`, and it is reached from function 18, which is called from the panic
formatting functions 19 and 20, which are called from **12 live sites inside functions 11 and 12
(the tokeniser and the unit pass)**. Those are Rust bounds checks. They are not dead: they are the
`src[i]` / `t.hash[k]` slice accesses.

None were reachable by 19,734 fuzz calls (see "attacks that failed"), so this is a latent hazard,
not a live defect. But the failure *mode* is the worst available: the gate's budget is 600 s across
three attempts, and a hang consumes it and reports nothing, where a trap is a clean, diagnosable
rejection. `core::arch::wasm32::unreachable()` is the one-line alternative.

`GAPS G6` already names this exact hazard — "`rank_answer` treats `ma_len <= 0` as blank rather
than trapping — a deliberate choice to keep malformed host calls at 0.0 instead of a hung `loop {}`
panic handler" — and then the shipped module contains the hung `loop {}` panic handler anyway.

## M2 · Support is a hard binary on top of a graded agreement — the promised smoothstep has a cliff

`score.rs:106–109` collapses `best_agreement` to `ta.sup[i] = a >= 1.0 - 1e-6`. That boolean then
drives both `precision_of` and `answeredness`. The graded agreement survives only in the
multiplicative `fmul`. When the answer's only decisive content *is* the figure — a short ground
truth, exactly the Tier-A case — the answered-ness gate slams shut the instant the figure falls
outside tolerance:

```
GT: "The CVSS score for CVE-2021-44228 is 10."     (generic build)
  10    -> 1.0000        9.8  -> 1.0000
  9.7   -> 0.0009        9.5  -> 0.0005      9.0 -> 0.0002
```

A **1 % change in the asserted figure moves the score by 0.999**. README line 10 ("calibrate with a
smoothstep instead of a step"), README line 151 ("degrades, does not fall off a cliff") and
`ARCHITECTURE A3.7` all claim the opposite. The cliff is softer on long ground truths (ip build,
README's own strings: 9.8 → 1.0000, 9.79 → 0.9764), which is why the hand cases in `verify.mjs`
never expose it.

## M3 · `num_rel_tol = 0.02` makes CVSS 9.8 and CVSS 10 the same claim

`facts.rs:41`: agreement is a flat 1.0 whenever `rel <= 0.02`. For a ground truth of 10 that admits
**9.8 through 10.2**. Measured: `CVSS 9.8 -> 1.0000, fact=1.0000` on both the generic and ip builds.

9.8 is the single most common "critical" CVSS value in real advisories. A miner that emits 9.8 for
every critical CVE collects full credit on every ground truth in 9.61–10.0 without doing a lookup.
For a *deterministic Tier-A* intent, 9.8 and 10.0 are different answers. Defensible for a
temperature; not defensible for a scored severity, a port number, or an ASN.

## M4 · A percentage free-matches at two scales

`canonical(v, U_PCT) = v/100`, and the `one_united` branch takes the better of raw and converted:

```
GT "The count is 1."     ANS "The count is 100%."   -> 1.0000  fact=1.0000
GT "The count is 100."   ANS "The count is 100%."   -> 1.0000  fact=1.0000
GT "The risk is 0.42."   ANS "The risk is 42%."     -> 1.0000  fact=1.0000
GT "The risk is 42."     ANS "The risk is 42%."     -> 1.0000  fact=1.0000
```

One of each pair is wrong by 100×; both score 1.0. Exploitable: express every bounded quantity as a
percentage and you cover both scales at once.

Compounding it, `num_abs_tol` is applied to the **canonical** value, so on the storm build
(`num_abs_tol = 0.05`) the absolute tolerance on a percentage is 5 percentage points — and because
it is absolute, it produces a step, not a taper:

```
GT: "Humidity is 55%."     (storm build)
  53%  -> 1.0000  fact=1.0000       56%  -> 1.0000  fact=1.0000
  50%  -> 0.2749  fact=0.5238       60%  -> 0.2749  fact=0.5238
```

A 1-point miss and a 5-point miss are both perfect; a 5.001-point miss loses 73 % of the score.

## M5 · Correct coordinates written without a degree sign score **0.0000**

`units.rs::suffix_is_negative_hemisphere` requires `rest[0] == 0xC2`, i.e. the `°` prefix. Without
it, `34.9011S` matches neither arm of the figure classifier and falls through to `K_IDENT`
(`tokens.rs:201`, `has_alpha && has_digit`), where no tolerance applies at all.

```
GT: "Approximate coordinates are -34.9011, -56.1645."     (ip build)
  -34.9011, -56.1645        (right)                 -> 1.0000
  34.9011°S, 56.1645°W      (right, degree sign)    -> 1.0000
  34.9011S, 56.1645W        (right, no ° sign)      -> 0.0000
  34.9011 S, 56.1645 W      (right, spaced)         -> 0.0000
  34.9011°N, 56.1645°E      (WRONG hemisphere)      -> 0.0000
```

A **correct** answer in the most common plain-text coordinate format is scored identically to one
in the wrong hemisphere. This falsifies README §A4 format-equivalence for the one field type the IP
build calls "the spine of this intent".

## M6 · A hyphenated range is silently read as its lower bound

`units.rs::leading_number` stops at the first non-`.` separator, and the tokeniser has already
absorbed the `-` into the token (`5-50` is one `K_NUMBER` with `val = 5.0`).

```
GT: "Sustained winds of 47 m/s are expected."     (storm build)
  47 m/s                (right)                      -> 1.0000  fact=1.0000
  5 m/s                 (wrong)                      -> 0.0498  fact=0.1006
  5-50 m/s              (range CONTAINING the truth) -> 0.0498  fact=0.1006   <- identical to "5 m/s"
  46-48 m/s             (tight range, contains 47)   -> 0.6432  fact=0.8246   <- scored as 46
  between 5 and 50 m/s  (worded)                     -> 0.1164  fact=0.2281
```

Every range answer is scored as if it asserted only its floor. A meteorologically correct
"gusts of 40–60 km/h" is scored as "40 km/h". The upper bound is invisible to the module and to any
reviewer reading the code.

## M7 · Three README claims are falsified by the shipped binaries

| README | claim | measured |
|---|---|---|
| line 32 | "That is what makes a terse-but-correct answer score like a verbose one." | terse-correct **1.0000** vs verbose-correct **0.8329** on the same row; the design rewards saying less |
| line 29 | "**A wrong fact cannot hide.**" | 3 of 5 decisive facts wrong → **0.9597**, above a fully correct verbose answer (C4) |
| line 151 | "degrades, does not fall off a cliff" | 9.8 → 1.0000, 9.7 → 0.0009 (M2) |

The terseness claim is worth restating as an incentive: under the IP build the score-maximising
strategy is to emit the two or three most-likely-correct proper nouns and stop. `"United States."`
alone scored **1.0000** against a full ground truth (`P=1.0, ans=0.9104`). Every additional true
detail can only lower the score. A scoring module that pays miners to answer less is not a scoring
module a Tier-A intent wants.

## M8 · The proof corpus tests one string per class, and the classes do not generalise

The README's per-class table reports `REFUSAL / STUFFING / EMPTY / CONTENT-FILTER / TEMPORAL —
all 1.0`. Each of those classes is a single hand-authored string. C5 shows a second string from the
STUFFING class scoring **1.0000** on real rows; C2 shows the CONTRADICTION class (also 1/1) missing
polarity flips entirely; C3 shows REAL-PARROT scoring 0/8 on the intent where it matters.

A reviewer scoring the 30 % robustness axis will ask how many strings per class. The answer today
is one. The fix is cheap — generate the class members mechanically from the question, as this review
did — and until it is done, the "would promote" verdict rests on a corpus that cannot see the
attacks above.

## M9 · The boilerplate whitelist is a phrasing match, four entries of which are answer openers

`tokens.rs:263–276`. Eight entries are genuinely contentless (`The data shows/provides/…`). Four
are not:

```rust
&[hash_str("the"), hash_str("weather"), hash_str("forecast")],
&[hash_str("the"), hash_str("current"), hash_str("weather")],
&[hash_str("the"), hash_str("forecast"), hash_str("for")],
&[hash_str("the"), hash_str("weather"), hash_str("in")],
```

`weather` and `forecast` are content words for a weather intent. Striking them from position 0 only
means an answer opening `"The weather forecast for Bergen …"` is scored on a different token set
than one opening `"Bergen's forecast …"`. Measured on the storm build, using a whitelisted opener is
worth up to **+0.02** against a neutral one (1.0000 vs 0.9816 for `"Our analysis shows "`,
0.9796 for `"According to the record "`).

Small in magnitude, but this is a **phrasing** table in a submission whose Rule-04 disclosure says
"No slug, wallet, field name or phrasing is matched, favourably or otherwise" (README:227) and whose
project rule 2 says the same. That sentence is not true as written. Either the four weather entries
come out, or the disclosure changes to describe them.

---

# MINOR

- **m1 · Dead state, computed every call.** `Toks::cval` is written twice per token
  (`tokens.rs:232`, `units.rs:275`, the second one calling `canonical()`) and **never read
  anywhere**. That is 3 × 2048 × 4 B = 24 KiB of static memory and one conversion per token per
  call, for nothing.
- **m2 · Dead tunables and `allow(dead_code)` masking.** `echo_discount` is shipped, documented as
  "Reserved, currently unused", and read by nothing. `Set::has` is unused. `#![allow(dead_code)]`
  sits at the top of five of the eight modules, which is exactly what stops the compiler pointing
  at m1 and m2. A reviewer will read the blanket allow as suppressing the check rather than passing
  it.
- **m3 · The heap comment overstates its own margin.** `lib.rs:40–42` says the 1 MiB arena is sized
  "for three 128 KiB texts … several times over". Three 128 KiB texts is 384 KiB; the factor is
  2.7×, and the wrap-safety argument in the doc comment rests on that number. (The allocator itself
  is sound — see "attacks that failed".)
- **m4 · `ms` is mapped to metres-per-second** (`units.rs:98`), colliding with milliseconds. Any
  answer stating a latency of `250 ms` asserts a wind speed of 250 m/s to this module — measured,
  `"The latency is 250 ms."` against `"Sustained wind reaches 250 m/s."` returns `fact = 1.0000`.
  Relevant to SSL_VERIFICATION / any latency-bearing intent if the generic build is reused.
- **m5 · The identifier channel silently disables itself** whenever the ground truth states no
  identifier (`facts.rs:141`, `if tg.has_ident`). A wrong IP in the answer is then only a precision
  miss, never a fact-channel miss — the "identifiers admit no tolerance" guarantee (README:27) holds
  only when the ground truth happens to quote an identifier of its own.

---

# Attacks that failed

Listed so the review case can claim them.

- **Stage-1 fuzz: clean.** 19,734 module-calls across all three builds — 2,500 rounds of uniform
  random bytes (invalid UTF-8), 4,000 rounds biased to the token-sensitive alphabet
  (`.,-:/_ 0-9 eE+- % ° a-z NUL 0xFF`), lengths 0/1/7/8/4095/4096/65535/65536/131071/**131072**
  /131073/262144 in each of the three slots, all three at the 128 KiB `MaxTextBytes` cap
  simultaneously, 100 KB single tokens, `1e309`, `0x1p1023`, 400-digit and 21-digit integers,
  denormals, `1e-400`, `-0`, `Infinity`/`NaN` as words, comma/dot/separator/`°C` bombs, 50 KB of
  high bytes, interleaved NULs, mixed CJK/Arabic/Greek/emoji. **Zero traps, zero hangs, zero
  non-finite or out-of-`[0,1]` returns, zero calls over 500 ms.** `clamp01`'s NaN-to-0 collapse
  holds on every path.
- **Unit arithmetic is correct.** 5 m/s ≡ 18 km/h (0.9656) ≡ 9.7 kt (0.9891) ≡ 11.2 mph (0.9880);
  23.1 °C ≡ 73.6 °F (0.9520); the wrong-unit variants (5 km/h, 5 kt, 5 mph, 18 m/s) all land in
  0.03–0.08. The conversion constants in `units.rs::canonical` are right.
- **Identifier near-misses are caught.** `192.168.1.100` / `192.168.1.11` / `192.169.1.10` /
  `CVE-2020-44228` all score 0.0000 against the correct ids. (Subject to C1, which bypasses the
  whole pipeline.)
- **Number-spraying loses.** Seven figures sprayed across dimensions scored 0.0004 on the IP build
  vs 1.0000 for the honest answer — unverifiable figures are neutral in `fmul` but still dilute the
  precision denominator, which is the correct outcome.
- **Prepending a boilerplate opener is not free score** on the IP build (identical to 4 dp with and
  without `"The data shows "`). Only the storm build shows the +0.02 of M9.
- **The question-echo defence works on IP_GEOLOCATION** — 0.0007–0.0033 across 36 questions,
  *better* than the champion's 0.0091. This is the thesis working; it is defeated only on the storm
  build, and only by `ans_floor` (C3).
- **No miner fingerprints.** No slug, wallet, schema key or `livecert`-specific phrasing anywhere in
  `src/`. The only phrasing table is the boilerplate list (M9), which is generic-weather, not
  miner-specific.
- **`tune.md` matches `profile.rs` exactly.** All 27 base constants and all 12 per-intent overrides
  checked one by one. No drift.
- **`dist/*.wasm` is behaviourally current with `src/`.** Read back through `breakdown_answer`, the
  storm build reports `answered = 0.75` and the ip build `answered = 0.05` for a pure echo — the
  two `ans_floor` values in `profile.rs` as of this review.
- **Build hygiene holds.** `cargo test` 44/44 pass. `node verify.mjs` passes in full on all three
  builds. `wasm-tools print | grep -c '(import'` = **0** on all three. The 13.8–13.9 KB sizes are
  as claimed.

---

# What a rival or an organizer would go for first

1. Run the question echo through `storm_alert.wasm` (C3). It is one line of Node, it needs no
   ground truth, and it produces 0.84 next to our own README calling the champion's 0.9933 the
   headline defect.
2. Feed `"The CVSS score is 1.0"` against a ground truth of `10` (C1). A literal 1.0 for a wrong
   answer, in a module whose thesis is fact-awareness.
3. Flip a polarity (C2). One word, ties the correct answer.

None of the three requires reading the source.
