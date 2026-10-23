# ARCHITECTURE.md — the miner's design decisions (Season II)

Code must conform to this. **Update this file before deviating from it**, not after. The goal these serve is
[WINNING.md](WINNING.md); protocol facts and their sources are in [docs/TELEGRAPH_FACTS.md](docs/TELEGRAPH_FACTS.md).

**Rewritten 2026-10-23.** Season I's reasons were scorer champions and rank chasing, and that scoring kind is
retired. Decisions still in effect in the code are kept below. Those tied to removed intents (sports, TVL) or
to Season I scoring are in git history.

## The shape of the miner

```
   app / agent ──► Telegraph node ──reads──► miner.yaml (commit-pinned GitHub URL, SHA-256 on-chain)
                         │
                         ▼  routes by intent and ranking (70/20/10)
                miner-wine.vercel.app  ── our TypeScript service (track1-miner/miner)
                         │
                         ▼
          licensed upstreams: MET Norway, Nominatim, Wikidata, SEC EDGAR, OFAC/UN lists,
          GLEIF, World Bank, public chain RPCs, Groq (model phrasing only), and others
```

One registration (4829) serves 36 intents on 35 endpoints from one deployment.

## A1 — Correct, sourced and licensed, per intent

- **Each claimed intent must be answered correctly from its primary source.** Each is reviewed separately,
  and registrations earn nothing (WINNING §6, §9).
- **An intent we cannot answer correctly, or cannot resell under its source's licence, is removed.**
- **Every upstream's terms are read for commercial resale before it is used** (GAPS G189). Attribution is
  given where the licence requires it: "© OpenStreetMap contributors (ODbL)" whenever Nominatim named the
  place.

## A2 — The answer envelope

- **Every route answers in the same order:** `answer` (the direct answer first), then `verdict`,
  `confidence`, every value as a field, the source, and `checked_at` (`src/envelope.ts`).
- **The question is never echoed back.**
- **The manifest describes each endpoint** by example questions, parameters and returned fields.

## A3 — Refuse honestly; never fabricate

- **Unanswerable input gets a reason:** what was wrong and what would work. An upstream outage is reported
  as an outage, never as `invalid_input` and never as "no result".
- **No value is invented.** A missing figure stays unknown.
- **A safety-relevant list that fails to load is an unread list.** It is never treated as a clear (G201).

## A4 — Model use is narrow and fails closed

- **No other route is generative.** A language model (Groq's open-weight models) may only:
  - phrase TEXT_CLASSIFICATION and SENTIMENT_ANALYSIS answers, choosing only between labels the parser
    already extracted;
  - phrase QUESTION_ANSWERING answers, which are kept only when every claim is cited (`src/qa.ts`, which
    web search's timeless-question path reuses);
  - translate.
- **Every failure returns the keyless answer unchanged:** no key, budget, rate limit, timeout, an empty or
  refusing completion, or a label outside the set.
- **`GROQ_API_KEY` stays in the environment.** It is sent only to api.groq.com, and never written to a
  tracked file, log, answer or error.

## A5 — Reliability is the product

- **Validators spot-check liveness about every 20 seconds.** Consecutive empty answers revoke routing for
  that intent until the next epoch. Reliability is 20 of the Miner's 100 points.
- **Keep load off rate-limited upstreams:** cache briefly, answer common places from the built-in Wikidata
  table before Nominatim, and run fallbacks within the request watchdog.
- **Declare real upstream limits** in `limitations[]` with `property: rate`, so the node refuses calls we
  cannot serve.
- **Handle "liar-200" upstreams explicitly.** Some return HTTP 200 with a failure in the body: declare
  `errors.status_path` only when the upstream does this.

## A6 — Data-handling rules still in effect

- **Places and time:**
  - weather candidates keep the first extracted city;
  - explicit city and country pairs win;
  - a current-hour answer uses the interval containing now;
  - an uncovered future point is never filled with the last hour;
  - stale or incomplete measurements cannot support a known answer.
- **Wallets:**
  - a recognised structured chain, including a numeric chain ID, wins over question prose;
  - token balances use read-only `balanceOf` on issuer-documented contracts;
  - bridged variants are distinct assets;
  - a malformed address cannot substantiate a zero balance;
  - at most two concurrent RPC attempts under one deadline.
- **CVE:** NVD first. The public CVE Program record is the fallback; it must match the ID and publication
  state, and name the CNA.
- **Academic:** OpenAlex, with DOAJ for explicit open-access searches and as the fallback. Publication
  dates must fit the requested window; unknown dates cannot satisfy a precise bound.
- **News and web:**
  - relevance comes from normalised headline words, not substrings or the publisher's name;
  - a timestamp more than five minutes in the future cannot establish coverage;
  - older coverage is labelled as available, not current.
- **TLS:**
  - an explicit port in an embedded URL is kept;
  - bracketed IPv6, trailing-dot names and punycode are accepted;
  - the public-address DNS guard runs before any socket opens.
- **Fraud:**
  - only the parties of a resolved transaction are screened;
  - missing evidence yields unknown;
  - it is a limited sanctions screen, not an execution simulation.

## A7 — On-chain sends: validate, then the owner signs

- **No `registerMiner` or `updateMiner` without a clean run** at integrate.telegraphprotocol.com.
- **The YAML is served from a pushed, commit-pinned URL** and hashed with SHA-256.
- **The owner signs.** Claude never signs, connects or sends.
- **`updateMiner` issues a new `registrationId`.** Whether it restarts the 7-day grace period is open
  (G206), so no update runs during the season without that answer.

## A8 — Deploys: preview, gates, production

- **Build from a clean git worktree**, outside OneDrive and at a short path: no `.env.local` and no build
  output gets uploaded.
- **Order:**
  1. preview first;
  2. probe the changed routes with `npx vercel curl`;
  3. `--prod`;
  4. `preflight.mjs` and `watch.mjs` against production.
- **Record the rollback target and the evidence** in `track1-miner/docs/evidence/release-<date>/`.
- **`git push` deploys nothing** (G22). After a rollback, production is pinned until `vercel promote`
  (G70).

## A9 — Secrets and schema

- **Secrets:**
  - the YAML is public;
  - no key, seed or private key goes in any tracked file, doc or commit message;
  - `.env*` is ignored from the first commit;
  - API keys are installed against the slug by a wallet-signed challenge.
- **Schema:**
  - `additionalProperties: false` holds at the root and inside `endpoints[]`, `auth` and
    `semantics.signal_mapping`, so an unknown key is a hard rejection;
  - `input_schema` and `output_schema` are top-level only;
  - `signal_mapping` takes only `confidence_field`, `label_field` and `reason_field`.
- **No `on_chain` block** (ERC-8183 callbacks) unless a Season II app needs it.

## A10 — Conventions

- **Code:** boring and explicit, TypeScript strict, files under ~300 lines.
- **Commits:** one task, one change, one commit. Messages describe the change and nothing else.
- **Docs** are the handoff between sessions; keep them exact.
- **Protocol facts** are verified against live docs, never memory, and recorded with dates.
