param(
  [string]$DumpDir = "./backups"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

New-Item -ItemType Directory -Force -Path $DumpDir | Out-Null
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $DumpDir "phoenix-blog-$ts.sql"

if (docker ps --format '{{.Names}}' | Select-String -Pattern '^phoenix_blog_db$') {
  docker exec phoenix_blog_db pg_dump -U postgres -d phoenix_blog > $outFile
  Write-Host "Backup created: $outFile"
} else {
  Write-Error "phoenix_blog_db container is not running."
}
