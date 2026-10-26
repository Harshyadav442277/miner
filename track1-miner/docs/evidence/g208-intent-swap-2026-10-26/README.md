# G208 intent swap: a draft `updateMiner` for registration 4829 (2026-10-26)

Nothing here is signed, deployed or pushed. The draft is `track1-miner/miner.yaml` on branch
`claude/g208-intent-swap`, cut from `b85e1ab`.

## What the update does

It adds four intents from the hackathon site's Intents page. Each one is served by a new route that
performs the canonical job, not by an existing route that answers it generically.

| Intent | Route | Missions | Miners (devnode, 10:28 UTC) | Site target | What it does |
|---|---|---:|---:|---|---|
| DNS_RECORD_LOOKUP | `/dns` | 6 | 23 | < 200 ms | A, AAAA, CNAME, MX, TXT, NS, SOA and CAA records from Cloudflare 1.1.1.1 and Google DNS (DoH JSON), compared record by record |
| TOKEN_TOTAL_SUPPLY_VERIFY | `/token-supply` | 6 | 19 | < 500 ms | `totalSupply()`, `decimals()`, `symbol()` and the burn-address balances via `eth_call`, at one pinned block, on two independent RPCs |
| KEYWORD_EXTRACTION | `/keywords` | 6 | 11 | < 400 ms | YAKE (a method the site names); keyless and deterministic |
| VULNERABILITY_TRIAGE | `/vuln-triage` | 10 | 35 | < 2 s | Ranks a supplied CVE set by CISA KEV, CISA SSVC exploitation, FIRST EPSS and CVSS (CVE Program record, with CISA-ADP when the CNA gave no score). The ordering rule is returned in `method` |

Also in the YAML:
- **Description fix.** URLhaus is removed from the top description, `/url-scan` and `/url-reputation`. The code dropped
  it on 2026-10-25 (G210), so the registered text was false.
- **Schema.** `output_schema` gains the new routes' fields.

Nothing is removed; the 36 current intents stay. Whether to drop unlisted intents waits on the organisers (question 1
below).

**Considered and not added.** None of these is performed for real from a licence-clean, keyless source today:

| Intent | Why not |
|---|---|
| FX_NOW | Asks for a live institutional mid-market rate and spread; ECB publishes one daily reference rate |
| THREAT_IP_REPUTATION | Needs an AbuseIPDB, OTX or GreyNoise key |
| WEATHER_FORECAST_VERIFY | Needs observations from a commercially usable station source |
| ONCHAIN_METRIC_VERIFY | Needs contract and storage reads at an arbitrary block height. Public nodes are not archive nodes; unbuilt |
| ENTITY_EXTRACTION | Needs character offsets from an NER model; `content.ts` only has regex heuristics |

## Evidence

| Claim | Evidence | Revision | Environment | Result | Checked (UTC) | Limitation |
|---|---|---|---|---|---|---|
| All 40 intents are canonical | `canonical-intents.json`: `isCanonicalIntent` via viem on `sepolia.base.org`, Diamond `0x5a23…7ff8`, block 50447293 | draft YAML | Base Sepolia | 40/40 true | 10:42 | — |
| Routes answer through the real handler | `local-routes.txt`: built server on :8787, 10 GETs | working tree | local, India | all HTTP 200; bare calls refuse with a sentence | 10:47 | not production; latency includes India RTT |
| Unit tests | `npm run test:unit` | working tree | local | 809/809 (798 + 11 new in `test/g208-intents.test.ts`) | 10:46 | — |
| YAML parses; intents match endpoints | `manifest.test.ts`, PyYAML | draft YAML | local | 39 endpoints, 40 intents, sets equal, CRLF kept | 10:35 | — |
| Sandbox validation | `validate-backend-401.json` | draft YAML | organiser backend | **not run: 401** | 10:45 | see below |

**Draft YAML:** 90,306 bytes, SHA-256 `0x4d17283c3952619e420f432d5a0b5bd006f16a880d2dc17df0ce606b3cb0f94c` (working tree).
The value to sign is the hash of the bytes at the pushed, pinned commit URL; recompute it there.

## The validator moved behind a login (new, 2026-10-26)

- **The documented validator is gone.** `POST integrate.telegraphprotocol.com/api/validate` (docs page
  `miners/validation-api`, updated 2026-09-09) now returns the console's HTML 404.
- **The console calls a new backend.** Its bundle calls `backend.telegraphprotocol.com`:
  - `/registrations/yaml-hash {yamlUrl}`, then `/registrations/validate {yaml}`;
  - `/registrations/miner/update {registrationId, yamlUrl, feeAddress, minPriceUsdc, supportedIntents}`, which
    returns a `txHash`.
- **Those calls need a signed-in account.** A request without a bearer token returned `401 Unauthorized`.
- **Sign-in is by email, or by a wallet-signed message.** The UI reads a `smartWalletAddress`.
- **The open question.** Registration 4829 is owned by EOA `0xdad201ef02f5c1fbb8f9e931ae9b7c1bf493a39e`. Whether the
  console can update it is not known (question 3).

The sandbox run is therefore the owner's, in the console, on a pushed YAML URL. Claude does not sign in.

## Latency: not yet measured where it counts

- **Measured from India**, round trip included:
  - DNS: 40–155 ms.
  - Keywords: < 10 ms.
  - Token supply by address: 0.5–0.9 s.
  - **Token supply by symbol: 2.1–3.3 s.** GeckoTerminal symbol resolution dominates; it is cached 24 h per instance
    after the first call.
  - Triage of 5 CVEs: 1.5–1.7 s. That includes the 1.8 MB KEV download, which is cached 6 h.
- **Production (iad1) numbers come after the deploy.** Run `tools/latency-targets.mjs` and record them here before
  signing.

## Message for Ahmed (owner sends on Discord; not sent)

> Hi Ahmed, thanks for confirming miners carry over to v2. I'm preparing one updateMiner for LiveCert
> (registration 4829). It adds four intents from the hackathon Intents page that the miner now actually performs:
> DNS_RECORD_LOOKUP, TOKEN_TOTAL_SUPPLY_VERIFY, KEYWORD_EXTRACTION and VULNERABILITY_TRIAGE. Three questions before I sign:
> 1. Are intents that are not on the Intents page (WEB_SEARCH, FACT_CHECK, WEATHER_CHECK and so on) judged and
>    routed in Season II? If not, I'll drop them in this same update.
> 2. Does an updateMiner (new registrationId) restart the 7-day grace period? It decides whether I sign before Nov 1
>    or hold.
> 3. The integrate console now validates and updates through a signed-in account with a smart wallet, and
>    POST /api/validate returns 404. 4829 was registered from an EOA. Should I sign in to the console with that same
>    wallet to update it, or call updateMiner directly from the EOA? And is there still a keyless validation endpoint
>    for scripts?

## Exact next steps (in order)

1. **Owner:** send the message above.
2. **Owner yes, then Claude:** land this branch on `codex/rank1-14-intents`, then deploy.
   - Preview first, then production. The production alias is pinned, so run `vercel promote` (G70).
   - Then `preflight.mjs` and the new routes on production, with latency recorded here.
   - The new routes are additive, so registration 4829 is unaffected.
3. **Owner yes, then Claude:** push, so the YAML has a pinned commit URL.
4. **Owner:** sign in to the console.
   - Paste the pinned YAML URL and run the validation.
   - Save the result JSON to this folder.
   - Sign only on a clean result, and only after Ahmed's answer to question 2.
5. **If Ahmed says unlisted intents are not routed:** remove them from the YAML and from `ENDPOINTS` in one change,
   re-test, then re-validate before signing.
