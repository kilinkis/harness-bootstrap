import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface HistoricalReview {
  suffix: string;
  originalHash: string;
  finalHash: string;
}

export interface BootstrapHistory {
  version: 1;
  definitions: Record<string, string>;
  reviews: Record<string, HistoricalReview>;
}

const HISTORY_PATH = "harness.bootstrap-history.json";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const HASH = /^[a-f0-9]{64}$/;

export async function readBootstrapHistory(root: string): Promise<BootstrapHistory> {
  let text: string;
  try {
    text = await readFile(resolve(root, HISTORY_PATH), "utf8");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return { version: 1, definitions: {}, reviews: {} };
    throw new Error(`Cannot read ${HISTORY_PATH}`, { cause: error });
  }
  let value: unknown;
  try { value = JSON.parse(text) as unknown; }
  catch { throw new Error(`${HISTORY_PATH} is not valid JSON`); }
  if (!isHistory(value)) throw new Error(`${HISTORY_PATH} must contain version 1 and valid definition/review pins`);
  return value;
}

export function isLegacyBootstrapFeature(value: Record<string, unknown>, history: BootstrapHistory): boolean {
  if (typeof value.id !== "string" || !Object.hasOwn(history.definitions, value.id)) return false;
  const expected = history.definitions[value.id];
  const definition = JSON.stringify(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
  return createHash("sha256").update(definition).digest("hex") === expected;
}

function isHistory(value: unknown): value is BootstrapHistory {
  if (!isRecord(value) || Object.keys(value).length !== 3 || value.version !== 1 ||
    !isRecord(value.definitions) || !isRecord(value.reviews)) return false;
  return Object.entries(value.definitions).every(([id, hash]) => SAFE_ID.test(id) && isHash(hash)) &&
    Object.entries(value.reviews).every(([id, review]) => SAFE_ID.test(id) && isReview(review));
}

function isReview(value: unknown): value is HistoricalReview {
  return isRecord(value) && Object.keys(value).length === 3 &&
    typeof value.suffix === "string" && /^_(?:followup|round[1-9][0-9]*)$/.test(value.suffix) &&
    isHash(value.originalHash) && isHash(value.finalHash);
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && HASH.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
