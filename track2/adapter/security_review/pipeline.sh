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

# FROM=export resumes after a finished training run. The kit exits non-zero after a PASS too
# (NameError 'pkg' in its closing hint, kit-v2 train_adapter.py:838), so read result.json.
if [ "${FROM:-train}" = train ]; then
  $REC "$EV/train-output.txt" --cwd $HOME_/kit-v2 $ENVS -- $PY -m float_runtime.train_adapter \
    --intent SECURITY_REVIEW --data "$PAIRS/train.jsonl" --val-data "$PAIRS/val.jsonl" --out "$RUN" \
    --max-length 512 --batch-size 2 --grad-accum 8 --eval-batch 2 "$@" || echo "train exit $?"
fi
cp "$RUN/result.json" "$EV/train-result.json"
grep -q '"verdict": "PASS"' "$EV/train-result.json"
if [ "${FROM:-train}" = train ] || [ "$FROM" = export ]; then

# The HF-saved tokenizer.json differs in bytes from the pinned one (the export refuses it);
# prove token identity on every rendered text, then export against the pinned file.
$REC "$EV/tokenizer-parity-output.txt" -- $PY "$HERE/check_tokenizer_parity.py" --trained "$RUN/adapter/tokenizer.json" \
  --pinned $HOME_/foundation/tokenizer.json --pairs "$PAIRS/train.jsonl" "$PAIRS/val.jsonl" \
  $HOME_/pairs/security_review_v1/holdout.jsonl $HOME_/pairs/security_review_oot_v1/oot.jsonl --out "$EV/tokenizer-parity.json"
grep -q '"pass": true' "$EV/tokenizer-parity.json"
cp $HOME_/foundation/tokenizer.json "$RUN/adapter/tokenizer.json"

$REC "$EV/export-output.txt" --cwd $HOME_/kit-v2 $ENVS -- $PY -m float_runtime.export_adapter \
  --adapter "$RUN/adapter" --intent SECURITY_REVIEW --class judgment --foundation $HOME_/foundation/foundation.json --out "$PKG"
fi  # FROM=stage1 resumes here

$REC "$EV/stage1-output.txt" --env LIVE_CLASS_INTENTS=SECURITY_REVIEW -- $HOME_/bin-v2/adapterbuild-live.exe lora \
  --intent SECURITY_REVIEW --class judgment --package "$PKG" --out "$RUN" --foundation $HOME_/foundation/foundation.json \
  --foundation-onnx $HOME_/foundation/foundation_lora_fp32.onnx --engine $HOME_/foundation/foundation_engine.wasm
cp "$PKG.manifest.json" "$EV/package-manifest.json"

$REC "$EV/measure-output.txt" -- $PY "$HERE/measure_node.py" --home $HOME_ \
  --package "$VER=$PKG" ${EXTRA_PACKAGES:-} \
  --pairs "holdout=$HOME_/pairs/security_review_v1/holdout.jsonl" \
  --pairs "oot=$HOME_/pairs/security_review_oot_v1/oot.jsonl" --out "$EV/node-scores.json" --workers 4

mkdir -p "$EV/bitcheck"
$REC "$EV/bit-equality-output.txt" -- $PY "$HERE/bit_equality.py" --home $HOME_ --package "$PKG" \
  --scores "$EV/node-scores.json" --name "$VER" --pairs $HOME_/pairs/security_review_v1/holdout.jsonl \
  --n 4 --out "$EV/bit-equality.json"
