# Security and privacy

## Access model

Run the server on `127.0.0.1`, not a public interface. Local mode assumes one trusted workstation operator. It checks Host and Origin against loopback values; this is not a replacement for authentication on a public deployment. Frontend files contain no AWS credentials or shared processing secret.

AWS mode uses the signed-in `shelfsignal` profile on the server. Browser login requires the pinned `awscrt` dependency in addition to Boto3/Botocore. Credentials stay in AWS-managed user configuration outside the repository. Do not export access keys into source files or paste them into chat.

Lambda Function URL uses `AWS_IAM`; direct Invoke also requires an authorized IAM principal. No public health exception is configured. An unsigned health request must return 403. S3 blocks all public access, encrypts objects and denies insecure transport. The runtime role permits only S3 GetObject/PutObject in its bucket and DynamoDB GetItem/PutItem in its table.

## Upload and processing controls

PNG, JPEG and WebP only; 8 MB maximum original; 16 megapixels maximum; dimensions from 160×120 to 6000 per side. EXIF orientation is applied only to decoded analysis images. Originals remain unmodified. Position coordinates must fit inside the image and have positive area; unique IDs and at most 60 regions are allowed.

Private S3 POST tickets expire after five minutes with a size condition. Completion checks the inspection prefix, kind, byte count, image decode and current state. Private download tickets expire after one minute and are consumed by the loopback proxy. The UI gets image bytes, not credentials.

Approval is validated server-side. Duplicate approvals do not create duplicate tasks. Client-provided idempotency UUIDs are preserved by the cloud proxy. Optimistic revision checks prevent stale saves. Original files and event traces are retained. Cloud record snapshots live in S3 to avoid truncating large event histories.

## Cost and retention

Lambda timeout: 30 seconds; memory: 2048 MB; current account concurrency limit: 10. The API allows 120 POST requests per process per minute. Analysis and verification retry loops have event-count guards. These controls do not enforce a global spending budget. Before longer public use, configure an AWS Budget with an operator-selected amount and notification address; that setup was not performed here.

Processor logs retain seven days. S3 images and record snapshots expire after 30 days; DynamoDB has a 30-day expiry timestamp and TTL. Local SQLite/images remain until the operator removes them. Stop the server before archiving or deleting the project `data/` directory. Never delete the source repository as a cleanup shortcut.

## Residual risk

The demo is not a multi-tenant production system. An authenticated caller can consume paid AWS resources. A leaked short-lived upload ticket grants its bounded object operation until expiry. Avoid customer faces and confidential store details in demo images. Neither image content nor model prompts are logged; AWS SDK errors are reduced to type names in the UI.
