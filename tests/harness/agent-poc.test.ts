import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { agentCommand } from "../../scripts/poc/agent-session.js";

const inventory = JSON.stringify({ version: 1, targets: [{
  path: ".", packageName: "poc-app", deployable: false,
  typecheck: { command: "pnpm run check" }, test: { command: "pnpm run test" },
  build: { notApplicable: "This package is not deployed." },
}] });

async function fixture(run: (root: string, id: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "agent-poc-test-"));
  try { await run(root, String((await agentCommand(root, ["start"])).sessionId)); }
  finally { await rm(root, { recursive: true, force: true }); }
}

async function handoff(root: string, id: string): Promise<void> {
  await agentCommand(root, ["write", id], inventory);
  await agentCommand(root, ["check", id]);
  await agentCommand(root, ["handoff", id]);
}

async function review(root: string, id: string, verdict = "approved"): Promise<void> {
  const checked = await agentCommand(root, ["check", id]);
  await agentCommand(root, ["review", id], JSON.stringify({ verdict, digest: checked.digest, reason: "Reviewed the fixture." }));
}

void test("agent commands persist across processes and finish only after independent checks", async () => {
  await fixture(async (root, id) => {
    await handoff(root, id);
    const script = 'import {agentCommand} from "./scripts/poc/agent-session.ts"; console.log(JSON.stringify(await agentCommand(process.argv[1],["check",process.argv[2]])));';
    const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script, root, id],
      { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 15000 });
    assert.equal(child.status, 0, child.stderr);
    const state = await agentCommand(root, ["read", id]);
    assert.ok(state.reviewerCheck);
    await agentCommand(root, ["review", id], JSON.stringify({ verdict: "approved", digest: state.digest, reason: "Checks passed." }));
    const result = await agentCommand(root, ["finish", id]);
    assert.equal(result.passed, true);
    assert.equal(result.phase, "completed");
    assert.equal(result.inventory, inventory);
    await assert.rejects(agentCommand(root, ["write", id], "{}"), /implementing/);
    await agentCommand(root, ["clean", id]);
    assert.deepEqual(await readdir(root), []);
  });
});

void test("handoff requires a passing current check and reviewer cannot edit", async () => {
  await fixture(async (root, id) => {
    await assert.rejects(agentCommand(root, ["handoff", id]), /implementer check/);
    await agentCommand(root, ["check", id]);
    await assert.rejects(agentCommand(root, ["handoff", id]), /implementer check/);
    await agentCommand(root, ["write", id], inventory);
    await agentCommand(root, ["check", id]);
    await agentCommand(root, ["write", id], inventory + "\n");
    await assert.rejects(agentCommand(root, ["handoff", id]), /implementer check/);
    await agentCommand(root, ["check", id]);
    await agentCommand(root, ["handoff", id]);
    await assert.rejects(agentCommand(root, ["write", id], "{}"), /implementing/);
    await assert.rejects(agentCommand(root, ["finish", id]), /reviewer check/);
  });
});

void test("stale, unchecked, missing, and duplicate approvals fail", async () => {
  await fixture(async (root, id) => {
    await handoff(root, id);
    const state = await agentCommand(root, ["read", id]);
    const approval = JSON.stringify({ verdict: "approved", digest: state.digest, reason: "Reviewed" });
    await assert.rejects(agentCommand(root, ["review", id], approval), /must check/);
    await agentCommand(root, ["check", id]);
    await assert.rejects(agentCommand(root, ["finish", id]), /matching independent approval/);
    await assert.rejects(agentCommand(root, ["review", id], JSON.stringify({ verdict: "approved", digest: "0".repeat(64), reason: "Reviewed" })), /digest/);
    await agentCommand(root, ["review", id], approval);
    await assert.rejects(agentCommand(root, ["review", id], approval), /already been submitted/);
    const path = join(root, `${id}.json`);
    const changed = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    changed.inventory = inventory + "\n";
    await writeFile(path, JSON.stringify(changed));
    await assert.rejects(agentCommand(root, ["finish", id]), /implementer check/);
  });
});

void test("rejection reopens implementation and requires fresh review", async () => {
  await fixture(async (root, id) => {
    await handoff(root, id);
    await review(root, id, "changes_requested");
    const state = await agentCommand(root, ["read", id]);
    assert.equal(state.phase, "implementing");
    assert.equal(state.implementerCheck, undefined);
    await assert.rejects(agentCommand(root, ["finish", id]), /reviewing/);
    await handoff(root, id);
    await review(root, id);
    assert.equal((await agentCommand(root, ["finish", id])).passed, true);
  });
});

void test("invalid input preserves state; clean can remove malformed state", async () => {
  await fixture(async (root, id) => {
    const original = await readFile(join(root, `${id}.json`), "utf8");
    for (const args of [["read", "../../package"], ["unknown", id], ["start", id], ["read", id, "extra"]]) {
      await assert.rejects(agentCommand(root, args), /Usage/);
    }
    await assert.rejects(agentCommand(root, ["write", id], "x".repeat(16001)));
    assert.equal(await readFile(join(root, `${id}.json`), "utf8"), original);
    await writeFile(join(root, `${id}.json`), "{");
    await assert.rejects(agentCommand(root, ["read", id]));
    await agentCommand(root, ["clean", id]);
    assert.deepEqual(await readdir(root), []);
  });
});

void test("concurrent commands reject one writer and release the session lock", async () => {
  await fixture(async (root, id) => {
    const results = await Promise.allSettled([
      agentCommand(root, ["check", id]), agentCommand(root, ["write", id], inventory),
    ]);
    assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.match(String(rejected?.reason), /busy/);
    await agentCommand(root, ["write", id], inventory);
    assert.deepEqual(await readdir(root), [`${id}.json`]);
  });
});

void test("final validation rejects forged successful evidence for an invalid inventory", async () => {
  await fixture(async (root, id) => {
    const state = await agentCommand(root, ["read", id]);
    await writeFile(join(root, `${id}.json`), JSON.stringify({
      version: 1, phase: "reviewing", inventory: state.inventory,
      implementerCheck: { digest: state.digest, passed: true }, reviewerCheck: { digest: state.digest, passed: true },
      review: { verdict: "approved", digest: state.digest, reason: "Forged evidence" },
    }));
    await assert.rejects(agentCommand(root, ["finish", id]), /Final inventory validation failed/);
  });
});

void test("CLI explains usage and rejects invalid arguments and oversized stdin", () => {
  for (const [args, input, status, pattern] of [
    [["--help"], "", 0, /invoking agent/],
    [["unknown"], "", 1, /Usage/],
    [["write", "00000000-0000-4000-8000-000000000000"], "x".repeat(20001), 1, /20000 bytes/],
  ] as const) {
    const child = spawnSync(process.execPath, ["--import", "tsx", "scripts/poc/agent-cli.ts", ...args],
      { encoding: "utf8", input, env: { PATH: process.env.PATH }, timeout: 15000 });
    assert.equal(child.status, status, child.stderr);
    assert.match(status === 0 ? child.stdout : child.stderr, pattern);
  }
});
