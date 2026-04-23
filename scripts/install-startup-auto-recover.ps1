param(
  [string]$Subdomain = 'jnu-xia-io-coding',
  [int]$Port = 5173,
  [switch]$Rebuild,
  [switch]$EnableWatchdog = $true,
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$startupDir = [Environment]::GetFolderPath('Startup')
$cmdPath = Join-Path $startupDir 'phoenix-blog-auto-recover.cmd'

if ($Remove) {
  if (Test-Path -LiteralPath $cmdPath) {
    Remove-Item -LiteralPath $cmdPath -Force
    Write-Host "Removed startup launcher: $cmdPath"
  } else {
    Write-Host "Startup launcher not found, nothing to remove."
  }
  exit 0
}

$recoverScript = Join-Path $root 'scripts\startup-auto-recover.ps1'
if (!(Test-Path -LiteralPath $recoverScript)) {
  throw "Cannot find startup-auto-recover script: $recoverScript"
}

$argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$recoverScript`"", '-Subdomain', "`"$Subdomain`"", '-Port', "$Port")
if ($Rebuild) { $argList += '-Rebuild' }
if ($EnableWatchdog) { $argList += '-EnableWatchdog' }
$argString = $argList -join ' '

$content = @"
@echo off
cd /d "$root"
powershell.exe $argString
"@

Set-Content -LiteralPath $cmdPath -Value $content -Encoding ASCII
Write-Host "Installed startup launcher: $cmdPath"
Write-Host "It will run at Windows sign-in."
