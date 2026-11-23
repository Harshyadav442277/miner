#!/bin/bash
# Assemble the Hugging Face Space repository from this folder and track2/adapter, into $1.
#   bash track2/executor/make_space.sh <space checkout>
# Then commit and push that checkout; the Space rebuilds from it.
set -eu
out=${1:?usage: make_space.sh <space checkout>}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
cp "$here/Dockerfile" "$here/start.sh" "$here/adapters.txt" "$here/README.md" "$out/"
cp "$here/../adapter/fanout_exec.py" "$here/../adapter/check_executor.py" "$out/"
# Hugging Face builds on Linux: keep LF line endings whatever this checkout uses.
for f in "$out"/Dockerfile "$out"/start.sh "$out"/adapters.txt "$out"/*.py "$out"/README.md; do
  sed -i 's/\r$//' "$f"
done
grep -v '^#' "$out/adapters.txt" | grep -q . || echo "warning: adapters.txt lists no adapter; the Space will not start" >&2
echo "assembled in $out"
