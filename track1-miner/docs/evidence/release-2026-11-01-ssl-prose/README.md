# Release 2026-11-01: SSL answers state the chain honestly (G246)

Owner, 2026-11-01: "Yes, investigate", then "Yes, deploy it".

## Build

| | |
|---|---|
| Build commit | `5939c49` on `codex/rank1-14-intents`; miner code differs from `e63df93` only in `src/ssl.ts` |
| Contains | failing verdicts state the chain as its own sentence; only a valid certificate is said to reach a trusted root (the untrusted answer used to deny and then assert it) |
| Unit tests | 871/871 on the deploy tree at `5939c49` |
| Preview | `miner-74m2bsojc-wukong4.vercel.app` — `preview-probes.txt`: expired, untrusted, wrong-host and valid answers as intended; /health and /weather-forecast unchanged |
| Production | `miner-1aoi3y0wt-wukong4.vercel.app`, `dpl_9wn4LryKUb4MohgLQZ4PhjPJDbD1`, alias `miner-wine.vercel.app` (promote: 409, already current) |
| Rollback target | `miner-jyh9t9upq-wukong4.vercel.app` (`e63df93`, `dpl_EbNUVhNrFJw1EsNBiZXZB4Kr5ie7`) |
| Registration | 4829, `active`, unchanged. Nothing signed, nothing pushed. |

## Gates on production (2026-11-01 11:34–11:50 UTC)

| Gate | Result | Note |
|---|---|---|
| preflight | 5/7 | `preflight.txt` |
| verify-deploy | PASS | badssl cases retried, then skipped (G246); `expired-rsa-dv.ssl.com` passed |
| intent answers | FAIL 39/40, **re-run alone 40/40** | `/macro` read neither BLS nor the New York Fed during the run; answered both correctly minutes later. Not touched by this release (`intent-rerun.txt`) |
| unit + live suite | FAIL 1, **re-run 997 pass, 0 fail, 1 skipped** | the failure was the one live test still calling `expired.badssl.com` with no retry (G246); moved to `expired-rsa-dv.ssl.com` in the follow-up commit. Skip: no model key locally (`unit-live-rerun.txt`) |
| param shapes, hostile inputs, upstream health, no-regression | PASS | no-regression 8 identical, 0 differ |
| watch | ok, 657 ms, `activation=active` | `watch.txt` |
