# 2026-11-19: Groq key replaced; model-backed routes restored

- **Cause (GAPS G338):** production's `GROQ_API_KEY` was rejected with HTTP 401 by every model. Seen live at
  ~08:20 UTC through `fdba94e`'s `LLM <model> HTTP <status>` log line.
- **Fix:** the owner replaced the Production `GROQ_API_KEY` (Sensitive) at ~09:00 UTC. Claude never handled the value.
  Claude then redeployed `fdba94e` to production.
- **Production:** `miner-6q1l1vpb4` (`dpl_GLBJF9KU9MPZFprtVxMDZXnfind2`), code `fdba94e`. Rollback: `miner-ek944oseb`
  (same code, old key).
- **Verified on production** (`llm-verify.txt`):
  - generate, code-review, chat, translate, security-review, answer, web-search and sentiment all answer.
  - No `LLM … HTTP` error line in the new deployment's logs.
- **Not fixed by this:** `research-synthesis` answered `no_sources` for "Does regular exercise reduce depression
  symptoms?". That is the study search, not the model (GAPS G341).
