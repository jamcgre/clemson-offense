$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$node = "C:\Users\johna\AppData\Local\nodejs\node-v24.22.0-win-x64\node.exe"
$tsx = Join-Path $root "node_modules\tsx\dist\cli.mjs"
$docker = "C:\Users\johna\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
$log = Join-Path $root "server\sunday-refresh.log"

function Write-Log([string]$message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
  Add-Content -Path $log -Value $line
}

try {
  Set-Location $root
  $env:Path = "$(Split-Path $docker);$(Split-Path $node);$env:Path"
  Write-Log "Starting Postgres"
  & $docker compose up -d
  if ($LASTEXITCODE -ne 0) { throw "docker compose up failed with exit $LASTEXITCODE" }
  Write-Log "Refreshing the live season"
  & $node $tsx ./server/src/refreshLiveSeason.ts
  if ($LASTEXITCODE -ne 0) { throw "refresh failed with exit $LASTEXITCODE" }
  Write-Log "Refresh finished"
} catch {
  Write-Log $_.Exception.Message
  exit 1
}
