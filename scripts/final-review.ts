import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface HistoricalReview {
  suffix: string;
  originalHash: string;
  finalHash: string;
}

// Preserve the four final approvals written before canonical-only review validation.
// Both files must match their historical bytes; new work cannot inherit an exception.
const HISTORICAL_REVIEWS: Record<string, HistoricalReview> = {
  "TASK-005": {
    suffix: "_followup",
    originalHash: "b99fd6a4a21848aecd63225f405064d95a6bd101f18854050ccdacaede592133",
    finalHash: "75b7e6cf0bc6ec4df49780e10d072d8c9d9281fbd5e13ee08b1d071f76921a44",
  },
  "TASK-009": {
    suffix: "_followup",
    originalHash: "094f6c1a16adc2ec9328293f69e6e88456218f690f42ab09c08e9f9de6e3fc73",
    finalHash: "2cb468de2e5a7a0b4cc8e3153105c008e76d7c239cf558ec74fadfa1e8865160",
  },
  "TASK-011": {
    suffix: "_followup",
    originalHash: "75700a3c612c154aa97ca17dd746aa2847a66133cc45232db721d261b5a62512",
    finalHash: "094b889ccce0730f5f1f6e7a746d8119792a5d69ebe6de2b5aebeab4ffd9ee4c",
  },
  "TASK-022": {
    suffix: "_round1",
    originalHash: "bc7f6dc5d6c1e71e1401e67954ed47db0997e41830648b8197b4ec0437c5cad6",
    finalHash: "23a1e99ea5cc6d1336609f85ffd4f57fddcc824207a23f5fa3e0fb8f0edfc324",
  },
};

export async function resolveFinalReviewPath(root: string, featureId: string): Promise<string> {
  const canonicalPath = `progress/review_${featureId}.md`;
  const historical = HISTORICAL_REVIEWS[featureId];
  if (!historical) return canonicalPath;
  const historicalPath = `progress/review_${featureId}${historical.suffix}.md`;
  try {
    const [originalHash, finalHash] = await Promise.all(
      [canonicalPath, historicalPath].map(async (path) =>
        createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")
      ),
    );
    if (originalHash === historical.originalHash && finalHash === historical.finalHash) {
      return historicalPath;
    }
  } catch {
    // Missing historical evidence cannot authorize an alternate final report.
  }
  return canonicalPath;
}
