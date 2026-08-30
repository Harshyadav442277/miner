# Expansion targets — the undefended intents, measured 2026-08-30

Recon prompted by the observation that FACT_CHECK and AI_TEXT_DETECTION have only two miners each
and both look weak. They do, and they are not the only ones. This is what the live node says.

Sources: `/engine/v1/intents` (miner counts), `/scores?intent=X` (per-epoch results), `/api/miners`
(base URLs and manifests), `/api/wasm` (champion scorers). All read 2026-08-30.

## 1. The undefended intents, ranked

Every intent below has two or fewer miners, and every incumbent has scored **0.0 in the most recent
epochs**. A miner that returns any scoreable answer takes rank 1 outright.

| intent | miners | incumbents and what they are doing |
|---|---:|---|
| **SENTIMENT_ANALYSIS** | 2 | `telegraph-ai-miner-node` — upstream 404. `textprocessing-sentiment` — upstream 405. Both 0.0 for four straight epochs. |
| **AI_TEXT_DETECTION** | 2 | `veritarach-ai-text-detector` — answers, scores 0.0 every epoch. `bittensor-sn32-itsai` — upstream 400. |
| **FACT_CHECK** | 2 | `tavily` — 0.0 at epochs 291 and 292; scored 0.99999994 once at 289, so it *can* land. `assay-miner` — upstream **403 every epoch**, structurally broken (see §2). |
| **NEWS_HEADLINES** | 2 | `newsapi` — upstream 400 every epoch. Only one miner appears in the score rows at all. |
| **CONTENT_EXTRACTION** | 2 | `microlink-url-extraction` — 0.0 every epoch. |
| **TEXT_AUTHENTICITY_CHECK** | **0** | **Never scored. No miner has ever served it.** |

## 2. Why the incumbents are failing

Two are worth reading, because they show the bar is genuinely low.

**`assay-miner` (FACT_CHECK) cannot ever score.** Its manifest sets
`base_url: https://raw.githubusercontent.com/GreatSage-dev/Assay/main` and declares its endpoint as
`path: /miner.py, method: POST`. GitHub's raw file host does not accept POST, so every call returns
403. It has failed identically in every epoch on record. This is not a miner that is losing; it is a
manifest pointed at a source-code file.

**`veritarach-ai-text-detector` (AI_TEXT_DETECTION)** answers without an upstream error and still
scores exactly 0.0 every epoch, which is what an empty or filtered `converted_answer` produces.

`tavily` is the only genuine competitor in the group, and it is intermittent.

## 3. What this is worth, honestly

**The upside.** Rank 1 in an intent nobody is contesting, immediately, and each entry takes its
intent from 2 miners to 3 — which is exactly the miner-count half of the eligibility rule. Entering
two of these clears that half for both.

**The limits, stated plainly:**

- **The 100-request half of eligibility is untouched by any of this.** Track 3 has not opened; our
  whole miner has served 57 lifetime requests against a floor of 100 *per intent*. Rank 1 in a new
  intent has the same eligibility problem as rank 1 in SSL.
- **Judging averages across intents** (organizer, 2026-08-29), and the formula is not final. More
  rank-1 intents should help under any reasonable averaging, but a new intent we serve *badly*
  could dilute rather than add. That argues for entering few and serving them properly.
- **Every one of these is Tier B** — open-ended, semantic answers — which is the shape our answers
  have historically been weakest at. The measured Track 2 evidence is blunt about it: our scoring
  work was strong on typed numeric facts and weak on semantic verdicts.

## 4. Serviceability, one intent at a time

Ordered by how honestly we can answer, which is the only order that matters — the
`SPORTS_SCORE` decision (a free API confidently returned the wrong fixture, so the intent was
dropped) is the precedent, and a confidently wrong answer is worse than no answer.

### SENTIMENT_ANALYSIS — the best target

Honestly servable with **no upstream dependency at all**: a deterministic lexicon plus negation and
intensifier handling, returning a polarity label, a score, and the specific tokens that drove it.
No API key, no rate limit, no cold start, nothing to 404. Both incumbents fail on upstream errors,
which is precisely the failure mode a zero-dependency endpoint cannot have.

This is the same architectural edge that won SSL_VERIFICATION: incumbents wrapping fragile third
parties, us doing the work in-process.

### FACT_CHECK — servable, with discipline

Requires evidence retrieval. Wikipedia/Wikidata plus the existing OpenAlex client in `papers.ts`
covers a real share of checkable claims. The discipline it needs: return `supported`, `refuted` or
**`insufficient_evidence`**, quote the source, and never manufacture a verdict the evidence does not
carry. `insufficient_evidence` must be a first-class answer, not a failure.

Note that many ground truths in this protocol are themselves refusals, so an honest
"the available evidence does not settle this" is not the scoring liability it looks like.

### AI_TEXT_DETECTION / TEXT_AUTHENTICITY_CHECK — enter only with hedged claims

The underlying science does not support confident classification, and any miner claiming otherwise
is overclaiming. What we *can* do honestly is report measurable statistical properties — sentence
length variance, type-token ratio, repetition, punctuation regularity — state what they weakly
indicate, and give a calibrated confidence that is usually low.

That is a real answer and it beats 0.0. It is also the one target here where the honest version and
the high-scoring version might diverge, so it should be entered last, if at all.

`TEXT_AUTHENTICITY_CHECK` has zero miners: entering alone makes it 1, still below the 3-miner floor,
so it wins a rank that cannot pay. Worth it only as a companion to AI_TEXT_DETECTION.

### NEWS_HEADLINES, CONTENT_EXTRACTION — cheap, if the code already exists

`CONTENT_EXTRACTION` is close to what `src/extract.ts` already does. `NEWS_HEADLINES` needs a feed
source; the repo already knows Google News RSS works if `hl`/`gl`/`ceid` are omitted.

## 5. Recommended order

1. **SENTIMENT_ANALYSIS** — zero-dependency, honestly servable, both incumbents dead on upstream
   errors. Highest confidence of an immediate, durable rank 1.
2. **FACT_CHECK** — real competitor in `tavily`, but it is intermittent and the other incumbent is
   permanently broken. Needs the `insufficient_evidence` discipline.
3. **CONTENT_EXTRACTION** — mostly existing code.
4. **AI_TEXT_DETECTION** (+ `TEXT_AUTHENTICITY_CHECK` alongside) — only with hedged, evidence-stating
   answers.

Every entry needs a manifest change, which means a new `updateMiner` signature from the operator,
and registration is effectively immutable — so batch them into one update rather than one per
intent. The sandbox validation rule in CLAUDE.md applies unchanged.

## 6. The multiplier that applies to all of them

The restatement change in [EPOCH_292_AUTOPSY.md](EPOCH_292_AUTOPSY.md) §5–8 applies to any new
endpoint for free, because it lives in `sendAnswer` rather than in a domain module. A new intent
inherits the format the ground truths are written in from its first epoch, rather than spending a
week discovering it the way SSL and weather did.
