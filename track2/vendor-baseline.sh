#!/usr/bin/env bash
# Restore the untracked upstream files for track2/scorer-v2 from the pinned
# MIT baseline commit. Idempotent.
set -euo pipefail

COMMIT=dfa0cf7fda72789267811ba2190f61a8eaacedf6
REPO=https://github.com/telegraphprotocol/telegraph-wasm-baseline.git
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HERE/scorer-v2"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --quiet "$REPO" "$TMP/baseline"
git -C "$TMP/baseline" checkout --quiet "$COMMIT"

mkdir -p "$DEST/weights"
cp "$TMP/baseline/weights/minilm_l6_v2_q8.bin" "$DEST/weights/"
cp "$TMP/baseline/vocab.txt" "$DEST/"

echo "restored weights/ and vocab.txt from $COMMIT"
sha256sum "$DEST/weights/minilm_l6_v2_q8.bin" "$DEST/vocab.txt"
