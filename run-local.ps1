# Run chat-ai-node on this machine without Docker.
# Needs: Python 3.11+ and Node.js 20+. A Qdrant is needed for documents (use -StartQdrant if Docker is installed,
# or point -QdrantUrl at one you already run).
#   .\run-local.ps1                 # http://127.0.0.1:8080
#   .\run-local.ps1 -StartQdrant    # also start Qdrant in Docker on 127.0.0.1:6333
#   .\run-local.ps1 -Rebuild        # rebuild the web pages after changing frontend/
param(
  [int]$Port = 8080,
  [string]$QdrantUrl = "http://127.0.0.1:6333",
  [switch]$StartQdrant,
  [switch]$Rebuild
)
# Not using ErrorActionPreference=Stop: Windows PowerShell 5.1 treats pip/npm warnings on stderr as errors.
function Check($what) { if ($LASTEXITCODE) { Write-Host "$what failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE } }
Set-Location $PSScriptRoot

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Created .env from .env.example. Fill in LICENSE_KEY / NODE_PASSWORD there, or set things up in the browser."
}
if (-not (Test-Path .venv)) { python -m venv .venv; Check "python -m venv" }
& .\.venv\Scripts\python -m pip install -q --disable-pip-version-check -r requirements.txt; Check "pip install"

if ($Rebuild -or -not (Test-Path frontend\out)) {
  Push-Location frontend
  npm ci --no-audit --no-fund; Check "npm ci"
  npm run build; Check "npm run build"
  Pop-Location
}

if ($StartQdrant) {
  $exists = docker ps -a --filter "name=^chat-ai-node-qdrant$" --format "{{.Names}}"
  if ($exists) { docker start chat-ai-node-qdrant | Out-Null }
  else { docker run -d --name chat-ai-node-qdrant -p 127.0.0.1:6333:6333 -v chat-ai-node-qdrant-data:/qdrant/storage qdrant/qdrant:v1.19.2 | Out-Null }
}

$env:NODE_DATA_DIR = Join-Path $PSScriptRoot "data"
$env:NODE_FRONTEND_DIR = Join-Path $PSScriptRoot "frontend\out"
$env:QDRANT_URL = $QdrantUrl
Write-Host "chat-ai-node: http://127.0.0.1:$Port   (data: $env:NODE_DATA_DIR)"
& .\.venv\Scripts\python -m uvicorn app:app --host 127.0.0.1 --port $Port
