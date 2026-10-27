$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
& .\.venv\Scripts\python.exe -m pytest -q
if ($LASTEXITCODE) { exit $LASTEXITCODE }
& .\.venv\Scripts\python.exe -m evaluation.run
if ($LASTEXITCODE) { exit $LASTEXITCODE }
npm --prefix frontend run build
if ($LASTEXITCODE) { exit $LASTEXITCODE }
Push-Location frontend
try { npm run test:e2e; $testExit=$LASTEXITCODE } finally { Pop-Location }
exit $testExit
