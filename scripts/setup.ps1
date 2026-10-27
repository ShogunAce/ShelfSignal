$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Test-Path .venv/Scripts/python.exe)) {
    py -3.12 -m venv .venv
    if ($LASTEXITCODE) { exit $LASTEXITCODE }
}
& .\.venv\Scripts\python.exe -m ensurepip --upgrade
if ($LASTEXITCODE) { exit $LASTEXITCODE }
& .\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
if ($LASTEXITCODE) { exit $LASTEXITCODE }
& .\.venv\Scripts\python.exe fixtures/generator/generate.py
if ($LASTEXITCODE) { exit $LASTEXITCODE }
npm --prefix frontend ci
if ($LASTEXITCODE) { exit $LASTEXITCODE }
npm --prefix frontend run build
if ($LASTEXITCODE) { exit $LASTEXITCODE }
Push-Location frontend
try { npx playwright install chromium } finally { Pop-Location }
