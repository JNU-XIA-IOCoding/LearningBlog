param(
  [string]$Subdomain = "jnu-xia-io-coding",
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ops = Join-Path $root "ops"
New-Item -ItemType Directory -Force -Path $ops | Out-Null
$out = Join-Path $ops "localtunnel.out.log"
$err = Join-Path $ops "localtunnel.err.log"

Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*localtunnel*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

if (Test-Path $out) { Remove-Item $out -Force }
if (Test-Path $err) { Remove-Item $err -Force }

$cmd = "npx -y localtunnel --port $Port --subdomain $Subdomain"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c $cmd" -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
Start-Sleep -Seconds 8

if (!(Test-Path $out)) {
  Write-Error "Tunnel did not start"
  exit 1
}

$url = (Get-Content $out -Raw).Trim()
Write-Host $url
try {
  $pwd = (Invoke-WebRequest -UseBasicParsing https://loca.lt/mytunnelpassword -TimeoutSec 10).Content.Trim()
  Write-Host "Tunnel password: $pwd"
} catch {
  Write-Warning "Could not fetch loca.lt password page."
}
