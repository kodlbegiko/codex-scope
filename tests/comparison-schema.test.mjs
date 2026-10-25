import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

const {
  validateComparisonDocument,
} = require("../dist/comparison.js");

const schemaPath = path.resolve(
  "conformance/schema/semantic-comparison.schema.json",
);

function evidence(agent) {
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
    rule_ids: [
      agent === "codex"
        ? "codex.instructions.project_hierarchy"
        : "gemini.instructions.workspace_hierarchy",
    ],
  };
}

function side(agent, value) {
  return {
    agent,
    semantic_dimension: "instructions.entrypoint.default_filename",
    status: "resolved",
    normalized_value: value,
    applicability: "active",
    runtime_dependency: "none",
    source_record_count: 1,
    reason: "Deterministic fixture value.",
  };
}

function record(overrides = {}) {
  return {
    comparison_id: "instructions.default-filename",
    agent_a: "codex",
    agent_b: "gemini",
    semantic_dimension: "instructions.entrypoint.default_filename",
    left: side("codex", ["AGENTS.md"]),
    right: side("gemini", ["GEMINI.md"]),
    classification: "behaviorally_different",
    normalized_relation: "different",
    reason:
      "Both sides resolve deterministic default instruction filenames and the normalized values differ.",
    provenance: {
      left: [
        {
          scope: "project",
          reason: "Pinned Codex instruction discovery contract.",
        },
      ],
      right: [
        {
          scope: "workspace",
          reason: "Pinned Gemini context filename contract.",
        },
      ],
    },
    evidence: {
      left: evidence("codex"),
      right: evidence("gemini"),
    },
    unsupported_metadata: null,
    unresolved_metadata: null,
    ...overrides,
  };
}

function document(records = [record()]) {
  return {
    schema_version: "codex-scope.semantic-comparison.v1",
    normalization_version: "codex-scope.semantic-normalization.v1",
    counts: {
      same: records.filter((item) => item.classification === "same").length,
      semantically_equivalent: records.filter(
        (item) => item.classification === "semantically_equivalent",
      ).length,
      behaviorally_different: records.filter(
        (item) => item.classification === "behaviorally_different",
      ).length,
      unsupported_on_one_side: records.filter(
        (item) => item.classification === "unsupported_on_one_side",
      ).length,
      unresolved: records.filter(
        (item) => item.classification === "unresolved",
      ).length,
      evidence_gap: records.filter(
        (item) => item.classification === "evidence_gap",
      ).length,
      total: records.length,
    },
    comparisons: records,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("semantic comparison schema declares the closed six-class taxonomy", () => {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  assert.equal(schema.additionalProperties, false);
  assert.equal(
    schema.properties.schema_version.const,
    "codex-scope.semantic-comparison.v1",
  );

  const classification =
    schema.$defs.comparison_record.properties.classification.enum;
  assert.deepEqual(classification, [
    "same",
    "semantically_equivalent",
    "behaviorally_different",
    "unsupported_on_one_side",
    "unresolved",
    "evidence_gap",
  ]);
  assert.equal(
    classification.some((value) =>
      ["better", "worse", "winner", "score", "rank", "recommended"].includes(
        value,
      ),
    ),
    false,
  );
});

test("valid comparison documents pass the runtime schema contract", () => {
  assert.doesNotThrow(() => validateComparisonDocument(document()));
});

test("unknown classifications are rejected", () => {
  const invalid = document();
  invalid.comparisons[0].classification = "winner";
  assert.throws(
    () => validateComparisonDocument(invalid),
    /unknown classification/,
  );
});

test("missing provenance and evidence are rejected", () => {
  for (const field of ["provenance", "evidence"]) {
    const invalid = document();
    delete invalid.comparisons[0][field];
    assert.throws(
      () => validateComparisonDocument(invalid),
      new RegExp(field),
    );
  }
});

test("resolved classifications cannot carry unresolved metadata", () => {
  const invalid = document();
  invalid.comparisons[0].unresolved_metadata = {
    sides: ["left"],
    reasons: ["Synthetic unresolved state."],
    dependencies: ["runtime"],
  };
  assert.throws(
    () => validateComparisonDocument(invalid),
    /unresolved_metadata/,
  );
});

test("unsupported classification must identify the unsupported side", () => {
  const item = record({
    classification: "unsupported_on_one_side",
    normalized_relation: "not_comparable",
    left: {
      ...side("codex", undefined),
      status: "unsupported",
      runtime_dependency: "unsupported",
    },
    unsupported_metadata: {
      side: "left",
      reason: "Codex side is unsupported for this dimension.",
    },
  });
  delete item.left.normalized_value;
  const valid = document([item]);
  assert.doesNotThrow(() => validateComparisonDocument(valid));

  const invalid = clone(valid);
  invalid.comparisons[0].unsupported_metadata = null;
  assert.throws(
    () => validateComparisonDocument(invalid),
    /unsupported_metadata/,
  );
});

test("evidence gaps cannot claim resolved equality or difference", () => {
  const item = record({
    classification: "evidence_gap",
    normalized_relation: "same",
    left: {
      ...side("codex", undefined),
      status: "evidence_gap",
      applicability: "unknown",
      runtime_dependency: "evidence_gap",
    },
  });
  delete item.left.normalized_value;
  assert.throws(
    () => validateComparisonDocument(document([item])),
    /normalized_relation/,
  );
});

test("same-agent comparisons are rejected", () => {
  const invalid = document();
  invalid.comparisons[0].agent_b = "codex";
  invalid.comparisons[0].right.agent = "codex";
  invalid.comparisons[0].evidence.right = evidence("codex");
  assert.throws(
    () => validateComparisonDocument(invalid),
    /agent_a and agent_b must differ/,
  );
});

test("dimension mismatches are rejected", () => {
  const invalid = document();
  invalid.comparisons[0].right.semantic_dimension =
    "instructions.hierarchy.initial_loading";
  assert.throws(
    () => validateComparisonDocument(invalid),
    /semantic_dimension/,
  );
});

test("duplicate ids, unstable ordering, and stale counts are rejected", () => {
  const second = record({
    comparison_id: "trust.workspace-config",
    semantic_dimension: "trust.workspace_config_applicability",
    left: {
      ...side("codex", true),
      semantic_dimension: "trust.workspace_config_applicability",
    },
    right: {
      ...side("gemini", true),
      semantic_dimension: "trust.workspace_config_applicability",
    },
    classification: "same",
    normalized_relation: "same",
  });

  const duplicate = document([record(), record()]);
  assert.throws(
    () => validateComparisonDocument(duplicate),
    /duplicate comparison_id/,
  );

  const unsorted = document([second, record()]);
  assert.throws(
    () => validateComparisonDocument(unsorted),
    /stable comparison_id ordering/,
  );

  const stale = document([record(), second]);
  stale.counts.total = 99;
  assert.throws(
    () => validateComparisonDocument(stale),
    /stale comparison counts/,
  );
});
