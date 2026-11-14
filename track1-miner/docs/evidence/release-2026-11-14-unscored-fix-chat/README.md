# Release 2026-11-14: unscored-intent fix, answer fixes, chat brief and current facts

Owner: "deploy everything, merge the PRs" (2026-11-14). Four production deploys the same afternoon (UTC).

| Build | Production URL | Deployment | What |
|---|---|---|---|
| `a59ead4` | `miner-mo41ngruw-wukong4.vercel.app` | `dpl_9FoSc3c1eBSHTMfCzFH5NQLGVQDg` | CVE fallback (G288), web search brief and live figures (G289), no-code refusals, `jurisdiction`, YAML `494b135` |
| `d8b68aa` | `miner-np4le3xnp-wukong4.vercel.app` | `dpl_BcqWqAfZrXfC5BioWwcT1AKVL31S` | chat: today's date in the prompt, brief always a whole sentence |
| `d52d769` | `miner-6656v8dvn-wukong4.vercel.app` | `dpl_ETgwi6DQsUmB73cziJ548aAMuww5` | chat: office holder or latest release read from its register first |
| `697a41c` | `miner-59jvnyk6w-wukong4.vercel.app` | `dpl_HKnZTdQNemjFBLNLK3mUbHyTTHdk` | chat: the register fact goes to the model as one bounded line of data, not an instruction (commit security review). **Current production** |

**Rollback target:** `miner-mo41ngruw` (`a59ead4`); before this release, `miner-o6dy8wc6k` (`b455022`).

**Registration:** 5232 `active` (signed by the owner 2026-11-14 14:44:56 UTC, YAML `494b135`, SHA-256
`0x661625a3ae214362b612ded6d93684dbf1ab7a605a23b0851a2b046702a8b045`). 5152 `superseded`. Watcher after the last
deploy: `endpoint=ok 562ms (verdict=valid) activation=active`.

## Gates

| Gate | Result | Note |
|---|---|---|
| Unit | 982/982 on `a59ead4`, 987/987 on `d8b68aa`, `d52d769` and `697a41c` | run in the deploy tree |
| Preview probes, `a59ead4` | 8/8 as expected | `preview-probes.txt`. Previews have no `GROQ_API_KEY` (Production only), so chat was probed on production |
| Preflight on `a59ead4` | **5/7** | `preflight.txt` |
| verify-deploy | FAIL | `/papers`: "1 papers in prose", 4–5 s. Production answered "OpenAlex was unavailable; this list covers DOAJ's open-access collection only" |
| intent answers | FAIL on 2 of 43 | CVE_LOOKUP: NVD rate-limited, so the answer came from the CVE Program fallback (10.0 CRITICAL, xz 5.6.0, 5.6.1, correct) and the check wants NVD's CPE wording. ACADEMIC_SEARCH: OpenAlex unavailable from Vercel |
| Other five gates | PASS | no-regression: 8 identical, 0 differ |

Both failures are upstream availability from Vercel (NVD, OpenAlex), re-run alone with the same result; neither
module changed in this release. Not re-run after `d8b68aa` and `d52d769`, which touch `/chat` only.

## Production probes after the last deploy (15:1x UTC)

- `/cve?cve_id=CVE-2021-44228`: `critical`, `cvss_score: 10` (was `unscored`).
- `/web-search` "What is the current price of Bitcoin?": brief "Bitcoin (BTC) is $65,959.43 USD, the last Bitstamp trade at …".
- `/chat` "Who is the current president of the United States?": brief "Donald Trump is the current president of
  the United States, term 2025-2029." (was "Uncertain." with "As of my last update in November 2023").
- `/chat` "Will humans land on Mars before 2035?": brief "Uncertain: humans may not land on Mars before 2035".
- `/sanctions-screen?name=Vladimir Putin`: matches on OFAC SDN, the UK list and the EU list, 2.6 s.

## Not verified

- Whether registration 5232 gets scored on the 13 intents that had no score (GAPS G287). Read the catalog after
  two or three epochs.
- The rank effect of any change here.
