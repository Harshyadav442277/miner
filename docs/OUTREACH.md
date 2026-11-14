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

## Not to say

- No usage, user or demand figures from our own calls (folder override 2). The uptime sweep and the capacity test
  are our own traffic.
- No rank claim for STOCK_PRICE: devnode ranked it 1st on epoch 2013 while every request is refused.
- No rank claim at all without the epoch and the date. Ranks move every hour.
