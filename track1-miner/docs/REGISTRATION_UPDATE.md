# Registration update — 13 intents to 19

**Status: prepared, NOT signed. This needs the operator.** Claude does not connect
wallets, sign messages or send transactions (CLAUDE.md rule 1). Everything below
is prepared and validated; the clicking is yours.

Written 2026-09-08. Re-verify the hash before signing — any edit to `miner.yaml`
changes it.

---

## 1. What changes, in one line

The same miner, same slug, same base URL, plus **six new intents that are
already deployed and answering on production**.

```
registered now (reg 402)   13 intents   hash 7538082784c4b20849aeb54cfb6c2cf74100cf074dff3e0f8d8b268e12e47640
this file                  19 intents   hash 8d62ebe0136aea75e8185a5536f99687cac7650b31a31a5fb90c5c9aac94d874
```

Re-check the pending hash before signing — see §4.

| Change | Detail |
|---|---|
| **+6 intents** | `ONCHAIN_TX_LOOKUP`, `CVE_LOOKUP`, `TVL_LOOKUP`, `NEWS_SEARCH`, `CURRENCY_EXCHANGE`, `GAME_RESULT` |
| **+6 endpoints** | `/tx-lookup`, `/cve`, `/tvl`, `/news-search`, `/convert`, `/game-result` — all deployed, live and keyless |
| **unchanged** | `id: 4433`, `slug: livecert`, `base_url`, `auth: {type: none}`, the thirteen existing endpoints and every one of their parameters |

No existing endpoint's behaviour, path or parameter list changed. The six
additions are additive.

## 2. Why each one, on evidence

Full measurements in [EXPANSION_MATRIX.md](EXPANSION_MATRIX.md) and
[EXPANSION_2026-09-08.md](EXPANSION_2026-09-08.md).

- **ONCHAIN_TX_LOOKUP** (12 miners) — a mined receipt is immutable, so reading
  the chain correctly *is* the ground truth. One miner crosses at ~0.995 each
  epoch while eleven sit at 0.01 returning partial receipts. We already read EVM
  state correctly for WALLET_BALANCE_CHECK at 0.9999993 live.
- **CVE_LOOKUP** (5 miners) — static records. The strongest incumbent leaves
  `earliest_affected_version: null`, and resolving CPE ranges into stated
  affected versions is the half the question asks for.
- **TVL_LOOKUP** (10 miners) — the only candidate with a **gradient** scorer, so
  improvement is measurable rather than all-or-nothing. Live leader 0.039.
- **NEWS_SEARCH** (5 miners) — the five incumbents fail roughly 85% of epochs;
  the scorer is unforgiving about relevance and indifferent to wording.
- **CURRENCY_EXCHANGE** (7 miners) — a daily reference rate does not move, so two
  ECB-derived answers agree exactly; a live quote can never match another.
- **GAME_RESULT** (3 miners) — a completed fixture's score is immutable. The
  live leader sits at 0.594 and the honest answer measures 0.787.

Each of the six also raises its intent to or above the 3-miner half of the
eligibility guardrail, or is already above it.

## 3. Pre-registration checks — all green as of 2026-09-08

Run from `track1-miner/`:

```bash
node tools/preflight.mjs
```

Result at time of writing, against production:

```
unit + live suite                      PASS
verify-deploy                          PASS
param shapes (engine-shaped)           PASS
intent answers (correctness)           PASS      19/19 intents answering correctly
hostile inputs                         PASS
upstream health                        PASS
no-regression (7 identical, 1 differ)  PASS

7/7 gates passed.                                exit 0
```

Also confirmed:

- 274 unit tests + the live suite green (`npm --prefix miner test`).
- Every one of the 18 endpoints returns 200 through the production alias.
- No secret, key or token anywhere in `miner.yaml` — the file is public, pinned
  and hashed on-chain.
- The six new endpoints were verified on a **preview** deployment through
  `npx vercel curl` before promotion, then again on production.

**Re-run `node tools/preflight.mjs` on the day you sign.** A green run from an
earlier day is not evidence about today's build.

## 4. Confirm the bytes before signing — and do NOT hash the local file

**The file on disk is not the file the node reads.** `core.autocrlf=true` is set and
the repo has no `.gitattributes`, so Git checks `miner.yaml` out with Windows CRLF
line endings and stores it with Unix LF. GitHub raw serves the stored (LF) version,
which is what the node fetches and hashes. The two differ:

```
local working copy (CRLF)   d517e6a73ca542e8e88ae1391e874c15f826c432709c5d5cae4108a225c2aafb   WRONG
what GitHub serves (LF)     8d62ebe0136aea75e8185a5536f99687cac7650b31a31a5fb90c5c9aac94d874   correct
```

This is the rule and not a guess: the commit pinned for registration 402 has a blob
hash of `7538082784c4b20849aeb54cfb6c2cf74100cf074dff3e0f8d8b268e12e47640`, which is
byte-for-byte what `/api/miners/402` reports on-chain and what the raw URL serves.

So **do not use the console's "GENERATE FROM FILE" button**, and do not run
`sha256sum track1-miner/miner.yaml`. Both hash the CRLF working copy.

Verify the way the node does — fetch the published URL and hash what comes back:

```bash
curl -sL "<the YAML URL from section 5>" | sha256sum
```

Or hash the git blob directly, which is the same bytes:

```bash
git show HEAD:track1-miner/miner.yaml | sha256sum
```

Either must print `8d62ebe0136aea75e8185a5536f99687cac7650b31a31a5fb90c5c9aac94d874`.
If it prints anything else, the file has changed since this document was written —
stop and have the hash recomputed rather than signing an unverified file.

## 5. Operator sequence — the console's current flow

The console has changed since August. Step 1 ("Configure Yaml") is a form builder
and is **not** the path to use: rebuilding an 18-endpoint manifest through a form
would produce a different file from the one verified here. Go to step 2,
**Register On-Chain**, which has a **Manual Input** panel.

Fill it in exactly:

| Field | Value |
|---|---|
| **YAML URL** | `https://raw.githubusercontent.com/Harshyadav442277/miner/3129b5c3c9282b15dffe673813f737534d8edd71/track1-miner/miner.yaml` |
| **YAML HASH (BYTES32)** | `0x8d62ebe0136aea75e8185a5536f99687cac7650b31a31a5fb90c5c9aac94d874` — typed, **not** "Generate from file" (§4) |
| **REQUIRES API KEY** | **OFF.** Every endpoint is keyless; this is what yields `auth: {type: none}` |
| **API KEY** | leave empty once the toggle is off |
| **FEE ADDRESS** | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` (already prefilled) |
| **FLOOR PRICE (USDC)** | `0.01` (already prefilled; matches `min_price_usdc: 10000`) |

The URL was pushed and fetched back on 2026-09-09: HTTP 200, 35,039 bytes,
hashing to the value above, containing all nineteen intents. It is pinned to a
commit, so it cannot change under the registration.

Then:

1. Confirm the wallet is `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` on Base
   Sepolia — the address that owns registration 402.
2. **VALIDATE ENDPOINTS.** This is the sandbox gate. It should turn the red
   checks (`YAML URL SET`, `HASH VALID`, `AT LEAST ONE INTENT`,
   `ENDPOINT VALIDATED`) green.
3. **Do not proceed past any error or warning** — paste the text back instead. A
   rejection releases the slug to anyone and registration is effectively
   immutable. This gate is what caught the `twitter` field in August.
4. **Sign.** This creates a **new registration id**, which is expected: 225 was
   superseded by 236, 236 by 402, and 402 will be superseded now. **Registration
   402 keeps serving until the new one is `active`** — there is no gap and no
   downtime.

## 6. After signing — send back the new registration id

Everything that names 402 has to move to the new id. Until then, monitoring is
watching a superseded registration.

```bash
curl -s https://devnode.telegraphprotocol.com/api/miners/<newId>
```

It must show `activation_status: "active"`, `rejection_reason: null`, and all
**nineteen** intents. Then read back what was actually pinned, which is the check
that matters — the hash is a claim, the served file is the fact:

```bash
curl -s "<yaml_url from the response above>" | sha256sum
```

That must equal the hash in §4.

**Then update these to the new id** (Claude will do this on being told the id):

- `track1-miner/tools/watch.mjs` invocations and the `uptime` workflow's
  registration-id variable.
- `MEMORY.md`, `track1-miner/MEMORY.md` and `EXPANSION_MATRIX.md`.
- Any `curl .../api/miners/402` in the docs.

Note `tools/watch.mjs` parses `--key value` pairs positionally, so `--once` must
come **last** or the registration id is swallowed.

## 7. Rollback and recovery

**The registration cannot be rolled back** — it is immutable and the previous one
goes `superseded`. What *can* be rolled back is the deployment behind it, and
that is the recovery path if a new endpoint misbehaves after registration.

```bash
# list recent production deployments
npx vercel ls miner --scope wukong4

# roll production back to a known-good build
npx vercel rollback <deployment-url> --scope wukong4
```

Known-good build at the time of writing: `miner-ktnabze5f` (19 intents, preflight
7/7). The last build before this session's expansion is `miner-y1118mdz5`
(13 intents) — rolling back that far would 404 the six new endpoints while the
registration still declares them, so prefer the newest green build.

**Two deployment traps, both previously live outages (GAPS G70):**

- After a `vercel rollback`, production is **pinned**. A later `vercel --prod`
  does *not* move the alias; it needs `npx vercel promote <url> --scope wukong4`.
- `vercel.json` rewrites every path to `/api/index`. The CLI hands the function
  the *destination*, so the original path is carried as `__path` and `route()`
  prefers it. Do not "simplify" that rewrite — doing so 404s every endpoint.

If an endpoint is broken but the miner must stay live, rolling back the
deployment is the right move: the registration keeps declaring nineteen intents
and six of them 404, which costs those intents' scores but keeps the other
thirteen serving. Losing the alias entirely costs all nineteen.
