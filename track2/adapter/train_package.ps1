# Train, export and Stage-1-check one adapter lane with the kit, for any judgment family.
#   pwsh -File train_package.ps1 -Intent CONTRACT_OBLIGATION_AUDIT -Run coa_v1 -Pairs coa_v1
# Waits until the GPU is free: our GPU.lock is not held AND no other job holds more than -FreeMiB of
# GPU memory (jobs outside this repo do not use the lock). Progress goes to runs-v2/<Run>/chain.log.
# The kit exits non-zero after a PASS (NameError in its closing hint), so the verdict is read from result.json.
# Nothing is hosted, signed or registered here.
param([Parameter(Mandatory)][string]$Intent, [Parameter(Mandatory)][string]$Run, [Parameter(Mandatory)][string]$Pairs,
      [int]$Rank = 8, [int]$Alpha = 32, [int]$Epochs = 3, [string]$Lr = '0.0001', [int]$MaxLength = 512,
      [int]$BatchSize = 2, [int]$GradAccum = 8, [int]$FreeMiB = 600, [string]$EvalRoot = 'C:/Users/hyada/tg-eval')
$ErrorActionPreference = 'Stop'
$py = Join-Path $EvalRoot '.venv/Scripts/python.exe'
$kit = Join-Path $EvalRoot 'kit-v2'
$data = Join-Path $EvalRoot "pairs/$Pairs"
$out = Join-Path $EvalRoot "runs-v2/$Run"
$pkg = Join-Path $out "$Intent.safetensors"
$f = Join-Path $EvalRoot 'foundation'
$lock = Join-Path $EvalRoot 'GPU.lock'
New-Item -ItemType Directory -Force $out | Out-Null
function Log($m) { "$((Get-Date).ToUniversalTime().ToString('s'))Z $m" | Add-Content (Join-Path $out 'chain.log') }

Log "waiting for the GPU (lock free, other jobs under $FreeMiB MiB)"
while ($true) {
    $used = [int](nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits)
    if ($used -lt $FreeMiB) {
        try { $h = [System.IO.File]::Open($lock, 'CreateNew', 'Write'); break } catch [System.IO.IOException] { }
    }
    Start-Sleep -Seconds 120
}
$b = [System.Text.Encoding]::UTF8.GetBytes("$Intent $((Get-Date).ToUniversalTime().ToString('s'))Z $Run train+stage1")
$h.Write($b, 0, $b.Length); $h.Close()
$env:HF_HOME = Join-Path $EvalRoot 'hf'; $env:HF_HUB_OFFLINE = '1'; $env:PYTHONIOENCODING = 'utf-8'
$env:LIVE_CLASS_INTENTS = $Intent
try {
    Set-Location -LiteralPath $kit
    Log 'train start'
    & $py -m float_runtime.train_adapter --intent $Intent --data "$data/train.jsonl" --val-data "$data/val.jsonl" `
        --test-data "$data/test.jsonl" --base-model (Join-Path $EvalRoot 'base-node') --out $out `
        --max-length $MaxLength --batch-size $BatchSize --grad-accum $GradAccum --eval-batch 2 `
        --lora-rank $Rank --lora-alpha $Alpha --epochs $Epochs --lr $Lr *> (Join-Path $out 'train.log')
    $verdict = (Get-Content -LiteralPath (Join-Path $out 'result.json') -Raw | ConvertFrom-Json).verdict
    Log "train exit $LASTEXITCODE, verdict $verdict"
    # The export refuses Hugging Face's re-saved tokenizer bytes; the pinned file gives the same ids.
    Copy-Item -LiteralPath (Join-Path $f 'tokenizer.json') -Destination (Join-Path $out 'adapter/tokenizer.json')
    & $py -m float_runtime.export_adapter --adapter (Join-Path $out 'adapter') --intent $Intent --class judgment `
        --foundation (Join-Path $f 'foundation.json') --max-tokens $MaxLength --out $pkg *> (Join-Path $out 'export.log')
    Log "export exit $LASTEXITCODE"
    & (Join-Path $EvalRoot 'bin-v2/adapterbuild-live.exe') lora --intent $Intent --class judgment --package $pkg `
        --out $out --foundation (Join-Path $f 'foundation.json') --foundation-onnx (Join-Path $f 'foundation_lora_fp32.onnx') `
        --engine (Join-Path $f 'foundation_engine.wasm') *> (Join-Path $out 'stage1.log')
    Log "stage1 exit $LASTEXITCODE"
} finally {
    Remove-Item -LiteralPath $lock -Force
    Log 'chain end'
}
