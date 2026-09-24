import { readJson } from "./conformance-lib.mjs";

function fail(message) {
  throw new Error(message);
}

try {
  const selection = readJson("conformance/research/phase-e/selection.json");
  const manifest = readJson("conformance/research/opencode/manifest.json");
  const regressions = readJson("conformance/research/opencode/regressions.json");
  const assertions = readJson("conformance/research/opencode/assertions.json");
  const compatibility = readJson("conformance/research/opencode/compatibility.json");
  const audit = readJson("conformance/research/phase-e/false-certainty-audit.json");
  const status = readJson("conformance/research/phase-e/status.json");

  if (selection.e1_status !== "complete" || selection.selected_candidate !== "opencode") {
    fail("E1 candidate selection gate is not complete");
  }
  if (manifest.rules.length < 20) fail("OpenCode semantic corpus is below 20 rules");
  if (regressions.records.length < 3) fail("OpenCode regression corpus is below 3 records");
  if (assertions.assertions.length !== manifest.rules.length) {
    fail("OpenCode deterministic assertion bindings are incomplete");
  }
  if (compatibility.counts.total !== manifest.rules.length) {
    fail("OpenCode compatibility artifact does not cover the manifest");
  }
  if (audit.result !== "pass") fail("Phase E false-certainty audit has not passed");
  if (compatibility.public_contract.changed !== false) {
    fail("codex-scope.v0.1 public contract regression detected");
  }
  if (
    status.phase_d.external_users !== "0 / 3" ||
    status.phase_d.status !== "blocked_external_proof"
  ) {
    fail("Phase D invariant changed");
  }

  const artifactGates = [
    "candidate_research",
    "selection",
    "semantic_manifest_minimum_20",
    "regression_corpus_minimum_3",
    "fixture_validation",
    "deterministic_assertions",
    "shared_adapter_contracts",
    "compatibility_artifact",
    "false_certainty_audit",
    "public_json_contract_preserved",
    "codex_regression_suite",
    "gemini_regression_suite",
  ];
  for (const key of artifactGates) {
    if (status.gates[key] !== true) fail("Phase E artifact gate not satisfied: " + key);
  }

  if (status.authorization_status === "authorized") {
    if (status.adapter_authorized !== true || status.e3 !== "complete") {
      fail("authorized status requires E3 complete and adapter_authorized=true");
    }
    for (const key of [
      "lint",
      "format",
      "typecheck",
      "tests",
      "build",
      "npm_pack",
      "npm_publish_dry_run",
      "pr_head_ci",
    ]) {
      if (status.gates[key] !== true) {
        fail("authorized status requires gate=true: " + key);
      }
    }
  } else if (status.authorization_status === "pending_ci") {
    if (status.adapter_authorized !== false || status.e3 !== "pending_pr_head_ci") {
      fail("pending_ci status must remain unauthorized");
    }
  } else {
    fail("unknown Phase E authorization status");
  }

  console.log(
    "Phase E gate: " +
      status.authorization_status +
      " (rules=" +
      manifest.rules.length +
      "; regressions=" +
      regressions.records.length +
      ")",
  );
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
