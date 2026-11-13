import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { readFeatureQueue } from "../../scripts/feature-queue.js";
import { validateHarnessState } from "../../scripts/check-harness-state.js";
import type { HarnessFinding } from "../../scripts/harness-state-support.js";
import { validateReviewBinding, computeImplementationDigest } from "../../scripts/review-binding.js";
import { addReviewReport, createFixture, runGit } from "./review-binding-fixture.js";

const archived = { id: "TASK-010", title: "Earlier", status: "skipped", skip_reason: "Not needed.", acceptance_criteria: ["Works."] };

void test("split queues preserve order, global identity, and terminal archive rules", async () => {
  const root = await createFixture();
  const folder = join(root, "progress/feature-history");
  try {
    await mkdir(folder);
    await writeFile(join(folder, "002.json"), JSON.stringify([{ ...archived, id: "TASK-020" }]));
    await writeFile(join(folder, "001.json"), JSON.stringify([archived]));
    const findings: HarnessFinding[] = [];
    assert.deepEqual((await readFeatureQueue(root, findings))?.map(({ id }) => id), ["TASK-010", "TASK-020", "TASK-100"]);
    assert.deepEqual(findings, []);
    for (const value of [{ ...archived, id: " TASK-100 " }, { ...archived, status: "pending" }, { ...archived, status: "in_progress" }]) {
      await writeFile(join(folder, "001.json"), JSON.stringify([value]));
      const code = value.id.trim() === "TASK-100" ? "FEATURE_ID_DUPLICATE" : "QUEUE_ARCHIVE_NONTERMINAL";
      assert.ok((await validateHarnessState(root)).some((finding) => finding.code === code));
      assert.ok((await validateReviewBinding(root)).some((finding) => finding.code === code));
    }
    for (const text of ["{", "{}", "[null]"]) {
      await writeFile(join(folder, "001.json"), text);
      assert.notDeepEqual(await validateReviewBinding(root), []);
    }
    await writeFile(join(folder, "001.json"), "[]");
    await writeFile(join(folder, "wrong.json"), "[]");
    assert.equal((await validateReviewBinding(root))[0]?.code, "QUEUE_ARCHIVE_READ_FAILED");
    await rm(join(folder, "wrong.json"));
    await rm(join(folder, "001.json"));
    await mkdir(join(folder, "001.json"));
    assert.equal((await validateReviewBinding(root))[0]?.code, "QUEUE_ARCHIVE_READ_FAILED");
  } finally { await rm(root, { recursive: true, force: true }); }
});

void test("archiving the latest completed feature keeps its approval binding", async () => {
  const root = await createFixture();
  try {
    const digest = await addReviewReport(root);
    const queue = JSON.parse(await readFile(join(root, "feature_list.json"), "utf8")) as { status: string }[];
    queue[0].status = "done";
    await mkdir(join(root, "progress/feature-history"));
    await writeFile(join(root, "progress/feature-history/001.json"), JSON.stringify(queue));
    await writeFile(join(root, "feature_list.json"), "[]");
    await runGit(root, ["add", "feature_list.json", "progress"]);
    assert.equal(await computeImplementationDigest(root), digest);
    assert.deepEqual(await validateReviewBinding(root), []);
    await writeFile(join(root, "src/value.ts"), "export const value = 2;\n");
    await runGit(root, ["add", "src/value.ts"]);
    assert.notDeepEqual(await validateReviewBinding(root), [], "archived approval still binds implementation");
  } finally { await rm(root, { recursive: true, force: true }); }
});
