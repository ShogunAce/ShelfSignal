# ShelfSignal

Built by **Kenosis Interactive**, with implementation assistance from OpenAI Codex.

A reference-based shelf inspection workspace: photograph, measure possible occupancy loss with OpenCV 5, review the proposal, approve a task, then verify the original positions with a follow-up photograph. Approval never implies physical completion. This is not SKU recognition or an inventory system.

## Run on this Windows workstation

```powershell
Set-Location C:\Users\coled\Projects\ShelfSignal
.\scripts\start.ps1
```

Open http://127.0.0.1:8000. Select **One missing position**, **Load example**, then **Analyze shelf**. Review the measured overlay and heuristic score, approve the task, load the synthetic refill, and verify. Try **Blurred capture** and **No change** to see different policy actions. All examples are explicitly synthetic.

For the authenticated AWS workload:

```powershell
aws login --profile shelfsignal --region us-west-2
.\scripts\start.ps1 -Cloud -Profile shelfsignal
```

The UI stays on localhost; processing and persistence use Lambda, S3 and DynamoDB. Confirm the header says **AWS Lambda**. Restart the server without `-Cloud` to return to local processing. The server never silently falls back from AWS to local processing.

## Fresh installation

Prerequisites: Python 3.12, Node.js 22 or newer, and AWS CLI v2.32+ for cloud mode. From the project root run `scripts/setup.ps1`. It creates the virtual environment when needed, installs the exact lock file, generates fixtures, builds the UI and installs Playwright Chromium. No OpenAI key is needed. The optional LLM feature was deliberately omitted.

## Verify

```powershell
.\scripts\test.ps1
# With the cloud-mode local server running:
.\.venv\Scripts\python.exe scripts/cloud_smoke.py
```

Local runtime: Python 3.12.15, OpenCV 5.0.0 from `opencv-python-headless==5.0.0.93`, NumPy 2.4.3. The container build rejects non-5 OpenCV and non-x86_64 architecture.

Executed checks: 19 backend tests, six local browser workflows, six AWS browser workflows, and the real AWS storage/authentication smoke test passed. Runtime details and complete traces are in `docs/evidence/`. A source/evidence handoff ZIP is generated with `scripts/package_submission.py` under `docs/submission/`; no credentials or user image directory are included.

The measured synthetic benchmark contains 88 inspections and 24 follow-ups. Precision is 85.7%, recall 100%, and action agreement 90.9%. A flat object covering a product can look like a gap: eight such false positives remain. These numbers do not establish real-store performance. See [EVALUATION.md](EVALUATION.md), including the exact run outputs.

## Project map

- `backend/app`: FastAPI, explicit policy workflow, OpenCV engine and repository adapters.
- `frontend`: React/TypeScript/Vite/Tailwind workspace and browser tests.
- `fixtures/generator`: independent seeded synthetic image generator.
- `evaluation`: evaluator and measured JSON/CSV results.
- `infrastructure`: SAM service, CodeBuild container build, optional new-account bootstrap.
- `scripts`: setup, run, tests, AWS deployment and real cloud smoke verification.
- `docs/evidence`: executed traces, screenshots, test reports and deployment evidence.

Read [DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md), [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md), and [DEMO_SCRIPT.md](DEMO_SCRIPT.md). [BUILD_REVIEW.md](BUILD_REVIEW.md) separates verified gates from outstanding submission steps.

User images and SQLite data remain under gitignored `data/` in local mode. Cloud objects expire after 30 days. Source images are preserved separately from overlays; upload hashes and original references are recorded. API schemas are served at `/docs` in local mode.
