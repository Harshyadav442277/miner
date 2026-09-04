# Node-side issues observed from Track 1 and Track 3 — 2026-08-26 to 2026-09-04

For the organizers. Everything here was observed against `devnode.telegraphprotocol.com` by the
LiveCert miner (registration 402, id 4433) and the Morse application (payer
`0xfBB3C3bd51EC6E19BDECc786945d83719b6b4c9c`). Times are UTC. Evidence lives in Morse's public
ledger (`https://telegraph-morse.vercel.app/api/recent`, `/proof`) and in this repository's
`GAPS.md`; each item names its entry. Two items at the end were **our** bugs, listed so the
picture is fair.

## First, what is NOT failing right now

The auto-router is healthy. Since Morse re-enabled it on 2026-09-03 18:18Z with the routing
source recorded on every row:

| Routed asks through `/engine/v1/ask` | 31 |
| Succeeded | 31 |
| Fell back to the app's own routing | 0 |
| Latency, median / p90 / max | 566 ms / 1.4 s / 5.1 s |

The direct calls visible in Morse's ledger ("routed: Morse", kinds `podium` and `second-opinion`)
are the app asking the other top-ranked miners on a user's click. They are by design, not a
router failure.

## Issues on the node or facilitator side

**1. Routed asks timed out on settlement for about 40 minutes on 2026-09-02** (~17:30–18:10Z).
`POST /engine/v1/ask` returned
`settle request failed: Post "https://facilitator.payai.network/settle": context deadline exceeded`
after ~47 s, while `POST /engine/v1/ask/{minerId}` settled in ~4 s. Recovered by 2026-09-03
(6.5 s, then sub-second). A serverless client with a 60 s ceiling cannot use the router while this
recurs. Morse GAPS G17.

**2. The node can settle a payment after the caller has given up, so one question is paid twice.**
Blockscout lists 120 USDC transfers from the Morse payer to the Diamond; the ledger holds 118
settlement hashes, all on chain. Two settlements (2026-09-02 17:56:56Z and 2026-09-03 18:11:04Z)
match no answered call. At least one is a router attempt that settled after the client's 20 s
budget, by which time a fallback miner had been paid for the same question. The docs say "you only
pay for answers"; a late settlement is a payment for an answer nobody received. Morse GAPS G29.

**3. CHAT_COMPLETION routing sends payloads the routed miner rejects.** Seventeen user questions
on 2026-09-03 came back as `Engine returned 500`:

- 13 between 09:16Z and 14:45Z: `upstream error 400: /chat/completions: Invalid model name passed
  in model=None` — the router picked an OpenAI-compatible miner and sent no `model`.
- 4 between 16:03Z and 16:06Z: `upstream error 422: body.messages Field required` — the router
  sent `{query}` to `telegraph-chatbot`, whose schema wants `messages`.

Both are payload shaping between the router and the miner's declared schema. Not charged, per the
docs, but the user saw a 500 either way.

**4. Sporadic payment refusals on a funded payer.** The facilitator returned
`batch_send_failed:missing_or_invalid_parameters_double_check_you_hav…` on 2026-09-02 18:24Z and
2026-09-04 07:52Z (direct call to `microlink-url-extraction`), and five direct calls between
2026-09-03 16:00Z and 16:05Z (`telegraph-chatbot` ×4, `livecert` ×1) were re-challenged with
`payment required` although the same key paid before and after that window. Cause unknown from
our side.

**5. The sandbox validator has been broken since 2026-08-29.** `POST
https://integrate.telegraphprotocol.com/api/validate` with `{}` correctly answers
`{"error":"yaml is required"}`; with a real `{"yaml": …}` body it answers
`{"error":"404 page not found"}` (a two-line manifest and our full 25 KB one both reproduce it).
Re-checked 2026-09-03 19:45Z. Miners cannot pre-validate before `updateMiner` as the docs instruct.
GAPS G60.

**6. The console's import path strips per-endpoint `intents` and `params` keys** that its own
validator then requires (2026-08-29). We registered via `cast send updateMiner` instead.
TASKS T4.10.

**7. The public `/scores` feed stopped returning `question`, `ground_truth` and
`converted_answer`** around 2026-08-29. That was the only public way to reproduce a reported score
against a champion module. GAPS G24.

**8. The indexer lags a mined `updateMiner` by about four minutes.** `/api/miners/{newId}` returned
`miner registration not found` while `/api/miners/{oldId}` still served the old record
(2026-08-31 04:01Z and 21:37Z). The chain was correct immediately; the API was not. Minor, but it
looks like a failed registration to anyone who trusts the API over the receipt.

**9. Activation's first YAML fetch timed out** (`YAML fetch failed … context deadline exceeded`)
on a 121-byte GitHub raw URL at 2026-08-31 21:40Z, and the status read `unreachable` for ~3 minutes
before the retry succeeded. Minor; worth a note in the docs so nobody deregisters over it.

**10. The eligibility guardrail cannot be measured by anyone but you.** The rule is "≥3 active
miners and ≥100 real requests from Track 3 applications" per intent, but the node exposes only
`total_requests_served` per miner (one number across all of a miner's intents, apparently
including scoring calls), `/engine/v1/intents` gives miner counts only, and the explorer has no
per-intent request endpoint. Two questions builders need answered: are per-intent Track 3 request
counts published anywhere, and do direct calls (`/engine/v1/ask/{id}`, the dispatcher) count
toward the intent, given that every reference app in `telegraph-usecases` calls miners that way?
GAPS G13.

**11. `/miner-dispatcher/openapi.json` unions parameters across endpoints** for every
multi-endpoint miner (miner 302's 14 operations all list the same parameter set; ours lists
`domain` on `/ai-detect`). Cosmetic, but a builder reading the spec gets a misleading contract.
GAPS G67.

**12. The explorer rejects slugs.** `explorer.telegraphprotocol.com/api/miners/livecert` answers
`invalid registration_id: must be a base-10 integer`, while the console and docs address miners by
slug. Minor.

## Two failures that were ours, not yours

- Six `unpaid` rows on 2026-09-02 17:33–18:08Z were a client bug: the Request was not materialised
  before the x402 payment wrapper on Vercel, so the retry went out without a payment header.
  Fixed 18:10Z. Morse GAPS G17, fault 2.
- Morse's ledger labels every direct call "Morse", including the podium legs it makes on purpose.
  That label is ours to fix and is not a routing failure.

## What would help most, in order

1. Per-intent Track 3 request counts, or at least a yes/no on whether direct calls count (item 10).
2. Settle only when the answer can still be delivered, or expose late settlements by signal hash
   so a client can reconcile them (item 2).
3. Shape CHAT_COMPLETION payloads to the routed miner's declared schema (item 3).
4. Bring the sandbox validator back (item 5).
