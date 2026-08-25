#!/usr/bin/env bash
set -euo pipefail

node --input-type=module <<'JS'
import { readFile } from "node:fs/promises";

const queue = JSON.parse(await readFile("feature_list.json", "utf8"));
const allowed = new Set(["pending", "in_progress", "in_review", "done"]);
const ids = queue.map((item) => item.id);
if (ids.length !== new Set(ids).size || ids.some((id) => !id)) {
  throw new Error("feature_list.json must contain unique, non-empty IDs");
}
for (const item of queue) {
  if (!allowed.has(item.status)) throw new Error(`${item.id}: invalid status`);
  if (!item.title || !item.acceptance_criteria?.length) {
    throw new Error(`${item.id}: title and acceptance criteria are required`);
  }
}
const active = queue.filter((item) => ["in_progress", "in_review"].includes(item.status));
if (active.length > 1) throw new Error(`only one active feature is allowed; found: ${active.map((item) => item.id).join(", ")}`);
console.log("feature queue: valid");
JS

pnpm run verify
