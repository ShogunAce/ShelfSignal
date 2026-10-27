# Testing

Run `scripts/test.ps1` from the repository root. It executes pytest, the synthetic evaluator, the frontend production build and Playwright in that order, stopping on failures. The browser configuration starts and stops a dedicated loopback server using `data/browser-test`. Stop any manually running server on port 8000 first, unless deliberately using `SHELFSIGNAL_REUSE_SERVER=1` for the cloud workflow.

## Backend

```powershell
.\.venv\Scripts\python.exe -m pytest -q --junitxml=docs/evidence/pytest.xml
```

19 tests passed in the current local backend run. Coverage includes image/region validation, invalid origins, OpenCV runtime version, actual evidence-driven tool branches, approval gating and rejection, idempotency, visual resolution/unresolved/inconclusive outcomes, original preservation, replacement-overlay invalidation, failed-verification retry, optimistic concurrency, proxy failure without fallback, forwarded idempotency headers and storage of traces larger than DynamoDB's item limit. The Docker build also runs this suite under Linux before a deployment can proceed.

Two dependency deprecation warnings remain: FastAPI/Starlette's httpx TestClient transition and Mangum's event-loop initialization. They did not fail the tests. No paid model evaluation is performed.

## Browser

```powershell
npm --prefix frontend run build
Push-Location frontend
npm run test:e2e
Pop-Location
```

Browser coverage: full synthetic approval/verification/reload, quality rescan without approval, manual uploads and region drawing, mobile overflow, no-change without a proposal, and rejection without a task. The JSON reporter at `docs/evidence/playwright.json` is authoritative for pass counts. Screenshots are real browser output, not design mockups. No test approves a real-store task.

The final local suite passed all six tests. To test the actual AWS proxy already running on port 8000, use a separate PowerShell session:

```powershell
$env:SHELFSIGNAL_REUSE_SERVER='1'
$env:SHELFSIGNAL_CLOUD_TEST='1'
npm --prefix frontend run test:e2e
```

Cloud browser results are stored separately in `docs/evidence/playwright-aws.json`, with `aws-ui-*.png` screenshots. For simultaneous local tests, the supported alternate port is 5173 (`SHELFSIGNAL_TEST_PORT=5173`); arbitrary ports are intentionally rejected by the Origin allowlist. Clear these test environment variables before an ordinary local run.

The final AWS browser suite also passed all six tests. Both suites include an actual keyboard coordinate change and verify that it was persisted in the execution trace. Run `scripts/release_check.py` on the deployment workstation to check the recorded gates and confirm the current backend matches the source archive used for the deployed image.

## Evaluation and cloud

`python -m evaluation.run` writes measured JSON/CSV and visual examples. Evaluation findings and known failures are in EVALUATION.md. `scripts/cloud_smoke.py` uses the running cloud proxy and real AWS storage; it is not mocked and incurs small AWS usage. Cloud access checks include unsigned HTTP 403 and private S3 configuration. See DEPLOYMENT.md.

## Evidence interpretation

Local pytest proves application behavior; browser tests prove actual UI interactions; Linux build checks prove image compatibility; deployment output proves infrastructure update; cloud smoke proves real execution and persistence. None alone proves the others. Test times vary with concurrent processes and include neither labor savings nor commercial performance claims.
