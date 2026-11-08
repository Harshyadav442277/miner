#!/usr/bin/env bash
# Train -> export -> Stage 1 + node score -> node measurement for one SECURITY_REVIEW version.
# Run under with_gpu_lock.sh. Every step leaves <log> and <log>.command.json in evidence/<ver>.
#   bash pipeline.sh v1 security_review_v1 [extra train flags...]
set -eu
VER=$1; DATA=$2; shift 2
HOME_=C:/Users/hyada/tg-eval
PY=$HOME_/.venv/Scripts/python.exe
HERE=$(cd "$(dirname "$0")" && pwd)
EV=$HERE/evidence/$VER
RUN=$HOME_/runs-v2/SECURITY_REVIEW_$VER
PAIRS=$HOME_/pairs/$DATA
PKG=$RUN/SECURITY_REVIEW.safetensors
mkdir -p "$EV"
REC="$PY $HERE/record.py"
ENVS="--env HF_HOME=$HOME_/hf --env HF_HUB_OFFLINE=1"

$REC "$EV/train-output.txt" --cwd $HOME_/kit-v2 $ENVS -- $PY -m float_runtime.train_adapter \
  --intent SECURITY_REVIEW --data "$PAIRS/train.jsonl" --val-data "$PAIRS/val.jsonl" --out "$RUN" \
  --max-length 512 --batch-size 2 --grad-accum 8 --eval-batch 2 "$@" || echo "train exit $? (gate FAIL still exports)"
cp "$RUN/result.json" "$EV/train-result.json"

$REC "$EV/export-output.txt" --cwd $HOME_/kit-v2 $ENVS -- $PY -m float_runtime.export_adapter \
  --run "$RUN" --intent SECURITY_REVIEW --class judgment --foundation $HOME_/foundation/foundation.json --out "$PKG"

$REC "$EV/stage1-output.txt" --env LIVE_CLASS_INTENTS=SECURITY_REVIEW -- $HOME_/bin-v2/adapterbuild-live.exe lora \
  --intent SECURITY_REVIEW --class judgment --package "$PKG" --out "$RUN" --foundation $HOME_/foundation/foundation.json \
  --foundation-onnx $HOME_/foundation/foundation_lora_fp32.onnx --engine $HOME_/foundation/foundation_engine.wasm
cp "$PKG.manifest.json" "$EV/package-manifest.json"

$REC "$EV/measure-output.txt" -- $PY "$HERE/measure_node.py" --home $HOME_ \
  --package "$VER=$PKG" ${EXTRA_PACKAGES:-} \
  --pairs "holdout=$HOME_/pairs/security_review_v1/holdout.jsonl" \
  --pairs "oot=$HOME_/pairs/security_review_oot_v1/oot.jsonl" --out "$EV/node-scores.json" --workers 4
