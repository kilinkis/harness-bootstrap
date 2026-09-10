import { createHash } from "node:crypto";

// Pin the complete original definitions, independent of JSON object key order.
// Fresh adopters can replace this map with an empty map; do not re-pin changed work.
const HISTORICAL_DEFINITIONS: Record<string, string> = {
  "TASK-001": "378ebddb313279043bce0f15e31a7ec1cb310948c8ffa9d756bf21d835375910",
  "TASK-002": "e34bf13fd6c1d199770287b6ef0bf1b5b551fc0fc230c450070b275ee827cdd9",
  "TASK-004": "4b1ef97e63dd3e7bb7b6be4fb0eadd2fdccefad15135cd9480998af654827d93",
};

export function isLegacyBootstrapFeature(value: Record<string, unknown>): boolean {
  if (typeof value.id !== "string") return false;
  const expected = HISTORICAL_DEFINITIONS[value.id];
  if (!expected) return false;
  const definition = JSON.stringify(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
  return createHash("sha256").update(definition).digest("hex") === expected;
}
