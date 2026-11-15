# After train.ps1: tokenizer parity on every rendered text, export the safetensors delta for the
# pinned foundation at 384 tokens (CPU, no lock), then -- holding GPU.lock, because Stage 1 loads
# the 599 MB foundation and needs several GB of RAM -- adapterbuild Stage 1 with the live class
# (judgment, /engine/v1/intents/QUESTION_ANSWERING_GENERAL, 2026-11-15). Prints the package path
# and keccak256. Every command is recorded as <log>.command.json in evidence/<run>.
# No measurement on the holdout here (that is harness/measure.py), no upload, no registration.
# -DryRun prints the exact commands and checks every path; it runs nothing and takes no lock.
param([string]$Run = 'QUESTION_ANSWERING_v1', [string]$Pairs = 'question_answering_v1', [int]$MaxTokens = 384,
      [string]$EvalRoot = 'C:/Users/hyada/tg-eval', [switch]$FromStage1, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$py = Join-Path $EvalRoot '.venv/Scripts/python.exe'
$kit = Join-Path $EvalRoot 'kit-v2'
$runDir = Join-Path $EvalRoot "runs-v2/$Run"
$data = Join-Path $EvalRoot "pairs/$Pairs"
$ev = Join-Path $here "evidence/$($Run.ToLower())"
$pinned = Join-Path $EvalRoot 'foundation/tokenizer.json'
$foundation = Join-Path $EvalRoot 'foundation/foundation.json'
$onnx = Join-Path $EvalRoot 'foundation/foundation_lora_fp32.onnx'
$engine = Join-Path $EvalRoot 'foundation/foundation_engine.wasm'
$adapterbuild = Join-Path $EvalRoot 'bin-v2/adapterbuild-live.exe'
$parity = Join-Path $here '../security_review/check_tokenizer_parity.py'
$pkg = Join-Path $runDir 'QUESTION_ANSWERING.safetensors'
$lock = Join-Path $EvalRoot 'GPU.lock'

$steps = @(
    @{ name = 'tokenizer-parity'; cwd = $here; exe = $py; log = 'tokenizer-parity.txt'; args = @($parity,
        '--trained', (Join-Path $runDir 'adapter/tokenizer.json'), '--pinned', $pinned,
        '--pairs', "$data/train.jsonl", "$data/val.jsonl", "$data/test.jsonl", '--out', (Join-Path $ev 'tokenizer-parity.json')) },
    @{ name = 'export'; cwd = $kit; exe = $py; log = 'export.txt'; args = @('-m', 'float_runtime.export_adapter',
        '--adapter', (Join-Path $runDir 'adapter'), '--intent', 'QUESTION_ANSWERING', '--class', 'judgment',
        '--foundation', $foundation, '--max-tokens', "$MaxTokens", '--out', $pkg) },
    @{ name = 'stage1'; cwd = $kit; exe = $adapterbuild; log = 'stage1.txt'; lock = $true; args = @('lora',
        '--intent', 'QUESTION_ANSWERING', '--class', 'judgment', '--package', $pkg, '--out', $runDir,
        '--foundation', $foundation, '--foundation-onnx', $onnx, '--engine', $engine) }
)
if ($FromStage1) { $steps = @($steps[2]) }

if ($DryRun) {
    Write-Output "env: HF_HOME=$(Join-Path $EvalRoot 'hf') HF_HUB_OFFLINE=1 PYTHONIOENCODING=utf-8 LIVE_CLASS_INTENTS=QUESTION_ANSWERING"
    Write-Output "evidence: $ev"
    foreach ($s in $steps) {
        $line = ($s.args | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join ' '
        Write-Output "[$($s.name)] cwd $($s.cwd)$(if ($s.lock) { ' (holding GPU.lock)' })"
        Write-Output "  `"$($s.exe)`" $line"
    }
    Write-Output "between parity and export: copy $pinned over the trained tokenizer.json; after stage1: read keccak256 from $pkg.manifest.json"
    $tools = @($py, $kit, $pinned, $foundation, $onnx, $engine, $adapterbuild, $parity, "$data/train.jsonl", "$data/val.jsonl", "$data/test.jsonl")
    $bad = $tools | Where-Object { -not (Test-Path -LiteralPath $_) }
    $bad | ForEach-Object { Write-Output "MISSING: $_" }
    foreach ($p in @((Join-Path $runDir 'adapter/tokenizer.json'), $pkg)) {
        Write-Output "$(if (Test-Path -LiteralPath $p) { 'present' } else { 'not yet (made by train/export)' }): $p"
    }
    if ($bad) { exit 1 }
    Write-Output 'all tools and inputs present'
    exit 0
}

New-Item -ItemType Directory -Force $ev | Out-Null
$env:HF_HOME = Join-Path $EvalRoot 'hf'; $env:HF_HUB_OFFLINE = '1'; $env:PYTHONIOENCODING = 'utf-8'
$env:LIVE_CLASS_INTENTS = 'QUESTION_ANSWERING'

function Invoke-Step($s) {
    $log = Join-Path $ev $s.log
    @{ executable = $s.exe; arguments = $s.args; cwd = $s.cwd; at = (Get-Date).ToUniversalTime().ToString('s') + 'Z' } |
        ConvertTo-Json -Depth 4 | Set-Content -LiteralPath ($log + '.command.json') -Encoding utf8
    Set-Location -LiteralPath $s.cwd
    & $s.exe @($s.args) 2>&1 | Tee-Object -FilePath $log
    if ($LASTEXITCODE -ne 0) { throw "$($s.name) failed ($LASTEXITCODE)" }
}

foreach ($s in $steps) {
    if ($s.lock) {
        while ($true) {   # exclusive create; never deletes another lane's lock
            try { $h = [System.IO.File]::Open($lock, 'CreateNew', 'Write'); break }
            catch [System.IO.IOException] { Start-Sleep -Seconds 60 }
        }
        $b = [System.Text.Encoding]::UTF8.GetBytes("question_answering $((Get-Date).ToUniversalTime().ToString('s'))Z $Run stage1")
        $h.Write($b, 0, $b.Length); $h.Close()
        try { Invoke-Step $s } finally { Remove-Item -LiteralPath $lock -Force }
    } else {
        Invoke-Step $s
    }
    if ($s.name -eq 'tokenizer-parity') {   # the export refuses the HF-saved bytes; ids are proven equal above
        Copy-Item -LiteralPath $pinned -Destination (Join-Path $runDir 'adapter/tokenizer.json')
    }
}
Copy-Item -LiteralPath "$pkg.manifest.json" -Destination (Join-Path $ev 'package-manifest.json')
Copy-Item -LiteralPath (Join-Path $runDir 'result.json') -Destination (Join-Path $ev 'training-result.json')
$man = Get-Content -LiteralPath "$pkg.manifest.json" -Raw | ConvertFrom-Json
Write-Output "package: $pkg"
Write-Output "keccak256: $($man.keccak256)"
Write-Output 'Next: harness/measure.py on the frozen holdout, then harness/gate.py. Nothing hosted, signed or registered.'
