import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

const {
  buildComparisonDocument,
  compareNormalizedSides,
} = require("../dist/comparison.js");
const {
  COMPARISON_CI_SCHEMA_VERSION,
  summarizeComparisonForCi,
  toolErrorComparisonCiSummary,
} = require("../dist/comparison-ci.js");

function evidence(agent, id) {
  return {
    adapter_version: `${agent}-adapter.v1`,
    evidence_date: "2026-09-23",
    upstream_repository:
      agent === "codex" ? "openai/codex" : "google-gemini/gemini-cli",
    upstream_commit:
      agent === "codex"
        ? "94174e44cbc54cece45f6052328ca0c2cd7a8a2a"
        : "62364cb2000795537a6895261b37ec668e4cf527",
    references: ["tests/comparison-ci.test.mjs"],
    rule_ids: ["fixture." + id],
  };
}

function resolved(agent, dimension, value) {
  return {
    agent,
    semantic_dimension: dimension,
    status: "resolved",
    normalized_value: value,
    applicability: "active",
    runtime_dependency: "none",
    source_record_count: 1,
    reason: "Resolved CI-outcome fixture.",
  };
}

function record(id, left, right, resolvedRelation) {
  const dimension = "fixture." + id;
  return compareNormalizedSides({
    comparison_id: id,
    semantic_dimension: dimension,
    left: { ...left, semantic_dimension: dimension },
    right: { ...right, semantic_dimension: dimension },
    resolved_relation: resolvedRelation,
    provenance: {
      left: [{ scope: "fixture", reason: "Left CI fixture." }],
      right: [{ scope: "fixture", reason: "Right CI fixture." }],
    },
    evidence: {
      left: evidence("codex", id),
      right: evidence("gemini", id),
    },
  });
}

test("CI summary defines stable conservative outcome precedence", () => {
  const same = record(
    "a.same",
    resolved("codex", "placeholder", true),
    resolved("gemini", "placeholder", true),
    "same",
  );
  const drift = record(
    "b.drift",
    resolved("codex", "placeholder", "AGENTS.md"),
    resolved("gemini", "placeholder", "GEMINI.md"),
    "different",
  );
  const unsupported = record(
    "c.unsupported",
    {
      agent: "codex",
      status: "unsupported",
      applicability: "unknown",
      runtime_dependency: "unsupported",
      source_record_count: 1,
      reason: "Codex side is unsupported.",
    },
    resolved("gemini", "placeholder", true),
  );
  const unresolved = record(
    "d.unresolved",
    {
      agent: "codex",
      status: "unresolved",
      applicability: "conditional",
      runtime_dependency: "trust",
      source_record_count: 1,
      reason: "Trust is unresolved.",
    },
    resolved("gemini", "placeholder", true),
  );
  const gap = record(
    "e.evidence-gap",
    {
      agent: "codex",
      status: "evidence_gap",
      applicability: "unknown",
      runtime_dependency: "evidence_gap",
      source_record_count: 0,
      reason: "No evidence-backed mapping exists.",
    },
    resolved("gemini", "placeholder", true),
  );

  assert.deepEqual(
    summarizeComparisonForCi(buildComparisonDocument([same])),
    {
      schema_version: "codex-scope.semantic-comparison-ci.v1",
      outcome: "clean",
      observed_outcomes: ["clean"],
      counts: {
        same: 1,
        semantically_equivalent: 0,
        behaviorally_different: 0,
        unsupported_on_one_side: 0,
        unresolved: 0,
        evidence_gap: 0,
        total: 1,
      },
      reason: "All comparison records are resolved without proven drift.",
    },
  );

  assert.equal(
    summarizeComparisonForCi(buildComparisonDocument([drift])).outcome,
    "proven_drift",
  );
  assert.equal(
    summarizeComparisonForCi(buildComparisonDocument([unsupported])).outcome,
    "unsupported",
  );
  assert.equal(
    summarizeComparisonForCi(buildComparisonDocument([unresolved])).outcome,
    "unresolved",
  );

  const gapSummary = summarizeComparisonForCi(
    buildComparisonDocument([gap]),
  );
  assert.equal(gapSummary.outcome, "unresolved");
  assert.equal(gapSummary.counts.evidence_gap, 1);

  const mixed = summarizeComparisonForCi(
    buildComparisonDocument([drift, unsupported, unresolved]),
  );
  assert.equal(mixed.outcome, "unresolved");
  assert.deepEqual(mixed.observed_outcomes, [
    "proven_drift",
    "unsupported",
    "unresolved",
  ]);
});

test("tool errors have a versioned CI outcome without fabricating comparison counts", () => {
  const summary = toolErrorComparisonCiSummary(
    "Malformed comparison input.",
  );
  assert.equal(COMPARISON_CI_SCHEMA_VERSION, "codex-scope.semantic-comparison-ci.v1");
  assert.deepEqual(summary, {
    schema_version: "codex-scope.semantic-comparison-ci.v1",
    outcome: "tool_error",
    observed_outcomes: ["tool_error"],
    counts: null,
    reason: "Malformed comparison input.",
  });
});
