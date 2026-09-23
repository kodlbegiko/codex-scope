import fs from "node:fs";
import path from "node:path";

import { validateExternalUserCasesLedger } from "./external-user-cases-lib.mjs";

function readJson(root, relativePath) {
  return JSON.parse(
    fs.readFileSync(path.resolve(root, relativePath), "utf8"),
  );
}

function readText(root, relativePath) {
  return fs.readFileSync(path.resolve(root, relativePath), "utf8");
}

function exists(root, relativePath) {
  return fs.existsSync(path.resolve(root, relativePath));
}

function fail(message) {
  throw new Error("Phase D status validation failed: " + message);
}

function expectEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      label +
        " is stale: expected " +
        JSON.stringify(expected) +
        " but received " +
        JSON.stringify(actual),
    );
  }
}

function expectPass(value, label) {
  expectEqual(value, "pass", label);
}

function comparisonIds(source) {
  return [...source.matchAll(/comparisonId:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );
}

export function loadPhaseDStatusState(root = process.cwd()) {
  return {
    root,
    status: readJson(root, "conformance/comparison/phase-d-status.json"),
    externalLedger: readJson(
      root,
      "conformance/comparison/external-user-cases.json",
    ),
    structuralLedger: readJson(
      root,
      "conformance/comparison/structural-differences.json",
    ),
    versionContract: readJson(
      root,
      "conformance/comparison/version-contract.json",
    ),
    realRepositories: readJson(
      root,
      "conformance/research/gemini-cli/real-repositories.json",
    ),
    packageJson: readJson(root, "package.json"),
    workflow: readText(root, ".github/workflows/ci.yml"),
    compareCliSourceExists: exists(root, "src/compare-cli.ts"),
    compareCliSource: exists(root, "src/compare-cli.ts")
      ? readText(root, "src/compare-cli.ts")
      : "",
    mainCliSource: readText(root, "src/cli.ts"),
    compareCliTestSource: readText(root, "tests/compare-cli.test.mjs"),
    cliSnapshotExists: exists(
      root,
      "conformance/comparison/cli-codex-gemini.json",
    ),
    packageContentsScriptExists: exists(
      root,
      "scripts/package-contents-check.mjs",
    ),
    packageContentsScript: exists(root, "scripts/package-contents-check.mjs")
      ? readText(root, "scripts/package-contents-check.mjs")
      : "",
    realRepositoryTestExists: exists(
      root,
      "tests/comparison-real-repositories.test.mjs",
    ),
    realRepositoryTestSource: exists(
      root,
      "tests/comparison-real-repositories.test.mjs",
    )
      ? readText(root, "tests/comparison-real-repositories.test.mjs")
      : "",
    baseProfileSource: readText(
      root,
      "src/comparison-profiles/codex-gemini.ts",
    ),
    structuralProfileSource: readText(
      root,
      "src/comparison-profiles/codex-gemini-structural.ts",
    ),
  };
}

export function validatePhaseDStatusState(state) {
  const status = state.status;

  expectEqual(
    status.schema_version,
    "codex-scope.phase-d-status.v1",
    "schema_version",
  );
  expectEqual(status.phase, "D", "phase");

  expectPass(status.comparison_schema.status, "comparison_schema.status");
  expectPass(status.normalization.status, "normalization.status");
  expectPass(status.ci_outcomes.status, "ci_outcomes.status");
  expectPass(status.provenance.status, "provenance.status");
  expectPass(
    status.sanitized_demonstration.status,
    "sanitized_demonstration.status",
  );

  const expectedClasses = [
    "same",
    "semantically_equivalent",
    "behaviorally_different",
    "unsupported_on_one_side",
    "unresolved",
    "evidence_gap",
  ];
  expectEqual(
    Object.keys(status.classifications).sort(),
    [...expectedClasses].sort(),
    "classifications",
  );
  for (const classification of expectedClasses) {
    expectPass(
      status.classifications[classification],
      "classifications." + classification,
    );
  }

  const cli = status.compare_cli;
  expectPass(cli.status, "compare_cli.status");
  if (!state.compareCliSourceExists) {
    fail("compare CLI source is absent while compare_cli.status=pass");
  }
  expectEqual(
    cli.schema_version,
    "codex-scope.semantic-comparison-cli.v1",
    "compare_cli.schema_version",
  );
  expectEqual(
    cli.codex_input_schema,
    "codex-scope.compare-input.codex.v1",
    "compare_cli.codex_input_schema",
  );
  expectEqual(
    cli.gemini_input_schema,
    "codex-scope.compare-input.gemini.v1",
    "compare_cli.gemini_input_schema",
  );
  expectEqual(cli.supported_agents, ["codex", "gemini"], "compare_cli.supported_agents");
  expectEqual(cli.explicit_input_required, true, "compare_cli.explicit_input_required");
  expectEqual(cli.json_only, true, "compare_cli.json_only");
  expectEqual(cli.deterministic, true, "compare_cli.deterministic");
  expectEqual(cli.source_path, "src/compare-cli.ts", "compare_cli.source_path");
  expectEqual(
    cli.snapshot_path,
    "conformance/comparison/cli-codex-gemini.json",
    "compare_cli.snapshot_path",
  );
  if (!state.cliSnapshotExists) {
    fail("compare CLI snapshot is absent while compare_cli.status=pass");
  }
  for (const constant of [
    cli.schema_version,
    cli.codex_input_schema,
    cli.gemini_input_schema,
  ]) {
    if (!state.compareCliSource.includes(constant)) {
      fail("compare CLI source does not contain declared schema constant " + constant);
    }
  }
  if (
    !state.compareCliSource.includes("--codex-input") ||
    !state.compareCliSource.includes("--gemini-input")
  ) {
    fail("compare CLI source does not enforce explicit Codex and Gemini input");
  }
  if (!state.compareCliSource.includes('if (!json)')) {
    fail("compare CLI source does not enforce JSON-only output");
  }
  if (!state.mainCliSource.includes('argv[0] === "compare"')) {
    fail("public CLI does not route the compare command");
  }
  if (!/byte-stable/i.test(state.compareCliTestSource)) {
    fail("compare CLI deterministic byte-stability test is absent");
  }

  const exit = status.exit_semantics;
  expectPass(exit.status, "exit_semantics.status");
  expectEqual(exit.valid_comparison, 0, "exit_semantics.valid_comparison");
  expectEqual(exit.internal_tool_error, 1, "exit_semantics.internal_tool_error");
  expectEqual(
    exit.input_or_usage_tool_error,
    2,
    "exit_semantics.input_or_usage_tool_error",
  );
  expectEqual(
    exit.semantic_non_clean_is_tool_error,
    false,
    "exit_semantics.semantic_non_clean_is_tool_error",
  );
  for (const [name, code] of [
    ["valid_comparison", 0],
    ["internal_tool_error", 1],
    ["input_or_usage_tool_error", 2],
  ]) {
    if (
      !new RegExp(name + "\\s*:\\s*" + code).test(
        state.compareCliSource,
      )
    ) {
      fail("exit_semantics do not match compare CLI source for " + name);
    }
  }

  const structural = state.structuralLedger;
  const provenStructural = structural.cases.filter(
    (item) =>
      item.classification === "behaviorally_different" &&
      item.deterministic_status === "proven",
  );
  expectEqual(
    structural.proven_behaviorally_different_count,
    provenStructural.length,
    "structural ledger count",
  );
  if (provenStructural.length < 5) {
    fail("structural ledger contains fewer than five proven differences");
  }
  expectPass(
    status.structural_differences.status,
    "structural_differences.status",
  );
  expectEqual(
    status.structural_differences.ledger_path,
    "conformance/comparison/structural-differences.json",
    "structural_differences.ledger_path",
  );
  expectEqual(
    status.structural_differences.proven_behaviorally_different_count,
    structural.proven_behaviorally_different_count,
    "structural difference count",
  );
  expectEqual(
    status.structural_differences.required_minimum,
    5,
    "structural_differences.required_minimum",
  );

  const proof = status.real_repository_proof;
  expectPass(proof.status, "real_repository_proof.status");
  expectEqual(
    proof.repository_count,
    state.realRepositories.validations.length,
    "real_repository_proof.repository_count",
  );
  if (proof.repository_count < 3) {
    fail("real_repository_proof requires at least three sanitized repositories");
  }
  expectEqual(
    proof.test_path,
    "tests/comparison-real-repositories.test.mjs",
    "real_repository_proof.test_path",
  );
  if (!state.realRepositoryTestExists) {
    fail("real-repository proof test is absent");
  }
  const dimensionIds = new Set([
    ...comparisonIds(state.baseProfileSource),
    ...comparisonIds(state.structuralProfileSource),
  ]);
  expectEqual(
    proof.comparison_dimension_count,
    dimensionIds.size,
    "real_repository_proof.comparison_dimension_count",
  );
  if (
    !state.realRepositoryTestSource.includes(
      "CODEX_GEMINI_COMPARISON_DIMENSIONS",
    ) ||
    !state.realRepositoryTestSource.includes(
      "CODEX_GEMINI_STRUCTURAL_DIMENSIONS",
    )
  ) {
    fail("real-repository proof does not exercise both comparison profiles");
  }
  if (!/byte-stable/i.test(state.realRepositoryTestSource)) {
    fail("real-repository proof lacks deterministic repeatability assertion");
  }

  const version = status.version_compatibility;
  expectPass(version.status, "version_compatibility.status");
  expectEqual(
    version.contract_path,
    "conformance/comparison/version-contract.json",
    "version_compatibility.contract_path",
  );
  for (const key of [
    "legacy_json_schema",
    "comparison_schema",
    "normalization_version",
    "ci_summary_schema",
    "cli_envelope_schema",
    "codex_adapter_version",
    "gemini_adapter_version",
    "migration_policy",
    "future_version_policy",
  ]) {
    expectEqual(
      version[key],
      state.versionContract[key],
      "version_compatibility." + key,
    );
  }
  expectEqual(
    status.comparison_schema.version,
    state.versionContract.comparison_schema,
    "comparison_schema.version",
  );
  expectEqual(
    status.normalization.version,
    state.versionContract.normalization_version,
    "normalization.version",
  );
  expectEqual(
    status.ci_outcomes.version,
    state.versionContract.ci_summary_schema,
    "ci_outcomes.version",
  );

  const packageGate = status.package_verification;
  expectPass(packageGate.status, "package_verification.status");
  expectEqual(
    packageGate.command,
    "npm run package:contents:check",
    "package_verification.command",
  );
  expectEqual(
    packageGate.script_path,
    "scripts/package-contents-check.mjs",
    "package_verification.script_path",
  );
  expectEqual(
    packageGate.workflow_path,
    ".github/workflows/ci.yml",
    "package_verification.workflow_path",
  );
  expectEqual(
    packageGate.npm_pack_verification,
    true,
    "package_verification.npm_pack_verification",
  );
  if (!state.packageContentsScriptExists) {
    fail("package verification gate script is absent while status=pass");
  }
  expectEqual(
    state.packageJson.scripts["package:contents:check"],
    "node scripts/package-contents-check.mjs",
    "package.json package:contents:check",
  );
  expectEqual(
    state.packageJson.scripts["phase:d:external:check"],
    "node scripts/external-user-cases-check.mjs",
    "package.json phase:d:external:check",
  );
  expectEqual(
    state.packageJson.scripts["phase:d:status:check"],
    "node scripts/phase-d-status-check.mjs",
    "package.json phase:d:status:check",
  );
  const externalGateIndex = state.workflow.indexOf(
    "npm run phase:d:external:check",
  );
  const statusGateIndex = state.workflow.indexOf(
    "npm run phase:d:status:check",
  );
  const packageGateIndex = state.workflow.indexOf(
    "npm run package:contents:check",
  );
  if (
    externalGateIndex < 0 ||
    statusGateIndex < 0 ||
    packageGateIndex < 0 ||
    !state.workflow.includes("npm pack")
  ) {
    fail("Phase D verification gates are absent from GitHub Actions");
  }
  if (
    !(externalGateIndex < statusGateIndex && statusGateIndex < packageGateIndex)
  ) {
    fail("Phase D verification gates are ordered incorrectly in GitHub Actions");
  }
  for (const requiredPath of [
    "conformance/schema/phase-d-status.schema.json",
    "conformance/comparison/phase-d-status.json",
    "conformance/schema/external-user-cases.schema.json",
    "conformance/comparison/external-user-cases.json",
    "conformance/schema/structural-differences.schema.json",
    "conformance/comparison/structural-differences.json",
    "conformance/comparison/version-contract.json",
  ]) {
    if (!state.packageContentsScript.includes(requiredPath)) {
      fail("package verification gate is missing " + requiredPath);
    }
  }

  expectEqual(
    status.integration.sanitized_repository_count,
    state.realRepositories.validations.length,
    "integration.sanitized_repository_count",
  );
  expectPass(
    status.integration.sanitized_repository_status,
    "integration.sanitized_repository_status",
  );

  if (status.false_certainty_blockers.count !== 0) {
    fail(
      "false-certainty blockers must be zero before internal deterministic PASS",
    );
  }
  expectPass(
    status.false_certainty_blockers.status,
    "false_certainty_blockers.status",
  );

  for (const [key, value] of Object.entries(status.safety)) {
    expectEqual(value, false, "safety." + key);
  }

  const external = status.external_proof_of_value;
  const externalLedger = validateExternalUserCasesLedger(
    state.externalLedger,
  );
  expectEqual(
    external.required_external_user_cases,
    externalLedger.required,
    "external_proof_of_value.required_external_user_cases",
  );
  expectEqual(
    external.verified_external_user_cases,
    externalLedger.verified_count,
    "external_proof_of_value.verified_external_user_cases",
  );
  expectEqual(
    external.status,
    externalLedger.status,
    "external_proof_of_value.status",
  );
  const externalPassed = externalLedger.status === "pass";
  expectEqual(
    status.phase_status,
    externalPassed ? "complete" : "blocked_external_proof",
    "phase_status",
  );

  expectPass(
    status.internal_deterministic_status,
    "internal_deterministic_status",
  );

  return {
    structural_count: provenStructural.length,
    real_repository_count: state.realRepositories.validations.length,
    comparison_dimension_count: dimensionIds.size,
    external_verified: external.verified_external_user_cases,
    external_required: external.required_external_user_cases,
    phase_status: status.phase_status,
  };
}

export function validatePhaseDStatusRepository(root = process.cwd()) {
  return validatePhaseDStatusState(loadPhaseDStatusState(root));
}
