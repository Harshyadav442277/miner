# Release 2026-10-25 (second): the G210 fixes on production

- **Build:** `f37582a` on `codex/rank1-14-intents`. It carries `a73d00a`:
  - the registry subject skips articles;
  - SEC facts that are not a list are read as no facts;
  - classification lets the model decide where the word list declines;
  - URLhaus is removed.
- **Deployed from:** a clean worktree at `C:\Users\hyada\tg-deploy\mf37582a` that held only the `.vercel` link.
- **Preview:** `miner-gg2j9ut1g`. Five probes, all correct (`preview-probes.txt`).
- **Production:** `miner-l5taibkkl` (`dpl_qu7A4NBd7wCqZf5LumXotNSjuEYy`), 2026-10-25 ~18:35 UTC, aliased to
  `miner-wine.vercel.app`.
- **Rollback target:** `miner-8lwhe1wtl` (`dpl_HyuURtyVGkBrfWZtcKG9HfJaPGv5`).

## Gates

| Gate | Result | Note |
|---|---|---|
| verify-deploy | PASS | |
| param shapes | PASS, 54/54 | |
| hostile inputs | PASS, 162/162 | |
| no-regression | PASS, 8 identical | |
| intent answers | 34/36, then **35/36** | URL_SAFE failed only on a check that counted 3 sources. With the check corrected to 2 sources, and extended so a clean URL must be `listed: false`, the re-run passes (`intent-answers-rerun.txt`). The remaining miss is the known IP Tokyo pin |
| upstream health | 2 FAIL | Both known: the ip-api primary and the merkle RPC answering 429 |
| watch.mjs, registration 4829 | `endpoint=ok activation=active` | 18:36 UTC |

## The five G210 questions on public production (`g210-production-recheck.txt`)

| # | Question | Production now | Matches the source |
|---|---|---|---|
| 1 | Is Nvidia Corporation an active registered company? | found: active, Delaware no. 2862596, incorporated 1998-02-24 | GLEIF, yes |
| 2 | Latest annual report filing from Coca-Cola on EDGAR | 10-K filed 2026-02-20, accepted 14:46 UTC, accession 0001628280-26-010047 | EDGAR, yes |
| 3 | Exoplanet headline as politics, sport or science | `ambiguous` on the first call, then **science** (0.6) once the 60 s response cache expired | yes, after a retry |
| 4 | VAT-invoice ticket | **billing** (0.6) | yes |
| 5 | Google's Safe Browsing test page | `safe`: not listed by Cloudflare or Quad9 | Our two sources do not list it; only Google Safe Browsing does (a coverage limit) |

## On #3

- The first call missed the 350 ms model deadline and fell back to the word list's `ambiguous`.
- The handler's 60-second response cache then replayed that answer twice.
- After the cache expired, the same question answered science twice: 0.62 s and 0.31 s total from India,
  including the round trip.
- Two new wordings of the same headline answered science at once.

**Known limitation:** a fallback answer is cached for up to a minute like any other.

## Not done

- `miner.yaml` still describes URLhaus. It is hashed into registration 4829 and changes only with the next
  `updateMiner` (G210).
