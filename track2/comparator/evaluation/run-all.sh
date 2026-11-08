#!/usr/bin/env bash
# One command, from anywhere:  bash track2/comparator/evaluation/run-all.sh
# Needs node >= 22, go >= 1.26 and network access (champion downloads and the live runnables).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here"

echo "== 1. regenerate the suite and check it is the frozen one"
node gen-suite.mjs
sha256sum -c suite.sha256

echo "== 2. download the three champions and check their keccak256 against the registry values"
champ="$(mktemp -d)"
declare -A want=(
  [FX_NOW]="ed923b8858a6d1a7900d3d5fd338a488cf7b6e4a c66c240d7a437b85b1232dfcf1e46af880916455ef628b881071f5610496fcc8"
  [CRYPTO_PRICE]="ac1fe9b242db06a0f51ae3812d0f6307352d1eef 23abf049db661d4a2ec5128c47c946ee4bb6575e0d29ba82effef1125183133c"
  [WEATHER_CHECK]="4574b4f6f751b230c5719fd461fcfed2805358cd f5dc2abdf7d855fdde81bf50433213cbb5bf47f9b39880aeecb4d2da96d9c80c"
)
cd ../verify
for fam in FX_NOW CRYPTO_PRICE WEATHER_CHECK; do
  read -r rev hash <<<"${want[$fam]}"
  curl -4 -sSf -m 30 -o "$champ/$fam.wasm" \
    "https://raw.githubusercontent.com/zkasuran/telegraph-catalog-miners/$rev/comparators/$fam-${hash:0:8}.wasm"
  got="$(go run . hash "$champ/$fam.wasm" | awk '{print $1}')"
  [ "$got" = "0x$hash" ] && echo "$fam champion keccak256 $got matches the registry" || { echo "$fam champion hash $got != 0x$hash"; exit 1; }
done

echo "== 3. node-runtime equivalence grid (234,848 cases) for ours and the champions"
for f in ../dist/FX_NOW.wasm ../dist/CRYPTO_PRICE.wasm ../dist/WEATHER_CHECK.wasm \
         "$champ/FX_NOW.wasm" "$champ/CRYPTO_PRICE.wasm" "$champ/WEATHER_CHECK.wasm"; do
  echo "$f: $(go run . "$f" | tr '\n' ' ')"
done

echo "== 4. adversarial suite: reference, ours, champions, mutants"
go run . suite ../evaluation/suite \
  "ours#267:FX_NOW=../dist/FX_NOW.wasm" "ours#268:CRYPTO_PRICE=../dist/CRYPTO_PRICE.wasm" "ours#269:WEATHER_CHECK=../dist/WEATHER_CHECK.wasm" \
  "champion#263:FX_NOW=$champ/FX_NOW.wasm" "champion#261:CRYPTO_PRICE=$champ/CRYPTO_PRICE.wasm" "champion#266:WEATHER_CHECK=$champ/WEATHER_CHECK.wasm"

echo "== 5. live runnables and hosted bytes"
node "$here/live-check-all.mjs"
