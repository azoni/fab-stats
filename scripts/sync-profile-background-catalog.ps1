param(
  [switch]$DryRun,
  [int]$ThumbWidth = 480,
  [long]$MaxFullBytes = 8MB,
  [long]$MaxThumbBytes = 800KB,
  [long]$ThumbQuality = 70L,
  [string]$ProjectId = "",
  [string]$Bucket = "",
  [string]$ManifestPath = ""
)

$ErrorActionPreference = "Stop"

function Get-EnvValueFromFile([string]$filePath, [string]$key) {
  if (-not (Test-Path $filePath)) { return $null }
  $line = Get-Content $filePath | Where-Object { $_ -match "^$([regex]::Escape($key))=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -split "=", 2)[1].Trim()
}

function Ensure-Directory([string]$path) {
  New-Item -ItemType Directory -Force -Path $path | Out-Null
}

function Assert-ValidBackgroundId([string]$id) {
  if ([string]::IsNullOrWhiteSpace($id) -or $id -notmatch '^[A-Za-z0-9][A-Za-z0-9-]{1,79}$') {
    throw "Invalid background id '$id'. IDs must match ^[A-Za-z0-9][A-Za-z0-9-]{1,79}$"
  }
}

function Assert-FileWithinBytes([string]$path, [long]$maxBytes, [string]$label) {
  $size = (Get-Item $path).Length
  if ($size -gt $maxBytes) {
    throw "$label exceeds limit: $size bytes > $maxBytes bytes (`"$path`")"
  }
}

function Convert-ManifestToOptions([string]$manifestPath) {
  if (-not (Test-Path $manifestPath)) {
    throw "Manifest file not found: $manifestPath"
  }
  $manifestJson = Get-Content $manifestPath -Raw | ConvertFrom-Json
  if (-not ($manifestJson -is [System.Collections.IEnumerable])) {
    throw "Manifest must be a JSON array of background option objects."
  }

  $parsed = @()
  foreach ($entry in $manifestJson) {
    if (-not $entry.id -or -not $entry.label -or -not $entry.kind) {
      throw "Manifest entries must include id, label, and kind."
    }
    $hasFile = ($entry.PSObject.Properties.Name -contains 'file') -and -not [string]::IsNullOrWhiteSpace([string]$entry.file)
    $hasSourcePath = ($entry.PSObject.Properties.Name -contains 'sourcePath') -and -not [string]::IsNullOrWhiteSpace([string]$entry.sourcePath)
    if (-not $hasFile -and -not $hasSourcePath) {
      throw "Manifest entry '$($entry.id)' must include either file or sourcePath."
    }
    $fileValue = if ($hasFile) { [string]$entry.file } else { [System.IO.Path]::GetFileName([string]$entry.sourcePath) }
    $parsed += @{
      id = [string]$entry.id
      label = [string]$entry.label
      file = $fileValue
      sourcePath = if ($hasSourcePath) { [string]$entry.sourcePath } else { $null }
      kind = [string]$entry.kind
      focusPosition = if ($entry.PSObject.Properties.Name -contains 'focusPosition') { [string]$entry.focusPosition } else { "center center" }
      adminOnly = if ($entry.PSObject.Properties.Name -contains 'adminOnly') { [bool]$entry.adminOnly } else { $false }
    }
  }
  return $parsed
}

function Get-FirebaseAccessToken() {
  try {
    $nodeScript = @"
const fs = require('fs');
const path = require('path');
const cfgPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const authPath = path.join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools', 'lib', 'auth.js');
const auth = require(authPath);
const scopes = [
  'email',
  'openid',
  'https://www.googleapis.com/auth/cloudplatformprojects.readonly',
  'https://www.googleapis.com/auth/firebase',
  'https://www.googleapis.com/auth/cloud-platform',
];
auth.getAccessToken(cfg.tokens.refresh_token, scopes).then((tokenData) => {
  process.stdout.write(tokenData.access_token || '');
}).catch((err) => {
  process.stderr.write(String(err && err.message ? err.message : err));
  process.exit(1);
});
"@
    $cliToken = (& node -e $nodeScript 2>$null)
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($cliToken)) {
      return $cliToken.Trim()
    }
  } catch {
    # Fall back to cached token below.
  }

  $configPath = Join-Path $env:USERPROFILE ".config\configstore\firebase-tools.json"
  if (-not (Test-Path $configPath)) {
    throw "Firebase CLI token cache not found at $configPath. Run `firebase login` first."
  }
  $json = Get-Content $configPath | ConvertFrom-Json
  $token = $json.tokens.access_token
  if ([string]::IsNullOrWhiteSpace($token)) {
    throw "No Firebase access token found in CLI cache."
  }
  return $token
}

function New-JpegThumbnail([string]$sourcePath, [string]$outputPath, [int]$targetWidth = 480, [long]$quality = 70L) {
  Add-Type -AssemblyName System.Drawing

  $srcImage = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $ratio = [double]$targetWidth / [double]$srcImage.Width
    $targetHeight = [int][Math]::Round($srcImage.Height * $ratio)
    if ($targetHeight -lt 1) { $targetHeight = 1 }

    $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.DrawImage($srcImage, 0, 0, $targetWidth, $targetHeight)
      } finally {
        $graphics.Dispose()
      }

      $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" } | Select-Object -First 1
      if (-not $jpegCodec) {
        throw "JPEG codec unavailable for thumbnail generation."
      }

      $encoder = [System.Drawing.Imaging.Encoder]::Quality
      $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, $quality)
      try {
        $bitmap.Save($outputPath, $jpegCodec, $encoderParams)
      } finally {
        $encoderParams.Dispose()
      }
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $srcImage.Dispose()
  }
}

function Upload-StorageObject(
  [string]$bucket,
  [string]$objectPath,
  [string]$filePath,
  [string]$contentType,
  [string]$accessToken
) {
  $encodedName = [System.Uri]::EscapeDataString($objectPath)
  $uri = "https://storage.googleapis.com/upload/storage/v1/b/$bucket/o?uploadType=media&name=$encodedName"
  Invoke-RestMethod `
    -Method Post `
    -Uri $uri `
    -Headers @{ Authorization = "Bearer $accessToken" } `
    -InFile $filePath `
    -ContentType $contentType `
    -TimeoutSec 180 | Out-Null
}

function To-FirestoreFields([hashtable]$data) {
  $fields = @{}
  foreach ($k in $data.Keys) {
    $v = $data[$k]
    if ($null -eq $v) { continue }
    if ($v -is [string]) {
      $fields[$k] = @{ stringValue = $v }
    } elseif ($v -is [bool]) {
      $fields[$k] = @{ booleanValue = $v }
    } elseif ($v -is [int] -or $v -is [long]) {
      $fields[$k] = @{ integerValue = [string]$v }
    } elseif ($v -is [double] -or $v -is [float] -or $v -is [decimal]) {
      $fields[$k] = @{ doubleValue = [double]$v }
    } else {
      $fields[$k] = @{ stringValue = [string]$v }
    }
  }
  return $fields
}

function Upsert-FirestoreCatalogDoc(
  [string]$projectId,
  [string]$docId,
  [hashtable]$payload,
  [string]$accessToken
) {
  $uri = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/profileBackgroundCatalog/$docId"
  $body = @{
    fields = (To-FirestoreFields $payload)
  } | ConvertTo-Json -Depth 8

  Invoke-RestMethod `
    -Method Patch `
    -Uri $uri `
    -Headers @{ Authorization = "Bearer $accessToken" } `
    -Body $body `
    -ContentType "application/json" `
    -TimeoutSec 120 | Out-Null
}

$root = Get-Location
$envFile = Join-Path $root ".env.local"

$resolvedProjectId = if ([string]::IsNullOrWhiteSpace($ProjectId)) { Get-EnvValueFromFile $envFile "NEXT_PUBLIC_FIREBASE_PROJECT_ID" } else { $ProjectId }
$resolvedBucket = if ([string]::IsNullOrWhiteSpace($Bucket)) { Get-EnvValueFromFile $envFile "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" } else { $Bucket }
if ([string]::IsNullOrWhiteSpace($resolvedProjectId)) { $resolvedProjectId = "fab-stats-fc757" }
if ([string]::IsNullOrWhiteSpace($resolvedBucket)) { $resolvedBucket = "fab-stats-fc757.firebasestorage.app" }

$accessToken = $null
if (-not $DryRun) {
  $accessToken = Get-FirebaseAccessToken
}

$sourceDir = Join-Path $root "public\backgrounds\fab-official"
$thumbDir = Join-Path $root "tmp\background-thumbs"
Ensure-Directory $thumbDir
$defaultManifestPath = Join-Path $root "config\profile-background-manifest.json"
if ([string]::IsNullOrWhiteSpace($ManifestPath) -and (Test-Path $defaultManifestPath)) {
  $ManifestPath = $defaultManifestPath
}

$options = if (-not [string]::IsNullOrWhiteSpace($ManifestPath)) {
  Convert-ManifestToOptions $ManifestPath
} else {
  @(
    @{ id = "wtr-key-art-v1"; label = "Welcome to Rathe"; file = "wtr-key-art-v1.jpg"; kind = "key-art"; focusPosition = "center top"; adminOnly = $false },
    @{ id = "arcane-rising-key-art"; label = "Arcane Rising"; file = "arcane-rising-key-art.jpg"; kind = "key-art"; focusPosition = "center top"; adminOnly = $false },
    @{ id = "monarch-key-art"; label = "Monarch"; file = "monarch-key-art.jpg"; kind = "key-art"; focusPosition = "center top"; adminOnly = $false },
    @{ id = "tales-of-aria-key-art"; label = "Tales of Aria"; file = "tales-of-aria-key-art.jpg"; kind = "key-art"; focusPosition = "center top"; adminOnly = $false },
    @{ id = "playmat-aria"; label = "Aria Playmat"; file = "lore-aria-matte.jpg"; kind = "playmat"; focusPosition = "center center"; adminOnly = $false },
    @{ id = "playmat-solana"; label = "Solana Playmat"; file = "lore-solana-matte.jpg"; kind = "playmat"; focusPosition = "center center"; adminOnly = $false },
    @{ id = "playmat-volcor"; label = "Volcor Playmat"; file = "lore-volcor-matte.jpg"; kind = "playmat"; focusPosition = "center center"; adminOnly = $false },
    @{ id = "wtr-key-art-v2"; label = "Rathe Alt Key Art"; file = "wtr-key-art-v2.jpg"; kind = "key-art"; focusPosition = "center top"; adminOnly = $true },
    @{ id = "hunted-key-art"; label = "The Hunted"; file = "hunted-key-art.jpg"; kind = "key-art"; focusPosition = "center top"; adminOnly = $true },
    @{ id = "hunted-cindra-adult"; label = "Cindra (The Hunted)"; file = "hunted-cindra-adult.jpg"; kind = "hero-art"; focusPosition = "50% 18%"; adminOnly = $true },
    @{ id = "hunted-fang-adult"; label = "Fang (The Hunted)"; file = "hunted-fang-adult.jpg"; kind = "hero-art"; focusPosition = "50% 20%"; adminOnly = $true },
    @{ id = "hunted-arakni-adult"; label = "Arakni (The Hunted)"; file = "hunted-arakni-adult.jpg"; kind = "hero-art"; focusPosition = "50% 22%"; adminOnly = $true },
    @{ id = "high-seas-marlynn"; label = "Marlynn (High Seas)"; file = "high-seas-marlynn.jpg"; kind = "hero-art"; focusPosition = "52% 18%"; adminOnly = $true },
    @{ id = "high-seas-puffin"; label = "Puffin (High Seas)"; file = "high-seas-puffin.jpg"; kind = "hero-art"; focusPosition = "52% 20%"; adminOnly = $true },
    @{ id = "high-seas-gravybones"; label = "Gravy Bones (High Seas)"; file = "high-seas-gravybones.jpg"; kind = "hero-art"; focusPosition = "50% 20%"; adminOnly = $true }
  )
}

if ($options.Count -eq 0) {
  throw "No background options found to sync."
}

$seenIds = @{}
for ($i = 0; $i -lt $options.Count; $i++) {
  $opt = $options[$i]
  Assert-ValidBackgroundId ([string]$opt.id)
  if ($seenIds.ContainsKey($opt.id)) {
    throw "Duplicate background id in options: $($opt.id)"
  }
  $seenIds[$opt.id] = $true
  if ($opt.kind -notin @("key-art", "playmat", "hero-art")) {
    throw "Invalid kind '$($opt.kind)' for id '$($opt.id)'."
  }
}

$uploadedFull = 0
$uploadedThumb = 0
$docsUpserted = 0
$updatedAt = (Get-Date).ToUniversalTime().ToString("o")

for ($i = 0; $i -lt $options.Count; $i++) {
  $opt = $options[$i]
  $fullPath = if (-not [string]::IsNullOrWhiteSpace([string]$opt.sourcePath)) {
    if ([System.IO.Path]::IsPathRooted([string]$opt.sourcePath)) {
      [string]$opt.sourcePath
    } else {
      Join-Path $root ([string]$opt.sourcePath)
    }
  } else {
    Join-Path $sourceDir $opt.file
  }
  if (-not (Test-Path $fullPath)) {
    throw "Missing source image: $fullPath"
  }
  Assert-FileWithinBytes -path $fullPath -maxBytes $MaxFullBytes -label "Full image $($opt.id)"

  $thumbPath = Join-Path $thumbDir ("{0}.jpg" -f $opt.id)
  New-JpegThumbnail -sourcePath $fullPath -outputPath $thumbPath -targetWidth $ThumbWidth -quality $ThumbQuality
  Assert-FileWithinBytes -path $thumbPath -maxBytes $MaxThumbBytes -label "Thumbnail $($opt.id)"

  $fullExt = [System.IO.Path]::GetExtension($fullPath).TrimStart('.').ToLowerInvariant()
  if ($fullExt -notin @("jpg", "jpeg", "png", "webp")) {
    throw "Unsupported source extension '$fullExt' for $fullPath"
  }
  $fullContentType = if ($fullExt -in @("jpg", "jpeg")) { "image/jpeg" } elseif ($fullExt -eq "png") { "image/png" } else { "image/webp" }

  $fullObjectPath = "profile-backgrounds/full/{0}.{1}" -f $opt.id, $fullExt
  $thumbObjectPath = "profile-backgrounds/thumb/{0}.jpg" -f $opt.id

  if (-not $DryRun) {
    Upload-StorageObject -bucket $resolvedBucket -objectPath $fullObjectPath -filePath $fullPath -contentType $fullContentType -accessToken $accessToken
    $uploadedFull++
    Upload-StorageObject -bucket $resolvedBucket -objectPath $thumbObjectPath -filePath $thumbPath -contentType "image/jpeg" -accessToken $accessToken
    $uploadedThumb++
  }

  $fullUrl = "https://firebasestorage.googleapis.com/v0/b/{0}/o/{1}?alt=media" -f $resolvedBucket, [System.Uri]::EscapeDataString($fullObjectPath)
  $thumbUrl = "https://firebasestorage.googleapis.com/v0/b/{0}/o/{1}?alt=media" -f $resolvedBucket, [System.Uri]::EscapeDataString($thumbObjectPath)
  $payload = @{
    id = $opt.id
    label = $opt.label
    imageUrl = $fullUrl
    thumbnailUrl = $thumbUrl
    kind = $opt.kind
    focusPosition = $opt.focusPosition
    adminOnly = [bool]$opt.adminOnly
    sortOrder = [int]$i
    isActive = $true
    updatedAt = $updatedAt
  }

  if (-not $DryRun) {
    Upsert-FirestoreCatalogDoc -projectId $resolvedProjectId -docId $opt.id -payload $payload -accessToken $accessToken
    $docsUpserted++
  }

  Write-Output ("[{0}/{1}] {2} {3}" -f ($i + 1), $options.Count, $(if ($DryRun) { "Validated" } else { "Synced" }), $opt.id)
}

$summary = [pscustomobject]@{
  DryRun = [bool]$DryRun
  ProjectId = $resolvedProjectId
  Bucket = $resolvedBucket
  Processed = $options.Count
  FullUploaded = $uploadedFull
  ThumbsUploaded = $uploadedThumb
  DocsUpserted = $docsUpserted
  ThumbnailDir = $thumbDir
  MaxFullBytes = $MaxFullBytes
  MaxThumbBytes = $MaxThumbBytes
}

$summary | Format-List
