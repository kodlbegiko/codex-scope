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
const {
  CODEX_GEMINI_STRUCTURAL_DIMENSIONS,
} = require("../dist/comparison-profiles/codex-gemini-structural.js");
const { inspectWithAdapter } = require("../dist/core.js");

const ledger = JSON.parse(
  fs.readFileSync(
    path.resolve("conformance/research/gemini-cli/real-repositories.json"),
    "utf8",
  ),
);

const comparisonDimensions = [
  ...CODEX_GEMINI_COMPARISON_DIMENSIONS,
  ...CODEX_GEMINI_STRUCTURAL_DIMENSIONS,
];

const expectedClassifications = {
  "netdata-nested-hierarchy": {
    "instructions.active-project-filenames": "behaviorally_different",
    "instructions.project-entrypoint-exists": "behaviorally_different",
    "runtime.mcp-effective-instructions": "evidence_gap",
    "trust.workspace-state": "semantically_equivalent",
    "instructions.default-project-filename-contract": "evidence_gap",
    "instructions.active-global-filename": "evidence_gap",
    "instructions.configured-filename-role": "evidence_gap",
  },
  "pigweed-configured-filename-and-jit": {
    "instructions.active-project-filenames": "behaviorally_different",
    "instructions.project-entrypoint-exists": "behaviorally_different",
    "runtime.mcp-effective-instructions": "evidence_gap",
    "trust.workspace-state": "semantically_equivalent",
    "instructions.default-project-filename-contract": "evidence_gap",
    "instructions.active-global-filename": "evidence_gap",
    "instructions.configured-filename-role": "behaviorally_different",
  },
  "wandb-vibes-mcp-declaration": {
    "instructions.active-project-filenames": "behaviorally_different",
    "instructions.project-entrypoint-exists": "behaviorally_different",
    "runtime.mcp-effective-instructions": "evidence_gap",
    "trust.workspace-state": "semantically_equivalent",
    "instructions.default-project-filename-contract": "evidence_gap",
    "instructions.active-global-filename": "evidence_gap",
    "instructions.configured-filename-role": "evidence_gap",
  },
};

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

function byId(document) {
  return Object.fromEntries(
    document.comparisons.map((item) => [item.comparison_id, item]),
  );
}

function expectedCounts(classifications) {
  const counts = {
    same: 0,
    semantically_equivalent: 0,
    behaviorally_different: 0,
    unsupported_on_one_side: 0,
    unresolved: 0,
    evidence_gap: 0,
    total: 0,
  };
  for (const classification of Object.values(classifications)) {
    counts[classification] += 1;
    counts.total += 1;
  }
  return counts;
}

test("three pinned sanitized repositories exercise all evidence-backed comparison dimensions deterministically", () => {
  assert.equal(ledger.validations.length, 3);
  assert.equal(comparisonDimensions.length, 7);
  assert.equal(
    new Set(comparisonDimensions.map((item) => item.comparisonId)).size,
    comparisonDimensions.length,
    "real-repository proof must not compare a dimension twice",
  );

  for (const validation of ledger.validations) {
    const root = path.resolve(validation.sanitized_root);
    const codex = inspectWithAdapter(codexAdapter, codexOptions(root));
    const gemini = inspectWithAdapter(
      geminiAdapter,
      geminiOptions(validation, root),
    );

    const first = compareInspections(codex, gemini, comparisonDimensions);
    const second = compareInspections(codex, gemini, comparisonDimensions);
    assert.equal(
      JSON.stringify(first),
      JSON.stringify(second),
      validation.id + ": comparison document is not byte-stable",
    );

    const expected = expectedClassifications[validation.id];
    assert.ok(expected, validation.id + ": missing expected proof contract");
    assert.deepEqual(first.counts, expectedCounts(expected), validation.id);

    const comparisons = byId(first);
    assert.deepEqual(
      Object.keys(comparisons).sort(),
      Object.keys(expected).sort(),
      validation.id,
    );

    for (const [comparisonId, classification] of Object.entries(expected)) {
      assert.equal(
        comparisons[comparisonId].classification,
        classification,
        validation.id + ":" + comparisonId,
      );
    }

    const filenames = comparisons["instructions.active-project-filenames"];
    assert.deepEqual(filenames.left.normalized_value, [], validation.id);
    assert.deepEqual(
      filenames.right.normalized_value,
      ["GEMINI.md"],
      validation.id,
    );
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

    const entrypoint =
      comparisons["instructions.project-entrypoint-exists"];
    assert.equal(entrypoint.left.normalized_value, false, validation.id);
    assert.equal(entrypoint.right.normalized_value, true, validation.id);

    const trust = comparisons["trust.workspace-state"];
    assert.equal(trust.classification, "semantically_equivalent", validation.id);
    assert.equal(trust.left.normalized_value, "trusted", validation.id);
    assert.equal(trust.right.normalized_value, "trusted", validation.id);

    const mcp = comparisons["runtime.mcp-effective-instructions"];
    assert.equal(
      mcp.classification,
      "evidence_gap",
      validation.id + ": static repository structure must not simulate MCP runtime content",
    );

    const configured =
      comparisons["instructions.configured-filename-role"];
    if (validation.id === "pigweed-configured-filename-and-jit") {
      assert.equal(configured.classification, "behaviorally_different");
      assert.equal(
        configured.left.normalized_value,
        "fallback_after_builtin_candidates",
      );
      assert.equal(
        configured.right.normalized_value,
        "replaces_default_candidate_set",
      );
    } else {
      assert.equal(
        configured.classification,
        "evidence_gap",
        validation.id + ": omitted context.fileName must not manufacture a structural difference",
      );
    }
  }
});
