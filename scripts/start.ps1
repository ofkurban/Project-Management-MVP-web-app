$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$ImageName = "pm-mvp"
$ContainerName = "pm-mvp"
$Port = 8000

function Get-DockerExe {
  $cmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }
  $fallback = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
  if (Test-Path $fallback) {
    return $fallback
  }
  throw "Docker is required but was not found on PATH."
}

$Docker = Get-DockerExe

New-Item -ItemType Directory -Force -Path (Join-Path $Root "data") | Out-Null

Write-Host "Building image $ImageName..."
& $Docker build -t $ImageName .

$existing = & $Docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($existing) {
  Write-Host "Removing existing container $ContainerName..."
  & $Docker rm -f $ContainerName | Out-Null
}

$runArgs = @(
  "run", "-d",
  "--name", $ContainerName,
  "-p", "${Port}:8000",
  "-v", "${Root}/data:/data"
)
if (Test-Path (Join-Path $Root ".env")) {
  $runArgs += @("--env-file", ".env")
}
$runArgs += $ImageName

Write-Host "Starting $ContainerName on http://localhost:${Port} ..."
& $Docker @runArgs

Write-Host "Started. Health: http://localhost:${Port}/api/health"
