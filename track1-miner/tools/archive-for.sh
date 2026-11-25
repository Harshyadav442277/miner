#!/usr/bin/env bash
# Runs archive-requests.mjs every 10 minutes for <minutes>, reading the last 20 minutes each time (the first pass
# reads 60, to cover the gap since the previous runner). Used by .github/workflows/requests.yml.
#   usage: archive-for.sh <minutes> <out.jsonl> [first-lookback-minutes]
set -u
end=$((SECONDS + $1 * 60))
lookback=${3:-20}
here=$(dirname "$0")
while [ "$SECONDS" -lt "$end" ]; do
  MINUTES=$lookback node --no-deprecation "$here/archive-requests.mjs" "$2" || echo "archive pass failed; trying again in 10 minutes"
  lookback=20
  left=$((end - SECONDS))
  [ "$left" -le 0 ] && break
  sleep $((left < 600 ? left : 600))
done
