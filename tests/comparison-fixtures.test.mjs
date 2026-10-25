import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

const {
  buildComparisonDocument,
  compareNormalizedSides,
} = require("../dist/comparison.js");

const fixture = JSON.parse(
  fs.readFileSync(
    path.resolve("fixtures/comparison/classifications.json"),
    "utf8",
  ),
);

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
    references: ["fixtures/comparison/classifications.json"],
    rule_ids: [`fixture.${id}`],
  };
}

function side(agent, dimension, fixtureSide) {
  return {
    agent,
    semantic_dimension: dimension,
    ...fixtureSide,
    source_record_count: 1,
  };
}

test("checked-in comparison fixtures cover all six deterministic classes", () => {
  assert.equal(
    fixture.schema_version,
    "codex-scope.semantic-comparison-fixtures.v1",
  );
  assert.deepEqual(
    fixture.cases.map((item) => item.expected_classification).sort(),
    [
      "behaviorally_different",
      "evidence_gap",
      "same",
      "semantically_equivalent",
      "unresolved",
      "unsupported_on_one_side",
    ].sort(),
  );

  const records = fixture.cases.map((item) =>
    compareNormalizedSides({
      comparison_id: "fixture." + item.id,
      semantic_dimension: item.dimension,
      left: side("codex", item.dimension, item.left),
      right: side("gemini", item.dimension, item.right),
      resolved_relation: item.resolved_relation,
      provenance: {
        left: [
          {
            scope: "fixture",
            path: "fixtures/comparison/classifications.json",
            reason: "Checked-in deterministic fixture.",
          },
        ],
        right: [
          {
            scope: "fixture",
            path: "fixtures/comparison/classifications.json",
            reason: "Checked-in deterministic fixture.",
          },
        ],
      },
      evidence: {
        left: evidence("codex", item.id),
        right: evidence("gemini", item.id),
      },
    }),
  );

  for (let index = 0; index < records.length; index += 1) {
    assert.equal(
      records[index].classification,
      fixture.cases[index].expected_classification,
      fixture.cases[index].id,
    );
  }

  const document = buildComparisonDocument(records);
  assert.deepEqual(document.counts, {
    same: 1,
    semantically_equivalent: 1,
    behaviorally_different: 1,
    unsupported_on_one_side: 1,
    unresolved: 1,
    evidence_gap: 1,
    total: 6,
  });
});
