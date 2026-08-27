# CertWatch — TLS expiry monitoring on Telegraph

A Track 3 application. You give it domains; it asks the Telegraph network whether each
certificate is valid and when it expires, and shows you the answers with on-chain proof.

Expired certificates cause real outages and nobody notices until the browser warning appears.
That is the honest reason this exists, and the honest reason it makes repeated certificate checks.

## How it uses Telegraph

Checks go through the **auto-routed** engine endpoint:

```
POST /engine/v1/ask   { "query": "Is the SSL/TLS certificate for example.com currently valid, and when does it expire?" }
```

Deliberately **not** `POST /engine/v1/ask/{minerId}`. Two reasons:

1. It is what a real client does — ask a question, let the network decide who answers.
2. Telegraph's router classifies the query into an intent, which is the unit the protocol
   actually measures. Whoever serves it, the demand lands on `SSL_VERIFICATION`.

Being routed to a competing miner is a perfectly good outcome. The dashboard shows which miner
served each row precisely so that stays visible.

Every call is paid per-request via **x402** on Base Sepolia, and every answer carries a
`signal_hash` — the dashboard links each row to its on-chain record, so any number here can be
independently verified.

## Setup

```bash
npm install
cp .env.example .env      # then fill in EVM_PRIVATE_KEY
npm run build
npm start                 # dashboard on http://localhost:3000
```

**`EVM_PRIVATE_KEY`** must be a Base Sepolia wallet holding **testnet USDC**
(`0x036CbD53842c5426634e7929541eC2318f3dCF7e`). Calls cost about $0.01 each.

> Use a throwaway wallet. This key signs payments; it should never hold anything real, and
> `.env` is gitignored. Never commit it, paste it into a chat, or put it in any other file.

One-shot sweep, suitable for cron:

```bash
npm run check
```

## Endpoints

| | |
|---|---|
| `GET /` | Dashboard |
| `GET /api/state` | Watchlist, latest check per domain, running totals |
| `POST /api/domains` | `{"domain":"example.com"}` — adds and checks immediately |
| `DELETE /api/domains?domain=` | Remove |
| `POST /api/check` | Sweep every watched domain now |

## Design notes

- **Defensive result parsing.** Miners serving one intent do not share a response schema — the
  docs are explicit that `result` varies per miner — so `extract()` reads several plausible field
  names and reports what it found rather than assuming our own miner's shape.
- **Sequential sweeps.** Checks run one at a time so payments never stack up concurrently.
- **`SSL_VERIFICATION` counted separately** from total requests, because the hackathon's
  prize-eligibility guardrail counts requests to an *intent*, not to a miner.
- **State is a JSON file**, capped at the last 500 checks. No database for a 12-day project.
