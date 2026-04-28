$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$backendPath = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"

$backendJob = Start-Job -ArgumentList $backendPath -ScriptBlock {
  param($path)
  Set-Location $path
  npm run migrate
  npm run start
}

$frontendJob = Start-Job -ArgumentList $frontendPath -ScriptBlock {
  param($path)
  Set-Location $path
  npm run dev -- --host 0.0.0.0 --port 5173
}

Write-Host "Backend job id: $($backendJob.Id)"
Write-Host "Frontend job id: $($frontendJob.Id)"
Write-Host "Use Get-Job / Receive-Job / Stop-Job to manage them."
