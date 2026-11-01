param([string]$EvalRoot='C:/Users/hyada/tg-eval')
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$evalPython=Join-Path $EvalRoot '.venv/Scripts/python.exe'
$evalRun=Join-Path $EvalRoot 'runs-v2/SANCTIONS_SCREENING_MATCH_v8'
$plan=Join-Path $PSScriptRoot 'evidence/v8-plan'
Set-Location -LiteralPath $taskRepo
function Invoke-Logged {
    param([string]$Program,[string[]]$CommandArgs,[string]$LogPath)
    @{program=$Program; arguments=$CommandArgs; cwd=(Get-Location).Path} |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath ($LogPath+'.command.json') -Encoding utf8
    & $Program @CommandArgs 2>&1 | Tee-Object -FilePath $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Program ($LASTEXITCODE)" }
}
while (Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'python.exe' -and $_.CommandLine -like '*train_v7.py*--version 8*'
}) { Start-Sleep -Seconds 5 }
if (!(Test-Path -LiteralPath (Join-Path $evalRun 'initialization.json'))) { throw 'No completed v8 initialization report' }
$result=Get-Content -LiteralPath (Join-Path $evalRun 'result.json') -Raw | ConvertFrom-Json
if ($result.verdict -ne 'PASS') { throw 'Synthetic gate did not pass' }
$env:HF_HOME=Join-Path $EvalRoot 'hf'
$env:HF_HUB_OFFLINE='1'
$env:LIVE_CLASS_INTENTS='SANCTIONS_SCREENING_MATCH'
Invoke-Logged $evalPython @('track2/adapter/sanctions/check_tokenizer_parity.py','--trained',
    (Join-Path $evalRun 'adapter/tokenizer.json'),'--pinned',(Join-Path $EvalRoot 'foundation/tokenizer.json'),
    '--pairs',(Join-Path $EvalRoot 'pairs/sanctions_v8_hard_binding_r2/train.jsonl'),
    (Join-Path $EvalRoot 'pairs/sanctions_v8_hard_binding_r2/val.jsonl'),
    (Join-Path $EvalRoot 'pairs/sanctions_v8_hard_binding_r2/test.jsonl'),'--out',(Join-Path $plan 'tokenizer-parity.json')) `
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
$measurements=@(
    @{name='2026-11-01-wrong-query-controls'; versions='8'},
    @{name='v7-binding-final'; versions='8'},
    @{name='v8-bank-final'; versions='7,8'},
    @{name='v7-miner-capture'; versions='6,7,8'}
)
foreach ($measurement in $measurements) {
    $benchmark=Join-Path $PSScriptRoot ('evidence/'+$measurement.name)
    Invoke-Logged $evalPython @('track2/adapter/sanctions/measure_miners.py',$benchmark,
        '--home',$EvalRoot,'--versions',$measurement.versions) (Join-Path $plan ($measurement.name+'-measurement.txt'))
    Invoke-Logged $evalPython @('track2/adapter/sanctions/verify_evidence.py',$benchmark) `
        (Join-Path $plan ($measurement.name+'-verify.txt'))
}
Copy-Item -LiteralPath (Join-Path $evalRun 'result.json') -Destination (Join-Path $plan 'training-result.json')
Copy-Item -LiteralPath (Join-Path $evalRun 'initialization.json') -Destination (Join-Path $plan 'initialization.json')
Copy-Item -LiteralPath (Join-Path $EvalRoot 'train_sanctions_v8_r2.log') -Destination (Join-Path $plan 'training-log.txt')
Write-Output 'V8 measurements complete. Factual and counterfactual results remain separate.'
