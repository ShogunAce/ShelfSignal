# ShelfSignal motion demo (Remotion)

An 80-second, 1920×1080 / 30 fps animated product explainer built with [Remotion](https://www.remotion.dev/) 4.0.535. It is a motion-graphics walkthrough, **not** a screen recording of the app. The real recorded AWS workflow remains at `docs/demo/ShelfSignal-demo.mp4`.

## Scenes

| # | Scene | Feature shown |
|---|---|---|
| — | Intro | Brand mark, OpenCV 5 / AWS Lambda / human-in-the-loop |
| 00 | What it does | Photograph → Measure → Review → Verify; scope limits |
| 01 | Reference & positions | 18 operator-defined expected positions on the baseline |
| 02 | Analyze shelf | Alignment diagnostics, scan, R2-3 flagged with edge/texture ratios |
| 03 | Policy engine & trace | Persisted tool calls and state transitions |
| 04 | Human approval | Approve task; `physical_completion: false` |
| 05 | Verify follow-through | Refill wipe, score 0.881 → 0.002, `VERIFIED_VISUALLY` |
| 06 | Different actions | Still empty → UNRESOLVED, blurred → RESCAN_REQUIRED, no change → no proposal |
| 07 | AWS workload | Workspace → loopback FastAPI → Lambda → S3 / DynamoDB / CloudWatch, unsigned 403 |
| 08 | Measured evaluation | Synthetic benchmark results and the flat-occlusion failure case |
| — | Outro | Repository link and synthetic-imagery disclosure |

## Data provenance

Every number is copied from executed evidence; see `src/data.ts` for sources (`fixtures/elevenlabs/vision-checks.json`, `docs/evidence/elevenlabs/*.json`, `docs/evidence/aws-smoke.json`, `evaluation/results.json`). All shelf images are the synthetic ElevenLabs-generated fixtures copied into `public/media/`. The feature-match lines in scene 02 are illustrative; the counts beside them are measured.

## Commands

```powershell
Set-Location video
npm ci
npm run studio   # interactive Remotion Studio preview
npm run render   # writes out/ShelfSignal-motion-demo.mp4
```

Fonts (Manrope, JetBrains Mono) load through `@remotion/google-fonts` at render time. There is no audio track.
