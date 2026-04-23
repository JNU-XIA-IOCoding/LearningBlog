param(
  [string]$Subdomain = 'jnu-xia-learning-journey',
  [int]$Port = 5173,
  [string]$CfContainer = 'phoenix_cf_tunnel'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$opsDir = Join-Path $root 'ops'
New-Item -ItemType Directory -Force -Path $opsDir | Out-Null

$ltLog = Join-Path $opsDir 'localtunnel.log'
$ltPidFile = Join-Path $opsDir 'localtunnel.pid'
$activeFile = Join-Path $opsDir 'active-share-url.txt'

function Test-Url([string]$url) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 20
    return $resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400
  } catch {
    return $false
  }
}

function Test-UrlStable([string]$url, [int]$checks = 3, [int]$intervalSec = 4) {
  for ($i = 0; $i -lt $checks; $i++) {
    if (-not (Test-Url $url)) { return $false }
    if ($i -lt ($checks - 1)) { Start-Sleep -Seconds $intervalSec }
  }
  return $true
}

function Stop-ExistingLocalTunnel {
  if (Test-Path $ltPidFile) {
    $savedPid = Get-Content $ltPidFile -ErrorAction SilentlyContinue
    if ($savedPid) {
      Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $ltPidFile -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Checking local app on port $Port ..."
if (-not (Test-Url "http://127.0.0.1:$Port")) {
  Write-Warning "Local app is not reachable on port $Port. Start frontend first (npm run dev) or docker frontend service."
}

Stop-ExistingLocalTunnel

Write-Host "Trying LocalTunnel custom domain: https://$Subdomain.loca.lt"
$ltCmd = "npx --yes localtunnel --port $Port --subdomain $Subdomain > `"$ltLog`" 2>&1"
$ltProc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $ltCmd -WindowStyle Hidden -PassThru
$ltProc.Id | Set-Content -Path $ltPidFile -Encoding ascii

Start-Sleep -Seconds 10
$ltUrl = "https://$Subdomain.loca.lt"
if (Test-UrlStable $ltUrl 3 4) {
  $ltUrl | Set-Content -Path $activeFile -Encoding UTF8
  Write-Host "LocalTunnel live: $ltUrl"
  Write-Host "Saved: $activeFile"
  exit 0
}

Write-Warning "LocalTunnel not healthy yet. Fallback to Cloudflare quick tunnel..."
Stop-ExistingLocalTunnel

# Cloudflare fallback (requires Docker running).
$dockerReady = $true
try {
  docker ps | Out-Null
} catch {
  $dockerReady = $false
}

if (-not $dockerReady) {
  Write-Error "Docker is not running and LocalTunnel failed. Please open Docker Desktop or retry LocalTunnel later."
  exit 1
}

$null = docker rm -f $CfContainer 2>$null
$target = "http://host.docker.internal:$Port"
$null = docker run -d --name $CfContainer cloudflare/cloudflared:latest tunnel --no-autoupdate --url $target
Start-Sleep -Seconds 8

$logs = cmd /c "docker logs $CfContainer 2>&1"
$m = [regex]::Match(($logs -join "`n"), 'https://[a-z0-9\-]+\.trycloudflare\.com')
if (-not $m.Success) {
  Write-Error "Cloudflare tunnel did not return a URL."
  exit 1
}

$url = $m.Value
$null = Test-UrlStable $url 2 3
$url | Set-Content -Path $activeFile -Encoding UTF8
Write-Host "Cloudflare live: $url"
Write-Host "Saved: $activeFile"
