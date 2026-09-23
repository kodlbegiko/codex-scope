import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  compareInspectionDimension,
} = require("../dist/comparison-normalization.js");
const {
  sanitizeComparisonDocumentPaths,
} = require("../dist/comparison-output.js");
const {
  buildComparisonDocument,
  validateComparisonDocument,
} = require("../dist/comparison.js");

function inspection(agent, records) {
  return {
    agent,
    adapterVersion: agent + "-adapter.v1",
    capabilities: {
      instructions: true,
      config: true,
      trust: true,
      versionDetection: "none",
      runtimeNetworkRequired: false,
      subprocessRequired: false,
    },
    evidence: {
      evidenceDate: "2026-09-23",
      upstreamRepository:
        agent === "codex" ? "openai/codex" : "google-gemini/gemini-cli",
      upstreamCommit:
        agent === "codex"
          ? "94174e44cbc54cece45f6052328ca0c2cd7a8a2a"
          : "62364cb2000795537a6895261b37ec668e4cf527",
      testedUpstreamVersion: "unknown",
      references: ["tests/comparison-provenance.test.mjs"],
    },
    records,
    result: {},
  };
}

function source(scope, file) {
  return {
    scope,
    path: path.resolve(file),
    reason: "Synthetic deterministic provenance.",
  };
}

function record(agent, subject, winner, shadowed = []) {
  return {
    agent,
    surface: "config",
    subject,
    status: "resolved",
    value: true,
    provenance: {
      winner,
      shadowed,
      ignored: [],
      conditional: [],
    },
    missingInformation: [],
    reason: "Synthetic resolved record.",
  };
}

const definition = {
  comparisonId: "fixture.provenance-order",
  semanticDimension: "fixture.provenance_order",
  left: {
    agent: "codex",
    ruleIds: ["fixture.codex.provenance"],
    missingReason: "missing",
    select: (records) => records,
    project: () => ({
      status: "resolved",
      normalizedValue: true,
      representationValue: true,
      applicability: "active",
      runtimeDependency: "none",
      reason: "resolved",
    }),
  },
  right: {
    agent: "gemini",
    ruleIds: ["fixture.gemini.provenance"],
    missingReason: "missing",
    select: (records) => records,
    project: () => ({
      status: "resolved",
      normalizedValue: true,
      representationValue: true,
      applicability: "active",
      runtimeDependency: "none",
      reason: "resolved",
    }),
  },
};

test("normalization deterministically deduplicates and canonically orders provenance", () => {
  const duplicateB = source("b_scope", "fixtures/demo/conflict/project/.codex/config.toml");
  const a = source("a_scope", "fixtures/demo/conflict/project/AGENTS.md");
  const item = compareInspectionDimension(
    inspection("codex", [
      record("codex", "one", duplicateB, [a]),
      record("codex", "two", duplicateB),
    ]),
    inspection("gemini", [
      record("gemini", "one", source("z_scope", "fixtures/gemini-research/hierarchy/project/GEMINI.md")),
    ]),
    definition,
  );

  assert.equal(item.provenance.left.length, 2);
  assert.deepEqual(
    item.provenance.left.map((entry) => entry.scope),
    ["a_scope", "b_scope"],
  );
});

test("sanitization changes only in-repository paths and preserves provenance/evidence fields", () => {
  const item = compareInspectionDimension(
    inspection("codex", [
      record(
        "codex",
        "one",
        source("project", "fixtures/demo/conflict/project/AGENTS.md"),
      ),
    ]),
    inspection("gemini", [
      record(
        "gemini",
        "one",
        source("workspace", "fixtures/gemini-research/hierarchy/project/GEMINI.md"),
      ),
    ]),
    definition,
  );
  const document = buildComparisonDocument([item]);
  const sanitized = sanitizeComparisonDocumentPaths(
    document,
    path.resolve(process.cwd()),
  );

  assert.equal(sanitized.comparisons[0].provenance.left[0].scope, "project");
  assert.equal(
    sanitized.comparisons[0].provenance.left[0].reason,
    "Synthetic deterministic provenance.",
  );
  assert.equal(
    sanitized.comparisons[0].provenance.left[0].path,
    "fixtures/demo/conflict/project/AGENTS.md",
  );
  assert.equal(
    sanitized.comparisons[0].evidence.left.adapter_version,
    "codex-adapter.v1",
  );
  assert.equal(
    sanitized.comparisons[0].evidence.left.upstream_commit,
    "94174e44cbc54cece45f6052328ca0c2cd7a8a2a",
  );
  assert.deepEqual(
    sanitized.comparisons[0].evidence.left.rule_ids,
    ["fixture.codex.provenance"],
  );
  assert.doesNotThrow(() => validateComparisonDocument(sanitized));
});

test("evidence-gap records retain an explicit reason for insufficient evidence", () => {
  const demo = require("../conformance/comparison/codex-gemini-demo.json");
  const gap = demo.comparisons.find(
    (item) => item.classification === "evidence_gap",
  );
  assert.ok(gap);
  assert.ok(gap.reason.length > 0);
  assert.ok(gap.left.reason.length > 0);
  assert.ok(gap.evidence.left.rule_ids.length > 0);
  assert.ok(gap.evidence.right.rule_ids.length > 0);
});
