# ShelfSignal | Kenosis Interactive

## Inspiration

We started with a practical question: could a shelf photograph support a complete, accountable follow-up process rather than just produce a detection box?

For ShelfSignal, we focused on a small-store shift supervisor comparing shelves with expected product positions. Our aim was to connect visual evidence, a human decision, and a second photograph that checks the result. We wanted the system to acknowledge uncertainty and make its reasoning inspectable.

## What it does

ShelfSignal compares a reference shelf photograph with a new inspection photograph. The operator defines expected product positions, and OpenCV 5 aligns the images and measures possible occupancy loss.

The evidence determines the next action: reliable possible gaps produce a review proposal, poor-quality or unreliable alignment requests a rescan, and an unchanged shelf produces no restock proposal. Only an explicit human approval creates a task.

A follow-up photograph rechecks the original candidate regions and classifies them as visually resolved, unresolved, or inconclusive. Original images, measurements, decisions, and transitions remain available in an execution trace. ShelfSignal does not identify SKUs, infer warehouse inventory, or treat approval as proof that a restock occurred.

## How we built it

We built the workspace with React, TypeScript, Vite, and Tailwind CSS, backed by FastAPI and Python. OpenCV 5 performs substantive analysis through ORB feature matching, RANSAC homography, perspective alignment, edge and texture comparisons, morphological processing, and overlays.

An explicit deterministic state machine turns that evidence into tool calls and decisions. The same vision and workflow code runs locally and in an x86_64 AWS Lambda container. Cloud storage uses private S3 objects and DynamoDB revision records; the local mode uses SQLite and image files.

AWS CodeBuild tests the Linux container before CloudFormation deploys it. A local server signs AWS requests so credentials stay out of the browser. We used OpenAI Codex for implementation assistance; the application's decision workflow does not require an LLM API.

## Challenges we ran into

The hardest challenge was distinguishing possible empty positions from misleading visual changes. Blur, camera movement, lighting, and occlusion can all affect comparisons. Flat occlusions remain a known failure: removing visible edges and texture can resemble an empty shelf position.

Maintaining a trustworthy workflow also required careful engineering. We fixed verification retries that could enter the wrong state, stale overlays after image replacement, dropped idempotency headers in the cloud proxy, and trace storage that could exceed DynamoDB's item limit. Browser testing against AWS also exposed timing assumptions that local tests did not reveal.

## Accomplishments that we're proud of

- Executed the complete reference-to-inspection-to-approval-to-follow-up loop locally and on AWS using OpenCV 5.0.0.
- Passed 19 backend tests both locally and in the Linux container, plus 14 local and 14 AWS browser workflows.
- Verified private image persistence, original-image hashes, stored execution traces, and rejection of unauthenticated access.
- Measured 85.7% precision, 100% recall, and 90.9% expected-action agreement across 88 synthetic inspection cases. All 24 synthetic follow-up classifications were correct.
- Included the eight false positives in our evaluation and documentation rather than presenting only successful examples.

These are synthetic benchmark results, not claims about real-store accuracy.

## What we learned

A useful vision workflow needs more than a detector. It needs explicit uncertainty handling, recoverable states, human control, and evidence that survives every transition.

We learned to separate a proposal from approval, approval from execution, and visual improvement from physical completion. We also learned that deployment success is not proof of a working cloud application: the actual workload, storage, authentication, and browser experience must be tested together.

## What's next for Shelf Signal

Our next step is a consented real-store dataset with independent test cases covering varied packaging, shelf layouts, lighting, camera angles, and occlusions. We want to improve occlusion handling and evaluate whether scores can be calibrated using real evidence.

We also plan to improve recovery from interrupted processing and provide an authenticated hosted workspace for easier evaluation. The focus will remain narrow: reference-based inspection, appropriate human review, and honest visual follow-up.
