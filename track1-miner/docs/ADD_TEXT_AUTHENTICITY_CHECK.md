# Ready to sign — adding TEXT_AUTHENTICITY_CHECK to registration 334

**Written 2026-08-31 (early hours), while Telegraph's backend was down. Status: manifest change
made and tested locally; code already live; ONLY the on-chain step remains, and only the operator
can do it.** Claude never touches the wallet.

## What this changes

Two lines in `track1-miner/miner.yaml`, nothing else:

```diff
-    intents: [AI_TEXT_DETECTION]
+    intents: [AI_TEXT_DETECTION, TEXT_AUTHENTICITY_CHECK]
     ...
     - AI_TEXT_DETECTION
+    - TEXT_AUTHENTICITY_CHECK
```

No new endpoint, no new code, no `base_url` change. `/ai-detect` already serves this exact
question shape — `src/aidetect.ts` has been written for both intents since it was created, and
its header says so.

## A second fix rides along in the same signature

While preparing this, the manifest turned out to constrain `verdict` to a **closed enum that four
of our seven endpoints violate**: `/translate` returns `"translated"`, `/papers` returns
`"papers"`, `/ai-detect` returns `likely_human` / `likely_ai` / `inconclusive`, and
`/ip-geolocate` returns the resolved **place name** — which cannot be enumerated at all — plus the
special-range classes added 2026-08-30 (`private`, `reserved`, `loopback`, …).

This has never bitten: the node clearly does not hard-enforce the enum, and our IP answers scored
**0.9920** with a place-name verdict. But it is a real manifest-versus-behaviour mismatch, it is
exactly the sort of thing a judge reading the manifest would flag, and it would become a genuine
hazard if the node ever started validating. The enum is therefore **replaced with a per-endpoint
description of the actual vocabulary** rather than extended, because `/ip-geolocate` makes a closed
set impossible.

Both changes are in `track1-miner/miner.yaml` now and cost **one** signature between them.

## Why it is worth a signature

**TEXT_AUTHENTICITY_CHECK has zero miners and has never been scored by anyone** (recon
2026-08-30, `docs/EXPANSION_TARGETS.md` §1). It is canonical on-chain — re-verified 2026-08-31 by
reading `getCanonicalIntents()` straight from the diamond over Base Sepolia RPC, which works even
while devnode is down.

An intent nobody serves is the one place where rank 1 is not a contest. Judging normalises as
*your score ÷ the best score in your intent*, so being the only miner makes that ratio 1. This is
the same play that took AI_TEXT_DETECTION on its debut epoch, except with no incumbent at all.

## The risks, stated plainly

1. **`updateMiner` replaces the whole registration.** A malformed YAML that activates badly would
   take all seven current intents offline. Mitigation: the diff is two lines inside a manifest the
   node already accepted as 334; a new `test/manifest.test.ts` case now fails the build if an
   endpoint intent and `supported_intents` ever disagree; **sandbox-validate first** (CLAUDE.md
   rule 3).
2. **It may never be scored.** Zero miners probably means near-zero routed traffic. Then this is
   simply inert — it costs gas and changes nothing.
3. **It does not fix eligibility.** One miner is below the 3-miner floor, so the intent stays
   prize-ineligible. This is a rank play and an availability play, not an eligibility play.
4. **Re-verify the "zero miners" claim first.** It was read on 2026-08-30 and the backend has been
   down since; if someone else has entered meanwhile, the calculus changes.

## Steps

1. `curl -s https://devnode.telegraphprotocol.com/engine/v1/intents | grep -i text_authenticity`
   — confirm the miner count is still 0 (or at least that we would not be third into a crowd).
2. Publish `track1-miner/miner.yaml` as a **new gist revision** and copy the raw, revision-pinned
   URL.
3. Hash the **hosted bytes, not the local file** (the console and gist re-serialise; MEMORY §0b):
   `curl -s <raw-url> | sha256sum`
4. Run the same `cast send updateMiner` from `../REGISTRATION_UPDATE.md`, substituting the new URL
   and hash, with registration **334** as the id being replaced.
5. Confirm activation: `/api/miners/<new-id>` shows `active`, `rejection_reason: null`, and
   **eight** intents; then `gh variable set REGISTRATION_ID --body <new-id>` in the same session —
   nothing in CI catches that variable being stale.
6. `node tools/verify-deploy.mjs https://miner-wine.vercel.app` must exit 0 afterwards.

## If you would rather not

Skipping this costs one uncontested rank-1 slot and nothing else. The seven declared intents are
unaffected either way. Given the network outage on the night of 2026-08-30, doing nothing until
the node is demonstrably healthy again is a perfectly defensible call — **do not sign this against
a node that is still timing out**, because you cannot verify activation afterwards.
