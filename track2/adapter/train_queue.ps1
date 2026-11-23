# Run several train_package.ps1 lanes one after another, as one process that outlives the session that started it.
#   pwsh -File train_queue.ps1 -Jobs VULNERABILITY_TRIAGE:vt_v1:vt_v1,SENTIMENT_ANALYSIS:sa_v1:sa_v1
# Each job is Intent:Run:Pairs. A job whose runs-v2/<Run>/chain.log already says "chain end" is skipped.
# Start it detached (see executor/run_local.ps1 notes): a session restart killed the earlier per-lane parents and
# left their training blocked on a dead output pipe (2026-11-23).
param([Parameter(Mandatory)][string]$Jobs, [int]$BatchSize = 1, [int]$GradAccum = 16, [int]$FreeMiB = 2200,
      [int]$Rank = 8, [int]$Alpha = 32, [int]$Epochs = 3, [string]$Lr = '0.0001',
      [string]$EvalRoot = 'C:/Users/hyada/tg-eval')
$here = $PSScriptRoot
foreach ($job in $Jobs -split ',') {
    $intent, $run, $pairs = $job -split ':'
    $log = Join-Path $EvalRoot "runs-v2/$run/chain.log"
    if ((Test-Path $log) -and ((Get-Content $log) -match 'chain end')) { continue }
    & pwsh -NoProfile -File (Join-Path $here 'train_package.ps1') -Intent $intent -Run $run -Pairs $pairs `
        -BatchSize $BatchSize -GradAccum $GradAccum -FreeMiB $FreeMiB -Rank $Rank -Alpha $Alpha -Epochs $Epochs -Lr $Lr
}
