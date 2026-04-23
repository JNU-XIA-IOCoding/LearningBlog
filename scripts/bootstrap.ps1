$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Installing backend deps..."
Push-Location backend
npm install
Pop-Location

Write-Host "Installing frontend deps..."
Push-Location frontend
npm install
Pop-Location

Write-Host "Syncing wallpapers..."
& "$root\scripts\sync-wallpapers.ps1"

Write-Host "Bootstrap complete."
