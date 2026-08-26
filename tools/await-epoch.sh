#!/usr/bin/env bash
# Blocks until a new epoch scores our miner, then records it and exits.
#
# Epochs are 9 hours, so polling by hand is pointless and stopping entirely means
# the first live evidence of today's fixes sits unexamined until someone notices.
# This waits, records, and prints the comparison the moment it lands.
set -u
START_EPOCH="${1:-284}"
NODE_API="https://devnode.telegraphprotocol.com"

while true; do
  latest=$(curl -s --max-time 25 "$NODE_API/api/miners" \
    | python -c "
import json,sys,io
try:
    d=json.load(io.open(sys.stdin.fileno(),encoding='utf-8'))
except Exception:
    print(0); raise SystemExit
ms = d if isinstance(d,list) else (d.get('miners') or d.get('data') or [])
m=[x for x in ms if x.get('slug')=='livecert']
eps=[s['epoch_id'] for s in (m[0].get('scores') or [])] if m else []
print(max(eps) if eps else 0)
" 2>/dev/null)

  if [ -n "${latest:-}" ] && [ "$latest" -gt "$START_EPOCH" ] 2>/dev/null; then
    echo "NEW EPOCH SCORED: $latest"
    node tools/record-scores.mjs
    exit 0
  fi
  sleep 600
done
