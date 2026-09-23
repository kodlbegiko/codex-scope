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

const ledger = JSON.parse(
  fs.readFileSync(
    path.resolve("conformance/research/gemini-cli/real-repositories.json"),
    "utf8",
  ),
);

const instructionDimensions = CODEX_GEMINI_COMPARISON_DIMENSIONS.filter(
  (item) =>
    item.comparisonId === "instructions.active-project-filenames" ||
    item.comparisonId === "instructions.project-entrypoint-exists",
);

function codexOptions(root) {
  return {
    cwd: root,
    codexHome: path.resolve("conformance/__missing_codex_home"),
    trust: "trusted",
    invocationComplete: true,
    cliOverrides: [],
    systemConfigPath: path.resolve("conformance/__missing_system_config.toml"),
    managedConfigPaths: [],
  };
}

function geminiOptions(validation, root) {
  const options = {
    cwd: root,
    trustedRoot: root,
    geminiHome: path.resolve("conformance/__missing_gemini_home"),
    trustInputs: { envWorkspace: "true" },
  };

  if (validation.scenario.settings_path) {
    options.settings = {
      workspace: path.join(root, validation.scenario.settings_path),
    };
  }
  if (validation.scenario.target_path) {
    options.targetPath = path.join(root, validation.scenario.target_path);
  }
  return options;
}

test("three pinned sanitized repositories produce deterministic cross-agent context differences", () => {
  assert.equal(ledger.validations.length, 3);

  for (const validation of ledger.validations) {
    const root = path.resolve(validation.sanitized_root);
    const codex = inspectWithAdapter(codexAdapter, codexOptions(root));
    const gemini = inspectWithAdapter(
      geminiAdapter,
      geminiOptions(validation, root),
    );
    const document = compareInspections(
      codex,
      gemini,
      instructionDimensions,
    );

    assert.deepEqual(
      document.counts,
      {
        same: 0,
        semantically_equivalent: 0,
        behaviorally_different: 2,
        unsupported_on_one_side: 0,
        unresolved: 0,
        evidence_gap: 0,
        total: 2,
      },
      validation.id,
    );

    const filenames = document.comparisons.find(
      (item) =>
        item.comparison_id === "instructions.active-project-filenames",
    );
    assert.ok(filenames, validation.id);
    assert.equal(
      filenames.classification,
      "behaviorally_different",
      validation.id,
    );
    assert.deepEqual(filenames.left.normalized_value, [], validation.id);
    assert.deepEqual(
      filenames.right.normalized_value,
      ["GEMINI.md"],
      validation.id,
    );

    const entrypoint = document.comparisons.find(
      (item) =>
        item.comparison_id === "instructions.project-entrypoint-exists",
    );
    assert.ok(entrypoint, validation.id);
    assert.equal(
      entrypoint.classification,
      "behaviorally_different",
      validation.id,
    );
    assert.equal(entrypoint.left.normalized_value, false, validation.id);
    assert.equal(entrypoint.right.normalized_value, true, validation.id);

    assert.ok(
      filenames.evidence.right.references.includes(
        "conformance/research/gemini-cli/real-repositories.json",
      ),
      validation.id,
    );
    assert.ok(
      filenames.provenance.right.some(
        (source) =>
          source.path === path.join(root, "GEMINI.md") &&
          source.scope === "workspace",
      ),
      validation.id,
    );
  }
});
