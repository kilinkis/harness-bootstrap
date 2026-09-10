import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const REPOSITORY_ROOT = new URL("../../", import.meta.url);

void test("primary documentation links reach their local targets", async () => {
  const entries: [string, string[]][] = [
    ["README.md", ["ADOPTION_CHECKLIST.md", "docs/adoption-map.md", "docs/adoption-handoff.md", "docs/upgrading.md"]],
    ["ADOPTION_CHECKLIST.md", ["docs/adoption-map.md", "docs/adoption-handoff.md"]],
    ["docs/adoption-handoff.md", ["adoption-map.md", "../ADOPTION_CHECKLIST.md"]],
    ["docs/production-readiness.md", ["../ADOPTION_CHECKLIST.md"]],
    ["docs/run-a-ticket.md", ["repair-loop.md", "review-binding.md"]],
    ["agents/implementer.md", ["../docs/repair-loop.md", "../docs/review-binding.md"]],
  ];
  for (const [path, targets] of entries) {
    const url = new URL(path, REPOSITORY_ROOT);
    const contents = await readFile(url, "utf8");
    const links = [...contents.matchAll(/\[[^\]]*\]\(([^)#]+)(?:#[^)]*)?\)/g)].map((match) => match[1]);
    for (const target of targets) {
      assert.ok(links.includes(target), `${path} must link ${target}`);
      await access(new URL(target, url));
    }
  }
});
