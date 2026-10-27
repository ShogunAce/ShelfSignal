# Build review

## What was inherited and completed

The initial files already contained the OpenCV engine, synthetic generator, FastAPI workflow, local/cloud repositories, React workspace and tests. The continuation re-executed the local checks, authenticated AWS, discovered an existing deployed stack and build project, and updated that stack using a tested Linux container. Required technical, security, evaluation, deployment and submission Markdown documents were added.

## Root causes and fixes

| Finding | Root cause | Fix and evidence |
|---|---|---|
| Verification failure could re-enter analysis | Shared FAILED retry path lost the distinction between initial analysis and approved-task follow-up | Verification errors become INCONCLUSIVE while retaining approval; regression test retries verification |
| Replaced images were difficult to audit | Only the current image pointer was persisted | Immutable originals, SHA-256 image history and upload events |
| Old overlay could describe a new capture | Capture replacement did not invalidate derived imagery | Clear overlay on replacement; regression test |
| Verified UI still showed the original gap explanation | Review text always used initial analysis | Use follow-up evidence reason and label original candidates |
| Cloud create idempotency was dropped | Proxy copied content type but not the idempotency header | Header forwarded and tested |
| Long traces could exceed DynamoDB limits | Full JSON record lived in a single DynamoDB item | Immutable private S3 snapshots and conditional DynamoDB pointers; >400 KB regression test |
| Python could not use successful AWS browser login | Botocore login provider required AWS CRT | Pin and install awscrt 0.31.2 |
| Browser server would not launch on Windows | Shell interpreted slash-separated executable path incorrectly | Quoted Windows executable path; executed browser suite |
| Cloud browser upload test ran too early | Browser automation selected a disabled input before the first upload completed | Wait for the enabled control, persisted upload and decoded reference image before interaction |
| Flat occlusion produces false positives | Edge/texture loss is visually ambiguous | Keep failure visible in measured evaluation and documentation; no fabricated algorithm fix |

## Acceptance gates

| Gate | Evidence / status |
|---|---|
| A: workstation and identity | Python 3.12 environment, OpenCV 5.0.0, Node/npm and authenticated AWS identity inspected; no local Docker or SAM CLI |
| B: vision | 88 measured synthetic cases; source/overlay examples and explicit failure cases |
| C: policy loop | 19 backend tests and persisted local closed-loop trace |
| D: UI | Passed: production build, 14 local browser workflows and 14 real AWS browser workflows |
| E: local QA | pytest XML, evaluation JSON/CSV, frontend build output and browser screenshots |
| F: AWS | Passed: actual OpenCV 5.0.0 x86_64 execution, seven decision outcomes, private original hashes, DynamoDB/S3 traces and unsigned HTTP 403 recorded in aws-smoke.json |
| G: submission materials | Required Markdown sources, demo script and real narrated video present; judge arrangement and portal submission remain pending |

Do not claim the entire competition submission complete. A deployed runtime is not a submission receipt, and a script is not a recorded video. Use the current evidence files rather than planned outcomes to describe the result.

## Preventive pattern

Treat each boundary as independently verifiable: image quality, operator approval, persisted state, transport authentication, container compatibility and actual cloud execution. Preserve originals and failure evidence. Fix the cause of a failing check instead of changing its expectation to manufacture success.
