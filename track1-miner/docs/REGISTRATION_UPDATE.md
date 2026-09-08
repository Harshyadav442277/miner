# Registration update — 13 intents to 18

**Status: prepared, NOT signed. This needs the operator.** Claude does not connect
wallets, sign messages or send transactions (CLAUDE.md rule 1). Everything below
is prepared and validated; the clicking is yours.

Written 2026-09-08. Re-verify the hash before signing — any edit to `miner.yaml`
changes it.

---

## 1. What changes, in one line

The same miner, same slug, same base URL, plus **five new intents that are
already deployed and answering on production**.

```
registered now (reg 402)   13 intents   hash 7538082784c4b20849aeb54cfb6c2cf74100cf074dff3e0f8d8b268e12e47640
this file                  18 intents   hash 0de9390988f24496c2a3f539bf5753b7206774ec26905445a0845d2405c62933
```

Re-check the pending hash before signing — see §4.

| Change | Detail |
|---|---|
| **+5 intents** | `ONCHAIN_TX_LOOKUP`, `CVE_LOOKUP`, `TVL_LOOKUP`, `NEWS_SEARCH`, `CURRENCY_EXCHANGE` |
| **+5 endpoints** | `/tx-lookup`, `/cve`, `/tvl`, `/news-search`, `/convert` — all deployed, live and keyless |
| **unchanged** | `id: 4433`, `slug: livecert`, `base_url`, `auth: {type: none}`, the thirteen existing endpoints and every one of their parameters |

No existing endpoint's behaviour, path or parameter list changed. The five
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

Each of the five also raises its intent to or above the 3-miner half of the
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
intent answers (correctness)           PASS      18/18 intents answering correctly
hostile inputs                         PASS
upstream health                        PASS
no-regression (7 identical, 1 differ)  PASS

7/7 gates passed.                                exit 0
```

Also confirmed:

- 269 unit tests + the live suite green (`npm --prefix miner test`).
- Every one of the 17 endpoints returns 200 through the production alias.
- No secret, key or token anywhere in `miner.yaml` — the file is public, pinned
  and hashed on-chain.
- The five new endpoints were verified on a **preview** deployment through
  `npx vercel curl` before promotion, then again on production.

**Re-run `node tools/preflight.mjs` on the day you sign.** A green run from an
earlier day is not evidence about today's build.

## 4. Confirm the bytes before signing

The file to upload is `track1-miner/miner.yaml`. Confirm its hash first.

PowerShell (the default shell here — Windows has no `sha256sum`):

```powershell
(Get-FileHash track1-miner/miner.yaml -Algorithm SHA256).Hash.ToLower()
```

Git Bash:

```bash
sha256sum track1-miner/miner.yaml
```

Either must print:

```
0de9390988f24496c2a3f539bf5753b7206774ec26905445a0845d2405c62933
```

If it prints anything else, the file has changed since this document was written
— stop and ask for the hash to be recomputed rather than signing a file nobody
has checked.

## 5. Operator sequence

At **`integrate.telegraphprotocol.com`**:

1. **Connect** on Base Sepolia (chain 84532). Confirm it is the miner wallet
   `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` — the address that owns
   registration 402.
2. **Import & Upload** → select `track1-miner/miner.yaml`.
3. **REQUIRES API KEY → OFF.** This is the toggle that produces
   `auth: {type: none}`. Every endpoint is keyless.
4. **Validate.** Do not proceed past any error *or warning* — paste the text back
   instead. A rejection releases the slug to anyone and registration is
   effectively immutable. This gate is what caught the `twitter` field in August.
5. **Sign.** This creates a **new registration id**, which is expected: 225 was
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
**eighteen** intents. Then read back what was actually pinned, which is the check
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

Known-good build at the time of writing: `miner-6ootuk8re` (18 intents, preflight
7/7). The last build before this session's expansion is `miner-y1118mdz5`
(13 intents) — rolling back that far would 404 the five new endpoints while the
registration still declares them, so prefer the newest green build.

**Two deployment traps, both previously live outages (GAPS G70):**

- After a `vercel rollback`, production is **pinned**. A later `vercel --prod`
  does *not* move the alias; it needs `npx vercel promote <url> --scope wukong4`.
- `vercel.json` rewrites every path to `/api/index`. The CLI hands the function
  the *destination*, so the original path is carried as `__path` and `route()`
  prefers it. Do not "simplify" that rewrite — doing so 404s every endpoint.

If an endpoint is broken but the miner must stay live, rolling back the
deployment is the right move: the registration keeps declaring eighteen intents
and five of them 404, which costs those intents' scores but keeps the other
thirteen serving. Losing the alias entirely costs all eighteen.
