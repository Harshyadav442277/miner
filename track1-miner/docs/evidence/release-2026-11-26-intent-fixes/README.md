# Release 2026-11-26 — `bb6e288`: intent fixes from three parallel lanes, CPI NaN, review model logging

| | |
|---|---|
| Build commit | `bb6e288` (branch `PR/release-2026-11-26`); `e8c744b` after it changes one live test only |
| Preview | `https://miner-m3688lmw7-wukong4.vercel.app` (also `miner-q9bind5r4` at `59e90e8`) |
| Production | `https://miner-pymeiko6m-wukong4.vercel.app`, `dpl_4Xxd4dfdqbgHG4vkPjc72tnhXfD6`; promote answered 409 (already current) |
| Rollback | `miner-a3k2j7mfd` (`1cbd7f4`, `dpl_2iZdZvzi22bdyufsbq6XEp2dUdA8`) |
| Deploy tree | `C:\Users\hyada\tg-deploy\m8ce6dae` at `e8c744b` |

## What changed (each its own commit, each with an offline test)

| Intent | Change | Evidence |
|---|---|---|
| MACRO | US CPI and core CPI answered "NaN% year on year": BLS never published October 2025 (`2025M10="-"`), so October 2026's change divided by NaN. The latest computable month is used (`10f2a5e`) | production 2026-11-25 19:32 UTC answered NaN; preview answers 3.7% (Sep 2026), core 2.6% |
| MACRO | World Bank read retried once on timeout/5xx/429; no-year answers keep 4 decimals (`47bc1ad`, `2b57719`) | e47 Honduras and e49 South Africa calls before zero scores answered `upstream_unavailable` (data lane) |
| FINANCIAL | `asset`, the intent's own field, is read (`0331c86`); company answers add 10-K revenue, net income and a `metrics` string (`0986ff9`, `f69bc6e`) | `asset=AAPL` answered `no_subject`; leaders report 10-K figures and `metrics`. Not shown to cause the zeros |
| GAS | Celo read from its public RPCs (`0d51435`) | `chain=celo` arrived 9 times and was refused; a1-preflight answers. Preview: 200.00 Gwei |
| CROSS_CHAIN | Hash without `0x` read (`409dae4`); answers carry the intent's response fields `consistent`, `address`, `status`, `chains`, `summary` (`664b44d`, `9ce142a`); intent's `reference`/`chains` params read (`a799315`) | live `/engine/v1/intents/CROSS_CHAIN_STATE_VERIFY_GENERAL` (2026-11-26) scores `consistent` (bool); our answers never had it |
| TOKEN_SUPPLY | `token=Tether on Arbitrum`, `USD Coin`, `DAI (Ethereum)` resolve (`4b4751b`, `a1bc900`) | answered `no_token`; preview: 1,105,959,457 USD₮0 on Arbitrum |
| WALLET | A token contract named in the question is read for the other address, not used as the wallet (`5d09586`); `symbol` names that token (`bb6e288`) | "balance of token 0x5A98… held by 0x3e40…" answered 0 ETH; a1-preflight 128,086,165 LDO |
| RESEARCH | PubMed when Europe PMC fails or is slow past a 2 s hedge (`c93f50f`) | Europe PMC took 6.4–15.6 s on half of the routed probes vs a 6 s timeout; PubMed 0.5–1.2 s (research lane) |
| SYNTHESIS / NEWS / WEB | Question scaffolding out of search words (`3687eb6`, `842ef44`); OR queries searched whole with the entity required (`b3fb9b7`); web background answers lead with the labelled knowledge answer (`d1c5bc8`) | research lane commits; its final report was lost to a usage limit, so evidence is in the commit messages and tests |
| CODE_REVIEW | Review lines log `via=<model or cache> salvaged=<0/1>` (`dedc452`) | G364 |

## Gates (2026-11-26 03:30–03:50 UTC)

| Gate | Result |
|---|---|
| Unit tests | 1117/1117 at `bb6e288` |
| Preview probes | all changed routes answered as intended (`preview-probes.txt`) |
| Preflight, first run | 5/7: unit+live failed on one live research test that expected the old wording (fixed in `e8c744b`, test only); intent answers 42/44 (Google News 0 headlines; text generation 429) |
| unit + live suite, re-run at `e8c744b` | 1242 pass, 0 fail, 3 skipped (`unit-live-rerun.txt`) |
| intent answers, re-run alone after 2 min | 43/44; TEXT_GENERATION `429 rate_limit_exceeded` during the burst. A single `/generate` call at 03:49 UTC answered |
| Watch 6126 | endpoint ok 412 ms, activation active |

**Not a clean single 7/7 run.** The remaining failure is Groq's per-minute limit, hit by the gate's own burst.
No score effect of any change is observed yet.
