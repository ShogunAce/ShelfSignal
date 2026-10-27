# ShelfSignal demo transcript

## 01-intro — 0.0s

ShelfSignal is a reference based shelf inspection workspace for a small store shift supervisor. It connects a possible gap to human review and visual follow up. This demonstration uses synthetic shelf photographs and the real authenticated AWS deployment. It does not identify products or know inventory quantities.

## 02-baseline — 20.6s

We begin by loading a reference shelf and an inspection photograph. The boxes define expected product positions. They do not tell the detector which position is empty. The header identifies AWS Lambda and OpenCV five. Original photographs are preserved separately from overlays.

## 03-analysis — 39.9s

Analyze shelf runs OpenCV on AWS. ORB features and a RANSAC homography align the images, then regional edge and texture changes identify possible occupancy loss. Position R two, two is marked for review. The score is a heuristic, not a calibrated probability. Reliable gap evidence leads to a restock proposal.

## 04-approval — 62.7s

The proposal is not an executed task. Approval is a separate operator action, enforced on the server. Here the demo operator approves the synthetic proposal. A task now exists, but physical completion remains explicitly unasserted. A follow up photograph is still required.

## 05-followup — 82.4s

We load a synthetic refill and verify the original regions. The same OpenCV engine compares the follow up against the reference. The original candidate now appears visually resolved. This is evidence about appearance, not proof of a physical restock or the correct product. The before and after measurements remain visible.

## 06-trace — 103.0s

Every transition is persisted with its tool, policy rule, image references and observed features. The trace connects the original evidence, operator approval and final verification. Reloading preserves the result. Separate cloud checks verified original image hashes and the full stored trace, and confirmed that unsigned requests are rejected.

## 07-rescan — 124.5s

Different visual evidence changes the next action. A blurred capture fails the quality gate and requests a rescan. There is no approval control. The agent does not override weak evidence. Blurred follow up photographs are similarly classified as inconclusive.

## 08-nochange — 142.3s

For an unchanged shelf, the workflow keeps the evidence ready and proposes no restock task. These branches come from measured OpenCV outputs, not a scripted success response or fixture labels.

## 09-architecture — 156.1s

The React workspace calls a loopback FastAPI server. In cloud mode, that server signs AWS requests. The same OpenCV and policy code runs in an x eighty six Lambda container. Private S three stores originals, overlays and immutable trace snapshots. Dynamo D B tracks the current revision. Credentials stay out of the browser. CodeBuild ran all nineteen backend tests in Linux before deployment.

## 10-results — 184.2s

The reproducible benchmark contains eighty eight synthetic inspection cases. It measured forty eight true positives, eight false positives, and no false negatives: eighty five point seven percent precision and one hundred percent recall. Expected action agreement was eighty out of eighty eight. All twenty four follow up classifications were correct. These results do not establish real store performance.

## 11-failure — 209.6s

The eight false positives are flat occlusions. Covering a product can remove edges and texture in the same way as an empty position. ShelfSignal can mistake that appearance for a gap. Human review is essential. The next validation step is a consented real shelf dataset with independent test cases, rather than a claim of production accuracy.

## 12-close — 231.4s

The source includes pinned dependencies, build and deployment instructions, a technical report, measured evaluation and real execution evidence. ShelfSignal demonstrates a complete visual decision loop with human control. The project was implemented with OpenAI Codex assistance. This video uses synthesized narration over an actual AWS workflow recording.