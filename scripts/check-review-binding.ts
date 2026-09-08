import { resolve } from "node:path";

import { validateReviewBinding } from "./review-binding.js";

const root = resolve(process.argv[2] ?? ".");
const base = process.env.HARNESS_BASE_REF ?? "origin/main";

try {
  const findings = await validateReviewBinding(root, base);
  if (findings.length === 0) console.log("review binding: valid");
  for (const finding of findings) {
    console.error(`${finding.code}: ${finding.message}`);
  }
  if (findings.length > 0) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Cannot validate review binding");
  process.exitCode = 1;
}
