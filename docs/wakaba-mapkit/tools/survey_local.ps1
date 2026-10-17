<#
  わかば mapkit：利用者の PC の環境を調べる（読むだけ）スクリプト
  ------------------------------------------------------------------
  - 何もインストールしない・何も書き換えない・ネットワークに接続しない。
  - 結果は JSON で画面に出す（-OutFile を付けるとそのファイルに保存。保存するのはその 1 ファイルだけ）。
  - 重いアプリ（Blender・Unreal・Gaea）は起動しない。版はファイルのプロパティから読む。
  - -Redact を付けると、パスの中のユーザー名を <user> に置き換える（共有する前に推奨）。
  - このスクリプトはクラウド（Linux）で書いたもので、Windows 上では未実行（未検証）。エラーが出たら画面の文字をそのまま伝えてください。

  使い方（PowerShell を「通常の権限」で開いて）：
    powershell -ExecutionPolicy Bypass -File .\survey_local.ps1 -Redact
    powershell -ExecutionPolicy Bypass -File .\survey_local.ps1 -Redact -OutFile .\survey.json
    （ComfyUI・NAS・外付け SSD の場所を一緒に調べる）
    powershell -ExecutionPolicy Bypass -File .\survey_local.ps1 -Redact -ComfyPath "D:\ComfyUI" -ExtraPaths "\\NAS\wakaba","E:\"
#>
[CmdletBinding()]
param(
  [string]$OutFile = "",
  [string]$ComfyPath = "",
  [string[]]$ExtraPaths = @(),
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
  try { $out = (& $c.Source $arg 2>&1 | Select-Object -First 2) -join ' ' } catch { $out = 'error' }
  return [ordered]@{ path = (Hide $c.Source); version = "$out".Trim() }
}

$r = [ordered]@{ tool = 'wakaba-mapkit/survey_local'; ver = 1; at = (Get-Date).ToString('s') }

# OS・CPU・メモリ
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$cs = Get-CimInstance Win32_ComputerSystem
$r.os = [ordered]@{ caption = $os.Caption; version = $os.Version; build = $os.BuildNumber; arch = $os.OSArchitecture }
$r.cpu = [ordered]@{ name = "$($cpu.Name)".Trim(); cores = $cpu.NumberOfCores; threads = $cpu.NumberOfLogicalProcessors; maxMHz = $cpu.MaxClockSpeed }
$r.ramGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
$r.ramSlots = @(Get-CimInstance Win32_PhysicalMemory | ForEach-Object { [ordered]@{ gb = [math]::Round($_.Capacity / 1GB, 0); speed = $_.Speed; slot = $_.DeviceLocator } })

# GPU（Win32 の値は 4GB で頭打ちになることがあるので nvidia-smi も見る）
$r.gpu = @(Get-CimInstance Win32_VideoController | ForEach-Object { [ordered]@{ name = $_.Name; driver = $_.DriverVersion; vramWin32GB = [math]::Round($_.AdapterRAM / 1GB, 1) } })
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($smi) {
  $q = & $smi.Source --query-gpu=name,driver_version,memory.total,memory.used --format=csv,noheader 2>$null
  $r.nvidiaSmi = @($q)
} else { $r.nvidiaSmi = $null }

# ディスクの空き
$r.disks = @(Get-CimInstance Win32_LogicalDisk | ForEach-Object {
  [ordered]@{ drive = $_.DeviceID; type = $_.DriveType; label = $_.VolumeName; fs = $_.FileSystem; sizeGB = [math]::Round($_.Size / 1GB, 0); freeGB = [math]::Round($_.FreeSpace / 1GB, 0); network = $_.ProviderName }
})

# Unreal Engine（Epic Games Launcher の記録を読む）
$ue = [ordered]@{}
$dat = Join-Path $env:ProgramData 'Epic\UnrealEngineLauncher\LauncherInstalled.dat'
if (Test-Path $dat) {
  $j = Get-Content $dat -Raw | ConvertFrom-Json
  $ue.launcherInstalled = @($j.InstallationList | Where-Object { $_.AppName -like 'UE_*' } | ForEach-Object { [ordered]@{ app = $_.AppName; version = $_.AppVersion; path = (Hide $_.InstallLocation) } })
  $ue.otherEpicApps = @($j.InstallationList | Where-Object { $_.AppName -notlike 'UE_*' } | ForEach-Object { $_.AppName })
} else { $ue.launcherInstalled = $null }
$ue.epicLauncher = FileVer (Join-Path ${env:ProgramFiles(x86)} 'Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe')
$r.unreal = $ue

# Blender（起動せず、exe の版を読む）
$r.blender = @()
foreach ($base in @("$env:ProgramFiles\Blender Foundation", "${env:ProgramFiles(x86)}\Steam\steamapps\common", "$env:LOCALAPPDATA\Programs")) {
  if (Test-Path $base) {
    Get-ChildItem -Path $base -Recurse -Depth 2 -Filter 'blender.exe' -ErrorAction SilentlyContinue | ForEach-Object { $r.blender += (FileVer $_.FullName) }
  }
}
$r.blenderOnPath = CmdVer 'blender' '--version'   # PATH にある時だけ。起動に数秒かかることがある

# Gaea（QuadSpinner）
$r.gaea = @()
foreach ($base in @("$env:ProgramFiles\QuadSpinner", "$env:LOCALAPPDATA\Programs\QuadSpinner", "$env:ProgramFiles")) {
  if (Test-Path $base) {
    Get-ChildItem -Path $base -Recurse -Depth 3 -Include 'Gaea.exe','Gaea.Build.exe' -ErrorAction SilentlyContinue | ForEach-Object { $r.gaea += (FileVer $_.FullName) }
  }
}

# ComfyUI（場所を指定された時だけ）
if ($ComfyPath -and (Test-Path $ComfyPath)) {
  $nodes = Join-Path $ComfyPath 'custom_nodes'
  if (-not (Test-Path $nodes)) { $nodes = Join-Path $ComfyPath 'ComfyUI\custom_nodes' }
  $r.comfyui = [ordered]@{
    path = (Hide $ComfyPath)
    customNodes = @(Get-ChildItem -Path $nodes -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })
    checkpoints = @(Get-ChildItem -Path $ComfyPath -Recurse -Depth 4 -Include '*.safetensors','*.ckpt' -ErrorAction SilentlyContinue | Select-Object -First 50 | ForEach-Object { $_.Name })
  }
} else { $r.comfyui = 'not_checked（-ComfyPath で場所を指定）' }

# 開発ツール（版を聞くだけ）
$r.tools = [ordered]@{
  git = CmdVer 'git'; gitLfs = CmdVer 'git-lfs'; node = CmdVer 'node'; npm = CmdVer 'npm'
  python = CmdVer 'python'; py = CmdVer 'py'; n8n = CmdVer 'n8n'; docker = CmdVer 'docker'
  claude = CmdVer 'claude'; codex = CmdVer 'codex'; grok = CmdVer 'grok'
}

# 追加の場所（NAS・外付け SSD）：あるか・中のフォルダ名（1 段だけ）
$r.extraPaths = @($ExtraPaths | ForEach-Object {
  $p = $_
  [ordered]@{ path = (Hide $p); exists = (Test-Path $p); top = @(Get-ChildItem -Path $p -Directory -ErrorAction SilentlyContinue | Select-Object -First 30 | ForEach-Object { $_.Name }) }
})

$json = $r | ConvertTo-Json -Depth 6
if ($OutFile) { $json | Out-File -FilePath $OutFile -Encoding utf8; Write-Host "保存しました: $OutFile（共有する前に中身を確認してください）" }
else { $json }
