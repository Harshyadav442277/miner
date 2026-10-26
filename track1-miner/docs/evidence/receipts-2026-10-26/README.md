# Answer receipts (2026-10-26)

Every answer now ends with a `receipt`: the upstream requests the miner actually made to produce it.

| Field | Meaning |
|---|---|
| `id` | A random id for this answer |
| `deployment` | `VERCEL_URL` on Vercel, `local` otherwise |
| `answered_at` | When the answer was sent |
| `upstream` | One entry per read, each with `url` (credentials redacted), `method`, `status`, `started_at` and `ms`; TLS and DNS reads add a `result` |
| `from_cache` | True when the answer came from the one-minute response cache, with the reads that first produced it |
| `note` | Present only when `upstream` is empty |

## How it is recorded

- **Recorded, not reconstructed.** `src/receipt.ts` wraps `fetch` once, and the handler runs every request in
  its own AsyncLocalStorage context. Every call made while answering is logged, whatever module made it.
- **Reads outside `fetch` are noted by their modules:**
  - the SSL check's TLS handshake (`ssl.ts`);
  - the IP lookup's Tor DNS read (`geo.ts`);
  - URL_SCAN's redirect walk (`urlscan-net.ts`);
  - Quad9's HTTP/2 DNS queries (`quad9.ts`).
- **Redaction:** query parameters whose names look like credentials (key, token, secret, auth, sig, password,
  mailto, credential) become `REDACTED`, and userinfo is dropped. Keys sent in headers (Groq, NVD) never appear.

## Checked locally (`receipts-local.txt`, `receipts-local.json`)

`tools/receipt-check.mjs` asked one question per declared intent against the miner running locally with the
Groq key, using the recorded routed question where one exists.

- **All 36 intents returned a receipt, and none held a secret-like value.**
- **URL_SAFE** shows Cloudflare's filtered and open resolvers, the TLS handshake, the page fetch, and both Quad9
  resolvers. The Quad9 reads were missing until `quad9.ts` was instrumented.
- **Zero reads, by design:**
  - CONTENT_EXTRACTION and RESEARCH_SYNTHESIS work on the supplied text.
  - CROSS_CHAIN_STATE_VERIFY had an incomplete input.
  - FRAUD_DETECTION, GAS_PRICE, NEWS_SEARCH and URL_SCAN correctly refused off-topic recorded questions
    ("replay probe", "website safety check", a weather question sent to gas price).
  - WEATHER_FORECAST used a forecast already held from the storm request before it.
- **A repeated conversion** came back `from_cache: true`, with its own id.

## Not covered

- Data a module already held from an earlier request (sanctions lists 6 h, the ECB table 10 min, model replies
  10 min, forecasts, places). The receipt says so in its `note` and does not invent a read.
- Receipts are not signed. They state what this miner says it read; signing them needs a key the owner holds.
- The receipt repeats the request's own text where a URL contains it (for example a Wikipedia search). Telegraph's
  signal ledger already publishes the request.
- Not deployed yet.
