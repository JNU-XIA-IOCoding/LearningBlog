param(
  [string]$Source = 'E:\壁纸\意涵',
  [string]$Target = 'E:\Chrome-Downloading\files\phoenix-blog-claude-code\phoenix-codepack\frontend\public\wallpapers'
)

if (!(Test-Path -LiteralPath $Source)) {
  Write-Error "Source path not found: $Source"
  exit 1
}

New-Item -ItemType Directory -Force -Path $Target | Out-Null

# Clean previous media files so the selection matches source exactly.
Get-ChildItem -LiteralPath $Target -File |
  Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|webp|mp4|mov|webm)$' -or $_.Name -match '^(manifest|sections)\.json$' } |
  ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }

$allowedExt = @('.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.webm')
$count = 0
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

Get-ChildItem -LiteralPath $Source -File | ForEach-Object {
  $ext = $_.Extension.ToLowerInvariant()
  if ($allowedExt -contains $ext) {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Target $_.Name) -Force
    $count++
  }
}

Write-Host "Synced $count wallpaper files to $Target"

# Build a static manifest for slideshow/video playback without any transcoding.
$media = Get-ChildItem -LiteralPath $Target -File |
  Where-Object { $_.Name -notmatch '^manifest\.json$' -and $_.Extension -match '^\.(jpg|jpeg|png|webp|mp4|mov|webm)$' } |
  Sort-Object @{ Expression = { if ($_.Extension -match '^\.(mp4|mov|webm)$') { 0 } else { 1 } } }, @{ Expression = { $_.Name } } |
  ForEach-Object {
    $ext = $_.Extension.ToLowerInvariant()
    $mime = switch ($ext) {
      '.mp4' { 'video/mp4' }
      '.webm' { 'video/webm' }
      '.mov' { 'video/quicktime' }
      '.jpg' { 'image/jpeg' }
      '.jpeg' { 'image/jpeg' }
      '.png' { 'image/png' }
      '.webp' { 'image/webp' }
      default { 'application/octet-stream' }
    }
    [PSCustomObject]@{
      name = $_.Name
      kind = if ($_.Extension -match '^\.(mp4|mov|webm)$') { 'video' } else { 'image' }
      path = "/wallpapers/$($_.Name)"
      ext  = $ext
      mime = $mime
      size = $_.Length
    }
  }

$manifestPath = Join-Path $Target 'manifest.json'
[System.IO.File]::WriteAllText($manifestPath, ($media | ConvertTo-Json -Depth 5), $utf8NoBom)
Write-Host "Generated manifest: $manifestPath ($($media.Count) entries)"

# Build section playlist with video-first strategy.
$videos = @($media | Where-Object { $_.kind -eq 'video' } | Select-Object -ExpandProperty path)
$videosPreferred = @($media | Where-Object { $_.kind -eq 'video' -and $_.ext -in @('.mp4', '.webm') } | Select-Object -ExpandProperty path)
$videosFallback = @($media | Where-Object { $_.kind -eq 'video' -and $_.ext -eq '.mov' } | Select-Object -ExpandProperty path)
$images = @($media | Where-Object { $_.kind -eq 'image' } | Select-Object -ExpandProperty path)

$videoPool = @($videosPreferred + $videosFallback)
function New-Rotated([object[]]$pool, [int]$start) {
  if (-not $pool.Count) { return @() }
  $list = @()
  for ($i = 0; $i -lt $pool.Count; $i++) {
    $idx = ($start + $i) % $pool.Count
    $list += $pool[$idx]
  }
  return $list
}

function New-Playlist([int]$start) {
  if ($videoPool.Count -gt 0) {
    return @((New-Rotated $videoPool $start) + (New-Rotated $images $start))
  }
  return New-Rotated $images $start
}

$sections = [PSCustomObject]@{
  hero    = New-Playlist 0
  about   = New-Playlist 1
  learning= New-Playlist 2
  ai      = New-Playlist 3
  journal = New-Playlist 4
  roadmap = New-Playlist 5
}

$sectionsPath = Join-Path $Target 'sections.json'
[System.IO.File]::WriteAllText($sectionsPath, ($sections | ConvertTo-Json -Depth 5), $utf8NoBom)
Write-Host "Generated section playlist: $sectionsPath"
