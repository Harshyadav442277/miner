# After train_v2.ps1: tokenizer parity, hybrid export at 512 tokens, Stage 1 with the live-class
# adapterbuild, then node-runtime measurement of GENERIC 900005 (once) and the candidate on H1,
# the 16-pair probe and H2, under an exclusive GPU.lock. Every command is recorded as
# <log>.command.json next to its output. No tunnel, wallet, registration or upload.
param([string]$Run = 'URL_SCAN_v2', [string]$Pairs = 'urlscan_v2', [string]$EvalRoot = 'C:/Users/hyada/tg-eval')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$py = Join-Path $EvalRoot '.venv/Scripts/python.exe'
$runDir = Join-Path $EvalRoot "runs-v2/$Run"
$ev = Join-Path $here "evidence/$($Run.ToLower())"
$genericEv = Join-Path $here 'evidence/generic-900005'
New-Item -ItemType Directory -Force $ev | Out-Null
$env:HF_HOME = Join-Path $EvalRoot 'hf'; $env:HF_HUB_OFFLINE = '1'; $env:PYTHONIOENCODING = 'utf-8'

function Invoke-Recorded([string]$Exe, [string[]]$CommandArgs, [string]$Log) {
    @{ executable = $Exe; arguments = $CommandArgs; cwd = (Get-Location).Path;
       at = (Get-Date).ToUniversalTime().ToString('s') + 'Z' } |
        ConvertTo-Json -Depth 4 | Set-Content -LiteralPath ($Log + '.command.json') -Encoding utf8
    & $Exe @CommandArgs 2>&1 | Tee-Object -FilePath $Log
    if ($LASTEXITCODE -ne 0) { throw "failed ($LASTEXITCODE): $Exe" }
}

function With-Lock([scriptblock]$Body) {
    $lock = Join-Path $EvalRoot 'GPU.lock'
    $s = [System.IO.File]::Open($lock, 'CreateNew', 'Write')
    $b = [System.Text.Encoding]::UTF8.GetBytes("url_scan $((Get-Date).ToUniversalTime().ToString('s'))Z $Run node measurement")
    $s.Write($b, 0, $b.Length); $s.Close()
    try { & $Body } finally { Remove-Item -LiteralPath $lock -Force }
}

$data = Join-Path $EvalRoot "pairs/$Pairs"
$h1 = Join-Path $data 'holdout.jsonl'
$probe = Join-Path $EvalRoot 'pairs/urlscan_probe16.jsonl'
$h2 = Join-Path $EvalRoot 'urlscan-h2-r1/pairs.jsonl'
$pinned = Join-Path $EvalRoot 'foundation/tokenizer.json'
$foundation = Join-Path $EvalRoot 'foundation/foundation.json'

Set-Location -LiteralPath $here
Invoke-Recorded $py @('check_tokenizer_parity.py', '--trained', (Join-Path $runDir 'adapter/tokenizer.json'), '--pinned', $pinned,
    '--pairs', "$data/train.jsonl", "$data/val.jsonl", "$data/test.jsonl", $h1, $probe, $h2,
    '--out', (Join-Path $ev 'tokenizer-parity.json')) (Join-Path $ev 'tokenizer-parity.txt')
Copy-Item -LiteralPath $pinned -Destination (Join-Path $runDir 'adapter/tokenizer.json')

$pkg = Join-Path $runDir 'URL_SCAN.safetensors'
Set-Location -LiteralPath (Join-Path $EvalRoot 'kit-v2')
Invoke-Recorded $py @('-m', 'float_runtime.export_adapter', '--adapter', (Join-Path $runDir 'adapter'), '--intent', 'URL_SCAN',
    '--class', 'hybrid', '--foundation', $foundation, '--max-tokens', '512', '--out', $pkg) (Join-Path $ev 'export.txt')
Invoke-Recorded (Join-Path $EvalRoot 'bin-v2/adapterbuild-urlscan.exe') @('lora', '--intent', 'URL_SCAN', '--package', $pkg,
    '--out', $runDir, '--foundation', $foundation, '--foundation-onnx', (Join-Path $EvalRoot 'foundation/foundation_lora_fp32.onnx'),
    '--engine', (Join-Path $EvalRoot 'foundation/foundation_engine.wasm')) (Join-Path $ev 'stage1.txt')
$stage1 = (Get-Content -LiteralPath (Join-Path $ev 'stage1.txt') | Where-Object { $_ -like '{*' } | Select-Object -Last 1) | ConvertFrom-Json
Copy-Item -LiteralPath "$pkg.manifest.json" -Destination (Join-Path $ev 'package-manifest.json')
Copy-Item -LiteralPath (Join-Path $runDir 'result.json') -Destination (Join-Path $ev 'training-result.json')
Copy-Item -LiteralPath (Join-Path $EvalRoot "train_$($Run.ToLower()).log") -Destination (Join-Path $ev 'training-log.txt')

Set-Location -LiteralPath $here
$sets = @('--pairs', "h1=$h1", '--pairs', "probe=$probe", '--pairs', "h2=$h2")
With-Lock {
    if (!(Test-Path -LiteralPath (Join-Path $genericEv 'generic-scores.json'))) {
        New-Item -ItemType Directory -Force $genericEv | Out-Null
        Invoke-Recorded $py (@('measure_v2.py') + $sets + @('--package',
            "generic=$EvalRoot/dl/generic_900005/adapter-GENERIC-dc4f8bd55442.safetensors=dc4f8bd55442407c9a7cc29b892d22ad136e326e07e21d37ed7e0f94adc2e2b1",
            '--out', $genericEv)) (Join-Path $genericEv 'measure.txt')
    }
    Invoke-Recorded $py (@('measure_v2.py') + $sets + @('--package', "candidate=$pkg=$($stage1.keccak256)", '--out', $ev)) (Join-Path $ev 'measure.txt')
}
Copy-Item -LiteralPath (Join-Path $genericEv 'generic-scores.json') -Destination (Join-Path $ev 'generic-scores.json')
Invoke-Recorded $py (@('report_v2.py', '--measure', $ev, '--train', "$data/train.jsonl") + $sets) (Join-Path $ev 'report.md')
$bits = (Get-Content -LiteralPath (Join-Path $ev 'candidate-scores.json') -Raw | ConvertFrom-Json).verify_input_bits
"adapterbuild score_hex $($stage1.score_hex) / adapterexec verify-input bits $bits / equal: $($stage1.score_hex -eq $bits)" |
    Tee-Object -FilePath (Join-Path $ev 'bit-equality.txt')
Write-Output 'Export, Stage 1, node measurement and report complete. No tunnel, wallet, registration or upload.'
