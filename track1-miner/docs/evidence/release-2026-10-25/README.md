# Release 2026-10-25: G209 latency fixes on production

- **Build:** `d498e8a` on `codex/rank1-14-intents`. It carries:
  - `cd33a6c`: sentiment and classification on a fast non-reasoning model, with plain prompts;
  - `3f5a813`: FX holds the daily ECB table;
  - `d498e8a`: the classification label punctuated as its own sentence, and the intent gate checking the
    label field.
- **Deployed from:** a clean worktree at `C:\Users\hyada\tg-deploy\m193dd13` that held only the `.vercel`
  link.
- **First production, `miner-e3ugwgp9b` (from `193dd13`):** failed two intent checks, for these reasons.
  - **Classification:** the answer read "Science and technology The passage…", with the label run into the
    sentence. That was a Season I scorer register, which the old prompt's wording had hidden.
  - **Sentiment:** the check required the old "word-list reading" wording for `github.com`, which this change
    deliberately removed. The answer itself (`neutral`) was right.
  - Both were fixed in `d498e8a` and redeployed within minutes.
- **Production now:** `miner-8lwhe1wtl` (`dpl_HyuURtyVGkBrfWZtcKG9HfJaPGv5`), 2026-10-25 ~16:40 UTC, aliased
  to `miner-wine.vercel.app`.
- **Rollback target:** `miner-e2999tb2p` (`dpl_6bHka3JVSZrBXfrca9gUB6HxgWQk`), from `8d121e9`.

## Gates on `miner-8lwhe1wtl`

| Gate | Result | Note |
|---|---|---|
| verify-deploy | PASS | |
| param shapes | PASS, 54/54 | |
| hostile inputs | PASS, 162/162 | |
| no-regression | PASS, 8 identical | |
| intent answers | 35/36 | The known IP Tokyo pin |
| upstream health | 2 FAIL | Both known: the ip-api primary and the merkle RPC answering 429 |
| watch.mjs, registration 4829 | `endpoint=ok activation=active` | 16:41 UTC |

Preflight was not re-run as a whole: its unit suite was run separately (795/795), and its live STORM tests
cannot reach `api.met.no` from this machine (release-2026-10-24).

## Latency after the release

Measured against the site's targets on questions not asked before:
`../conformance-2026-10-25/latency-after.txt` and `questions-after.json`. **All 39 measurements, 3 per
listed intent, were within target.** Highlights:
- sentiment 104–163 ms (target < 300 ms);
- classification 176–345 ms (< 400 ms);
- FX 37–77 ms (< 250 ms);
- sanctions 99–168 ms on a warm instance (< 500 ms).

A new instance's first sanctions call still downloads the lists (G209, the owner's call).

## Answers this run surfaced that may be wrong (not yet checked against sources)

- CORPORATE_REGISTRY_LOOKUP: "Is Nvidia Corporation an active registered company?" returned `not_found`.
- REGULATORY_FILING_MONITOR: "Latest annual report filing from Coca-Cola on EDGAR" returned `unknown`.
- TEXT_CLASSIFICATION: the exoplanet headline (politics, sport or science) and the VAT-invoice ticket came
  back `ambiguous`. The guard declines without a word-list margin.
- URL_SAFE: Google's Safe Browsing malware test page returned `unknown`.
