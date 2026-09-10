# ARCHITECTURE.md — decisions and rationale

## 2026-09-10: rank-1 correctness and provider coverage

CVE_LOOKUP keeps NVD as its primary source and falls back, within a 3.5-second additional
deadline, to the public CVE Program record API when NVD is unavailable or has no entry.
The fallback must match the requested CVE ID and publication state, name the assigning CNA,
and exclude unaffected versions. If neither source yields a usable record, preserve an explicit
unknown. No credential or paid provider is added.

Sports fixture selection requires both teams, requested date, and competition to match, including
fallback sources and cache identity. Provider searches run concurrently within each lookup phase
to fit the existing 11-second watchdog. Academic retry retains date constraints. Protocol TVL
with a chain constraint reads that chain's subtotal, never the global aggregate.

Release evidence: [rank-1 weakness report](track1-miner/docs/RANK1_WEAKNESSES_2026-09-10.md).

Code must conform to this. **Update this file before deviating from it**, not after.

Grounded in [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md) (verified 2026-08-26).

---

## The shape of a Telegraph miner

```
   agent / validator
          │
          ▼
   Telegraph node ──reads──►  our YAML  (IPFS, SHA-256 committed on-chain)
          │
          │ proxies the request, per param_map / endpoints[]
          ▼
     base_url  ◄── the upstream API. Ours, or a third party's.
```

We author **a YAML file**, not a service — unless a deliberate decision says otherwise (D2 in
[PRD.md](PRD.md)). Everything the protocol knows about us lives in that file.

## A1 — Registration goes through the web console, not `cast`

`integrate.telegraphprotocol.com` validates the schema, **sandbox-tests every declared endpoint
against the real upstream**, pins to IPFS, sends `registerMiner`, and stores the API key.

The manual `cast` path exists and is documented, but the console is the only path that can install
an API key on our behalf, and its sandbox catches exactly the failures that are expensive on-chain.
We use `cast` only for read calls (`isCanonicalIntent`, `getCanonicalIntents`, `getMiner`).

**Rationale:** registration is effectively immutable. A rejected registration also releases the
slug immediately, so a careless send can lose the name to someone else. Validating first is not
optional caution, it is the cheap path.

## A2 — Validate before every on-chain send

No `registerMiner` or `updateMiner` without a clean sandbox run first. This is a hard rule, not a
preference. `updateMiner` issues a **new `registrationId` and `intentId`**, breaking anything that
targeted the old one — so each mistake has a blast radius beyond gas.

## A3 — Uptime is the product

Spot checks fire roughly every 20 seconds, deterministically seeded by the Base L2 block hash. A
score more than 20% below the leaderboard score triggers **immediate Routing Revocation**, and
traffic does not return until the next epoch tournament.

Consequences that bind our hosting choice:

- **No cold starts.** Anything that sleeps (Render free, Railway idle, scale-to-zero) reads as
  failure. If we host, use a zero-cold-start runtime — Cloudflare Workers by default.
- **No fragile upstreams.** An upstream rate limit or outage becomes *our* revocation. If we
  proxy a third-party API, declare its real allowance in `limitations[]` with `property: rate` so
  the node refuses calls it cannot serve instead of burning our score on failures.
- **Latency is scored,** not just success. Prefer edge-deployed and geographically close.

## A4 — Declare upstream limits honestly

```yaml
limitations:
  - code: ACCOUNT_QUOTA
    message: Free tier allows 100 requests per month
    property: rate
    value_num: 100
    window_seconds: 2592000
```

`property: rate` is the one limitation a node cannot infer from the request — it depends on how
many times the node has already called us. Declaring the real number makes the node check before
spending a caller's money. Undeclared, we inherit a 600 calls/min backstop that is far above any
free tier and protects nothing.

## A5 — Handle liar-200 upstreams explicitly

Some APIs return HTTP 200 while reporting failure in the body. To Telegraph that is a success: the
caller is charged and the error text is stored as our signal. If our upstream does this, declare it:

```yaml
errors:
  message_path: responseDetails
  status_path: responseStatus
  success_values: ["200"]
```

If the upstream uses real HTTP status codes, **omit `status_path` entirely**. The check is
conservative — an unresolved path is never treated as a failure — so declaring it speculatively
is harmless but declaring it wrongly is not.

## A6 — Secrets never enter the repo or the YAML

The YAML is public, pinned to IPFS, and hashed on-chain. API keys are installed *after*
registration against the slug, via an EIP-191 `personal_sign` challenge, bound to the registering
wallet.

- No `.env` in git, from the first commit.
- No key, seed, or private key in any tracked file — including YAML, docs, and commit messages.
- Wallet actions are the user's to perform. Claude never signs, connects, or sends.

## A7 — Schema strictness is a design constraint, not a footgun to discover

`additionalProperties: false` applies at the root and inside `endpoints[]`, `auth`, and
`semantics.signal_mapping`. An unknown key is a hard rejection.

Two we will hit if we are not deliberate:

- `input_schema` / `output_schema` are **top-level only**, never nested under the endpoint they
  describe. A single top-level `input_schema` covers all endpoints; it is documentation surfaced
  to callers, not a validator the node enforces.
- `semantics.signal_mapping` takes only `confidence_field`, `label_field`, `reason_field`.

## A8 — One miner, one intent, depth over breadth

Routing pays 70/20/10 and nothing to 4th. Two mediocre miners in contested intents earn less than
one dominant miner in a quiet one, and cost twice the attention across a 12-day window.

## A9 — Ship without the `on_chain` block

`on_chain` enables ERC-8183 job targeting and on-chain callbacks. It is optional, adds
meaningful schema surface (`transform`, field arrays, request mapping), and is irrelevant to
leaderboard ranking. Excluded from H1 scope. Revisit for H2.

## A10 — Conventions

- Boring, explicit code. Files under ~300 lines. TypeScript strict if we write any.
- One task = one change = one commit. Commit messages describe the change and nothing else.
- Docs are the handoff medium across sessions and models: keep them exact.
- Verify protocol facts against live docs, never memory. Record what was checked, and when, in
  [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md).
