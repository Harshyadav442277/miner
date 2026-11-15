"""Find which failure kinds a prompt-blind bag-of-words probe can solve.

Runs the kit's own surface probe (train_adapter._surface_probe_acc) on the whole file, on
each kind alone and with each kind left out, plus the top label-skewed words.

    python probe_tells.py <kit-v2 dir> <pairs.jsonl>
"""
import json
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, sys.argv[1])
from float_runtime.train_adapter import _surface_probe_acc  # noqa: E402

rows = [json.loads(l) for l in open(sys.argv[2], encoding="utf-8")]
by = defaultdict(list)
for r in rows:
    by[r["kind"]].append(r)
out = {"all": round(_surface_probe_acc(rows, 42, 0.2), 3)}
for k, v in sorted(by.items()):
    out[k] = {"alone": round(_surface_probe_acc(v, 42, 0.2), 3),
              "without": round(_surface_probe_acc([r for r in rows if r["kind"] != k], 42, 0.2), 3),
              "longer_is_chosen": round(sum(len(r["chosen"]) > len(r["rejected"]) for r in v) / len(v), 3)}
tok = re.compile(r"[a-z0-9']+")
dc, dr = Counter(), Counter()
for r in rows:
    dc.update(set(tok.findall(r["chosen"].lower())))
    dr.update(set(tok.findall(r["rejected"].lower())))
diff = sorted((dc[w] - dr[w], w) for w in set(dc) | set(dr))
out["rejected_words"], out["chosen_words"] = diff[:12], diff[-12:]
print(json.dumps(out, indent=1))
