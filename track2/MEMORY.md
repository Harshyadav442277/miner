# MEMORY.md — Track 2 session continuity

**Read this first every Track 2 session.** Update at session end.

The Season I log (Aug 27–31: rank_answer slots, calibration, registration 1882) was cut on 2026-10-29. Every
module and file it described was deleted on 2026-10-23, or on 2026-10-29 for registration 1882, so its links no
longer resolved. It is in `git log -p -- track2/MEMORY.md`.

## CURRENT — 2026-10-29 · V2 IS LIVE; THE EVALUATOR WORK MUST BE RE-CHECKED AGAINST IT

- **The full Season II evaluator log** is `track2/MEMORY.md` and `track2/GAPS.md` on branch
  `claude/wasm-track-2-quality-e21db3` (latest entry 2026-10-25), not on this branch.
- **2026-10-25:** WASM work stopped after Ahmed said "the current wasm system will be deprecated in couple of
  days". Nothing is registered or signed. The public `telegraph-factscore` branch `season2-evaluators` holds the
  comparators and the training recipe, but no adapter package. The local kit and the adapter runs (~5 GB) are in
  `C:\Users\hyada\tg-eval\`. Delete them only on the owner's say-so.
- **2026-10-29, V2 docs (anjoman.ai/docs, updated 2026-10-27):**
  - Only float model adapters in WASM are accepted. "The older formats are refused."
  - `registerWasm(hash, url, prefix, feeAddress, runnableUrl)`, registered per family, with a runnable endpoint.
  - Devnode `/api/wasm` lists 7 families. Registration ids restarted, and 1882 is gone.
- **Next:** read `/docs/scoring/build-a-scoring-module`, `train-a-scoring-adapter` and
  `contribute-evaluation-data` on anjoman.ai. Then decide whether the comparators and the adapter port to V2,
  before any registration. Deadline: Dec 1 23:59 UTC ([../RULES_SEASON2.md](../RULES_SEASON2.md)).
