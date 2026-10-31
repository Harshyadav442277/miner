# Release 2026-10-31: licence gates, G200 qualifier, G217 holders

Owner's request, 2026-10-31: "update our miner and make it ready for the hackathon".

## Build

| | |
|---|---|
| Build commit | `330f2af` on `codex/rank1-14-intents` (fast-forward from `c75190b`) |
| Contains | the licence gates (G230–G234), the RESEARCH_QUERY qualifier fix (G200), the G217 holder fixes, the off-topic `/stock-price` order fix, the news-subject contraction fix |
| Preview | `miner-2ml0nseja` (`55a167b`), then `miner-egwbnylu1` (`330f2af`) |
| Production | `miner-h0lnck8v6-wukong4.vercel.app`, `dpl_7jkm2rLUANUkPusyxzjoR8Ttdbme`, alias `miner-wine.vercel.app` |
| Rollback target | `miner-6kvt9zv2p-wukong4.vercel.app` (`4af4ebd`, `dpl_7sWbxycAgdTLPWFuL98x5hvs5NRH`): `vercel promote <url> --scope wukong4` |
| Registration | 4829, `active`, unchanged. Nothing signed, nothing pushed. |

## Gates on production (2026-10-31 ~16:00 UTC)

| Gate | Result | Note |
|---|---|---|
| unit + live suite | PASS | unit 854/854 on `330f2af` |
| verify-deploy | PASS | 8.8.8.8 now expects an honest `not_licensed` |
| param shapes | PASS | a licence refusal must still name the subject |
| intent answers | PASS, 40/40 | 34 answered and checked for correctness; 6 graded as honest `not_licensed` refusals (below) |
| hostile inputs | PASS | |
| upstream health | PASS | probes of sources production no longer calls were removed; MET Norway and Nominatim added, through production |
| no-regression | PASS | 8 identical, 0 differ |
| watch | ok | endpoint ok, 357 ms, `activation=active` |

`preflight-before-gate-fixes.txt` is the first run on the same deployment: 3/7, every failure a gate that still
expected a barred source's answer, plus CRYPTO_PRICE's venue list, which predated Bitstamp.

## What production now refuses

Each refusal is `verdict: unknown`, `error: not_licensed`, names the subject and links the source's terms:

| Intent | Refused | Still answered |
|---|---|---|
| STOCK_PRICE | every share price (Yahoo, Nasdaq bar resale) | off-topic questions get `no_subject` |
| NEWS_HEADLINES | every request (Google News RSS) | |
| NEWS_SEARCH | every request (Google News RSS) | subjectless requests get `no_subject` |
| WEB_SEARCH | the current-news half | Wikipedia background, misroutes |
| IP_GEOLOCATION | public addresses (ip-api, ipwho.is, IPinfo) | reserved and private ranges |
| FINANCIAL_DATA | token and coin market data, listed-company market data | SEC 10-K figures |

Measured locally before the gate change (`intent-answers-local-c75190b.txt`): 34/40, the six above.

## Not verified

- OFAC SDN downloads fail from the dev machine (302, 0 bytes); they work from Vercel (preview probe and
  production gate).
- Translation was not probed on previews: `GROQ_API_KEY` is set for Production only. Production passes.
- Polymarket and Blockscout were unreachable from the checker during the run; both intents were graded for
  honesty only.
