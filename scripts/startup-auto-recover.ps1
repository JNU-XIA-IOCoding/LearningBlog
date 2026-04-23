param(
  [string]$Subdomain = 'jnu-xia-io-coding',
  [int]$Port = 5173,
  [switch]$Rebuild,
  [switch]$EnableWatchdog
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Info($m) { Write-Host "[INFO] $m" }
function Warn($m) { Write-Warning $m }

function Wait-HttpOk([string]$url, [int]$tries = 30, [int]$sleepSec = 2) {
  for ($i = 0; $i -lt $tries; $i++) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 10
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
    } catch {}
    Start-Sleep -Seconds $sleepSec
  }
  return $false
}

Info 'Checking front-end bible integrity...'
& (Join-Path $root 'scripts\restore-frontend-bible.ps1')

Info 'Syncing wallpapers (source -> frontend/public/wallpapers)...'
& (Join-Path $root 'scripts\sync-wallpapers.ps1')

try { docker ps | Out-Null } catch { throw 'Docker is not running. Open Docker Desktop first.' }

if ($Rebuild) {
  Info 'Starting stack with rebuild...'
  docker-compose up -d --build db backend frontend | Out-Host
} else {
  Info 'Starting stack...'
  docker-compose up -d db backend frontend | Out-Host
}

Info 'Waiting for backend health...'
if (-not (Wait-HttpOk 'http://127.0.0.1:3001/api/health' 40 2)) {
  Warn 'Backend health endpoint did not become ready. Trying restart backend once...'
  docker-compose restart backend | Out-Host
  if (-not (Wait-HttpOk 'http://127.0.0.1:3001/api/health' 30 2)) {
    throw 'Backend failed to recover.'
  }
}

Info 'Waiting for frontend...'
if (-not (Wait-HttpOk "http://127.0.0.1:$Port" 40 2)) {
  Warn 'Frontend endpoint did not become ready. Trying restart frontend once...'
  docker-compose restart frontend | Out-Host
  if (-not (Wait-HttpOk "http://127.0.0.1:$Port" 30 2)) {
    throw 'Frontend failed to recover.'
  }
}

Info 'Ensuring default wallpaper selection in backend (first-run safe)...'
try {
  $sectionsPath = Join-Path $root 'frontend\public\wallpapers\sections.json'
  & (Join-Path $root 'scripts\ensure-default-wallpaper-selection.ps1') -SectionsPath $sectionsPath
} catch {
  Warn "Unable to sync default wallpaper selection: $($_.Exception.Message)"
}

Info 'Publishing share domain...'
& (Join-Path $root 'scripts\share-domain-hybrid.ps1') -Subdomain $Subdomain -Port $Port

$activeFile = Join-Path $root 'ops\active-share-url.txt'
if (Test-Path $activeFile) {
  $url = (Get-Content $activeFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  Info "Active URL: $url"
}

if ($EnableWatchdog) {
  Info 'Starting tunnel watchdog in background...'
  $watchScript = Join-Path $root 'scripts\watch-tunnel-recover.ps1'
  $args = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $watchScript, '-Subdomain', $Subdomain, '-Port', $Port)
  $watchProc = Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WindowStyle Hidden -PassThru
  Info "Watchdog process started (PID $($watchProc.Id))"
}

Info 'Startup auto-recover completed.'
