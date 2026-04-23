param(
  [string]$ApiBase = 'http://127.0.0.1:3001/api',
  [string]$SectionsPath = 'E:\Chrome-Downloading\files\phoenix-blog-claude-code\phoenix-codepack\frontend\public\wallpapers\sections.json',
  [string]$AdminUser = 'admin',
  [string]$AdminPassword = 'Phoenix@2026',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

function Info($m) { Write-Host "[INFO] $m" }
function Warn($m) { Write-Warning $m }

if (!(Test-Path -LiteralPath $SectionsPath)) {
  Warn "sections.json not found, skip default selection: $SectionsPath"
  exit 0
}

try {
  $sections = Get-Content -LiteralPath $SectionsPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
  Warn "Failed to parse sections.json: $($_.Exception.Message)"
  exit 0
}

$payloadObj = [ordered]@{
  hero = @($sections.hero)
  about = @($sections.about)
  learning = @($sections.learning)
  ai = @($sections.ai)
  journal = @($sections.journal)
  roadmap = @($sections.roadmap)
}

if (($payloadObj.hero | Measure-Object).Count -eq 0) {
  Warn 'Default hero playlist is empty, skip.'
  exit 0
}

try {
  $loginBody = @{ username = $AdminUser; password = $AdminPassword } | ConvertTo-Json
  $login = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/login" -ContentType 'application/json' -Body $loginBody
  if (-not $login.token) {
    Warn 'Cannot get admin token, skip default selection.'
    exit 0
  }
} catch {
  Warn "Admin login failed, skip default selection: $($_.Exception.Message)"
  exit 0
}

$headers = @{ Authorization = "Bearer $($login.token)" }

try {
  $current = Invoke-RestMethod -Method Get -Uri "$ApiBase/admin/wallpapers/selection" -Headers $headers
} catch {
  Warn "Cannot read current wallpaper selection: $($_.Exception.Message)"
  exit 0
}

$hasSaved =
  (@($current.hero).Count -gt 0) -or
  (@($current.about).Count -gt 0) -or
  (@($current.learning).Count -gt 0) -or
  (@($current.ai).Count -gt 0) -or
  (@($current.journal).Count -gt 0) -or
  (@($current.roadmap).Count -gt 0)

if ($hasSaved -and -not $Force) {
  Info 'Existing wallpaper selection found, keep current user selection.'
  exit 0
}

try {
  $payload = $payloadObj | ConvertTo-Json -Depth 6
  $client = [System.Net.Http.HttpClient]::new()
  $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Put, "$ApiBase/admin/wallpapers/selection")
  $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $login.token)
  $request.Content = [System.Net.Http.StringContent]::new($payload, [System.Text.Encoding]::UTF8, "application/json")
  $response = $client.SendAsync($request).GetAwaiter().GetResult()
  if (-not $response.IsSuccessStatusCode) {
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    throw "HTTP $([int]$response.StatusCode): $text"
  }
  Info 'Default wallpaper selection has been saved to backend.'
} catch {
  Warn "Failed to save default wallpaper selection: $($_.Exception.Message)"
} finally {
  if ($request) { $request.Dispose() }
  if ($client) { $client.Dispose() }
}
