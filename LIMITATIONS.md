# Limitations

- Fixed reference and operator-defined positions are required. This is not SKU identification, stock counting, replenishment optimization or warehouse availability inference.
- A flat occluder can resemble an empty shelf position. Eight false positives occurred in 88 synthetic cases. Human review remains essential.
- Homography assumes an approximately planar shelf and similar viewpoint. Parallax, severe perspective changes, reflective packaging and relocated displays can defeat alignment or appearance comparison.
- Scores combine edge and texture losses. They are heuristic evidence, not calibrated probabilities.
- Only synthetic data has been evaluated. There are no customer interviews, observed time savings, real-store accuracy estimates or commercial results.
- Visual resolution shows that the original candidate position changed toward the reference. It cannot certify that the correct SKU was restocked or that a physical operation occurred.
- A single-operator loopback UI is used. There is no public hosted judge UI, multi-user identity system, tenant isolation or offline/cloud synchronization.
- Request limiting is per process; account-wide Lambda concurrency is currently 10. This is not a per-user daily spending cap. No billing budget has been created by this build.
- In-flight process termination can leave an inspection in ANALYZING or VERIFICATION_PENDING. Start a new inspection and retain the previous trace for diagnosis. Automatic recovery of interrupted workers is future work.
- Local data has no automatic expiry job. Cloud S3 lifecycle and DynamoDB TTL are asynchronous. Deletion is not guaranteed at an exact second.
- Optional LLM enrichment is omitted. No private photos are sent to a model provider, and an OpenAI key is not required.
- A real narrated demo video is recorded. No competition submission receipt is claimed; portal submission and judge-access arrangements remain pending.
