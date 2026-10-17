<#
  わかば charkit：キャラクター制作に関わる利用者の PC の環境を調べる（読むだけ）スクリプト
  ------------------------------------------------------------------
  - mapkit の survey_local.ps1（PC・GPU・ディスク・UE・Blender・Gaea・開発ツール）の続き。重なる項目は調べない。
  - 何もインストールしない・何も書き換えない・ネットワークに接続しない。アプリは起動しない（版はファイルのプロパティ・設定ファイルの文字から読む）。
  - 結果は JSON で画面に出す（-OutFile を付けるとそのファイルに保存。保存するのはその 1 ファイルだけ）。
  - -SearchPaths に書いた場所だけで、モデル・モーションのファイルを「数える」（中身は読まない。名前は最大 -MaxNames 件）。
  - -Redact を付けると、パスの中のユーザー名を <user> に置き換える（共有する前に推奨）。
  - このスクリプトはクラウド（Linux）で書いたもので、Windows 上では未実行（未検証）。エラーが出たら画面の文字をそのまま伝えてください。

  使い方（PowerShell を「通常の権限」で開いて）：
    powershell -ExecutionPolicy Bypass -File .\survey_local_char.ps1 -Redact
    powershell -ExecutionPolicy Bypass -File .\survey_local_char.ps1 -Redact -OutFile .\survey_char.json -SearchPaths "D:\Models","$env:USERPROFILE\Documents"
#>
[CmdletBinding()]
param(
  [string]$OutFile = "",
  [string[]]$SearchPaths = @(),
  [int]$MaxNames = 30,
  [switch]$Redact
)
$ErrorActionPreference = 'SilentlyContinue'

function Hide([string]$s) {
  if (-not $Redact -or -not $s) { return $s }
  return ($s -replace [regex]::Escape($env:USERNAME), '<user>')
}
function FileVer([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { return $null }
  $v = (Get-Item -LiteralPath $p).VersionInfo
  return [ordered]@{ path = (Hide $p); product = $v.ProductVersion; file = $v.FileVersion }
}
function CmdVer([string]$name, [string]$arg = '--version') {
  $c = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $c) { return $null }
  $out = ''
  try { $out = (& $c.Source $arg 2>&1 | Select-Object -First 1) -join ' ' } catch { $out = 'error' }
  return [ordered]@{ path = (Hide $c.Source); version = "$out".Trim() }
}
function FindExe([string[]]$bases, [string[]]$names, [int]$depth = 3) {
  $hits = @()
  foreach ($b in $bases) {
    if ($b -and (Test-Path -LiteralPath $b)) {
      Get-ChildItem -LiteralPath $b -Recurse -Depth $depth -File -Include $names -ErrorAction SilentlyContinue | Select-Object -First 5 | ForEach-Object { $hits += (FileVer $_.FullName) }
    }
  }
  return $hits
}

$r = [ordered]@{ tool = 'wakaba-charkit/survey_local_char'; ver = 1; at = (Get-Date).ToString('s'); note = 'mapkit の survey_local.ps1 と一緒に使う' }

$pf = $env:ProgramFiles; $pf86 = ${env:ProgramFiles(x86)}; $lad = $env:LOCALAPPDATA; $ad = $env:APPDATA
$steam = Join-Path $pf86 'Steam\steamapps\common'

# VRoid Studio（公式のインストーラー／Steam）
$r.vroidStudio = FindExe @((Join-Path $pf 'VRoid Studio'), (Join-Path $lad 'Programs\VRoid Studio'), (Join-Path $steam 'VRoid Studio'), (Join-Path $pf 'pixiv')) @('VRoidStudio.exe', 'VRoid Studio.exe') 3

# Blender の VRM アドオン（Blender 4.2 以降は「拡張機能」、それより前は scripts\addons）。blender_manifest.toml / __init__.py の版の行だけ読む
$r.blenderVrmAddon = @()
$bf = Join-Path $ad 'Blender Foundation\Blender'
if (Test-Path -LiteralPath $bf) {
  Get-ChildItem -LiteralPath $bf -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $bv = $_.Name
    $cands = @()
    $cands += Get-ChildItem -LiteralPath (Join-Path $_.FullName 'extensions') -Recurse -Depth 2 -Filter 'blender_manifest.toml' -ErrorAction SilentlyContinue | Where-Object { $_.DirectoryName -match 'vrm' }
    $cands += Get-ChildItem -LiteralPath (Join-Path $_.FullName 'scripts\addons') -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'vrm' } | ForEach-Object { Get-Item -LiteralPath (Join-Path $_.FullName '__init__.py') -ErrorAction SilentlyContinue }
    foreach ($f in $cands) {
      if (-not $f) { continue }
      $line = Get-Content -LiteralPath $f.FullName -TotalCount 60 -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*version\s*=|"version"\s*:' } | Select-Object -First 1
      $r.blenderVrmAddon += [ordered]@{ blender = $bv; path = (Hide $f.DirectoryName); versionLine = "$line".Trim() }
    }
  }
}

# アニメーションの道具（入っているかだけ）
$r.cascadeur = FindExe @((Join-Path $pf 'Cascadeur'), (Join-Path $lad 'Programs\Cascadeur'), (Join-Path $steam 'Cascadeur')) @('cascadeur.exe', 'Cascadeur.exe') 3
$r.rokokoStudio = FindExe @((Join-Path $pf 'Rokoko Studio'), (Join-Path $lad 'Programs\Rokoko Studio'), (Join-Path $lad 'Programs\rokoko-studio')) @('*.exe') 2
$r.freemocap = CmdVer 'freemocap' '--help'
$r.ffmpeg = CmdVer 'ffmpeg' '-version'

# UE のプラグイン（VRM4U など）：Launcher で入れた UE のフォルダの Plugins の中で名前に VRM を含むフォルダ
$r.uePlugins = @()
$dat = Join-Path $env:ProgramData 'Epic\UnrealEngineLauncher\LauncherInstalled.dat'
if (Test-Path -LiteralPath $dat) {
  $j = Get-Content -LiteralPath $dat -Raw | ConvertFrom-Json
  foreach ($it in @($j.InstallationList | Where-Object { $_.AppName -like 'UE_*' })) {
    $pl = Join-Path $it.InstallLocation 'Engine\Plugins'
    $names = @(Get-ChildItem -LiteralPath $pl -Recurse -Depth 2 -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'VRM|Kawaii|LiveLink' } | Select-Object -First 20 | ForEach-Object { $_.Name })
    $r.uePlugins += [ordered]@{ ue = $it.AppName; version = $it.AppVersion; vrmLikePlugins = $names }
  }
}

# カメラ・マイク（名前と状態だけ）
$r.cameras = @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Class -in @('Camera', 'Image') } | ForEach-Object { [ordered]@{ name = $_.FriendlyName; status = "$($_.Status)" } })
$r.audioEndpoints = @(Get-PnpDevice -PresentOnly -Class AudioEndpoint -ErrorAction SilentlyContinue | ForEach-Object { [ordered]@{ name = $_.FriendlyName; status = "$($_.Status)" } })

# 指定の場所のモデル・モーションのファイルを数える（中身は読まない）
$exts = @('*.vrm', '*.vroid', '*.blend', '*.fbx', '*.bvh', '*.vrma', '*.glb', '*.gltf', '*.moc3', '*.pmx', '*.casc')
$r.files = @($SearchPaths | ForEach-Object {
  $p = $_
  $o = [ordered]@{ path = (Hide $p); exists = (Test-Path -LiteralPath $p); counts = [ordered]@{}; names = @() }
  if ($o.exists) {
    $all = @(Get-ChildItem -LiteralPath $p -Recurse -Depth 5 -File -Include $exts -ErrorAction SilentlyContinue)
    foreach ($e in $exts) { $k = $e.TrimStart('*'); $o.counts[$k] = @($all | Where-Object { $_.Extension -ieq $k }).Count }
    $o.names = @($all | Select-Object -First $MaxNames | ForEach-Object { Hide $_.FullName })
  }
  $o
})
if (-not $SearchPaths.Count) { $r.files = 'not_checked（-SearchPaths で場所を指定）' }

$json = $r | ConvertTo-Json -Depth 6
if ($OutFile) { $json | Out-File -FilePath $OutFile -Encoding utf8; Write-Host "保存しました: $OutFile（共有する前に中身を確認してください）" }
else { $json }
