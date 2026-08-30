# Registration update — adding AI_TEXT_DETECTION to registration 297

**Written 2026-08-30. Status: code deployed and green; only the on-chain step remains, and only
the operator can do it.** Claude never touches the wallet.

## What this update changes

`miner.yaml` gains **one endpoint** (`/ai-detect`) and **one intent** (`AI_TEXT_DETECTION`). The
`text` parameter description now mentions both endpoints that use it. Nothing else moves —
`base_url`, slug, id, fee address, min price, auth, rate limits, circuit settings and all six
existing endpoints are unchanged.

The endpoint is **already live and verified** at `https://miner-wine.vercel.app/ai-detect`, so
activation cannot find a missing route. `verify-deploy.mjs` exits 0 against production.

## Why it is worth a signature

AI_TEXT_DETECTION has two miners and the leader sits at **1.674e-10**. That is not a typo: the
incumbent `veritarach-ai-text-detector` returns `{"confidence":0.99987,"label":"human_written"}`,
a classification with no prose, and Telegraph scores a natural-language conversion of the answer,
so there is nothing to convert. Run against the live champion scorer (`aidet_s2.wasm`, reg 1286)
that exact shape returns **0.0**.

Our `/ai-detect` answers measured **4.5e-10, 1.0 and 1.0** on three cases — including the only
real question ever observed routed to this intent — beating the incumbent on all three. Entry also
takes the intent from 2 miners to 3, which clears the miner-count half of the eligibility rule.

## The risk, stated plainly

`updateMiner` is atomic: a **revert** leaves registration 297 untouched and costs nothing but gas.
The real risk is a **node-side YAML rejection after activation**, which would take all six current
intents offline until a corrected update lands — and we are rank 1 in three of them with four or
five epochs left. The change follows the same schema registration 297 was accepted under
(per-endpoint `intents` + `params`, closed-set fields only), so the risk is low, but it is not
zero. **Sandbox-validate first** — CLAUDE.md rule 3 is not optional here.

## Steps

**1. Publish a new gist revision.** Paste the current `track1-miner/miner.yaml` into the existing
gist (`006335cf54242bf98548535ec44632c7`) as a new revision, or create a new gist. Copy the
**revision-pinned** raw URL — the one containing the commit sha, not `/raw/miner.yaml`, so the
bytes can never change under the on-chain hash.

**2. Hash the exact hosted bytes** — not the local file. From the repo root:

```bash
curl -s "<NEW_RAW_GIST_URL>" -o /tmp/hosted.yaml && node -e "const c=require('crypto'),f=require('fs');const b=f.readFileSync('/tmp/hosted.yaml');console.log('bytes',b.length);console.log('0x'+c.createHash('sha256').update(b).digest('hex'))"
```

Local file for reference: **15,832 bytes**, sha256
`0xd04bc0492beb2e559c89f8556d62ba4efa20637ef96f6cfd285e0115fd9dbaf5`. If the hosted hash differs,
the gist re-wrapped the bytes — use the hosted one, always.

**3. Sandbox-validate** at `integrate.telegraphprotocol.com` before sending. Note the console
importer was broken on 2026-08-29 (it strips per-endpoint `intents`/`params` its own validator then
demands). If it is still broken, that is a console defect and not a signal about our YAML — but
check, because a clean run is the only pre-flight we have.

**4. Send the update.** Registration id is **297**, and the intent array now has **seven** entries:

```bash
cast send 0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8   "updateMiner(uint256,string,bytes32,address,uint256,string[])"   297 "<NEW_RAW_GIST_URL>" "<0xHOSTED_SHA256>"   0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e 10000   '["SSL_VERIFICATION","STORM_ALERT","WEATHER_FORECAST","IP_GEOLOCATION","LANGUAGE_TRANSLATION","ACADEMIC_SEARCH","AI_TEXT_DETECTION"]'   --rpc-url https://sepolia.base.org --interactive
```

`--interactive` prompts for the private key so it never lands in shell history or any file. The
hash argument is `bytes32` and **needs the `0x` prefix**; the value the API displays does not have
one.

**5. After sending.** Note the new `registrationId` — it supersedes 297 everywhere. Then:

```bash
curl -s https://devnode.telegraphprotocol.com/api/miners/<newId> | jq '.miner | {activation_status, rejection_reason, retrying, supported_intents}'
gh variable set REGISTRATION_ID --body <newId>
node track1-miner/tools/verify-deploy.mjs https://miner-wine.vercel.app
```

Activation took about a minute for 297. If `rejection_reason` is non-null, read it and send a
corrected update immediately — that window is downtime on all seven intents.

---

# Registration update — one signature, one purpose

Written 2026-08-29 (~09:30Z). Status: **ready for the operator.** Code is deployed and green;
only the on-chain step remains, and only the operator can do it.

## UPDATE 2026-08-29 (~13:45 IST): the console is broken — use the manual path below

The console at `integrate.telegraphprotocol.com` cannot register ANY miner today. Verified by
reproduction in a clean session: its importer **silently strips the per-endpoint `intents:` and
`params:` keys** (its endpoint editor has no field for either), then its client-side validator —
updated for the schema published in today's docs — rejects its own stripped output with
"no endpoint declares any intents". No network request is even made. Every YAML fails,
including the docs' own examples. **Report this in the hackathon Discord** — every other miner
registering today hits it too.

The docs' own manual path works and is fully prepared:

- `cast` v1.8.1 is downloaded and checksum-verified in the session scratchpad.
- All six intents re-verified canonical on-chain (`isCanonicalIntent` → true for each), so the
  update cannot revert on an intent string.
- Today's docs state `updateMiner` is **atomic** — a revert leaves registration 260 untouched —
  and that HTTPS hosting for the YAML is acceptable (IPFS recommended, not required).
- A node-side rejection after activation is fixed by another `updateMiner` with a corrected
  URL+hash (per today's docs) — not a from-scratch re-registration.

**Steps:** (1) host the YAML at a stable public HTTPS URL, (2) hash the exact hosted bytes,
(3) the operator runs, with the scratchpad `cast.exe`:

```
cast send 0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8 \
  "updateMiner(uint256,string,bytes32,address,uint256,string[])" \
  260 "<YAML_URL>" "<YAML_HASH>" \
  0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e 10000 \
  '["SSL_VERIFICATION","STORM_ALERT","WEATHER_FORECAST","IP_GEOLOCATION","LANGUAGE_TRANSLATION","ACADEMIC_SEARCH"]' \
  --rpc-url https://sepolia.base.org --interactive
```

`--interactive` prompts for the private key so it never lands in shell history or any file.
The remaining risk is node-side YAML validation after activation: our YAML follows today's
published schema exactly (per-endpoint `intents` + `params`, closed-set fields only), and a
rejection is recoverable per above, at the cost of downtime until the corrected update. After
sending: watch `/api/miners/<newId>` for `active`, then set the `REGISTRATION_ID` repo variable.

The section below is the original console flow, kept for when the console is fixed.

## What this update does

**It makes translation questions reach the miner.** That is all it changes.

The manifest ([miner.yaml](miner.yaml)) gains three input parameters — `text`,
`target_language`, `source_language` — and nothing else. `base_url`, slug, id, fee address,
intents, endpoints, auth and rate settings are byte-identical in intent to registration 260.

## Why it is worth a signature

Epoch 290 exposed that our LANGUAGE_TRANSLATION #1 was standing on luck:

- The engine fills **only the parameters a miner declares**. We declare no translation-shaped
  slot, so **both** scored translation epochs (289, 290) arrived with nothing filled. Both of
  our scored answers were refusals — "No text to translate was supplied."
- Epoch 289's #1 was refusal-overlap noise. Epoch 290 dropped us to #3 of 3.
- The mymemory incumbents *do* receive the text (their raw answers contain it) because their
  manifests declare text-shaped parameters.
- The endpoint itself is fine: given the text through any parameter, production translates
  correctly (verified live), and on the real recorded questions we beat both incumbents
  **9/9 with mean 0.614** vs their best 0.150. The manifest is the only thing in the way.

## What was evaluated and deliberately left OUT

- **CVE_LOOKUP** — measured 2026-08-29 under its **new** champion scorer (`cve_ms_10.wasm`,
  reg 1446): the incumbent patchsignal scores **0.999993**, our best honest answer measures
  **0.24**, and appending NVD's own description drives the score to exactly **0.0000** while
  patchsignal's equivalent content scores ~1.0. The champion scorer's author is the #1 miner.
  A captured intent is not worth entering. (The 150× advantage recorded in MEMORY was real,
  but under the previous scorer regime, which is gone.)
- **IMAGE_VERIFICATION / GAME_RESULT** — cannot be served honestly without image forensics or
  a reliable sports-results source; the confidently-wrong trap we already refused once with
  SPORTS_SCORE.
- **TEXT_CLASSIFICATION** — the whole field scores 0.000, but an honest classifier is an LLM
  problem and a keyword heuristic is shallow. Not worth the added surface.

## The steps (operator, ~10 minutes)

1. Open the console at `integrate.telegraphprotocol.com`, **Import & Upload** path (card 02) —
   the same flow that registered 236 and 260.
2. Import [track1-miner/miner.yaml](miner.yaml) from this repo (already contains the three new
   parameters; local schema/parity tests pass; `verify-deploy` exits 0 against production).
3. **Sandbox-validate first — hard rule 3.** All six endpoints must go green before signing.
   (`/ssl-check` may show 405 on the OPTIONS probe as before; real GET is 200 — this was
   registration 225's behaviour and it activated fine, and the server answers OPTIONS 204 now.)
4. Sign `updateMiner`. Note the new `registrationId` — **it supersedes 260 everywhere.**
5. Immediately after:
   - `gh variable set REGISTRATION_ID --body <newId>` (the uptime workflow watches it;
     this was forgotten across 225→236 and caught late — do it in the same sitting),
   - update the registration block in [MEMORY.md](MEMORY.md) §2,
   - `curl -s https://devnode.telegraphprotocol.com/api/miners/<newId> | jq .miner.activation_status`
     until `active` (236→260 activated with no serving gap).

## Risks, honestly

- A **rejected** registration releases the slug immediately (hard rule 3). The sandbox pass is
  the guard; do not skip it.
- 236→260 activated same-day with no grace-period reset and took #1s on its first scored epoch.
  There is no observed precedent of an update losing rank standing — but "no observed
  precedent" is not "impossible." The close is Aug 31; signing today gives 4–5 epochs of record
  under the fixed manifest.
- If the engine still sends nothing after the update, the deployed request log
  (`LOG_QUERY=on`, parameter names + emptiness only, never values) will show it, and we will
  know the filler, not the manifest, is the blocker.
