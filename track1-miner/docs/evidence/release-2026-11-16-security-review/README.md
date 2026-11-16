# Release 2026-11-16 (third): `/security-review` live; chat briefs answer the whole question

Build `a118570`, production `miner-5vd4jwu4e` (`dpl_9DbYac9otZFY7eA6BXPoeS6zTKzC`), aliased to miner-wine.
Rollback target: `miner-8s4mxzd6g` (`95b8c03`). Owner, 2026-11-16: "once again try to improve them. then commit and
deploy", after being asked whether to commit the SECURITY_REVIEW route with its `miner.yaml` entry.

**Registration 5232 is unchanged.** It is pinned to `miner.yaml` at `494b135` by URL and SHA-256. This release adds
`/security-review` to the YAML on `main`, so SECURITY_REVIEW_GENERAL is served by the deployment but routed to us
only after the owner validates and signs a new registration (G314).

## SECURITY_REVIEW_GENERAL (not served before; epoch 2103: 29 miners, top 0.9858, second 0.9258)

Schema (`/engine/v1/intents/SECURITY_REVIEW_GENERAL`, read 2026-11-16): `target` in; `verdict` (Secure | Needs
changes | Insecure), `vulnerability_count` (scored), `issues`, `summary` out.

- Packages with a version (npm, PyPI, Maven, Go, and an explicit ecosystem): OSV.dev's known vulnerabilities for
  that version, records listed by two databases merged into one (requests 2.19.0: OSV's 10 records are 5 flaws).
- Sites: HTTPS, the plain-HTTP redirect, HSTS, CSP, framing protection, nosniff, cookie flags and version banners,
  each by CWE, over a socket pinned to the address the SSRF guard vetted.
- Code and configuration (Dockerfile, Kubernetes, Compose, nginx, settings): a model review with a CWE per finding;
  the verdict follows the findings. A repository link is refused rather than graded on github.com's headers.
- OSV.dev added to the sources ledger as `conditional` (CC-BY 4.0 attribution; the API states no rate limit).

Production probe, 10 labelled targets (7 vulnerable: SQLi, command injection, XSS, hard-coded key, path traversal,
pickle deserialisation, a root Dockerfile with a plain-text password; 3 safe): **10/10 verdicts right**, 5/6
single-CWE samples with the exact CWE (the hard-coded key came back CWE-259, not CWE-798). First run 8/10: the XSS and
path-traversal handlers were not recognised as code, fixed in `43e74ca`. Packages: lodash@4.17.15 Insecure, 5 CVEs;
requests==2.31.0 Needs changes, 3; example.com Needs changes, 5 missing protections.

## CHAT_COMPLETION (0.9693, rank 6/16, epoch 2103)

- The rank-1 miner's `/chat` returns a BBC RSS feed and scores 0.997, so the scorer is not grading answers against
  the leader; only our own brief quality was worked on.
- Prompt: a request for several items names them all; a "depends" answer says which way it usually goes. "Give me
  three tips for better sleep" went from one tip to three; "rent or buy" from "It depends on..." to the factors.
- A model brief with no closing mark loses to the reply's complete first sentence ("Uncertain: Bitcoin reaching
  $200" was served); every brief ends with a mark.
- 18-message burst on production: 17/18 pass the probe; the 18th is "Buenos días.", correct but under the probe's
  four-word minimum.

## SANCTIONS (0.9994, rank 9/27): not changed

Ten names with known answers matched expectations, and four checked against the rank-1 screener
(counterproof-sanctions-screener) agreed: Putin match; Tornado Cash, Banco Delta Asia, John Smith no match.

## Security reviews of the commits (automated) and what was done

- Cache key sliced the target at 2,000 characters: now a SHA-256 of the whole target (`d83711b`).
- Call-detection regex on uncapped input: detection capped at the 8,000-character review limit and the pattern
  anchored at a word start; 200 KB of hostile input is detected in under 300 ms in the unit test (`a118570`).

## Gates

Unit 1037/1037 (clean `dist-test`, deploy tree at `a118570`). Preflight (`preflight.txt`): the first run was 4/7.
Intent answers failed because `intent-answers.mjs` had no SECURITY_REVIEW checker, which it requires for every
declared intent; one was added and the gate re-ran 44/44. verify-deploy failed on wrong.host.badssl.com timing out,
which also timed out from this machine; it re-ran ALL CHECKS PASSED. The live suite failed one BTC test that expected
Bitstamp's wording where the route quoted Coinbase (the fallback added in `b18ca59`); the test now accepts either,
and the suite re-ran 1162 pass, 0 fail. Production was re-probed at 12:58 UTC: still `a118570`, all three routes 200.

## Not verified

- Any score for SECURITY_REVIEW: it needs the signed registration.
- CHAT_COMPLETION's next score.
- Code review of languages other than Python and JavaScript, and of Solidity, on production.
