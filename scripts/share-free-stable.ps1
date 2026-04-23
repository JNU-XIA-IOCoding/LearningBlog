param(
  [string]$Target = "http://phoenix_blog_frontend:5173",
  [string]$Tag = "jnu-xia",
  [string]$ContainerName = "phoenix_cf_tunnel"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Starting stable free tunnel..."

# Ensure app stack is running
try {
  docker ps | Out-Null
} catch {
  Write-Error "Docker engine is not running."
  exit 1
}

# Recreate tunnel container
$null = docker rm -f $ContainerName 2>$null
$null = docker run -d --name $ContainerName --network phoenix-codepack_default cloudflare/cloudflared:latest tunnel --no-autoupdate --url $Target
Start-Sleep -Seconds 8

$logs = cmd /c "docker logs $ContainerName 2>&1"
$match = [regex]::Match(($logs -join "`n"), 'https://[a-z0-9\-]+\.trycloudflare\.com')
if (-not $match.Success) {
  Write-Error "Could not parse tunnel URL from logs."
  exit 1
}

$url = $match.Value
$share = "$url/$Tag"

Write-Host "Tunnel URL: $url"
Write-Host "Branded URL: $share"

# Basic health check
try {
  $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 15
  Write-Host "Health: $($resp.StatusCode)"
} catch {
  Write-Warning "Health check did not return 200 yet. Wait 10-20s and retry."
}

$outFile = Join-Path $root "ops\active-share-url.txt"
"$share" | Set-Content -Encoding UTF8 $outFile
Write-Host "Saved: $outFile"
