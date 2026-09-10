import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const REPOSITORY_ROOT = new URL("../../", import.meta.url);

void test("primary entry points expose the adoption checklist", async () => {
  const readme = await readRepositoryFile("README.md");
  const agentGuide = await readRepositoryFile("AGENTS.md");
  const checklist = await readRepositoryFile("ADOPTION_CHECKLIST.md");
  const readinessGuide = await readRepositoryFile(
    "docs/production-readiness.md",
  );
  const handoffGuide = await readRepositoryFile("docs/adoption-handoff.md");

  assert.match(readme, /\[Harness Adoption Checklist\]\(ADOPTION_CHECKLIST\.md\)/);
  assert.match(agentGuide, /`ADOPTION_CHECKLIST\.md`/);
  assert.match(
    readinessGuide,
    /\[Harness Adoption Checklist\]\(\.\.\/ADOPTION_CHECKLIST\.md\)/,
  );
  assert.match(agentGuide, /`docs\/adoption-handoff\.md`/);
  assert.match(readme, /\[adoption handoff protocol\]\(docs\/adoption-handoff\.md\)/);
  assert.match(checklist, /\[adoption handoff protocol\]\(docs\/adoption-handoff\.md\)/);
  assert.match(handoffGuide, /Harness adoption: complete or incomplete/);
  assert.match(handoffGuide, /Project-gate adoption: complete or incomplete/);
  assert.match(handoffGuide, /Product readiness: not assessed, partially assessed, or complete/);
});

void test("adoption guidance covers targets, builds, and negative proof", async () => {
  const checklist = await readRepositoryFile("ADOPTION_CHECKLIST.md");
  const verificationGuide = await readRepositoryFile("docs/verification.md");
  const pullRequestTemplate = await readRepositoryFile(
    ".github/pull_request_template.md",
  );

  assert.match(
    checklist,
    /\| Target \| Path \| Deployable \| Type check \| Tests \| Production build \| Required CI check \| Deployment evidence \|/,
  );
  assert.match(checklist, /"verify:project"/);
  assert.match(checklist, /deliberate negative test/i);
  assert.match(checklist, /deployment preview status is required/i);
  assert.match(verificationGuide, /Project verification extension/);
  assert.match(verificationGuide, /root `tsc --noEmit` command covers a monorepo/);
  assert.match(pullRequestTemplate, /Affected deployable targets:/);
  assert.match(pullRequestTemplate, /Production-build command and result:/);
});

void test("adoption handoff preserves the completion boundary", async () => {
  const handoffGuide = await readRepositoryFile("docs/adoption-handoff.md");

  assert.match(handoffGuide, /A passing harness gate does not prove product readiness/);
  assert.match(handoffGuide, /offer to create or start that work item immediately/);
  assert.match(handoffGuide, /Do not claim that the product is production-ready/);
  assert.match(handoffGuide, /Suggested final response/);
});

async function readRepositoryFile(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, REPOSITORY_ROOT), "utf8");
}
