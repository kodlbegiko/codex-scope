import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

const {
  buildComparisonDocument,
  compareNormalizedSides,
} = require("../dist/comparison.js");

function evidence(agent, ruleId) {
  return {
    adapter_version: `${agent}-adapter.v1`,
    evidence_date: "2026-09-23",
    upstream_repository:
      agent === "codex" ? "openai/codex" : "google-gemini/gemini-cli",
    upstream_commit:
      agent === "codex"
        ? "94174e44cbc54cece45f6052328ca0c2cd7a8a2a"
        : "62364cb2000795537a6895261b37ec668e4cf527",
    references: ["conformance/manifest.json"],
    rule_ids: [ruleId],
  };
}

function resolved(agent, dimension, value, reason = "Resolved fixture input.") {
  return {
    agent,
    semantic_dimension: dimension,
    status: "resolved",
    normalized_value: value,
    applicability: "active",
    runtime_dependency: "none",
    source_record_count: 1,
    reason,
  };
}

function baseInput(id, dimension, left, right, resolvedRelation) {
  return {
    comparison_id: id,
    semantic_dimension: dimension,
    left,
    right,
    resolved_relation: resolvedRelation,
    provenance: {
      left: [{ scope: "left-fixture", reason: "Deterministic left fixture." }],
      right: [
        { scope: "right-fixture", reason: "Deterministic right fixture." },
      ],
    },
    evidence: {
      left: evidence("codex", "codex.fixture." + id),
      right: evidence("gemini", "gemini.fixture." + id),
    },
  };
}

test("comparison engine deterministically covers all six classifications", () => {
  const sameDimension = "config.normalized_boolean";
  const same = compareNormalizedSides(
    baseInput(
      "classification.same",
      sameDimension,
      resolved("codex", sameDimension, true),
      resolved("gemini", sameDimension, true),
      "same",
    ),
  );
  assert.equal(same.classification, "same");
  assert.equal(same.normalized_relation, "same");

  const equivalentDimension = "instructions.project_entrypoint_exists";
  const equivalent = compareNormalizedSides(
    baseInput(
      "classification.equivalent",
      equivalentDimension,
      resolved(
        "codex",
        equivalentDimension,
        true,
        "Derived from AGENTS.md entrypoint evidence.",
      ),
      resolved(
        "gemini",
        equivalentDimension,
        true,
        "Derived from GEMINI.md entrypoint evidence.",
      ),
      "equivalent",
    ),
  );
  assert.equal(equivalent.classification, "semantically_equivalent");
  assert.equal(equivalent.normalized_relation, "equivalent");

  const differentDimension = "instructions.entrypoint.default_filename";
  const different = compareNormalizedSides(
    baseInput(
      "classification.different",
      differentDimension,
      resolved("codex", differentDimension, ["AGENTS.md"]),
      resolved("gemini", differentDimension, ["GEMINI.md"]),
      "different",
    ),
  );
  assert.equal(different.classification, "behaviorally_different");
  assert.equal(different.normalized_relation, "different");

  const unsupportedDimension = "instructions.runtime_mcp_effective_content";
  const unsupported = compareNormalizedSides(
    baseInput(
      "classification.unsupported",
      unsupportedDimension,
      {
        agent: "codex",
        semantic_dimension: unsupportedDimension,
        status: "unsupported",
        applicability: "unknown",
        runtime_dependency: "unsupported",
        source_record_count: 1,
        reason: "This fixture side is formally unsupported.",
      },
      resolved("gemini", unsupportedDimension, false),
    ),
  );
  assert.equal(unsupported.classification, "unsupported_on_one_side");
  assert.deepEqual(unsupported.unsupported_metadata, {
    side: "left",
    reason: "This fixture side is formally unsupported.",
  });

  const unresolvedDimension = "trust.workspace_state";
  const unresolved = compareNormalizedSides(
    baseInput(
      "classification.unresolved",
      unresolvedDimension,
      {
        agent: "codex",
        semantic_dimension: unresolvedDimension,
        status: "unresolved",
        applicability: "conditional",
        runtime_dependency: "trust",
        source_record_count: 1,
        reason: "Trust input is not known.",
      },
      resolved("gemini", unresolvedDimension, true),
    ),
  );
  assert.equal(unresolved.classification, "unresolved");
  assert.deepEqual(unresolved.unresolved_metadata, {
    sides: ["left"],
    reasons: ["Trust input is not known."],
    dependencies: ["trust"],
  });

  const gapDimension = "instructions.runtime_only_channel";
  const gap = compareNormalizedSides(
    baseInput(
      "classification.evidence-gap",
      gapDimension,
      {
        agent: "codex",
        semantic_dimension: gapDimension,
        status: "evidence_gap",
        applicability: "unknown",
        runtime_dependency: "evidence_gap",
        source_record_count: 0,
        reason: "No evidence-backed mapping exists for this side.",
      },
      resolved("gemini", gapDimension, true),
    ),
  );
  assert.equal(gap.classification, "evidence_gap");
  assert.equal(gap.normalized_relation, "not_comparable");
});

test("unresolved takes precedence over unsupported when certainty is absent", () => {
  const dimension = "instructions.runtime_boundary";
  const result = compareNormalizedSides(
    baseInput(
      "precedence.unresolved-over-unsupported",
      dimension,
      {
        agent: "codex",
        semantic_dimension: dimension,
        status: "unsupported",
        applicability: "unknown",
        runtime_dependency: "unsupported",
        source_record_count: 1,
        reason: "Codex side is unsupported.",
      },
      {
        agent: "gemini",
        semantic_dimension: dimension,
        status: "unresolved",
        applicability: "conditional",
        runtime_dependency: "runtime",
        source_record_count: 1,
        reason: "Gemini side depends on runtime state.",
      },
    ),
  );

  assert.equal(result.classification, "unresolved");
  assert.equal(result.normalized_relation, "not_comparable");
  assert.deepEqual(result.unresolved_metadata?.sides, ["right"]);
});

test("resolved comparisons require an explicit deterministic relation", () => {
  const dimension = "config.resolved-value";
  assert.throws(
    () =>
      compareNormalizedSides(
        baseInput(
          "resolved.missing-relation",
          dimension,
          resolved("codex", dimension, 1),
          resolved("gemini", dimension, 1),
        ),
      ),
    /resolved_relation/,
  );
});

test("comparison document builder sorts deterministically and recalculates counts", () => {
  const dimension = "config.normalized_boolean";
  const later = compareNormalizedSides(
    baseInput(
      "z.last",
      dimension,
      resolved("codex", dimension, true),
      resolved("gemini", dimension, false),
      "different",
    ),
  );
  const earlier = compareNormalizedSides(
    baseInput(
      "a.first",
      dimension,
      resolved("codex", dimension, true),
      resolved("gemini", dimension, true),
      "same",
    ),
  );

  const document = buildComparisonDocument([later, earlier]);
  assert.deepEqual(
    document.comparisons.map((item) => item.comparison_id),
    ["a.first", "z.last"],
  );
  assert.deepEqual(document.counts, {
    same: 1,
    semantically_equivalent: 0,
    behaviorally_different: 1,
    unsupported_on_one_side: 0,
    unresolved: 0,
    evidence_gap: 0,
    total: 2,
  });
});
