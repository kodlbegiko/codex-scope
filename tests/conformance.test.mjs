import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("conformance JSON reports expected and actual outcomes separately", () => {
  const result = spawnSync(process.execPath, [path.resolve("scripts/conformance-check.mjs"), "--json"], {
    encoding: "utf8",
    env: { ...process.env },
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.schema_version, "codex-scope.conformance-run.v1");
  assert.equal(parsed.adapter_version, "codex-adapter.v1");
  assert.deepEqual(parsed.counts, {
    compatible: 25,
    behavior_drift: 0,
    unsupported: 3,
    unresolved: 4,
    tool_error: 0,
  });
  assert.equal(parsed.results.length, 32);

  const unknownVersion = parsed.results.find(
    (item) => item.rule_id === "codex.compatibility.unknown_version",
  );
  assert.equal(unknownVersion.expected_outcome, "unresolved");
  assert.equal(unknownVersion.actual_outcome, "unresolved");
  assert.deepEqual(unknownVersion.details, []);
});
