# SETUP.md — the manual steps

> **Status 2026-09-03 — steps 1, 2 and 3 are DONE and Track 1 has closed (2026-08-31 23:59 UTC).**
> The miner is deployed at `https://miner-wine.vercel.app` and registered as **402**, active with
> thirteen intents. The operator reported both Track 1 and Track 2 submitted on 2026-08-31.
> **Do not re-run steps 1-3, and do not redeploy or re-register before Track 3 closes on
> 2026-09-07 23:59 UTC** — rankings feed Track 3 routing. Steps are kept below as the record.
>
> **What is still open is step 4 (X).** Step 5 now points at Morse, the Track 3 application in
> its own repository. Track 2 state lives in [track2/SIGN.md](track2/SIGN.md).
>
> **Read [GAPS.md](GAPS.md) G19 before touching the wallet.** Its seed phrase was compromised by a
> Discord scam on 2026-08-28. The risk was assessed and accepted; the wallet must not be reused
> after the hackathon.

Everything else is done and committed.

---

## Step 1 — Deploy the miner to Vercel

**Fly.io now requires a payment method** before it will place a machine, so we switched. Vercel's
free tier needs no card, and it is proven in this exact ecosystem: the live Telegraph miner
`amanat-weather-risk` runs on `amanat-miner.vercel.app`.

The miner is already restructured for it — `api/index.ts` and `vercel.json` are committed, and the
routing lives in `src/handler.ts` so the local server and the serverless deployment share one copy.

**1a. Install the CLI and log in** (GitHub/Google sign-in, no card):

```bash
npm i -g vercel && vercel login
```

**1b. Deploy from the `track1-miner/miner/` directory:**

```bash
cd miner && vercel --prod
```

Accept the defaults. It will print a URL like `https://livecert.vercel.app`.

**1c. Verify it** — this runs all three endpoints against the live URL and exits 0 only if
everything passes. Registration is effectively immutable, so this runs *first*:

```bash
node ../track1-miner/tools/verify-deploy.mjs https://livecert.vercel.app
```

**Send me that URL** and I will put it into `track1-miner/miner.yaml` and run the console's sandbox validation.

### On cold starts

Serverless functions sleep when idle, which sounds fatal given ~20s spot checks. It is not, and we
measured why: the current rank-1 SSL miner runs on Render's free tier and answered in **675ms
"cold"** — because Telegraph's own spot checks, every ~20 seconds, keep it permanently warm. Once
registered, the same applies to us.

The gap is *before* registration, when nothing is pinging it. The committed GitHub Actions uptime
workflow polls hourly, which covers it.

Fly.io was tried first and dropped because it demands a payment method; its config was deleted on
2026-09-03 once it was clear it would never be used. Vercel is the only deployment path.

## Step 2 — Create an EVM wallet and get Base Sepolia ETH

**I cannot do any of this for you.** Wallet creation, seed phrases, and signing are yours alone —
I won't ask for a seed phrase, and you should never paste one to me or into any site.

**2a. Install MetaMask** — https://metamask.io (browser extension). Create a new wallet.

Write the seed phrase on paper. Not in this repo, not in a file, not in a chat.
Consider using a **fresh wallet** for this hackathon rather than one holding real assets.

**2b. Add the Base Sepolia network.** MetaMask → Networks → Add network manually:

| Field | Value |
|---|---|
| Network name | `Base Sepolia` |
| RPC URL | `https://sepolia.base.org` |
| Chain ID | `84532` |
| Currency symbol | `ETH` |
| Block explorer | `https://sepolia.basescan.org` |

**2c. Get testnet ETH.** It is free and worthless — it only pays gas. Any of:

- https://www.alchemy.com/faucets/base-sepolia
- https://faucet.quicknode.com/base/sepolia
- https://console.optimism.io/faucet

A fraction of an ETH is plenty; registration is one transaction and there is **no bond or stake**.

**2d. Also get testnet USDC** — a *separate* token from ETH, needed by the Track 3 app (step 5),
not by registration. Telegraph charges ~$0.01 per engine call via x402.

- Circle faucet: https://faucet.circle.com (select **Base Sepolia**)
- Token contract: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

$5–10 of testnet USDC covers hundreds of calls.

**2e. Confirm** both balances show on Base Sepolia in MetaMask, then tell me.

---

## Step 3 — Register (I prepare, you click)

Once steps 1 and 2 are done:

1. I put your deployed URL into `track1-miner/miner.yaml` as `base_url`
2. I run the sandbox validation at `integrate.telegraphprotocol.com` and fix anything it flags
3. **You** connect the wallet, review, and send the `registerMiner` transaction
4. I capture the `registrationId` and confirm `activation_status: active`

I do not connect wallets or send transactions. I'll have everything staged so your part is
reviewing and clicking.

---

## Step 5 — The Track 3 application: Morse

Track 3 is **Morse**, in its own repository and sibling folder `../telegraph-morse`
(<https://github.com/Harshyadav442277/telegraph-morse>); its setup steps live there. CertWatch, the
earlier Track 3 candidate, was retired and deleted on 2026-09-02 — it was never funded and never had
a user. Its Vercel project `app-five-blond-45.vercel.app` still answers and should be deleted by
the operator (GAPS G64). The wallet rule is unchanged: any x402 key goes in a gitignored `.env`,
never in a chat, never in a commit, and never the registration wallet.

---

## Step 4 — Ongoing: post on X  ← **the main open item**

**25% of the score, and currently near zero.** Thirteen ready-to-post updates, each verified under X's
280-character limit and tagged, are in **[docs/X_POSTS.md](docs/X_POSTS.md)** — now the single X
file.

The organizers confirmed on 2026-08-28 that there is no fixed formula: they weigh *"quality,
consistency, reach, likes, reposts, comments and meaningful engagement"*, they want posts covering
**both Track 1 and Track 2**, and they want them genuine — *"we mainly want to see the actual work
and progress."* So a steady cadence does beat a burst on the last day.

---

## What's already done

- `track1-miner/miner/` — the service. Node, zero runtime dependencies, all six verdicts verified against
  badssl.com. ~100ms cold, 12ms cached.
- `track1-miner/miner.yaml` — passes a local strict-schema precheck. `slug: livecert`, `id: 4433`, both verified free.
- `track1-miner/tools/watch.mjs` — uptime and revocation watcher, with a `--once` mode for cron.
- `track1-miner/tools/verify-deploy.mjs` — post-deploy acceptance check. Run before registering.
- `.github/workflows/` — CI (typecheck + tests on every push) and an hourly uptime watch that
  opens an issue if the miner goes down and closes it on recovery. Armed with repo variables
  `MINER_BASE_URL` and `REGISTRATION_ID=402` — **update the variable whenever the registration
  id changes**, or the watcher reports the old id as deregistered on every run (GAPS G66).
- Full planning docs, judging analysis, and the intent decision with its reasoning.
