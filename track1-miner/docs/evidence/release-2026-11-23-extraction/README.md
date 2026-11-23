# Release 2026-11-23: CONTENT_EXTRACTION brief and grounded model extraction

Owner's yes: 2026-11-23, in chat ("Yes, deploy it"), for PR #56.

| | |
|---|---|
| Build commit | `40b698f` (branch `PR/epoch-43-miner-improvements-5d425b`; code `7e5a86f`, `5dc18fc`, `7277e16`) |
| Deploy tree | `C:\Users\hyada\tg-deploy\m40b698f` (detached worktree, outside OneDrive) |
| Preview | `https://miner-bn0g1kffv-wukong4.vercel.app` |
| Production | `https://miner-mqhxx9oil-wukong4.vercel.app`, `dpl_AE3WL7EfDNqp7LYPLYJSiQrnd9Af`; `promote` answered 409 (already current) |
| Alias | `https://miner-wine.vercel.app` |
| Rollback target | `miner-pd9clrct7` (`5f28505`, `dpl_9pMfgpRecB1Cn116wHV5v8noi9wg`) |
| Registration watched | 6126 |

## Gates (2026-11-23 ~11:50–11:58 UTC)

| Gate | Result | Note |
|---|---|---|
| Unit tests on the build tree | 1084/1084 | in the session worktree, same code |
| Preview probes | pass | `preview-probes.txt`; `method: patterns` (no Groq key on preview) |
| Preflight | 7/7 | `preflight.txt`; no-regression 8 identical, 0 differ |
| Watch | endpoint ok 401 ms, activation active | `watch.txt` |
| Model path on production (G355) | pass | `prod-probes.txt`: six cases, every field briefed, one Groq upstream each |

## Seen on production after the release

- Before: `merchant, date, total` was briefed `merchant: Acme Supplies Ltd; date: March 12, 2026`.
- After: `merchant: Acme Supplies Ltd; date: 12 March 2026; total: $1,284.50`. Others: `sentiment: positive;
  rating: 4/5; complaint: noise`; `blood type: O+; allergy: penicillin`.
- Defect found (G358): `job title: Senior Data`. With four fields over 80 characters, the fitter cuts a long value
  before it tries tighter separators. Not fixed in this release.
- `/extract` licensing now reads `unclear` because Groq is declared (Groq Services Agreement status `unclear`).

## Probe-tool note

`vercel.cmd curl "<url>?a=1&b=2"` passes only `a`: cmd.exe treats `&` as a command separator, and `^&` did not
help. Call the CLI through node instead: `node %APPDATA%\npm\node_modules\vercel\dist\vc.js curl …`.

Score effect: unmeasured. Read CONTENT_EXTRACTION in the next two epochs.
