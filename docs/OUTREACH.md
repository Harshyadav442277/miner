# Outreach drafts — the owner posts, Claude drafts

Every figure here is from a dated evidence file. Re-check any figure older than a week before posting, and
replace it rather than round it. Evaluator-track drafts are Codex's, in `track2/OUTREACH_S2.md` on
`codex/sanctions-benchmark-v7`.

Rubric lines served: Miner consumption 10 (independent app groups, up to 3 points), and growth 20 in both the
Miner track (added 2026-11-05) and the Evaluator track (at least three original updates on separate dates, sharing
beyond our team, an invitation with a next step).
Posts are not scored on their own; what counts is an independent team acting on them.

## 1. Discord, #season-2 or the builders channel — post before Nov 14 (owner)

> **For app teams on Exchange, Compliance, Treasury and Security builds: one miner, sourced answers, $0.01**
>
> LiveCert (miner 4433) serves 43 intents. These are the ones the Season II mission builds buy most:
> sanctions screening (OFAC SDN + UN), company registry (GLEIF + SEC), SEC filings, transfer verification,
> macro indicators, URL reputation, question answering with citations, fact check, gas, wallet balance.
>
> Every answer opens with a plain sentence, then every value as a field, then `checked_at` and a `receipt`
> listing the upstream reads it was made from, so you can re-check it yourself.
>
> Copy-paste recipes for each intent: https://github.com/Harshyadav442277/miner/blob/main/docs/INTEGRATE_LIVECERT.md
>
> Where we refuse: if a source forbids resale we answer `not_licensed` rather than reselling it (stock prices,
> Google News headlines, IP geolocation). Don't buy those from us.
>
> Building something that needs one of these? Reply with the intent and an example question. I'll run it on
> production and send you the answer and its receipt.

## 2. X update 1 — post now (dated 2026-11-04/05)

> LiveCert, a Season II miner on @Telegraphprotoc, re-ran its 154-question audit on production today (Nov 4 UTC):
> 154/154 answered. We source-checked the 61 that changed or weren't a clean pass: 12 pass, 23 partial, 3 fail,
> 15 refused because the source bars resale. Two of the three fails are fixed and live.
>
> Uptime is now recorded every 30 minutes on public GitHub runs.
> Audit: https://github.com/Harshyadav442277/miner/tree/main/track1-miner/docs/evidence/audit-replay-2026-11-04

Before posting, check the audit link resolves on `main`. It does only after the branch is merged (Claude's PR).

## 3. X update 2 — after the next weekly audit (target Nov 11)

Template only. Fill every bracket from that week's evidence; post nothing that is not in a file.

> Week 2 of @Telegraphprotoc Season II for LiveCert: [N]/[N] audit answers, [pass/partial/fail], uptime [x]% over
> [n] sweeps since Nov 4, p90 latency [ms]. Fixed this week: [one line each]. Still failing: [one line].
> [link to that week's evidence folder]

## 4. X update 3 — after the intent update or the Nov 20 showcase

Template only.

> LiveCert now serves [intents added] and dropped [intents removed] because [their sources bar resale /
> they failed our audit]. [n] mission builds now get every intent they buy from one miner.
> Recipes: [link]. If your team calls us, tell us what broke.

## 5. X update, dated 2026-11-17: a lesson other miners can use (filled from evidence)

Sources: `track1-miner/docs/evidence/track1-diagnosis-2026-11-17/` and
`release-2026-11-16-federal-register/`. Re-check the epoch figures before posting.

> Building a miner on @Telegraphprotoc? Don't read `/api/miners` as the whole story. It shows only your latest scored
> epoch, so an intent the node didn't test that round looks "unscored". From the saved leaderboards, 11 of the 14
> intents I thought were unscored had scores.
>
> A real gap: REGULATORY_FILING's entity is "company, product or concern". We answered SEC EDGAR only, so a drug name
> got no count. Now a non-registrant gets a count of US Federal Register documents that name it (keyless API).
> Code + tests: [link to the PR or commit on GitHub]
>
> Disclosure: this is my Telegraph H2 hackathon entry, competing for a prize.

## 6. Tutorial outline: "Make your miner's answer readable by the Telegraph node" (for a GitHub README or article)

1. Find the scored field: `GET /engine/v1/intents/<ID>`, then `response.fields[]` where `scored: true` (name, type,
   unit, `true_when` / `false_when`).
2. Return that field at the top level under that exact name and unit, and lead the prose with the same value.
3. Map it in `intent_mapping.<ID>.output` (yaml-config docs), and map the node's input names to your params.
4. Validate on Anjoman before signing. The YAML hash is SHA-256.
5. Check your standing per epoch, not only the latest: keep the leaderboards over time (our `record-scores.mjs` +
   `intent-table.mjs`).
6. Honest limits: what we still score 0 on (GAS_PRICE, cause unknown) and why we may drop EVENT_OUTCOME.

Next step for readers: "Run `intent-table.mjs` on your own slug and tell me what it finds" (an invitation that an
independent developer can act on, rubric growth line 4).

## Not to say

- No usage, user or demand figures from our own calls (folder override 2). The uptime sweep and the capacity test
  are our own traffic.
- No rank claim for STOCK_PRICE: devnode ranked it 1st on epoch 2013 while every request is refused.
- No rank claim at all without the epoch and the date. Ranks move every hour.
