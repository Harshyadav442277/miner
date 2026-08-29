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
