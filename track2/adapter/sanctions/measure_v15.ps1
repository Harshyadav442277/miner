param([string]$EvalRoot='C:/Users/hyada/tg-eval',[int]$Version=15,
      [string]$DataDir='sanctions_v15_representations',[string]$PlanName='v15-plan')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$py=Join-Path $EvalRoot '.venv/Scripts/python.exe'
$run=Join-Path $EvalRoot ('runs-v2/SANCTIONS_SCREENING_MATCH_v'+$Version)
$plan=Join-Path $PSScriptRoot ('evidence/'+$PlanName)
$base='track2/adapter/sanctions'
Set-Location -LiteralPath $repo
function Invoke-Logged {
    param([string]$Program,[string[]]$CommandArgs,[string]$LogPath)
    @{program=$Program; arguments=$CommandArgs; cwd=(Get-Location).Path} |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath ($LogPath+'.command.json') -Encoding utf8
    & $Program @CommandArgs 2>&1 | Tee-Object -FilePath $LogPath
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Program ($LASTEXITCODE)" }
}
while(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'python.exe' -and $_.CommandLine -like ("*train_v7.py*--version $Version *")
}) { Start-Sleep -Seconds 5 }
$result=Get-Content -LiteralPath (Join-Path $run 'result.json') -Raw | ConvertFrom-Json
$init=Get-Content -LiteralPath (Join-Path $run 'initialization.json') -Raw | ConvertFrom-Json
if (!$init.initialization_completed -or $init.tensors_verified -ne 178) { throw 'Parent initialization not verified' }
foreach($file in @('result.json','initialization.json')) {
    Copy-Item -LiteralPath (Join-Path $run $file) -Destination (Join-Path $plan ('training-'+$file))
}
Copy-Item -LiteralPath (Join-Path $EvalRoot ('train_sanctions_v'+$Version+'.log')) -Destination (Join-Path $plan 'training-log.txt')
if ($result.hyperparameters.max_length -ne 512) { throw 'Requires matching512 training' }
$classes=@{}
foreach($truth in @('True','False')) {
    $group=$result.factual_by_membership.$truth
    if ($null -eq $group -or $group.pairs -lt 1) { throw 'Missing factual class diagnostics' }
    $classes[$truth]=@{pairs=$group.pairs; correct=$group.correct; accuracy=$group.accuracy}
}
$classPass=($classes.True.accuracy -ge .65 -and $classes.False.accuracy -ge .65 -and $result.verdict -eq 'PASS')
@{pass=$classPass; factual_by_membership=$classes; scope='Synthetic class gates only'} |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $plan 'synthetic-class-gate.json') -Encoding utf8
if (!$classPass) { throw 'Synthetic overall/class gate failed; no external scoring' }
$env:HF_HOME=Join-Path $EvalRoot 'hf'
$env:HF_HUB_OFFLINE='1'
$env:LIVE_CLASS_INTENTS='SANCTIONS_SCREENING_MATCH'
$data=Join-Path $EvalRoot ('pairs/'+$DataDir)
Invoke-Logged $py @("$base/check_tokenizer_parity.py",'--trained',(Join-Path $run 'adapter/tokenizer.json'),
    '--pinned',(Join-Path $EvalRoot 'foundation/tokenizer.json'),'--pairs',
    (Join-Path $data 'train.jsonl'),(Join-Path $data 'val.jsonl'),(Join-Path $data 'test.jsonl'),
    '--max-tokens','512','--out',(Join-Path $plan 'tokenizer-parity.json')) (Join-Path $plan 'tokenizer-parity.txt')
Copy-Item -LiteralPath (Join-Path $EvalRoot 'foundation/tokenizer.json') -Destination (Join-Path $run 'adapter/tokenizer.json')
Set-Location -LiteralPath (Join-Path $EvalRoot 'kit-v2')
$package=Join-Path $run 'SANCTIONS_SCREENING_MATCH.safetensors'
Invoke-Logged $py @('-m','float_runtime.export_adapter','--adapter',(Join-Path $run 'adapter'),
    '--intent','SANCTIONS_SCREENING_MATCH','--class','judgment','--foundation',
    (Join-Path $EvalRoot 'foundation/foundation.json'),'--max-tokens','512','--out',$package) (Join-Path $plan 'export.txt')
Invoke-Logged (Join-Path $EvalRoot 'bin-v2/adapterbuild-live.exe') @('lora','--intent','SANCTIONS_SCREENING_MATCH',
    '--package',$package,'--out',$run,'--foundation',(Join-Path $EvalRoot 'foundation/foundation.json'),
    '--foundation-onnx',(Join-Path $EvalRoot 'foundation/foundation_lora_fp32.onnx'),
    '--engine',(Join-Path $EvalRoot 'foundation/foundation_engine.wasm')) (Join-Path $plan 'stage1.txt')
Set-Location -LiteralPath $repo
foreach($name in @('v7-miner-capture','2026-11-01-wrong-query-controls','v7-binding-final','v8-bank-final')) {
    $capture=Join-Path $PSScriptRoot ('evidence/'+$name)
    Invoke-Logged $py @("$base/measure_miners.py",$capture,'--home',$EvalRoot,'--versions',"$Version",'--max-tokens','512') (Join-Path $plan ($name+'-node.txt'))
    Invoke-Logged $py @("$base/verify_evidence.py",$capture) (Join-Path $plan ($name+'-verify.txt'))
    $scored=Get-Content -LiteralPath (Join-Path $capture ('v'+$Version+'-node-scores.json')) -Raw | ConvertFrom-Json
    if($name -eq 'v7-miner-capture') {
        $auditFile=Join-Path $plan 'old512-visibility.json'
        Invoke-Logged $py @("$base/audit_claim_visibility.py",$capture,'--tokenizer',
            (Join-Path $EvalRoot 'foundation/tokenizer.json'),'--max-tokens','512','--out',$auditFile) (Join-Path $plan 'old512-visibility.txt')
        $audit=Get-Content -LiteralPath $auditFile -Raw | ConvertFrom-Json
        if($audit.observable_pairs -ne $scored.pairs) { throw 'Old full factual claims not all visible' }
        $baseline=$audit.observable_visible_length_baseline_tie_aware
        $gate=@{pass=($scored.accuracy -gt $baseline); accuracy=$scored.accuracy; visible_length_baseline=$baseline; scope='Development only,512 tokens'}
        $gate | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $plan 'development-gate.json') -Encoding utf8
        if(!$gate.pass) { throw 'Factual development baseline failed; reserved cohort unscored' }
    } elseif($scored.accuracy -ne 1) {
        throw "Binding regression failed at $name; reserved cohort unscored"
    }
}
$fresh=Join-Path $PSScriptRoot 'evidence/v9-miner-capture'
$freshAudit=Join-Path $plan 'fresh512-factual-audit.json'
Invoke-Logged $py @("$base/audit_factual_benchmark.py",$fresh,'--tokenizer',
    (Join-Path $EvalRoot 'foundation/tokenizer.json'),'--max-tokens','512','--out',$freshAudit) (Join-Path $plan 'fresh512-factual-audit.txt')
# Both models are frozen before any reserved scores; same512 inputs, no winner selection on this set.
Invoke-Logged $py @("$base/measure_miners.py",$fresh,'--home',$EvalRoot,'--versions',"14,$Version",'--max-tokens','512') (Join-Path $plan 'fresh-node.txt')
Invoke-Logged $py @("$base/verify_evidence.py",$fresh) (Join-Path $plan 'fresh-verify.txt')
Invoke-Logged $py @("$base/audit_claim_visibility.py",$fresh,'--tokenizer',
    (Join-Path $EvalRoot 'foundation/tokenizer.json'),'--max-tokens','512','--out',
    (Join-Path $plan 'fresh512-visibility.json')) (Join-Path $plan 'fresh512-visibility.txt')
$freshResult=Get-Content -LiteralPath (Join-Path $fresh ('v'+$Version+'-node-scores.json')) -Raw | ConvertFrom-Json
$audit=Get-Content -LiteralPath $freshAudit -Raw | ConvertFrom-Json
$reference=$audit.runtime_visibility.visible_token_length_baseline_tie_aware
@{pass=($freshResult.accuracy -gt $reference -and $freshResult.accuracy -ge .8);
    accuracy=$freshResult.accuracy; visible_length_baseline=$reference;
    scope='One-sided genuine errors; no broad factual or registration readiness'} |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $plan 'fresh-gate.json') -Encoding utf8
Write-Output 'Completed fixed512 measurements. No registration readiness inferred.'
