# LiveCert, Miners / Providers: submission pack (rules §08), draft of 2026-11-17

The deadline is Dec 1, 2026, 23:59 UTC (Dec 2, 05:29 IST). The owner submits through the H2 website; Claude drafts.
Every figure here comes from a dated evidence file. Re-read each figure, and replace any older than a week, on the
day of submission.

## 01 Project details

| Field | Value |
|---|---|
| Track | Miners / Providers |
| Project | LiveCert, miner id 4433, slug `livecert`, registration **5292** (YAML `04c0e9f`) |
| Endpoint | `https://miner-wine.vercel.app` (`/status` gives the release; `docs/openapi.json` describes every route) |
| Intents | 44: `GET https://devnode.telegraphprotocol.com/api/miners/5292` → `supported_intents` |
| Missions | The intents touch all 15 missions (`track1-miner/docs/evidence/track1-diagnosis-2026-11-17/missions/matrix.json`) |
| Wallet | `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e` (fee and miner address) |
| GitHub user that starred `telegraphprotocol/bounties` | Owner to confirm the star before submitting |

## 02 Demo script (2–5 min, screen recording)

1. **0:00–0:30, the problem.** An app needs an answer it can act on and check: is this wallet sanctioned, has this
   issuer filed, what does a transfer cost now. Telegraph routes the request to the best-ranked miner for that intent.
2. **0:30–1:30, one real request through Telegraph.**
   - Show the request and the answer.
   - The answer opens with the direct sentence. The scored field follows under the intent's own name (`filing_count`,
     `gas_price_gwei`, `matched`), then `checked_at` and a `receipt` of every upstream read.
3. **1:30–2:30, check it yourself.**
   - Open the receipt's upstream URL: SEC EDGAR, the Federal Register, or an RPC `eth_gasPrice`.
   - Show the value matches. Then show a refusal: a malformed address gets an error that teaches the contract, not a guess.
4. **2:30–3:30, the evidence.**
   - The network's leaderboard for an intent, from `/api/miners`, with the epoch.
   - The availability report and the capacity test.
   - The release record with preflight gates.
5. **3:30–4:00, how to try it.** The integration doc, one `curl`, and the costs and limits below.

## 03 How to run it (reviewer steps)

Prerequisites: `curl`. No key is needed for the direct route.

```bash
curl "https://miner-wine.vercel.app/sec-filings?entity=Ozempic&period=last%2012%20months"
curl "https://miner-wine.vercel.app/gas-price?chain=ethereum"
curl "https://miner-wine.vercel.app/dns?domain=example.com&type=A"
```

- **Expected:** the first returns `filing_count` (US Federal Register documents naming the entity in the period) with
  `register: "Federal Register"` and the document URLs.
- **Through Telegraph:** recipes per mission intent are in `docs/INTEGRATE_LIVECERT.md`.
- **Network:** Telegraph devnode, Base Sepolia registry (testnet).
- **Price:** `min_price_usdc` 10,000 base units ($0.01).
- **Upstream cost to us:** $0 per request. Free keys with quotas: Groq, OpenAlex, NVD.
- **Known limitations:** `GAPS.md`, and the "Not verified" sections of each evidence folder.

## 04 Evidence

| What | Where |
|---|---|
| Per-intent standing with ranks, epochs and ties | `track1-miner/docs/evidence/track1-diagnosis-2026-11-17/before/intent-table.md`; after-table due once 5292 is scored |
| Availability and latency per endpoint | `…/track1-diagnosis-2026-11-17/availability.md`: 99.76% of 1,653 calls, 45 sweeps |
| Capacity | `…/capacity-ssl-c10-60s.json`: 10 callers, 60 s, 1,691 requests, 0 errors |
| Releases and gates | `track1-miner/docs/evidence/release-*/README.md` (latest: `release-2026-11-16-federal-register`) |
| Registration | `GET /api/miners/5292` |
| Consumption (H2 mission apps) | **None verified yet.** Collect app, operator, request id, Miner–Intent pair and receipt for each |

## 05 Public summary (draft, about 120 words)

> LiveCert is a Telegraph miner that sells checkable answers across 44 intents, from sanctions screening and SEC or
> Federal Register filings to gas prices, DNS and CVE scores. Every answer starts with the direct answer, then the
> scored value under the intent's own field name, then a receipt of the primary sources it read, so an app or a
> reviewer can re-check it. Where a source forbids resale, LiveCert refuses rather than resells. It is live at
> miner-wine.vercel.app and registered on the Telegraph devnode (registration 5292). Try it with the curl lines in
> the README. Integration recipes for each mission are in docs/INTEGRATE_LIVECERT.md. Issues and reproduction
> reports are welcome on GitHub.

## 06 Showcase permission

Owner's choice. Suggested: text, recordings and the tutorial may be shared publicly; buyer introductions yes.
