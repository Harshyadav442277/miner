# Telegraph Hackathon Season II — rules as published

Read 2026-10-17 ~07:55 UTC in a browser from the organiser's site. Quoted or closely paraphrased;
nothing here is inferred. **The Miner track's rules and judging are NOT published yet** — every page says
"Rules and judging for Miner and Evaluator submissions will be published separately." Re-read before
1 Nov and replace this file when they appear.

## Dates — https://hackathon.telegraphprotocol.com/timeline

| When (2026) | What |
|---|---|
| Before 1 Nov | Register once for all three tracks; explore the 15 commercial missions and the Intent catalogue |
| 1–7 Nov | Pick a track. Miners pick the Intents they will serve |
| 8–14 Nov | Apps & Agents: one settled transaction by end of week two or cut from reward eligibility |
| 15–21 Nov | Office hours. "Miners tune against real requests coming off real builds" |
| 22 Nov – 1 Dec | Submissions close; judging against published criteria |

Prize pool: $10,000 total; the split between Miner, Evaluator and Apps & Agents tracks "will be announced".

## Miners — https://hackathon.telegraphprotocol.com/build

"Serve one or more shared Intents and compete globally on measured performance. You compete by Intent,
not by industry."

## How demand reaches a miner — /how-it-works and /tracks (read 2026-10-17)

- "Telegraph resolves the intent behind each request and routes it to the highest-ranked miner for that
  intent. The app never picks or hardcodes a miner."
- Each answer returns with a receipt: "Who produced it, what they rank for that intent, and at what
  confidence."
- "An Intent is global. The same Miners serve it, the same Evaluators score it, and every mission that
  needs it buys from the same ranking." Evaluators (the successor to Season I's script authors) compete
  per intent to replace weaker measurement.
- Fifteen commercial missions direct the Apps & Agents track only; miners are not tied to a mission.

## Apps & Agents (the buyers of our answers) — /rules and /judging

- **Rule 01, the agent buys:** "The app cannot call an API directly. It routes a paid request through
  Telegraph and consumes the verified, ranked answer."
- Rule 02: request, miner, amount, **Sepolia** transaction hash and network label on screen.
- Rule 03: at least one leg is machine-to-machine with no human in the loop.
- Judging: mainnet readiness 35%, commercial viability 30%, verifiable transaction volume 20%,
  **network usage 10%** ("consumes the ranked, verified answer rather than shortcutting to a direct API
  call"), novelty 5%.

## What this changes for us

- Season I demand was 91% direct calls. Season II apps are told **not** to call directly: their requests
  are routed, and routing serves the ranked answer. Per-intent measured performance is therefore how
  Season II demand reaches a miner — the risk SEASON2_PLAN.md flagged on 2026-10-11 is confirmed.
- Settlement is on **Sepolia**. Our registration is on the Season I devnode; whether miners must
  re-register on another network is unknown until the miner rules publish (GAPS).
- Season II registration ("Register for Season II") is not recorded as done anywhere in this repo.
