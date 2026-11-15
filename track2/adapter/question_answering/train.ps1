# Train a QUESTION_ANSWERING candidate with the kit, holding the shared GPU.lock.
# Do not run until the evaluation holdout is frozen (ARCHITECTURE A7). The lock is created
# exclusively (waiting while another lane holds it) and removed in `finally`, only by this script.
# Defaults: rank 8 / alpha 32. Variant: -Rank 16 -Alpha 64 -Run QUESTION_ANSWERING_v1_r16.
# A failed audit.json blocks training unless -AllowAuditFail is passed (an owner decision).
# -DryRun prints the exact command and checks every input path; it trains nothing and takes no lock.
param([string]$Run = 'QUESTION_ANSWERING_v1', [string]$Pairs = 'question_answering_v1',
      [int]$Rank = 8, [int]$Alpha = 32, [int]$Epochs = 3, [string]$Lr = '0.0001', [int]$Seed = 42,
      [int]$MaxLength = 384, [int]$BatchSize = 2, [int]$GradAccum = 8, [int]$EvalBatch = 2,
      [string]$EvalRoot = 'C:/Users/hyada/tg-eval', [switch]$AllowAuditFail, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$python = Join-Path $EvalRoot '.venv/Scripts/python.exe'
$kit = Join-Path $EvalRoot 'kit-v2'
$data = Join-Path $EvalRoot "pairs/$Pairs"
$out = Join-Path $EvalRoot "runs-v2/$Run"
$log = Join-Path $EvalRoot "train_$($Run.ToLower()).log"
$lock = Join-Path $EvalRoot 'GPU.lock'
# Batch 2 x accumulation 8 at 512 tokens fitted the 4 GB RTX 3050 in the URL_SCAN lane; 384 is smaller.
$trainArgs = @('-m', 'float_runtime.train_adapter', '--intent', 'QUESTION_ANSWERING',
    '--data', "$data/train.jsonl", '--val-data', "$data/val.jsonl", '--test-data', "$data/test.jsonl",
    '--base-model', (Join-Path $EvalRoot 'base-node'), '--out', $out,
    '--max-length', "$MaxLength", '--batch-size', "$BatchSize", '--grad-accum', "$GradAccum", '--eval-batch', "$EvalBatch",
    '--lora-rank', "$Rank", '--lora-alpha', "$Alpha", '--epochs', "$Epochs", '--lr', $Lr, '--seed', "$Seed")

$missing = @($python, $kit, "$data/train.jsonl", "$data/val.jsonl", "$data/test.jsonl", "$data/audit.json",
             (Join-Path $EvalRoot 'base-node')) | Where-Object { -not (Test-Path -LiteralPath $_) }
$audit = if (Test-Path -LiteralPath "$data/audit.json") { (Get-Content -LiteralPath "$data/audit.json" -Raw | ConvertFrom-Json).verdict } else { 'missing' }
if ($DryRun) {
    Write-Output "cwd: $kit"
    Write-Output "env: HF_HOME=$(Join-Path $EvalRoot 'hf') HF_HUB_OFFLINE=1 PYTHONIOENCODING=utf-8"
    Write-Output "lock: $lock (exclusive create, wait 60 s while held)"
    Write-Output ("command: `"$python`" " + (($trainArgs | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join ' '))
    Write-Output "log: $log"
    Write-Output "audit verdict: $audit"
    if ($missing) { $missing | ForEach-Object { Write-Output "MISSING: $_" }; exit 1 }
    Write-Output 'all inputs present'
    exit 0
}
if ($missing) { throw "missing inputs: $($missing -join ', ')" }
if ($audit -ne 'PASS' -and -not $AllowAuditFail) { throw "audit.json verdict is $audit; fix the data (or record why) before training" }

while ($true) {   # wait for the shared lock; never touch another lane's lock
    try { $stream = [System.IO.File]::Open($lock, 'CreateNew', 'Write'); break }
    catch [System.IO.IOException] { Start-Sleep -Seconds 60 }
}
$bytes = [System.Text.Encoding]::UTF8.GetBytes("question_answering $((Get-Date).ToUniversalTime().ToString('s'))Z $Run training")
$stream.Write($bytes, 0, $bytes.Length); $stream.Close()
try {
    New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
    @{ executable = $python; arguments = $trainArgs; cwd = $kit; log = $log;
       env = @{ HF_HOME = (Join-Path $EvalRoot 'hf'); HF_HUB_OFFLINE = '1' } } |
        ConvertTo-Json -Depth 4 | Set-Content -LiteralPath "$out.command.json" -Encoding utf8
    $env:HF_HOME = Join-Path $EvalRoot 'hf'; $env:HF_HUB_OFFLINE = '1'; $env:PYTHONIOENCODING = 'utf-8'
    Set-Location -LiteralPath $kit
    & $python @trainArgs *> $log
    "exit $LASTEXITCODE" | Add-Content -LiteralPath $log
} finally {
    Remove-Item -LiteralPath $lock -Force
}
# The kit exits non-zero after a PASS too (NameError in its closing hint), so read result.json.
$verdict = (Get-Content -LiteralPath (Join-Path $out 'result.json') -Raw | ConvertFrom-Json).verdict
Write-Output "training verdict: $verdict (result.json in $out)"
