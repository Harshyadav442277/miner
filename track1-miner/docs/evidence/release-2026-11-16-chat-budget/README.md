# Release 2026-11-16 (second): chat no longer refused after ~12 calls a minute

Build `95b8c03`, production `miner-8s4mxzd6g` (`dpl_86UMLg8FutFqQTebhmvjpmdXF25R`), aliased to miner-wine.
Rollback target: `miner-2yrp4fuh8` (`f3ba9f4`). Registration 5232 and `miner.yaml` unchanged.

## Why

CHAT_COMPLETION_GENERAL scored 0.9693, rank 6 of 16 in epoch 2103 (top 0.997). A burst of 18 distinct messages to
production `/chat` (2026-11-16 ~09:20 UTC) answered the first 12 and then 6 in a row with
`upstream_unavailable`, no brief, in about 250 ms: refused by our own long-call budget before any model was asked.
That budget charged each call the completion cap it reserved (~1,000 tokens for chat) against 12,000 a minute.
One brief also ended with no full stop.

## What changed

- `llm.ts` (`99e30fb`): a long call that answers is charged Groq's reported `usage.total_tokens`, not its reserved
  cap. `longAvailable()` says whether a long call can run now.
- `genai.ts` (`99e30fb`, `95b8c03`): when the long budget or its cooldown would refuse, chat answers through the
  phrasing path with a 500-token cap, at most 6 such calls a minute (`fallbackAllowed`), and none while the long
  path cools down. That bucket was added after the commit security review flagged that a chat burst could use up
  the quota sentiment, fact-check, news briefs and classification share. Every brief ends with a full stop.

## Gates and probes

- Unit 1024/1024 at `95b8c03` (clean `dist-test`).
- Chat burst, same 18 messages: before 11/18 with a valid brief (6 `upstream_unavailable`, 1 missing full stop);
  after 17/18, the remaining one "Buenos días." flagged only by the probe's four-word minimum. Median 1,086 ms,
  max 2,703 ms.
- Preflight was not re-run on `95b8c03`; `f3ba9f4` (two commits earlier, same routes apart from chat) ran it.

## Not verified

The score effect on CHAT_COMPLETION; the real Groq usage per chat call (no key outside Vercel).
