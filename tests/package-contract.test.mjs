import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("published package has explicit Phase D verification gates", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  assert.equal(
    pkg.scripts["package:contents:check"],
    "node scripts/package-contents-check.mjs",
  );
  assert.equal(
    pkg.scripts["phase:d:external:check"],
    "node scripts/external-user-cases-check.mjs",
  );
  assert.equal(
    pkg.scripts["phase:d:status:check"],
    "node scripts/phase-d-status-check.mjs",
  );

  const workflow = fs.readFileSync(
    path.resolve(".github/workflows/ci.yml"),
    "utf8",
  );
  assert.match(workflow, /npm run phase:d:external:check/);
  assert.match(workflow, /npm run phase:d:status:check/);
  assert.match(workflow, /npm run package:contents:check/);
  assert.match(workflow, /npm pack/);
  assert.ok(
    workflow.indexOf("npm run phase:d:external:check") <
      workflow.indexOf("npm run phase:d:status:check"),
  );
  assert.ok(
    workflow.indexOf("npm run phase:d:status:check") <
      workflow.indexOf("npm run package:contents:check"),
  );

  const script = fs.readFileSync(
    path.resolve("scripts/package-contents-check.mjs"),
    "utf8",
  );
  for (const required of [
    "conformance/schema/semantic-comparison.schema.json",
    "conformance/schema/semantic-comparison-ci.schema.json",
    "conformance/schema/semantic-comparison-cli.schema.json",
    "conformance/schema/phase-d-status.schema.json",
    "conformance/schema/external-user-cases.schema.json",
    "conformance/schema/structural-differences.schema.json",
    "conformance/comparison/phase-d-status.json",
    "conformance/comparison/external-user-cases.json",
    "conformance/comparison/structural-differences.json",
    "conformance/comparison/version-contract.json",
    "conformance/comparison/cli-codex-gemini.json",
  ]) {
    assert.equal(script.includes(required), true, required);
  }
});
