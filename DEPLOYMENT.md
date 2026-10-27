# Deployment and judge access

## Verified deployment configuration

Region: `us-west-2`; stack: `shelfsignal`; function: `shelfsignal-processor`.

The actual immutable image URI, source archive hash, CodeBuild ID and stack outputs are in [docs/evidence/deployment.json](docs/evidence/deployment.json). Deployment success is separate from runtime proof; [docs/evidence/aws-smoke.json](docs/evidence/aws-smoke.json) is created only after the real cloud checks pass.

The smoke run passed on October 26, 2026 Pacific time: Python 3.12.15, OpenCV 5.0.0, NumPy 2.4.3, x86_64. It exercised the full approved-task loop plus no-change, blur and alignment-failure branches, confirmed private image hashes and persisted traces, and observed HTTP 403 for unsigned access. Both infrastructure templates passed CloudFormation validation; new-account bootstrap itself has not been executed.

The Function URL is `https://jxjp7jcl44devwaqapkazj662i0xsnup.lambda-url.us-west-2.on.aws/`. It is IAM-protected and is **not a public demo website**. An unsigned request is expected to return 403.

## Hosted synthetic judge demonstration

Open https://shelf-signals.netlify.app/workspace/. No account is required for bundled synthetic examples. Select **Load example**, **Analyze shelf**, **Approve restock task**, **Load synthetic refill**, then **Verify original regions**. Approval creates a task; only the separate comparison can visually verify its follow-up.

The `shelfsignal-guest-demo` CloudFormation stack supplies a public HTTP API and a narrow gateway Lambda. Netlify proxies `/api/*` to it. A random 256-bit, HttpOnly, Secure, SameSite=Strict cookie grants a four-hour synthetic session; only its SHA-256 digest is stored. Every inspection and media read is checked against session ownership. Mutation requests require the configured website origin, but origin checks are not treated as authentication. The server supplies allowlisted fixture files and reference geometry. It never accepts user uploads, arbitrary region changes, processor paths, or fixture ground-truth labels. AWS IAM authorizes the gateway to invoke only `shelfsignal-processor`; that processor's Function URL remains private.

The gateway limits each session to 25 examples, 100 actions and 500 requests per four-hour quota window. Global daily caps are 500 new sessions and 5,000 processor calls. API Gateway throttles at 10 requests/second with a burst of 20. These are abuse controls, not a guarantee of zero cost. Sessions and ownership records expire after four hours; original images and immutable processor traces retain the existing 30-day lifecycle. Refreshing an expired session starts a new demo; prior sessions cannot be recovered without an account system.

Account registration and personal-photo workflows are deferred. Anyone with the public site URL can use this bounded demo, including judges. Do not describe the public URL as private or access-restricted to the team.

Deploy the gateway after the private processor and generated fixtures exist:

```powershell
.\.venv\Scripts\python.exe scripts/deploy_guest_demo.py --bucket <private-build-bucket> --profile shelfsignal --region us-west-2
```

Read the completed stack's `ApiUrl` output and set the `/api/*` destination in `netlify.toml`. `VITE_GUEST_DEMO=true` selects the hosted UI. To verify the published site, run `npx playwright test --config playwright.guest.config.ts` from `frontend`. This suite uses real AWS processing and checks session isolation, original image hashes, explicit approval, refill verification, no-change/blur branches, and loading all ten cases. It writes results to `docs/evidence/netlify/guest-browser.json`.

## Run the local judge demonstration

```powershell
Set-Location C:\Users\coled\Projects\ShelfSignal
aws login --profile shelfsignal --region us-west-2
.\scripts\start.ps1 -Cloud -Profile shelfsignal
```

Open http://127.0.0.1:8000/workspace/ and confirm **AWS Lambda / OpenCV 5.0.0**. Use the synthetic example workflow described in DEMO_SCRIPT.md. Run the demo on the authenticated operator workstation by arranged screen-share, or configure an appropriately authorized AWS identity on the judge's own workstation. Never share the operator's root credentials or browser session. The hosted synthetic-only alternative above requires no workstation setup.

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

## Netlify frontend hosting

The root `netlify.toml` sets the base directory to `frontend`, runs `npm run build`, and publishes `dist` relative to that base. Node 22 is selected explicitly. Netlify should install the frontend's npm dependencies and run Vite; a log saying "No build steps found" or publishing from `/` means this configuration was not used. Deploy the latest `main` commit after importing the repository. The published root must contain the generated `index.html`, `assets/`, `media/`, `examples/`, and `workspace/index.html`.

Netlify serves the frontend and proxies `/api/*` to the separately deployed synthetic gateway described above. It does not run FastAPI. No AWS credentials belong in frontend environment variables. The local workspace continues to support operator uploads through the existing authenticated AWS proxy.

## Cost, retention and cleanup

CloudFormation provisions Lambda at 2048 MB with a 30-second timeout. The observed account concurrency cap is 10, with no reserved per-function concurrency. API limits are per process. Processor logs retain seven days; application S3 and DynamoDB data expire after 30 days. No AWS Budget was created; configure an operator-selected amount and email before extended use.

Stopping the local proxy stops this UI's requests but does not delete cloud resources. To retire the deployment, first export needed evidence, then delete the runtime stack; a nonempty S3 bucket may require deliberate removal of its objects. ECR/build resources exist separately and require separate cleanup. Do not run destructive cleanup during judging. Exact existing names are recorded in deployment.json; no cleanup has been executed by this build.
