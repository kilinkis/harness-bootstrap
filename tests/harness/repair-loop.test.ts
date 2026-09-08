import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const REPOSITORY_ROOT = new URL("../../", import.meta.url);

void test("the repair protocol defines a bounded evidence loop", async () => {
  const guide = await readRepositoryFile("docs/repair-loop.md");

  assert.match(guide, /at most three repair attempts in one repair cycle/i);
  assert.match(guide, /newly exposed error uses the remaining cycle budget/i);
  assert.match(guide, /does not reset the count/i);
  assert.match(guide, /Observe the smallest reproducible failure/);
  assert.match(guide, /Diagnose its cause/);
  assert.match(guide, /Make the smallest change/);
  assert.match(guide, /Run the focused failing command again/);
  assert.match(guide, /Do not rerun an unchanged deterministic command/);
  assert.match(guide, /cannot detect an attempt that an agent did not record/i);
});

void test("the protocol defines immediate and exhausted-budget stops", async () => {
  const guide = await readRepositoryFile("docs/repair-loop.md");

  for (const requiredText of [
    "authority that the user did not give",
    "secret, credential, account, or external service",
    "destructive and is not clearly authorized",
    "acceptance criteria are ambiguous",
    "Stop after three unsuccessful repair attempts in one cycle",
    "Keep it active and report it as blocked",
  ]) {
    assert.match(guide, new RegExp(requiredText, "i"));
  }
});

void test("normal agent entry points link the repair protocol", async () => {
  for (const path of ["AGENTS.md", "agents/implementer.md", "docs/run-a-ticket.md"]) {
    assert.match(await readRepositoryFile(path), /docs\/repair-loop\.md|repair-loop\.md/);
  }
});

async function readRepositoryFile(path: string): Promise<string> {
  return readFile(new URL(path, REPOSITORY_ROOT), "utf8");
}
