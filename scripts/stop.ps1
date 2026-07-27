$ErrorActionPreference = "Stop"

$ContainerName = "pm-mvp"

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

$existing = & $Docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($existing) {
  Write-Host "Stopping $ContainerName..."
  & $Docker rm -f $ContainerName | Out-Null
  Write-Host "Stopped."
} else {
  Write-Host "Container $ContainerName is not running."
}
