# Routed refusals — 2026-09-10, epoch 321 standing

The registration was already live and green when this session started: **1379,
`active`, twenty-six intents**, hash `54b36692…3b81dbbf` matching the published
file byte for byte, 380 unit tests, 7/7 preflight. Codex's twenty-six-intent
expansion and its wallet repair batch were both deployed and verified. Nothing
in them needed finishing.

What was left undone was the measurement that follows a deploy. This report is
that measurement, and the four defects it found.

## The method, and why the tool had to be repaired first

The one lever this repo has repeatedly shown to matter is **replaying the
questions the network actually routes**. A refusal scores about 1e-11 where an
answer can cross to 1.0, so one recovered question outweighs any amount of
phrasing work.

`replay-intents.mjs` could no longer refresh its corpus. The explorer's question
feed **502s or hangs at `limit=100`** — measured at a 45 s timeout — and answers
in about three seconds at `limit=50`. Worse, a single failed page ended the whole
sweep with "Feed returned no usable questions". Pages are now 50 rows, a failed
page is retried three times, and only three consecutive dead pages stop it.

The refreshed sweep read **3,000 rows and produced 287 distinct routed questions
across 24 of the 26 intents**. SPORTS_SCORE and TEXT_AUTHENTICITY_CHECK have no
routed questions at all, so neither has ever been measured this way.

## Baseline: 358 of 456 routed questions answered

The refusals were not spread evenly. They clustered, and mostly in intents where
we do not rank first.

| Intent | Rank at 321 | Before | After | What was wrong |
|---|---:|---:|---:|---|
| STORM_ALERT | 3 | 63/65 | **65/65** | geocoder |
| WEATHER_FORECAST | 5 | 37/41 | **39/41** | geocoder |
| WEATHER_CHECK | 5 | 26/29 | **28/29** | geocoder |
| CURRENCY_EXCHANGE | 4 | 1/4 | **4/4** | one named currency refused |
| FINANCIAL_DATA | not scored | 2/14 | **7/14** | "Will X …?" named no company |
| **Overall** | | **358/456** | **371/456** | |

## The four defects

**1. Open-Meteo's gazetteer searches a NAME, not a "city country" phrase.**
`Lagos Nigeria`, `lagos nigeria` and `Houston Texas` all return zero results;
`Lagos, Nigeria`, `Houston, Texas` and a bare `Lagos` all resolve. Six routed
questions across three intents arrive without that comma and every one was
refused. Every multi-word candidate now also offers the comma-separated form and
its leading words, appended *after* the candidates already found, so the widened
forms cost a geocoder round-trip only on a question that would otherwise be
refused. The geocoder stays the arbiter of whether a string names a place.

**2. An all-lowercase question produced an EMPTY candidate list.** The locative
match was anchored to the end of the string, so it saw nothing in "…for lagos
nigeria starting today, including temperature, …". With no proper noun either,
that question was refused without one geocoder call being made. Clauses ending
at a comma are now scanned the same way the end-anchored tail is.

**3. One named currency was refused as an incomplete conversion.** Three of the
four routed CURRENCY_EXCHANGE questions name exactly one currency — "whats the
fx rate of euro?" — and all three were refused. An unqualified FX quote is
against the US dollar, and against the euro when the dollar is the one named.
The answer states both currencies and both directions, so the assumed pair is
visible in the prose the scorer reads. A request naming *no* currency still
refuses, and the correctness gate now asserts that instead of the old behaviour.

**4. "Will Sandoz's …" resolved the company name "Will Sandoz".** A capitalised
run is matched greedily, and Yahoo resolves `Sandoz` to SDZ.SW and `Will Sandoz`
to nothing. **This is the "Will Dubai" defect that refused fourteen
WEATHER_CHECK questions, reappearing in a second intent** — the third time this
repo has met the greedy-proper-noun-run shape. Question-opening words are now
trimmed off both ends of a run; a leading capitalised run is the fallback when
no possessive or "of X" phrase matches; and a name that misses is shortened
("Apple AirPods" → "Apple", "Hitachi CO2" → "Hitachi").

Two guards went in with it, because a fuzzy search is dangerous here:

- **A hit has to name the company asked about.** Yahoo returns the Brazilian
  paper company IRANI for "Iran", and reporting its market data as the answer to
  "Will Iran's inflation rate decrease?" would be exactly the confidently-wrong
  answer this miner refuses everywhere else. The first word of the asked name
  must appear as a *whole word* in the hit's own name or symbol.
- **A whole sentence is never shortened.** The fallback that hands the resolver
  the raw question would otherwise trim "market data please" to "market", which
  Yahoo resolves to Vanguard's total-market ETF. This one was caught by an
  existing test, not by review.

Zepbound, YESAFILI and Novitium Pharma resolve to nothing at any length and are
still refused.

**5. The candidate sweep now shares one deadline.** A longer candidate list
under a per-candidate 8 s budget could spend the route's whole 11 s watchdog on
geocoding and return a 504, which scores what a 400 scores. The first candidate
keeps the full budget; later ones get what is left, and the loop stops rather
than starting a request it cannot finish.

## What was deliberately not changed

- **TELEGRAPH_KNOWLEDGE answers 5 of 30.** The other 25 are prediction-market
  questions — "Will Ukraine win the war?", "Will Meta fire the executive?" — that
  the Daemon routes here and that are not about Telegraph. The refusals are
  honest, we hold rank 1 at score 1.0, and answering them would need an LLM.
- **NEWS_HEADLINES refuses two nonsense topics** with an honest "no headlines on
  that topic". Falling back to general headlines is a coin flip against an unseen
  ground truth and risks a rank we hold.
- **CVE_LOOKUP refuses six legitimate year queries** — "CVE 2015", "Criticial CVE
  2025", "Look up for latest CVEs". These are answerable through NVD's severity
  and date filters, but NVD caps a date range at 120 days, so a year needs
  several calls inside a 6 s budget. Left as **G105**: it is the largest
  remaining refusal class in an intent we currently hold at 1.0.
- **The near-miss intents were not chased.** IP_GEOLOCATION (0.99671 vs
  0.99683), FACT_CHECK (2.9515e-9 vs 2.9542e-9) and AI_TEXT_DETECTION are
  separated by noise, not by a defect, and their refusals are all correct ones.

## Standing, unchanged by this session

Epoch **321** at 05:55 UTC: **8 rank-1 of 26**, nineteen intents scored, seven
newly registered and not yet scored. Epoch 322 had not landed at 19:36 UTC,
about four hours past the observed ~9 h cadence, so everything here is deployed
ahead of it.

**No rank is claimed.** Every number above is a routed-question answer rate
measured against production, not a score. The manifest did not change, its hash
still matches the registration, and no `updateMiner` was needed.

Production ends the session on **`miner-4bdjfyb3m`** (after `miner-cpy9hc0gq`),
alias `miner-wine.vercel.app` verified serving it, **390 unit tests**, **7/7
preflight gates including 26/26 intent correctness**, watcher `active`.
