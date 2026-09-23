import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cli = path.resolve("dist/cli.js");

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env: { ...process.env },
  });
}

test("compare codex gemini emits the versioned JSON-only comparison envelope", () => {
  const result = run([
    "compare",
    "codex",
    "gemini",
    "--codex-input",
    "fixtures/comparison/cli-codex-input.json",
    "--gemini-input",
    "fixtures/comparison/cli-gemini-input.json",
    "--json",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");

  const parsed = JSON.parse(result.stdout);
  assert.equal(
    parsed.schema_version,
    "codex-scope.semantic-comparison-cli.v1",
  );
  assert.equal(
    parsed.comparison.schema_version,
    "codex-scope.semantic-comparison.v1",
  );
  assert.equal(
    parsed.comparison.normalization_version,
    "codex-scope.semantic-normalization.v1",
  );
  assert.equal(
    parsed.ci_summary.schema_version,
    "codex-scope.semantic-comparison-ci.v1",
  );
  assert.equal(parsed.ci_summary.outcome, "unresolved");
  assert.deepEqual(parsed.comparison.counts, {
    same: 0,
    semantically_equivalent: 2,
    behaviorally_different: 1,
    unsupported_on_one_side: 0,
    unresolved: 0,
    evidence_gap: 1,
    total: 4,
  });
});
