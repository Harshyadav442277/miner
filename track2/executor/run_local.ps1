# Run the executor on this laptop behind a Cloudflare quick tunnel, for a registration window.
#   pwsh -File run_local.ps1 -Package CONTRACT_OBLIGATION_AUDIT=C:/Users/hyada/tg-eval/runs-v2/coa_v1/CONTRACT_OBLIGATION_AUDIT.safetensors
# Prints the public runnable URL to register (https://<random>.trycloudflare.com/<FAMILY>). The URL lives only as long
# as this window: keep the laptop awake and this script running until /api/wasm shows the registration past the
# remote check. Measured 2026-11-23: a worst-case 30 x 512-token batch took 64.7 s through the tunnel with 3 workers,
# under Cloudflare's 100 s cut. Ctrl+C stops everything this script started, and nothing else.
param([Parameter(Mandatory)][string[]]$Package, [int]$Workers = 3, [int]$Port = 18090,
      [string]$EvalRoot = 'C:/Users/hyada/tg-eval')
$ErrorActionPreference = 'Stop'
$f = Join-Path $EvalRoot 'foundation'
$env:FOUNDATION_MODEL_PATH = Join-Path $f 'foundation_lora_fp32.onnx'
$env:FOUNDATION_MODEL_HASH = '0a49b325304bb4cf292e683929689d0457966be264f60bfc94d0072b614bf8e6'
$env:FOUNDATION_ENGINE_WASM_PATH = Join-Path $f 'foundation_engine.wasm'
$env:FOUNDATION_ENGINE_WASM_HASH = '77643d6e1176ab8744801cef93ccb844d0136ed32b8daa865d541f37d13292de'
$logs = Join-Path $EvalRoot "executor-logs/$((Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ'))"
New-Item -ItemType Directory -Force $logs | Out-Null
$procs = @(); $routes = @(); $next = $Port + 1
try {
    foreach ($p in $Package) {
        $family, $path = $p -split '=', 2
        $urls = @()
        for ($i = 0; $i -lt $Workers; $i++) {
            $procs += Start-Process (Join-Path $EvalRoot 'bin-v2/adapterexec.exe') -PassThru -WindowStyle Hidden `
                -ArgumentList @('-package', $path, '-listen', "127.0.0.1:$next") `
                -RedirectStandardError (Join-Path $logs "worker-$next.log")
            $urls += "http://127.0.0.1:$next/"; $next++
        }
        $routes += @('--route', "$family=$($urls -join ',')")
    }
    $procs += Start-Process python -PassThru -WindowStyle Hidden -RedirectStandardError (Join-Path $logs 'fanout.log') `
        -ArgumentList (@("`"$PSScriptRoot/../adapter/fanout_exec.py`"", '--listen', "127.0.0.1:$Port",
                         '--log', (Join-Path $logs 'batches.jsonl')) + $routes)
    $cf = Start-Process 'C:/Program Files (x86)/cloudflared/cloudflared.exe' -PassThru -WindowStyle Hidden `
        -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$Port") `
        -RedirectStandardError (Join-Path $logs 'cloudflared.log')
    $procs += $cf
    $url = $null
    for ($i = 0; $i -lt 60 -and -not $url; $i++) {
        Start-Sleep 2
        $m = Select-String -Path (Join-Path $logs 'cloudflared.log') -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' |
            Select-Object -First 1
        if ($m) { $url = $m.Matches[0].Value }
    }
    if (-not $url) { throw "no tunnel URL; see $logs/cloudflared.log" }
    foreach ($p in $Package) { Write-Output "runnable URL: $url/$(($p -split '=', 2)[0])" }
    Write-Output "logs: $logs  (Ctrl+C to stop)"
    while ($true) {
        Start-Sleep 30
        $dead = $procs | Where-Object { $_.HasExited }
        if ($dead) { throw "a process exited (pid $($dead[0].Id)); see $logs" }
    }
} finally {
    $procs | Where-Object { -not $_.HasExited } | ForEach-Object { Stop-Process -Id $_.Id -Force }
}
