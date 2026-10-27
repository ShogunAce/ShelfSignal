// Every number below is copied from executed evidence in the repository.
// Sources: fixtures/elevenlabs/vision-checks.json, docs/evidence/elevenlabs/*.json,
// docs/evidence/aws-smoke.json and evaluation/results.json (see EVALUATION.md).
import regionsJson from '../public/media/regions.json';

export type Box = [number, number, number, number];
export const regions = regionsJson.regions as {id: string; box: Box}[];

export const missing = {
  id: 'R2-3',
  score: 0.881,
  edge: 0.011,
  texture: 0.281,
  changed: 0.504,
  sharpness: 1964.33,
  matches: 2187,
  inliers: 0.979,
  reprojection: 0.039,
};

export const followups = {
  refilledAfter: 0.002, // docs/evidence/elevenlabs/resolved.json
  stillEmpty: 0.882, // fixtures/elevenlabs/vision-checks.json still-empty.jpg
  blurSharpness: 2.64,
  minSharpness: 45,
};

export const trace = [
  ['create_inspection', 'CREATED'],
  ['upload_reference', 'CREATED'],
  ['upload_image', 'CREATED'],
  ['define_positions', 'CREATED'],
  ['analyze_shelf', 'ANALYZING'],
  ['assess_evidence_quality', 'EVIDENCE_READY'],
  ['propose_restock_task', 'APPROVAL_REQUIRED'],
  ['approve_or_reject_task', 'TASK_APPROVED'],
  ['upload_followup', 'VERIFICATION_PENDING'],
  ['compare_followup', 'VERIFICATION_PENDING'],
  ['finalize_verification', 'VERIFIED_VISUALLY'],
] as const;

export const evaluation = {
  inspections: 88,
  precision: 85.71,
  recall: 100,
  agreement: [80, 88],
  followups: [24, 24],
  wrongShelf: [8, 8],
  medianMs: 82.91,
  p95Ms: 106.21,
  falsePositives: 8,
};

export const aws = {
  opencv: '5.0.0',
  python: '3.12.15',
  arch: 'x86_64',
  unsigned: 403,
  retentionDays: 30,
  region: 'us-west-2',
};
