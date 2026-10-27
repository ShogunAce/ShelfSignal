# ShelfSignal: ElevenLabs image test pack

These are synthetic images created through the signed-in ElevenLabs Image & Video website, using the model displayed there as **GPT Image 2.5 Sunburst**. They are not photographs from a real store.

## Try the images

For the built-in app flow, refresh http://127.0.0.1:8000, choose **AI shelf · Missing item**, and click **Load example**. The app loads both generated images and the 18 reference position boxes. Click **Analyze shelf**, approve the synthetic task, **Load synthetic refill**, then **Verify original regions**. The AI no-change and blurred examples are also available in the picker. No manual file uploads are needed for those examples.

For the complete manual follow-up sequence, including still-empty and inconclusive outcomes:

Open http://127.0.0.1:8000 on the deployment computer and click **New inspection**.

1. Upload `reference.png` as the reference.
2. Click **Draw position** and draw a rectangle inside the red **Oat Moments** carton: middle shelf, third carton from the left. At the original 1280 x 720 resolution, the test rectangle runs from (475, 265) to (620, 438).
3. Upload `missing-item.png` as the inspection image and click **Analyze shelf**. Review the proposed gap, then approve this synthetic test task.
4. Upload `still-empty.jpg` as the follow-up and verify: the gap should remain unresolved.
5. Replace the follow-up with `blurred.jpg` and verify: the evidence should be inconclusive.
6. Replace the follow-up with `refilled.jpg` and verify: the original position should be visually resolved. Refresh to check persistence.

In separate new inspections, use the same reference and rectangle with `no-change.jpg` to check that no task is proposed, or with `blurred.jpg` to request a rescan. Upload individual photographs, not the contact sheet or measured overlays.

## Files and provenance

| File | Purpose |
| --- | --- |
| `reference.png` | Stocked AI-generated reference used for the removal edit |
| `missing-item.png` | ElevenLabs edit removing the red carton |
| `refilled.jpg` | Stocked reference with slight brightness change and JPEG encoding; simulated refill |
| `still-empty.jpg` | Missing-item edit with slight brightness change and JPEG encoding |
| `blurred.jpg` | Missing-item edit with deterministic Gaussian blur |
| `no-change.jpg` | Stocked reference with slight brightness change and JPEG encoding |
| `contact-sheet.jpg` | Overview for browsing, not inspection input |
| `regions.json` | 18 operator-style position annotations defined on the stocked reference |
| `vision-checks.json` | Actual OpenCV results for all six inputs |
| `provenance.json` | Image origins, transformations and SHA-256 checksums |
| `prompts.json` | Exact generation/edit prompts and settings |

`reference-original.png` preserves the first, unused reference variant. `missing-item-original.png` preserves the downloaded removal edit; `missing-item.png` is a byte-identical copy. All source images remain intact.

The reference and removal edit were generated with ElevenLabs. Follow-up and quality variants are documented local image transformations, not separate AI generations or independent captures. AI editing also changes some fine packaging details outside the removed carton. This small correlated test pack does not establish real-store accuracy.

## Verification

The local vision check uses all 18 reference boxes. It detects only R2-3 for the missing/still-empty images, detects no gap for the reference/refill/no-change images, and rejects the blurred image. These are observed results, not labels passed into prediction.

Rebuild local derivatives and rerun the image checks from the repository root:

```powershell
.\.venv\Scripts\python.exe -m scripts.prepare_elevenlabs_assets
```

With the AWS proxy running, reproduce the actual browser workflow from `frontend`:

```powershell
node verify-elevenlabs.mjs
```

Browser evidence is saved separately under `docs/evidence/elevenlabs`. The browser draws one reference position manually, so its generated position ID differs from R2-3. Test approval applies only to synthetic data and never asserts physical restocking.
