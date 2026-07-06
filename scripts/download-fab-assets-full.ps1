$ErrorActionPreference = "Stop"

$seedUrls = @(
  "https://fabtcg.com/en/resources/",
  "https://fabtcg.com/resources/",
  "https://fabtcg.com/en/resources/digital-assets/"
)

$rootDir = Join-Path (Get-Location) "vendor\fabtcg-digital-assets-full"
$imagesDir = Join-Path $rootDir "images"
$zipsDir = Join-Path $rootDir "zips"
$extractedDir = Join-Path $rootDir "extracted"
$logsDir = Join-Path $rootDir "logs"
New-Item -ItemType Directory -Force -Path $imagesDir, $zipsDir, $extractedDir, $logsDir | Out-Null

$crawlErrorLog = Join-Path $logsDir "crawl-errors.log"
$imageErrorLog = Join-Path $logsDir "download-errors-images.log"
$zipErrorLog = Join-Path $logsDir "download-errors-zips.log"
$extractErrorLog = Join-Path $logsDir "extract-errors.log"
foreach ($f in @($crawlErrorLog, $imageErrorLog, $zipErrorLog, $extractErrorLog)) {
  if (Test-Path $f) { Remove-Item -Force $f -ErrorAction SilentlyContinue }
}

$pageQueue = [System.Collections.Generic.Queue[string]]::new()
foreach ($s in $seedUrls) { $pageQueue.Enqueue($s) }

$visitedPages = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$imageUrls = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$zipUrls = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

function Normalize-Url([string]$raw, [Uri]$current) {
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }

  $u = $raw.Trim().Trim('"').Trim("'")
  if ($u.StartsWith("#")) { return $null }
  if ($u -match '^(?i)(data:|javascript:|mailto:|tel:)') { return $null }
  if ($u.StartsWith("//")) { $u = "https:" + $u }

  $uri = $null
  if ($u -match '^(?i)https?://') {
    if (-not [Uri]::TryCreate($u, [UriKind]::Absolute, [ref]$uri)) { return $null }
  } else {
    if (-not [Uri]::TryCreate($current, $u, [ref]$uri)) { return $null }
  }

  if ($uri.Scheme -notin @("http", "https")) { return $null }

  $builder = [UriBuilder]$uri
  $builder.Fragment = ""
  return $builder.Uri.AbsoluteUri
}

function Canonical-Page-Url([string]$url) {
  try { $u = [Uri]$url } catch { return $null }
  $builder = [UriBuilder]$u
  $builder.Query = ""
  $builder.Fragment = ""
  return $builder.Uri.AbsoluteUri
}

function Is-Fab-Host([Uri]$u) {
  return $u.Host -in @("fabtcg.com", "www.fabtcg.com")
}

function Is-Image-Url([string]$url) {
  try {
    $path = ([Uri]$url).AbsolutePath
  } catch {
    return $false
  }
  return $path -match '(?i)\.(png|jpe?g|webp|gif|svg|avif)$'
}

function Is-Zip-Url([string]$url) {
  try {
    $path = ([Uri]$url).AbsolutePath
  } catch {
    return $false
  }
  return $path -match '(?i)\.zip$'
}

function Is-Resource-Page([Uri]$u) {
  if (-not (Is-Fab-Host $u)) { return $false }
  $path = $u.AbsolutePath.ToLowerInvariant()
  if (($path -eq "/resources") -or ($path -eq "/resources/")) { return $true }
  if (($path -eq "/en/resources") -or ($path -eq "/en/resources/")) { return $true }
  if ($path.StartsWith("/resources/")) { return $true }
  if ($path.StartsWith("/en/resources/")) { return $true }
  return $false
}

function Is-Probably-Html-Path([Uri]$u) {
  $path = $u.AbsolutePath
  if ([string]::IsNullOrWhiteSpace($path) -or $path.EndsWith("/")) { return $true }
  $ext = [IO.Path]::GetExtension($path)
  return [string]::IsNullOrWhiteSpace($ext)
}

function Parse-Candidate-Urls([string]$content, [Uri]$currentUri) {
  $urls = [System.Collections.Generic.List[string]]::new()

  $attrRegex = '(?i)\b(?:href|src|srcset|data-src|data-original|data-image)\s*=\s*["'']([^"''>]+)["'']'
  $matches = [regex]::Matches($content, $attrRegex)
  foreach ($m in $matches) {
    $val = $m.Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($val)) { continue }
    foreach ($piece in ($val -split ",")) {
      $candidate = ($piece.Trim() -split '\s+')[0]
      $n = Normalize-Url $candidate $currentUri
      if ($n) { $urls.Add($n) }
    }
  }

  $cssRegex = '(?i)url\(([^)]+)\)'
  $styleMatches = [regex]::Matches($content, $cssRegex)
  foreach ($sm in $styleMatches) {
    $candidate = $sm.Groups[1].Value.Trim().Trim('"').Trim("'")
    $n = Normalize-Url $candidate $currentUri
    if ($n) { $urls.Add($n) }
  }

  return $urls
}

function Invoke-WebRequest-Retry([string]$uri, [int]$timeoutSec = 90, [int]$maxAttempts = 3) {
  $attempt = 0
  while ($attempt -lt $maxAttempts) {
    $attempt++
    try {
      return Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec $timeoutSec
    } catch {
      if ($attempt -ge $maxAttempts) { throw }
      Start-Sleep -Seconds ([Math]::Min(12, 2 * $attempt))
    }
  }
}

function Download-ToFile-Retry([string]$uri, [string]$outFile, [int]$timeoutSec = 180, [int]$maxAttempts = 3) {
  $attempt = 0
  while ($attempt -lt $maxAttempts) {
    $attempt++
    try {
      Invoke-WebRequest -Uri $uri -OutFile $outFile -UseBasicParsing -TimeoutSec $timeoutSec
      return
    } catch {
      if ($attempt -ge $maxAttempts) { throw }
      Start-Sleep -Seconds ([Math]::Min(12, 2 * $attempt))
    }
  }
}

$maxPages = 3500
$pageCount = 0
while ($pageQueue.Count -gt 0 -and $pageCount -lt $maxPages) {
  $pageUrl = $pageQueue.Dequeue()
  $pageUrl = Canonical-Page-Url $pageUrl
  if (-not $pageUrl) { continue }
  if (-not $visitedPages.Add($pageUrl)) { continue }
  $pageCount++

  try {
    $resp = Invoke-WebRequest-Retry -uri $pageUrl -timeoutSec 90 -maxAttempts 3
  } catch {
    Add-Content -Path $crawlErrorLog -Value ("PAGE_FAIL`t{0}`t{1}" -f $pageUrl, $_.Exception.Message)
    continue
  }

  $contentType = ""
  if ($resp.Headers -and $resp.Headers["Content-Type"]) {
    $contentType = [string]$resp.Headers["Content-Type"]
  }
  if ($contentType -and ($contentType -notmatch '(?i)text/html')) {
    continue
  }

  $content = [string]$resp.Content
  if ([string]::IsNullOrWhiteSpace($content)) { continue }

  try {
    $currentUri = [Uri]$pageUrl
  } catch {
    continue
  }

  $candidates = Parse-Candidate-Urls -content $content -currentUri $currentUri
  foreach ($n in $candidates) {
    if (Is-Image-Url $n) {
      $imageUrls.Add($n) | Out-Null
      continue
    }
    if (Is-Zip-Url $n) {
      $zipUrls.Add($n) | Out-Null
      continue
    }

    try { $nu = [Uri]$n } catch { continue }
    if (-not (Is-Resource-Page $nu)) { continue }
    if (-not (Is-Probably-Html-Path $nu)) { continue }

    $queued = Canonical-Page-Url $n
    if ($queued) { $pageQueue.Enqueue($queued) }
  }
}

$images = $imageUrls | Sort-Object -Unique
$zips = $zipUrls | Sort-Object -Unique

$images | Set-Content -Path (Join-Path $logsDir "all-image-urls.txt") -Encoding UTF8
$zips | Set-Content -Path (Join-Path $logsDir "all-zip-urls.txt") -Encoding UTF8

function Build-Output-Path([string]$assetUrl, [string]$rootOutDir) {
  $uri = [Uri]$assetUrl
  $path = $uri.AbsolutePath
  if ([string]::IsNullOrWhiteSpace($path) -or $path.EndsWith("/")) {
    $path = $path.TrimEnd("/") + "/index"
  }

  $cleanPath = ($path.TrimStart("/") -replace "/", "\")
  $target = Join-Path $rootOutDir (Join-Path $uri.Host $cleanPath)

  $name = [IO.Path]::GetFileName($target)
  if ([string]::IsNullOrWhiteSpace([IO.Path]::GetExtension($name))) {
    if ($rootOutDir -eq $imagesDir) {
      $target = "$target.jpg"
    } elseif ($rootOutDir -eq $zipsDir) {
      $target = "$target.zip"
    }
  }

  return $target
}

function Download-Asset([string]$assetUrl, [string]$rootOutDir) {
  $target = Build-Output-Path -assetUrl $assetUrl -rootOutDir $rootOutDir
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

  if (Test-Path $target) {
    return @{ status = "skipped"; file = $target }
  }

  Download-ToFile-Retry -uri $assetUrl -outFile $target -timeoutSec 180 -maxAttempts 3
  return @{ status = "downloaded"; file = $target }
}

$imgDownloaded = 0
$imgSkipped = 0
$imgFailed = 0
foreach ($asset in $images) {
  try {
    $result = Download-Asset -assetUrl $asset -rootOutDir $imagesDir
    if ($result.status -eq "downloaded") { $imgDownloaded++ } else { $imgSkipped++ }
  } catch {
    $imgFailed++
    Add-Content -Path $imageErrorLog -Value ("IMG_FAIL`t{0}`t{1}" -f $asset, $_.Exception.Message)
  }
}

$zipDownloaded = 0
$zipSkipped = 0
$zipFailed = 0
$zipFiles = @()
foreach ($asset in $zips) {
  try {
    $result = Download-Asset -assetUrl $asset -rootOutDir $zipsDir
    $zipFiles += $result.file
    if ($result.status -eq "downloaded") { $zipDownloaded++ } else { $zipSkipped++ }
  } catch {
    $zipFailed++
    Add-Content -Path $zipErrorLog -Value ("ZIP_FAIL`t{0}`t{1}" -f $asset, $_.Exception.Message)
  }
}

$extractOk = 0
$extractSkip = 0
$extractFail = 0
$extractedFilesCount = 0
foreach ($zf in ($zipFiles | Sort-Object -Unique)) {
  try {
    if (-not (Test-Path $zf)) { continue }
    $relativeZip = $zf.Substring((Resolve-Path $zipsDir).Path.Length).TrimStart("\")
    $baseDest = Join-Path $extractedDir ([IO.Path]::GetDirectoryName($relativeZip))
    $zipName = [IO.Path]::GetFileNameWithoutExtension($relativeZip)
    $dest = Join-Path $baseDest $zipName

    if ((Test-Path $dest) -and (Get-ChildItem -Recurse -File $dest -ErrorAction SilentlyContinue | Select-Object -First 1)) {
      $extractSkip++
      continue
    }

    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Expand-Archive -Path $zf -DestinationPath $dest -Force
    $extractOk++
  } catch {
    $extractFail++
    Add-Content -Path $extractErrorLog -Value ("EXTRACT_FAIL`t{0}`t{1}" -f $zf, $_.Exception.Message)
  }
}

if (Test-Path $extractedDir) {
  $extractedFilesCount = (Get-ChildItem -Path $extractedDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
}

$summary = [pscustomobject]@{
  CrawledPages = $visitedPages.Count
  DiscoveredImageUrls = $images.Count
  DiscoveredZipUrls = $zips.Count
  ImagesDownloaded = $imgDownloaded
  ImagesSkippedExisting = $imgSkipped
  ImagesFailed = $imgFailed
  ZipsDownloaded = $zipDownloaded
  ZipsSkippedExisting = $zipSkipped
  ZipsFailed = $zipFailed
  ZipExtracted = $extractOk
  ZipExtractSkipped = $extractSkip
  ZipExtractFailed = $extractFail
  ExtractedFiles = $extractedFilesCount
  ImagesDir = $imagesDir
  ZipsDir = $zipsDir
  ExtractedDir = $extractedDir
  LogsDir = $logsDir
}

$summary | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $logsDir "summary.json") -Encoding UTF8
$summary | Format-List
