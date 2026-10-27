# ShelfSignal

Built by **Kenosis Interactive**, with implementation assistance from OpenAI Codex.

A reference-based shelf inspection workspace: photograph, measure possible occupancy loss with OpenCV 5, review the proposal, approve a task, then verify the original positions with a follow-up photograph. Approval never implies physical completion. This is not SKU recognition or an inventory system.

## Run on this Windows workstation

```powershell
Set-Location C:\Users\coled\Projects\ShelfSignal
.\scripts\start.ps1
```

Open http://127.0.0.1:8000 for the landing page, then choose **Open workspace** (or go directly to http://127.0.0.1:8000/workspace/). Select **AI shelf · Missing item** (the default), **Load example**, then **Analyze shelf**. This loads the ElevenLabs-generated reference, missing-item image and 18 reference position boxes. Review R2-3, approve the synthetic task, click **Load synthetic refill**, and verify. Try **AI shelf · Blurred capture** and **AI shelf · No change** to see different policy actions. The original procedural fixtures remain in the picker. All examples are explicitly synthetic.

The refill button stays associated with the loaded reference across refreshes and picker changes. For manually uploaded shelves, upload a matching follow-up yourself. ElevenLabs assets and provenance are in `fixtures/elevenlabs`; bundled UI assets are in `frontend/public/examples/elevenlabs`. Images are generated ahead of time; inspection still runs OpenCV without a model API call.

For the authenticated AWS workload:

```powershell
aws login --profile shelfsignal --region us-west-2
.\scripts\start.ps1 -Cloud -Profile shelfsignal
```

The UI stays on localhost; processing and persistence use Lambda, S3 and DynamoDB. Confirm the header says **AWS Lambda**. Restart the server without `-Cloud` to return to local processing. The server never silently falls back from AWS to local processing.

The landing page uses original ShelfSignal copy, ElevenLabs-generated retail imagery, an interactive synthetic image comparison, and a real workspace preview. Media prompts, preserved originals and design notes are in `docs/design/landing/`.

## Fresh installation

For Netlify, the committed `netlify.toml` builds from `frontend` with `npm run build` and publishes `frontend/dist`. The hosted workspace uses a separate AWS guest gateway for the bundled synthetic examples, with no account required. Each four-hour session owns its inspections. The gateway invokes the IAM-protected OpenCV processor; personal-photo uploads and account registration are not enabled in the hosted demo. Deployment and limits are described in [DEPLOYMENT.md](DEPLOYMENT.md).

Prerequisites: Python 3.12, Node.js 22 or newer, and AWS CLI v2.32+ for cloud mode. From the project root run `scripts/setup.ps1`. It creates the virtual environment when needed, installs the exact lock file, generates fixtures, builds the UI and installs Playwright Chromium. No OpenAI key is needed. The optional LLM feature was deliberately omitted.

## Verify

```powershell
.\scripts\test.ps1
# With the cloud-mode local server running:
.\.venv\Scripts\python.exe scripts/cloud_smoke.py
```

Local runtime: Python 3.12.15, OpenCV 5.0.0 from `opencv-python-headless==5.0.0.93`, NumPy 2.4.3. The container build rejects non-5 OpenCV and non-x86_64 architecture.

Executed checks before the guest gateway: 19 backend tests, fourteen local browser workflows, fourteen AWS browser workflows, and the real AWS storage/authentication smoke test passed. The browser suites include the ElevenLabs examples and byte-for-byte checks of their uploads and matching refill. Runtime details and complete traces are in `docs/evidence/`. A source/evidence handoff ZIP is generated with `scripts/package_submission.py` under `docs/submission/`; no credentials or user image directory are included.

The measured synthetic benchmark contains 88 inspections and 24 follow-ups. Precision is 85.7%, recall 100%, and action agreement 90.9%. A flat object covering a product can look like a gap: eight such false positives remain. These numbers do not establish real-store performance. See [EVALUATION.md](EVALUATION.md), including the exact run outputs.

## Project map

- `backend/app`: FastAPI, explicit policy workflow, OpenCV engine and repository adapters.
- `frontend`: React/TypeScript/Vite/Tailwind landing page, inspection workspace and browser tests.
- `fixtures/generator`: independent seeded synthetic image generator.
- `evaluation`: evaluator and measured JSON/CSV results.
- `infrastructure`: SAM service, CodeBuild container build, optional new-account bootstrap.
- `scripts`: setup, run, tests, AWS deployment and real cloud smoke verification.
- `docs/evidence`: executed traces, screenshots, test reports and deployment evidence.
- `video`: Remotion motion-graphics explainer (`docs/demo/ShelfSignal-motion-demo.mp4`) built from the synthetic fixtures and measured evidence; not a screen recording.

Read [DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md), [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md), and [DEMO_SCRIPT.md](DEMO_SCRIPT.md). [BUILD_REVIEW.md](BUILD_REVIEW.md) separates verified gates from outstanding submission steps.

User images and SQLite data remain under gitignored `data/` in local mode. Cloud objects expire after 30 days. Source images are preserved separately from overlays; upload hashes and original references are recorded. API schemas are served at `/docs` in local mode.
