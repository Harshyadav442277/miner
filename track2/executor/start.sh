#!/bin/bash
# Start WORKERS_PER_ADAPTER adapterexec workers for every package in adapters.txt, then the
# fan-out on the Space's port. A worker that exits takes the container down, so the Space restarts
# instead of answering with fewer workers than it reports.
set -eu
port=8081
routes=""
for pkg in /app/packages/*.safetensors; do
  [ -e "$pkg" ] || { echo "no packages in adapters.txt" >&2; exit 1; }
  family=$(basename "$pkg" .safetensors)
  urls=""
  i=0
  while [ "$i" -lt "$WORKERS_PER_ADAPTER" ]; do
    adapterexec -package "$pkg" -listen "127.0.0.1:$port" &
    urls="${urls:+$urls,}http://127.0.0.1:$port/"
    port=$((port + 1))
    i=$((i + 1))
  done
  routes="$routes --route $family=$urls"
done
# The batch log keeps sizes, timing and identity per request (see fanout_exec.py).
# shellcheck disable=SC2086
python /app/fanout_exec.py --listen 0.0.0.0:7860 --log /tmp/batches.jsonl $routes &
wait -n
exit 1
