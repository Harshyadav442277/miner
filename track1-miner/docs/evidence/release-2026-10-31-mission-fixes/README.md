# Release 2026-10-31: mission-workflow fixes (G241–G243)

Owner, 2026-10-31: "Yes, fix them", then "Yes, deploy it".

## Build

| | |
|---|---|
| Build commit | `a8abbcf` on `codex/rank1-14-intents` (fast-forward from `5a3dba0`) |
| Contains | fact-check: a possessive subject before the claim's own key, disambiguation-page fallback (support only), founding-year sentences (G241); sentiment: market verbs beside their market noun, and outcome news is not neutral in the model prompt (G242); event outcome: United States / US folded on both sides (G243) |
| Unit tests | 866/866 on the deploy tree at `a8abbcf` |
| Preview | `miner-d881p4yiz-wukong4.vercel.app`, probes in `preview-probes-a8abbcf.txt` (10/10 as expected) |
| Production | `miner-htkhwofwv-wukong4.vercel.app`, `dpl_5SRVMZsWNm61QFQn5zeqtjAxVwbo`, alias `miner-wine.vercel.app` (promote returned 409: already current) |
| Rollback target | `miner-h0lnck8v6-wukong4.vercel.app` (`330f2af`, `dpl_7jkm2rLUANUkPusyxzjoR8Ttdbme`): `vercel promote <url> --scope wukong4` |
| Registration | 4829, `active`, unchanged. Nothing signed, nothing pushed. |

## Gates on production (2026-10-31 ~19:20–19:30 UTC)

| Gate | Result | Note |
|---|---|---|
| unit + live suite | PASS | |
| verify-deploy | PASS | |
| param shapes | PASS | |
| intent answers | PASS | the six `not_licensed` refusals are the known baseline (GAPS G230) |
| hostile inputs | PASS | |
| upstream health | PASS | |
| no-regression | PASS | 8 identical, 0 differ |
| watch | ok | endpoint ok, 380 ms, `activation=active` (`watch.txt`) |
| mission workflows | **7 pass, 0 fail, 2 unchecked of 9** | `../missions-2026-10-31/fixtures-production-a8abbcf.json`; 3 pass, 4 fail before this release. The 2 unchecked are the SEC cross-checks, which need `SEC_USER_AGENT` |
