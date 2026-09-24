import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  validateComparisonDocument,
} = require("../dist/comparison.js");

const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));

test("Phase D machine-readable status is internally consistent and fail-closed", () => {
  const schema = readJson("conformance/schema/phase-d-status.schema.json");
  const status = readJson("conformance/comparison/phase-d-status.json");
  const taxonomy = readJson("fixtures/comparison/classifications.json");
  const demoPath = path.resolve(
    "conformance/comparison/codex-gemini-demo.json",
  );
  const demoText = fs.readFileSync(demoPath, "utf8");
  const demo = JSON.parse(demoText);
  const ciSchema = readJson(
    "conformance/schema/semantic-comparison-ci.schema.json",
  );
  const ciSummary = readJson(
    "conformance/comparison/codex-gemini-demo-ci.json",
  );
  const realRepositories = readJson(
    "conformance/research/gemini-cli/real-repositories.json",
  );
  const packageJson = readJson("package.json");
  const workflow = fs.readFileSync(
    path.resolve(".github/workflows/ci.yml"),
    "utf8",
  );

  assert.equal(schema.additionalProperties, false);
  assert.equal(
    schema.properties.schema_version.const,
    "codex-scope.phase-d-status.v1",
  );
  assert.equal(status.schema_version, "codex-scope.phase-d-status.v1");
  assert.equal(status.phase, "D");
  assert.equal(status.internal_deterministic_status, "pass");

  assert.equal(
    status.comparison_schema.version,
    "codex-scope.semantic-comparison.v1",
  );
  assert.equal(
    status.normalization.version,
    "codex-scope.semantic-normalization.v1",
  );
  assert.equal(ciSchema.additionalProperties, false);
  assert.equal(
    ciSchema.properties.schema_version.const,
    "codex-scope.semantic-comparison-ci.v1",
  );
  assert.equal(
    status.ci_outcomes.version,
    "codex-scope.semantic-comparison-ci.v1",
  );
  assert.equal(status.ci_outcomes.status, "pass");
  assert.equal(
    status.ci_outcomes.demo_path,
    "conformance/comparison/codex-gemini-demo-ci.json",
  );
  assert.equal(
    status.ci_outcomes.precedence,
    "unresolved > unsupported > proven_drift > clean",
  );
  assert.equal(status.ci_outcomes.evidence_gap_maps_to, "unresolved");

  const expectedClasses = [
    "same",
    "semantically_equivalent",
    "behaviorally_different",
    "unsupported_on_one_side",
    "unresolved",
    "evidence_gap",
  ].sort();
  assert.deepEqual(
    Object.keys(status.classifications).sort(),
    expectedClasses,
  );
  assert.deepEqual(
    [...new Set(taxonomy.cases.map((item) => item.expected_classification))]
      .sort(),
    expectedClasses,
  );
  for (const classification of expectedClasses) {
    assert.equal(status.classifications[classification], "pass");
  }

  assert.equal(status.integration.codex, "pass");
  assert.equal(status.integration.gemini, "pass");
  assert.equal(
    status.integration.sanitized_repository_count,
    realRepositories.validations.length,
  );
  assert.ok(status.integration.sanitized_repository_count >= 3);
  assert.equal(status.integration.sanitized_repository_status, "pass");

  validateComparisonDocument(demo);
  assert.equal(
    demo.schema_version,
    status.comparison_schema.version,
  );
  assert.equal(
    ciSummary.schema_version,
    status.ci_outcomes.version,
  );
  assert.equal(ciSummary.outcome, "unresolved");
  assert.deepEqual(ciSummary.observed_outcomes, [
    "proven_drift",
    "unresolved",
  ]);
  assert.deepEqual(ciSummary.counts, demo.counts);
  assert.equal(ciSummary.counts.evidence_gap, 1);
  assert.equal(status.sanitized_demonstration.status, "pass");
  assert.equal(
    status.sanitized_demonstration.path,
    "conformance/comparison/codex-gemini-demo.json",
  );
  assert.equal(
    status.sanitized_demonstration.ci_command,
    "npm run comparison:demo:check",
  );
  assert.equal(demoText.includes(path.resolve(process.cwd())), false);

  for (const comparison of demo.comparisons) {
    for (const evidence of [
      comparison.evidence.left,
      comparison.evidence.right,
    ]) {
      assert.ok(evidence.adapter_version.length > 0);
      assert.match(evidence.upstream_commit, /^[0-9a-f]{40}$/);
      assert.ok(evidence.references.length > 0);
      assert.ok(evidence.rule_ids.length > 0);
    }
  }
  assert.equal(status.provenance.status, "pass");
  assert.equal(status.provenance.adapter_versions, "preserved");
  assert.equal(status.provenance.upstream_commits, "preserved");
  assert.equal(status.provenance.rule_ids, "preserved");
  assert.equal(status.provenance.references, "preserved");

  for (const value of Object.values(status.safety)) {
    assert.equal(value, false);
  }

  const external = status.external_proof_of_value;
  const externalPassed =
    external.verified_external_user_cases >=
    external.required_external_user_cases;
  assert.equal(external.required_external_user_cases, 3);
  assert.equal(
    external.status,
    externalPassed ? "pass" : "blocked",
  );
  assert.equal(
    status.phase_status,
    externalPassed &&
      status.false_certainty_blockers.count === 0
      ? "complete"
      : "blocked_external_proof",
  );
  assert.equal(status.false_certainty_blockers.count, 0);
  assert.equal(status.false_certainty_blockers.status, "pass");

  assert.equal(
    packageJson.scripts["comparison:demo:check"],
    "node scripts/semantic-comparison-demo.mjs --check",
  );
  assert.match(workflow, /npm run comparison:demo:check/);
});
