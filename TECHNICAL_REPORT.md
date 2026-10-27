# ShelfSignal technical report

## Problem and user

The target user is a convenience-store shift supervisor comparing shelf appearance with expected product positions and maintaining restock notes. Manual inspection and notes are the assumed baseline workflow. No user study, interviews, timing study or commercial benefit has been observed. The implemented experiment tests whether reference-based visual evidence can drive an auditable review and follow-up loop.

## Implementation

The React/TypeScript workspace accepts originals by file selection or drag-and-drop, supports expected-position drawing and coordinate editing, shows overlays and measured diagnostics, and exposes approval, rejection, follow-up and trace controls. FastAPI provides typed request validation and API schemas. SQLite/files support local use; DynamoDB and private S3 support cloud use through the same workflow. See ARCHITECTURE.md for the diagram and persistence design.

## OpenCV 5 algorithm

The deployed package requirement is `opencv-python-headless==5.0.0.93`; its runtime reports 5.0.0. Pillow validates image headers and orientation, then the image is scaled to at most 1200×900. OpenCV computes grayscale Laplacian variance, ORB features, Hamming descriptor matches, RANSAC homography, perspective warp, Canny edges, morphological change masks and contours.

The quality gate requires sharpness at least 45, at least 18 good matches, inlier ratio at least 0.45, median inlier reprojection error at most 2.5 pixels, a plausible projected image area and at least 97% coverage of each expected position. Broad exposure shifts are normalized with a bounded median luminance ratio.

For each expected region the heuristic score is `clip(0.6*(1-edge_ratio)+0.4*(1-texture_ratio),0,1)`. A score over 0.48 plus changed area over 0.18 is a possible gap. Other large appearance changes trigger an uncertainty/rescan gate. These thresholds are engineering choices, not calibrated probabilities or independently optimized store thresholds.

## Agent and human decisions

An explicit deterministic policy consumes measured evidence. Unreliable quality invokes `request_rescan`; reliable gaps invoke `propose_restock_task`; no significant loss leaves evidence ready with no proposal. `approve_or_reject_task` records the operator decision. Approval creates an actionable review task but never marks physical completion. No language-model API is used.

`compare_followup` re-runs OpenCV against the same reference and evaluates the original candidate IDs. A region resolves only when it has neither a gap nor ambiguity and its score is below 0.25. All original candidates must resolve for `VERIFIED_VISUALLY`; continued loss yields `UNRESOLVED`; weak evidence or processing errors yield `INCONCLUSIVE`. The original proposal and subsequent measurements remain inspectable.

## AWS execution

SAM defines an x86_64 Lambda container, IAM-protected Function URL, private encrypted S3, DynamoDB and CloudWatch. CodeBuild builds Linux images, asserts OpenCV/NumPy import and architecture compatibility, and executes backend tests before pushing an image. CloudFormation updates Lambda by immutable image digest. The local UI uses a server-side IAM proxy; processing remains on AWS while image transfers use private S3 tickets. DEPLOYMENT.md records how to run and verify it. Runtime proof is the generated `docs/evidence/aws-smoke.json`, not the existence of infrastructure source.

## Evaluation and findings

The independent generator produces 88 labeled synthetic inspections across eight seeds. Labels stay in the evaluator; detector inputs contain only images and expected-position annotations. The current run measures 48 true positives, eight false positives and zero false negatives: 85.71% precision and 100% recall. Expected next-action agreement is 80/88. Median pipeline latency is 82.91 ms and p95 is 106.21 ms locally. All 24 synthetic follow-up classifications are correct, including eight inconclusive blurred follow-ups.

The eight flat-occlusion failures show a fundamental ambiguity: edge/texture disappearance alone cannot distinguish a blocked product from empty shelf backing. The quality policy catches other blur, alignment and striped-occlusion cases in this benchmark but does not solve all occlusion. Synthetic design and shared appearance patterns make these results optimistic for unknown stores. See EVALUATION.md for case-level evidence.

## Reliability, security and future work

The build added regression coverage for preserved originals, overlay invalidation, verification-error recovery, cloud-proxy idempotency and large trace storage. AWS credentials stay outside browser code. Private image and trace retention is explicit. Remaining work for production includes a consented real-store benchmark, held-out threshold calibration, robust occlusion detection, worker interruption recovery, global quotas and a properly authenticated public UI. No inventory, SKU or physical-completion claims are made.
