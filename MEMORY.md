# MEMORY.md — session continuity

## 2026-10-29 ~17:30 UTC (23:00 IST): CURRENT — branches merged and pruned; licensed-sources awaits the owner

Owner: "merge or fix branches as well so things dont get complicated. remove useless branches"

- **Backup first:** `C:\Users\hyada\telegraph-backups\branches-2026-10-29.bundle` (`--all`, verified; every one of
  the 18 refs in `refs-2026-10-29.txt` is in it at its old commit). Restore a branch with
  `git fetch <bundle> refs/heads/<name>:refs/heads/<name>`.
- **Merged into `codex/rank1-14-intents`:**
  - `main` (`b5bc712`): 63 scheduled score commits plus c90e4b9. The tree is unchanged; this branch already had
    `uptime.yml` byte for byte, and its academic deploy check supersedes main's.
  - `claude/miner-s2-conformance` (`db17364`): the G200 RESEARCH_QUERY qualifier fix. **Not deployed.**
  - `claude/wasm-track-2-quality-e21db3` (`0684fa1`): comparators, pair generators, adapter recipe, `SIGN_S2.md`.
    The track2 ledgers keep G28–G32 under the V2 entry and G33; Season I log dropped.
- **Verified:** unit tests 822/822 (was 816; +6 qualifier tests) and `tsc --noEmit` clean, on `0684fa1` in worktree
  `gallant-allen-3589e4`. Not run on Vercel; nothing deployed.
- **Deleted, all contained in codex or patch-equivalent:**
  - `claude/g208-intent-swap`, `claude/miner-s2-conformance`, `claude/wasm-track-2-quality-e21db3`,
    `claude/miner-s2-improve`;
  - the five branches parked at c90e4b9 (`morse-repair-dbb423`, `miner-improvements-0de1a5`,
    `project-improvement-strategy-5ff8d8`, `winners-github-repo-88c231`, `youthful-nightingale-1c5936`).
  - Their idle sessions' clean worktrees were **detached, not removed**: project-improvement-strategy,
    morse-repair, youthful-nightingale and wasm-track-2-quality. Archiving those sessions removes the folders.
- **Kept:**
  - `claude/licensed-sources` (owner decision, TASKS);
  - `claude/hackathon-rules-docs-update-0eb075` (the live session's worktree);
  - `claude/gallant-allen-3589e4` (this session's worktree).
  - Local `main` was fast-forwarded to codex. **origin/main is untouched:** updating it needs a PR and the owner's
    yes.
- **licensed-sources, trial merge then aborted:** 5 conflicts, 3 in code. Each side added something the other
  lacks:
  - `handler.ts`: receipts against the `licensing` field;
  - `currency.ts`: the 10-minute ECB hold against the Frankfurter fallback;
  - `geo.ts`: `noteRead` against `permitted`.

  Merging it makes `/stock-price`, `/headlines` and `/news-search` refuse every request. It bars GeckoTerminal,
  which `/token-holders` still falls back to, as well as ip-api, ipwho.is, IPinfo, Yahoo, Nasdaq, CoinGecko,
  Google News and Manifold.
- **Not done, owner's call:**
  - delete remote `origin/codex/livecert-manifest-19` (Season I);
  - remove the 3 detached deploy worktrees in `C:\Users\hyada\tg-deploy\` (check node_modules links first);
  - archive the idle sessions above.

## 2026-10-29 ~17:00 UTC (22:30 IST): Season II rules re-read; V2 docs moved to anjoman.ai; docs updated

Owner: "new hackathon has appeared. update the rules what is required. https://anjoman.ai/ new website as well.
update all the documentation. remove non useful things"

- **Branch `claude/hackathon-rules-docs-update-0eb075`**, moved to `codex/rank1-14-intents` @ `af568e1` before any edit.
  `main` was 223 commits behind, and this branch had no commits of its own. Docs only, no code. Committed as
  `62e4e9c` and fast-forwarded onto `codex/rank1-14-intents` on the owner's yes. Not pushed: 14 commits ahead
  of origin. Not deployed, and there is nothing to deploy.
- **The rules changed (read 2026-10-29, `RULES_SEASON2.md`):**
  - the final deadline is **Dec 1 23:59 UTC** for every track (no longer Dec 20);
  - judging runs Dec 2–8, with provisional results from Dec 9;
  - prizes: $7,000 main, plus $3,000 for separate December challenges with their own rules;
  - /judging returns 404, and the pages agree, so G203 is closed;
  - starting early is allowed; event evidence must come from the event period.
- **New site:** anjoman.ai is Telegraph's consumer front end and the new home of the V2 docs (also at
  docs.telegraphprotocol.com). Its dashboard needs the owner's sign-in.
- **V2 facts that touch us:**
  - intents are families, so register `X_SUFFIX` / `X_GENERAL`, never a prefix;
  - spot checks run about hourly per intent;
  - evaluators: float WASM adapters only, `registerWasm(..., prefix, ..., runnableUrl)`.
- **Registration 4829:** `active` on V2 with 36 suffixed intents. All 36 families are on the site's 134-intent
  catalogue (G208 closed). Its `registered_at` reads 2026-10-25 00:48 UTC (G220).
- **New gaps:** G218 prize-payment terms unpublished; G219 USDC vs MACHINA wording; G220 grace period after
  the import.
- **Removed:** superseded MEMORY entries for 2026-10-14 → 2026-10-25 17:30 and 2026-10-26 10:50/12:30 (their
  facts are in GAPS; `git log -p -- MEMORY.md`); done and past-dated TASKS items.
- **Next, the owner's:**
  - register before Nov 1 00:00 UTC (05:30 IST);
  - read the payment terms;
  - send the two WINNING.md §8 questions;
  - push;
  - deploy G217.

## 2026-10-27 ~18:45 UTC (28-10 00:15 IST): CURRENT — G217 holder fixes COMMITTED; not deployed, not pushed

Owner: "Yes: change the outage verdict to unknown and make /token-holders use KNOWN_TOKENS before GeckoTerminal,
with tests, committed locally. Don't deploy yet."

- **Done:**
  - Holder-count outages answer `unknown`, not `not_found`. A partial outage with no chain named does too, and
    names the chains that did not answer.
  - `/token-holders` reads `KNOWN_TOKENS` first. The table moved to `src/known-tokens.ts`, shared with
    `/token-supply`.
- **Verified:**
  - Unit tests 816/816.
  - Local build against live upstreams: `evidence/g217-holder-sources-2026-10-27/local-probes.json`.
  - The gate's outage check (`upstream_unavailable` plus the "index outage" sentence) still holds.
- **Not verified:** on Vercel. No deploy, by instruction.
- **Next:**
  - Owner: deploy on a yes; use the release-miner skill, preview first.
  - Owner: the Blockscout Pro key (TASKS Owner).
  - Owner: push `codex/rank1-14-intents`.

## 2026-10-27 ~15:45 UTC (21:15 IST): G217 investigated; no code changed

Owner: "Investigate G217 … propose a second holder-count source with measured agreement before changing anything."

- **From Vercel's egress:** Blockscout's Base, Arbitrum and Polygon hosts return 403; Ethereum and Optimism return
  200. Read from production receipts.
- **Candidates measured on 26 tokens:**
  - GeckoTerminal is fast to reach but unreliable and disagrees (−9% to +20%);
  - Ethplorer's freekey is for development only;
  - Routescan was already ruled out.
- **Recommended:** a free Blockscout Pro API key, which keeps the same index on all chains. The owner creates it.
- **Two small fixes proposed and not made:**
  - the outage verdict `not_found` should be `unknown`;
  - `/token-holders` should use `KNOWN_TOKENS` before GeckoTerminal.
- Evidence: `track1-miner/docs/evidence/g217-holder-sources-2026-10-27/`; GAPS G217.

## 2026-10-27 ~14:55 UTC (20:25 IST): CURRENT — G213 release LIVE on production; not pushed, not registered

- **Owner's yes, 2026-10-27:** "deploy codex/rank1-14-intents at 4af4ebd (preview first, then production), run the
  gates and re-measure token-supply latency. Don't push or sign."
- **Production:** `miner-6kvt9zv2p` (`4af4ebd`). Rollback target `miner-9ozpb4kgh`.
- **Gates at baseline:**
  - unit + live PASS;
  - intent answers 39/40 (the IP Tokyo pin);
  - upstream health: the two known failures;
  - registration 4829 active.

  Evidence: `track1-miner/docs/evidence/release-2026-10-27-g213/`.
- **Token supply on production:**
  - table symbols 8/8 within 500 ms (83–277 ms);
  - addresses 137–162 ms;
  - symbols outside the table 657–731 ms.
- **New: G217.** TOKEN_HOLDER_COUNT (registered) answers "index did not answer" on production, because Blockscout is
  not answering. This predates the release.
- **Next, all the owner's:**
  1. push;
  2. send the Ahmed message and the G32 report;
  3. the G205 choice;
  4. publishing the named field results;
  5. whether to fix G217 with a second holder index.

## 2026-10-27 ~14:10 UTC (19:40 IST): the 2026-10-26 recommendations worked through (superseded above)

Owner: "complete this work", referring to the recommendations of 2026-10-26: the six ideas and the tools.

**Status of each:**

1. **G208 intent swap.** Live since 2026-10-26. G213 is fixed in code (`11f6306`):
   - a verified table of 21 token contracts;
   - the Polygon `polygon_pos_` resolver bug, which also affected `/token-holders`.

   **Not deployed.** Push, console validation (G212) and signing (G206) are the owner's.
2. **Validators as the uptime record: not possible for free (G205).**
   - Vercel logs keep about 1 h, and only invocations that printed something.
   - Vercel metrics need Observability Plus, a paid Pro feature.
   - Devnode and the explorer publish no liveness history.

   The owner picks: the uptime workflow, Vercel Pro, or a store.
3. **Replayable receipts: `tools/verify-answer.mjs`** (`2cb4049`, hardened `7f60ec2`).
   - It runs on the caller's machine, not as a miner endpoint, to avoid SSRF.
   - Documented in `docs/INTEGRATE_LIVECERT.md`.
   - `/vuln-triage` receipts now name a KEV catalog held in memory.
4. **Field check: `tools/field-check.py`** (`d8fa299`). Evidence: `field-check-2026-10-27/`.
   - Service endpoints that pass: DNS 3/5, token supply 2/5, triage 2/9. LiveCert passes all three.
   - Raw public APIs registered as endpoints pass 1 of 22.
   - **Named results stay outside the repo** (`C:\Users\hyada\tg-deploy\field-2026-10-27\`). Publishing them is the
     owner's call.
5. **MCP server: closed.** Telegraph already ships Telegraph-MCP (TELEGRAPH_FACTS 2026-10-27).
6. **G32 report: drafted in WINNING.md §9, not sent.** It asks whether v2 reuses the converter.

**Tools:**
- `.claude/skills/release-miner/SKILL.md` is written.
- Vercel MCP: used for the metrics check above.
- Playwright demo video: **not started.** It is low urgency; submission is in December.

**Commits on `claude/g208-intent-swap`:** `11f6306`, `2cb4049`, `7f60ec2`, `d8fa299`, plus this record. The main
branch is fast-forwarded and **not pushed**.

**Next, all the owner's:**
- a yes to deploy `11f6306`+ (G213 and the Polygon fix) and measure;
- a yes to push;
- send the Ahmed message (G206, G208, G212) and the G32 report;
- the G205 choice;
- whether to publish the named field results.

## 2026-10-26 ~05:20 UTC (10:50 IST): CURRENT — item 2, answer receipts, DEPLOYED and pushed

- Production `miner-mz9gh2afy`, rollback `miner-l5taibkkl`.
- All 36 intents carry receipts on production, with no secret-like values.
- Gates are at baseline after `no-regression.mjs` learned to ignore `receipt`.
- Evidence: `track1-miner/docs/evidence/release-2026-10-26-receipts/`.
- **Owner said "keep working, give prompt to yourself"** (2026-10-26). Self-set order:
  1. item 3, calibrated confidence, from labelled answers;
  2. item 5, nightly self-check;
  3. item 6, OpenAPI spec.

  Build, test and commit each locally. Pause only for deploy, push, keys or `updateMiner`.

- **The confidence rule and OpenAPI are DEPLOYED and pushed (2026-10-26 ~05:47 UTC):** production `miner-ccy6bq1ee`,
  rollback `miner-mz9gh2afy`, gates at baseline. Evidence: `release-2026-10-26-confidence/`.
- **Item 3, confidence (now deployed):**
  - On the Oct 21 audit, answers at confidence 1.0 were right only 72% of the time; Brier score 0.210.
  - Confidence is a fixed level per intent, not a per-answer judgement.
  - Too few labels to re-tune per intent. One rule was written down instead: 1.0 only for a direct
    authoritative read. Under it, translation is now 0.9 and academic topic search 0.8.
  - Evidence: `track1-miner/docs/evidence/calibration-2026-10-26/`.
  - The real fix is a fresh graded set of at least 10 per intent on current production.

- **Item 5, nightly self-check: blocked on the owner.** A scheduled job against production is like the `uptime`
  workflow the owner turned off (G205).
- **Item 6, OpenAPI (committed, not deployed; it is a repo doc):** `docs/openapi.json`, 35 operations, generated by
  `tools/openapi.py`.
  - Every field production returns is documented: 0 undocumented on the re-check.
  - Found G211: the registered `output_schema` omits 101 returned fields.

- **G200, RESEARCH_QUERY (committed, NOT deployed):**
  - `src/research.ts` now searches the name together with the question's qualifier.
  - It requires the qualifier in a trial's title or conditions (with a small clinical-synonym map).
  - Drug codes go first; bare company words are dropped.
  - Concept papers need every word.
  - A state's political decision is declined.
  - Replay of 100 questions (`tools/research-replay.mjs`): the 3 audit fails are fixed, 47 leads changed
    (read by hand), 4 still weak. Unit tests 804/804.

### Earlier the same morning


- **Every answer now ends with a `receipt`:** the upstream requests actually made, with credentials redacted, the
  status, the time, `from_cache` and the deployment. Code: `src/receipt.ts`.
  - `fetch` is wrapped once and each request runs in its own AsyncLocalStorage context.
  - TLS, DNS, the redirect walk and Quad9's HTTP/2 queries are noted by their modules.
- **Checked locally on all 36 intents:** every one has a receipt and none holds a secret-like value.
  Unit tests 798/798. Evidence: `track1-miner/docs/evidence/receipts-2026-10-26/`. The receipt is documented in
  `docs/INTEGRATE_LIVECERT.md`.
- **Next:**
  1. The owner's yes to land and deploy, then re-run `tools/receipt-check.mjs` against production.
  2. Item 3, calibrated confidence.

## 2026-10-25 ~18:00 UTC (23:30 IST): Ahmed answered — miners carry over to v2; listed-intents question pending

- **Registration 4829 carries over to v2** with no re-registration (TELEGRAPH_FACTS item 10).
- **On unlisted intents (G208), Ahmed said "let us check".** Pending; nothing is re-registered until the answer.
- **G206 (does an update restart the grace period?) is still unanswered.**

## Durable facts (true across sessions; re-verify protocol facts against live docs)

**Identity.**
- Hackathon signup: `harsh.2024a@vitstudent.ac.in`. X: `@hyadav42774`.
- Miner, fee and Track 2 script wallet: `0xdAd201ef02f5C1FBB8f9e931AE9B7c1bF493A39e`. Wallet operations
  are the owner's: Claude drafts and validates, the owner signs.
- Chain: Base Sepolia testnet, Diamond `0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8` (V2 docs, 2026-10-27).
  Season II rules: `RULES_SEASON2.md` (re-read 2026-10-29). Protocol docs: anjoman.ai/docs.

**Registration.**
- Look up by registrationId, never by slug. The catalog's `id` is not a registrationId either
  (`/api/miners/4433` is someone else's miner).
- Sandbox-validate at integrate.telegraphprotocol.com first; a rejection releases the slug.
- The YAML is served from a commit-pinned raw GitHub URL, so push before signing. The registered hash is
  the SHA-256 of the hosted bytes.

**Deploy (read GAPS G70).**
- Only from a clean `git worktree` at the release commit: `vercel deploy` uploads the working directory.
- Preview first, then `--prod`. After a `vercel rollback` the alias is pinned and `--prod` does not move it:
  run `vercel promote <url>`. Then `preflight.mjs`.
- Deploy new code only after a registration change it depends on is mined.

**Working here.**
- The tree is shared between sessions: commit with explicit pathspecs, never `git add -A`.
- Git Bash: run `manifest-diff.mjs` with `MSYS_NO_PATHCONV=1`; use `curl -4` (IPv6 hangs); files are CRLF.
- `tools/watch.mjs`: `--once` goes last. The explorer feed labels miners by display name; use
  `routing.subnet_id`. `git worktree remove` can hit a Windows lock; run `git worktree prune` after.

**Elsewhere.** Track 2 (WASM scorer): `track2/`. Track 3 app Morse: `../telegraph-morse`, its own repo.
The Midnight / NightSeal hackathon is a different, unrelated project.

**Older history** (Season I sessions, Aug 26 – Oct 13) was cut on 2026-10-17, and Oct 14 – Oct 25 was cut on
2026-10-29, to keep this file short: `git log -p -- MEMORY.md`.
