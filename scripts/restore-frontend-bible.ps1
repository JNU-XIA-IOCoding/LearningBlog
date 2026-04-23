param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$source = Join-Path $Root 'existing\frontend\index.html'
$target = Join-Path $Root 'frontend\index.html'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Info($m) { Write-Host "[INFO] $m" }

if (!(Test-Path -LiteralPath $source)) {
  throw "Front-end bible not found: $source"
}

$needsRestore = $Force -or !(Test-Path -LiteralPath $target)
if (!$needsRestore) {
  $html = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
  $required = @(
    'id="slideshow"',
    'id="mod-grid"',
    'id="ai-grid"',
    'id="blog-posts"',
    'id="roadmap"',
    'Sakura.start();'
  )
  $missingRequired = $false
  foreach ($needle in $required) {
    if (!$html.Contains($needle)) {
      $missingRequired = $true
      break
    }
  }

  $hasMojibake = $html -match '鈥|搂|鏅|锛|鐨|乱码'
  $needsRestore = $missingRequired -or $hasMojibake
}

if ($needsRestore) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  if (Test-Path -LiteralPath $target) {
    $backup = Join-Path (Split-Path -Parent $target) "index.auto-backup-$stamp.html"
    Copy-Item -LiteralPath $target -Destination $backup -Force
    Info "Backed up previous front-end index: $backup"
  }
  Copy-Item -LiteralPath $source -Destination $target -Force
  Info "Restored front-end index from bible: $source"
}

$html = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
$requiredLoaders = @('phoenix-dynamic-media.js', 'phoenix-backend-bridge.js')
$missingLoaders = @($requiredLoaders | Where-Object { !$html.Contains($_) })
if ($missingLoaders.Count -gt 0) {
  $loaderList = ($missingLoaders | ForEach-Object { "'/$_'" }) -join ', '
  $loader = @'
<script>
(function () {
  var base = location.protocol === 'file:' ? 'http://127.0.0.1:5173' : '';
  [__LOADER_LIST__].forEach(function (src) {
    var script = document.createElement('script');
    script.src = base + src;
    script.defer = true;
    document.body.appendChild(script);
  });
})();
</script>
'@
  $loader = $loader.Replace('__LOADER_LIST__', $loaderList)
  $html = $html -replace '</body>', ($loader + '</body>')
  [System.IO.File]::WriteAllText($target, $html, $utf8NoBom)
  Info "Injected front-end loader(s): $($missingLoaders -join ', ')"
} else {
  Info 'Front-end loaders already present.'
}

Info 'Front-end bible restore check completed.'
