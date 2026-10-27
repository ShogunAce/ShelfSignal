param([switch]$Cloud, [string]$Profile='shelfsignal', [string]$Region='us-west-2')
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if ($Cloud) { $env:CLOUD_FUNCTION='shelfsignal-processor'; $env:AWS_DEFAULT_REGION=$Region; $env:AWS_PROFILE=$Profile }
else { Remove-Item Env:CLOUD_FUNCTION -ErrorAction SilentlyContinue }
& .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
