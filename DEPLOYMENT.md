# Deployment and judge access

## Verified deployment configuration

Region: `us-west-2`; stack: `shelfsignal`; function: `shelfsignal-processor`.

The actual immutable image URI, source archive hash, CodeBuild ID and stack outputs are in [docs/evidence/deployment.json](docs/evidence/deployment.json). Deployment success is separate from runtime proof; [docs/evidence/aws-smoke.json](docs/evidence/aws-smoke.json) is created only after the real cloud checks pass.

The smoke run passed on October 26, 2026 Pacific time: Python 3.12.15, OpenCV 5.0.0, NumPy 2.4.3, x86_64. It exercised the full approved-task loop plus no-change, blur and alignment-failure branches, confirmed private image hashes and persisted traces, and observed HTTP 403 for unsigned access. Both infrastructure templates passed CloudFormation validation; new-account bootstrap itself has not been executed.

The Function URL is `https://jxjp7jcl44devwaqapkazj662i0xsnup.lambda-url.us-west-2.on.aws/`. It is IAM-protected and is **not a public demo website**. An unsigned request is expected to return 403.

## Run the judge demonstration

```powershell
Set-Location C:\Users\coled\Projects\ShelfSignal
aws login --profile shelfsignal --region us-west-2
.\scripts\start.ps1 -Cloud -Profile shelfsignal
```

Open http://127.0.0.1:8000 and confirm **AWS Lambda / OpenCV 5.0.0**. Use the synthetic example workflow described in DEMO_SCRIPT.md. Run the demo on the authenticated operator workstation by arranged screen-share, or configure an appropriately authorized AWS identity on the judge's own workstation. Never share the operator's root credentials or browser session. There is no independently accessible hosted judge UI.

The AWS login uses temporary credentials. Runtime Boto3 needs the pinned `awscrt` package. If the UI reports a proxy error, refresh `aws login`, confirm the profile/region, and restart the proxy. Do not switch to local mode while claiming an AWS demonstration.

## Rebuild the existing account

```powershell
.\.venv\Scripts\python.exe scripts/deploy.py --profile shelfsignal --region us-west-2
```

The script checks identity and existing build resources, packages allowlisted backend/generator/infrastructure sources and exact dependency files, uploads to the private build bucket, runs CodeBuild, waits for a successful Linux test build, resolves the pushed ECR digest, creates an inspectable CloudFormation change set, then deploys it. A failed build stops deployment. Docker and SAM CLI are not needed on Windows: CodeBuild supplies Docker, and CloudFormation applies the SAM transform. This command incurs AWS charges.

Source archives exclude `.aws`, `.env`, user data, node_modules and virtual environments. Build inputs are identified by a SHA-256 hash. The running service role is restricted to the application bucket and table.

## New-account bootstrap

This path is supplied for reproduction but has not been executed in a second account. Do not run it over the existing account's build resources, which already have these names.

```powershell
aws cloudformation deploy --template-file infrastructure/bootstrap.yaml --stack-name shelfsignal-build-infrastructure --capabilities CAPABILITY_IAM --profile shelfsignal --region us-west-2
.\.venv\Scripts\python.exe scripts/deploy.py --profile shelfsignal --region us-west-2
```

The bootstrap template creates ECR, a private build source bucket, a CodeBuild role/project and build logs. The deployment script supports creating a missing runtime stack. Bootstrap and build/deploy permissions are broader than the least-privilege runtime role and should be held only by the deployment operator.

## Verify actual AWS execution

With the cloud-mode local server running:

```powershell
.\.venv\Scripts\python.exe scripts/cloud_smoke.py --profile shelfsignal --region us-west-2
```

The script checks the cloud runtime, IAM-protected access, gap/no-change/blur/alignment branching, approved-task follow-up outcomes, source-image hashes in private S3, DynamoDB/S3 trace equality, image retrieval and idempotency through the proxy. It saves real inspection IDs and complete event traces. Tests use synthetic images only.

## Cost, retention and cleanup

CloudFormation provisions Lambda at 2048 MB with a 30-second timeout. The observed account concurrency cap is 10, with no reserved per-function concurrency. API limits are per process. Processor logs retain seven days; application S3 and DynamoDB data expire after 30 days. No AWS Budget was created; configure an operator-selected amount and email before extended use.

Stopping the local proxy stops this UI's requests but does not delete cloud resources. To retire the deployment, first export needed evidence, then delete the runtime stack; a nonempty S3 bucket may require deliberate removal of its objects. ECR/build resources exist separately and require separate cleanup. Do not run destructive cleanup during judging. Exact existing names are recorded in deployment.json; no cleanup has been executed by this build.
