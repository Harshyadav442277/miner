param([string]$EvalRoot='C:/Users/hyada/tg-eval', [int]$Version=9,
      [string]$DataDir='sanctions_v9_crossformat', [string]$PlanName='v9-plan')
$ErrorActionPreference='Stop'
$taskRepo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$evalPython=Join-Path $EvalRoot '.venv/Scripts/python.exe'
$evalRun=Join-Path $EvalRoot ('runs-v2/SANCTIONS_SCREENING_MATCH_v'+$Version)
$plan=Join-Path $PSScriptRoot ('evidence/'+$PlanName)
Set-Location -LiteralPath $taskRepo
function Invoke-Logged {
    param([string]$Program,[string[]]$CommandArgs,[string]$LogPath)
    @{program=$Program; arguments=$CommandArgs; cwd=(Get-Location).Path} |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath ($LogPath+'.command.json') -Encoding utf8
    & $Program @CommandArgs 2>&1 | Tee-Object -FilePath $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Program ($LASTEXITCODE)" }
}
while (Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'python.exe' -and $_.CommandLine -like ("*train_v7.py*--version $Version *")
}) { Start-Sleep -Seconds 5 }
if (!(Test-Path -LiteralPath (Join-Path $evalRun 'initialization.json'))) { throw "No completed v$Version initialization report" }
$result=Get-Content -LiteralPath (Join-Path $evalRun 'result.json') -Raw | ConvertFrom-Json
if ($result.verdict -ne 'PASS') { throw 'Synthetic gate did not pass' }
Copy-Item -LiteralPath (Join-Path $evalRun 'result.json') -Destination (Join-Path $plan 'training-result.json')
Copy-Item -LiteralPath (Join-Path $evalRun 'initialization.json') -Destination (Join-Path $plan 'initialization.json')
Copy-Item -LiteralPath (Join-Path $EvalRoot ('train_sanctions_v'+$Version+'.log')) -Destination (Join-Path $plan 'training-log.txt')
$env:HF_HOME=Join-Path $EvalRoot 'hf'
$env:HF_HUB_OFFLINE='1'
$env:LIVE_CLASS_INTENTS='SANCTIONS_SCREENING_MATCH'
Invoke-Logged $evalPython @('track2/adapter/sanctions/check_tokenizer_parity.py','--trained',
    (Join-Path $evalRun 'adapter/tokenizer.json'),'--pinned',(Join-Path $EvalRoot 'foundation/tokenizer.json'),
    '--pairs',(Join-Path $EvalRoot ('pairs/'+$DataDir+'/train.jsonl')),
    (Join-Path $EvalRoot ('pairs/'+$DataDir+'/val.jsonl')),
    (Join-Path $EvalRoot ('pairs/'+$DataDir+'/test.jsonl')),'--out',(Join-Path $plan 'tokenizer-parity.json')) `
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
foreach ($name in @('v7-miner-capture','2026-11-01-wrong-query-controls','v7-binding-final','v8-bank-final')) {
    $benchmark=Join-Path $PSScriptRoot ('evidence/'+$name)
    Invoke-Logged $evalPython @('track2/adapter/sanctions/measure_miners.py',$benchmark,
        '--home',$EvalRoot,'--versions',"$Version") (Join-Path $plan ($name+'-measurement.txt'))
    Invoke-Logged $evalPython @('track2/adapter/sanctions/verify_evidence.py',$benchmark) `
        (Join-Path $plan ($name+'-verify.txt'))
    if ($name -eq 'v7-miner-capture') {
        $scored=Get-Content -LiteralPath (Join-Path $benchmark ('v'+$Version+'-node-scores.json')) -Raw | ConvertFrom-Json
        $audit=Get-Content -LiteralPath (Join-Path $benchmark 'factual-validity-audit.json') -Raw | ConvertFrom-Json
        $baseline=$audit.runtime_visibility.visible_token_length_baseline_tie_aware
        if ($null -eq $baseline) { throw 'Missing actual-input baseline' }
        $gate=@{accuracy=$scored.accuracy; visible_length_baseline=$baseline;
            pass=($scored.accuracy -gt $baseline); scope='Development baseline only; not submission readiness'}
        $gate | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $plan 'development-gate.json') -Encoding utf8
        if (!$gate.pass) { throw 'Factual development baseline not beaten; fresh cohort remains unscored' }
    }
}
while (Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'python.exe' -and $_.CommandLine -like '*collect_miners.py*v9-miner-capture*'
}) { Start-Sleep -Seconds 5 }
$fresh=Join-Path $PSScriptRoot 'evidence/v9-miner-capture'
if (!(Test-Path -LiteralPath (Join-Path $fresh 'collection-summary.json'))) { throw 'Fresh capture not complete' }
Invoke-Logged $evalPython @('track2/adapter/sanctions/label_miners.py',$fresh) (Join-Path $plan 'fresh-label-output.txt')
Invoke-Logged $evalPython @('track2/adapter/sanctions/audit_factual_benchmark.py',$fresh,'--tokenizer',
    (Join-Path $EvalRoot 'foundation/tokenizer.json')) (Join-Path $plan 'fresh-factual-audit-output.txt')
$summary=Get-Content -LiteralPath (Join-Path $fresh 'label-summary.json') -Raw | ConvertFrom-Json
if (!$summary.pairs) { throw 'No defensible fresh factual pairs; no scoring claim possible' }
Invoke-Logged $evalPython @('track2/adapter/sanctions/measure_miners.py',$fresh,'--home',$EvalRoot,
    '--versions',"8,$Version") (Join-Path $plan 'fresh-measurement.txt')
foreach ($benchmark in @($fresh,(Join-Path $PSScriptRoot 'evidence/v7-miner-capture'))) {
    Invoke-Logged $evalPython @('track2/adapter/sanctions/audit_claim_visibility.py',$benchmark,'--tokenizer',
        (Join-Path $EvalRoot 'foundation/tokenizer.json')) (Join-Path $plan ((Split-Path $benchmark -Leaf)+'-visibility.txt'))
    Invoke-Logged $evalPython @('track2/adapter/sanctions/verify_evidence.py',$benchmark) `
        (Join-Path $plan ((Split-Path $benchmark -Leaf)+'-final-verify.txt'))
}
Write-Output "V$Version factual and query-binding measurements complete; no readiness inferred."
