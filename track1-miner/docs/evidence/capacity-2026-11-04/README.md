# Capacity test, 2026-11-04 20:52–20:59 UTC (Nov 5 02:22–02:29 IST)

Production `https://miner-wine.vercel.app`, route `/ssl-check`, 30 seconds per concurrency level. Tool:
`node track1-miner/tools/capacity.mjs <base> "/ssl-check?query={domain}" <concurrency> 30 <out.json>`.
Run from the owner's machine in India, so every latency includes about 300 ms of round trip to Vercel. A call
is an error unless it returns HTTP 200 with a non-empty `answer`. These are our own direct calls: capacity
evidence only, never use or demand.

## Result (the JSON files here, run 3)

| Concurrency | Requests | Per second | Errors | p50 | p90 | p99 | Max |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | 483 | 16.1 | 0 | 300 ms | 351 ms | 537 ms | 693 ms |
| 10 | 959 | 32.0 | 0 | 303 ms | 353 ms | 513 ms | 727 ms |
| 20 | 1,753 | 58.4 | 0 | 304 ms | 351 ms | 2,760 ms | 2,922 ms |

**Claim this supports:** at 20 concurrent callers, the TLS-check route served 58 requests a second for 30
seconds with no errors. Throughput rose with concurrency and p90 did not move, so 20 callers did not reach the
ceiling.

## All runs, including the ones that were thrown away

1. **Same domain every call (github.com):** 0 errors at 5/10/20, up to 58.5/s. Discarded: the handler caches
   each answer for 60 s (`src/handler.ts` `CACHE_TTL_MS`), so this measured the cache.
2. **60 rotating domains, default DNS order:** at 5 callers, 5 calls failed client-side after about 21.7 s
   (status 0). The 10- and 20-caller runs then had no errors, but p50 was 1.1–1.3 s at 8.5–14.2/s. This
   machine has a known IPv6 hang. Run 3 repeated the same thing with `NODE_OPTIONS=--dns-result-order=ipv4first`.
3. **60 rotating domains, IPv4 first:** the table above.

## Limits

- One route. The LLM routes (translation, sentiment, classification, question answering, research) are bounded
  by the Groq free-tier quota, and the geocoding fallback by Nominatim's one request a second. Load-testing those
  would measure the quotas, not the miner. They are not tested.
- 60 domains repeat inside the cache's minute, so many calls in run 3 were cache hits. The tool's `uncached`
  fields try to separate them, but they compare `checked_at` across serverless instances and are approximate.
- The client is one home connection. The failures in run 2 may be local (IPv6); that was not proved.
