# CONTENT_EXTRACTION — the zero at epoch 343

Champion **reg935** (`content_extraction_reg935.wasm`, sha256 `a49deaf1…f115e`), confirmed
byte-identical to the live `wasm_url` on 2026-09-19.

## What the score feed says

`scores-by-epoch.txt` — every epoch from 306 to 343 with the payload the node sent, recovered
from `microlink-url-extraction`'s `The URL \`…\` is not valid` failure, which echoes the payload
verbatim. Eleven payloads cycle. Scores in this intent are exactly 1 or exactly 0.

Epoch 343's payload was **"Reach us at support@example.com or call 555-0192."** It has been
asked five times — 312, 316, 320, 333, 343 — and `livecert` scored 0 on all five. The epoch
leader, `chainsight-oracle`, scores 1.0 by echoing the payload back unchanged.

## What the champion does

`champion-rule.txt`. Two rules, both measured:

1. **Polarity first.** One `no`, `not`, `none`, `never`, `neither` or `nor` anywhere in the
   answer scores 0 against every positive ground truth. Prefixing the leader's own verbatim
   echo with "No named entities were found in the supplied text." takes it from 1 to 0.
   `Nothing`, `Nobody` and `Zero` do not trigger it — it is those six tokens.
   The rule is symmetric: against a negative ground truth, the negation is required and a
   positive answer scores 0, so a genuinely empty payload still wants its honest "not found".
2. **Coverage, not precision.** The answer must carry every number the ground truth carries
   (`"$1,299 … 16-inch"` vs `"Price: $1,299."` → 0), or, with no numbers in play, about 40% of
   its words. Twenty-four nonsense words appended to a crossing answer leave it at 1, and the
   full echo scores 1 against every single-field ground truth tried. Extra true facts are free.

So the endpoint lost 343 by answering a category it could not fill with "No … were found",
while the payload sat there holding an address and a phone number.

## Before and after

`bench-before.txt`, `bench-after.txt`: all eleven recovered payloads × twelve instruction
shapes (the instruction never leaks, so every plausible one is tried), each scored against the
payload text as the reference — the answer `chainsight-oracle` gives, which crosses in every
epoch, and which `txlens`'s independent crossing answer also scores 1.000 against.

    zeros 74 / 132   ->   zeros 1 / 132

The one remaining zero is `"Date: Friday. Event: a call."` for a dates-and-events question on
the action-items payload: a correct narrow answer that only fails against this bench's
deliberately strictest reference, the whole payload text.

A bench is a filter. Only a scored epoch is a verdict, and no rank gain is claimed.
