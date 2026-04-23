param(
  [string]$Subdomain = 'jnu-xia-io-coding',
  [int]$Port = 5173,
  [int]$IntervalSec = 45
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$opsDir = Join-Path $root 'ops'
New-Item -ItemType Directory -Force -Path $opsDir | Out-Null
$logFile = Join-Path $opsDir 'tunnel-watch.log'
$activeFile = Join-Path $opsDir 'active-share-url.txt'

function LogLine([string]$line) {
  $msg = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $line
  Add-Content -Path $logFile -Value $msg -Encoding UTF8
}

function IsOk([string]$url) {
  if ([string]::IsNullOrWhiteSpace($url)) { return $false }
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 15
    return $r.StatusCode -ge 200 -and $r.StatusCode -lt 500
  } catch {
    return $false
  }
}

LogLine "watchdog started for $Subdomain on port $Port"
while ($true) {
  $url = if (Test-Path $activeFile) { (Get-Content $activeFile -ErrorAction SilentlyContinue | Select-Object -First 1) } else { '' }
  if (-not (IsOk $url)) {
    LogLine "tunnel unhealthy, recovering..."
    try {
      & (Join-Path $root 'scripts\share-domain-hybrid.ps1') -Subdomain $Subdomain -Port $Port | Out-Null
      $newUrl = if (Test-Path $activeFile) { (Get-Content $activeFile | Select-Object -First 1) } else { '' }
      LogLine "recovered: $newUrl"
    } catch {
      LogLine "recovery error: $($_.Exception.Message)"
    }
  } else {
    LogLine "healthy: $url"
  }
  Start-Sleep -Seconds $IntervalSec
}
