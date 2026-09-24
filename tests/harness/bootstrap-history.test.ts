import assert from "node:assert/strict";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { loadFinalReview, resolveFinalReviewPath } from "../../scripts/final-review.js";
import { validateHarnessState } from "../../scripts/check-harness-state.js";
import { validateReviewBinding } from "../../scripts/review-binding.js";
import { createFixture } from "./review-binding-fixture.js";

const HISTORY_PATH = "harness.bootstrap-history.json";
const queue = JSON.parse(await readFile(new URL("../../feature_list.json", import.meta.url), "utf8")) as Record<string, unknown>[];
const historical = queue.filter(({ id }) => ["TASK-001", "TASK-002", "TASK-004"].includes(String(id)));

void test("only the three preserved bootstrap definitions need no retrospective evidence", async () => {
  const root = await createFixture();
  try {
    await copyHistory(root);
    assert.equal(historical.length, 3);
    await writeQueue(root, historical);
    assert.deepEqual(await validateHarnessState(root), []);
    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("reused legacy IDs and altered definitions do not inherit an exemption", async () => {
  for (const original of historical) {
    for (const change of [{ title: "Replacement work" }, { acceptance_criteria: ["New scope."] }, { replacement: true }, { id: ` ${String(original.id)} ` }]) {
      const root = await createFixture();
      try {
        await copyHistory(root);
        await writeQueue(root, [{ ...original, ...change }]);
        assert.ok((await validateHarnessState(root)).some(({ code }) => code === "FEATURE_ISSUE_MISSING"));
        assert.ok((await validateReviewBinding(root)).some(({ code }) => code === "REVIEW_BINDING_ISSUE_MISSING"));
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  }
});

void test("historical final paths require unchanged original and final evidence", async () => {
  for (const [id, suffix] of [["TASK-005", "_followup"], ["TASK-009", "_followup"],
    ["TASK-011", "_followup"], ["TASK-022", "_round1"]] as const) {
    const root = await createFixture();
    const canonicalPath = `progress/review_${id}.md`;
    const historicalPath = `progress/review_${id}${suffix}.md`;
    try {
      await copyHistory(root);
      const original = await readFile(new URL(`../../${canonicalPath}`, import.meta.url), "utf8");
      const final = await readFile(new URL(`../../${historicalPath}`, import.meta.url), "utf8");
      await writeFile(join(root, canonicalPath), original);
      await writeFile(join(root, historicalPath), final);
      assert.equal(await resolveFinalReviewPath(root, id), historicalPath);
      assert.deepEqual((await loadFinalReview(root, id)).findings, []);
      await writeFile(join(root, canonicalPath), `${original}\nNew review: changes requested.\n`);
      assert.equal(await resolveFinalReviewPath(root, id), canonicalPath);
      await writeFile(join(root, canonicalPath), original);
      await writeFile(join(root, historicalPath), `${final}\nChanged evidence.\n`);
      assert.equal(await resolveFinalReviewPath(root, id), canonicalPath);
      await rm(join(root, historicalPath));
      assert.equal(await resolveFinalReviewPath(root, id), canonicalPath);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

async function copyHistory(root: string): Promise<void> {
  await cp(new URL(`../../${HISTORY_PATH}`, import.meta.url), join(root, HISTORY_PATH));
}

async function writeQueue(root: string, features: Record<string, unknown>[]): Promise<void> {
  await writeFile(join(root, "feature_list.json"), JSON.stringify(features));
}

void test("absent history grants no exemptions or alternate final reports", async () => {
  const root = await createFixture();
  try {
    for (const original of historical) {
      await writeQueue(root, [original]);
      assert.ok((await validateHarnessState(root)).some(({ code }) => code === "FEATURE_ISSUE_MISSING"));
      assert.ok((await validateReviewBinding(root)).some(({ code }) => code === "REVIEW_BINDING_ISSUE_MISSING"));
    }
    for (const suffix of ["", "_followup"]) {
      const path = `progress/review_TASK-005${suffix}.md`;
      await cp(new URL(`../../${path}`, import.meta.url), join(root, path));
    }
    assert.equal(await resolveFinalReviewPath(root, "TASK-005"), "progress/review_TASK-005.md");
    assert.notDeepEqual((await loadFinalReview(root, "TASK-005")).findings, []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

void test("malformed or unreadable history fails instead of granting partial exceptions", async () => {
  const root = await createFixture();
  const pins = JSON.parse(await readFile(new URL(`../../${HISTORY_PATH}`, import.meta.url), "utf8")) as {
    definitions: Record<string, string>; reviews: Record<string, object>;
  };
  const empty = { version: 1, definitions: {}, reviews: {} };
  const invalid = ["{", "null", "[]", {}, { ...empty, version: 2 }, { ...empty, extra: true },
    { ...empty, definitions: { "../escape": "a".repeat(64) } },
    { ...empty, definitions: { ...pins.definitions, INVALID: "bad hash" } },
    { ...empty, reviews: { "TASK-005": { ...pins.reviews["TASK-005"], suffix: "/../../escape" } } },
    { ...empty, reviews: { "TASK-005": { ...pins.reviews["TASK-005"], finalHash: 42 } } },
    { ...empty, reviews: { "TASK-005": { ...pins.reviews["TASK-005"], extra: true } } }];
  try {
    await writeQueue(root, historical);
    for (const value of invalid) {
      await writeFile(join(root, HISTORY_PATH), typeof value === "string" ? value : JSON.stringify(value));
      const state = await validateHarnessState(root);
      assert.equal(state[0]?.code, "BOOTSTRAP_HISTORY_INVALID");
      assert.deepEqual(await validateReviewBinding(root), state);
      assert.equal((await loadFinalReview(root, "TASK-005")).findings[0]?.code, "BOOTSTRAP_HISTORY_INVALID");
    }
    await rm(join(root, HISTORY_PATH));
    await mkdir(join(root, HISTORY_PATH));
    assert.equal((await validateHarnessState(root))[0]?.code, "BOOTSTRAP_HISTORY_INVALID");
    assert.equal((await validateReviewBinding(root))[0]?.code, "BOOTSTRAP_HISTORY_INVALID");
    await rm(join(root, HISTORY_PATH), { recursive: true });
    await writeFile(join(root, HISTORY_PATH), JSON.stringify(empty));
    await writeQueue(root, []);
    assert.deepEqual(await validateHarnessState(root), []);
    assert.deepEqual(await validateReviewBinding(root), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
