# SIGNING.md — registration 260 completion record

Prepared and completed 2026-08-28. Registration 260 is active with all six intents.
The checklist below is retained as the validation record; do not sign it again.

---

## 1. What was signed, in one line

The same miner that is #1 in three intents, plus **`LANGUAGE_TRANSLATION`** and
**`ACADEMIC_SEARCH`**.

File: [`track1-miner/miner.yaml`](../miner.yaml)

**Checked again on 2026-08-28, epoch 288 — every incumbent in both intents scored zero:**

```
LANGUAGE_TRANSLATION   test-mymemory-translate  0.0      mymemory-translate  0.0
ACADEMIC_SEARCH        openalex                 0.0      semanticscholar     0.0
```

Any non-zero answer takes rank 1 in both. Our deployed `/translate` and `/papers` were verified
returning real data this session.

**There is a second benefit I understated earlier.** Both intents currently have **2 miners**, and
the guardrail needs 3. Registering makes each of them a 3-miner intent — so signing does not just
add two likely rank-1 positions, it clears the miner-count half of the eligibility guardrail for
both, without needing anyone else's cooperation. That is the opposite of `IP_GEOLOCATION`, which
stays stuck at 2 unless an outside party registers.

After signing we would clear the miner-count half in **five** intents (SSL 4, Storm 5, Weather 11,
Translation 3, Academic 3) instead of three. Rule 05 awards prizes on *"the highest overall
normalized scores across all intents"*, so breadth compounds — and the best miner in each intent
takes full points for that intent.

## 2. What changed against the registration that is live and working

I fetched the YAML actually pinned for registration 236 from IPFS, confirmed it hashes to the
`yaml_hash` recorded on-chain (`a09261a3…18eb82d`), and diffed the pending file against it
semantically rather than by line. The complete set of differences:

| Change | Detail |
|---|---|
| **+2 intents** | `LANGUAGE_TRANSLATION`, `ACADEMIC_SEARCH` |
| **+2 endpoints** | `/translate`, `/papers` — both already deployed, live and keyless |
| **+1 input param** | `topic` (what the engine fills for an academic query) |
| **description** | rewritten to cover six intents instead of three |

Everything else is byte-identical in meaning to the working registration: same `id` 4433, same slug
`livecert`, same `base_url`, same `auth: {type: none}`, same `rate_limit_per_sec: 20`,
`cache_ttl_sec: 60`, `circuit_threshold: 5`, `circuit_cooldown_seconds: 30`, same
`signal_mapping`, and **no `limitations` block**. No `output_schema` field was dropped.

**Two things I fixed while preparing this:**

1. **`auth` was missing.** The pending file had no `auth` block at all, while the pinned working one
   declares `auth: {type: none}`. It is documented as optional, and the console most likely
   re-adds it when the API-key toggle is off — but registration is immutable and one of ours has
   already been rejected. Restored, so the only differences from a proven-good registration are the
   ones we intend.
2. **The `limitations` P0 is genuinely absent.** Verified directly against the live YAML docs, which
   say: *"Counts are node-wide per miner, not per caller: the node holds one upstream account for
   you, so all traffic draws on the same allowance."* There is no endpoint scope on a limitation
   entry. Declaring NVD's 5-per-30s would have throttled all six intents. It is not in this file.

## 3. The hash ritual was wrong — read this before you compare anything

MEMORY told you to expect a specific SHA-256 and match it after registering. **That check can never
pass, and it would have sent you chasing a phantom mismatch.**

The console re-serializes the YAML before pinning it. Proof: no committed version of `miner.yaml`
hashes to registration 236's on-chain `yaml_hash`, and the pinned file comes back with different
key ordering and different line wrapping from anything in git.

```
on-chain hash for 236   a09261a312610e2d1dc266f149078e41386eedb2a2524947fdbdd9f2318eb82d
commit 1b3bac4 local    3af6b9fa2fa4e164e2848cb4c64702069da014a9baa6c7d58e71672847b5718e
commit 938002a local    0a41987f94ee6093ee0d07c3086db94c0b2a835588c78ea24930e695e67cb2ff
```

So the local hash is only useful for one thing: confirming the file you upload is the file I
verified. Record it, then stop using it.

```
local sha256 of the file to upload:
0xe35e3e46b92e611781d5adf18f7ab30d5d0e6d9eb2c61698f0de1f5b1a98a3f5
```

The real post-registration check is in §5 — fetch the pinned content and read what it says.

## 4. Gates — all green as of 2026-08-28

- `node tools/verify-deploy.mjs https://miner-wine.vercel.app` → **all checks passed**, every one of
  the six declared endpoints has a semantic check, median 488ms / p95 1180ms.
- `npm test` → **109/109**. `npm run typecheck` → clean.
- Registration 236 → `activation_status: active`, unchanged and untouched.
- `/translate` and `/papers` verified live this session, returning real data.
- YAML parses, and the semantic diff in §2 is the whole diff.

**One gate I could not close for you.** I probed for a wallet-free validation endpoint so the
sandbox check could run before you touch the console. There is none — `/api/miners/validate` just
matches the `/api/miners/:id` route, and the reference registration script confirms the node only
schema-validates *after* registration, at the next epoch boundary. So the console's Validate button
is the only pre-flight that exists, and it sits behind wallet connect. That step is genuinely
yours; everything ahead of it is done.

**Not gated, and you should know it:** the pretune numbers that justified these two intents
(translation 0.614, academic 0.0295) were measured against our endpoint's raw `reason` string,
but the live scorer reads `converted_answer` — an LLM summary of our JSON, which in the epoch-288
SSL row was roughly half the length of our `reason`. So treat those figures as optimistic. The
decision survives it anyway: in epoch 288 **all four incumbents across both intents scored 0**, so
even a heavily discounted answer wins. That is why this is still worth signing.

## 5. Completed operator sequence

**Before signing, the operator confirmed the uploaded file was the verified one.**

PowerShell (this repo's normal shell — there is no `sha256sum` on Windows):

```powershell
(Get-FileHash track1-miner/miner.yaml -Algorithm SHA256).Hash.ToLower()
```

Git Bash:

```bash
sha256sum track1-miner/miner.yaml
```

Either must print `e35e3e46b92e611781d5adf18f7ab30d5d0e6d9eb2c61698f0de1f5b1a98a3f5`.

**At the console** — `integrate.telegraphprotocol.com`:

1. **Connect** (Base Sepolia, chain 84532). Make sure it is the miner wallet
   `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`.
2. **Import & Upload** → select `track1-miner/miner.yaml`.
3. **REQUIRES API KEY → OFF.** This is the toggle that produces `auth: {type: none}`.
4. **Validate.** Do not proceed on any error or warning — send me the text instead. A rejection
   releases the slug to anyone, and registration is effectively immutable.
5. **Sign** `registerMiner`. This creates a **new registration id**; that is expected and correct.
   225 went `superseded` when 236 activated, and 236 will do the same. **Registration 236 stays
   live and serving until the new one is confirmed `active`** — there is no gap.

**After — send me the new registration id** and I will run these. Or run them yourself:

```bash
curl -s https://devnode.telegraphprotocol.com/api/miners/<newId> \
  | jq '.miner | {activation_status, rejection_reason, supported_intents, yaml_hash}'
```

What it must say: `activation_status: "active"`, `rejection_reason: null`, and all **six** intents
listed. Then read back what was actually pinned, which is the check that matters:

```bash
curl -s "<yaml_url from above>" | grep -A2 "supported_intents" && \
curl -s "<yaml_url from above>" | grep -c "limitations"   # must be 0
```

## 6. The twitter field — tried, rejected by the sandbox, removed

I added `docs.twitter: "@hyadav42774"` on the theory that the miner catalog is the only public link
between the miner and the X account. **The sandbox rejected it on 2026-08-28:**

```
VALIDATION FAILED
· parse YAML: yaml: line 14: found character that cannot start any token
```

Our file had it correctly quoted, which is valid YAML. The console's own preview showed it
re-serialized as `twitter: @hyadav42774` — **quotes stripped**. `@` is a reserved indicator in YAML
and cannot start a plain scalar, so the console produced a file its own parser then refused. Line
14 matches: in the console's serialization, `docs:` → `repository:` → `twitter:` lands there.

Field removed. Nothing was wrong with the miner, and no transaction was sent — this is exactly what
the sandbox gate is for.

**The general lesson, worth keeping:** the console re-serializes before validating and pinning, and
its serializer does not preserve quoting. So **never put a value in this YAML that depends on being
quoted to parse** — anything starting with `@`, a backtick, `%`, `&`, `*`, or `!`. Write values that
are valid unquoted, or leave them out.

## 7. Historical rejection procedure

Do not re-sign in a hurry. Send me `rejection_reason` verbatim. Registration 1377 was rejected
before and the calibration from reading its reason is what produced a clean 236. 236 keeps serving
throughout, so a rejection costs time, not position.
