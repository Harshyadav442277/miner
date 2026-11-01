param([string]$EvalRoot='C:/Users/hyada/tg-eval')
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$evalPython=Join-Path $EvalRoot '.venv/Scripts/python.exe'
$evalRun=Join-Path $EvalRoot 'runs-v2/SANCTIONS_SCREENING_MATCH_v7'
$plan=Join-Path $PSScriptRoot 'evidence/v7-plan'
Set-Location -LiteralPath $taskRepo
function Invoke-Logged {
    param([string]$Program,[string[]]$CommandArgs,[string]$LogPath)
    @{program=$Program; arguments=$CommandArgs; cwd=(Get-Location).Path} |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath ($LogPath+'.command.json') -Encoding utf8
    & $Program @CommandArgs 2>&1 | Tee-Object -FilePath $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Program ($LASTEXITCODE)" }
}
while (Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'python.exe' -and $_.CommandLine -like '*train_v7.py*'
}) { Start-Sleep -Seconds 5 }
if (!(Test-Path -LiteralPath (Join-Path $evalRun 'result.json'))) { throw 'No completed v7 result' }
$env:HF_HOME=Join-Path $EvalRoot 'hf'
$env:HF_HUB_OFFLINE='1'
$env:LIVE_CLASS_INTENTS='SANCTIONS_SCREENING_MATCH'
Invoke-Logged $evalPython @('track2/adapter/sanctions/check_tokenizer_parity.py','--trained',
    (Join-Path $evalRun 'adapter/tokenizer.json'),'--pinned',(Join-Path $EvalRoot 'foundation/tokenizer.json'),
    '--pairs',(Join-Path $EvalRoot 'pairs/sanctions_v7_binding/train.jsonl'),
    (Join-Path $EvalRoot 'pairs/sanctions_v7_binding/val.jsonl'),
    (Join-Path $EvalRoot 'pairs/sanctions_v7_binding/test.jsonl'),'--out',(Join-Path $plan 'tokenizer-parity.json')) `
    (Join-Path $plan 'tokenizer-parity-output.txt')
Copy-Item -LiteralPath (Join-Path $EvalRoot 'foundation/tokenizer.json') -Destination (Join-Path $evalRun 'adapter/tokenizer.json')
Set-Location -LiteralPath (Join-Path $EvalRoot 'kit-v2')
$package=Join-Path $evalRun 'SANCTIONS_SCREENING_MATCH.safetensors'
Invoke-Logged $evalPython @('-m','float_runtime.export_adapter','--adapter',(Join-Path $evalRun 'adapter'),
    '--intent','SANCTIONS_SCREENING_MATCH','--class','judgment','--foundation',
    (Join-Path $EvalRoot 'foundation/foundation.json'),'--max-tokens','256','--out',$package) `
    (Join-Path $plan 'export-output.txt')
Invoke-Logged (Join-Path $EvalRoot 'bin-v2/adapterbuild-live.exe') @('lora','--intent','SANCTIONS_SCREENING_MATCH',
    '--package',$package,'--out',$evalRun,'--foundation',(Join-Path $EvalRoot 'foundation/foundation.json'),
    '--foundation-onnx',(Join-Path $EvalRoot 'foundation/foundation_lora_fp32.onnx'),
    '--engine',(Join-Path $EvalRoot 'foundation/foundation_engine.wasm')) (Join-Path $plan 'stage1-output.txt')
Set-Location -LiteralPath $taskRepo
Invoke-Logged $evalPython @('track2/adapter/sanctions/measure_miners.py',
    (Join-Path $PSScriptRoot 'evidence/2026-11-01-wrong-query-controls'),'--home',$EvalRoot,'--versions','7') `
    (Join-Path $plan 'known-regression-output.txt')
foreach ($role in @('development','final')) {
    $benchmark=Join-Path $PSScriptRoot ('evidence/v7-binding-'+$role)
    Invoke-Logged $evalPython @('track2/adapter/sanctions/measure_miners.py',$benchmark,
        '--home',$EvalRoot,'--versions','6,7') (Join-Path $benchmark 'node-measurement-output.txt')
    Invoke-Logged $evalPython @('track2/adapter/sanctions/verify_evidence.py',$benchmark) `
        (Join-Path $benchmark 'verify-output.txt')
}
Copy-Item -LiteralPath (Join-Path $evalRun 'result.json') -Destination (Join-Path $plan 'training-result.json')
Copy-Item -LiteralPath (Join-Path $evalRun 'initialization.json') -Destination (Join-Path $plan 'initialization.json')
Copy-Item -LiteralPath (Join-Path $EvalRoot 'train_sanctions_v7.log') -Destination (Join-Path $plan 'training-log.txt')
Write-Output 'Query-binding measurements complete. No registration or factual-readiness claim implied.'
