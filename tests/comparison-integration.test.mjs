import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

const { codexAdapter } = require("../dist/adapters/codex.js");
const { geminiAdapter } = require("../dist/adapters/gemini.js");
const {
  compareInspections,
} = require("../dist/comparison-normalization.js");
const {
  CODEX_GEMINI_COMPARISON_DIMENSIONS,
} = require("../dist/comparison-profiles/codex-gemini.js");
const { inspectWithAdapter } = require("../dist/core.js");

function codexOptions() {
  return {
    cwd: path.resolve("fixtures/demo/conflict/project"),
    codexHome: path.resolve("fixtures/demo/conflict/home"),
    trust: "trusted",
    invocationComplete: true,
    profile: "dev",
    cliOverrides: [],
    systemConfigPath: path.resolve("conformance/__missing_system_config.toml"),
    managedConfigPaths: [],
  };
}

function geminiOptions() {
  return JSON.parse(
    fs.readFileSync(
      path.resolve("fixtures/gemini-adapter/adapter-options.json"),
      "utf8",
    ),
  );
}

test("Codex and Gemini neutral reports enter the shared comparison engine", () => {
  const codex = inspectWithAdapter(codexAdapter, codexOptions());
  const gemini = inspectWithAdapter(geminiAdapter, geminiOptions());
  const document = compareInspections(
    codex,
    gemini,
    CODEX_GEMINI_COMPARISON_DIMENSIONS,
  );

  assert.equal(
    document.schema_version,
    "codex-scope.semantic-comparison.v1",
  );
  assert.equal(
    document.normalization_version,
    "codex-scope.semantic-normalization.v1",
  );
  assert.deepEqual(document.counts, {
    same: 0,
    semantically_equivalent: 2,
    behaviorally_different: 1,
    unsupported_on_one_side: 0,
    unresolved: 0,
    evidence_gap: 1,
    total: 4,
  });

  const filenames = document.comparisons.find(
    (item) => item.comparison_id === "instructions.active-project-filenames",
  );
  assert.ok(filenames);
  assert.equal(filenames.classification, "behaviorally_different");
  assert.deepEqual(filenames.left.normalized_value, ["AGENTS.md"]);
  assert.deepEqual(filenames.right.normalized_value, ["GEMINI.md"]);

  const entrypoint = document.comparisons.find(
    (item) => item.comparison_id === "instructions.project-entrypoint-exists",
  );
  assert.ok(entrypoint);
  assert.equal(entrypoint.classification, "semantically_equivalent");
  assert.equal(entrypoint.left.normalized_value, true);
  assert.equal(entrypoint.right.normalized_value, true);

  const trust = document.comparisons.find(
    (item) => item.comparison_id === "trust.workspace-state",
  );
  assert.ok(trust);
  assert.equal(trust.classification, "semantically_equivalent");
  assert.equal(trust.left.normalized_value, "trusted");
  assert.equal(trust.right.normalized_value, "trusted");

  const mcp = document.comparisons.find(
    (item) => item.comparison_id === "runtime.mcp-effective-instructions",
  );
  assert.ok(mcp);
  assert.equal(mcp.classification, "evidence_gap");
  assert.equal(mcp.left.status, "evidence_gap");
  assert.equal(mcp.right.status, "unsupported");
});

test("comparison integration preserves adapter and upstream evidence", () => {
  const document = compareInspections(
    inspectWithAdapter(codexAdapter, codexOptions()),
    inspectWithAdapter(geminiAdapter, geminiOptions()),
    CODEX_GEMINI_COMPARISON_DIMENSIONS,
  );

  for (const item of document.comparisons) {
    assert.equal(item.evidence.left.adapter_version, "codex-adapter.v1");
    assert.equal(item.evidence.right.adapter_version, "gemini-adapter.v1");
    assert.equal(
      item.evidence.left.upstream_commit,
      "94174e44cbc54cece45f6052328ca0c2cd7a8a2a",
    );
    assert.equal(
      item.evidence.right.upstream_commit,
      "62364cb2000795537a6895261b37ec668e4cf527",
    );
    assert.ok(item.evidence.left.references.length > 0);
    assert.ok(item.evidence.right.references.length > 0);
    assert.ok(item.evidence.left.rule_ids.length > 0);
    assert.ok(item.evidence.right.rule_ids.length > 0);
  }
});

test("unknown Gemini trust stays unresolved instead of becoming a difference", () => {
  const codex = inspectWithAdapter(codexAdapter, codexOptions());
  const options = geminiOptions();
  options.trustInputs = {};
  const gemini = inspectWithAdapter(geminiAdapter, options);
  const trustDefinition = CODEX_GEMINI_COMPARISON_DIMENSIONS.filter(
    (item) => item.comparisonId === "trust.workspace-state",
  );

  const document = compareInspections(codex, gemini, trustDefinition);
  assert.deepEqual(document.counts, {
    same: 0,
    semantically_equivalent: 0,
    behaviorally_different: 0,
    unsupported_on_one_side: 0,
    unresolved: 1,
    evidence_gap: 0,
    total: 1,
  });
  assert.equal(document.comparisons[0].classification, "unresolved");
  assert.equal(document.comparisons[0].right.status, "unresolved");
  assert.deepEqual(document.comparisons[0].unresolved_metadata?.sides, [
    "right",
  ]);
});
