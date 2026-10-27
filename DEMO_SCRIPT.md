# Demo script — under five minutes

Before recording: run `scripts/start.ps1 -Cloud`, open http://127.0.0.1:8000/workspace/, confirm AWS Lambda/OpenCV 5.0.0, and keep ARCHITECTURE.md and EVALUATION.md ready. Authenticate privately before screen-sharing. All demo photographs are synthetic.

**0:00–0:30 — User and scope.** “ShelfSignal is a visual inspection tool for a shift supervisor. It compares a shelf with a reference, asks for human review and checks a follow-up photograph. It does not identify SKUs or know store inventory. The manual-workflow premise is an assumption; we have not conducted user research.”

**0:30–1:10 — Reference and evidence.** Select One missing position and Load example. Explain that expected product positions are operator annotations, not labels telling the detector where the missing product is. Point to the AWS runtime indicator. Click Analyze shelf and show the marked R2-2 region, edge/texture diagnostics and measured processing time.

**1:10–1:45 — Agent proposal and approval.** Open the trace evidence for `assess_evidence_quality` and `propose_restock_task`. “The deterministic agent chose review because the evidence passed its quality gate. This is a heuristic score, not a probability.” Click Approve restock task. Show that approval creates a task but makes no physical-completion claim.

**1:45–2:30 — Close the loop.** Load synthetic refill, then Verify original regions. Show the follow-up overlay, before/after score and `VERIFIED_VISUALLY`. Explain that the comparison checks the original candidate positions and does not prove a real restock operation or correct SKU. Reload to demonstrate persistence.

**2:30–3:10 — A different action.** Load Blurred capture and analyze. Show `RESCAN_REQUIRED`, the quality reason and absence of approval controls. If time permits, load No change and show no restock proposal.

**3:10–3:50 — AWS and quantitative evidence.** Show the architecture and `docs/evidence/aws-smoke.json`: cloud OpenCV version, signed processing, private image hashes and persisted traces. State the measured synthetic precision 85.7%, recall 100%, action agreement 80/88 and correct follow-up classification 24/24. These are synthetic, not real-store results.

**3:50–4:35 — Failure and limits.** Show `docs/evidence/flat_occlusion.png`: “A flat occluder can mimic a gap. This caused eight false positives. Human review is therefore essential.” Note the absence of SKU recognition, public hosting, customer research and production accuracy claims.

**4:35–4:50 — Reproduction.** Point to README.md, TESTING.md and the exact deployment evidence. End on the actual workspace.

A real edited AWS workflow recording is available at `docs/demo/ShelfSignal-demo.mp4` (254.71 seconds, 1920×1080), credited to Kenosis Interactive. It uses locally synthesized narration and explanatory title cards. Recording metadata and the transcript are alongside the video. The recording uses synthetic photographs; it does not depict a real store operation. Upload or link this video in the competition entry.
