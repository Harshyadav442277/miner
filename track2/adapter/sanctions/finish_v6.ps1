param([string]$EvalRoot = 'C:/Users/hyada/tg-eval')
$ErrorActionPreference = 'Stop'
$taskWorktree = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$evalPython = Join-Path $EvalRoot '.venv/Scripts/python.exe'
$evalRun = Join-Path $EvalRoot 'runs-v2/SANCTIONS_SCREENING_MATCH_v6'
$evidence = Join-Path $PSScriptRoot 'evidence/2026-11-01-miners-r1'
$fresh = Join-Path $PSScriptRoot 'evidence/2026-11-01-miners-fresh'
$controls = Join-Path $PSScriptRoot 'evidence/2026-11-01-wrong-query-controls'

function Invoke-Recorded {
    param([string]$Executable, [string[]]$CommandArgs, [string]$LogPath)
    @{ executable=$Executable; arguments=$CommandArgs; cwd=(Get-Location).Path } |
        ConvertTo-Json -Depth 5 | Set-Content -LiteralPath ($LogPath + '.command.json') -Encoding utf8
    & $Executable @CommandArgs 2>&1 | Tee-Object -FilePath $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Command failed with exit ${LASTEXITCODE}: $Executable" }
}

# Serialize CPU foundation workers after the known training process exits.
while (Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'python.exe' -and $_.CommandLine -like '*-m float_runtime.train_adapter*' -and
    $_.CommandLine -like '*SANCTIONS_SCREENING_MATCH_v6*'
}) { Start-Sleep -Seconds 5 }
if (!(Test-Path -LiteralPath (Join-Path $evalRun 'result.json'))) {
    throw 'Training ended without result.json; inspect train_sanctions_v6.log'
}

$env:HF_HOME = Join-Path $EvalRoot 'hf'
$env:HF_HUB_OFFLINE = '1'
$env:LIVE_CLASS_INTENTS = 'SANCTIONS_SCREENING_MATCH'
Copy-Item -LiteralPath (Join-Path $EvalRoot 'foundation/tokenizer.json') `
    -Destination (Join-Path $evalRun 'adapter/tokenizer.json')
Set-Location -LiteralPath (Join-Path $EvalRoot 'kit-v2')
$package = Join-Path $evalRun 'SANCTIONS_SCREENING_MATCH.safetensors'
Invoke-Recorded $evalPython @('-m','float_runtime.export_adapter','--adapter',(Join-Path $evalRun 'adapter'),
    '--intent','SANCTIONS_SCREENING_MATCH','--class','judgment','--foundation',
    (Join-Path $EvalRoot 'foundation/foundation.json'),'--max-tokens','256','--out',$package) `
    (Join-Path $evidence 'v6-export-output.txt')
Invoke-Recorded (Join-Path $EvalRoot 'bin-v2/adapterbuild-live.exe') @('lora','--intent',
    'SANCTIONS_SCREENING_MATCH','--package',$package,'--out',$evalRun,'--foundation',
    (Join-Path $EvalRoot 'foundation/foundation.json'),'--foundation-onnx',
    (Join-Path $EvalRoot 'foundation/foundation_lora_fp32.onnx'),'--engine',
    (Join-Path $EvalRoot 'foundation/foundation_engine.wasm')) (Join-Path $evidence 'v6-stage1-output.txt')

Set-Location -LiteralPath $taskWorktree
Invoke-Recorded $evalPython @('track2/adapter/sanctions/measure_miners.py',$evidence,
    '--home',$EvalRoot,'--versions','6') (Join-Path $evidence 'measure-v6-command-output.txt')
Invoke-Recorded $evalPython @('track2/adapter/sanctions/label_miners.py',$fresh) `
    (Join-Path $fresh 'label-command-output.txt')
Invoke-Recorded $evalPython @('track2/adapter/sanctions/measure_miners.py',$fresh,
    '--home',$EvalRoot,'--versions','3,6') (Join-Path $fresh 'measure-command-output.txt')
if (!(Test-Path -LiteralPath (Join-Path $controls 'pairs.jsonl'))) {
    Invoke-Recorded $evalPython @('track2/adapter/sanctions/build_controls.py',$fresh,'--out',$controls) `
        (Join-Path $fresh 'controls-build-output.txt')
}
Invoke-Recorded $evalPython @('track2/adapter/sanctions/measure_miners.py',$controls,
    '--home',$EvalRoot,'--versions','6') (Join-Path $controls 'measure-command-output.txt')
foreach ($folder in @($evidence,$fresh,$controls)) {
    Invoke-Recorded $evalPython @('track2/adapter/sanctions/verify_evidence.py',$folder) `
        (Join-Path $folder 'verify-command-output.txt')
}
Copy-Item -LiteralPath (Join-Path $evalRun 'result.json') -Destination (Join-Path $evidence 'v6-training-result.json')
Copy-Item -LiteralPath (Join-Path $EvalRoot 'train_sanctions_v6.log') -Destination (Join-Path $evidence 'v6-training-log.txt')
Write-Output 'V6 export, Stage 1, development/fresh/control node measurements and offline verification complete.'
Write-Output 'No tunnel, wallet, registration, pool upload or message action performed.'
