param(
  [string]$OutputPath = "config/profile-background-manifest.json",
  [int]$MinWidth = 600,
  [int]$MinHeight = 350,
  [long]$MaxBytes = 8MB
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Web

function Normalize-RelPath([string]$path) {
  return (($path -replace "\\", "/").TrimStart("./")).ToLowerInvariant()
}

function To-RelPath([string]$rootPath, [string]$fullPath) {
  $root = (Resolve-Path $rootPath).Path
  $full = (Resolve-Path $fullPath).Path
  if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Path '$fullPath' is not under root '$rootPath'."
  }
  $rel = $full.Substring($root.Length).TrimStart("\", "/")
  return ($rel -replace "\\", "/")
}

function New-Slug([string]$text) {
  $slug = ($text.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) { return "background" }
  return $slug
}

function Ensure-UniqueId([string]$candidate, [hashtable]$seenIds) {
  $id = $candidate
  $suffix = 2
  while ($seenIds.ContainsKey($id)) {
    $id = "{0}-{1}" -f $candidate, $suffix
    if ($id.Length -gt 80) {
      $trim = [Math]::Max(1, 80 - ("-{0}" -f $suffix).Length)
      $id = "{0}-{1}" -f $candidate.Substring(0, $trim).Trim("-"), $suffix
    }
    $suffix++
  }
  $seenIds[$id] = $true
  return $id
}

function Read-ImageDimensions([string]$path) {
  $img = [System.Drawing.Image]::FromFile($path)
  try {
    return [pscustomobject]@{
      Width = [int]$img.Width
      Height = [int]$img.Height
    }
  } finally {
    $img.Dispose()
  }
}

function Get-FileHashShort([string]$path) {
  $hash = (Get-FileHash -Path $path -Algorithm SHA1).Hash.ToLowerInvariant()
  return $hash.Substring(0, 8)
}

function Get-CanonicalVariantKey([string]$fileName) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($fileName).ToLowerInvariant()
  # Drop explicit resize suffixes such as -720x405 or _1024x576.
  $name = $name -replace "([_-])\d{3,4}x\d{3,4}$", ""
  # Drop repeated "-scaled" suffixes from exported variants.
  $name = $name -replace "(-scaled)+$", ""
  return $name
}

function Infer-Kind([string]$fileName, [double]$aspectRatio) {
  $name = $fileName.ToLowerInvariant()
  if ($name -match "playmat|matte|mat-") { return "playmat" }
  if ($aspectRatio -lt 1.2) { return "hero-art" }
  return "key-art"
}

function Infer-Focus([string]$kind, [double]$aspectRatio) {
  if ($kind -eq "playmat") { return "center center" }
  if ($kind -eq "hero-art" -or $aspectRatio -lt 1.2) { return "50% 18%" }
  return "center top"
}

function Title-FromFile([string]$fileName) {
  $base = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
  $base = $base -replace "_", " " -replace "-", " "
  $base = ($base -replace "\s+", " ").Trim()
  if ([string]::IsNullOrWhiteSpace($base)) { return "Background" }
  return [System.Globalization.CultureInfo]::InvariantCulture.TextInfo.ToTitleCase($base.ToLowerInvariant())
}

$repoRoot = Get-Location
$outputFile = Join-Path $repoRoot $OutputPath
$outputDir = Split-Path -Parent $outputFile
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$existing = @()
if (Test-Path $outputFile) {
  try {
    $existingRaw = Get-Content $outputFile -Raw | ConvertFrom-Json
    if ($existingRaw -is [System.Collections.IEnumerable]) {
      $existing = @($existingRaw)
    }
  } catch {
    Write-Warning "Unable to parse existing manifest, continuing with fresh generation."
  }
}

$existingBySource = @{}
$existingById = @{}
foreach ($entry in $existing) {
  if ($entry.id) { $existingById[[string]$entry.id] = $entry }
  if ($entry.PSObject.Properties.Name -contains "sourcePath" -and $entry.sourcePath) {
    $existingBySource[(Normalize-RelPath ([string]$entry.sourcePath))] = $entry
  }
}

$curated = @(
  @{ file = "wtr-key-art-v1.jpg"; id = "wtr-key-art-v1"; label = "Welcome to Rathe"; kind = "key-art"; focusPosition = "center top"; adminOnly = $false },
  @{ file = "arcane-rising-key-art.jpg"; id = "arcane-rising-key-art"; label = "Arcane Rising"; kind = "key-art"; focusPosition = "center top"; adminOnly = $false },
  @{ file = "monarch-key-art.jpg"; id = "monarch-key-art"; label = "Monarch"; kind = "key-art"; focusPosition = "center top"; adminOnly = $false },
  @{ file = "tales-of-aria-key-art.jpg"; id = "tales-of-aria-key-art"; label = "Tales of Aria"; kind = "key-art"; focusPosition = "center top"; adminOnly = $false },
  @{ file = "lore-aria-matte.jpg"; id = "playmat-aria"; label = "Aria Playmat"; kind = "playmat"; focusPosition = "center center"; adminOnly = $false },
  @{ file = "lore-solana-matte.jpg"; id = "playmat-solana"; label = "Solana Playmat"; kind = "playmat"; focusPosition = "center center"; adminOnly = $false },
  @{ file = "lore-volcor-matte.jpg"; id = "playmat-volcor"; label = "Volcor Playmat"; kind = "playmat"; focusPosition = "center center"; adminOnly = $false },
  @{ file = "wtr-key-art-v2.jpg"; id = "wtr-key-art-v2"; label = "Rathe Alt Key Art"; kind = "key-art"; focusPosition = "center top"; adminOnly = $true },
  @{ file = "hunted-key-art.jpg"; id = "hunted-key-art"; label = "The Hunted"; kind = "key-art"; focusPosition = "center top"; adminOnly = $true },
  @{ file = "hunted-cindra-adult.jpg"; id = "hunted-cindra-adult"; label = "Cindra (The Hunted)"; kind = "hero-art"; focusPosition = "50% 18%"; adminOnly = $true },
  @{ file = "hunted-fang-adult.jpg"; id = "hunted-fang-adult"; label = "Fang (The Hunted)"; kind = "hero-art"; focusPosition = "50% 20%"; adminOnly = $true },
  @{ file = "hunted-arakni-adult.jpg"; id = "hunted-arakni-adult"; label = "Arakni (The Hunted)"; kind = "hero-art"; focusPosition = "50% 22%"; adminOnly = $true },
  @{ file = "high-seas-marlynn.jpg"; id = "high-seas-marlynn"; label = "Marlynn (High Seas)"; kind = "hero-art"; focusPosition = "52% 18%"; adminOnly = $true },
  @{ file = "high-seas-puffin.jpg"; id = "high-seas-puffin"; label = "Puffin (High Seas)"; kind = "hero-art"; focusPosition = "52% 20%"; adminOnly = $true },
  @{ file = "high-seas-gravybones.jpg"; id = "high-seas-gravybones"; label = "Gravy Bones (High Seas)"; kind = "hero-art"; focusPosition = "50% 20%"; adminOnly = $true }
)

$curatedByFile = @{}
foreach ($c in $curated) {
  $curatedByFile[$c.file.ToLowerInvariant()] = $c
}

$ignoreNameRegex = "(logo|favicon|icon|thumbnail|thumb|placeholder|sprite|badge|avatar)"

$sourceRoots = @(
  "public/backgrounds/fab-official",
  "vendor/fabtcg-digital-assets-full/images",
  "vendor/fabtcg-digital-assets-full/extracted"
)

$candidates = @()
foreach ($root in $sourceRoots) {
  $absRoot = Join-Path $repoRoot $root
  if (-not (Test-Path $absRoot)) { continue }
  $files = Get-ChildItem -Path $absRoot -Recurse -File -Include *.jpg, *.jpeg, *.png
  foreach ($file in $files) {
    $fileName = $file.Name.ToLowerInvariant()
    if ($fileName -match $ignoreNameRegex) { continue }
    if ($file.Length -gt $MaxBytes) { continue }

    $dimensions = $null
    try {
      $dimensions = Read-ImageDimensions -path $file.FullName
    } catch {
      continue
    }
    if ($dimensions.Width -lt $MinWidth -or $dimensions.Height -lt $MinHeight) { continue }

    $relPath = To-RelPath -rootPath $repoRoot -fullPath $file.FullName
    $hash = Get-FileHashShort -path $file.FullName
    $candidates += [pscustomobject]@{
      FullPath = $file.FullName
      RelPath = $relPath
      FileName = $file.Name
      LowerFileName = $fileName
      Width = $dimensions.Width
      Height = $dimensions.Height
      Aspect = [Math]::Round($dimensions.Width / [double]$dimensions.Height, 3)
      Size = $file.Length
      Hash = $hash
      SourceRoot = $root
    }
  }
}

if ($candidates.Count -eq 0) {
  throw "No candidate background images found."
}

# Deduplicate identical files by SHA1 hash.
$dedupedByHash = @()
$seenHashes = @{}
foreach ($candidate in ($candidates | Sort-Object RelPath)) {
  if ($seenHashes.ContainsKey($candidate.Hash)) { continue }
  $seenHashes[$candidate.Hash] = $true
  $dedupedByHash += $candidate
}

# Deduplicate obvious resized variants by canonical base name, keeping highest-resolution source.
$deduped = @()
$variantBuckets = @{}
foreach ($candidate in $dedupedByHash) {
  $key = Get-CanonicalVariantKey -fileName $candidate.FileName
  if (-not $variantBuckets.ContainsKey($key)) {
    $variantBuckets[$key] = @()
  }
  $variantBuckets[$key] += $candidate
}

foreach ($key in ($variantBuckets.Keys | Sort-Object)) {
  $best = $variantBuckets[$key] |
    Sort-Object @{ Expression = { $_.Width * $_.Height }; Descending = $true }, @{ Expression = { $_.Size }; Descending = $true }, RelPath |
    Select-Object -First 1
  $deduped += $best
}

$manifestRows = @()
$seenIds = @{}

function Merge-OptionalFields([hashtable]$target, $source) {
  foreach ($field in @("unlockType", "unlockKey", "unlockLabel")) {
    if ($source.PSObject.Properties.Name -contains $field -and $source.$field) {
      $target[$field] = [string]$source.$field
    }
  }
}

# Keep curated options first and stable.
foreach ($curatedRow in $curated) {
  $match = $deduped | Where-Object { $_.LowerFileName -eq $curatedRow.file.ToLowerInvariant() } | Select-Object -First 1
  if (-not $match) { continue }

  $row = [ordered]@{
    id = [string]$curatedRow.id
    label = [string]$curatedRow.label
    kind = [string]$curatedRow.kind
    focusPosition = [string]$curatedRow.focusPosition
    adminOnly = [bool]$curatedRow.adminOnly
  }

  if ($match.SourceRoot -eq "public/backgrounds/fab-official") {
    $row["file"] = [string]$match.FileName
  } else {
    $row["sourcePath"] = [string]$match.RelPath
  }

  $existingSource = $existingBySource[(Normalize-RelPath $match.RelPath)]
  if ($existingSource) {
    Merge-OptionalFields -target $row -source $existingSource
  }

  $row.id = Ensure-UniqueId -candidate $row.id -seenIds $seenIds
  $manifestRows += [pscustomobject]$row
}

# Add everything else as admin-only catalog entries.
foreach ($match in ($deduped | Sort-Object RelPath)) {
  if ($curatedByFile.ContainsKey($match.LowerFileName)) { continue }

  $normalizedSource = Normalize-RelPath $match.RelPath
  $existingSource = $existingBySource[$normalizedSource]

  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($match.FileName)
  $slug = New-Slug $baseName
  $generatedId = if ($slug.Length -gt 68) { $slug.Substring(0, 68).Trim("-") } else { $slug }
  $generatedId = "{0}-{1}" -f $generatedId, $match.Hash.Substring(0, 6)
  if ($generatedId.Length -gt 80) { $generatedId = $generatedId.Substring(0, 80).Trim("-") }

  $kind = Infer-Kind -fileName $match.FileName -aspectRatio $match.Aspect
  $focus = Infer-Focus -kind $kind -aspectRatio $match.Aspect
  $label = Title-FromFile -fileName $match.FileName

  $row = [ordered]@{
    id = if ($existingSource -and $existingSource.id) { [string]$existingSource.id } else { $generatedId }
    label = if ($existingSource -and $existingSource.label) { [string]$existingSource.label } else { $label }
    kind = if ($existingSource -and $existingSource.kind) { [string]$existingSource.kind } else { $kind }
    focusPosition = if ($existingSource -and $existingSource.focusPosition) { [string]$existingSource.focusPosition } else { $focus }
    adminOnly = if ($existingSource -and $existingSource.PSObject.Properties.Name -contains "adminOnly") { [bool]$existingSource.adminOnly } else { $true }
    sourcePath = [string]$match.RelPath
  }

  if ($existingSource) {
    Merge-OptionalFields -target $row -source $existingSource
  }

  $row.id = Ensure-UniqueId -candidate $row.id -seenIds $seenIds
  $manifestRows += [pscustomobject]$row
}

$sortedRows = @()
$curatedIds = @($curated | ForEach-Object { $_.id })
foreach ($id in $curatedIds) {
  $entry = $manifestRows | Where-Object { $_.id -eq $id } | Select-Object -First 1
  if ($entry) { $sortedRows += $entry }
}

$extraRows = $manifestRows | Where-Object { $curatedIds -notcontains $_.id } | Sort-Object label, id
$sortedRows += $extraRows

$json = $sortedRows | ConvertTo-Json -Depth 8
Set-Content -Path $outputFile -Value $json -Encoding UTF8

$publicCount = ($sortedRows | Where-Object { $_.adminOnly -ne $true }).Count
$adminCount = ($sortedRows | Where-Object { $_.adminOnly -eq $true }).Count

Write-Output "Wrote manifest: $OutputPath"
Write-Output ("Total entries: {0}" -f $sortedRows.Count)
Write-Output ("Public entries: {0}" -f $publicCount)
Write-Output ("Admin-only entries: {0}" -f $adminCount)
Write-Output ("Source candidates: {0}" -f $candidates.Count)
Write-Output ("After hash dedupe: {0}" -f $dedupedByHash.Count)
Write-Output ("After variant dedupe: {0}" -f $deduped.Count)
