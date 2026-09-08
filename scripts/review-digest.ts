import { resolve } from "node:path";

import { computeImplementationDigest } from "./review-binding.js";

const root = resolve(process.argv[2] ?? ".");

try {
  console.log(await computeImplementationDigest(root));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Cannot compute review digest");
  process.exitCode = 1;
}
