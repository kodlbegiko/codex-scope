import assert from "node:assert/strict";
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
  CODEX_GEMINI_STRUCTURAL_DIMENSIONS,
} = require("../dist/comparison-profiles/codex-gemini-structural.js");
const { inspectWithAdapter } = require("../dist/core.js");

function codexRootChildOptions() {
  return {
    cwd: path.resolve("fixtures/agents/root-child/project"),
    codexHome: path.resolve("fixtures/agents/root-child/home"),
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: ['project_root_markers=[".fixture-root"]'],
    systemConfigPath: path.resolve("conformance/__missing_system_config.toml"),
    managedConfigPaths: [],
  };
}

function geminiDefaultOptions() {
  return {
    cwd: path.resolve("fixtures/gemini-research/hierarchy/project"),
    trustedRoot: path.resolve("fixtures/gemini-research/hierarchy/project"),
    geminiHome: path.resolve(
      "fixtures/gemini-research/hierarchy/home/.gemini",
    ),
    trustInputs: { envWorkspace: "true" },
  };
}

function codexFallbackOptions() {
  return {
    cwd: path.resolve("fixtures/agents/fallback/project/child"),
    codexHome: path.resolve("fixtures/agents/fallback/home"),
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.resolve("conformance/__missing_system_config.toml"),
    managedConfigPaths: [],
  };
}

function geminiConfiguredOptions() {
  return {
    ...geminiDefaultOptions(),
    settings: {
      workspace: path.resolve(
        "fixtures/gemini-research/settings/workspace-settings.json",
      ),
    },
  };
}

function compareOne(id, codexOptions, geminiOptions) {
  const definition = CODEX_GEMINI_STRUCTURAL_DIMENSIONS.filter(
    (item) => item.comparisonId === id,
  );
  assert.equal(definition.length, 1, id);
  return compareInspections(
    inspectWithAdapter(codexAdapter, codexOptions),
    inspectWithAdapter(geminiAdapter, geminiOptions),
    definition,
  ).comparisons[0];
}

test("project default filename contracts are a proven structural difference", () => {
  const item = compareOne(
    "instructions.default-project-filename-contract",
    codexRootChildOptions(),
    geminiDefaultOptions(),
  );
  assert.equal(item.classification, "behaviorally_different");
  assert.equal(item.left.normalized_value, "AGENTS.md");
  assert.equal(item.right.normalized_value, "GEMINI.md");
  assert.ok(item.provenance.left.length > 0);
  assert.ok(item.provenance.right.length > 0);
});

test("active global instruction filenames are a proven structural difference", () => {
  const item = compareOne(
    "instructions.active-global-filename",
    codexRootChildOptions(),
    geminiDefaultOptions(),
  );
  assert.equal(item.classification, "behaviorally_different");
  assert.equal(item.left.normalized_value, "AGENTS.md");
  assert.equal(item.right.normalized_value, "GEMINI.md");
  assert.ok(item.provenance.left.length > 0);
  assert.ok(item.provenance.right.length > 0);
});

test("configured project filename roles are a proven structural difference", () => {
  const item = compareOne(
    "instructions.configured-filename-role",
    codexFallbackOptions(),
    geminiConfiguredOptions(),
  );
  assert.equal(item.classification, "behaviorally_different");
  assert.equal(
    item.left.normalized_value,
    "fallback_after_builtin_candidates",
  );
  assert.equal(
    item.right.normalized_value,
    "replaces_default_candidate_set",
  );
  assert.ok(item.evidence.left.rule_ids.includes("codex.instructions.fallback_filename"));
  assert.ok(
    item.evidence.right.rule_ids.includes(
      "gemini.instructions.configurable_filenames",
    ),
  );
});
