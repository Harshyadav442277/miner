# Ready to sign — three new intents on registration 334

**Written 2026-08-31. Code is DEPLOYED and verified in production; only the on-chain step remains,
and only the operator can do it.** Claude never touches the wallet.

Supersedes `ADD_TEXT_AUTHENTICITY_CHECK.md`, which covered one of these three. All three ride in
**one** `updateMiner` signature.

## What is being added

| intent | endpoint | miners today | bar to beat (epoch 295) | our measured score |
|---|---|---:|---|---|
| **CONTENT_EXTRACTION** | `/extract` (new) | 2 | **0.0** — both incumbents scored exactly zero | **1.000000 on 6 of 6**, raw and clipped |
| **NEWS_HEADLINES** | `/headlines` (new) | 2 | **0.00262926** (`newswire-headlines`) | **0.006447** mean; all 22 questions above the bar |
| **TEXT_AUTHENTICITY_CHECK** | `/ai-detect` (existing) | **0** | never scored by anyone | uncontested |

Every number above comes from running each intent's **own live champion scorer** against the
**deployed** production answers over the real recorded questions — never a hand-written candidate,
which is the measurement trap recorded in MEMORY §6.

## Why these three and not the others you asked about

`FACT_CHECK`, `IMAGE_VERIFICATION` and `TOKEN_HOLDER_COUNT` are all 2-to-4-miner fields with broken
incumbents, and they look just as inviting. **They are not included because I could not measure
them.** The public score feed no longer returns questions or ground truths (GAPS G24), and the
archived dumps contain **zero** recorded questions for those three — so there is no way to check
what we would actually score. Entering an intent on how weak the incumbents look, without running
its scorer, is exactly the mistake `SENTIMENT_ANALYSIS` already cost us: it had a 0.0 bar, an
endpoint was built, and its scorer turned out to be binary and unreachable. The endpoint was
deleted. See `EXPANSION_TARGETS.md` §5.

`IMAGE_VERIFICATION` has a second problem: answering it honestly needs real image forensics, and a
confidently wrong "this image was manipulated" is the `SPORTS_SCORE` trap.

## Also in this change

The `verdict` **enum is relaxed to describe actual behaviour**. It was a closed set that four of
our endpoints already violated — `/ip-geolocate` returns a resolved place name, which no enum can
cover. It has never been enforced (our IP answers scored 0.9920 with a place-name verdict), but
the manifest should describe what the service does.

## Risks, stated plainly

1. **`updateMiner` replaces the whole registration.** A bad activation takes all seven current
   intents offline. Mitigations: the code is already live (activation cannot find a missing
   route), `verify-deploy` exits 0 against production, 182/182 tests pass, and a manifest test now
   fails the build if endpoint intents and `supported_intents` disagree. **Sandbox-validate first**
   — CLAUDE.md rule 3.
2. **Traffic may be near zero** in all three. These are rank plays, not eligibility plays; none of
   them reaches the 3-miner-plus-100-request floor on its own.
3. **Headlines rotate.** `NEWS_HEADLINES` ground truths go stale between when they are written and
   when they are scored, which caps the score — that is why the measured mean is 0.0064 and not
   1.0. It still beats the live bar on every recorded question.
4. **Two of these champions are our own Track 2 submissions** (`TEXT_AUTHENTICITY_CHECK` reg 1882,
   and `IMAGE_VERIFICATION` reg 2008 which we are *not* entering). Worth disclosing plainly; note
   our translation miner scores **last** under our own translation scorer, which is the best
   evidence there is that these scorers are not miner-favouring.

## Steps

1. Re-check occupancy right before signing:
   `curl -s https://devnode.telegraphprotocol.com/engine/v1/intents | grep -E "CONTENT_EXTRACTION|NEWS_HEADLINES|TEXT_AUTHENTICITY"`
2. Publish `track1-miner/miner.yaml` as a **new gist revision**; copy the raw revision-pinned URL.
3. Hash the **hosted bytes, not the local file**: `curl -s <raw-url> | sha256sum`
4. Run the `cast send updateMiner` from `../REGISTRATION_UPDATE.md` with registration **334** as
   the id being replaced, and the new URL + hash.
5. Confirm `active`, `rejection_reason: null`, and **ten** intents; then
   `gh variable set REGISTRATION_ID --body <new-id>` in the same session.
6. `node tools/verify-deploy.mjs https://miner-wine.vercel.app` must exit 0 afterwards.

## If you skip it

The seven current intents are unaffected — the new routes simply serve traffic that never arrives.
Nothing degrades. **Do not sign against a node that is timing out**; devnode was unreachable for
hours on the night of 2026-08-30 and activation cannot be verified while it is down.
