$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== Phoenix Blog 域名一键上线向导 ==="
Write-Host "请先确保："
Write-Host "1) 域名 A 记录已经指向当前服务器公网 IP"
Write-Host "2) 本机 Docker Desktop 已启动"

$domain = Read-Host "请输入域名 (例如 blog.example.com)"
if ([string]::IsNullOrWhiteSpace($domain)) {
  Write-Error "域名不能为空"
  exit 1
}

$email = Read-Host "请输入证书通知邮箱"
if ([string]::IsNullOrWhiteSpace($email)) {
  Write-Error "邮箱不能为空"
  exit 1
}

$jwt = Read-Host "请输入 JWT 密钥 (留空则自动生成)"
if ([string]::IsNullOrWhiteSpace($jwt)) {
  $jwt = [Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")
}

$pg = Read-Host "请输入数据库密码 (留空使用 postgres)"
if ([string]::IsNullOrWhiteSpace($pg)) {
  $pg = "postgres"
}

Write-Host "开始部署到 https://$domain ..."
& "$root\scripts\deploy-domain.ps1" -Domain $domain -Email $email -JwtSecret $jwt -PostgresPassword $pg

Write-Host "部署完成后访问： https://$domain"
