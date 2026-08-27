import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FALLOW_BINARY = join(
  REPOSITORY_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "fallow.cmd" : "fallow",
);

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface FallowConfig {
  entry: string[];
  duplicates: {
    mode: string;
    minTokens: number;
    minLines: number;
    minOccurrences: number;
    threshold: number;
  };
  health: {
    maxCyclomatic: number;
    maxCognitive: number;
    maxCrap: number;
    maxUnitSize: number;
  };
}

const REPOSITORY_FALLOW_CONFIG = await loadRepositoryFallowConfig();

void test("ESLint rejects a TypeScript file over the configured line limit", async () => {
  const oversizedSource = Array.from(
    { length: 301 },
    (_, index) => `export const value${index} = ${index};`,
  ).join("\n");

  const [result] = await lintRepositoryFixture(oversizedSource);

  assert.ok(
    result.messages.some(({ ruleId }) => ruleId === "max-lines"),
    JSON.stringify(result.messages),
  );
});

void test("Fallow health reports excessive function complexity", async () => {
  const decisionPoints = Array.from(
    { length: 21 },
    (_, index) => `  if (value === ${index}) return "${index}";`,
  ).join("\n");
  const padding = Array.from({ length: 40 }, () => "  value += 1;").join("\n");
  const fixture = await createFallowFixture({
    "src/index.ts": `
export function classify(value: number): string {
${decisionPoints}
${padding}
  return "other";
}
`,
  });

  try {
    const result = await runFallow(fixture, ["health", "--complexity", "--fail-on-issues"]);
    const report = parseObject(result.stdout);

    assert.equal(result.exitCode, 1, `${result.stderr}\n${result.stdout}`);
    assert.ok(Array.isArray(report.findings));
    assert.ok(report.findings.length > 0);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

void test("Fallow duplication reports repeated code", async () => {
  const duplicateSource = `
export function normalize(value: number): string {
  const doubled = value * 2;
  const adjusted = doubled + 10;
  const bounded = Math.max(0, adjusted);
  const rounded = Math.round(bounded);
  const formatted = rounded.toFixed(2);
  return formatted;
}
`;
  const fixture = await createFallowFixture({
    "src/first.ts": duplicateSource,
    "src/index.ts": `import "./first.js";\nimport "./second.js";\n`,
    "src/second.ts": duplicateSource,
  });

  try {
    const result = await runFallow(fixture, ["dupes", "--fail-on-issues"]);
    const report = parseObject(result.stdout);

    assert.equal(result.exitCode, 1, `${result.stderr}\n${result.stdout}`);
    assert.ok(Array.isArray(report.clone_groups));
    assert.ok(report.clone_groups.length > 0);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

void test("a clean fixture passes the combined Fallow gate", async () => {
  const [eslintResult] = await lintRepositoryFixture(
    "export const qualityContractValue = 4;\n",
  );
  const fixture = await createFallowFixture({
    "src/index.ts": `
export function square(value: number): number {
  return value * value;
}

console.log(square(4));
`,
  });

  try {
    const result = await runFallow(fixture, ["--fail-on-issues"]);

    assert.equal(eslintResult.errorCount, 0, JSON.stringify(eslintResult.messages));
    assert.equal(result.exitCode, 0, result.stderr);
    assert.ok(Object.keys(parseObject(result.stdout)).length > 0);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

async function lintRepositoryFixture(source: string): Promise<Awaited<ReturnType<ESLint["lintFiles"]>>> {
  const fixtureDirectory = await mkdtemp(
    join(REPOSITORY_ROOT, "tests", "harness", "quality-contract-"),
  );
  const filePath = join(fixtureDirectory, "fixture.ts");
  const eslint = new ESLint({
    cwd: REPOSITORY_ROOT,
    overrideConfigFile: join(REPOSITORY_ROOT, "eslint.config.js"),
  });

  try {
    await writeFile(filePath, source);
    return await eslint.lintFiles(filePath);
  } finally {
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
}

async function createFallowFixture(
  files: Record<string, string>,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-quality-"));
  const config: FallowConfig = {
    ...REPOSITORY_FALLOW_CONFIG,
    entry: ["src/index.ts"],
  };
  await writeFile(join(root, "package.json"), JSON.stringify({ private: true, type: "module" }));
  await writeFile(join(root, ".fallowrc.json"), JSON.stringify(config));

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = join(root, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, contents.trimStart());
  }

  return root;
}

async function loadRepositoryFallowConfig(): Promise<FallowConfig> {
  const json = await readFile(join(REPOSITORY_ROOT, ".fallowrc.json"), "utf8");
  const value = parseObject(json);
  const duplicates = parseRecord(value.duplicates, "duplicates");
  const health = parseRecord(value.health, "health");

  assert.equal(typeof duplicates.mode, "string");
  assert.equal(typeof duplicates.minTokens, "number");
  assert.equal(typeof duplicates.minLines, "number");
  assert.equal(typeof duplicates.minOccurrences, "number");
  assert.equal(typeof duplicates.threshold, "number");
  assert.equal(typeof health.maxCyclomatic, "number");
  assert.equal(typeof health.maxCognitive, "number");
  assert.equal(typeof health.maxCrap, "number");
  assert.equal(typeof health.maxUnitSize, "number");

  return {
    entry: ["src/index.ts"],
    duplicates: duplicates as FallowConfig["duplicates"],
    health: health as FallowConfig["health"],
  };
}

function runFallow(root: string, commandArguments: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      FALLOW_BINARY,
      [
        ...commandArguments,
        "--root",
        root,
        "--config",
        join(root, ".fallowrc.json"),
        "--format",
        "json",
        "--quiet",
        "--no-cache",
      ],
      { cwd: root },
    );
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode: exitCode ?? -1, stdout, stderr });
    });
  });
}

function parseObject(json: string): Record<string, unknown> {
  const value: unknown = JSON.parse(json);
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}

function parseRecord(value: unknown, field: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), field);
  return value as Record<string, unknown>;
}
