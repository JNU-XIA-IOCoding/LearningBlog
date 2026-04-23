param(
  [Parameter(Mandatory = $true)] [string]$Domain,
  [Parameter(Mandatory = $true)] [string]$Email,
  [string]$JwtSecret = "replace_with_secure_secret",
  [string]$PostgresPassword = "postgres"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

try {
  docker ps | Out-Null
} catch {
  Write-Error "Docker 引擎未运行，请先启动 Docker Desktop。"
  exit 1
}

$dns = Resolve-DnsName -Name $Domain -Type A -ErrorAction SilentlyContinue
if (-not $dns) {
  Write-Warning "未解析到 $Domain 的 A 记录。证书签发可能失败，请先完成 DNS 指向。"
} else {
  $ips = ($dns | Select-Object -ExpandProperty IPAddress) -join ", "
  Write-Host "DNS A 记录: $ips"
}

$template = Get-Content -Raw "$root\ops\Caddyfile.template"
$template = $template -replace '\{\$DOMAIN\}', $Domain
$template = $template -replace '\{\$EMAIL\}', $Email
Set-Content -Encoding UTF8 "$root\ops\Caddyfile" $template

$env:DOMAIN = $Domain
$env:TLS_EMAIL = $Email
$env:JWT_SECRET = $JwtSecret
$env:POSTGRES_PASSWORD = $PostgresPassword

Write-Host "Starting domain deployment for $Domain ..."
docker-compose -f docker-compose.domain.yml up --build -d

Write-Host "Deployment complete."
Write-Host "Open: https://$Domain"

try {
  $resp = Invoke-WebRequest -UseBasicParsing -Uri "https://$Domain/api/health" -TimeoutSec 12
  Write-Host "Health check: $($resp.StatusCode)"
} catch {
  Write-Warning "HTTPS 健康检查暂未通过。请等待 1-2 分钟后重试（证书签发可能仍在进行）。"
}
