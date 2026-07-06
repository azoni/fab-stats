$ErrorActionPreference = "Stop"

$baseUri = [Uri]"https://fabtcg.com/en/resources/digital-assets/"
$rootDir = Join-Path (Get-Location) "vendor\fabtcg-digital-assets"
$imagesDir = Join-Path $rootDir "images"
$logsDir = Join-Path $rootDir "logs"
New-Item -ItemType Directory -Force -Path $imagesDir, $logsDir | Out-Null

$pageQueue = [System.Collections.Generic.Queue[string]]::new()
$pageQueue.Enqueue($baseUri.AbsoluteUri)
$visitedPages = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$assetUrls = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

function Normalize-Url([string]$raw, [Uri]$current) {
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  $u = $raw.Trim().Trim("'").Trim('"')
  if ($u.StartsWith("data:")) { return $null }
  if ($u.StartsWith("javascript:")) { return $null }
  if ($u.StartsWith("#")) { return $null }
  if ($u.StartsWith("//")) { $u = "https:" + $u }

  try {
    if ($u.StartsWith("http://") -or $u.StartsWith("https://")) {
      $uri = [Uri]$u
    } else {
      $uri = [Uri]::new($current, $u)
    }
  } catch {
    return $null
  }

  return $uri.GetLeftPart([System.UriPartial]::Path)
}

function Is-Image-Url([string]$url) {
  return $url -match '(?i)\.(png|jpe?g|webp|gif|svg|avif)$'
}

function Is-DigitalAsset-Page([Uri]$u) {
  if ($u.Host -notin @("fabtcg.com", "www.fabtcg.com")) { return $false }
  return $u.AbsolutePath -like "/en/resources/digital-assets/*"
}

$maxPages = 3000
$pageCount = 0
while ($pageQueue.Count -gt 0 -and $pageCount -lt $maxPages) {
  $pageUrl = $pageQueue.Dequeue()
  if (-not $visitedPages.Add($pageUrl)) { continue }
  $pageCount++

  try {
    $resp = Invoke-WebRequest -Uri $pageUrl -UseBasicParsing -TimeoutSec 90
  } catch {
    Add-Content -Path (Join-Path $logsDir "crawl-errors.log") -Value ("PAGE_FAIL`t{0}`t{1}" -f $pageUrl, $_.Exception.Message)
    continue
  }

  $content = $resp.Content
  try {
    $currentUri = [Uri]$pageUrl
  } catch {
    continue
  }

  $attrMatches = [regex]::Matches($content, "(?i)(?:href|src|srcset|data-src|data-original|data-image|content)\s*=\s*[""`'][^""`']+[""`']")
  foreach ($m in $attrMatches) {
    $pair = $m.Value
    $eq = $pair.IndexOf("=")
    if ($eq -lt 0) { continue }
    $rawVal = $pair.Substring($eq + 1).Trim().Trim('"').Trim("'")

    foreach ($piece in ($rawVal -split ",")) {
      $candidate = ($piece -split "\s+")[0]
      $n = Normalize-Url $candidate $currentUri
      if (-not $n) { continue }

      try { $nu = [Uri]$n } catch { continue }

      if (Is-Image-Url $n) {
        $assetUrls.Add($n) | Out-Null
      }

      if (Is-DigitalAsset-Page $nu) {
        $pageQueue.Enqueue($n)
      }
    }
  }

  $styleMatches = [regex]::Matches($content, "(?i)url\(([^\)]+)\)")
  foreach ($sm in $styleMatches) {
    $raw = $sm.Groups[1].Value.Trim().Trim('"').Trim("'")
    $n = Normalize-Url $raw $currentUri
    if (-not $n) { continue }
    if (Is-Image-Url $n) {
      $assetUrls.Add($n) | Out-Null
    }
  }
}

$assets = $assetUrls | Sort-Object
$assets | Set-Content -Path (Join-Path $logsDir "all-image-urls.txt") -Encoding UTF8

$downloaded = 0
$skipped = 0
$failed = 0
foreach ($asset in $assets) {
  try {
    $uri = [Uri]$asset
    $relative = ($uri.Host + $uri.AbsolutePath).TrimStart("/")
    $target = Join-Path $imagesDir ($relative -replace "/", "\")
    $targetDir = Split-Path -Parent $target
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

    if (Test-Path $target) {
      $skipped++
      continue
    }

    Invoke-WebRequest -Uri $asset -OutFile $target -UseBasicParsing -TimeoutSec 120
    $downloaded++
  } catch {
    $failed++
    Add-Content -Path (Join-Path $logsDir "download-errors.log") -Value ("ASSET_FAIL`t{0}`t{1}" -f $asset, $_.Exception.Message)
  }
}

$summary = [pscustomobject]@{
  CrawledPages = $visitedPages.Count
  DiscoveredImageUrls = $assets.Count
  Downloaded = $downloaded
  SkippedExisting = $skipped
  Failed = $failed
  OutputDir = $imagesDir
}
$summary | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $logsDir "summary.json") -Encoding UTF8
$summary | Format-List
