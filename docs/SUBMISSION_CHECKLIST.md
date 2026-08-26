# SUBMISSION_CHECKLIST.md

Everything that has to be true by **2026-08-31** (Track 1 close) and **2026-09-07** (Track 3 close).
Tick these off in order; the ordering is dependency order, not preference.

---

## Track 1 — Miner · due 2026-08-31

| # | Item | Who | State |
|---|---|---|---|
| 1 | Miner service built and tested | Claude | **done** — 23 tests passing |
| 2 | `miner.yaml` written, schema-prechecked | Claude | **done** |
| 3 | Deployed to a public HTTPS URL | Claude | **done** — `https://miner-wine.vercel.app` |
| 4 | `node tools/verify-deploy.mjs <url>` exits 0 | Claude | **done** — all 18 checks pass |
| 5 | `base_url` updated in `miner.yaml` | Claude | **done** |
| 6 | Sandbox validation | — | **done** — all 3 endpoints green, pinned to IPFS |
| 7 | EVM wallet created, Base Sepolia ETH funded | **User** | **done** — 0.005 ETH |
| 8 | `registerMiner` sent | **User** | **done** — registrationId **225**, tx confirmed |
| 9 | `activation_status: active` | Claude | **polling** — indexing takes 3–5 min |
| 10 | Uptime workflow armed | Claude | **done** — `MINER_BASE_URL` + `REGISTRATION_ID=225` |
| 11 | Posts on X, tagged `@Telegraphprotoc` | **User** | **can start now** — drafts 1–3 need nothing deployed |

**Register as early as possible.** The 7-day grace-period score sets the opening leaderboard
position. Registering on Aug 30 leaves one day of record to be judged on.

## Track 3 — Application · due 2026-09-07

| # | Item | Who | State |
|---|---|---|---|
| 12 | CertWatch built | Claude | **done** — dashboard tested |
| 13 | Deploy config | Claude | **done** |
| 13b | CertWatch deployed publicly | Claude | **done** — `https://app-five-blond-45.vercel.app` |
| 14 | Base Sepolia **USDC** funded (separate from ETH) | **User** | not started |
| 15 | `EVM_PRIVATE_KEY` set as a Fly secret | **User** | blocked on 14 |
| 16 | ~~Deployed publicly~~ | Claude | **done** — needs only the key to start making real calls |
| 17 | Real users making real checks | **User** + outreach | blocked on 16 |

## Standing requirements

- **Miner live and operational through 2026-09-07** — this is a rule, not just scoring.
- **All judged updates public on X and tagged** `@Telegraphprotoc`.
- **Stay active in the Telegraph Discord** — the rules say it is expected.
- **No artificial metric inflation.** CertWatch is a real monitor with a real reason to check
  certificates. Keep it that way.

## The one thing that can still sink it

`SSL_VERIFICATION` needs **≥100 real requests from Track 3 applications** or it is ineligible for
cash prizes regardless of rank. See G13. Items 16 and 17 are the mitigation, and item 17 —
*other people* using it — is worth more than any amount of self-generated traffic.

Draft 7 in [X_POSTS.md](X_POSTS.md) targets Track 3 builders and should go out **before Aug 31**,
when they are choosing what to build on.

## Deploy commands

```bash
# miner — Vercel, no payment method required
npm i -g vercel && vercel login
cd miner && vercel --prod
node ../tools/verify-deploy.mjs https://<your-url>.vercel.app

# app — may scale to zero
cd app && fly launch --no-deploy --copy-config --name certwatch
fly secrets set EVM_PRIVATE_KEY=0x...    # never in a file, never in a commit
fly deploy
```
