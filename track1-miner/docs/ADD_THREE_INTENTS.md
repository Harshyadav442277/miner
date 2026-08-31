# Ready to sign — three new intents on registration 334

**Written 2026-08-31. Code is DEPLOYED and verified in production; only the on-chain step remains,
and only the operator can do it.** Claude never touches the wallet.

Every intent below was entered only after its **own live champion scorer** was run against the
**deployed** answers over real recorded questions. Three other candidates were measured and
rejected on those numbers; they are listed here so nobody re-opens them.

## The three being added

| intent | endpoint | miners | bar to beat (epoch 295) | our measured score |
|---|---|---:|---|---|
| **CONTENT_EXTRACTION** | `/extract` (new) | 2 | **0.0** — both incumbents scored exactly zero | **1.000000 on 6 of 6**, raw and clipped |
| **NEWS_HEADLINES** | `/headlines` (new) | 2 | **0.00262926** (`newswire-headlines`) | **0.006447** mean; all 22 questions above the bar |
| **WALLET_BALANCE_CHECK** | `/wallet-balance` (new) | 8 | 0.000109094 (`preflight`); all-time best across every miner 0.00747 | **0.230285** mean, **3 of 13 crossing at 0.99**, 0 failures |

### The decision rule used

Judging normalises as *our score ÷ the best score in that intent*, averaged across intents. Our
epoch-295 ratios average about **0.72** (weather's infrastructure zero and translation's 0.39 drag
it down). So an intent is worth entering when our expected ratio there **beats 0.72** — winning it
outright is sufficient but not necessary. That is the test every candidate below was put to.

`WALLET_BALANCE_CHECK` has eight miners and we will not always be first, but the whole field sat at
~1e-4 in epoch 295 and its all-time best is 0.00747, against our measured 0.23. Even a middling
epoch there lands far above 0.72.

`CONTENT_EXTRACTION` is the strongest opportunity found in this project. Its questions carry their
payload inline ("Extract the contact details from: …"), our answer reproduces the reference almost
verbatim — `Email: support@example.com. Phone number: 555-0192.` — and because the answer is short
and reference-shaped it scores 1.0 **after** the ~32-word conversion clip as well as before. The
incumbent `microlink-url-extraction` is a URL fetcher and there is no URL in these questions.

`NEWS_HEADLINES` is a real contest rather than a walkover: headlines rotate between when a ground
truth is written and when it is scored, which caps the achievable score. That is why the measured
mean is 0.0064 and not 1.0. It still beats the live bar on **every one** of the 22 recorded
questions.

## Measured and REJECTED — do not re-open without new evidence

| intent | miners | why not |
|---|---:|---|
| **TEXT_AUTHENTICITY_CHECK** | 0 | Its champion (reg 1882) is reachable — a ground-truth paraphrase scores 1.0 — but the ground truths assert facts that are **not in the supplied text**, e.g. "a reviewer history of 40 five-star reviews posted in one day". Our honest verdict-plus-evidence answer scores **0.000001**; the deployed answer scores 0.0. Crossing would require inventing reviewer history we cannot observe. An uncontested rank 1 at 0.0 is not a win and may drag the cross-intent average. |
| **CONTENT_VERIFICATION** | 1 | Sole incumbent `faceplus` has **never scored above 0** in 36 rows and currently fails at request-build. But the questions are general-knowledge items about famous verification cases (Bicholim hoax, Balloon Boy, Sokal, Surgisphere), and its scorer is binary: ground truth 1.0, Wikipedia-retrieved answer **0.0**, honest refusal 0.0. We would tie at zero. |
| **TOKEN_HOLDER_COUNT** | 4 | **No data edge.** `chainsight-oracle` reads the same keyless Blockscout endpoint we would and returns identical counts (USDC 9,039,953 on both). Contested by the two strongest generalists, and no recorded questions survive, so it cannot be measured. Its transient zeros are real but reliability alone is a thin edge in a contested field. |
| **FACT_CHECK**, **IMAGE_VERIFICATION** | 2, 2 | **Zero recorded questions**, so their scorers cannot be run. Entering on incumbent weakness alone is exactly what `SENTIMENT_ANALYSIS` cost us. Image verification also cannot be answered honestly without real forensics — the `SPORTS_SCORE` precedent. |
| **CVE_LOOKUP** | 5 | **Re-measured 2026-08-31 against the NEW champion (reg 1993, changed 2026-08-30), because the old 0.24 figure was stale.** Result: raw mean **0.499757**, a clean split of 11 questions at ~0.999 and 11 at exactly 0.000. The zeros are not our data: *the same CVE with our byte-identical answer scores 0.998742 on one phrasing and 0.000000 on another*. The scorer is a step function keyed on question and ground-truth phrasing, not on answer quality. `patchsignal-cve` scored 1.0 in epoch 295, so our ratio would be ~0.50 — **below the 0.72 threshold, so it would dilute the average**. A coin flip we do not control. |
| **SPORTS_SCORE** | 3 | Zero recorded questions, and the standing precedent: a free sports API returned a friendly against AC Milan when asked for the most recent Premier League meeting. A confidently wrong final score is worse than not serving the intent. |

## Also in this change

**`output_schema` now describes every field the endpoints return.** It omitted **32** of them
across nine of the ten routes — the whole of what `/extract`, `/headlines` and `/wallet-balance`
return, the parts of the resolved place `/ip-geolocate` reports, the `papers` array, and the
measurements `/ai-detect` publishes so a reader can disagree with its verdict. Only `/ssl-check`
was fully described. Nothing enforces the schema (no `required` list, `additionalProperties` is not
false, and our IP answers scored 0.9920 while violating the old verdict enum), so this was never a
functional fault — but one signature covers it, so it is fixed here rather than left describing a
service we stopped being. Verified by probing all ten live endpoints: no returned field is
undeclared.

The `verdict` **enum is relaxed to describe actual behaviour**. It was a closed set that four
endpoints already violated — `/ip-geolocate` returns a resolved place name, which no enum can
cover. Never enforced (our IP answers scored 0.9920 with a place-name verdict), but the manifest
should describe what the service does.

## Risks

1. **`updateMiner` replaces the whole registration.** A bad activation takes all ten intents
   offline. Mitigations: the code is already live so activation cannot find a missing route,
   `verify-deploy` exits 0 against production, 182/182 tests pass, and a manifest test fails the
   build if endpoint intents and `supported_intents` disagree. **Sandbox-validate first.**
2. **Traffic may be near zero** in both. These are rank plays, not eligibility plays.
3. **Headlines go stale**, capping the score as described above.

## Steps

1. Re-check occupancy immediately before signing:
   `curl -s https://devnode.telegraphprotocol.com/engine/v1/intents | grep -E "CONTENT_EXTRACTION|NEWS_HEADLINES"`
2. `gh gist create track1-miner/miner.yaml --public --desc "livecert miner manifest — 10 intents"`
3. `gh api gists/<GIST_ID> --jq '.files["miner.yaml"].raw_url'`
4. `curl -sL "<RAW_URL>" | sha256sum` — hash the **hosted** bytes, never the local file.
5. `cast send 0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8 "updateMiner(uint256,string,bytes32,address,uint256,string[])" 334 "<RAW_URL>" "0x<HASH>" 0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e 10000 '["SSL_VERIFICATION","STORM_ALERT","WEATHER_FORECAST","IP_GEOLOCATION","LANGUAGE_TRANSLATION","ACADEMIC_SEARCH","AI_TEXT_DETECTION","CONTENT_EXTRACTION","NEWS_HEADLINES","WALLET_BALANCE_CHECK"]' --rpc-url https://sepolia.base.org --interactive`
6. Confirm `active`, `rejection_reason: null`, **ten** intents; then
   `gh variable set REGISTRATION_ID --body <new-id>`; then verify-deploy must exit 0.

`cast` is not installed on this machine — install Foundry, or use the console Import & Upload path
that registered 334, verifying the pinned bytes before signing because the console re-serialises.

## If you skip it

The seven current intents are unaffected; `/extract` and `/headlines` simply serve traffic that
never arrives. **Do not sign against a node that is timing out** — devnode was unreachable for
hours on 2026-08-30 and activation cannot be verified while it is down.
