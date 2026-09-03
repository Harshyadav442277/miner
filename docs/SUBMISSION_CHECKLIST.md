# SUBMISSION_CHECKLIST.md

What had to be true by **2026-08-31 23:59 UTC** (Track 1 and Track 2 close) and what still has to
be true through **2026-09-07 23:59 UTC** (Track 3 close). Winner Selection runs Sep 8–18. Resolve
every deadline with `date -u`, never the local date.

Last verified: 2026-09-03 ~19:50 UTC.

---

## Track 1 — Miner · closed 2026-08-31

| # | Item | Who | State |
|---|---|---|---|
| 1 | Miner built, tested, deployed at `https://miner-wine.vercel.app` | Claude | **done** — 182 unit + 67 live tests, preflight 7/7 on 2026-09-03 |
| 2 | `track1-miner/miner.yaml` hashes to the registered `yaml_hash` | Claude | **done** — `7538…7640`; hosted and local bytes identical |
| 3 | Registration active with every declared intent | **User** signs, Claude verifies | **done** — registration **402**, thirteen intents, active since 2026-08-31 21:46 UTC |
| 4 | Submitted on `submissions.telegraphprotocol.com` — miner ID **4433** plus `miner.yaml` | **User** | **reported done ~22:20 UTC on 2026-08-31.** Claude cannot verify; the site needs a wallet-signed session. Re-check that it names registration 402. |
| 5 | Uptime tripwire watching the right registration | Claude | **done** — `REGISTRATION_ID=402` since 2026-09-03; dispatched run green; issue #5 closed |
| 6 | Posts on X, tagged `@Telegraphprotoc` | **User** | **open** — P1–P13 in [X_POSTS.md](X_POSTS.md); 25% of the score |

## Track 2 — Script Author · closed 2026-08-31

| # | Item | Who | State |
|---|---|---|---|
| 7 | Submitted with the live champions and their `.wasm` files | **User** | **reported done ~22:20 UTC on 2026-08-31** — unverifiable from here |
| 8 | Champions still held | — | 1882 `TEXT_AUTHENTICITY_CHECK` and 2010 `LANGUAGE_GENERATION` re-verified rank 1 on 2026-09-03; `CRYPTO_PRICE` 2365 was retaken on 2026-08-31 |

Track 2's own state lives in [../track2/SUBMISSION.md](../track2/SUBMISSION.md) and
[../track2/SIGN.md](../track2/SIGN.md).

## Track 3 — Application · due 2026-09-07 23:59 UTC

Morse, in its own repository: <https://github.com/Harshyadav442277/telegraph-morse> (sibling folder
`../telegraph-morse`). Its checklist is there. CertWatch was retired on 2026-09-02; its Vercel
project `app-five-blond-45.vercel.app` still answers and should be deleted by the operator (G64).

## Standing requirements through Sep 7

- **Miner live and operational through 2026-09-07** — a rule, not just scoring. Rankings feed
  Track 3 routing (70/20/10 to ranks 1/2/3). Do not deploy, redeploy or re-register before the close.
- **All judged updates public on X and tagged** `@Telegraphprotoc`.
- **Stay active in the Telegraph Discord**; the exact deadline hour is in `#announcements`.
- **No artificial metric inflation.**
- **Third-party upstreams are our responsibility** — `tools/upstream-health.mjs` (part of
  preflight) probes every one of them.

## Feedback loop — run it, do not assume it

```bash
cd track1-miner/miner && npm test && cd ../..
node track1-miner/tools/preflight.mjs https://miner-wine.vercel.app
node track1-miner/tools/watch.mjs --base-url https://miner-wine.vercel.app --once --registration-id 402
gh run list --workflow uptime --limit 3
```

An open issue labelled `uptime` means the miner is failing **right now**; a closed one is history.
