#!/usr/bin/env bash
# Wait for the shared GPU/node lock, take it exclusively, run the command, release it.
#   bash with_gpu_lock.sh <tag> -- <command ...>
# Never deletes a lock this script did not create.
set -u
LOCK=C:/Users/hyada/tg-eval/GPU.lock
TAG=$1; shift; [ "$1" = "--" ] && shift
while true; do
  if ( set -o noclobber; echo "security_review $TAG $(date -u +%FT%TZ)" > "$LOCK" ) 2>/dev/null; then break; fi
  sleep 60
done
echo "lock taken $(date -u +%FT%TZ)"
"$@"; rc=$?
grep -q "^security_review $TAG " "$LOCK" && rm -f "$LOCK"
echo "lock released $(date -u +%FT%TZ) rc=$rc"
exit $rc
