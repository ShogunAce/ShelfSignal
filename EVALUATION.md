# Synthetic evaluation

Run `.\.venv\Scripts\python.exe fixtures/generator/generate.py` and `.\.venv\Scripts\python.exe -m evaluation.run` from the repository root. The generator uses base seed 7200 with eight seeds and eleven variations per seed. The initial and refreshed measurements are from synthetic images; there is no real-store validation set.

## Measured run

The current authoritative output is [evaluation/results.json](evaluation/results.json), with per-case rows in [evaluation/results.csv](evaluation/results.csv) and follow-up outcomes in [evaluation/verification.json](evaluation/verification.json).

| Measure | Result |
|---|---:|
| Inspection images | 88 |
| True positive positions | 48 |
| False positive positions | 8 |
| False negative positions | 0 |
| Position precision | 85.71% |
| Position recall | 100% |
| Expected action agreement | 80/88 = 90.91% |
| Quality accepted | 64/88 |
| Wrong-shelf alignment rejections | 8/8 |
| Median OpenCV processing duration | 82.91 ms |
| p95 OpenCV processing duration | 106.21 ms |
| Follow-up classifications correct | 24/24 |
| Blurred follow-ups correctly inconclusive | 8/8 |

Latency is local pipeline timing in this run, excluding uploads, HTTP round trips and AWS cold starts. It is machine- and load-dependent. The benchmark classifies predefined positions, so matched-position IoU is 1 by construction and is not an independent localization result.

## Cases and scoring

Each seed contains unchanged, single gap, multiple gaps, refill, still empty, blurred, wrong shelf, striped occlusion, exposure change, small camera rotation and flat occlusion cases. Regions define expected positions, not missing-product labels. Predictions receive images and these positions only. The evaluator separately compares predicted candidate IDs with labels. Rejected-quality images produce no actionable candidates.

The verification set contains eight refilled, eight still-empty and eight blurred follow-ups to a single-gap inspection. The evaluator uses the same thresholds as the application; integration tests additionally execute the actual state machine and tool trace. These cases share the synthetic generator and are not an independent held-out store dataset. There are no confidence intervals or calibrated probabilities.

## Failure analysis

All eight false positives are `flat_occlusion`: a low-texture rectangle covers a product. Its lost edges and texture resemble an empty position, and the pipeline proposes human review instead of requesting a rescan. Do not hide this case or count the human-review requirement as a correct automated classification. A future solution needs real shelf captures and evidence that distinguishes shelf backing from occluders.

| Example | Artifact |
|---|---|
| Correct possible gap | [single_gap.png](docs/evidence/single_gap.png) |
| Correct no-change | [no_change.png](docs/evidence/no_change.png) |
| Correct rescan | [blur.png](docs/evidence/blur.png) |
| Verified refill | [ui-verified.png](docs/evidence/ui-verified.png) |
| Ambiguous false positive | [flat_occlusion.png](docs/evidence/flat_occlusion.png) |

Synthetic results do not establish product recognition, real-store accuracy, labor savings or commercial value.
