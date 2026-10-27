# ShelfSignal — Kenosis Interactive

The consolidated requested form sections are in [DEVPOST_COPY.md](docs/submission/DEVPOST_COPY.md).

## Tagline

Reference-based shelf inspection that connects OpenCV evidence, human approval and visual follow-up.

## Inspiration

The project focuses on a narrow assumed workflow: a small-store shift supervisor checking product positions and keeping restock notes. We wanted a closed loop where a proposed action has visible evidence, requires an operator decision and can be checked afterward. No customer interviews or measured labor savings are claimed.

## What it does

Upload a reference and inspection photo, define expected positions, and run OpenCV 5. ShelfSignal aligns the images and measures changes in regional edges and texture. Reliable possible gaps lead to a review proposal; weak quality requests a rescan; unchanged shelves produce no task. A human must approve a task. A follow-up photograph rechecks the original candidate positions and produces visually resolved, unresolved or inconclusive evidence.

## How it was built

React, TypeScript, Vite, Tailwind, Inter and Lucide form the workspace. FastAPI and a deterministic policy engine coordinate OpenCV 5 ORB matching, RANSAC homography, perspective warping, edge/texture comparisons, morphology and overlays. SQLite supports local use; the same Python engine runs in an AWS Lambda container with private S3 and DynamoDB. CodeBuild tests the Linux image before CloudFormation deployment. The local server signs AWS requests; credentials never enter the browser.

## Agentic behavior

Vision measurements select different tool sequences: quality failure requests a rescan; possible occupancy loss proposes a task; human approval enables follow-up verification. Events persist measured features, policy rules, references and state transitions. Approval never implies execution or physical completion. No LLM service is required.

## Results and limitations

Across 88 synthetic inspection cases: 48 true-positive positions, eight false positives, zero false negatives, 85.7% precision, 100% recall and 80/88 expected action agreement. All 24 synthetic follow-up classifications were correct. A flat occlusion remains a known failure. These measurements do not establish real-store accuracy, stock availability, SKU recognition or commercial benefit.

## Engineering challenge

The difficult boundary was preserving honest uncertainty and state across the full loop. The continuation fixed failed-verification recovery, image history, stale overlays, proxy idempotency and large cloud traces. AWS execution is protected and demonstrated through the local authenticated workspace rather than an unrestricted processing endpoint.

## Manual submission checklist

- Enter the project title, description, team members and actual technology list in the competition portal.
- Provide the source repository: https://github.com/ShogunAce/ShelfSignal.
- Attach the recorded 4-minute-15-second demonstration from `docs/demo/ShelfSignal-demo.mp4`, or use its public repository download link. Verify that the portal accepts the video hosting format.
- Attach screenshots and measured evaluation evidence; label every synthetic example.
- Provide arranged screen-share instructions or an authorized judge setup from DEPLOYMENT.md. The IAM-protected Lambda URL is not a public demo page.
- Verify current official eligibility, required fields and deadline in the competition portal before submission. This implementation follows the supplied directive and does not certify acceptance by the organizers.
- Submit manually and save the actual submission receipt. No competition entry has been submitted by this build.
