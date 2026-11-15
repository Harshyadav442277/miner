# Train a URL_SCAN candidate under the shared GPU lock. The lock is taken exclusively
# (waiting while another lane holds it) and removed in `finally`, only if this script created it.
param([string]$Run = 'URL_SCAN_v2', [string]$Pairs = 'urlscan_v2', [int]$Epochs = 2,
      [string]$Lr = '0.0001', [string]$EvalRoot = 'C:/Users/hyada/tg-eval')
$ErrorActionPreference = 'Stop'
$lock = Join-Path $EvalRoot 'GPU.lock'
while ($true) {   # wait for the shared lock; never touch another lane's lock
    try { $stream = [System.IO.File]::Open($lock, 'CreateNew', 'Write'); break }
    catch [System.IO.IOException] { Start-Sleep -Seconds 60 }
}
$bytes = [System.Text.Encoding]::UTF8.GetBytes("url_scan $((Get-Date).ToUniversalTime().ToString('s'))Z $Run training")
$stream.Write($bytes, 0, $bytes.Length); $stream.Close()
try {
    $python = Join-Path $EvalRoot '.venv/Scripts/python.exe'
    $log = Join-Path $EvalRoot "train_$($Run.ToLower()).log"
    $trainArgs = @('-m', 'float_runtime.train_adapter', '--intent', 'URL_SCAN',
              '--data', "../pairs/$Pairs/train.jsonl", '--val-data', "../pairs/$Pairs/val.jsonl",
              '--test-data', "../pairs/$Pairs/test.jsonl", '--base-model', '../base-node', '--out', "../runs-v2/$Run",
              '--max-length', '512', '--batch-size', '2', '--grad-accum', '8', '--eval-batch', '2',
              '--epochs', "$Epochs", '--lr', $Lr, '--seed', '42')
    @{ executable = $python; arguments = $trainArgs; cwd = (Join-Path $EvalRoot 'kit-v2'); log = $log;
       env = @{ HF_HOME = (Join-Path $EvalRoot 'hf'); HF_HUB_OFFLINE = '1' } } |
        ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $EvalRoot "runs-v2/$Run.command.json") -Encoding utf8
    $env:HF_HOME = Join-Path $EvalRoot 'hf'; $env:HF_HUB_OFFLINE = '1'; $env:PYTHONIOENCODING = 'utf-8'
    Set-Location -LiteralPath (Join-Path $EvalRoot 'kit-v2')
    & $python @trainArgs *> $log
    "exit $LASTEXITCODE" | Add-Content -LiteralPath $log
} finally {
    Remove-Item -LiteralPath $lock -Force
}
