# SETUP.md — the manual steps

Two things need your accounts and your hands. Everything else is done and committed.

**Do step 1 today.** Track 1 closes **2026-08-31**, and the 7-day grace-period score sets our
opening leaderboard position — every day of delay shortens the record we are judged on.

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
workflow polls every 15 minutes, which covers it.

### If you would rather use Fly.io

Everything for it is still committed (`track1-miner/miner/Dockerfile`, `track1-miner/miner/fly.toml` with
`min_machines_running = 1`). It only needs a card on file. Vercel is the no-card path.

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

## Step 5 — Run CertWatch (the Track 3 app)

Built and working: [track3-certwatch/](track3-certwatch/) — a TLS expiry monitor that asks Telegraph about certificates.
This exists because of the eligibility guardrail: our intent needs **≥100 real Track 3 requests**
or it wins nothing regardless of rank.

```bash
cd app && npm install && cp .env.example .env
```

CertWatch can also go to Vercel, or run locally — nothing spot-checks it, so its uptime is not
scored.

Put a **throwaway** Base Sepolia private key holding testnet USDC into `.env` as
`EVM_PRIVATE_KEY`. It signs x402 payments.

> Never paste that key to me, never commit it. `.env` is gitignored. Use a wallet that holds
> nothing real — ideally a different one from your registration wallet.

```bash
npm run build && npm start     # dashboard on http://localhost:3000
```

Add domains and it starts checking. Later, **deploy it publicly** so other people can use it —
demand from real users counts for far more than demand you generate yourself.

---

## Step 4 — Ongoing: post on X

**25% of the score.** Tag `@Telegraphprotoc` on every update. Drafts are in
[docs/X_POSTS.md](docs/X_POSTS.md) — I write them, you post them from your account.

Judged on *"quality, consistency, reach, and meaningful engagement"*, so a steady cadence beats a
burst on the last day.

---

## What's already done

- `track1-miner/miner/` — the service. Node, zero runtime dependencies, all six verdicts verified against
  badssl.com. ~100ms cold, 12ms cached.
- `track1-miner/miner.yaml` — passes a local strict-schema precheck. `slug: livecert`, `id: 4433`, both verified free.
- `track1-miner/tools/watch.mjs` — uptime and revocation watcher, with a `--once` mode for cron.
- `track1-miner/tools/verify-deploy.mjs` — post-deploy acceptance check. Run before registering.
- `.github/workflows/` — CI (typecheck + tests on every push) and a 15-minute uptime watch that
  opens an issue if the miner goes down. Set repo variables `MINER_BASE_URL` and
  `REGISTRATION_ID` to arm it — it no-ops until then, so pushing now is safe.
- `track3-certwatch/` — **CertWatch**, the Track 3 application. Dashboard renders, all endpoints tested,
  x402 payment wired against the real SDK.
- Full planning docs, judging analysis, and the intent decision with its reasoning.
